/**
 * A wall of cloud over the film's two hard cuts, so they happen inside the cloud:
 *   A — the take-off (cut to the flight, 908–918, and on past the coast to the open sea, 1036);
 *   B — the snowy plane's peaks (cut to the snowboard slope at ~2196).
 *
 * As if the camera sank through a bank of cumulus: the cloud's edge rises from the bottom
 * of the screen until the screen is all cloud, drifts on a little, then its underside
 * rises out of the top and leaves the new scene, which shows from the bottom up. The
 * story's line for the moment stands still in the middle of the screen, as if it had always
 * been there and the cloud brought it out: it shows only where the cloud is behind it (a
 * soft mask that follows the front layer's edge up through it, and its underside out). Two layers of the same real cloud
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
import { storyStore } from "./storyStore";
import { frameAt } from "./pace";

export type Veil = {
  id: string;
  /** Film frames: rising from `from`, all cloud from `dense` to `clear`, gone by `to`. */
  from: number;
  dense: number;
  clear: number;
  to: number;
  /** The story phrase it brings out, if any (story.ts, shown from `from` to `to`). */
  phrase?: string;
};

const base = journeyConfig.media.base;
export const wallImages = { front: `${base}/veil-wall.webp`, back: `${base}/veil-wall-back.webp`, inside: `${base}/veil-inside.webp` };

export const veils: Veil[] = [
  // Rising as the plane leaves the ground, all white just before the cut (908–918).
  // Covers both the cut to the flight (908-918) and the smoothed cut from the coast to the
  // open sea (1020-1036): it opens with the plane already out over the sea, followed from
  // behind; no runway, coast or island is seen again.
  { id: "a", from: 880, dense: 906, clear: 1038, to: 1072, phrase: "takeoff" },
  // Over the cut to the slope (2196), and on until it has gone on the slope below the crest
  // (2458), the moment the film carries on from.
  // Brings out line 06 like cloud A does its own; the next one (07) comes with the
  // snowboarder, after it.
  { id: "b", from: 2166, dense: 2192, clear: 2424, to: 2458, phrase: "mountains" },
];

/** Images are fetched this many frames before a veil starts. */
const preload = 420;
/** Film frames the back layer leads by on the way in (and lingers by on the way out). */
const lead = 5;
/** The back layer's size against the front's (app/globals.css). */
const backScale = 1.12;
/** Where the front layer's cloud is solid, as shares of its edge's height: below this on the edge, above this on the underside. */
const solidEdge = 0.62;
const solidUnder = 0.38;
/** The soft band over which the line comes out of (and goes back into) the clear (share of the edge's height). */
const band = 0.22;
/** Nothing of the line (outside its cloud). */
const hidden = "linear-gradient(transparent, transparent)";

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
    const place = v.phrase ? stage.querySelector<HTMLElement>(`[data-phrase-place="${v.phrase}"]`) : null;
    if (place && !reduce) setMask(place, hidden);
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
            // Kept masked: the timeline may still be fading it out (its glide).
            if (l.place) setMask(l.place, hidden);
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
        // The line, where it stands, only where the cloud is behind it.
        if (l.place) {
          if (storyStore.get().studio.mode === "edit") setMask(l.place, "");
          else {
            const y0 = l.place.getBoundingClientRect().top - stage.getBoundingClientRect().top;
            const from = top + solidEdge * e - y0; // the cloud's solid top, in the line's own box
            const to = top + e + (1 + wallSlack) * h + solidUnder * e - y0; // its solid bottom
            const b = band * e;
            setMask(l.place, `linear-gradient(transparent ${(from - b).toFixed(1)}px, #000 ${from.toFixed(1)}px, #000 ${(to - b).toFixed(1)}px, transparent ${to.toFixed(1)}px)`);
          }
        }
      }
    },
    dispose() {
      for (const l of layers) {
        if (l.el) l.el.style.visibility = "hidden";
        if (l.place) setMask(l.place, "");
        if (l.text) l.text.style.opacity = "";
      }
    },
  };
}

function setMask(el: HTMLElement, mask: string) {
  el.style.maskImage = mask;
  el.style.webkitMaskImage = mask;
}

/** The cloud edge's height (px): the 32:9 image across at least the width, or 1.1 screens on narrow ones. */
function edge(stage: HTMLElement) {
  return (Math.max(stage.clientWidth, stage.clientHeight * 1.1) * 9) / 32;
}
