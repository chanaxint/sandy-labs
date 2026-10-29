/**
 * Puts the story's phrases (lib/journey/story.ts) on a timeline that follows the film.
 *
 * The timeline runs in film frames, 0 … film.frames - 1, and is set from the film
 * scene's scroll progress through the same pace mapping as the film (pace.ts), so a
 * phrase appears, holds and leaves with its moment, plays backwards when scrolling up
 * and stops when the scroll stops. It follows the scroll with a short glide (`follow`)
 * so phrases settle in softly even after a quick flick. No timers.
 *
 * Phrases animate as whole lines (a short offset between lines), only opacity and
 * transform. The jump's phrase isn't here: its beat shows it (jumpBeat.ts), except with
 * reduced motion, where it simply fades in and out with the scroll like the others.
 */
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";
import { journeyConfig } from "./config";
import { frameAt } from "./pace";
import { phrases, type Phrase } from "./story";

type Vars = gsap.TweenVars;

/** Seconds the phrases take to catch up with the scroll. */
const follow = 0.5;

function enterVars(p: Phrase): { from: Vars; to: Vars; ease: string } {
  switch (p.enter) {
    case "mask":
      return { from: { yPercent: 104, opacity: 0 }, to: { yPercent: 0, opacity: 1 }, ease: "power3.out" };
    case "statement":
      return { from: { yPercent: 104, opacity: 0 }, to: { yPercent: 0, opacity: 1 }, ease: "power2.out" };
    default:
      return { from: { y: 16, opacity: 0 }, to: { y: 0, opacity: 1 }, ease: "power2.out" };
  }
}

function exitVars(p: Phrase): Vars {
  return p.exit === "rise" ? { y: -12, opacity: 0, ease: "power1.in" } : { opacity: 0, ease: "power1.inOut" };
}

function build(stage: HTMLElement, reduce: boolean) {
  const tl = gsap.timeline({ paused: true });
  for (const p of phrases) {
    if (p.interaction === "jump-freeze" && !reduce) continue;
    const root = stage.querySelector<HTMLElement>(`[data-story="${p.id}"]`);
    if (!root) continue;
    const lines = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-line]"));
    const gap = lines.length - 1;

    // Entrance: line after line, a short offset apart.
    const enter = p.shown - p.in;
    if (enter > 0) {
      const m = reduce ? { from: { opacity: 0 }, to: { opacity: 1 }, ease: "none" } : enterVars(p);
      const each = gap > 0 ? (enter * 0.22) / gap : 0;
      tl.set(root, { autoAlpha: 1 }, p.in);
      tl.fromTo(
        lines,
        m.from,
        { ...m.to, ease: m.ease, duration: enter - each * gap, stagger: each, immediateRender: false },
        p.in,
      );
    }

    // Exit, then hidden (until scrolled back).
    if (p.gone !== undefined && Number.isFinite(p.out)) {
      const leave = p.gone - p.out;
      const each = gap > 0 ? (leave * 0.15) / gap : 0;
      const x = reduce ? { opacity: 0, ease: "none" } : exitVars(p);
      tl.to(lines, { ...x, duration: leave - each * gap, stagger: each }, p.out);
      tl.set(root, { autoAlpha: 0 }, p.gone);
    }
  }
  // The timeline spans the whole film, so its time is the film frame.
  tl.set({}, {}, journeyConfig.film.frames - 1);
  return tl;
}

export function createStory(stage: HTMLElement): SceneMedia {
  const reduce = prefersReducedMotion();
  let tl = build(stage, reduce);
  let placed = false;

  // New lines (language switch): rebuild on them, at the current point.
  const rebuild = () => {
    gsap.killTweensOf(tl);
    const at = tl.time();
    tl.revert();
    tl.kill();
    tl = build(stage, reduce);
    tl.time(at);
  };
  stage.addEventListener("story:change", rebuild);

  return {
    render(update: SceneUpdate) {
      const frame = frameAt(update.progress);
      // First placement, long jumps (a restored position, the scrollbar dragged) and
      // reduced motion: straight to the point, without replaying the phrases in between.
      if (!placed || reduce || Math.abs(frame - tl.time()) > 300) {
        placed = true;
        gsap.killTweensOf(tl);
        tl.time(frame);
        return;
      }
      gsap.to(tl, { time: frame, duration: follow, ease: "power2.out", overwrite: true });
    },
    dispose() {
      stage.removeEventListener("story:change", rebuild);
      gsap.killTweensOf(tl);
      tl.revert();
      tl.kill();
    },
  };
}
