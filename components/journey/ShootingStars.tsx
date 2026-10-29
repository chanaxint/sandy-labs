"use client";

import { useEffect, useRef } from "react";
import { filmStatus } from "@/lib/journey/film";
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";

/** From this film frame on the sky is dark enough for them (the night, its stars out). */
const nightFrom = 4860;
/** Seconds between two shooting stars: at random between these. */
const every = [5, 6.5] as const;

/**
 * Now and then a shooting star over the night at the end of the film: from a random
 * place in the upper sky, slanting down to one side, faint and quick like the film's own
 * stars. Behind the story's lines. Scheduled on the shared GSAP ticker (delayedCall),
 * drawn with CSS keyframes (app/globals.css); only while the film shows the night.
 * None with reduced motion.
 */
export function ShootingStars() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || prefersReducedMotion()) return;
    const r = gsap.utils.random;
    let next: gsap.core.Tween | null = null;

    const shoot = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // Slanting down, to the left or to the right.
      const angle = Math.random() < 0.5 ? r(148, 166) : r(14, 32);
      const len = r(110, 200) * Math.min(1, w / 1200 + 0.35);
      const travel = len * r(1.6, 2.4);
      const rad = (angle * Math.PI) / 180;
      const star = document.createElement("span");
      star.className = "shooting-star";
      star.style.left = `${r(0.12, 0.88) * w - len}px`;
      star.style.top = `${r(0.06, 0.5) * h}px`;
      star.style.setProperty("--len", `${len}px`);
      star.style.setProperty("--a", `${angle}deg`);
      star.style.setProperty("--dx", `${Math.cos(rad) * travel}px`);
      star.style.setProperty("--dy", `${Math.sin(rad) * travel}px`);
      star.style.setProperty("--t", `${r(0.8, 1.15)}s`);
      star.addEventListener("animationend", () => star.remove());
      el.appendChild(star);
    };

    const schedule = () => {
      next = gsap.delayedCall(r(every[0], every[1]), () => {
        if (filmStatus.shown >= nightFrom && !document.hidden) shoot();
        schedule();
      });
    };
    schedule();
    return () => {
      next?.kill();
      el.replaceChildren();
    };
  }, []);

  return <div ref={box} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" />;
}
