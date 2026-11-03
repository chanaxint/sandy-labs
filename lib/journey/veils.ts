/**
 * Cloud and mist over two hard cuts of the film, so they happen inside the atmosphere:
 *   A — the take-off (cut to the flight over the sea at ~918) through cloud;
 *   B — the snowy plane's peaks (cut to the snowboard slope at ~2196) through snow mist.
 *
 * Each is two layers of real cloud from the film's own frames (veil-*.webp, see
 * scripts/journey/build-journey.sh): a ring, clear in the middle, that closes in from the
 * edges as the cloud thickens and opens outwards as it clears (as if flying through), and
 * a full layer that takes the whole frame while it is dense. The story's line for the
 * moment shows while it is dense (story.ts), and the scroll pace is slowed there only
 * (config.ts `pace`), since the film is hidden. Driven by the film frame (scroll), so it
 * plays backwards exactly; only transform and opacity. Reduced motion: opacity only.
 */
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { prefersReducedMotion } from "@/lib/scroll/engine";
import { journeyConfig } from "./config";
import { frameAt } from "./pace";

export type Veil = {
  id: string;
  /** Film frames: thickening from `from` to `dense`, dense until `clear`, gone by `to`. */
  from: number;
  dense: number;
  clear: number;
  to: number;
  ring: string;
  core: string;
};

const base = journeyConfig.media.base;

export const veils: Veil[] = [
  { id: "a", from: 872, dense: 910, clear: 968, to: 1004, ring: `${base}/veil-cloud-ring.webp`, core: `${base}/veil-cloud-core.webp` },
  { id: "b", from: 2160, dense: 2192, clear: 2240, to: 2276, ring: `${base}/veil-mist-ring.webp`, core: `${base}/veil-mist-core.webp` },
];

/** Images are fetched this many frames before a veil starts. */
const preload = 420;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createVeils(stage: HTMLElement): SceneMedia {
  const reduce = prefersReducedMotion();
  const layers = veils.map((v) => {
    const el = stage.querySelector<HTMLElement>(`[data-veil="${v.id}"]`);
    return {
      v,
      el,
      ring: el?.querySelector<HTMLImageElement>(".veil-ring") ?? null,
      core: el?.querySelector<HTMLImageElement>(".veil-core") ?? null,
      loaded: false,
      shown: false,
    };
  });

  return {
    render(update: SceneUpdate) {
      const f = frameAt(update.progress);
      for (const l of layers) {
        const { v, el, ring, core } = l;
        if (!el || !ring || !core) continue;
        if (!l.loaded && f > v.from - preload && f < v.to + preload) {
          ring.src = v.ring;
          core.src = v.core;
          l.loaded = true;
        }
        const active = f > v.from && f < v.to;
        if (!active) {
          if (l.shown) {
            el.style.visibility = "hidden";
            l.shown = false;
          }
          continue;
        }
        if (!l.shown) {
          el.style.visibility = "visible";
          l.shown = true;
        }
        // Closing in (0 → 1), then opening (0 → 1).
        const closing = smooth((f - v.from) / (v.dense - v.from));
        const opening = smooth((f - v.clear) / (v.to - v.clear));
        const ringOpacity = f < v.clear ? Math.pow(closing, 0.7) : 1 - Math.pow(opening, 1.4);
        const ringScale = f < v.clear ? lerp(2.1, 1, closing) : lerp(1, 2.5, opening);
        const coreOpacity = f < v.clear ? clamp01((closing - 0.4) / 0.6) : 1 - clamp01(opening / 0.6);
        // A slow push through the cloud the whole way.
        const drift = lerp(1.04, 1.14, clamp01((f - v.from) / (v.to - v.from)));
        ring.style.opacity = ringOpacity.toFixed(3);
        core.style.opacity = coreOpacity.toFixed(3);
        if (!reduce) {
          ring.style.transform = `scale(${ringScale.toFixed(4)})`;
          core.style.transform = `scale(${drift.toFixed(4)})`;
        }
      }
    },
    dispose() {
      for (const l of layers) if (l.el) l.el.style.visibility = "hidden";
    },
  };
}
