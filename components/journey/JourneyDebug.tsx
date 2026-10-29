"use client";

import { useEffect, useRef } from "react";
import { journeyConfig } from "@/lib/journey/config";
import { filmStatus } from "@/lib/journey/film";
import { jumpStatus } from "@/lib/journey/jumpBeat";
import { frameAt, paceAt, progressAt } from "@/lib/journey/pace";
import { getLenis, gsap } from "@/lib/scroll/engine";

/**
 * TEMPORARY tuning panel for the journey film: shown in development, or anywhere
 * with `?debug` in the URL. Updated from the shared GSAP ticker, a few times a second.
 */
export function JourneyDebug() {
  const out = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const enabled = process.env.NODE_ENV !== "production" || new URLSearchParams(location.search).has("debug");
    if (!enabled || !out.current) return;
    out.current.hidden = false;
    // For browser tests.
    Object.assign(window, { __journey: filmStatus, __jump: jumpStatus, __pace: { frameAt, progressAt } });
    let last = 0;
    const tick = (time: number) => {
      if (time - last < 0.1 || !out.current) return;
      last = time;
      const s = filmStatus;
      const src = s.source;
      const lenis = getLenis();
      const maxScroll = document.documentElement.scrollHeight - innerHeight;
      out.current.textContent = [
        `progress   ${s.progress.toFixed(4)}`,
        `time       ${(s.target / s.fps).toFixed(2)}s / ${(s.frames / s.fps).toFixed(2)}s`,
        `frame      ${s.target.toFixed(2)} → shown ${Math.round(s.shown)} (${s.mode})`,
        `render     ${s.renderFps.toFixed(0)} fps`,
        `scroll     ${Math.round(scrollY)} / ${maxScroll}px`,
        `pace       ${paceAt(s.target)}vh per film second here   jump ${jumpStatus.state} (${jumpStatus.plays})`,
        `scrub      ${journeyConfig.scrub}   lenis lerp ${lenis?.options.lerp ?? "off"}`,
        `velocity   ${lenis ? lenis.velocity.toFixed(1) : "–"}`,
        `media      ${s.variant}`,
        src
          ? `loaded     ${((src.loadedBytes / src.totalBytes) * 100).toFixed(0)}% of ${(src.totalBytes / 1e6).toFixed(1)} MB (fill-in)`
          : "loaded     –",
        `demand     ${s.demand.toFixed(0)} frames/s   drawing ${s.renderer}   on screen ${s.size ?? "–"}p`,
        src ? `fill-in    decoded ${src.decoded}   cached ${src.cached}   queue ${src.decodeQueue}` : "fill-in    –",
        s.best
          ? `sharp      decoded ${s.best.decoded}   cached ${s.best.cached}   queue ${s.best.decodeQueue}   loaded ${((s.best.loadedBytes / s.best.totalBytes) * 100).toFixed(0)}%`
          : "sharp      –",
      ].join("\n");
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <pre
      ref={out}
      hidden
      data-journey-debug
      className="pointer-events-none fixed top-3 left-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-md bg-black/60 px-3 py-2 font-mono text-[11px] leading-[1.45] break-words whitespace-pre-wrap text-white max-sm:text-[9px]"
    />
  );
}
