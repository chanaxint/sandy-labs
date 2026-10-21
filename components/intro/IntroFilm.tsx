"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { introConfig } from "@/lib/intro";

type IntroFilmProps = {
  /** Called once the visitor has left the intro (reached the end or skipped). */
  onExit: () => void;
  leaving: boolean;
};

const { duration, wheelSeconds, touchSeconds, keySeconds, maxLead, minRate, maxRate } = introConfig;
/** Closer than this to the target counts as "arrived" and playback pauses. */
const SETTLE = 0.04;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Full-screen, scroll-driven intro film. Scrolling (wheel, touch, keys) moves a
 * target time; a frame loop plays the video toward it with a speed that eases
 * with the remaining distance, so the picture glides after the scroll rather
 * than stepping frame by frame. Scrolling back plays a reversed copy of the clip.
 */
export function IntroFilm({ onExit, leaving }: IntroFilmProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fwdRef = useRef<HTMLVideoElement>(null);
  const revRef = useRef<HTMLVideoElement>(null);
  const target = useRef(0);
  const activeRef = useRef<"fwd" | "rev">("fwd");
  const switching = useRef(false);
  const exited = useRef(false);
  const reduce = useRef(false);

  const [active, setActive] = useState<"fwd" | "rev">("fwd");
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const exit = useCallback(() => {
    if (exited.current) return;
    exited.current = true;
    fwdRef.current?.pause();
    revRef.current?.pause();
    onExit();
  }, [onExit]);

  /** Position in forward-clip time, whichever copy is showing. */
  const now = useCallback(() => {
    const rev = revRef.current;
    if (activeRef.current === "rev" && rev) return duration - rev.currentTime;
    return fwdRef.current?.currentTime ?? 0;
  }, []);

  /** Move the scroll target, kept within reach of the picture so it never runs away. */
  const nudge = useCallback(
    (seconds: number) => {
      if (exited.current) return;
      if (reduce.current) {
        // No playback for reduced motion: moving forward goes straight to the homepage.
        if (seconds > 0) exit();
        return;
      }
      const t = now();
      target.current = clamp(target.current + seconds, Math.max(0, t - maxLead), Math.min(duration, t + maxLead));
      if (target.current > 0.15) setStarted(true);
    },
    [exit, now],
  );

  // Frame loop: play the right copy toward the target at an easing speed.
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const show = (which: "fwd" | "rev") => {
      activeRef.current = which;
      setActive(which);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const fwd = fwdRef.current;
      const rev = revRef.current;
      if (!fwd || !rev || exited.current || switching.current || reduce.current) return;

      const t = now();
      if (t >= duration - 0.08 && target.current >= duration - 0.1) {
        exit();
        return;
      }

      const diff = target.current - t;
      const video = activeRef.current === "fwd" ? fwd : rev;
      if (Math.abs(diff) < SETTLE) {
        if (!video.paused) video.pause();
        return;
      }

      const dir = diff > 0 ? "fwd" : "rev";
      if (dir === "rev" && rev.readyState < 3) {
        // Reverse copy still loading: step backwards by seeking the forward copy.
        if (!rev.paused) rev.pause();
        if (activeRef.current !== "fwd") show("fwd");
        if (!fwd.paused) fwd.pause();
        if (!fwd.seeking) fwd.currentTime = Math.max(target.current, t - 0.12);
        return;
      }

      if (activeRef.current !== dir) {
        // Change of direction: line the other copy up on the same frame, then swap.
        const next = dir === "fwd" ? fwd : rev;
        video.pause();
        switching.current = true;
        const done = () => {
          next.removeEventListener("seeked", done);
          show(dir);
          switching.current = false;
        };
        next.addEventListener("seeked", done);
        next.currentTime = dir === "fwd" ? t : duration - t;
        return;
      }

      const rate = clamp(Math.abs(diff) * 1.4, minRate, maxRate);
      if (Math.abs(video.playbackRate - rate) > 0.05) video.playbackRate = rate;
      if (video.paused) {
        video.play().catch(() => {
          // Playback refused (e.g. power saving): jump instead.
          video.currentTime = dir === "fwd" ? target.current : duration - target.current;
        });
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [exit, now]);

  // Input: wheel, touch and keyboard. The page underneath is scroll-locked.
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    let touchY: number | null = null;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      nudge(px * wheelSeconds);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // no pull-to-refresh or rubber-banding while the intro is open
      const y = e.touches[0]?.clientY;
      if (touchY === null || y === undefined) return;
      nudge((touchY - y) * touchSeconds);
      touchY = y;
    };
    const onTouchEnd = () => {
      touchY = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("button") && (e.key === " " || e.key === "Enter")) {
        return; // let the focused button handle it
      }
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        nudge(keySeconds);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        nudge(-keySeconds);
      } else if (e.key === "Escape" || e.key === "End") {
        exit();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [nudge, exit]);

  // Pick resolution and codec once on the client; load the reverse copy after the forward one.
  useEffect(() => {
    const fwd = fwdRef.current;
    const rev = revRef.current;
    if (!fwd || !rev) return;
    // 1080p from laptop width up (or tablets at 2x); 720p for phones.
    const wide = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) >= 1200;
    const base = wide ? introConfig.sources.hd : introConfig.sources.sd;
    let ext = fwd.canPlayType('video/mp4; codecs="av01.0.08M.08"') === "probably" ? ".av1.mp4" : ".mp4";

    const assign = (video: HTMLVideoElement, reverse: boolean) => {
      video.src = `${base}${reverse ? "-reverse" : ""}${ext}`;
      video.load();
    };
    // AV1 missing or undecodable: fall back to H.264 for both copies.
    const onError = () => {
      if (ext === ".mp4") return;
      ext = ".mp4";
      assign(fwd, false);
      if (rev.getAttribute("src")) assign(rev, true);
    };
    const loadReverse = () => {
      if (reduce.current || rev.getAttribute("src")) return;
      rev.preload = "auto"; // "none" until now so it doesn't compete with the forward copy
      assign(rev, true);
    };
    const onWaiting = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);

    fwd.addEventListener("error", onError);
    rev.addEventListener("error", onError);
    fwd.addEventListener("canplaythrough", loadReverse, { once: true });
    for (const v of [fwd, rev]) {
      v.addEventListener("waiting", onWaiting);
      v.addEventListener("playing", onPlaying);
    }
    assign(fwd, false);

    return () => {
      fwd.removeEventListener("error", onError);
      rev.removeEventListener("error", onError);
      fwd.removeEventListener("canplaythrough", loadReverse);
      for (const v of [fwd, rev]) {
        v.removeEventListener("waiting", onWaiting);
        v.removeEventListener("playing", onPlaying);
      }
    };
  }, []);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Sandy Labs intro"
      className={`fixed inset-0 z-[70] overflow-hidden bg-[#0b1f27] text-sand-50 outline-none transition-opacity duration-[900ms] ease-[var(--ease-island)] ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ overscrollBehavior: "contain", touchAction: "none" }}
    >
      {/* Film: two stacked copies, forward and reversed. */}
      {(["fwd", "rev"] as const).map((which) => (
        <video
          key={which}
          ref={which === "fwd" ? fwdRef : revRef}
          muted
          playsInline
          preload={which === "fwd" ? "auto" : "none"}
          poster={which === "fwd" ? introConfig.poster : undefined}
          disablePictureInPicture
          aria-hidden
          tabIndex={-1}
          className={`absolute inset-0 h-full w-full object-cover ${active === which ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {/* Soft shading only where the controls sit */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />

      <button
        type="button"
        onClick={exit}
        className="absolute top-5 right-5 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide text-sand-50/80 transition-colors hover:text-sand-50 sm:top-6 sm:right-8"
      >
        Skip intro
      </button>

      <button
        type="button"
        onClick={() => nudge(keySeconds)}
        aria-label="Scroll down to continue"
        className={`absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-sand-50/85 transition-opacity duration-700 ease-[var(--ease-island)] hover:text-sand-50 ${
          started || leaving ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <span className="relative flex h-8 w-5 justify-center rounded-full border border-current">
          <span className="animate-intro-wheel mt-1.5 h-1.5 w-[2px] rounded-full bg-current" />
        </span>
        <span className="text-[0.65rem] font-medium tracking-[0.2em] uppercase">Scroll</span>
      </button>

      {waiting && started ? (
        <div aria-hidden className="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2">
          <span className="block h-full w-full animate-spin rounded-full border-2 border-sand-50/25 border-t-sand-50" />
        </div>
      ) : null}
    </div>
  );
}
