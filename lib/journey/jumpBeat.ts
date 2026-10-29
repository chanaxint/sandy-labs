/**
 * The snowboard jump's beat: the one moment the film briefly takes over from the scroll.
 *
 * Scrolling forward onto the approach to the lip (`jumpApproach`):
 *  1. the scroll is held (Lenis stopped) and the film plays by itself up to the frame
 *     where the board is side-on in the air (`jumpFrame`), fast, and stops dead on it (a
 *     fling that lands past it is set straight back onto it);
 *  2. "You want to feel it." cuts in at once (no fade), and the film holds `hold` seconds;
 *  3. the film then breaks out of it at full speed, through the landing and on until the
 *     rider has left the frame (`jumpResume`), easing out only at the very end; the phrase
 *     goes as the motion resumes;
 *  4. the scroll is handed back.
 * The scroll position itself is animated (Lenis scrollTo), so film, ScrollTrigger and
 * scroll stay one. It plays once per pass: it re-arms after a deliberate step back before
 * the approach.
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
import { jumpApproach, jumpFrame, jumpResume } from "./story";
import { storyStore } from "./storyStore";

/** Seconds per film frame of the approach: a little faster than the film's own 1/60. */
const approachPace = 0.75 / 60;
/** Seconds the film holds on the freeze frame. */
const hold = 0.8;
/** Film frames per second of the run after the freeze (a little faster than its own 60). */
const runSpeed = 71;
/** Share of the run, at its end, that eases out into the visitor's scroll. */
const runEaseOut = 0.2;
/** Seconds of the run, freeze frame to `jumpResume`, at `runSpeed` until the ease-out. */
const run = (jumpResume - jumpFrame) / runSpeed / (1 - runEaseOut / 2);
/** At full speed from the first moment, easing out over the last `runEaseOut` (same speed where they meet). */
const runEasing = (t: number) => {
  const k = 1 / (1 - runEaseOut / 2);
  const a = 1 - runEaseOut;
  if (t <= a) return k * t;
  const u = t - a;
  return k * (a + u - (u * u) / (2 * runEaseOut));
};
/** Seconds the phrase takes to go once the motion resumes: a very short fade. */
const fade = 0.12;
/** Longest wait (s) for the take-off frame to be decoded before the hold starts anyway. */
const wait = 0.4;
/** Scrolling back this many frames before the approach arms it again (a deliberate step back, not a wobble). */
const rearm = 24;

type State = "armed" | "approaching" | "holding" | "running" | "done";

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

  /** The film plays itself from `frame` to the freeze frame, then the beat holds. */
  const start = (frame: number) => {
    const lenis = getLenis();
    const at = scrollFor(jumpFrame + 0.3);
    if (!lenis || at === null) return;
    jumpStatus.plays++;
    document.documentElement.classList.add("scroll-held");
    lenis.stop();
    if (frame >= jumpFrame) return freeze();
    setState("approaching");
    lenis.scrollTo(at, {
      duration: Math.max(0.3, (jumpFrame - frame) * approachPace),
      // At full speed into the freeze: it stops all at once.
      easing: (t) => t,
      force: true,
      lock: true,
      onComplete: freeze,
    });
  };

  /** On the freeze frame: the phrase cuts in, the film holds, then runs on to the landing. */
  const freeze = () => {
    const lenis = getLenis();
    const at = scrollFor(jumpFrame + 0.3);
    const to = scrollFor(jumpResume);
    if (!lenis || at === null || to === null) return;
    setState("holding");
    // Exactly onto the freeze frame within this same tick, before the film draws.
    lenis.scrollTo(at, { immediate: true, force: true });

    // The phrase is simply there: no entrance.
    gsap.set(root, { autoAlpha: 1 });
    gsap.set(lines(), { opacity: 1, y: 0 });

    // The hold counts from the moment the freeze frame is on screen (it may still be
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
          // Straight back to full speed: the freeze breaks all at once.
          easing: runEasing,
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
        // Crossing onto the approach going forward, landing not yet passed.
        if (update.direction > 0 && last >= 0 && last < jumpApproach && frame >= jumpApproach && frame < jumpResume) {
          last = frame;
          start(frame);
          return;
        }
      } else if (state === "done" && frame < jumpApproach - rearm) {
        reset();
        setState("armed");
      }
      if (state === "armed" || state === "done") last = frame;
    },
    dispose() {
      reset();
      if (state === "approaching" || state === "holding" || state === "running") getLenis()?.start();
    },
  };
}
