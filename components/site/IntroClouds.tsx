"use client";

import { useEffect, useRef } from "react";
import { journeyConfig } from "@/lib/journey/config";
import { filmStatus } from "@/lib/journey/film";
import { gsap } from "@/lib/scroll/engine";

const { src, top, width, height } = journeyConfig.media.introClouds;
/** Drift speed, in the poster's pixels per second (a calm wind to the left). */
const speed = 10;
/** Film frames where the camera tips down into the clouds (the horizon rises off the top, then all is cloud). */
const dive = { from: 230, to: 315 };

/**
 * The opening's clouds drifting slowly to the left, over the film's still first frame:
 * the poster's cloud band, framed exactly as the film's "cover" framing, repeating
 * sideways (beside its mirror image, so without a seam) and faded in towards the horizon
 * so the sky stays still. The drift is CSS keyframes on the inner strip.
 *
 * Once the journey starts (`leaving`) the clouds keep drifting where they are and go
 * down with the camera: as the film tips into the clouds the band rises and grows with
 * it, and fades out as the screen fills with cloud, so nothing jumps back to the first
 * frame. Driven by the frame the film shows (on the shared GSAP ticker); `onGone` once
 * past. None with reduced motion (app/globals.css).
 */
export function IntroClouds({ leaving, onGone }: { leaving: boolean; onGone: () => void }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // The film's framing: the frame scaled to cover the screen, centred.
    const place = () => {
      const s = Math.max(innerWidth / width, innerHeight / height);
      el.style.setProperty("--cl", `${(innerWidth - width * s) / 2}px`);
      el.style.setProperty("--ct", `${(innerHeight - height * s) / 2 + height * top * s}px`);
      el.style.setProperty("--cw", `${width * 2 * s}px`);
      el.style.setProperty("--ch", `${height * (1 - top) * s}px`);
      el.style.setProperty("--cd", `${(width * 2) / speed}s`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!leaving || !el) return;
    const follow = () => {
      const p = gsap.utils.clamp(0, 1, (filmStatus.shown - dive.from) / (dive.to - dive.from));
      const eased = p * p * (3 - 2 * p);
      el.style.transform = `translateY(${-0.55 * eased * innerHeight}px) scale(${1 + 0.35 * eased})`;
      el.style.opacity = String(1 - gsap.utils.clamp(0, 1, (p - 0.35) / 0.65));
      if (p >= 1) {
        gsap.ticker.remove(follow);
        onGone();
      }
    };
    gsap.ticker.add(follow);
    return () => gsap.ticker.remove(follow);
  }, [leaving, onGone]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-20">
      <div ref={box} className="intro-clouds">
        <div style={{ backgroundImage: `url(${src})` }} />
      </div>
    </div>
  );
}
