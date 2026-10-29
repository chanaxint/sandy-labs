# Sandy Labs

Premium website creation studio. This repo is the marketing site (Next.js 16 App Router,
React 19, TypeScript, Tailwind CSS v4, Lenis + GSAP ScrollTrigger; Lucide and Motion are
installed but currently unused). The AI
generation backend, auth, payments, database and publishing are later stages: never fake them.

## Communication

- Explain things to the user in **Turkish**.
- Code, comments, commit messages, file names and UI copy stay in **English**.
- Whenever the user needs to run or update the site, give the commands as one copy-paste
  code block (`git pull origin <branch>`, `npm install` when needed, `npm run dev`), then the URL.

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build
npm run lint
npm run typecheck
```

## Design workflow

Project skills live in `.claude/skills/` (provenance in `.claude/skills/README.md`).
Use them in this order, and only the ones the task needs:

1. **Art direction**: `frontend-design`. Write a compact plan (palette, type, layout, principles)
   and check it against the brief before coding.
2. **Design system and UX data**: `ui-ux-pro-max` for palettes, font pairings, UX rules and
   checklists. Treat its output as reference, not a decision: when it conflicts with the brief or
   the established identity, the brief wins. (Example: it suggests "Liquid Glass" for this project,
   which the brief rules out.)
3. **Plan UX and responsive layout** (mobile, tablet, desktop) before implementation.
4. **Choose the animation tool per interaction** (table below).
5. **Implement**, then check with `vercel-react-best-practices` (performance) and
   `web-design-guidelines` (accessibility, forms, motion, copy).
6. **Test in a browser**: Playwright with the preinstalled Chromium (`/opt/pw-browsers`) at
   1440×900 and 390×844, plus `reducedMotion: "reduce"`. Screenshot and look at the result.
7. **Critique and refine** spacing, type, transitions, responsiveness and interaction details,
   then re-test.

## Animation decisions

| Need | Tool |
| --- | --- |
| Hover/focus/colour changes, simple reveals, ambient loops | CSS transitions/keyframes (`app/globals.css`) |
| React state: enter/exit, steps, dialogs, list add/remove, layout, gestures | Motion (`motion-react` skill) |
| Multi-element timelines, pinned/scrubbed scroll storytelling, cinematic sequences | GSAP + ScrollTrigger via the scroll engine (`gsap-*` skills) |
| Real-time 3D that the user steers or inspects | React Three Fiber (`threejs-r3f` skill) |

Rules:
- One owner per element and property: never animate the same property of one element from two systems.
- One scroll owner per page section (CSS, Motion `useScroll` or ScrollTrigger, not several).
- three/R3F is **not installed**. Add it only when a concrete feature needs it, explain why, and
  keep it out of the initial bundle (dynamic import where possible).
- Scrolling is owned by the scroll engine (`lib/scroll/engine.ts`): one Lenis instance driven by
  `gsap.ticker` (`autoRaf: false`), ScrollTrigger updated from Lenis. Never create another Lenis
  instance or a separate requestAnimationFrame loop; add per-frame work with `gsap.ticker.add`.
- Scroll-linked scenes use `createScene` / `<ScrollScene>` (`lib/scroll/scene.ts`,
  `components/scroll/`): progress 0→1 follows the scroll (scrub), long scenes pin. Media hooks
  in through `SceneMedia.render(update)`. Update the DOM in scene callbacks, never React state.
- Every animation has a reduced-motion path. Animate `transform`/`opacity`.
- If Motion is used, wrap it in `LazyMotion features={domMax} strict` and use `m.*`, not `motion.*`.

## Current state

- The previous frontend was reset (October 2026). The old design (island visual identity, Fraunces/Manrope, intro film, questionnaire, sections)
  lives on the `backup/pre-frontend-reset` branch; don't reintroduce parts of it unless asked.
- `public/media/` still holds the previous site's media (hero art, intro videos); it is not
  used. Never delete the user's media without asking, and never reference asset paths that
  don't exist.
- `scripts/intro/` is the pipeline that built the old intro videos. Playwright's Chromium
  cannot play H.264, so browser tests exercise AV1 files.
- No backend exists yet (no API routes, database, auth or env vars). Never fake them.
- The homepage is the journey film (`components/journey/`, `lib/journey/`): a WebCodecs
  frame player driven by a pinned `ScrollScene`. Tune it in `lib/journey/config.ts`; rebuild the
  media with `scripts/journey/build-journey.sh` (source video: GitHub release `journey-60fps`,
  4K 60 fps; the 30 fps original is release `sandy`). A 720p 30 fps fill-in plays at once, the sharp size
  takes over as it loads; there is no blocking preload.
  The story over the film (scenes of EN/TR phrases, frame timing, desktop/phone placement)
  lives in `lib/journey/story.ts`, rendered by `CinematicTextOverlay`, on a timeline following
  the film (`storyTimeline.ts`). Scroll pace is set per stretch (`pace` in config, `pace.ts`).
  The snowboard jump has its own beat (`jumpBeat.ts`: from the approach the film plays itself,
  holds with the board side-on as the phrase cuts in, runs through the landing until the rider leaves the frame, scroll handed back) with the rider's matted cut-out in front of the phrase
  (`rider.ts`, `scripts/journey/matte_rider.py`). The closing CTA isn't wired: there is no
  website-creation route yet. `/studio` is the Story Studio (layout editor, not linked):
  its saved `lib/journey/story-layout.json` is applied over `story.ts` (`storyStore.ts`);
  when the user sends one, commit it as that file.
  A white loading screen (`LoadingScreen.tsx`, the mark's lines running) comes first.
  The opening (`components/site/IntroGate.tsx`: logo + start button over drifting clouds (`IntroClouds.tsx`, they go down with the camera on start), scroll held until
  start, scroll before it does nothing; the film runs quickly to the first phrase, then a "Scroll"
  hint shows) hands over to the header (`SiteHeader.tsx`: "Contact us" top left (unwired), mark top centre, two-line menu with
  chapters, language, CTA) and the progress line that replaces the scrollbar (`ScrollProgress.tsx`). Logo paths: `lib/brand/logo.ts` (traced from
  `design/brand/sandy-labs-logo.jpg`).
  Shooting stars cross the night at the end now and then (`components/journey/ShootingStars.tsx`).
  `JourneyDebug` is a tuning panel, shown only with `?debug` in the URL.

## Code conventions

- Data and copy for repeatable sections live in `lib/`.
- Keep components small and typed; use Tailwind.
