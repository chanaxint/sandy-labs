/**
 * Settings for the scroll-driven journey film. Tune the feel here.
 *
 * Scroll feel = Lenis smoothing (lib/scroll/engine.ts `scrollSettings.lerp`)
 *             + scene length (`vhPerSecond`) + `scrub` (extra catch-up, normally none).
 */
export const journeyConfig = {
  /** The encoded film (must match public/media/journey/*.json; the player checks at runtime). */
  film: {
    frames: 2517,
    fps: 30,
  },
  /**
   * Scroll distance per second of film, in % of the viewport height. 16 means one
   * screen of scrolling plays ~6 s of film; a 100px mouse-wheel notch on a 900px
   * screen plays ~0.7 s. Lower = faster journey, higher = slower.
   */
  vhPerSecond: 16,
  /**
   * ScrollTrigger scrub. `true` maps scroll to film time exactly; Lenis already
   * smooths the scroll, so a number here adds lag on top. Keep `true` or ≤ 0.15.
   */
  scrub: true as boolean | number,
  /**
   * Cross-fade between neighbouring source frames for the fraction of a frame the
   * scroll is between them, so slow scrolling glides instead of stepping at 30 fps.
   * Uses only real frames (no synthesised in-betweens). Off with reduced motion.
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
    /** Sizes, largest first; a size is used when the screen needs at least `minWidth` device pixels. */
    tiers: [
      { height: 1080, minWidth: 1400 },
      { height: 720, minWidth: 0 },
    ],
    /** Codecs in order of preference; the first one the browser can decode is used. */
    codecs: ["h264", "av1"] as const,
  },

  /** Decoding and memory. */
  decode: {
    /**
     * Decoded frames kept around the current position (≈3 MB each at 1080p). Kept small:
     * hardware decoders have a limited pool of output frames.
     */
    cacheFrames: 32,
    cacheFramesMobile: 16,
    /** Frames decoded ahead of the scroll in the direction it is moving. */
    lookahead: 14,
    /** Frames queued in the decoder at most. */
    queue: 12,
    /** While decoding catches up, show the closest decoded frame up to this many frames away. */
    nearestWithin: 45,
    /** Byte-range requests are grouped into chunks of this many keyframe intervals. */
    gopsPerChunk: 3,
    /** Parallel downloads. */
    connections: 3,
    /**
     * Decode speed (frames/s) a size needs on this device, measured at start-up; below it
     * the next smaller size is used. Brisk scrolling (one screen per second) plays
     * 100 / vhPerSecond film seconds per second, i.e. ~190 frames/s at 16vh and 30 fps.
     */
    minDecodeFps: 200,
    /**
     * The start-up test decodes one second of film on an idle decoder, which reads about
     * twice the speed sustained while scrolling and drawing; it must clear this multiple.
     */
    startupMargin: 2,
  },

  /** Backing-store limits for the full-screen canvas. */
  canvas: {
    maxPixelRatio: 2,
    maxWidth: 2560,
  },
};

export type JourneyCodec = (typeof journeyConfig.media.codecs)[number];
