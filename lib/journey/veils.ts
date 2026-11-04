/**
 * A wall of cloud over the film's two hard cuts, so they happen inside the cloud:
 *   A — the take-off (cut to the flight over the sea, 908–918);
 *   B — the snowy plane's peaks (cut to the snowboard slope at ~2196).
 *
 * As if the camera sank through a bank of cumulus: the cloud's edge rises from the bottom
 * of the screen until it is all white (the story's line for the moment shows there, dark
 * on the white, story.ts), drifts on a little, then its underside rises out of the top and
 * leaves the new scene, which shows from the bottom up. Two layers of the same real cloud
 * (veil-wall*.webp, cumulus billows by scripts/journey/cloud_wall.py): one
 * further back that leads on the way in and lingers on the way out, one in front. Each is
 * a column: cloud edge, plain white, the edge upside down. Driven by the film frame
 * (scroll), so it plays backwards exactly; the scroll pace is slow all through it
 * (config.ts `pace`), so it passes unhurried. Only transform; reduced motion: a plain fade of the white.
 */
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { prefersReducedMotion } from "@/lib/scroll/engine";
import { journeyConfig } from "./config";
import { frameAt } from "./pace";

export type Veil = {
  id: string;
  /** Film frames: rising from `from`, all white from `dense` to `clear`, gone by `to`. */
  from: number;
  dense: number;
  clear: number;
  to: number;
};

const base = journeyConfig.media.base;
export const wallImages = { front: `${base}/veil-wall.webp`, back: `${base}/veil-wall-back.webp` };

export const veils: Veil[] = [
  // Rising as the plane leaves the ground, all white just before the cut (908–918).
  { id: "a", from: 880, dense: 906, clear: 962, to: 996 },
  { id: "b", from: 2166, dense: 2192, clear: 2240, to: 2274 },
];

/** Images are fetched this many frames before a veil starts. */
const preload = 420;
/** Film frames the back layer leads by on the way in (and lingers by on the way out). */
const lead = 5;
/** The back layer's size against the front's (app/globals.css). */
const backScale = 1.12;
/** Extra white in the wall (share of the screen height), for the drift while it is white. */
export const wallSlack = 0.3;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/**
 * Where the wall's top is (px from the screen's top) at film frame f, for a screen h high
 * and an edge e high: from just below the screen to all white (-e), a drift through the
 * slack, then out of the top (the whole column above the screen).
 */
function wallTop(v: Veil, f: number, h: number, e: number) {
  const covered = -e;
  const drifted = -e - wallSlack * h;
  const gone = -(2 * e + (1 + wallSlack) * h);
  if (f <= v.dense) return h + (covered - h) * ease((f - v.from) / (v.dense - v.from));
  if (f <= v.clear) return covered + (drifted - covered) * ((f - v.dense) / (v.clear - v.dense));
  return drifted + (gone - drifted) * ease((f - v.clear) / (v.to - v.clear));
}

export function createVeils(stage: HTMLElement): SceneMedia {
  const reduce = prefersReducedMotion();
  const layers = veils.map((v) => {
    const el = stage.querySelector<HTMLElement>(`[data-veil="${v.id}"]`);
    return {
      v,
      el,
      walls: el ? Array.from(el.querySelectorAll<HTMLElement>("[data-wall]")) : [],
      loaded: false,
      shown: false,
      edge: 0,
    };
  });

  return {
    render(update: SceneUpdate) {
      const f = frameAt(update.progress);
      for (const l of layers) {
        const { v, el, walls } = l;
        if (!el || walls.length < 2) continue;
        if (!l.loaded && f > v.from - preload - lead && f < v.to + preload + lead) {
          for (const img of el.querySelectorAll<HTMLImageElement>("img[data-src]")) img.src = img.dataset.src!;
          l.loaded = true;
        }
        const active = f > v.from - lead && f < v.to + lead;
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
        const [back, front] = walls;
        const h = stage.clientHeight;
        const e = edge(stage);
        if (e !== l.edge) {
          // The column's sizes (app/globals.css .veil-wall) follow the stage.
          el.style.setProperty("--wall-edge", `${e}px`);
          el.style.setProperty("--wall-white", `${(1 + wallSlack) * h}px`);
          l.edge = e;
        }
        if (reduce) {
          // No movement: the white fades in and out, the front layer held over the screen.
          const o = f <= v.dense ? ease((f - v.from) / (v.dense - v.from)) : 1 - ease((f - v.clear) / (v.to - v.clear));
          front.style.transform = `translate3d(0, ${-e}px, 0)`;
          front.style.opacity = o.toFixed(3);
          back.style.opacity = "0";
          continue;
        }
        back.style.transform = `translate3d(0, ${wallTop(v, f <= v.dense ? f + lead : f - lead, h, e * backScale).toFixed(1)}px, 0)`;
        front.style.transform = `translate3d(0, ${wallTop(v, f, h, e).toFixed(1)}px, 0)`;
      }
    },
    dispose() {
      for (const l of layers) if (l.el) l.el.style.visibility = "hidden";
    },
  };
}

/** The cloud edge's height (px): the 8:3 image across at least the width, or 1.1 screens on narrow ones. */
function edge(stage: HTMLElement) {
  return (Math.max(stage.clientWidth, stage.clientHeight * 1.1) * 3) / 8;
}
