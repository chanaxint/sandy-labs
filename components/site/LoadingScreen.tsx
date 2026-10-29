"use client";

import { useEffect, useState } from "react";
import { mark } from "@/lib/brand/logo";
import { filmStatus } from "@/lib/journey/film";
import { gsap } from "@/lib/scroll/engine";

/** Shown at least this long (s), so it never just flashes. */
const minSeconds = 1.4;
/** Never longer than this (s): the poster stands in while the film keeps loading. */
const maxSeconds = 8;
/** The mark's height (px) and its line width on screen (px). */
const size = 44;
const linePx = 1.1;

/**
 * The first thing on screen: white, with the island mark small at the centre, its lines
 * drawn round and round, chasing each other. It fades once the film has drawn its first
 * frame (rendered on the server, so it is there before anything loads). Not in the Studio.
 */
export function LoadingScreen() {
  const [phase, setPhase] = useState<"on" | "leaving" | "off">("on");

  useEffect(() => {
    const studio = new URLSearchParams(location.search).has("studio");
    const start = performance.now();
    const check = () => {
      const t = (performance.now() - start) / 1000;
      if (!studio && (t < minSeconds || (filmStatus.mode === "poster" && t < maxSeconds))) return;
      gsap.ticker.remove(check);
      setPhase(studio ? "off" : "leaving");
    };
    gsap.ticker.add(check);
    return () => gsap.ticker.remove(check);
  }, []);

  if (phase === "off") return null;
  const line = (linePx * mark.height) / size;
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`loading-screen ${phase === "leaving" ? "is-leaving" : ""}`}
      onTransitionEnd={(e) => e.target === e.currentTarget && phase === "leaving" && setPhase("off")}
    >
      <svg viewBox={`0 0 ${mark.width} ${mark.height}`} style={{ height: size }} aria-hidden fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {mark.loops.map((l, i) => (
          <g key={i} strokeWidth={line}>
            <path d={l.d} pathLength={1} className="loading-base" />
            <path d={l.d} pathLength={1} className="loading-run" style={{ animationDelay: `${-i * 0.45}s` }} />
          </g>
        ))}
      </svg>
    </div>
  );
}
