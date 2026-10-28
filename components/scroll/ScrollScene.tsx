"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/scroll/engine";
import { createScene, type SceneMedia, type SceneUpdate } from "@/lib/scroll/scene";

gsap.registerPlugin(useGSAP);

type ScrollSceneProps = {
  /** Scroll distance of the scene, in viewport heights. */
  length: number;
  /** Pin the full-screen stage while the scene plays. */
  pin?: boolean;
  scrub?: boolean | number;
  /** Builds the scene's scrubbed timeline; targets are looked up inside the stage. */
  timeline?: (tl: gsap.core.Timeline, stage: HTMLElement) => void;
  /** Creates the media that renders the scene (frame sequence, video, ...). */
  media?: (stage: HTMLElement) => SceneMedia;
  /** Called every scroll frame; update the DOM through refs here, not React state. */
  onUpdate?: (update: SceneUpdate) => void;
  id?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * A full-screen stage whose content follows the scroll. With `pin`, the stage stays
 * on screen for `length` viewport heights while the scene progresses.
 *
 * Callbacks are read through a ref, so passing new functions doesn't rebuild the
 * scene or cause extra renders.
 */
export function ScrollScene({ length, pin = true, scrub = true, id, className, children, ...callbacks }: ScrollSceneProps) {
  const stage = useRef<HTMLElement>(null);
  const latest = useRef(callbacks);
  // Declared before useGSAP, so the scene is built with (and later calls) the newest callbacks.
  useLayoutEffect(() => {
    latest.current = callbacks;
  });

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const { timeline, media } = latest.current;
      const scene = createScene({
        id,
        trigger: el,
        length,
        pin,
        scrub,
        timeline: timeline ? (tl) => timeline(tl, el) : undefined,
        media: media?.(el),
        onUpdate: (u) => latest.current.onUpdate?.(u),
      });
      return () => scene.kill();
    },
    { scope: stage, dependencies: [length, pin, scrub, id] },
  );

  return (
    <section ref={stage} data-scene={id} className={`relative h-dvh w-full overflow-hidden ${className ?? ""}`}>
      {children}
    </section>
  );
}
