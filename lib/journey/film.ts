/**
 * The journey film as a scroll scene medium: scroll progress → film frame → canvas.
 *
 * Two frame sources play together, so nothing waits on a download:
 * - `base`, the smallest size, opens at once and is light to fetch and decode;
 * - `best`, the size this screen needs (up to 2160p), loads alongside, after a quick
 *   decode-speed test (stepping down a size if the device is too slow for it), and is
 *   shown wherever its frames are ready. Where they aren't (a long jump, a fast scroll
 *   the decoder can't follow), `base` fills in until `best` catches up.
 *
 * Each display frame (on the shared GSAP ticker) it draws, full-screen ("cover", no
 * distortion), the first of: the exact frame of `best` (cross-faded with the next one
 * for the fraction of a frame the scroll is between them, `blendFrames`), the exact
 * frame of `base`, the nearest decoded frame, a small thumbnail of that moment, and
 * before anything is ready the poster behind the canvas, so it is never black.
 * Without WebCodecs it falls back to seeking a <video> element.
 */
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { journeyConfig } from "./config";
import { FrameSource, type FilmView, type FrameSourceOptions, type FrameSourceStats } from "./frameSource";

export type FilmStatus = {
  progress: number;
  /** Frame position the scroll asks for (fractional). */
  target: number;
  /** What is on screen. */
  shown: number;
  mode: "exact" | "blend" | "nearest" | "thumb" | "poster" | "video";
  frames: number;
  fps: number;
  renderFps: number;
  variant: string;
  /** Height of the size on screen. */
  size?: number;
  /** The size on screen (or filling in), and the sharp size. */
  source?: FrameSourceStats;
  best?: FrameSourceStats;
};

/** Live status for the debug panel (mutated in place; never triggers React renders). */
export const filmStatus: FilmStatus = {
  progress: 0,
  target: 0,
  shown: 0,
  mode: "poster",
  frames: journeyConfig.film.frames,
  fps: journeyConfig.film.fps,
  renderFps: 0,
  variant: "",
};

type Drawable = CanvasImageSource;

export function createFilm(stage: HTMLElement): SceneMedia {
  const canvas = stage.querySelector("canvas")!;
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: false })!;
  const reduce = prefersReducedMotion();
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const { media, decode } = journeyConfig;

  /** The smallest size: plays from the start. */
  let base: FrameSource | null = null;
  /** The size this screen needs, once it has passed the decode-speed test (null if none did). */
  let best: FrameSource | null = null;
  /** A smaller `best` being prepared because the current one can't keep up. */
  let next: FrameSource | null = null;
  let tierIndex = 0;
  let video: HTMLVideoElement | null = null;
  let disposed = false;
  let progress = 0;
  let direction: 1 | -1 = 1;
  let lastKey = "";
  let lastTick = 0;
  let lastTarget = 0;
  let fpsAvg = 60;
  let baseNote = "";
  let bestNote = "";
  let steppingDown = false;

  // Thumbnails: one sheet, decoded once, for instant (blurred) frames anywhere.
  const thumbs = new Image();
  thumbs.decoding = "async";
  thumbs.src = media.thumbs;
  let thumbsReady = false;
  thumbs.decode().then(
    () => (thumbsReady = true),
    () => undefined,
  );

  const devicePx = Math.min(window.devicePixelRatio || 1, journeyConfig.canvas.maxPixelRatio);
  const needWidth = Math.max(window.innerWidth, (window.innerHeight * 16) / 9) * devicePx;
  const last = media.tiers.length - 1;
  const first = Math.max(0, media.tiers.findIndex((t) => needWidth >= t.minWidth && (t.touch !== false || !coarse)));

  /** Memory per size: decoded frames from a budget divided by the frame size on screen. */
  const optionsFor = (t: number): FrameSourceOptions => {
    const h = media.tiers[t].height;
    const px = Math.min(canvas.width * canvas.height, ((h * 16) / 9) * h);
    const frames = Math.floor(((coarse ? decode.cacheMBMobile : decode.cacheMB) * 1e6) / (px * 4));
    const cacheFrames = Math.max(decode.minFrames, Math.min(decode.maxFrames, frames));
    return {
      cacheFrames,
      lookahead: Math.min(decode.lookahead, Math.floor(cacheFrames * 0.6)),
      maxBufferedBytes: (coarse ? decode.bufferMBMobile : decode.bufferMB) * 1e6,
      // The fill-in size takes fewer connections, leaving the rest to the sharp one.
      connections: t === last && first !== last ? 2 : decode.connections,
    };
  };
  const openTier = (t: number) => {
    const name = `${media.base}/journey-${media.tiers[t].height}`;
    return FrameSource.open(
      media.tiers[t].codecs.map((c) => ({ indexUrl: `${name}.${c}.json` })),
      optionsFor(t),
    );
  };
  const describe = (s: FrameSource) => `${s.index.codec} ${s.index.width}x${s.index.height}`;
  const updateVariant = () => {
    filmStatus.variant = [baseNote, bestNote].filter(Boolean).join(" + ");
  };

  /** The part of a frame the canvas shows ("cover"), stored no larger than the screen needs. */
  const viewFor = (s: FrameSource): FilmView => {
    const fw = s.index.width;
    const fh = s.index.height;
    const scale = Math.max(canvas.width / fw, canvas.height / fh);
    const sw = Math.min(fw, canvas.width / scale);
    const sh = Math.min(fh, canvas.height / scale);
    const keep = Math.min(1, scale);
    return {
      sx: Math.round((fw - sw) / 2),
      sy: Math.round((fh - sh) / 2),
      sw: Math.round(sw),
      sh: Math.round(sh),
      width: Math.max(1, Math.round(sw * keep)),
      height: Math.max(1, Math.round(sh * keep)),
    };
  };
  const applyView = (s: FrameSource) => s.setView(viewFor(s));

  // Canvas backing store follows its CSS size × pixel ratio (capped).
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, journeyConfig.canvas.maxPixelRatio);
    const w = Math.min(Math.round(canvas.clientWidth * ratio), journeyConfig.canvas.maxWidth);
    const h = Math.round((w * canvas.clientHeight) / Math.max(1, canvas.clientWidth));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      lastKey = "";
      for (const s of [base, best, next]) if (s) applyView(s);
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // The fill-in size, at once.
  void openTier(last).then((s) => {
    if (disposed) return s?.dispose();
    if (!s) {
      video = fallbackVideo(`${media.base}/journey-${media.tiers[last].height}`);
      baseNote = `${video.currentSrc || video.src} (video seek fallback)`;
      return updateVariant();
    }
    applyView(s);
    base = s;
    filmStatus.frames = s.frameCount;
    filmStatus.fps = s.index.fps;
    baseNote = `${describe(s)} (fill-in)`;
    updateVariant();
  });

  // The size this screen needs, alongside: the largest one this device decodes fast enough.
  if (first < last) {
    void (async () => {
      for (let t = first; t < last && !disposed; t++) {
        tierIndex = t;
        const s = await openTier(t);
        if (!s) {
          if (typeof VideoDecoder === "undefined") return;
          continue; // this size isn't decodable here (e.g. no 2160p support): try the next one
        }
        applyView(s);
        const fps = await s.benchmark();
        if (disposed) return s.dispose();
        if (fps >= decode.minDecodeFps * decode.startupMargin) {
          best = s;
          bestNote = `${describe(s)} (start ${Math.round(fps)} fps)`;
          return updateVariant();
        }
        bestNote += `${bestNote ? ", " : ""}${s.index.height}p too slow (${Math.round(fps)} fps)`;
        updateVariant();
        s.dispose();
      }
    })();
  }

  /** Draws src (or a w×h region at sx,sy of it) to cover the canvas. */
  const cover = (src: Drawable, sw: number, sh: number, sx = 0, sy = 0) => {
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / sw, ch / sh);
    const w = cw / scale;
    const h = ch / scale;
    ctx.drawImage(src, sx + (sw - w) / 2, sy + (sh - h) / 2, w, h, 0, 0, cw, ch);
  };

  /** Decoded frames are already cropped to the screen's shape: they just fill the canvas. */
  const fill = (bitmap: ImageBitmap) => ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const frameCount = () => base?.frameCount ?? best?.frameCount ?? journeyConfig.film.frames;

  /**
   * Draws frame `target` from s if it has it: blended with the next frame while the scroll
   * moves slowly, else the exact frame (or the next one past the halfway point).
   */
  const drawExact = (s: FrameSource, target: number, step: number, n: number) => {
    const a = Math.floor(target);
    const frac = target - a;
    const fa = s.frame(a);
    // Cross-fade only while the scroll moves under a frame per display frame (slow), where
    // the film would otherwise step; faster, every display frame shows a new frame anyway
    // and blending would only double the moving parts.
    const blend = journeyConfig.blendFrames && !reduce && step < 1 && frac > 0.02 && a + 1 < n;
    const fb = blend ? s.frame(a + 1) : undefined;
    if (fa && fb) {
      const key = `b${s.index.height}:${a}:${Math.round(frac * 50)}:${canvas.width}`;
      if (key !== lastKey) {
        lastKey = key;
        fill(fa);
        ctx.globalAlpha = frac;
        fill(fb);
        ctx.globalAlpha = 1;
      }
      filmStatus.shown = target;
      filmStatus.mode = "blend";
      filmStatus.size = s.index.height;
      return true;
    }
    const i = fa ? a : frac > 0.5 && s.frame(a + 1) ? a + 1 : -1;
    if (i < 0) return false;
    show(s, i, s.frame(i)!, "exact");
    return true;
  };

  const show = (s: FrameSource, i: number, bitmap: ImageBitmap, mode: FilmStatus["mode"]) => {
    const key = `f${s.index.height}:${i}:${canvas.width}`;
    if (key !== lastKey) {
      lastKey = key;
      fill(bitmap);
    }
    filmStatus.shown = i;
    filmStatus.mode = mode;
    filmStatus.size = s.index.height;
  };

  const tick = (time: number) => {
    const dt = time - lastTick;
    lastTick = time;
    if (dt > 0 && dt < 1) fpsAvg += (1 / dt - fpsAvg) * 0.05;
    filmStatus.renderFps = fpsAvg;

    const n = frameCount();
    const target = progress * (n - 1);
    const step = Math.abs(target - lastTarget);
    lastTarget = target;
    filmStatus.progress = progress;
    filmStatus.target = target;

    if (video) return drawVideo(video, target / filmStatus.fps);
    stepDownIfSlow(target);

    // The sharp size decodes wherever its bytes are here; the fill-in size decodes only
    // when the sharp one has nothing close to show (so one decoder works at a time).
    const t = Math.round(target);
    if (best) best.update(target, direction, best.hasData(target));
    const close = best?.nearest(t);
    const bestCovers = !!close && Math.abs(close.index - t) <= 2;
    base?.update(target, direction, !bestCovers);
    filmStatus.source = (bestCovers ? best : base)?.stats();
    filmStatus.best = best?.stats();

    if (best && drawExact(best, target, step, n)) return;
    if (close && bestCovers) return show(best!, close.index, close.frame, "nearest");
    if (base && drawExact(base, target, step, n)) return;
    // While the decoders catch up, the closest real frame keeps the motion going (no blur
    // flashes); a thumbnail only stands in after a long jump with nothing decoded nearby.
    const near = [close && best ? { s: best, ...close } : undefined, base ? withSource(base, base.nearest(t)) : undefined]
      .filter((c): c is { s: FrameSource; index: number; frame: ImageBitmap } => !!c && Math.abs(c.index - target) <= decode.nearestWithin)
      .sort((x, y) => Math.abs(x.index - target) - Math.abs(y.index - target))[0];
    if (near) return show(near.s, near.index, near.frame, "nearest");
    drawThumb(target);
  };

  /**
   * If the decoder can't sustain ordinary scrolling at the sharp size, prepare the next
   * smaller size in the background and swap to it once it has the current frame.
   * (The fill-in size is the smallest and never steps down.)
   */
  const stepDownIfSlow = (target: number) => {
    if (next) {
      next.update(target, direction, next.hasData(target));
      if (!next.frame(Math.round(target))) return;
      best?.dispose();
      best = next;
      next = null;
      lastKey = "";
      bestNote = `${describe(best)} (stepped down for speed)`;
      return updateVariant();
    }
    const fps = best?.sustainedFps(2);
    if (!best || steppingDown || fps === undefined || fps >= decode.minDecodeFps) return;
    if (tierIndex + 1 >= last) {
      // Nothing between it and the fill-in size: the fill-in size plays alone.
      best.dispose();
      best = null;
      lastKey = "";
      bestNote = `sharp size off (sustained ${Math.round(fps)} fps)`;
      return updateVariant();
    }
    tierIndex++;
    steppingDown = true;
    bestNote += ` → sustained ${Math.round(fps)} fps, loading ${media.tiers[tierIndex].height}p`;
    updateVariant();
    // The slow one stays on screen until the smaller one has the current frame.
    void openTier(tierIndex).then((s) => {
      steppingDown = false;
      if (disposed || !s) return s?.dispose();
      applyView(s);
      next = s;
    });
  };

  const drawThumb = (target: number) => {
    if (!thumbsReady) {
      filmStatus.mode = "poster";
      return;
    }
    const i = Math.min(Math.round(target / media.thumbEvery), Math.floor((frameCount() - 1) / media.thumbEvery));
    const key = `t${i}:${canvas.width}`;
    if (key === lastKey) return;
    lastKey = key;
    const tw = thumbs.naturalWidth / media.thumbColumns;
    const th = (tw * 9) / 16;
    cover(thumbs, tw, th, (i % media.thumbColumns) * tw, Math.floor(i / media.thumbColumns) * th);
    filmStatus.shown = i * media.thumbEvery;
    filmStatus.mode = "thumb";
  };

  const drawVideo = (v: HTMLVideoElement, time: number) => {
    if (v.readyState >= 2 && !v.seeking && Math.abs(v.currentTime - time) > 0.5 / filmStatus.fps) v.currentTime = time;
    if (v.readyState < 2) return drawThumb(time * filmStatus.fps);
    const key = `v${v.currentTime.toFixed(3)}:${canvas.width}`;
    if (key === lastKey) return;
    lastKey = key;
    cover(v, v.videoWidth, v.videoHeight);
    filmStatus.shown = v.currentTime * filmStatus.fps;
    filmStatus.mode = "video";
  };

  gsap.ticker.add(tick);

  return {
    render(update: SceneUpdate) {
      progress = update.progress;
      direction = update.direction;
    },
    dispose() {
      disposed = true;
      gsap.ticker.remove(tick);
      observer.disconnect();
      base?.dispose();
      best?.dispose();
      next?.dispose();
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    },
  };
}

function withSource(s: FrameSource, near: { index: number; frame: ImageBitmap } | undefined) {
  return near && { s, ...near };
}

/** No WebCodecs: seek a plain <video> (smoothness depends on the browser's seeking). */
function fallbackVideo(name: string): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  const av1 = v.canPlayType('video/mp4; codecs="av01.0.08M.08"') !== "" && v.canPlayType('video/mp4; codecs="avc1.640028"') === "";
  v.src = `${name}.${av1 ? "av1" : "h264"}.mp4`;
  v.load();
  return v;
}
