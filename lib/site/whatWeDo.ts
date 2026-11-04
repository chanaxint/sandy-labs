import type { Lang } from "@/lib/journey/story";

/**
 * "What we do", after the journey: its opening is the valley at dawn (the user's
 * painting), the village on its hill a layer of its own that rises a little with the
 * scroll (components/site/WhatWeDo.tsx). Media from scripts/what-we-do/build-layers.py.
 */
export const whatWeDo = {
  title: { en: "What we do", tr: "Neler yapıyoruz" } satisfies Record<Lang, string>,
  media: {
    /** The painting, its own village taken out, with more sky above: the frame (16:10). */
    valley: { src: "/media/what-we-do/valley.webp", width: 2000, height: 1250 },
    /** The village and its hill, in the same frame, the hill carried on below it. */
    village: { src: "/media/what-we-do/village.webp", width: 2000, height: 1750 },
  },
  /** Scroll distance of the opening, in viewport heights (the stage stays pinned). */
  length: 1.2,
  /** How far the village rises over it, as a share of its own picture's height. */
  rise: 0.05,
  /** Where the village stands across the painting (share of its width): kept in view on narrow screens. */
  focusX: 0.55,
};
