/**
 * Scroll scenes: a stretch of the page whose progress (0 → 1) follows the scroll.
 *
 * Scrolling down moves a scene forward, scrolling up moves it back, and it stops when
 * the scroll stops: progress is a pure function of the scroll position (ScrollTrigger
 * `scrub`), smoothed once by Lenis, so fast scrolling stays in sync and nothing jumps.
 * Long scenes pin their stage for `length` viewport heights.
 *
 * Media plugs in through `SceneMedia`: anything that can show itself at a given
 * progress (an image-sequence canvas, a video seeker, a GSAP timeline).
 */
import { gsap, ScrollTrigger } from "./engine";

export type SceneDirection = 1 | -1;

export type SceneUpdate = {
  /** 0 at the scene's start, 1 at its end. */
  progress: number;
  /** 1 while scrolling down, -1 while scrolling up. */
  direction: SceneDirection;
  /** Scroll speed in px/s (signed). */
  velocity: number;
};

/** Something that renders a scene at a given progress, e.g. a frame sequence or video. */
export interface SceneMedia {
  render(update: SceneUpdate): void;
  /** Called when the scene is removed. */
  dispose?(): void;
}

export type SceneOptions = {
  /** The element the scene measures; pinned when `pin` is set. */
  trigger: HTMLElement;
  /** Scroll distance of the scene, in viewport heights. */
  length: number;
  /** Hold the trigger in place while the scene plays (for long cinematic shots). */
  pin?: boolean;
  /**
   * `true`: progress follows the (already Lenis-smoothed) scroll exactly.
   * A number adds that many seconds of extra catch-up; keep it small or off.
   */
  scrub?: boolean | number;
  /** ScrollTrigger start position; defaults to the top of the trigger at the top of the viewport. */
  start?: string;
  /** Scrubbed timeline for the scene; its whole length maps onto the scene, whatever its duration. */
  timeline?: (tl: gsap.core.Timeline) => void;
  media?: SceneMedia;
  onUpdate?: (update: SceneUpdate) => void;
  onToggle?: (active: boolean) => void;
  /** Label shown by ScrollTrigger markers (development aid). */
  id?: string;
  markers?: boolean;
};

export type Scene = {
  trigger: ScrollTrigger;
  timeline?: gsap.core.Timeline;
  kill: () => void;
};

export function createScene(options: SceneOptions): Scene {
  const { trigger, length, pin = false, scrub = true, start = "top top" } = options;

  let timeline: gsap.core.Timeline | undefined;
  if (options.timeline) {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    options.timeline(timeline);
  }

  const update = (self: ScrollTrigger) => {
    const state: SceneUpdate = {
      progress: self.progress,
      direction: self.direction === -1 ? -1 : 1,
      velocity: self.getVelocity(),
    };
    options.media?.render(state);
    options.onUpdate?.(state);
  };

  const st = ScrollTrigger.create({
    id: options.id,
    trigger,
    start,
    end: () => `+=${Math.round(window.innerHeight * length)}`,
    pin,
    pinSpacing: true,
    scrub,
    animation: timeline,
    invalidateOnRefresh: true,
    markers: options.markers,
    onUpdate: update,
    onToggle: (self) => options.onToggle?.(self.isActive),
    // Render the right state on load or refresh, before any scrolling.
    onRefresh: update,
  });

  return {
    trigger: st,
    timeline,
    kill: () => {
      st.kill();
      timeline?.kill();
      options.media?.dispose?.();
    },
  };
}
