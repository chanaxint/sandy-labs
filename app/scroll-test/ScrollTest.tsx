"use client";

import { useEffect, useRef } from "react";
import { ScrollScene } from "@/components/scroll/ScrollScene";
import { getLenis, gsap } from "@/lib/scroll/engine";
import type { SceneMedia, SceneUpdate } from "@/lib/scroll/scene";

/*
 * TEMPORARY test bed for the scroll engine. Plain test fixtures, not a design.
 * Every readout is written straight to the DOM from the shared GSAP ticker or the
 * scene callbacks; nothing here causes React re-renders while scrolling.
 */

type Readout = { progress: number; direction: number };
declare global {
  interface Window {
    __scrollTest?: Record<string, Readout>;
  }
}

function report(id: string, u: SceneUpdate) {
  window.__scrollTest = { ...window.__scrollTest, [id]: { progress: u.progress, direction: u.direction } };
}

/** Stand-in for a frame-sequence player: maps progress to one of 240 frames. */
function fakeFrames(stage: HTMLElement): SceneMedia {
  const label = stage.querySelector<HTMLElement>("[data-frame]");
  let shown = -1;
  return {
    render: ({ progress }) => {
      const frame = Math.round(progress * 239);
      if (frame === shown || !label) return;
      shown = frame;
      label.textContent = `frame ${String(frame).padStart(3, "0")} / 239`;
    },
  };
}

function SceneReadout({ id }: { id: string }) {
  return (
    <div className="absolute inset-x-6 bottom-6 font-mono text-xs text-neutral-700 sm:text-sm">
      <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1">
        <span>scene {id}</span>
        <span data-progress={id}>progress 0.000</span>
        <span data-direction={id}>direction —</span>
        <span data-frame>frame 000 / 239</span>
      </div>
      <div className="h-1 bg-neutral-200">
        <div data-bar={id} className="h-full origin-left bg-neutral-900" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}

function sceneUpdater(id: string) {
  return (u: SceneUpdate) => {
    report(id, u);
    const root = document.querySelector(`[data-scene="${id}"]`);
    if (!root) return;
    const p = root.querySelector<HTMLElement>(`[data-progress="${id}"]`);
    const d = root.querySelector<HTMLElement>(`[data-direction="${id}"]`);
    const bar = root.querySelector<HTMLElement>(`[data-bar="${id}"]`);
    if (p) p.textContent = `progress ${u.progress.toFixed(3)}`;
    if (d) d.textContent = `direction ${u.direction === 1 ? "down ↓" : "up ↑"}`;
    if (bar) bar.style.transform = `scaleX(${u.progress})`;
  };
}

export function ScrollTest() {
  const hud = useRef<HTMLPreElement>(null);

  // Global readout, sampled on the shared GSAP ticker (no second rAF loop).
  useEffect(() => {
    const tick = () => {
      const lenis = getLenis();
      if (!hud.current) return;
      hud.current.textContent = [
        `scrollY    ${Math.round(window.scrollY)}`,
        `lenis      ${lenis ? (lenis.isStopped ? "stopped" : "running") : "off"}`,
        `velocity   ${lenis ? lenis.velocity.toFixed(1) : "0"}`,
        `direction  ${lenis ? (lenis.direction === -1 ? "up" : lenis.direction === 1 ? "down" : "—") : "—"}`,
        `smoothing  ${lenis?.options.lerp ?? "none"}`,
      ].join("\n");
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className="bg-white text-neutral-900">
      <pre
        ref={hud}
        className="pointer-events-none fixed top-4 left-4 z-50 rounded bg-white/90 p-3 font-mono text-xs leading-5 shadow"
      />
      <div className="flex h-svh items-center justify-center border-b border-neutral-200 font-mono text-sm text-neutral-500">
        scroll test — scroll down
        {/* Ambient loop: CSS-driven, keeps running when the scroll stops. */}
        <span data-ambient className="ambient-spin ml-4 inline-block size-4 border border-neutral-400" />
      </div>

      <ScrollScene
        id="a"
        length={2}
        className="border-b border-neutral-200"
        media={fakeFrames}
        onUpdate={sceneUpdater("a")}
        timeline={(tl, stage) => {
          tl.fromTo(stage.querySelector("[data-box]"), { xPercent: -50, x: "-30vw" }, { x: "30vw", rotate: 180 });
        }}
      >
        <div data-box className="absolute top-1/2 left-1/2 size-24 -translate-y-1/2 bg-neutral-900" />
        <SceneReadout id="a" />
      </ScrollScene>

      <div className="flex h-svh items-center justify-center border-b border-neutral-200 font-mono text-sm text-neutral-500">
        unpinned gap between scenes
      </div>

      <ScrollScene
        id="b"
        length={3}
        onUpdate={sceneUpdater("b")}
        timeline={(tl, stage) => {
          tl.fromTo(stage.querySelector("[data-disc]"), { scale: 0.2, opacity: 0.2 }, { scale: 1, opacity: 1 });
        }}
      >
        <div data-disc className="absolute top-1/2 left-1/2 -mt-32 -ml-32 size-64 rounded-full bg-neutral-300" />
        <SceneReadout id="b" />
      </ScrollScene>

      <div className="flex h-svh items-center justify-center font-mono text-sm text-neutral-500">end of test</div>
    </div>
  );
}
