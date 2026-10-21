/**
 * Scroll-driven intro film shown before the homepage.
 *
 * One continuous clip (jet above the clouds → island from above → closer →
 * inside the forest → out onto the beach). Scrolling moves a target position in
 * the film and the video plays toward it at a speed that eases with the distance,
 * so it follows the scroll smoothly instead of jumping frame by frame. A reversed
 * copy plays when the visitor scrolls back. Reaching the end opens the homepage.
 * While the camera moves through the forest, short lines slide through on top.
 *
 * To replace the footage, re-encode with `scripts/intro/build-intro.sh` (or keep
 * the same file names) and update `duration` below.
 */

export type IntroCaption = {
  text: string;
  /** Side the line slides in from; it drifts on and leaves toward the other side. */
  from: "left" | "right";
  /** Film time (seconds) when the line starts entering and when it has left. */
  start: number;
  end: number;
  /** Vertical position, as a percentage of the screen height. */
  top: number;
};

export const introConfig = {
  /**
   * Base paths without extension. Each has `.mp4` (H.264, every browser) and
   * `.av1.mp4` (AV1, smaller) plus `-reverse` variants for scrolling back.
   */
  sources: {
    /** Wide or high-density screens. */
    hd: "/media/intro/intro-1080",
    /** Phones and small screens. */
    sd: "/media/intro/intro-720",
  },
  poster: "/media/intro/intro-poster.jpg",
  /** Length of the clip in seconds. */
  duration: 712 / 24, // 29.67s: 712 frames at 24 fps
  /** Film seconds per pixel of wheel scroll (one mouse-wheel notch ≈ 100px ≈ 0.7s). */
  wheelSeconds: 0.007,
  /** Film seconds per pixel of finger drag on touch screens. */
  touchSeconds: 0.03,
  /** Film seconds added per arrow / Page Down key press. */
  keySeconds: 2,
  /** How far (seconds) the target may run ahead of the picture, so it never drifts long after scrolling stops. */
  maxLead: 2.5,
  /** Playback speed limits while catching up with the scroll. */
  minRate: 0.5,
  maxRate: 2.2,
  /**
   * Lines that slide through while the camera moves through the forest
   * (about 16s-25.5s in the film). They follow the film's position, so they
   * move with the scroll and rewind when scrolling back.
   */
  captions: [
    { text: "In 5 minutes.", from: "right", start: 16.0, end: 18.8, top: 34 },
    { text: "A professional website?", from: "left", start: 18.4, end: 21.2, top: 56 },
    { text: "Scroll animations. 3D. Cinematic motion.", from: "right", start: 20.8, end: 23.6, top: 38 },
    { text: "Name your industry. We'll shape the island.", from: "left", start: 23.2, end: 26.0, top: 54 },
  ] satisfies IntroCaption[],
};
