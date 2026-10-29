/**
 * The snowboard jump's beat: the one moment the film briefly takes over from the scroll.
 *
 * Scrolling forward onto the frame where the board leaves the lip (`jumpFrame`):
 *  1. the scroll is held (Lenis stopped) and set exactly to that frame, so the film never
 *     shows a frame past it in between;
 *  2. "You want to feel it." cuts in at once (no fade), and the film holds `hold` seconds;
 *  3. the film then carries on by itself: the scroll position itself is animated to
 *     `jumpResume` (Lenis scrollTo), so film, ScrollTrigger and scroll stay one, and the
 *     phrase fades as the motion resumes;
 *  4. the scroll is handed back.
 * It plays once per pass: it re-arms after a deliberate step back before the take-off.
 * Scrolling backwards through the jump, or jumping over it (scrollbar, a long fling past
 * the landing), plays nothing. With reduced motion there is no beat at all: the phrase
 * fades in and out with the scroll (storyTimeline.ts).
 *
 * Driven by the film scene's updates; GSAP for the hold and the fade, no other timers.
 */
import { getLenis, gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/scroll/engine";
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { filmStatus } from "./film";
import { frameAt, progressAt } from "./pace";
import { jumpFrame, jumpResume } from "./story";
import { storyStore } from "./storyStore";

/** Seconds the film holds on the take-off frame. */
const hold = 0.8;
/** Seconds the film takes to carry on by itself, take-off to `jumpResume`. */
const run = 1.05;
/** Seconds the phrase takes to fade once the motion resumes. */
const fade = 0.55;
/** Longest wait (s) for the take-off frame to be decoded before the hold starts anyway. */
const wait = 0.4;
/** Scrolling back this many frames before the take-off frame arms it again (a deliberate step back, not a wobble). */
const rearm = 24;

type State = "armed" | "holding" | "running" | "done";

/** The beat's state, for the debug panel and tests. */
export const jumpStatus: { state: State; plays: number } = { state: "armed", plays: 0 };

export function createJumpBeat(stage: HTMLElement, sceneId: string): SceneMedia {
  const root = stage.querySelector<HTMLElement>('[data-story="snowboard-b"]');
  if (!root || prefersReducedMotion()) return { render() {} };

  let state: State = "armed";
  let last = -1;
  let beat: gsap.core.Timeline | null = null;
  let stopWaiting = () => {};

  const setState = (s: State) => {
    state = s;
    jumpStatus.state = s;
  };

  /** Scroll position (px) of a film frame, from the scene's own trigger. */
  const scrollFor = (frame: number) => {
    const st = ScrollTrigger.getById(sceneId);
    return st ? st.start + (st.end - st.start) * progressAt(frame) : null;
  };

  const lines = () => gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-line]"));

  const start = () => {
    const lenis = getLenis();
    const at = scrollFor(jumpFrame + 0.3);
    const to = scrollFor(jumpResume);
    if (!lenis || at === null || to === null) return;
    setState("holding");
    jumpStatus.plays++;
    document.documentElement.classList.add("scroll-held");
    lenis.stop();
    // Back onto the take-off frame within this same tick, before the film draws.
    lenis.scrollTo(at, { immediate: true, force: true });

    // The phrase is simply there: no entrance.
    gsap.set(root, { autoAlpha: 1 });
    gsap.set(lines(), { opacity: 1, y: 0 });

    // The hold counts from the moment the take-off frame is on screen (it may still be
    // decoding for a moment after a quick scroll), at most `wait` seconds later.
    const shown = () => Math.round(filmStatus.shown) === jumpFrame && (filmStatus.mode === "exact" || filmStatus.mode === "nearest");
    let waited = 0;
    const waitForFrame = (_t: number, dt: number) => {
      waited += dt / 1000;
      if (!shown() && waited < wait) return;
      gsap.ticker.remove(waitForFrame);
      if (state === "holding") beat?.play();
    };
    gsap.ticker.add(waitForFrame);
    stopWaiting = () => gsap.ticker.remove(waitForFrame);

    beat = gsap.timeline({ paused: true });
    beat.call(
      () => {
        setState("running");
        lenis.scrollTo(to, {
          duration: run,
          // From still into the jump's own speed, easing out into the landing.
          easing: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
          force: true,
          lock: true,
          onComplete: finish,
        });
      },
      undefined,
      hold,
    );
    beat.to(lines(), { opacity: 0, duration: fade, ease: "power1.inOut" }, hold);
    beat.set(root, { autoAlpha: 0 }, hold + fade);
  };

  const finish = () => {
    if (state !== "running") return;
    setState("done");
    document.documentElement.classList.remove("scroll-held");
    getLenis()?.start();
  };

  /** Hidden, and no beat running (scrolled back, or cleaned up). */
  const reset = () => {
    stopWaiting();
    beat?.kill();
    beat = null;
    gsap.set(root, { autoAlpha: 0 });
    document.documentElement.classList.remove("scroll-held");
  };

  return {
    render(update: SceneUpdate) {
      const frame = frameAt(update.progress);
      if (storyStore.get().studio.mode === "edit") {
        last = frame;
        return;
      }
      if (state === "armed") {
        // Crossing onto the take-off frame going forward, landing not yet passed.
        if (update.direction > 0 && last >= 0 && last < jumpFrame && frame >= jumpFrame && frame < jumpResume) {
          last = frame;
          start();
          return;
        }
      } else if (state === "done" && frame < jumpFrame - rearm) {
        reset();
        setState("armed");
      }
      if (state === "armed" || state === "done") last = frame;
    },
    dispose() {
      reset();
      if (state === "holding" || state === "running") getLenis()?.start();
    },
  };
}
