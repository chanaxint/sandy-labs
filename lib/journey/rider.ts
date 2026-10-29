/**
 * The snowboarder in front of the jump's story line: his cut-out frames
 * (public/media/journey/rider/, made by scripts/journey/matte_rider.py) drawn on a canvas
 * above the text, on the same film frame the film canvas shows and with the same "cover"
 * framing, so he passes in front of the words.
 *
 * Drawn only while the jump's phrase is on screen (otherwise the film itself shows the
 * rider), and only the cut-out of the very frame the film shows: if that one isn't
 * decoded yet the layer is left empty for the moment, never showing an older pose.
 * The frames are fetched as the film nears the jump; the first ones of the beat are
 * decoded ahead of it. Drawn after the film each tick (same GSAP ticker), from what the
 * film reports it is showing (`filmStatus`).
 */
import { gsap } from "@/lib/scroll/engine";
import type { SceneMedia } from "@/lib/scroll/scene";
import { journeyConfig } from "./config";
import { filmStatus } from "./film";
import { jumpFrame, jumpResume } from "./story";

type Meta = { first: number; last: number; width: number; height: number; rect: { x: number; y: number; w: number; h: number } };

const dir = `${journeyConfig.media.base}/rider`;
/** Start fetching this many film frames before the cut-outs are needed. */
const prefetch = 900;
/** The jump the rider passes in front of its phrase at. */
const lineStart = jumpFrame - 80;
/** Decoded cut-outs kept on each side of the current frame. */
const around = 10;

export function createRider(stage: HTMLElement): SceneMedia {
  const canvas = stage.querySelector<HTMLCanvasElement>("canvas[data-rider]");
  const ctx = canvas?.getContext("2d");
  const phrase = stage.querySelector<HTMLElement>('[data-story="snowboard-b"]');
  if (!canvas || !ctx || !phrase) return { render() {} };
  /** The jump's phrase is showing (set visible by its beat or, with reduced motion, the timeline). */
  const phraseShown = () => {
    const cs = getComputedStyle(phrase);
    return cs.visibility !== "hidden" && Number(cs.opacity) > 0;
  };

  let meta: Meta | null = null;
  let metaState: "idle" | "loading" | "done" = "idle";
  let fetching = false;
  const blobs = new Map<number, Blob>();
  const bitmaps = new Map<number, ImageBitmap>();
  const decoding = new Set<number>();
  let lastKey = "";
  let disposed = false;

  const loadMeta = () => {
    metaState = "loading";
    fetch(`${dir}/rider.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((m: Meta) => {
        meta = m;
        metaState = "done";
      })
      .catch(() => (metaState = "done")); // no cut-outs: the line simply sits in front
  };

  // All frames, a few at a time, nearest to the jump's start first.
  const fetchAll = async (m: Meta) => {
    fetching = true;
    const queue: number[] = [];
    for (let f = m.first; f <= m.last; f++) queue.push(f);
    const worker = async () => {
      for (let f = queue.shift(); f !== undefined && !disposed; f = queue.shift()) {
        try {
          const r = await fetch(`${dir}/${f}.webp`);
          if (r.ok) blobs.set(f, await r.blob());
        } catch {
          // Missing frame: the film frame shows without the cut-out there.
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  };

  const decode = (f: number) => {
    const blob = blobs.get(f);
    if (!blob || bitmaps.has(f) || decoding.has(f)) return;
    decoding.add(f);
    createImageBitmap(blob)
      .then((b) => {
        if (disposed) b.close();
        else bitmaps.set(f, b);
      })
      .catch(() => undefined)
      .finally(() => decoding.delete(f));
  };

  const drop = (far: (f: number) => boolean) => {
    for (const [f, b] of bitmaps) {
      if (!far(f)) continue;
      b.close();
      bitmaps.delete(f);
    }
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, journeyConfig.canvas.maxPixelRatio);
    const w = Math.min(Math.round(canvas.clientWidth * ratio), journeyConfig.canvas.maxWidth);
    const h = Math.round((w * canvas.clientHeight) / Math.max(1, canvas.clientWidth));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      lastKey = "";
    }
  };

  const clear = () => {
    if (lastKey === "") return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastKey = "";
  };

  /** Draws cut-out f where the film frame puts it (the film's "cover" framing). */
  const place = (m: Meta, b: ImageBitmap, alpha: number) => {
    const scale = Math.max(canvas.width / m.width, canvas.height / m.height);
    const ox = (canvas.width - m.width * scale) / 2;
    const oy = (canvas.height - m.height * scale) / 2;
    ctx.globalAlpha = alpha;
    ctx.drawImage(b, ox + m.rect.x * scale, oy + m.rect.y * scale, m.rect.w * scale, m.rect.h * scale);
    ctx.globalAlpha = 1;
  };

  const tick = () => {
    const t = filmStatus.target;
    if (metaState === "idle" && t > lineStart - prefetch * 1.5) loadMeta();
    const m = meta;
    if (!m) return clear();
    if (!fetching && t > m.first - prefetch && t < m.last + prefetch) void fetchAll(m);

    const mode = filmStatus.mode;
    const shown = filmStatus.shown;
    const real = mode === "exact" || mode === "blend" || mode === "nearest";
    if (!phraseShown() || !real || shown < m.first || shown > m.last) {
      // Approaching the jump: have the beat's first frames ready.
      if (t > jumpFrame - 240 && t < jumpFrame + 4) for (let f = jumpFrame - 2; f <= jumpFrame + around; f++) decode(f);
      else drop((f) => f < jumpFrame - 2 || f > jumpResume);
      return clear();
    }
    resize();
    const a = Math.floor(shown);
    const frac = mode === "blend" ? shown - a : 0;
    for (let f = a - 2; f <= a + around; f++) decode(f);
    drop((f) => Math.abs(f - a) > around + 2);

    // As the film does: blended with the next frame for the fraction between them.
    const fa = bitmaps.get(a);
    const fb = frac > 0.02 ? bitmaps.get(a + 1) : undefined;
    const key = `${a}:${fb ? Math.round(frac * 50) : 0}:${canvas.width}`;
    if (key === lastKey) return;
    if (!fa) return clear(); // not decoded yet: nothing rather than an older pose
    lastKey = key;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    place(m, fa, 1);
    if (fb) place(m, fb, frac);
  };

  gsap.ticker.add(tick);

  return {
    render() {
      // Follows the film's own status each tick.
    },
    dispose() {
      disposed = true;
      gsap.ticker.remove(tick);
      for (const b of bitmaps.values()) b.close();
      bitmaps.clear();
      blobs.clear();
    },
  };
}
