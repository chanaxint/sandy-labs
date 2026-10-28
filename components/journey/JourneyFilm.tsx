"use client";

import { ScrollScene } from "@/components/scroll/ScrollScene";
import { journeyConfig } from "@/lib/journey/config";
import { createFilm } from "@/lib/journey/film";

const { film, media, vhPerSecond, scrub } = journeyConfig;
/** Scene length in viewport heights, from the film's duration and the scroll pace. */
const length = ((film.frames / film.fps) * vhPerSecond) / 100;

/**
 * Sandy Labs — The Journey: a full-screen film the visitor moves through by scrolling.
 * The stage stays pinned while the film plays; it can be scrolled at once (a light
 * size plays first, the sharp one takes over as it loads), and the poster shows
 * until the first frame is drawn.
 */
export function JourneyFilm() {
  return (
    <ScrollScene
      id="journey"
      length={length}
      scrub={scrub}
      media={createFilm}
    >
      <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${media.poster})` }} />
      <canvas aria-hidden className="absolute inset-0 block size-full" />
    </ScrollScene>
  );
}
