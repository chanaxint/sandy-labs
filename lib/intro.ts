/**
 * Scroll-driven intro film shown before the homepage.
 *
 * One continuous clip (jet above the clouds → island from above → closer →
 * inside the forest → out onto the beach). Scrolling moves a target position in
 * the film and the video plays toward it at a speed that eases with the distance,
 * so it follows the scroll smoothly instead of jumping frame by frame. A reversed
 * copy plays when the visitor scrolls back. The film ends looking at the Sandy
 * Labs logo pressed into the sand, rests there briefly, then opens the homepage.
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
  /**
   * How far (seconds) the target may run ahead of the picture. This is how long
   * the film keeps gliding after scrolling stops, so it stays short.
   */
  maxLead: 0.9,
  /**
   * Scroll speed through the film, as [film time, multiplier] points with linear
   * blending between them: steady over the jet, quicker on the approach to the
   * island, back to normal in the forest. Caption reading time is added on top
   * (`captionSlowdown`).
   */
  pace: [
    [0, 1],
    [9.4, 1],
    [10.6, 1.45],
    [15.0, 1.45],
    [16.2, 1],
  ] as [number, number][],
  /** Scroll moves the film this much slower while a caption is fully on screen. */
  captionSlowdown: 0.35,
  /** How far the camera turns toward a caption: horizontal shift in % and the zoom that hides the edges. */
  lookShift: 1.8,
  lookZoom: 0.045,
  /** Playback speed limits while catching up with the scroll (maxRate is scaled by `pace`). */
  minRate: 0.5,
  maxRate: 2.2,
  /** Playback speed per second the picture is behind the scroll target. */
  catchUp: 2.6,
  /** How long (ms) the film rests on the logo in the sand before the homepage opens. */
  endHold: 2200,
  /** Absolute speed ceiling: above ~2.6x software video decoders start to drop frames. */
  rateCeiling: 2.6,
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
