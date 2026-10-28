/**
 * Settings for the scroll-driven journey film. Tune the feel here.
 *
 * Scroll feel = Lenis smoothing (lib/scroll/engine.ts `scrollSettings.lerp`)
 *             + scene length (`vhPerSecond`) + `scrub` (extra catch-up, normally none).
 */
export const journeyConfig = {
  /** The encoded film (must match public/media/journey/*.json; the player checks at runtime). */
  film: {
    frames: 5058, // 5034 source frames + 24 eased into the camera turn (smooth_cuts.py)
    fps: 60,
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
   * Only while the scroll is moving slowly (faster, it would double moving parts), never
   * once it stops (the frame settles on a whole frame) and never for the 30 fps fill-in;
   * uses only real frames (no synthesised in-betweens). Off with reduced motion.
   */
  blendFrames: true,

  /** Encodes in public/media/journey (see scripts/journey/build-journey.sh). */
  media: {
    base: "/media/journey",
    poster: "/media/journey/journey-poster.jpg",
    /** Small frames (every `thumbEvery` frames) shown blurred until the real frame is decoded. */
    thumbs: "/media/journey/journey-thumbs.jpg",
    thumbEvery: 20,
    thumbColumns: 16,
    /**
     * Sizes, largest first, each with its codecs in order of preference (the first one the
     * browser decodes is used). The smallest one (encoded at half the frame rate, to be
     * light) plays from the first moment and fills in wherever the sharp one has no
     * frame ready; the size this
     * screen needs (at least `minWidth` device pixels: 1920-wide screens get 1440p "2K",
     * 4K screens 2160p) loads alongside and takes over wherever its frames are ready, if
     * the device decodes it fast enough. `touch: false` keeps a size off phones and tablets:
     * on their small screens 1080p already looks sharp, and larger frames would cost them
     * memory (mobile browsers close tabs that use too much), battery and data.
     */
    tiers: [
      { height: 2160, minWidth: 3000, codecs: ["h264"], touch: false },
      { height: 1440, minWidth: 1700, codecs: ["h264"], touch: false },
      { height: 1080, minWidth: 1200, codecs: ["h264"] },
      { height: 720, minWidth: 0, codecs: ["h264", "av1"] },
    ] as { height: number; minWidth: number; codecs: JourneyCodec[]; touch?: boolean }[],
  },

  /** Decoding and memory. */
  decode: {
    /**
     * Memory for decoded frames around the position (one frame: ≈3.7 MB at 720p, ≈8 MB at
     * 1080p, ≈33 MB at 2160p), per size; the frame count follows from it, between
     * `minFrames` and `maxFrames`. Phones and tablets get less (both sizes together stay
     * near 200 MB).
     */
    cacheMB: 400,
    cacheMBMobile: 100,
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
    nearestWithin: 90,
    /** Byte-range requests are grouped into chunks of this many keyframe intervals. */
    gopsPerChunk: 2,
    /** Parallel downloads. */
    connections: 3,
    /**
     * Decode speed (frames/s, frames copied to the GPU included) the sharp size needs on
     * this device: enough to play at the film's own pace with room to spare. Scrolling
     * faster than the device decodes is covered by the fill-in, so this is not about
     * brisk scrolling. Below it, the next smaller size is tried.
     */
    minDecodeFps: 75,
    /**
     * The start-up test decodes one keyframe interval on an idle decoder, which reads
     * faster than what is sustained while scrolling and drawing; it must clear this multiple.
     */
    startupMargin: 1.5,
  },

  /** Backing-store limits for the full-screen canvas. */
  canvas: {
    maxPixelRatio: 2,
    maxWidth: 3840,
  },
};

export type JourneyCodec = "h264" | "av1";
