"use client";

import { Moon } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { SandyMark } from "@/components/brand/SandyLogo";
import { introStore } from "@/lib/site/intro";
import { getLenis, gsap } from "@/lib/scroll/engine";

/**
 * In place of the scrollbar (hidden, app/globals.css): a thin line at the right edge from
 * the island to the night, filling as the journey goes on. Decorative; shown once the
 * journey has started.
 */
export function ScrollProgress() {
  const intro = useSyncExternalStore(introStore.subscribe, introStore.get, () => "intro" as const);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let off: (() => void) | undefined;
    const set = () => {
      const lenis = getLenis();
      if (lenis) el.style.setProperty("--p", Math.min(1, Math.max(0, lenis.progress || 0)).toFixed(4));
    };
    // The engine may start after this effect: wait for Lenis, then follow its scroll.
    const attach = () => {
      const lenis = getLenis();
      if (!lenis) return;
      gsap.ticker.remove(attach);
      off = lenis.on("scroll", set);
      set();
    };
    gsap.ticker.add(attach);
    window.addEventListener("resize", set);
    return () => {
      gsap.ticker.remove(attach);
      off?.();
      window.removeEventListener("resize", set);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className={`scroll-progress text-snow ${intro === "done" ? "is-shown" : ""}`}>
      <SandyMark className="block h-[15px] w-auto md:h-[18px]" weight={5.5} />
      <div className="scroll-progress-track">
        <i />
        <b />
      </div>
      <Moon className="block size-[13px] md:size-[15px]" strokeWidth={1.6} />
    </div>
  );
}
