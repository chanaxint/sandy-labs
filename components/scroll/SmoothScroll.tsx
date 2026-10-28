"use client";

import { useEffect } from "react";
import { startScrollEngine } from "@/lib/scroll/engine";

/**
 * Starts the shared Lenis + GSAP scroll engine for the page. Renders nothing and
 * never re-renders; mounting it twice (or Strict Mode's double effect) reuses the
 * same engine.
 */
export function SmoothScroll() {
  useEffect(() => startScrollEngine(), []);
  return null;
}
