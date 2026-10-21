# Sandy Labs

Premium, island-themed website creation studio. This repo is the marketing homepage
(Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Lucide, Motion). The AI
generation backend, auth, payments, database and publishing are later stages: never fake them.

## Communication

- Explain things to the user in **Turkish**.
- Code, comments, commit messages, file names and UI copy stay in **English**.

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
| Multi-element timelines, pinned/scrubbed scroll storytelling, cinematic sequences | GSAP + ScrollTrigger (`gsap-*` skills) |
| Real-time 3D that the user steers or inspects | React Three Fiber (`threejs-r3f` skill) |

Rules:
- One owner per element and property: never animate the same property of one element from two systems.
- One scroll owner per page section (CSS, Motion `useScroll` or ScrollTrigger, not several).
- GSAP and three/R3F are **not installed**. Add them only when a concrete feature needs them,
  explain why, and keep them out of the initial bundle (dynamic import where possible).
- No smooth-scroll hijacking library unless a feature truly requires it; native scrolling stays.
- Every animation has a reduced-motion path. Animate `transform`/`opacity`.
- Motion runs under `LazyMotion features={domMax} strict`: use `m.*`, not `motion.*`.

## Visual identity (keep consistent)

- Island concept: aerial ocean, reef, sand, canopy. Colours are tokens in `app/globals.css`
  (`ink`, `sand-*`, `lagoon-*`, `palm-*`, `coral`).
- Type: Fraunces (display, light weights, italics) + Manrope (UI/body).
- Avoid: generic SaaS card grids, neon, space backgrounds, glowing orbs, needless glassmorphism.
- Examples are design concepts, never presented as client work. No invented testimonials,
  contact details or claims.
- Hero media: `lib/media.ts`. Never reference asset paths that don't exist.
- Intro film (scroll-stepped video before the homepage): `lib/intro.ts`, `components/intro/`,
  rebuild videos with `scripts/intro/build-intro.sh`. Playwright's Chromium cannot play H.264,
  so browser tests exercise the AV1 files.

## Code conventions

- Data and copy for repeatable sections live in `lib/` (`questionnaire.ts`, `examples.ts`).
- Shared questionnaire state: `components/questionnaire/BriefProvider.tsx`.
- Keep components small and typed; match the existing Tailwind style.
