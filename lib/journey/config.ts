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
   * Scroll pace: scroll distance per second of film, in % of the viewport height, from
   * each `from` frame to the next. A stretch with a line is paced for reading at a calm
   * scroll (about 45 vh a second): in ~0.6 s, read 2.2-3.4 s by its length, out ~0.5 s
   * (the line's frames in story.ts are set to match). 30 means one screen of scrolling plays ~3.3 s of film.
   * Slower (higher) where the story has lines to read in a short shot (the island, the
   * plane swap, Miami, the jet and the value lines), quicker over empty stretches (the sea,
   * the mountains, the long snowfield); on average ~20% slower than the original even 30. The story lines are timed in film frames, so they
   * stay on their moments whatever the pace (lib/journey/pace.ts).
   */
  pace: [
    { from: 0, vhPerSecond: 35 }, // above the clouds, from the opening
    { from: 312, vhPerSecond: 84 }, // into the cloud: its line (02)
    { from: 440, vhPerSecond: 42 }, // out of the cloud
    { from: 462, vhPerSecond: 82 }, // the island: its line (03)
    { from: 584, vhPerSecond: 34 }, // runway and take-off
    { from: 878, vhPerSecond: 150 }, // cloud A rises (its line, 04, comes out with it)
    { from: 906, vhPerSecond: 68 }, // cloud A covers the screen: both cuts (908-918, 1020-1036) happen inside it
    { from: 1038, vhPerSecond: 150 }, // cloud A leaves: the plane is out over the open sea
    { from: 1072, vhPerSecond: 29 }, // over the sea, no line
    { from: 1480, vhPerSecond: 56 }, // into the clouds
    { from: 1560, vhPerSecond: 74 }, // the plane swap: its line (05)
    { from: 1712, vhPerSecond: 56 }, // the second plane takes shape
    { from: 1740, vhPerSecond: 36 }, // the fjord, no line
    { from: 2164, vhPerSecond: 150 }, // cloud B rises: its line (06) comes in
    { from: 2192, vhPerSecond: 39 }, // cloud B covers the screen (the film is hidden): its line
    { from: 2418, vhPerSecond: 150 }, // cloud B leaves
    { from: 2460, vhPerSecond: 36 }, // the slope below the crest
    { from: 2474, vhPerSecond: 45 }, // the snowboarder rides in: its line (07)
    { from: 2680, vhPerSecond: 36 }, // the ride
    { from: 2720, vhPerSecond: 32 }, // the ride and the jump (its own beat)
    { from: 3240, vhPerSecond: 23 }, // the long snowfield and white-out, no line
    { from: 3760, vhPerSecond: 64 }, // Miami through the clouds
    { from: 3866, vhPerSecond: 87 }, // Miami: its line (09)
    { from: 3986, vhPerSecond: 56 },
    { from: 3992, vhPerSecond: 51 }, // the jet comes in from below: its line (10)
    { from: 4180, vhPerSecond: 56 },
    { from: 4196, vhPerSecond: 68 }, // the jet banks left and leaves: its line (11)
    { from: 4344, vhPerSecond: 40 }, // the camera tilts up into the sky: no line, film alone
    { from: 4646, vhPerSecond: 56 }, // day to night: its line (13)
    { from: 4840, vhPerSecond: 35 }, // the night sky and the closing line
  ],
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
    /** The opening's drifting cloud band: the poster below `top` (share of its height), beside its mirror image. */
    introClouds: { src: "/media/journey/intro-clouds.webp", top: 0.42, width: 1920, height: 1080 },
    /** The morning sky behind "Create my website" (film frame 4600) beside its mirror image. */
    morningSky: { src: "/media/journey/morning-sky.webp", width: 1920, height: 1080 },
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
