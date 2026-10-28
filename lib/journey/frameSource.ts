/**
 * Decodes the journey film frame by frame with WebCodecs, for exact scroll scrubbing.
 *
 * - Bytes arrive in chunks (HTTP Range, a few keyframe intervals each), nearest to the
 *   current position first and ahead of the scroll. Each chunk keeps its own buffer;
 *   past a memory budget the chunks farthest from the position are let go (and fetched
 *   again if the visitor comes back), so a large file never sits in memory whole.
 * - Frames are decoded from the keyframe before the one wanted, in decode order (the
 *   encode has no B-frames, so frame i is packet i); the decoder runs ahead in the
 *   scroll direction and, when scrolling back, decodes the previous keyframe interval
 *   before it is needed.
 * - Each decoded frame is copied straight into an ImageBitmap of the part the screen
 *   shows (`setView`) and the decoder's frame is released at once: hardware decoders
 *   have a small pool of output frames (often ~16) and stop decoding when it is held.
 *   The bitmaps are kept in a small cache around the current position.
 * - Hardware decoders can also keep the last few frames until more input arrives, so
 *   input runs a few frames past what is needed, and the end of the film is flushed.
 * - Nothing here touches the DOM; `createFilm` draws what `frame()` returns.
 */
import { journeyConfig } from "./config";

export type FilmIndex = {
  codec: string;
  width: number;
  height: number;
  fps: number;
  frames: number;
  bytes: number;
  description: string | null;
  offsets: number[];
  sizes: number[];
  keyframes: number[];
  /** Files holding the bytes [start, end) of the encode (one, or parts under 100 MB). */
  parts: { url: string; start: number; end: number }[];
};

export type FrameSourceStats = {
  loadedBytes: number;
  totalBytes: number;
  bufferedBytes: number;
  cached: number;
  decodeQueue: number;
  decoded: number;
};

/** Source rectangle (frame pixels) and the size it is stored at. */
export type FilmView = { sx: number; sy: number; sw: number; sh: number; width: number; height: number };

type Chunk = {
  first: number;
  last: number;
  start: number;
  end: number;
  /** File holding the chunk, and where that file starts in the whole encode. */
  url: string;
  fileStart: number;
  /** The chunk's bytes once loaded; bytes received so far while loading (for progress). */
  data: Uint8Array | null;
  received: number;
  state: "idle" | "loading" | "done";
};

export type FrameSourceOptions = {
  /** Decoded frames kept around the position. */
  cacheFrames: number;
  /** Frames decoded ahead of the scroll (kept below `cacheFrames`, or they'd be dropped and decoded again). */
  lookahead: number;
  /** Bytes of the encode kept in memory at most. */
  maxBufferedBytes: number;
  /** Parallel downloads. */
  connections: number;
};

export class FrameSource {
  readonly index: FilmIndex;
  private readonly chunks: Chunk[];
  private readonly chunkOf: Int32Array;
  private readonly keyBefore: Int32Array;
  private readonly isKey: Uint8Array;
  private readonly config: VideoDecoderConfig;
  private readonly options: FrameSourceOptions;
  private decoder: VideoDecoder | null = null;
  private readonly cache = new Map<number, ImageBitmap>();
  /** Frames out of the decoder whose bitmap is still being made. */
  private readonly converting = new Set<number>();
  /** Region of the frame the screen shows, and the size to keep it at. */
  private view: FilmView | null = null;
  private viewGeneration = 0;
  private lastOutputAt = 0;
  /** A frame the scroll needs isn't decoded yet (the decoder is working for the visitor). */
  private waiting = false;
  private flushing = false;
  /** Decoding run: frames from `runStart` (a keyframe) have been sent up to `runNext - 1`. */
  private runStart = -1;
  private runNext = -1;
  /** Last frame the decoder has returned in the current run. */
  private lastOutput = -1;
  private target = 0;
  private direction: 1 | -1 = 1;
  private loading = 0;
  private loadedBytes = 0;
  private bufferedBytes = 0;
  private decodedCount = 0;
  /** Sustained decode speed: outputs and time while the visitor waited on a frame. */
  private busySeconds = 0;
  private busyOutputs = 0;
  private lastUpdate = 0;
  private disposed = false;
  private readonly abort = new AbortController();

  constructor(base: string, index: FilmIndex, config: VideoDecoderConfig, options: FrameSourceOptions) {
    this.index = index;
    this.config = config;
    this.options = options;

    const n = index.frames;
    this.keyBefore = new Int32Array(n);
    this.isKey = new Uint8Array(n);
    for (const k of index.keyframes) this.isKey[k] = 1;
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (this.isKey[i]) k = i;
      this.keyBefore[i] = k;
    }

    // Chunks of whole keyframe intervals (decodable on their own), never across files.
    const per = journeyConfig.decode.gopsPerChunk;
    const partOf = (frame: number) => index.parts.findIndex((p) => index.offsets[frame] < p.end);
    this.chunks = [];
    this.chunkOf = new Int32Array(n);
    let g = 0;
    while (g < index.keyframes.length) {
      const first = index.keyframes[g];
      const part = partOf(first);
      let take = 1;
      while (take < per && g + take < index.keyframes.length && partOf(index.keyframes[g + take]) === part) take++;
      const last = (index.keyframes[g + take] ?? n) - 1;
      const file = index.parts[part];
      const start = index.offsets[first];
      const end = index.offsets[last] + index.sizes[last];
      for (let i = first; i <= last; i++) this.chunkOf[i] = this.chunks.length;
      this.chunks.push({ first, last, start, end, url: base + file.url, fileStart: file.start, data: null, received: 0, state: "idle" });
      g += take;
    }
  }

  /** Picks the first codec variant the browser can decode, or null (no WebCodecs). */
  static async open(variants: { indexUrl: string }[], options: FrameSourceOptions): Promise<FrameSource | null> {
    if (typeof VideoDecoder === "undefined") return null;
    for (const v of variants) {
      try {
        const index: FilmIndex = await (await fetch(v.indexUrl)).json();
        const config: VideoDecoderConfig = {
          codec: index.codec,
          codedWidth: index.width,
          codedHeight: index.height,
          optimizeForLatency: true,
          ...(index.description ? { description: base64(index.description) } : {}),
        };
        const support = await VideoDecoder.isConfigSupported(config);
        const base = v.indexUrl.slice(0, v.indexUrl.lastIndexOf("/") + 1);
        if (support.supported) return new FrameSource(base, index, config, options);
      } catch {
        // Try the next variant.
      }
    }
    return null;
  }

  /**
   * Decode speed of this device for this file (frames per second), measured on the
   * first keyframe interval with a separate decoder. Downloads the first chunk if needed.
   */
  async benchmark(): Promise<number> {
    const first = this.chunks[0];
    if (first.state === "idle") await this.load(first);
    while (first.state === "loading") await new Promise((r) => setTimeout(r, 30));
    if (first.state !== "done") return 0;
    const count = Math.min(this.index.keyframes[1] ?? this.index.frames, this.index.frames);
    const times: number[] = [];
    const decoder = new VideoDecoder({
      output: (f) => {
        times.push(performance.now());
        f.close();
      },
      error: () => undefined,
    });
    decoder.configure(this.config);
    const started = performance.now();
    for (let i = 0; i < count; i++) decoder.decode(this.chunkFor(i));
    await decoder.flush().catch(() => undefined);
    decoder.close();
    // From the first frame sent to the last one out: decoders return frames in bursts, so
    // timing only between outputs overstates the speed several times.
    return times.length > 2 ? (times.length * 1000) / (times[times.length - 1] - started) : 0;
  }

  get frameCount() {
    return this.index.frames;
  }

  stats(): FrameSourceStats {
    return {
      loadedBytes: this.loadedBytes,
      totalBytes: this.index.bytes,
      bufferedBytes: this.bufferedBytes,
      cached: this.cache.size,
      decodeQueue: this.decoder?.decodeQueueSize ?? 0,
      decoded: this.decodedCount,
    };
  }

  /**
   * Sets the part of the frame the screen shows. Cached frames stay when only the size
   * changes and are dropped when the shape does (they would be drawn distorted).
   */
  setView(view: FilmView) {
    const old = this.view;
    this.view = view;
    if (old && Math.abs(old.sw / old.sh - view.sw / view.sh) < 0.01) return;
    this.viewGeneration++;
    for (const b of this.cache.values()) b.close();
    this.cache.clear();
    this.runStart = -1; // decode again from the keyframe
  }

  /** Frames per second the decoder sustains while the visitor waits on it, once measured long enough. */
  sustainedFps(minSeconds = 1): number | undefined {
    return this.busySeconds >= minSeconds ? this.busyOutputs / this.busySeconds : undefined;
  }

  /** Whether the bytes for frame i (and the frames before it back to its keyframe) are here. */
  hasData(i: number): boolean {
    return this.available(Math.max(0, Math.min(this.index.frames - 1, Math.round(i))));
  }

  /** The decoded frame, if it is in the cache. */
  frame(i: number): ImageBitmap | undefined {
    return this.cache.get(i);
  }

  /** The cached frame closest to i, preferring frames the scroll has already passed. */
  nearest(i: number): { index: number; frame: ImageBitmap } | undefined {
    let best = -1;
    let bestScore = Infinity;
    for (const k of this.cache.keys()) {
      const passed = (i - k) * this.direction >= 0;
      const score = Math.abs(k - i) + (passed ? 0 : 0.5);
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    return best < 0 ? undefined : { index: best, frame: this.cache.get(best)! };
  }

  /**
   * Where the scroll is now; call every frame. Schedules downloads and, unless
   * `decode` is false (another source is being shown), decoding.
   */
  update(target: number, direction: 1 | -1, decode = true) {
    if (this.disposed) return;
    const now = performance.now();
    if (this.lastUpdate && this.waiting) this.busySeconds += Math.min(0.1, (now - this.lastUpdate) / 1000);
    this.lastUpdate = now;
    this.target = Math.max(0, Math.min(this.index.frames - 1, target));
    this.direction = direction;
    this.pumpDownloads();
    if (!decode) {
      this.waiting = false;
      return;
    }
    this.pumpDecoder();
    this.evict(this.options.cacheFrames);
    // Safety net: frames were sent and one is needed, but nothing has come out for a while.
    if (this.waiting && this.runNext - 1 > this.lastOutput && now - this.lastOutputAt > 500) {
      this.lastOutputAt = now;
      this.runStart = -1; // restart from the keyframe on the next update
    }
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    if (this.decoder && this.decoder.state !== "closed") this.decoder.close();
    for (const b of this.cache.values()) b.close();
    this.cache.clear();
    for (const c of this.chunks) c.data = null;
  }

  // ---------------------------------------------------------------- downloads

  private pumpDownloads() {
    while (this.loading < this.options.connections) {
      const chunk = this.nextChunk();
      if (!chunk) break;
      void this.load(chunk);
    }
    this.releaseFarChunks();
  }

  /** Distance of chunk i from the position, chunks ahead of the scroll counting as nearer. */
  private chunkScore(i: number) {
    const here = this.chunkOf[Math.round(this.target)];
    const d = (i - here) * this.direction;
    return d >= 0 ? d : -d * 1.5 + 0.5;
  }

  /** The idle chunk nearest the position, while the memory budget allows another. */
  private nextChunk(): Chunk | undefined {
    let best: Chunk | undefined;
    let bestScore = Infinity;
    this.chunks.forEach((c, i) => {
      if (c.state !== "idle") return;
      const score = this.chunkScore(i);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    });
    if (!best) return undefined;
    const size = best.end - best.start;
    if (this.bufferedBytes + size > this.options.maxBufferedBytes) {
      // Full: only worth it if the chunk is nearer than the farthest one held.
      const far = this.farthestLoaded();
      if (!far || this.chunkScore(this.chunks.indexOf(far)) <= bestScore) return undefined;
    }
    return best;
  }

  private farthestLoaded(): Chunk | undefined {
    let far: Chunk | undefined;
    let farScore = -1;
    this.chunks.forEach((c, i) => {
      if (c.state !== "done") return;
      const score = this.chunkScore(i);
      if (score > farScore) {
        farScore = score;
        far = c;
      }
    });
    return far;
  }

  /** Over the memory budget: let go of the chunks farthest from the position. */
  private releaseFarChunks() {
    const here = this.chunkOf[Math.round(this.target)];
    while (this.bufferedBytes > this.options.maxBufferedBytes) {
      const far = this.farthestLoaded();
      // Never the chunk in use or the one just ahead.
      if (!far || Math.abs(this.chunks.indexOf(far) - here) <= 1) return;
      this.bufferedBytes -= far.end - far.start;
      far.data = null;
      far.received = 0;
      far.state = "idle";
    }
  }

  private async load(chunk: Chunk) {
    chunk.state = "loading";
    this.loading++;
    try {
      const res = await fetch(chunk.url, {
        headers: { Range: `bytes=${chunk.start - chunk.fileStart}-${chunk.end - 1 - chunk.fileStart}` },
        signal: this.abort.signal,
      });
      if (res.status !== 200 && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      // A server without range support sends the whole file: skip to the chunk's bytes.
      const skip = res.status === 200 ? chunk.start - chunk.fileStart : 0;
      const size = chunk.end - chunk.start;
      const data = new Uint8Array(size);
      const reader = res.body!.getReader();
      let seen = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const from = Math.max(0, skip - seen);
        const to = Math.min(value.byteLength, skip + size - seen);
        if (to > from) data.set(value.subarray(from, to), seen + from - skip);
        seen += value.byteLength;
        chunk.received = Math.max(0, Math.min(size, seen - skip));
        if (seen >= skip + size) {
          void reader.cancel();
          break;
        }
      }
      if (chunk.received !== size) throw new Error("short read");
      chunk.data = data;
      this.loadedBytes += size;
      this.bufferedBytes += size;
      chunk.state = "done";
    } catch {
      chunk.received = 0;
      if (!this.disposed && chunk.state === "loading") chunk.state = "idle"; // retried on a later frame
    } finally {
      this.loading--;
    }
  }

  private available(i: number) {
    return this.chunks[this.chunkOf[i]].state === "done";
  }

  /** Encoded frame i, from its chunk's buffer. */
  private chunkFor(i: number) {
    const c = this.chunks[this.chunkOf[i]];
    const at = this.index.offsets[i] - c.start;
    return new EncodedVideoChunk({
      type: this.isKey[i] ? "key" : "delta",
      timestamp: i,
      data: c.data!.subarray(at, at + this.index.sizes[i]),
    });
  }

  // ---------------------------------------------------------------- decoding

  private ensureDecoder() {
    if (this.decoder && this.decoder.state === "configured") return this.decoder;
    if (this.decoder && this.decoder.state !== "closed") this.decoder.close();
    this.decoder = new VideoDecoder({
      output: (frame) => this.onFrame(frame),
      error: () => {
        // A decode error closes the decoder; the next update starts a fresh one.
        this.runStart = this.runNext = this.lastOutput = -1;
      },
    });
    this.decoder.configure(this.config);
    this.runStart = this.runNext = this.lastOutput = -1;
    return this.decoder;
  }

  private onFrame(frame: VideoFrame) {
    const i = Math.round(frame.timestamp);
    this.decodedCount++;
    if (this.waiting) this.busyOutputs++;
    this.lastOutput = Math.max(this.lastOutput, i);
    this.lastOutputAt = performance.now();
    // Frames only decoded on the way to others (far from the position) aren't kept.
    const far = Math.abs(i - this.target) > this.options.cacheFrames;
    if (this.disposed || far || this.cache.has(i) || this.converting.has(i)) {
      frame.close();
      return;
    }
    const v = this.view ?? { sx: 0, sy: 0, sw: frame.displayWidth, sh: frame.displayHeight, width: frame.displayWidth, height: frame.displayHeight };
    const generation = this.viewGeneration;
    // Crop only, unless the screen needs fewer pixels than the frame has.
    const resize = v.width !== v.sw || v.height !== v.sh;
    const options: ImageBitmapOptions = resize ? { resizeWidth: v.width, resizeHeight: v.height, resizeQuality: "medium" } : {};
    this.converting.add(i);
    createImageBitmap(frame, v.sx, v.sy, v.sw, v.sh, options)
      .then((bitmap) => {
        if (this.disposed || generation !== this.viewGeneration || this.cache.has(i)) bitmap.close();
        else this.cache.set(i, bitmap);
      })
      .catch(() => undefined)
      .finally(() => this.converting.delete(i));
    frame.close(); // the bitmap holds its own copy: give the decoder its buffer back now
  }

  private has(i: number) {
    return this.cache.has(i) || this.converting.has(i);
  }

  /** Frames that should be decoded now: the position and a stretch ahead in the scroll direction. */
  private wanted(): { from: number; to: number } {
    const n = this.index.frames;
    const t = Math.round(this.target);
    const ahead = this.options.lookahead;
    return this.direction > 0 ? { from: t, to: Math.min(n - 1, t + ahead) } : { from: Math.max(0, t - ahead), to: t };
  }

  private pumpDecoder() {
    const n = this.index.frames;
    const { from, to } = this.wanted();
    // The first missing frame, starting at the position and going the way the scroll goes.
    let need = -1;
    if (this.direction > 0) {
      for (let i = from; i <= to; i++) if (!this.has(i)) { need = i; break; }
    } else {
      for (let i = to; i >= from; i--) if (!this.has(i)) { need = i; break; }
    }
    this.waiting = need >= 0;
    if (need < 0 || this.flushing) return;

    const decoder = this.ensureDecoder();
    const key = this.keyBefore[need];
    let restart = false;
    if (this.runStart < 0 || need < this.runStart) restart = true; // nothing running, or behind it
    else if (need < this.runNext) restart = need <= this.lastOutput; // sent: wait, unless it came out and was dropped
    else if (key > this.runNext) restart = true; // a keyframe nearer than the run's next frame: jump to it
    if (restart) {
      decoder.reset();
      decoder.configure(this.config);
      this.runStart = this.runNext = key;
      this.lastOutput = key - 1;
    }

    // Forward: run ahead to the end of the window; back: up to the missing frame. A few
    // frames more, because hardware decoders may hold the last ones until more input comes.
    const end = Math.min(n - 1, (this.direction > 0 ? to : need) + journeyConfig.decode.latencyPad);
    let budget = journeyConfig.decode.queue - decoder.decodeQueueSize;
    while (budget > 0 && this.runNext <= end) {
      const i = this.runNext;
      if (!this.available(i)) break;
      decoder.decode(this.chunkFor(i));
      this.runNext++;
      budget--;
    }

    // Nothing left to send at the end of the film: flush out what the decoder still holds.
    // (After a flush the next input must be a keyframe, so the run starts over.)
    if (this.runNext >= n && this.lastOutput < n - 1 && decoder.decodeQueueSize === 0) {
      this.flushing = true;
      decoder
        .flush()
        .catch(() => undefined)
        .finally(() => {
          this.flushing = false;
          this.runStart = -1;
        });
    }
  }

  /** Keeps the cache within `limit`, dropping the frames farthest behind the scroll first. */
  private evict(limit: number) {
    const over = this.cache.size - limit;
    if (over <= 0) return;
    const t = this.target;
    const score = (k: number) => {
      const d = (k - t) * this.direction;
      return d >= 0 ? d : -d * 2; // frames behind the scroll go first
    };
    const keys = [...this.cache.keys()].sort((a, b) => score(b) - score(a));
    for (const k of keys.slice(0, over)) {
      this.cache.get(k)!.close();
      this.cache.delete(k);
    }
  }
}

function base64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
