# Sandy Labs

Sandy Labs — The Journey: a cinematic website the visitor moves through by scrolling. The
homepage is currently one full-screen film driven by the scroll (no text or interface yet).
The previous site is kept on the `backup/pre-frontend-reset` branch.

Built with Next.js (App Router), React, TypeScript and Tailwind CSS v4, with Lenis smooth
scrolling and GSAP ScrollTrigger as the scroll engine.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Structure

```
app/layout.tsx              root layout (metadata, global styles, starts the scroll engine)
app/page.tsx                homepage: the journey film (+ debug panel)
app/globals.css             Tailwind import and a white page background
lib/scroll/engine.ts        Lenis + GSAP ScrollTrigger, one shared ticker, one instance
lib/scroll/scene.ts         createScene(): scroll-scrubbed scenes with progress, pinning, media
components/scroll/          <SmoothScroll /> (engine starter) and <ScrollScene /> (React scene)
lib/journey/config.ts       the film's tuning: scroll pace, scrub, blending, sizes, caching
lib/journey/frameSource.ts  WebCodecs decoder: ranged downloads, frame cache, decode-ahead
lib/journey/film.ts         scroll progress → frame → full-screen canvas
components/journey/         <JourneyFilm /> and the temporary <JourneyDebug /> panel
public/media/journey/       encoded film (2160p/1440p/1080p/720p H.264, 720p AV1), frame indexes, poster, thumbnails
scripts/journey/            build-journey.sh + index.py: encodes the film from the source video
public/media/{hero,intro}/  media from the previous site, kept but not used
scripts/intro/              pipeline that built the previous intro videos
```

## Scroll engine

- One Lenis instance (`autoRaf: false`) stepped from `gsap.ticker`, ScrollTrigger updated on
  every Lenis scroll event and `gsap.ticker.lagSmoothing(0)`: smooth scrolling, scroll-linked
  scenes and all GSAP animation share one requestAnimationFrame loop.
- `startScrollEngine()` is reference-counted, so Strict Mode, Fast Refresh or a second caller
  never create a second instance.
- Mouse wheel and trackpad are smoothed (`lerp` 0.09, a smooth glide of about half a second); touch keeps the
  device's native scrolling and momentum. With `prefers-reduced-motion`, smoothing is off and
  scenes follow the scroll directly.
- A scene's progress (0 → 1) is a function of the scroll position: it moves forward when
  scrolling down, back when scrolling up, stops when the scroll stops, and stays in sync at any
  speed. Long scenes pin their full-screen stage for `length` viewport heights.
- Media (image sequences, video seekers, timelines) plugs in through `SceneMedia.render()`.
- Ambient loops (CSS keyframes or free-running GSAP tweens) keep playing when scrolling stops.

## The journey film

The source (3840×2160, 60 fps, 84 s, 5034 frames) is encoded by
`scripts/journey/build-journey.sh <source.mp4>`. First `fix_duplicates.py` rebuilds the
in-between frames that the 60 fps conversion had copied from a neighbour (a stop twelve
times a second) from the optical flow, then `smooth_cuts.py` softens two rough spots (a light
zoom blur and fade over the hard cut at 36.6 s; time eased through the abrupt camera turn at
54 s with optical-flow in-betweens, +24 frames → 5058). Every frame is kept at 2160p (4K),
1440p ("2K") and 1080p in H.264, plus a light 720p at 30 fps in H.264 and AV1, no B-frames and a keyframe
every second, tuned against blocking and banding in flat sky and snow, plus a JSON index of
each frame's byte range. Files over 45 MB are split into `.bin` parts at keyframes (GitHub's
100 MB file limit). The player decodes frames itself with WebCodecs and draws the one the
scroll position asks for on a full-screen canvas:

- Scroll down plays forward, up plays back, stopping the scroll stops the film; the film is
  a function of the scroll position (`scrub: true`), smoothed only once, by Lenis.
- Pace: `vhPerSecond` (30 = one screen of scrolling per ~3.3 s of film, ~25 screens in all).
  Smoothing: `scrollSettings.lerp` in `lib/scroll/engine.ts`. Both in one place each.
- While scrolling slowly, the two real frames around the position are cross-faded for the
  fraction of a frame in between, so it glides instead of stepping (not when scrolling
  faster, where it would double moving parts).
- No waiting: the page scrolls at once. The 720p fill-in (30 fps: light to fetch and
  decode) plays from the first moment; the size the screen needs loads alongside and takes
  over wherever its frames are ready. When the scroll is faster than the device decodes the
  sharp size, the sharp size pauses and the fill-in carries the motion, until the scroll
  slows again.
- Frames are copied into GPU textures and drawn with WebGL 2 (copying them into
  ImageBitmaps is what limits the frame rate on many machines); without a GPU, a 2D canvas.
  `?renderer=2d` / `?renderer=webgl` forces one, for comparison.
- The sharp size is chosen per screen and device: 2160p on screens 3000+ device pixels
  wide (not on touch devices), 1440p from 1700, 1080p from 1200; each only if the device
  decodes it fast enough (tested at start-up and again while scrolling), otherwise the
  next size down.
- Bytes load in ranges around the current position first, ahead of the scroll; past a
  memory budget the parts farthest away are let go (and fetched again if needed). Frames
  decode ahead in the scroll direction into a cache sized from a memory budget (fewer
  frames at 4K; hardware decoders have limited buffers).
- Never black: poster behind the canvas, then the nearest decoded frame or a thumbnail.
- Reloading keeps the position. Without WebCodecs it falls back to seeking a `<video>`.
- Debug panel: shown in development, or with `?debug` in production.
- Phones and tablets get at most 1080p and a smaller frame cache (mobile browsers close
  tabs that use too much memory); touch keeps native scrolling.
- Testing on a phone: WebCodecs only runs on HTTPS (or localhost), so a phone opening
  `http://<computer-ip>:3000` gets the plain-video fallback. Serve the local build over
  HTTPS instead, e.g. `npx cloudflared tunnel --url http://localhost:3000`, and open the
  `https://….trycloudflare.com` address it prints (add `?debug` for the panel).

## What is (and isn't) connected

There is no backend yet: no API routes, database, authentication or environment variables.
