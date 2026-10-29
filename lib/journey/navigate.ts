/** Scroll positions of film frames, for jumps and short guided moves (menu, intro, Studio). */
import { getLenis, ScrollTrigger } from "@/lib/scroll/engine";
import { progressAt } from "./pace";

/** The journey scene's ScrollTrigger id (components/journey/JourneyFilm.tsx). */
export const journeySceneId = "journey";

/** Scroll position (px) of film frame f, or null before the scene is set up. */
export function scrollForFrame(f: number): number | null {
  const st = ScrollTrigger.getById(journeySceneId);
  return st ? st.start + (st.end - st.start) * progressAt(f) : null;
}

/**
 * Scrolls the film to frame f: at once, or over `seconds` with a gentle in-out. Before the
 * scene is set up nothing moves, but `onComplete` still runs (nothing waits for good).
 */
export function goToFrame(f: number, seconds?: number, onComplete?: () => void) {
  const y = scrollForFrame(f);
  const lenis = getLenis();
  if (y === null || !lenis) return void onComplete?.();
  if (seconds)
    lenis.scrollTo(y, { duration: seconds, easing: (t) => 0.5 - Math.cos(Math.PI * t) / 2, force: true, onComplete });
  else {
    lenis.scrollTo(y, { immediate: true, force: true });
    onComplete?.();
  }
}
