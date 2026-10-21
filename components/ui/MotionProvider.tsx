"use client";

import { domMax, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Shared Motion setup and the OS reduced-motion preference. `domMax` (not
 * `domAnimation`) is required because the composer uses `layout` animations.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
