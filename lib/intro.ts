/**
 * Scroll-driven intro film shown before the homepage.
 *
 * One continuous clip (jet above the clouds → island from above → closer →
 * inside the forest → out onto the beach). Scrolling moves a target position in
 * the film and the video plays toward it at a speed that eases with the distance,
 * so it follows the scroll smoothly instead of jumping frame by frame. A reversed
 * copy plays when the visitor scrolls back. Reaching the end opens the homepage.
 *
 * To replace the footage, re-encode with `scripts/intro/build-intro.sh` (or keep
 * the same file names) and update `duration` below.
 */

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
  duration: 29.2,
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
  maxRate: 3,
};
