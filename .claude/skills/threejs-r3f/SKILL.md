---
name: threejs-r3f
description: Project guidance for real-time 3D with Three.js and React Three Fiber (R3F) + drei in Next.js — deciding whether 3D is warranted, scene setup, camera, lighting and environment, loading compressed models and textures, scroll- or pointer-driven cameras, performance budgets, mobile fallbacks and reduced motion. Use before adding any WebGL/3D element to this project or reviewing one.
metadata:
  author: sandy-labs (project-authored; not an official three.js or pmndrs skill)
  verified-against: "npm registry 2026-10-21 — three 0.186.1, @react-three/fiber 9.8.2 (peer react >=19 <19.4), @react-three/drei 10.7.9, @react-three/postprocessing 3.2.1"
---

# Three.js / React Three Fiber

Neither three.js nor pmndrs publishes an official agent skill. Sources of truth:
https://threejs.org/docs/ and https://r3f.docs.pmnd.rs/. The 3D packages are **not**
installed in this project; add them only when a feature needs them.

## First decide whether 3D earns its place

Real-time 3D costs a large bundle (three alone is ~150 KB gzipped), GPU time, battery and
accessibility work. Use it only when the user gains something a video, image or CSS can't give:
- An object people genuinely want to inspect (product configurator, vehicle viewer)
- A scene whose depth responds to the user (camera follows scroll or pointer)
- Data or space that is inherently 3D

If the motion is fixed and non-interactive, a compressed video loop or layered 2D parallax is
cheaper and usually looks better. For Sandy Labs, the hero island is 2D (SVG + parallax) by
design. A real-time 3D island is a candidate only if the camera should respond to the user.

## Install (only when needed)

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
# effects only if required:
npm install @react-three/postprocessing postprocessing
```

Check peer ranges before installing: `npm view @react-three/fiber peerDependencies`. R3F 9.x
needs React 19 within its supported minor range.

## Next.js integration

Load the canvas client-only and lazily, so three never enters the server bundle or blocks first paint:

```tsx
// components/three/IslandScene.client.tsx  ("use client")
export default function IslandScene() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 6, 12], fov: 35 }} gl={{ antialias: true }} frameloop="always">
      <Suspense fallback={null}>
        <Island />
        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  );
}

// in a client component
const IslandScene = dynamic(() => import("./IslandScene.client"), { ssr: false, loading: () => <Poster /> });
```

- Always render a static poster (image) behind or before the canvas: it covers loading, failed
  WebGL, reduced motion and low-power devices.
- Give the canvas container explicit size; `<Canvas>` fills its parent.

## Scene essentials

- **Lighting**: image-based lighting via drei `<Environment>` (HDRI) gives realistic results
  cheaply. Add one directional light only if you need defined shadows. Bake shadows/AO into
  textures when the scene is static.
- **Colour**: R3F defaults to sRGB output and ACES Filmic tone mapping. Keep textures in the
  right colour space (`colorSpace = SRGBColorSpace` for albedo; data maps linear).
- **Camera motion**: interpolate toward a target in `useFrame` with frame-rate-independent
  damping (`THREE.MathUtils.damp(current, target, lambda, delta)` or drei `maath/easing`).
  Never hard-set positions from scroll events.
- **Scroll-driven camera**: drei `<ScrollControls>` / `useScroll`, or read a GSAP ScrollTrigger
  progress value inside `useFrame`. Choose one scroll owner per page.

## Assets

- Models: glTF/GLB only, compressed with Draco or Meshopt (`npx gltfjsx model.glb --transform`
  produces a compressed file and a typed JSX component). Textures: KTX2/Basis or WebP, power-of-two,
  ≤2K on mobile.
- Load with `useGLTF` / `useTexture`; call `useGLTF.preload(url)` for above-the-fold scenes.
- Budget for a hero scene: ≤ 2–3 MB total transferred, ≤ 100k triangles, ≤ 50 draw calls on mobile.
- Assets go in `public/` and must exist; never reference paths that haven't been added.

## Performance rules

- Never allocate (`new Vector3()`, materials, geometries) inside `useFrame`; reuse refs.
- Mutate via refs in `useFrame`; don't `setState` per frame.
- Use `delta` for all motion so speed doesn't depend on refresh rate.
- `frameloop="demand"` + `invalidate()` for scenes that are static until interaction.
- Pause rendering when off-screen (IntersectionObserver → `frameloop` "never") and when the
  tab is hidden.
- Clamp `dpr={[1, 2]}`; use drei `<PerformanceMonitor>` / `<AdaptiveDpr>` to step quality down.
- Repeated objects (trees, rocks) → `<Instances>` / `InstancedMesh`.
- Post-processing (bloom, DOF) is expensive on mobile; use sparingly and disable on low tiers.
- R3F disposes objects on unmount; dispose manually created ones yourself.

## Accessibility and reduced motion

- The canvas is decorative unless interactive: `aria-hidden` on its wrapper, real content in HTML.
- Interactive 3D needs a non-3D path (buttons or a list) to reach the same information.
- `prefers-reduced-motion: reduce` → show the poster, or render one still frame
  (`frameloop="demand"`) with no autonomous camera motion.
- Keep text out of WebGL; overlay HTML so it stays selectable, translatable and legible.

## Verification

- Test in Playwright at desktop and mobile sizes (Chromium in this sandbox runs WebGL via
  SwiftShader: slow, so judge visuals, not frame rate).
- Measure on a real mid-range phone before shipping: scroll stays smooth and frames stay
  under ~16 ms.
- Check the build output: three should only appear in the lazily loaded chunk.
