/**
 * Decodes the journey film frame by frame with WebCodecs, for exact scroll scrubbing.
 *
 * - Bytes arrive in chunks (HTTP Range, a few keyframe intervals each), nearest to the
 *   current position first, so a page opened mid-way doesn't wait for the whole file.
 * - Frames are decoded from the keyframe before the one wanted, in decode order (the
 *   encode has no B-frames, so frame i is packet i); the decoder runs ahead in the
 *   scroll direction and, when scrolling back, decodes the previous keyframe interval
 *   before it is needed.
 * - Decoded frames are kept as VideoFrames (no copy; colour conversion happens only for
 *   the frame drawn) in a small cache around the current position. Decoders, hardware
 *   ones especially, have a limited pool of output frames, so the cache is small and,
 *   if the decoder stops returning frames while holding many, the farthest are released.
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
  cached: number;
  decodeQueue: number;
  decoded: number;
};

type Chunk = {
  first: number;
  last: number;
  start: number;
  end: number;
  /** File holding the chunk, and where that file starts in the whole encode. */
  url: string;
  fileStart: number;
  /** Bytes of the chunk received so far (for progress). */
  received: number;
  state: "idle" | "loading" | "done";
};

export class FrameSource {
  readonly index: FilmIndex;
  private readonly data: Uint8Array;
  private readonly chunks: Chunk[];
  private readonly chunkOf: Int32Array;
  private readonly keyBefore: Int32Array;
  private readonly isKey: Uint8Array;
  private readonly config: VideoDecoderConfig;
  private readonly cacheLimit: number;
  private decoder: VideoDecoder | null = null;
  private readonly cache = new Map<number, VideoFrame>();
  private lastOutputAt = 0;
  /** Decoding run: frames from `runStart` (a keyframe) have been sent up to `runNext - 1`. */
  private runStart = -1;
  private runNext = -1;
  /** Last frame the decoder has returned in the current run. */
  private lastOutput = -1;
  private target = 0;
  private direction: 1 | -1 = 1;
  private loading = 0;
  private loadedBytes = 0;
  private decodedCount = 0;
  /** Sustained decode speed: outputs and time while the decoder had work queued. */
  private busySeconds = 0;
  private busyOutputs = 0;
  private lastUpdate = 0;
  private wholeFile = false;
  /** While the opening preload runs, downloads follow its order only. */
  private preloading = false;
  private disposed = false;
  private readonly abort = new AbortController();

  constructor(base: string, index: FilmIndex, config: VideoDecoderConfig, cacheLimit: number) {
    this.index = index;
    this.config = config;
    this.cacheLimit = cacheLimit;
    this.data = new Uint8Array(index.bytes);

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
      this.chunks.push({ first, last, start, end, url: base + file.url, fileStart: file.start, received: 0, state: "idle" });
      g += take;
    }
  }

  /** Picks the first codec variant the browser can decode, or null (no WebCodecs). */
  static async open(variants: { indexUrl: string }[], cacheLimit: number): Promise<FrameSource | null> {
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
        if (support.supported) return new FrameSource(base, index, config, cacheLimit);
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
    const started = performance.now();
    const decoder = new VideoDecoder({
      output: (f) => {
        times.push(performance.now());
        f.close();
      },
      error: () => undefined,
    });
    decoder.configure(this.config);
    for (let i = 0; i < count; i++) {
      decoder.decode(
        new EncodedVideoChunk({
          type: this.isKey[i] ? "key" : "delta",
          timestamp: i,
          data: this.data.subarray(this.index.offsets[i], this.index.offsets[i] + this.index.sizes[i]),
        }),
      );
    }
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
      cached: this.cache.size,
      decodeQueue: this.decoder?.decodeQueueSize ?? 0,
      decoded: this.decodedCount,
    };
  }

  /** Frames per second the decoder sustains while it has work, once measured for long enough. */
  sustainedFps(minSeconds = 1): number | undefined {
    return this.busySeconds >= minSeconds ? this.busyOutputs / this.busySeconds : undefined;
  }

  /** The decoded frame, if it is in the cache. */
  frame(i: number): VideoFrame | undefined {
    return this.cache.get(i);
  }

  /** The cached frame closest to i, preferring frames the scroll has already passed. */
  nearest(i: number): { index: number; frame: VideoFrame } | undefined {
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
   * Downloads the chunks holding `count` frames from `from` on, in order, a few at a
   * time, reporting progress (0..1) as bytes arrive. The rest loads later, nearest the
   * scroll position first, as `update` runs.
   */
  async preload(from: number, count: number, onProgress: (p: number) => void): Promise<void> {
    const last = Math.min(this.index.frames - 1, from + count);
    const first = this.chunkOf[Math.max(0, from)];
    const wanted = this.chunks.filter((c, i) => i >= first && c.first <= last);
    const total = wanted.reduce((sum, c) => sum + c.end - c.start, 0);
    const report = () => {
      const done = wanted.reduce((sum, c) => sum + (c.state === "done" ? c.end - c.start : c.received), 0);
      onProgress(Math.min(1, done / total));
    };
    this.preloading = true;
    const timer = setInterval(report, 100);
    try {
      for (let attempt = 0; attempt < 3 && !this.disposed; attempt++) {
        const queue = wanted.filter((c) => c.state !== "done");
        if (!queue.length) break;
        const worker = async () => {
          for (let c = queue.shift(); c && !this.disposed; c = queue.shift()) {
            if (c.state === "idle") await this.load(c);
            while (c.state === "loading") await new Promise((r) => setTimeout(r, 30));
          }
        };
        await Promise.all(Array.from({ length: journeyConfig.decode.connections }, worker));
      }
    } finally {
      clearInterval(timer);
      this.preloading = false;
      report();
    }
  }

  /** Where the scroll is now; call every frame. Schedules downloads and decoding. */
  update(target: number, direction: 1 | -1) {
    if (this.disposed) return;
    const now = performance.now();
    if (this.lastUpdate && (this.decoder?.decodeQueueSize ?? 0) > 0) this.busySeconds += Math.min(0.1, (now - this.lastUpdate) / 1000);
    this.lastUpdate = now;
    this.target = Math.max(0, Math.min(this.index.frames - 1, target));
    this.direction = direction;
    this.pumpDownloads();
    this.pumpDecoder();
    this.evict(this.cacheLimit);
    // Stalled with work queued while holding frames: the decoder may be out of output
    // buffers, so keep only the frames around the position.
    if ((this.decoder?.decodeQueueSize ?? 0) > 0 && this.cache.size > 6 && now - this.lastOutputAt > 150) this.evict(6);
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    if (this.decoder && this.decoder.state !== "closed") this.decoder.close();
    for (const f of this.cache.values()) f.close();
    this.cache.clear();
  }

  // ---------------------------------------------------------------- downloads

  private pumpDownloads() {
    if (this.wholeFile || this.preloading) return;
    const max = journeyConfig.decode.connections;
    while (this.loading < max) {
      const chunk = this.nextChunk();
      if (!chunk) return;
      void this.load(chunk);
    }
  }

  /** The idle chunk nearest the current position, ahead of the scroll counting as nearer. */
  private nextChunk(): Chunk | undefined {
    const here = this.chunkOf[Math.round(this.target)];
    let best: Chunk | undefined;
    let bestScore = Infinity;
    this.chunks.forEach((c, i) => {
      if (c.state !== "idle") return;
      const d = (i - here) * this.direction;
      const score = d >= 0 ? d : -d * 1.5 + 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    });
    return best;
  }

  private async load(chunk: Chunk) {
    chunk.state = "loading";
    this.loading++;
    try {
      const res = await fetch(chunk.url, {
        headers: { Range: `bytes=${chunk.start - chunk.fileStart}-${chunk.end - 1 - chunk.fileStart}` },
        signal: this.abort.signal,
      });
      if (res.status === 200) {
        // No range support: take the whole file in one stream.
        await this.loadWhole(res, chunk.fileStart);
        return;
      }
      if (res.status !== 206) throw new Error(`HTTP ${res.status}`);
      // Read as it arrives, so progress moves smoothly.
      const reader = res.body!.getReader();
      let at = chunk.start;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        this.data.set(value, at);
        at += value.byteLength;
        chunk.received = at - chunk.start;
      }
      if (at !== chunk.end) throw new Error("short read");
      this.loadedBytes += chunk.end - chunk.start;
      chunk.state = "done";
    } catch {
      chunk.received = 0;
      if (!this.disposed && chunk.state === "loading") chunk.state = "idle"; // retried on a later frame
    } finally {
      this.loading--;
    }
  }

  /** A whole file arrived (server without range support): every chunk in it is done as its bytes land. */
  private async loadWhole(res: Response, fileStart: number) {
    if (this.index.parts.length === 1) this.wholeFile = true;
    const reader = res.body!.getReader();
    let at = fileStart;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      this.data.set(value, at);
      at += value.byteLength;
      this.loadedBytes += value.byteLength;
      for (const c of this.chunks) if (c.fileStart === fileStart && c.end <= at) c.state = "done";
    }
  }

  private available(i: number) {
    return this.chunks[this.chunkOf[i]].state === "done";
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
    this.busyOutputs++;
    this.lastOutput = Math.max(this.lastOutput, i);
    this.lastOutputAt = performance.now();
    if (this.disposed || this.cache.has(i)) {
      frame.close();
      return;
    }
    this.cache.set(i, frame);
  }

  private has(i: number) {
    return this.cache.has(i);
  }

  /** Frames that should be decoded now: the position and a stretch ahead in the scroll direction. */
  private wanted(): { from: number; to: number } {
    const n = this.index.frames;
    const t = Math.round(this.target);
    const ahead = journeyConfig.decode.lookahead;
    return this.direction > 0 ? { from: t, to: Math.min(n - 1, t + ahead) } : { from: Math.max(0, t - ahead), to: t };
  }

  private pumpDecoder() {
    const { from, to } = this.wanted();
    // The first missing frame, starting at the position and going the way the scroll goes.
    let need = -1;
    if (this.direction > 0) {
      for (let i = from; i <= to; i++) if (!this.has(i)) { need = i; break; }
    } else {
      for (let i = to; i >= from; i--) if (!this.has(i)) { need = i; break; }
    }
    if (need < 0) return;

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

    // Forward: run ahead to the end of the window. Back: decode up to the missing frame.
    const end = this.direction > 0 ? to : need;
    let budget = journeyConfig.decode.queue - decoder.decodeQueueSize;
    while (budget > 0 && this.runNext <= end) {
      const i = this.runNext;
      if (!this.available(i)) break;
      decoder.decode(
        new EncodedVideoChunk({
          type: this.isKey[i] ? "key" : "delta",
          timestamp: i,
          data: this.data.subarray(this.index.offsets[i], this.index.offsets[i] + this.index.sizes[i]),
        }),
      );
      this.runNext++;
      budget--;
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
