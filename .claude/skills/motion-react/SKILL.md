---
name: motion-react
description: Project guidance for Motion (motion.dev, `motion/react`) in React/Next.js — enter/exit transitions with AnimatePresence, layout animations, variants, gestures, scroll-linked motion values and microinteractions. Use when adding or reviewing React UI animation in this project, or deciding between CSS, Motion and GSAP for an interaction.
metadata:
  author: sandy-labs (project-authored; not an official Motion skill)
  verified-against: motion 14.4.0
---

# Motion for React

Motion publishes no official agent skill. This one is written for this project and
checked against the installed `motion` package. For API detail beyond it, use the
official docs at https://motion.dev/docs/react, or read the types in
`node_modules/motion/dist/` (the docs site is not always reachable from the sandbox).

## When Motion is the right tool

Use Motion for UI state that React owns:
- Enter **and exit** of conditionally rendered UI (steps, dialogs, toasts, list items)
- Layout changes: reordering, items removed from a list, expanding panels, shared elements (`layoutId`)
- Gesture feedback: `whileHover`, `whileTap`, `whileFocus`, drag
- Small scroll-linked values tied to one component (`useScroll` + `useTransform`)

Do not use it for:
- Simple hover/focus colour or opacity changes → CSS transitions
- Multi-element, pinned or scrubbed scroll choreography → GSAP + ScrollTrigger (see gsap-* skills)
- 3D scenes → React Three Fiber (`useFrame`), not Motion

Never drive the same element's same property from Motion and GSAP (or CSS transitions) at once.

## Project setup (already in place)

`components/ui/MotionProvider.tsx` wraps the page:

```tsx
<LazyMotion features={domMax} strict>
  <MotionConfig reducedMotion="user" transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
```

- Import `m` (not `motion`) inside `LazyMotion strict`; `motion.*` throws under `strict`.
- `domAnimation` = animations, variants, exit, hover/tap/focus. It does **not** include `layout`/`layoutId` or drag; those need `domMax`. A `layout` prop under `domAnimation` silently does nothing. This project uses `domMax` because the composer animates layout.
- `reducedMotion="user"` disables transform/layout animation when the OS asks for reduced motion; opacity still fades. Check anything that relies on movement to convey meaning.

## Patterns

**Exit animations** — the element must be a direct child of `AnimatePresence` with a stable `key`:

```tsx
<AnimatePresence mode="wait" initial={false} custom={direction}>
  <m.div key={step.id} custom={direction} variants={v} initial="enter" animate="center" exit="exit" />
</AnimatePresence>
```

- `mode="wait"`: old exits before new enters (step flows). Default `"sync"` overlaps them.
- `custom` must be set on both `AnimatePresence` and the child so exiting children get the latest value (e.g. direction).
- Keys must be stable ids, never array indexes, or the wrong item animates out.
- Content that mounts after an exit (`mode="wait"`) is not in the DOM straight away. Move focus from a callback ref or `onAnimationComplete`, not right after `setState`.

**Layout** — `layout` on items that move; `layout="position"` for elements whose size should not be animated (avoids text stretching). Wrap siblings that affect each other in `LayoutGroup`.

**Native `<dialog>` with exit animation** — keep the dialog open while `AnimatePresence` plays the exit, then call `dialog.close()` in `onExitComplete`. Intercept Escape with `onCancel={(e) => { e.preventDefault(); close(); }}`. See `components/examples/ExampleDialog.tsx`.

**Scroll-linked values**

```tsx
const ref = useRef(null);
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
return <m.div ref={ref} style={{ y }} />;
```

Motion values update outside React render, so they don't re-render the component. Smooth them with `useSpring` when needed.

## Performance and quality

- Animate `transform` and `opacity`. Avoid animating `width`, `height`, `top`, `filter: blur()` on large areas, or `box-shadow`. Use `layout` instead of animating size.
- Keep exits short (0.2–0.3 s) and entrances a little longer (0.4–0.6 s). Exits slow down navigation.
- One easing family across the project: `[0.22, 1, 0.36, 1]` (matches `--ease-island` in CSS).
- Don't wrap static content in `m.*` just in case: every motion component costs a little.
- Test with reduced motion on (Playwright: `browser.newPage({ reducedMotion: "reduce" })`).
