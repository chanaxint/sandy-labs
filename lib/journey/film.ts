/**
 * The journey film as a scroll scene medium: scroll progress → film frame → canvas.
 *
 * Two frame sources play together, so nothing waits on a download:
 * - `base`, the fill-in: the smallest size at half the frame rate, opens at once and is
 *   light to fetch and decode;
 * - `best`, the size this screen needs (up to 2160p, full frame rate), loads alongside
 *   after a quick decode-speed test (stepping down a size if the device is too slow for
 *   it), and is shown wherever its frames are ready.
 * Where `best` has nothing close (a long jump, or a scroll faster than this device
 * decodes it), `base` fills in. While the scroll outruns it, `best` pauses decoding
 * instead of falling ever further behind, and picks up again as the scroll slows.
 *
 * Each display frame (on the shared GSAP ticker) it draws, full-screen ("cover", no
 * distortion), the first of: the exact frame of `best` (cross-faded with the next one
 * for the fraction of a frame the scroll is between them, `blendFrames`), the exact
 * frame of `base`, the nearest decoded frame, a small thumbnail of that moment, and
 * before anything is ready the poster behind the canvas, so it is never black.
 * Frames are held and drawn on the GPU (renderer.ts). Without WebCodecs it falls back
 * to seeking a <video> element.
 */
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { journeyConfig } from "./config";
import { FrameSource, type FrameSourceOptions, type FrameSourceStats } from "./frameSource";
import { createRenderer, type Picture } from "./renderer";

export type FilmStatus = {
  progress: number;
  /** Frame position the scroll asks for (fractional, in film frames). */
  target: number;
  /** What is on screen. */
  shown: number;
  mode: "exact" | "blend" | "nearest" | "thumb" | "poster" | "video";
  frames: number;
  fps: number;
  renderFps: number;
  /** Film frames per second the scroll asks for right now. */
  demand: number;
  variant: string;
  renderer: string;
  /** Height of the size on screen. */
  size?: number;
  /** The fill-in size and the sharp size. */
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
  demand: 0,
  variant: "",
  renderer: "",
};

type Near = { s: FrameSource; index: number; frame: Picture };

export function createFilm(stage: HTMLElement): SceneMedia {
  const canvas = stage.querySelector("canvas")!;
  const reduce = prefersReducedMotion();
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const { media, decode, film } = journeyConfig;

  /** The fill-in size: plays from the start. */
  let base: FrameSource | null = null;
  /** The size this screen needs, once it has passed the decode-speed test (null if none did). */
  let best: FrameSource | null = null;
  /** A smaller `best` being prepared because the current one can't keep up. */
  let next: FrameSource | null = null;
  /** Frames per second `best` decodes here: from the start-up test, then as measured. */
  let bestSpeed = 0;
  let tierIndex = 0;
  let video: HTMLVideoElement | null = null;
  let videoPicture: Picture | null = null;
  let thumbPicture: Picture | null = null;
  let disposed = false;
  let progress = 0;
  let direction: 1 | -1 = 1;
  let lastKey = "";
  let lastTick = 0;
  let lastTarget = 0;
  let fpsAvg = 60;
  let demand = 0;
  let baseNote = "";
  let bestNote = "";
  let steppingDown = false;

  const prefer = new URLSearchParams(location.search).get("renderer");
  const renderer = createRenderer(canvas, () => {
    // GPU context lost: every stored frame is gone; they are decoded again once it's back.
    for (const s of [base, best, next]) s?.clear();
    thumbPicture = null;
    lastKey = "";
  }, prefer === "2d" || prefer === "webgl" ? prefer : undefined);
  filmStatus.renderer = renderer.kind;

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

  /** Memory per size: decoded frames from a budget divided by the size of one frame. */
  const optionsFor = (t: number): FrameSourceOptions => {
    const h = media.tiers[t].height;
    const bytes = ((h * 16) / 9) * h * 4;
    const frames = Math.floor(((coarse ? decode.cacheMBMobile : decode.cacheMB) * 1e6) / bytes);
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
      renderer,
    );
  };
  const describe = (s: FrameSource) => `${s.index.codec} ${s.index.width}x${s.index.height}@${s.index.fps}`;
  const updateVariant = () => {
    filmStatus.variant = [baseNote, bestNote].filter(Boolean).join(" + ");
  };

  // Canvas backing store follows its CSS size × pixel ratio (capped).
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, journeyConfig.canvas.maxPixelRatio);
    const w = Math.min(Math.round(canvas.clientWidth * ratio), journeyConfig.canvas.maxWidth);
    const h = Math.round((w * canvas.clientHeight) / Math.max(1, canvas.clientWidth));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      renderer.resized();
      lastKey = "";
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
    base = s;
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
          bestNote += `${bestNote ? ", " : ""}${media.tiers[t].height}p not decodable`;
          updateVariant();
          continue; // e.g. no 2160p support: try the next size
        }
        const fps = await s.benchmark();
        if (disposed) return s.dispose();
        if (fps >= decode.minDecodeFps * decode.startupMargin) {
          best = s;
          bestSpeed = fps / decode.startupMargin;
          bestNote += `${bestNote ? ", " : ""}${describe(s)} (start ${Math.round(fps)} fps)`;
          return updateVariant();
        }
        bestNote += `${bestNote ? ", " : ""}${s.index.height}p too slow (${Math.round(fps)} fps)`;
        updateVariant();
        s.dispose();
      }
    })();
  }

  /** Film frames → frames of s (the fill-in has half as many). */
  const frameOf = (s: FrameSource, target: number) => Math.min(s.frameCount - 1, (target * s.frameCount) / film.frames);
  const filmFrameOf = (s: FrameSource, i: number) => (i * film.frames) / s.frameCount;

  const show = (s: FrameSource, i: number, picture: Picture, mode: FilmStatus["mode"]) => {
    const key = `f${s.index.height}:${i}:${canvas.width}`;
    if (key !== lastKey) {
      lastKey = key;
      renderer.draw(picture);
    }
    filmStatus.shown = filmFrameOf(s, i);
    filmStatus.mode = mode;
    filmStatus.size = s.index.height;
  };

  /**
   * Draws film frame `target` from s if it has it: blended with the next frame while the
   * scroll moves slowly, else the exact frame (or the next one past the halfway point).
   */
  const drawExact = (s: FrameSource, target: number, step: number) => {
    const at = frameOf(s, target);
    const a = Math.floor(at);
    const frac = at - a;
    const fa = s.frame(a);
    // Cross-fade only while the scroll moves under a frame per display frame (slow), where
    // the film would otherwise step; faster, every display frame shows a new frame anyway
    // and blending would only double the moving parts.
    const blend = journeyConfig.blendFrames && !reduce && frameOf(s, step) < 1 && frac > 0.02 && a + 1 < s.frameCount;
    const fb = blend ? s.frame(a + 1) : undefined;
    if (fa && fb) {
      const key = `b${s.index.height}:${a}:${Math.round(frac * 50)}:${canvas.width}`;
      if (key !== lastKey) {
        lastKey = key;
        renderer.draw(fa);
        renderer.draw(fb, frac);
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

  /** The decoded frame of s closest to film frame `target`, if within `within` film frames. */
  const nearestOf = (s: FrameSource | null, target: number, within: number): Near | undefined => {
    if (!s) return undefined;
    const n = s.nearest(Math.round(frameOf(s, target)));
    return n && Math.abs(filmFrameOf(s, n.index) - target) <= within ? { s, ...n } : undefined;
  };

  const tick = (time: number) => {
    const dt = time - lastTick;
    lastTick = time;
    if (dt > 0 && dt < 1) fpsAvg += (1 / dt - fpsAvg) * 0.05;
    filmStatus.renderFps = fpsAvg;
    if (!renderer.ok) return;

    const target = progress * (film.frames - 1);
    const step = Math.abs(target - lastTarget);
    lastTarget = target;
    // Film frames per second the scroll asks for (rises at once, settles over ~0.2 s).
    if (dt > 0 && dt < 0.25) demand = Math.max(step / dt, demand + (step / dt - demand) * Math.min(1, dt * 5));
    filmStatus.progress = progress;
    filmStatus.target = target;
    filmStatus.demand = demand;

    if (video) return drawVideo(video, target / film.fps);
    stepDownIfSlow(target);

    // The sharp size decodes where its bytes are here and the scroll is within what this
    // device can decode; the fill-in decodes only when the sharp size has nothing close.
    if (best) {
      const measured = best.sustainedFps(1);
      if (measured !== undefined) bestSpeed = measured;
      best.update(target, direction, best.hasData(target) && demand < bestSpeed * 0.9);
    }
    const close = nearestOf(best, target, 2);
    if (base) base.update(frameOf(base, target), direction, !close);
    filmStatus.source = base?.stats();
    filmStatus.best = best?.stats();

    if (best && drawExact(best, target, step)) return;
    if (close) return show(close.s, close.index, close.frame, "nearest");
    if (base && drawExact(base, target, step)) return;
    // While the decoders catch up, the closest real frame keeps the motion going (no blur
    // flashes); a thumbnail only stands in after a long jump with nothing decoded nearby.
    const near = [nearestOf(best, target, decode.nearestWithin), nearestOf(base, target, decode.nearestWithin)]
      .filter((c): c is Near => !!c)
      .sort((x, y) => Math.abs(filmFrameOf(x.s, x.index) - target) - Math.abs(filmFrameOf(y.s, y.index) - target))[0];
    if (near) return show(near.s, near.index, near.frame, "nearest");
    drawThumb(target);
  };

  /**
   * If the device can't decode the sharp size even at the film's own pace, prepare the
   * next smaller size in the background and swap to it once it has the current frame.
   * (Faster scrolling than that is what the fill-in is for.)
   */
  const stepDownIfSlow = (target: number) => {
    if (next) {
      next.update(target, direction, next.hasData(target));
      if (!next.frame(Math.round(target))) return;
      best?.dispose();
      best = next;
      next = null;
      bestSpeed = decode.minDecodeFps;
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
      next = s;
    });
  };

  const drawThumb = (target: number) => {
    if (!thumbsReady) {
      filmStatus.mode = "poster";
      return;
    }
    thumbPicture ??= renderer.wrap(thumbs, thumbs.naturalWidth, thumbs.naturalHeight);
    const i = Math.min(Math.round(target / media.thumbEvery), Math.floor((film.frames - 1) / media.thumbEvery));
    const key = `t${i}:${canvas.width}`;
    if (key === lastKey) return;
    lastKey = key;
    const w = thumbs.naturalWidth / media.thumbColumns;
    const h = (w * 9) / 16;
    renderer.draw(thumbPicture, 1, { x: (i % media.thumbColumns) * w, y: Math.floor(i / media.thumbColumns) * h, w, h });
    filmStatus.shown = i * media.thumbEvery;
    filmStatus.mode = "thumb";
  };

  const drawVideo = (v: HTMLVideoElement, time: number) => {
    if (v.readyState >= 2 && !v.seeking && Math.abs(v.currentTime - time) > 0.5 / film.fps) v.currentTime = time;
    if (v.readyState < 2) return drawThumb(time * film.fps);
    const key = `v${v.currentTime.toFixed(3)}:${canvas.width}`;
    if (key === lastKey) return;
    lastKey = key;
    videoPicture ??= renderer.wrap(v, v.videoWidth, v.videoHeight);
    renderer.refresh(videoPicture);
    renderer.draw(videoPicture);
    filmStatus.shown = v.currentTime * film.fps;
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
      renderer.dispose();
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
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
