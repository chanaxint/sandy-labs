"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { journeyConfig } from "@/lib/journey/config";

const { src, top, width, height } = journeyConfig.media.introClouds;
/** Drift speed, in the poster's pixels per second (a calm wind to the left). */
const speed = 10;

/**
 * The opening's clouds drifting slowly to the left, over the film's still first frame:
 * the poster's cloud band, framed exactly as the film's "cover" framing, repeating
 * sideways (beside its mirror image, so without a seam) and faded in towards the horizon
 * so the sky stays still. CSS keyframes on transform; none with reduced motion
 * (app/globals.css).
 */
export const IntroClouds = forwardRef<HTMLDivElement>(function IntroClouds(_, ref) {
  const box = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => box.current!);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // The film's framing: the frame scaled to cover the screen, centred.
    const place = () => {
      const s = Math.max(innerWidth / width, innerHeight / height);
      const tile = width * 2 * s;
      el.style.setProperty("--cl", `${(innerWidth - width * s) / 2}px`);
      el.style.setProperty("--ct", `${(innerHeight - height * s) / 2 + height * top * s}px`);
      el.style.setProperty("--cw", `${tile}px`);
      el.style.setProperty("--ch", `${height * (1 - top) * s}px`);
      el.style.setProperty("--cd", `${(width * 2) / speed}s`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  return (
    <div ref={box} aria-hidden className="intro-clouds">
      <div style={{ backgroundImage: `url(${src})` }} />
    </div>
  );
});
