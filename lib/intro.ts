/**
 * Scroll-stepped intro film shown before the homepage.
 *
 * The film is one continuous clip (jet above the clouds → island from above →
 * closer → inside the forest → out onto the beach). Each scroll, swipe or key
 * press plays it to the next stop and pauses there. A reversed copy of the clip
 * plays when the visitor scrolls back, so rewinding is as smooth as moving forward.
 *
 * To replace the footage, re-encode with `scripts/intro/build-intro.sh` (or keep
 * the same file names) and update `duration` and the stop times below.
 */

export type IntroStop = {
  /** Time in seconds (in the forward clip) where playback pauses. */
  time: number;
  title: string;
  hint: string;
};

export const introConfig = {
  /**
   * Base paths without extension. Each has `.mp4` (H.264, every browser) and
   * `.av1.mp4` (AV1, ~45% smaller) plus `-reverse` variants for scrolling back.
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
  /** Speed multiplier for each scroll step; long stretches feel slow at 1×. */
  playbackRate: 1.6,
  stops: [
    { time: 0, title: "Sandy Labs", hint: "Scroll to begin" },
    { time: 9.2, title: "Every website starts as a place on the map.", hint: "Scroll to fly closer" },
    { time: 13.25, title: "You bring the vision. We help you find its shape.", hint: "Scroll to land" },
    { time: 18.0, title: "Structure, detail and story, built from the inside out.", hint: "Scroll to keep going" },
    { time: 27.2, title: "Until it feels like somewhere worth arriving.", hint: "Scroll to enter" },
  ] satisfies IntroStop[],
};
