"use client";

import { useEffect, useRef } from "react";
import { journeyConfig } from "@/lib/journey/config";

const { src, width, height } = journeyConfig.media.morningSky;
/** Drift speed, in the frame's pixels per second (a calm wind to the right). */
const speed = 9;

/**
 * Behind "Create my website": the morning sky drifting slowly from left to right. The
 * film's own frame (the one the night turned back to) beside its mirror image, framed
 * exactly as the film's "cover" framing, so it takes over the still frame without a jump
 * and repeats sideways without a seam. CSS keyframes on the inner strip; none with
 * reduced motion (app/globals.css).
 */
export function MorningSky() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const place = () => {
      const s = Math.max(innerWidth / width, innerHeight / height);
      el.style.setProperty("--sl", `${(innerWidth - width * s) / 2}px`);
      el.style.setProperty("--st", `${(innerHeight - height * s) / 2}px`);
      el.style.setProperty("--sw", `${width * 2 * s}px`);
      el.style.setProperty("--sh", `${height * s}px`);
      el.style.setProperty("--sd", `${(width * 2) / speed}s`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  return (
    <div ref={box} aria-hidden className="morning-sky pointer-events-none fixed inset-0 z-[14]">
      <div style={{ backgroundImage: `url(${src})` }} />
    </div>
  );
}
