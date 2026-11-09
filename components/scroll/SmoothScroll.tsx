"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLenis, ScrollTrigger, startScrollEngine } from "@/lib/scroll/engine";

/**
 * Starts the shared Lenis + GSAP scroll engine for the page. Renders nothing and
 * never re-renders; mounting it twice (or Strict Mode's double effect) reuses the
 * same engine.
 *
 * On a move to another route (next/link), the new page starts clean: at the top, the
 * scroll free (whatever the home page held: its opening, its menu, Create my website) and
 * ScrollTrigger measuring the new page.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => startScrollEngine(), []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const html = document.documentElement;
    html.classList.remove("scroll-held", "create-mode");
    delete html.dataset.chrome;
    const lenis = getLenis();
    lenis?.start();
    lenis?.scrollTo(0, { immediate: true, force: true });
    ScrollTrigger.refresh();
  }, [pathname]);

  return null;
}
