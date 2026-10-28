"use client";

import { ScrollScene } from "@/components/scroll/ScrollScene";
import { journeyConfig } from "@/lib/journey/config";
import { createFilm } from "@/lib/journey/film";

const { film, media, vhPerSecond, scrub } = journeyConfig;
/** Scene length in viewport heights, from the film's duration and the scroll pace. */
const length = ((film.frames / film.fps) * vhPerSecond) / 100;

/**
 * Sandy Labs — The Journey: a full-screen film the visitor moves through by scrolling.
 * The stage stays pinned while the film plays; the poster shows until the first
 * frame is drawn, with a slim progress indicator while the opening share loads.
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
      {/* Opening load; the film updates and removes it (lib/journey/film.ts). */}
      <div
        data-loader
        role="progressbar"
        aria-label="Loading the film"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/40 to-transparent pt-24 transition-opacity duration-700 data-[state=done]:opacity-0 motion-reduce:transition-none"
      >
        <p
          data-loader-label
          className="pb-5 text-center font-mono text-xs tracking-[0.2em] text-white uppercase"
        >
          Loading 0%
        </p>
        <div className="h-0.5 bg-white/25">
          <div data-loader-bar className="h-full origin-left bg-white" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
    </ScrollScene>
  );
}
