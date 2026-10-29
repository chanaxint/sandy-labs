"use client";

import { ScrollScene } from "@/components/scroll/ScrollScene";
import { journeyConfig } from "@/lib/journey/config";
import { createFilm } from "@/lib/journey/film";
import { filmLength } from "@/lib/journey/pace";
import { createJumpBeat } from "@/lib/journey/jumpBeat";
import { createRider } from "@/lib/journey/rider";
import { createStory } from "@/lib/journey/storyTimeline";
import type { SceneMedia } from "@/lib/scroll/scene";
import { StoryOverlays } from "./CinematicTextOverlay";
import { ShootingStars } from "./ShootingStars";

const { media, scrub } = journeyConfig;
/** Scene length in viewport heights, from the film's duration and the scroll pace. */
const length = filmLength;

/** The film, the story on it, the rider in front of the jump's phrase, and the jump's beat. */
function journeyMedia(stage: HTMLElement): SceneMedia {
  // The jump's beat goes last: it may set the scroll back onto the take-off frame, which
  // runs every part again with that position before anything draws.
  const parts = [createFilm(stage), createStory(stage), createRider(stage), createJumpBeat(stage, "journey")];
  return {
    render: (u) => parts.forEach((p) => p.render(u)),
    dispose: () => parts.forEach((p) => p.dispose?.()),
  };
}

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
      media={journeyMedia}
    >
      <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${media.poster})` }} />
      <canvas aria-hidden className="absolute inset-0 block size-full" />
      {/* Now and then over the night at the end, behind the story's lines. */}
      <ShootingStars />
      <StoryOverlays />
      {/* The snowboarder's cut-out, over the jump's line (lib/journey/rider.ts). */}
      <canvas aria-hidden data-rider className="pointer-events-none absolute inset-0 z-20 block size-full" />
    </ScrollScene>
  );
}
