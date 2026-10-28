/**
 * The site's single scroll engine: Lenis smooth scrolling driven by GSAP's ticker,
 * with ScrollTrigger updated from Lenis' scroll events.
 *
 * - One loop: Lenis runs with `autoRaf: false` and is stepped from `gsap.ticker`, so
 *   smooth scrolling, ScrollTrigger and every GSAP tween share one requestAnimationFrame.
 * - One instance: `startScrollEngine()` is reference-counted and kept on `globalThis`,
 *   so React Strict Mode, Fast Refresh or a second caller never create a second Lenis.
 * - Reduced motion: Lenis' `respectReducedMotion` turns smoothing off (native, instant
 *   scrolling); ScrollTrigger scenes still follow the scroll position directly.
 * - Touch: native touch scrolling and momentum are kept (`syncTouch` off), which is
 *   the most reliable option on iOS and Android.
 */
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Feel of the smooth scroll: responsive, with a short natural glide (no long drift). */
export const scrollSettings = {
  /** Fraction of the remaining distance covered each frame (60 Hz basis); higher is snappier. */
  lerp: 0.11,
  wheelMultiplier: 1,
  touchMultiplier: 1,
} as const;

type Engine = { lenis: Lenis; users: number; stop: () => void };

const store = globalThis as typeof globalThis & { __sandyScrollEngine?: Engine };

/** Starts the engine (or joins the running one). Returns a release function. */
export function startScrollEngine(): () => void {
  let engine = store.__sandyScrollEngine;
  if (!engine) {
    const lenis = new Lenis({
      autoRaf: false,
      lerp: scrollSettings.lerp,
      wheelMultiplier: scrollSettings.wheelMultiplier,
      touchMultiplier: scrollSettings.touchMultiplier,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      respectReducedMotion: true,
    });
    const onScroll = () => ScrollTrigger.update();
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", onScroll);
    gsap.ticker.add(tick);
    // Keep scroll-linked animation in step with the scroll position after a slow frame
    // instead of letting GSAP's lag smoothing hold it back.
    gsap.ticker.lagSmoothing(0);
    // Mobile browser bars resizing the viewport shouldn't re-measure every trigger mid-scroll.
    ScrollTrigger.config({ ignoreMobileResize: true });

    engine = {
      lenis,
      users: 0,
      stop: () => {
        gsap.ticker.remove(tick);
        lenis.off("scroll", onScroll);
        lenis.destroy();
      },
    };
    store.__sandyScrollEngine = engine;
  }
  engine.users += 1;

  let released = false;
  return () => {
    const current = store.__sandyScrollEngine;
    if (released || !current) return;
    released = true;
    current.users -= 1;
    if (current.users <= 0) {
      current.stop();
      store.__sandyScrollEngine = undefined;
    }
  };
}

/** The running Lenis instance, if any (for scrollTo, stop/start, velocity). */
export function getLenis(): Lenis | undefined {
  return store.__sandyScrollEngine?.lenis;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger };
