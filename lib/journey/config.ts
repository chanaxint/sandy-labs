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
   * Scroll distance per second of film, in % of the viewport height. 30 means one
   * screen of scrolling plays ~3.3 s of film; a 100px mouse-wheel notch on a 900px
   * screen plays ~0.37 s (~11 frames). Lower = faster journey, higher = slower.
   */
  vhPerSecond: 30,
  /**
   * ScrollTrigger scrub. `true` maps scroll to film time exactly; Lenis already
   * smooths the scroll, so a number here adds lag on top. Keep `true` or ≤ 0.15.
   */
  scrub: true as boolean | number,
  /**
   * Cross-fade between neighbouring source frames for the fraction of a frame the
   * scroll is between them, so slow scrolling glides instead of stepping at 30 fps.
   * Only while scrolling slowly (faster, it would double moving parts); uses only real
   * frames (no synthesised in-betweens). Off with reduced motion.
   */
  blendFrames: true,

  /**
   * Opening load: this share of the film (from where the visitor is) downloads behind a
   * progress indicator before scrolling starts; the rest follows in the background,
   * ahead of the scroll.
   */
  preloadFraction: 0.5,

  /** Encodes in public/media/journey (see scripts/journey/build-journey.sh). */
  media: {
    base: "/media/journey",
    poster: "/media/journey/journey-poster.jpg",
    /** Small frames (every `thumbEvery` frames) shown blurred until the real frame is decoded. */
    thumbs: "/media/journey/journey-thumbs.jpg",
    thumbEvery: 10,
    thumbColumns: 16,
    /**
     * Sizes, largest first; a size is used when the screen needs at least `minWidth` device
     * pixels (so 1920-wide screens get 1440p "2K") and the device decodes it fast enough.
     */
    tiers: [
      { height: 1440, minWidth: 1700 },
      { height: 1080, minWidth: 1200 },
      { height: 720, minWidth: 0 },
    ],
    /** Codecs in order of preference; the first one the browser can decode is used. */
    codecs: ["h264", "av1"] as const,
  },

  /** Decoding and memory. */
  decode: {
    /**
     * Decoded frames kept around the current position (≈5.5 MB each at 1440p). Kept small:
     * hardware decoders have a limited pool of output frames.
     */
    cacheFrames: 40,
    cacheFramesMobile: 20,
    /** Frames decoded ahead of the scroll in the direction it is moving. */
    lookahead: 24,
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
     * 100 / vhPerSecond film seconds per second, i.e. ~100 frames/s at 30vh and 30 fps.
     */
    minDecodeFps: 110,
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
