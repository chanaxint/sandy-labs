"use client";

import { ScrollScene } from "@/components/scroll/ScrollScene";
import { useLang } from "@/lib/i18n/lang";
import { prefersReducedMotion } from "@/lib/scroll/engine";
import { home } from "@/lib/site/home";
import { whatWeDo } from "@/lib/site/whatWeDo";
import type { CSSProperties } from "react";

const { media, length, rise, focusX } = whatWeDo;
const { eyebrow, title } = home.introduction;

/** The village rises a little over the valley as the scene goes on (none with reduced motion). */
function villageRise(tl: gsap.core.Timeline, stage: HTMLElement) {
  const village = stage.querySelector("[data-village]");
  if (!village || prefersReducedMotion()) return;
  tl.fromTo(village, { yPercent: 0 }, { yPercent: -rise * 100, ease: "none", duration: 1 });
}

/**
 * The introduction's opening (the home page's first section after the journey): The whole painting of the valley at dawn, bottom-aligned
 * and as wide as the screen (on narrow screens as wide as keeps the whole village in view,
 * its sky going on above); while the stage is pinned, only the village and its hill rise a little,
 * as a layer of their own, their hill going on below so nothing opens under it.
 */
export function WhatWeDo() {
  const { lang } = useLang();
  return (
    <ScrollScene id="what-we-do" length={length} timeline={villageRise} className="wwd-sky">
      <div
        className="wwd-frame absolute bottom-0"
        style={{ "--focus": focusX, aspectRatio: `${media.valley.width} / ${media.valley.height}` } as CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a layer of a hand-built composition */}
        <img
          alt=""
          src={media.valley.src}
          width={media.valley.width}
          height={media.valley.height}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 block size-full"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- a layer of a hand-built composition */}
        <img
          alt=""
          data-village
          src={media.village.src}
          width={media.village.width}
          height={media.village.height}
          loading="lazy"
          decoding="async"
          className="absolute top-0 left-0 block h-auto w-full will-change-transform"
        />
      </div>
      {/* The valley's floor melts into the page that follows (HomeIntroduction). */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[16%] bg-gradient-to-b from-transparent to-ivory" />
      <div className="absolute top-[clamp(6.5rem,17vh,11rem)] right-6 left-6 text-ink md:right-auto md:left-[clamp(1.5rem,6vw,6.5rem)] md:max-w-[44rem]">
        <p className="eyebrow text-ink/70">{eyebrow[lang]}</p>
        <h2 id="introduction-title" className="display-1 mt-5">
          {title[lang]}
        </h2>
      </div>
    </ScrollScene>
  );
}
