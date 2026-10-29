/**
 * Scroll ↔ film frame, with the pace set per stretch of film (`journeyConfig.pace`).
 *
 * The film scene's scroll progress (0 → 1) maps to a film frame through the scroll
 * distance each stretch takes, so the film plays slower where the story has lines to
 * read and quicker over empty stretches, and both directions are exact inverses.
 */
import { journeyConfig } from "./config";

const { film, pace } = journeyConfig;
const last = film.frames - 1;

/** Stretch boundaries (frames) and the scroll distance (vh) reached at each. */
const bounds: number[] = [];
const dist: number[] = [0];
const rate: number[] = [];
pace.forEach((p, i) => {
  const to = i + 1 < pace.length ? pace[i + 1].from : last;
  bounds.push(p.from);
  rate.push(p.vhPerSecond / film.fps); // vh per frame
  dist.push(dist[i] + (to - p.from) * rate[i]);
});
bounds.push(last);
const total = dist[dist.length - 1];

/** Scroll length of the whole film, in viewport heights. */
export const filmLength = total / 100;

/** The film frame (fractional) at scroll progress p. */
export function frameAt(p: number): number {
  const d = Math.max(0, Math.min(1, p)) * total;
  let i = 0;
  while (i < rate.length - 1 && d >= dist[i + 1]) i++;
  return Math.min(last, bounds[i] + (d - dist[i]) / rate[i]);
}

/** The scroll progress at film frame f. */
export function progressAt(f: number): number {
  const x = Math.max(0, Math.min(last, f));
  let i = 0;
  while (i < rate.length - 1 && x >= bounds[i + 1]) i++;
  return (dist[i] + (x - bounds[i]) * rate[i]) / total;
}

/** Film seconds per screen of scrolling at frame f (for the debug panel). */
export function paceAt(f: number): number {
  let i = 0;
  while (i < rate.length - 1 && f >= bounds[i + 1]) i++;
  return pace[i].vhPerSecond;
}
