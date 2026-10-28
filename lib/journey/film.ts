/**
 * The journey film as a scroll scene medium: scroll progress → film frame → canvas.
 *
 * Each display frame (on the shared GSAP ticker) it asks the frame source for the
 * frame at the scroll position and draws it full-screen ("cover", no distortion):
 * - the exact frame when decoded, cross-faded with the next real frame for the
 *   fraction of a frame the scroll is between them (`blendFrames`);
 * - otherwise the nearest decoded frame, then a small thumbnail of that moment, and
 *   before anything is ready the poster behind the canvas, so it is never black.
 * Without WebCodecs it falls back to seeking a <video> element.
 */
import { getLenis, gsap, prefersReducedMotion } from "@/lib/scroll/engine";
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { journeyConfig } from "./config";
import { FrameSource, type FilmView, type FrameSourceStats } from "./frameSource";

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
  source?: FrameSourceStats;
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

  let source: FrameSource | null = null;
  /** A smaller size being prepared because the current one can't keep up. */
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

  const loader = loaderFor(stage);
  /** The scroll is held until the opening load is done (checked every frame: the engine may start after us). */
  let loading = true;

  // Thumbnails: one sheet, decoded once, for instant (blurred) frames anywhere.
  const thumbs = new Image();
  thumbs.decoding = "async";
  thumbs.src = media.thumbs;
  let thumbsReady = false;
  thumbs.decode().then(
    () => (thumbsReady = true),
    () => undefined,
  );

  // Pick the size for this screen, open the first codec the browser decodes, and step
  // down a size if this device can't decode it fast enough for brisk scrolling.
  const devicePx = Math.min(window.devicePixelRatio || 1, journeyConfig.canvas.maxPixelRatio);
  const needWidth = Math.max(window.innerWidth, (window.innerHeight * 16) / 9) * devicePx;
  const first = Math.max(0, media.tiers.findIndex((t) => needWidth >= t.minWidth));
  const cacheLimit = coarse ? decode.cacheFramesMobile : decode.cacheFrames;

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
      if (source) applyView(source);
      if (next) applyView(next);
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  void (async () => {
    let chosen: FrameSource | null = null;
    let measured = "";
    for (let t = first; t < media.tiers.length && !disposed; t++) {
      tierIndex = t;
      const name = `${media.base}/journey-${media.tiers[t].height}`;
      const variants = media.codecs.map((c) => ({ indexUrl: `${name}.${c}.json` }));
      const s = await FrameSource.open(variants, cacheLimit);
      if (!s) {
        if (typeof VideoDecoder === "undefined") break;
        continue; // this size isn't decodable here (e.g. no 1440p support): try the next one
      }
      applyView(s);
      const fps = await s.benchmark();
      measured += `${measured ? ", " : ""}${s.index.height}p start ${Math.round(fps)} fps`;
      chosen?.dispose();
      chosen = s;
      if (fps >= decode.minDecodeFps * decode.startupMargin) break;
    }
    if (disposed) {
      chosen?.dispose();
      return;
    }
    if (!chosen) video = fallbackVideo(`${media.base}/journey-${media.tiers[media.tiers.length - 1].height}`);
    if (chosen) {
      filmStatus.frames = chosen.frameCount;
      filmStatus.fps = chosen.index.fps;
      filmStatus.variant = `${chosen.index.codec} ${chosen.index.width}x${chosen.index.height} (WebCodecs; ${measured})`;
      // Opening load: a share of the film from where the visitor is (the top, or the
      // restored position after a reload) downloads while the scroll is held.
      const from = Math.floor(progress * (chosen.frameCount - 1));
      await chosen.preload(from, Math.round(chosen.frameCount * journeyConfig.preloadFraction), loader.set);
      if (disposed) return;
      source = chosen;
    } else if (video) {
      filmStatus.variant = `${video.currentSrc || video.src} (video seek fallback)`;
    }
    loading = false;
    getLenis()?.start();
    loader.done();
  })();

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

  const frameCount = () => source?.frameCount ?? journeyConfig.film.frames;

  const tick = (time: number) => {
    const dt = time - lastTick;
    lastTick = time;
    if (dt > 0 && dt < 1) fpsAvg += (1 / dt - fpsAvg) * 0.05;
    filmStatus.renderFps = fpsAvg;
    if (loading) {
      const lenis = getLenis();
      if (lenis && !lenis.isStopped) lenis.stop();
    }

    const n = frameCount();
    const target = progress * (n - 1);
    filmStatus.progress = progress;
    filmStatus.target = target;

    if (video) return drawVideo(video, target / filmStatus.fps);
    if (!source) return drawThumb(target);

    source.update(target, direction);
    filmStatus.source = source.stats();
    stepDownIfSlow(target);
    const a = Math.floor(target);
    const frac = target - a;
    const fa = source.frame(a);
    // Cross-fade only while the scroll moves under a frame per display frame (slow), where
    // 30 fps would otherwise step; faster, every display frame shows a new frame anyway
    // and blending would only double the moving parts.
    const step = Math.abs(target - lastTarget);
    lastTarget = target;
    const blend = journeyConfig.blendFrames && !reduce && step < 1 && frac > 0.02 && a + 1 < n;
    const fb = blend ? source.frame(a + 1) : undefined;

    if (fa && fb) {
      const key = `b${a}:${Math.round(frac * 50)}:${canvas.width}`;
      if (key === lastKey) return;
      lastKey = key;
      fill(fa);
      ctx.globalAlpha = frac;
      fill(fb);
      ctx.globalAlpha = 1;
      filmStatus.shown = target;
      filmStatus.mode = "blend";
      return;
    }
    const exact = fa ?? (frac > 0.5 ? source.frame(a + 1) : undefined);
    const near = exact ? { index: fa ? a : a + 1, frame: exact } : source.nearest(Math.round(target));
    // While the decoder catches up, the closest real frame keeps the motion going (no blur
    // flashes); a thumbnail only stands in after a long jump with nothing decoded nearby.
    if (near && Math.abs(near.index - target) <= journeyConfig.decode.nearestWithin) {
      const key = `f${near.index}:${canvas.width}`;
      if (key === lastKey) return;
      lastKey = key;
      fill(near.frame);
      filmStatus.shown = near.index;
      filmStatus.mode = exact ? "exact" : "nearest";
      return;
    }
    drawThumb(target);
  };

  /**
   * If the decoder can't sustain brisk scrolling at this size, prepare the next smaller
   * size in the background and swap to it once it has the current frame.
   */
  const stepDownIfSlow = (target: number) => {
    if (next) {
      next.update(target, direction);
      if (!next.frame(Math.round(target))) return;
      source?.dispose();
      source = next;
      next = null;
      lastKey = "";
      filmStatus.variant = `${source.index.codec} ${source.index.width}x${source.index.height} (WebCodecs; stepped down for speed)`;
      return;
    }
    const fps = source?.sustainedFps();
    if (fps === undefined || fps >= decode.minDecodeFps || tierIndex >= media.tiers.length - 1) return;
    tierIndex++;
    const name = `${media.base}/journey-${media.tiers[tierIndex].height}`;
    filmStatus.variant += ` → sustained ${Math.round(fps)} fps, loading ${media.tiers[tierIndex].height}p`;
    void FrameSource.open(
      media.codecs.map((c) => ({ indexUrl: `${name}.${c}.json` })),
      cacheLimit,
    ).then((s) => {
      if (disposed || !s) s?.dispose();
      else {
        applyView(s);
        next = s;
      }
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
      getLenis()?.start();
      gsap.ticker.remove(tick);
      observer.disconnect();
      source?.dispose();
      next?.dispose();
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    },
  };
}

/** Drives the opening progress indicator (`[data-loader]` in the stage) straight in the DOM. */
function loaderFor(stage: HTMLElement) {
  const root = stage.querySelector<HTMLElement>("[data-loader]");
  const bar = root?.querySelector<HTMLElement>("[data-loader-bar]");
  const label = root?.querySelector<HTMLElement>("[data-loader-label]");
  return {
    set: (p: number) => {
      const pct = Math.round(p * 100);
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (label) label.textContent = `Loading ${pct}%`;
      root?.setAttribute("aria-valuenow", String(pct));
    },
    done: () => {
      if (!root) return;
      root.dataset.state = "done";
      setTimeout(() => (root.hidden = true), 700);
    },
  };
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
