"use client";

import { useEffect } from "react";
import { getLenis, gsap, ScrollTrigger } from "@/lib/scroll/engine";
import { goToSection } from "@/lib/site/sections";

/**
 * The home page's arrivals and chrome, after the journey:
 *  - opened at `/#section` (a link from another page): it goes to that section once the
 *    scenes have been measured, and stays there through later re-measures until the
 *    visitor scrolls (the opening is skipped for a hash: IntroGate); `/#create` opens
 *    Create my website;
 *  - the header turns to ink, and the journey's progress line steps aside, while the
 *    corporate content (from the valley on, `#introduction`) is under the header
 *    (`data-chrome` on <html>, app/globals.css).
 * Renders nothing.
 */
export function HomeEntry() {
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    let settled = false;
    const go = () => {
      if (settled) return;
      if (id === "create") {
        if (!getLenis()) return;
        settled = true;
        goToSection("create");
        return;
      }
      goToSection(id);
    };
    const stop = () => {
      settled = true;
      cleanup();
    };
    const wait = () => {
      if (!getLenis()) return;
      gsap.ticker.remove(wait);
      go();
    };
    const cleanup = () => {
      gsap.ticker.remove(wait);
      ScrollTrigger.removeEventListener("refresh", go);
      window.removeEventListener("load", go);
      for (const e of events) window.removeEventListener(e, stop);
    };
    gsap.ticker.add(wait);
    ScrollTrigger.addEventListener("refresh", go);
    window.addEventListener("load", go);
    for (const e of events) window.addEventListener(e, stop, { passive: true });
    return cleanup;
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    let off: (() => void) | undefined;
    const set = () => {
      const intro = document.getElementById("introduction");
      if (!intro) return;
      const content = intro.getBoundingClientRect().top <= 56;
      html.dataset.chrome = content ? "content" : "film";
    };
    const attach = () => {
      const lenis = getLenis();
      if (!lenis) return;
      gsap.ticker.remove(attach);
      off = lenis.on("scroll", set);
      set();
    };
    gsap.ticker.add(attach);
    window.addEventListener("resize", set);
    return () => {
      gsap.ticker.remove(attach);
      off?.();
      window.removeEventListener("resize", set);
      delete html.dataset.chrome;
    };
  }, []);

  return null;
}
