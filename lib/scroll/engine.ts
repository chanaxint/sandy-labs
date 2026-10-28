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
  lerp: 0.09,
  wheelMultiplier: 1,
  touchMultiplier: 1,
  /**
   * Largest step (px) a single wheel event may move: a mouse notch (~100px) and trackpad
   * gestures pass untouched, while huge deltas from some mice or fast flicks can't throw
   * scroll-linked scenes several seconds forward at once.
   */
  maxWheelStep: 160,
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
      virtualScroll: (data) => {
        if (data.event.type === "wheel") {
          const max = scrollSettings.maxWheelStep;
          data.deltaY = Math.max(-max, Math.min(max, data.deltaY));
        }
        return true;
      },
    });
    const onScroll = () => ScrollTrigger.update();
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", onScroll);
    gsap.ticker.add(tick);
    const stopRestoring = restoreScroll(lenis);
    // Keep scroll-linked animation in step with the scroll position after a slow frame
    // instead of letting GSAP's lag smoothing hold it back.
    gsap.ticker.lagSmoothing(0);
    // Mobile browser bars resizing the viewport shouldn't re-measure every trigger mid-scroll.
    ScrollTrigger.config({ ignoreMobileResize: true });

    engine = {
      lenis,
      users: 0,
      stop: () => {
        stopRestoring();
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

/**
 * Keeps the scroll position across reloads. The browser's own restoration runs before
 * ScrollTrigger has added the pinned scenes' scroll distance, when the page is still
 * short, so it would land at the top: the position is saved on leaving and put back
 * after the first ScrollTrigger refresh instead.
 */
function restoreScroll(lenis: Lenis): () => void {
  const key = `scroll:${location.pathname}`;
  history.scrollRestoration = "manual";
  const save = () => {
    try {
      sessionStorage.setItem(key, String(Math.round(window.scrollY)));
    } catch {
      // Storage unavailable (private mode): reloads start at the top.
    }
  };
  let saved = 0;
  try {
    saved = Number(sessionStorage.getItem(key)) || 0;
  } catch {
    saved = 0;
  }
  const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  const done = () => {
    ScrollTrigger.removeEventListener("refresh", onRefresh);
    for (const e of events) window.removeEventListener(e, done);
  };
  // A refresh can run before every scene has added its length (the page still too short
  // to reach the saved position): wait for one where it fits. The visitor scrolling
  // first cancels it.
  const onRefresh = () => {
    if (document.documentElement.scrollHeight - window.innerHeight < saved) return;
    done();
    lenis.scrollTo(saved, { immediate: true, force: true });
  };
  if (saved > 0 && !location.hash) {
    ScrollTrigger.addEventListener("refresh", onRefresh);
    for (const e of events) window.addEventListener(e, done, { passive: true });
  }
  window.addEventListener("pagehide", save);
  return () => {
    done();
    window.removeEventListener("pagehide", save);
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
