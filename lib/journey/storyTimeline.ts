/**
 * Puts the story lines (lib/journey/story.ts) on the film's scroll timeline.
 *
 * The timeline runs in film frames, 0 … film.frames - 1, and ScrollTrigger scrubs it
 * with the same progress that picks the film frame: a line appears, holds and leaves
 * with its moment in the film, plays backwards when scrolling up and stops when the
 * scroll stops. No timers. Each line animates only transform, opacity and (briefly) a
 * small blur, on its own elements.
 */
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";
import { journeyConfig } from "./config";
import { story, type StoryLine } from "./story";

type Vars = gsap.TweenVars;

/** From-state of the entrance and end-state of the exit, per motion. */
function motionVars(line: StoryLine): { from: Vars; to: Vars; exit: Vars } {
  const side = line.desktop.align === "right" ? 1 : -1;
  switch (line.motion) {
    case "mask":
      return {
        from: { yPercent: 108, opacity: 0 },
        to: { yPercent: 0, opacity: 1 },
        exit: { yPercent: -108, opacity: 0 },
      };
    case "drift":
      return {
        from: { x: 28 * side, opacity: 0, filter: "blur(4px)" },
        to: { x: 0, opacity: 1, filter: "blur(0px)" },
        exit: { x: -20 * side, opacity: 0, filter: "blur(4px)" },
      };
    default:
      return {
        from: { y: 18, opacity: 0, filter: "blur(8px)" },
        to: { y: 0, opacity: 1, filter: "blur(0px)" },
        exit: { y: -12, opacity: 0, filter: "blur(6px)" },
      };
  }
}

export function buildStory(tl: gsap.core.Timeline, stage: HTMLElement) {
  const reduce = prefersReducedMotion();
  const end = journeyConfig.film.frames - 1;

  for (const line of story) {
    const root = stage.querySelector<HTMLElement>(`[data-story="${line.id}"]`);
    if (!root) continue;
    const parts = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-line]"));
    const m = reduce
      ? { from: { opacity: 0 }, to: { opacity: 1 }, exit: { opacity: 0 } }
      : motionVars(line);

    // Entrance: lines one after another, each taking most of the stretch.
    const enter = line.shown - line.in;
    if (enter > 0) {
      const each = (enter * 0.22) / Math.max(1, parts.length - 1);
      tl.set(root, { autoAlpha: 1 }, line.in);
      tl.fromTo(
        parts,
        m.from,
        { ...m.to, ease: "power2.out", duration: enter - each * (parts.length - 1), stagger: each, immediateRender: false },
        line.in,
      );
    }

    // Exit, then hidden for good (until scrolled back).
    if (line.gone !== undefined && Number.isFinite(line.out)) {
      const leave = line.gone - line.out;
      const each = (leave * 0.18) / Math.max(1, parts.length - 1);
      tl.to(parts, { ...m.exit, ease: "power2.in", duration: leave - each * (parts.length - 1), stagger: each }, line.out);
      tl.set(root, { autoAlpha: 0 }, line.gone);
    }
  }

  // The timeline spans the whole film, so its progress is the film's progress.
  tl.set({}, {}, end);
}
