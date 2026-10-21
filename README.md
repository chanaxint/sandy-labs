# Sandy Labs — Homepage

Frontend homepage for Sandy Labs, an island-themed website creation studio.
Built with Next.js (App Router), React, TypeScript, Tailwind CSS v4, Lucide icons and Motion.

Motion (`motion/react`) handles enter/exit transitions: questionnaire steps, the brief
confirmation, requirement notes and the example dialog. It is loaded through `LazyMotion`
in `components/ui/MotionProvider.tsx` and respects the OS reduced-motion setting. Other
motion (hero parallax, scroll reveals, menu) is plain CSS.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Structure

```
app/                     layout, homepage, /privacy and /terms placeholders, global styles
components/layout/       Header, MenuPanel, Footer, PlaceholderPage
components/hero/         Hero, IslandIllustration (code-drawn island + clouds)
components/questionnaire BriefProvider (shared state), Questionnaire, Steps, OptionTile,
                         ProgressIndicator, Composer, SelectionSummary, BriefConfirmation, Field
components/examples/     ExamplesSection, ExampleCard, ExampleDialog, ExamplePreview
components/sections/     WhatWeDo, HowItWorks, Contact
components/ui/           MotionProvider, Reveal, SectionHeading, TopoLines
lib/                     questionnaire options + validation, brief builder, example data,
                         navigation, hero media config, shape helpers
```

## Intro film

Before the homepage, a full-screen film follows the visitor's scroll: jet above the
clouds → island from above → closer → inside the forest → out onto the beach → homepage.
Scrolling moves a target point in the film and the video plays toward it at a speed that
eases with the distance, so it glides with the scroll rather than stepping frame by frame;
scrolling back plays a reversed copy. On screen there is only the film, a small
"Skip intro" and a "Scroll" hint. Escape or "Skip intro" leaves at any time, links to a
section (`/#contact`) skip it, and reduced-motion visitors go straight to the homepage on
their first scroll.

- Component: `components/intro/IntroFilm.tsx`, mounted by `IntroGate.tsx` in `app/page.tsx`
- Scroll sensitivity, speed limits and file paths: `lib/intro.ts`
- Video files: `public/media/intro/` (1080p and 720p, H.264 + AV1, forward + reversed)

The footage was joined at 4K (Real-ESRGAN for the drone clip, Lanczos for the plane
clip, a TensorPix 4K upscale supplied for the forest clip) and encoded with:

```bash
scripts/intro/build-intro.sh plane.mp4 drone.mp4 forest.mp4 /tmp/intro-work
```

It needs ffmpeg (with libx264 and libsvtav1) and, for the AI upscale, Python with
`numpy onnx onnxruntime` plus the two Real-ESRGAN weight files next to
`scripts/intro/upscale.py` (download links and checksums are in that file). The 4K
master is written to the work folder; it is not committed because of its size.

## Replacing the island visuals

The hero uses a procedurally drawn SVG island so nothing depends on missing files.
To use real footage, add files to `public/media/` and set them in `lib/media.ts`:

```ts
export const heroMedia = {
  video: "/media/island-hero.mp4",
  poster: "/media/island-hero-poster.jpg",
  image: null,
  alt: "Aerial view of …",
};
```

Example concept previews are drawn in code (`components/examples/ExamplePreview.tsx`).
Add an image field to `ExampleConcept` in `lib/examples.ts` to swap in screenshots.

## What is (and isn't) connected

- The questionnaire builds a structured `WebsiteBrief` (`lib/brief.ts`) on the client only.
  `buildBrief()` returns the payload a future generation backend can receive.
- The contact form validates locally; no email service is connected.
- No AI, authentication, payments, database or publishing yet.
