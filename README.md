# Sandy Labs

Starting point for the new Sandy Labs cinematic scroll website. The previous homepage
(hero, intro film, questionnaire, examples, sections, header/footer) was removed in a
frontend reset; the homepage is now an empty white page. The full previous version is kept
on the `backup/pre-frontend-reset` branch.

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
app/page.tsx                homepage (empty)
app/globals.css             Tailwind import and a white page background
app/scroll-test/            TEMPORARY development-only test bed for the scroll engine
lib/scroll/engine.ts        Lenis + GSAP ScrollTrigger, one shared ticker, one instance
lib/scroll/scene.ts         createScene(): scroll-scrubbed scenes with progress, pinning, media
components/scroll/          <SmoothScroll /> (engine starter) and <ScrollScene /> (React scene)
public/media/      media from the previous site, kept but not used (hero art, intro videos)
scripts/intro/     pipeline that built the previous intro videos from the source footage
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

Try it with `npm run dev` at http://localhost:3000/scroll-test (development only).

## What is (and isn't) connected

There is no backend yet: no API routes, database, authentication or environment variables.
