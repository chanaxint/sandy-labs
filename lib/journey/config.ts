/**
 * Settings for the scroll-driven journey film. Tune the feel here.
 *
 * Scroll feel = Lenis smoothing (lib/scroll/engine.ts `scrollSettings.lerp`)
 *             + scene length (`vhPerSecond`) + `scrub` (extra catch-up, normally none).
 */
export const journeyConfig = {
  /** The encoded film (must match public/media/journey/*.json; the player checks at runtime). */
  film: {
    frames: 2529, // the 30 fps encode now in public/media/journey (60 fps rebuild pending)
    fps: 30,
  },
  /**
   * Scroll distance per second of film, in % of the viewport height. 30 means one
   * screen of scrolling plays ~3.3 s of film; a 100px mouse-wheel notch on a 900px
   * screen plays ~0.37 s (~22 frames). Lower = faster journey, higher = slower.
   */
  vhPerSecond: 30,
  /**
   * ScrollTrigger scrub. `true` maps scroll to film time exactly; Lenis already
   * smooths the scroll, so a number here adds lag on top. Keep `true` or ≤ 0.15.
   */
  scrub: true as boolean | number,
  /**
   * Cross-fade between neighbouring source frames for the fraction of a frame the
   * scroll is between them, so very slow scrolling glides instead of stepping.
   * Only while scrolling slowly (faster, it would double moving parts); uses only real
   * frames (no synthesised in-betweens). Off with reduced motion.
   */
  blendFrames: true,

  /** Encodes in public/media/journey (see scripts/journey/build-journey.sh). */
  media: {
    base: "/media/journey",
    poster: "/media/journey/journey-poster.jpg",
    /** Small frames (every `thumbEvery` frames) shown blurred until the real frame is decoded. */
    thumbs: "/media/journey/journey-thumbs.jpg",
    thumbEvery: 10,
    thumbColumns: 16,
    /**
     * Sizes, largest first, each with its codecs in order of preference (the first one the
     * browser decodes is used). The smallest one plays from the first moment; the size this
     * screen needs (at least `minWidth` device pixels: 1920-wide screens get 1440p "2K",
     * 4K screens 2160p) loads alongside and takes over wherever its frames are ready, if
     * the device decodes it fast enough. `touch: false` keeps a size off phones and tablets
     * (4K decoding costs them battery and data for little visible gain).
     */
    tiers: [
      { height: 2160, minWidth: 3000, codecs: ["h264"], touch: false },
      { height: 1440, minWidth: 1700, codecs: ["h264"] },
      { height: 1080, minWidth: 1200, codecs: ["h264"] },
      { height: 720, minWidth: 0, codecs: ["h264", "av1"] },
    ] as { height: number; minWidth: number; codecs: JourneyCodec[]; touch?: boolean }[],
  },

  /** Decoding and memory. */
  decode: {
    /**
     * Memory for decoded frames around the position (bitmaps the size of the screen:
     * ≈8 MB at 1920×1080, ≈33 MB at 3840×2160), per size; the frame count follows from
     * it, between `minFrames` and `maxFrames`.
     */
    cacheMB: 400,
    cacheMBMobile: 150,
    minFrames: 12,
    maxFrames: 40,
    /** Encoded bytes kept in memory per size; beyond it, the parts farthest away are let go. */
    bufferMB: 220,
    bufferMBMobile: 90,
    /** Frames decoded ahead of the scroll in the direction it is moving (at most 60% of the cache). */
    lookahead: 24,
    /** Frames queued in the decoder at most. */
    queue: 12,
    /** Extra frames sent past those needed: hardware decoders may hold the last few back. */
    latencyPad: 6,
    /** While decoding catches up, show the closest decoded frame up to this many frames away. */
    nearestWithin: 45,
    /** Byte-range requests are grouped into chunks of this many keyframe intervals. */
    gopsPerChunk: 2,
    /** Parallel downloads. */
    connections: 3,
    /**
     * Decode speed (frames/s) the screen-sized film needs on this device: it only has to
     * keep up with ordinary scrolling (one screen in ~2 s plays ~1.7 film seconds per
     * second, ~100 frames/s at 30vh and 60 fps), because when it falls behind the
     * smallest size fills in. Below it, the next smaller size is tried.
     */
    minDecodeFps: 110,
    /**
     * The start-up test decodes one keyframe interval on an idle decoder, which reads about
     * twice the speed sustained while scrolling and drawing; it must clear this multiple.
     */
    startupMargin: 2,
  },

  /** Backing-store limits for the full-screen canvas. */
  canvas: {
    maxPixelRatio: 2,
    maxWidth: 3840,
  },
};

export type JourneyCodec = "h264" | "av1";
