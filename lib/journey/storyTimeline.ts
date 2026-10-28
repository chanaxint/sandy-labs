/**
 * Puts the story lines (lib/journey/story.ts) on a timeline that follows the film.
 *
 * The timeline runs in film frames, 0 … film.frames - 1, and is driven by the film
 * scene's scroll progress, so a line appears, holds and leaves with its moment in the
 * film, plays backwards when scrolling up and stops when the scroll stops. It follows
 * the scroll with a short glide (`follow` seconds) so words settle in softly even after
 * a quick flick. No timers. Each word animates only transform, opacity and a small blur.
 */
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { journeyConfig } from "./config";
import { story, type StoryLine } from "./story";

type Vars = gsap.TweenVars;

/** Seconds the text takes to catch up with the scroll. */
const follow = 1.1;

/** From-state of the entrance and end-state of the exit, per motion. */
function motionVars(line: StoryLine): { from: Vars; to: Vars; exit: Vars } {
  const side = line.desktop.align === "right" ? 1 : -1;
  if (line.size === "giant") {
    return {
      from: { yPercent: 18, opacity: 0, filter: "blur(22px)" },
      to: { yPercent: 0, opacity: 1, filter: "blur(0px)" },
      exit: { yPercent: -10, opacity: 0, filter: "blur(16px)" },
    };
  }
  switch (line.motion) {
    case "mask":
      return {
        from: { yPercent: 115, opacity: 0, filter: "blur(4px)" },
        to: { yPercent: 0, opacity: 1, filter: "blur(0px)" },
        exit: { yPercent: -115, opacity: 0, filter: "blur(4px)" },
      };
    case "drift":
      return {
        from: { xPercent: 22 * side, opacity: 0, filter: "blur(8px)" },
        to: { xPercent: 0, opacity: 1, filter: "blur(0px)" },
        exit: { xPercent: -14 * side, opacity: 0, filter: "blur(8px)" },
      };
    default:
      return {
        from: { yPercent: 40, opacity: 0, filter: "blur(12px)" },
        to: { yPercent: 0, opacity: 1, filter: "blur(0px)" },
        exit: { yPercent: -24, opacity: 0, filter: "blur(10px)" },
      };
  }
}

function build(stage: HTMLElement, reduce: boolean) {
  const tl = gsap.timeline({ paused: true });
  for (const line of story) {
    const root = stage.querySelector<HTMLElement>(`[data-story="${line.id}"]`);
    if (!root) continue;
    const words = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-word]"));
    const m = reduce ? { from: { opacity: 0 }, to: { opacity: 1 }, exit: { opacity: 0 } } : motionVars(line);
    const n = Math.max(1, words.length - 1);

    // Entrance: word after word, each taking a good part of the stretch.
    const enter = line.shown - line.in;
    if (enter > 0) {
      const each = (enter * 0.45) / n;
      tl.set(root, { autoAlpha: 1 }, line.in);
      tl.fromTo(
        words,
        m.from,
        { ...m.to, ease: "power3.out", duration: enter - each * (words.length - 1), stagger: each, immediateRender: false },
        line.in,
      );
    }

    // Exit, then hidden for good (until scrolled back).
    if (line.gone !== undefined && Number.isFinite(line.out)) {
      const leave = line.gone - line.out;
      const each = (leave * 0.3) / n;
      tl.to(words, { ...m.exit, ease: "power2.inOut", duration: leave - each * (words.length - 1), stagger: each }, line.out);
      tl.set(root, { autoAlpha: 0 }, line.gone);
    }
  }
  // The timeline spans the whole film, so its progress is the film's progress.
  tl.set({}, {}, journeyConfig.film.frames - 1);
  return tl;
}

export function createStory(stage: HTMLElement): SceneMedia {
  const reduce = prefersReducedMotion();
  let tl = build(stage, reduce);
  let target = 0;
  let placed = false;

  // New words (language switch): rebuild on them, at the current point.
  const rebuild = () => {
    gsap.killTweensOf(tl);
    const at = tl.progress();
    tl.revert();
    tl.kill();
    tl = build(stage, reduce);
    tl.progress(at);
  };
  stage.addEventListener("story:change", rebuild);

  return {
    render(update: SceneUpdate) {
      target = update.progress;
      // First placement, long jumps (a restored position, the scrollbar dragged) and
      // reduced motion: straight to the point, without replaying the lines in between.
      if (!placed || reduce || Math.abs(target - tl.progress()) > 0.06) {
        gsap.killTweensOf(tl);
        placed = true;
        tl.progress(target);
        return;
      }
      gsap.to(tl, { progress: target, duration: follow, ease: "power3.out", overwrite: true });
    },
    dispose() {
      stage.removeEventListener("story:change", rebuild);
      gsap.killTweensOf(tl);
      tl.revert();
      tl.kill();
    },
  };
}
