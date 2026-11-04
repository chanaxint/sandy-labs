/**
 * A wall of cloud over the film's two hard cuts, so they happen inside the cloud:
 *   A — the take-off (cut to the flight over the sea, 908–918);
 *   B — the snowy plane's peaks (cut to the snowboard slope at ~2196).
 *
 * As if the camera sank through a bank of cumulus: the cloud's edge rises from the bottom
 * of the screen until the screen is all cloud, drifts on a little, then its underside
 * rises out of the top and leaves the new scene, which shows from the bottom up. The
 * story's line for the moment is written in the cloud: it rises in with it, in the middle
 * of the cloud's inside, and leaves with it (its place is moved with the front layer). Two layers of the same real cloud
 * (veil-wall*.webp, cumulus billows by scripts/journey/cloud_wall.py): one
 * further back that leads on the way in and lingers on the way out, one in front. Each is
 * a column: cloud edge, the inside of the cloud (the film's own view from inside a cloud,
 * veil-inside.webp, repeating downwards), the edge upside down. Driven by the film frame
 * (scroll), so it plays backwards exactly; the scroll pace is slow all through it
 * (config.ts `pace`), so it passes unhurried. Only transform; reduced motion: a plain fade of the white.
 */
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { prefersReducedMotion } from "@/lib/scroll/engine";
import { journeyConfig } from "./config";
import { frameAt } from "./pace";

export type Veil = {
  id: string;
  /** Film frames: rising from `from`, all cloud from `dense` to `clear`, gone by `to`. */
  from: number;
  dense: number;
  clear: number;
  to: number;
  /** The story phrase written in it (story.ts, shown from `from` to `to`). */
  phrase: string;
};

const base = journeyConfig.media.base;
export const wallImages = { front: `${base}/veil-wall.webp`, back: `${base}/veil-wall-back.webp`, inside: `${base}/veil-inside.webp` };

export const veils: Veil[] = [
  // Rising as the plane leaves the ground, all white just before the cut (908–918).
  { id: "a", from: 880, dense: 906, clear: 962, to: 996, phrase: "takeoff" },
  // Over the cut to the slope (2196), and on until it has gone on the slope below the crest
  // (2458), the moment the film carries on from.
  { id: "b", from: 2166, dense: 2192, clear: 2424, to: 2458, phrase: "snowboard-a" },
];

/** Images are fetched this many frames before a veil starts. */
const preload = 420;
/** Film frames the back layer leads by on the way in (and lingers by on the way out). */
const lead = 5;
/** The back layer's size against the front's (app/globals.css). */
const backScale = 1.12;
/** Extra cloud in the wall (share of the screen height), for the drift while it covers the screen. */
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
    const place = stage.querySelector<HTMLElement>(`[data-phrase-place="${v.phrase}"]`);
    return {
      v,
      el,
      place,
      text: place?.querySelector<HTMLElement>(".story-text") ?? null,
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
          for (const s of el.querySelectorAll<HTMLElement>("[data-bg]")) s.style.backgroundImage = `url(${s.dataset.bg})`;
          l.loaded = true;
        }
        const active = f > v.from - lead && f < v.to + lead;
        if (!active) {
          if (l.shown) {
            el.style.visibility = "hidden";
            if (l.place) l.place.style.transform = "";
            if (l.text) l.text.style.opacity = "";
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
          // No movement: the cloud fades in and out, the front layer held over the screen.
          const o = f <= v.dense ? ease((f - v.from) / (v.dense - v.from)) : 1 - ease((f - v.clear) / (v.to - v.clear));
          front.style.transform = `translate3d(0, ${-e}px, 0)`;
          front.style.opacity = o.toFixed(3);
          back.style.opacity = "0";
          // The line fades with the cloud, where it is laid out, once the cloud is mostly there.
          if (l.text) l.text.style.opacity = (o * o * o).toFixed(3);
          continue;
        }
        const top = wallTop(v, f, h, e);
        back.style.transform = `translate3d(0, ${wallTop(v, f <= v.dense ? f + lead : f - lead, h, e * backScale).toFixed(1)}px, 0)`;
        front.style.transform = `translate3d(0, ${top.toFixed(1)}px, 0)`;
        // The line in the middle of the cloud's inside (laid out centred on the screen).
        if (l.place) l.place.style.transform = `translate3d(0, ${(top + e + ((1 + wallSlack) * h) / 2 - h / 2).toFixed(1)}px, 0)`;
      }
    },
    dispose() {
      for (const l of layers) {
        if (l.el) l.el.style.visibility = "hidden";
        if (l.place) l.place.style.transform = "";
        if (l.text) l.text.style.opacity = "";
      }
    },
  };
}

/** The cloud edge's height (px): the 32:9 image across at least the width, or 1.1 screens on narrow ones. */
function edge(stage: HTMLElement) {
  return (Math.max(stage.clientWidth, stage.clientHeight * 1.1) * 9) / 32;
}
