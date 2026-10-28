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
public/media/journey/       encoded film (1440p/1080p/720p, H.264 + AV1), frame indexes, poster, thumbnails
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
- Mouse wheel and trackpad are smoothed (`lerp` 0.11, a short natural glide); touch keeps the
  device's native scrolling and momentum. With `prefers-reduced-motion`, smoothing is off and
  scenes follow the scroll directly.
- A scene's progress (0 → 1) is a function of the scroll position: it moves forward when
  scrolling down, back when scrolling up, stops when the scroll stops, and stays in sync at any
  speed. Long scenes pin their full-screen stage for `length` viewport heights.
- Media (image sequences, video seekers, timelines) plugs in through `SceneMedia.render()`.
- Ambient loops (CSS keyframes or free-running GSAP tweens) keep playing when scrolling stops.

## The journey film

The source (3840×2160, 30 fps, 84 s, 2517 frames) is encoded by
`scripts/journey/build-journey.sh <source.mp4>`: every source frame kept, 1440p ("2K"),
1080p and 720p, H.264 and AV1, no B-frames and a keyframe every second, tuned against
blocking and banding in flat sky and snow, plus a JSON index of each frame's byte range.
Files over 45 MB are split into `.bin` parts at keyframes (GitHub's 100 MB file limit). The player decodes frames itself with WebCodecs and draws the one the scroll
position asks for on a full-screen canvas:

- Scroll down plays forward, up plays back, stopping the scroll stops the film; the film is
  a function of the scroll position (`scrub: true`), smoothed only once, by Lenis.
- Pace: `vhPerSecond` (30 = one screen of scrolling per ~3.3 s of film, ~25 screens in all).
  Smoothing: `scrollSettings.lerp` in `lib/scroll/engine.ts`. Both in one place each.
- While scrolling slowly, the two real frames around the position are cross-faded for the
  fraction of a frame in between, so it glides instead of stepping at 30 fps (not when
  scrolling faster, where it would double moving parts).
- Opening load: the first half of the film (`preloadFraction`, from where the visitor is)
  downloads behind a slim "Loading %" indicator while the scroll is held; the rest follows
  in the background, ahead of the scroll.
- Bytes load in ranges around the current position first; frames decode ahead in the scroll
  direction; a small cache of decoded frames (hardware decoders have limited buffers).
- The size is chosen per screen and device: 1440p on screens 1920+ device pixels wide,
  1080p from 1200, else 720p; each only if the device decodes it fast enough (tested at
  start-up and again while scrolling), otherwise the next size down.
- Never black: poster behind the canvas, then the nearest decoded frame or a thumbnail.
- Reloading keeps the position. Without WebCodecs it falls back to seeking a `<video>`.
- Debug panel: shown in development, or with `?debug` in production.

## What is (and isn't) connected

There is no backend yet: no API routes, database, authentication or environment variables.
