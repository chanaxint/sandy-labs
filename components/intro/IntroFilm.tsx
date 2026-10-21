"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { introConfig } from "@/lib/intro";
import { fetchToObjectUrl, rankVariants } from "@/lib/videoPreload";

type IntroFilmProps = {
  /** Called once the visitor has left the intro (reached the end or skipped). */
  onExit: () => void;
  leaving: boolean;
};

const { duration, wheelSeconds, touchSeconds, keySeconds, maxLead, minRate, maxRate } = introConfig;
/** Closer than this to the target counts as "arrived" and playback pauses. */
const SETTLE = 0.04;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeIn = (x: number) => x ** 3;

/**
 * Caption placement for film time t: slide in from its side, drift slowly while
 * readable, then leave toward the other side. Offsets are in vw.
 */
function captionStyle(t: number, start: number, end: number, fromRight: boolean) {
  const p = (t - start) / (end - start);
  const dir = fromRight ? 1 : -1;
  if (p <= 0 || p >= 1) return { x: dir * 16, opacity: 0 };
  if (p < 0.3) {
    const e = easeOut(p / 0.3);
    return { x: dir * 16 * (1 - e), opacity: e };
  }
  if (p < 0.7) return { x: -dir * 2 * ((p - 0.3) / 0.4), opacity: 1 };
  const q = easeIn((p - 0.7) / 0.3);
  return { x: -dir * (2 + 12 * q), opacity: 1 - q };
}

/**
 * Full-screen, scroll-driven intro film. Scrolling (wheel, touch, keys) moves a
 * target time; a frame loop plays the video toward it with a speed that eases
 * with the remaining distance, so the picture glides after the scroll rather
 * than stepping frame by frame. Scrolling back plays a reversed copy of the clip.
 *
 * The forward clip is downloaded completely (with a progress bar) before the
 * film responds, so playback never waits on the network; the reversed copy
 * follows in the background.
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

  const readyRef = useRef(false);
  const captionRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const captionShadeRef = useRef<HTMLDivElement>(null);
  const rate = useRef(minRate);
  const rateSetAt = useRef(0);

  const [active, setActive] = useState<"fwd" | "rev">("fwd");
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

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
      if (!readyRef.current) return;
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

    const paintCaptions = (t: number) => {
      let strongest = 0;
      introConfig.captions.forEach((c, i) => {
        const el = captionRefs.current[i];
        if (!el) return;
        const { x, opacity } = captionStyle(t, c.start, c.end, c.from === "right");
        strongest = Math.max(strongest, opacity);
        const transform = `translate3d(${x.toFixed(2)}vw, 0, 0)`;
        const alpha = opacity.toFixed(3);
        if (el.style.transform !== transform) el.style.transform = transform;
        if (el.style.opacity !== alpha) el.style.opacity = alpha;
      });
      // Darken the picture slightly only while a line is on screen, for legibility.
      const shade = captionShadeRef.current;
      const shadeAlpha = (strongest * 0.32).toFixed(3);
      if (shade && shade.style.opacity !== shadeAlpha) shade.style.opacity = shadeAlpha;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const fwd = fwdRef.current;
      const rev = revRef.current;
      if (fwd && rev && readyRef.current && !reduce.current) paintCaptions(now());
      if (!fwd || !rev || !readyRef.current || exited.current || switching.current || reduce.current) return;

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
        rate.current = minRate;
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

      // Ease the speed and only touch playbackRate when it changes meaningfully:
      // frequent rate changes make some decoders drop frames.
      const want = clamp(Math.abs(diff) * 1.4, minRate, maxRate);
      rate.current += (want - rate.current) * 0.12;
      const stamp = performance.now();
      if (video.paused) {
        video.playbackRate = rate.current;
        rateSetAt.current = stamp;
      } else if (
        Math.abs(video.playbackRate - rate.current) / rate.current > 0.1 &&
        stamp - rateSetAt.current > 120
      ) {
        video.playbackRate = Math.round(rate.current * 20) / 20;
        rateSetAt.current = stamp;
      }
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

  // Choose resolution and codec, download the forward clip with progress, then the reverse one.
  useEffect(() => {
    const fwd = fwdRef.current;
    const rev = revRef.current;
    if (!fwd || !rev) return;
    const controller = new AbortController();
    const objectUrls: string[] = [];
    const markReady = () => {
      if (readyRef.current) return;
      readyRef.current = true;
      setReady(true);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markReady(); // the poster is all reduced-motion visitors see
      return;
    }

    // 1080p from laptop width up (or tablets at 2x); 720p for phones.
    const wide = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) >= 1200;
    const base = wide ? introConfig.sources.hd : introConfig.sources.sd;
    const [width, height] = wide ? [1920, 1080] : [1280, 720];

    const loads = (video: HTMLVideoElement, src: string) =>
      new Promise<boolean>((resolve) => {
        const ok = () => done(true);
        const fail = () => done(false);
        const done = (result: boolean) => {
          video.removeEventListener("loadeddata", ok);
          video.removeEventListener("error", fail);
          resolve(result);
        };
        video.addEventListener("loadeddata", ok);
        video.addEventListener("error", fail);
        video.src = src;
        video.load();
      });

    let shown = -1;
    const onProgress = (fraction: number) => {
      const pct = Math.floor(fraction * 100);
      if (pct !== shown) {
        shown = pct;
        setProgress(pct);
      }
    };

    (async () => {
      const variants = await rankVariants(fwd, width, height);
      for (const variant of variants) {
        try {
          const url = await fetchToObjectUrl(`${base}${variant.ext}`, onProgress, controller.signal);
          objectUrls.push(url);
          if (!(await loads(fwd, url))) continue; // can't decode this one: try the next codec
          markReady();
          const reverse = await fetchToObjectUrl(`${base}-reverse${variant.ext}`, undefined, controller.signal);
          objectUrls.push(reverse);
          rev.preload = "auto";
          rev.src = reverse;
          rev.load();
          return;
        } catch {
          if (controller.signal.aborted) return;
          if (readyRef.current) return; // forward clip plays; reverse falls back to seeking
        }
      }
      // Downloads failed (e.g. blocked fetch): stream the best variant instead.
      const fallback = variants[0];
      if (!fallback) return;
      fwd.addEventListener("canplay", markReady, { once: true });
      fwd.src = `${base}${fallback.ext}`;
      fwd.load();
    })();

    const onWaiting = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);
    for (const v of [fwd, rev]) {
      v.addEventListener("waiting", onWaiting);
      v.addEventListener("playing", onPlaying);
    }
    return () => {
      controller.abort();
      for (const v of [fwd, rev]) {
        v.removeEventListener("waiting", onWaiting);
        v.removeEventListener("playing", onPlaying);
      }
      for (const url of objectUrls) URL.revokeObjectURL(url);
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
          preload="none"
          poster={which === "fwd" ? introConfig.poster : undefined}
          disablePictureInPicture
          aria-hidden
          tabIndex={-1}
          className={`absolute inset-0 h-full w-full object-cover ${active === which ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {/* Lines that drift through the forest, driven by the film's position */}
      <div
        ref={captionShadeRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,rgba(0,0,0,0.55),rgba(0,0,0,0.85))]"
        style={{ opacity: 0 }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {introConfig.captions.map((c, i) => (
          <p
            key={c.text}
            ref={(el) => {
              captionRefs.current[i] = el;
            }}
            className={`absolute max-w-[86vw] font-display text-[clamp(2rem,5.2vw,4.75rem)] leading-[1.04] font-light tracking-[-0.025em] text-balance text-sand-50 will-change-transform sm:max-w-[58vw] ${
              c.from === "right" ? "right-[6vw] text-right" : "left-[6vw] text-left"
            }`}
            style={{
              top: `${c.top}%`,
              opacity: 0,
              textShadow: "0 2px 28px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.35)",
            }}
          >
            {c.text}
          </p>
        ))}
      </div>

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
          !ready || started || leaving ? "pointer-events-none opacity-0" : "opacity-100 delay-300"
        }`}
      >
        <span className="relative flex h-8 w-5 justify-center rounded-full border border-current">
          <span className="animate-intro-wheel mt-1.5 h-1.5 w-[2px] rounded-full bg-current" />
        </span>
        <span className="text-[0.65rem] font-medium tracking-[0.2em] uppercase">Scroll</span>
      </button>

      {/* Loading: the film responds once the forward clip is fully downloaded. */}
      <div
        role="progressbar"
        aria-label="Loading intro"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className={`pointer-events-none absolute bottom-9 left-1/2 flex w-36 -translate-x-1/2 flex-col items-center gap-2.5 text-sand-50/80 transition-opacity duration-300 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="text-[0.65rem] font-medium tracking-[0.2em] tabular-nums uppercase">Loading {progress}%</span>
        <span className="block h-px w-full overflow-hidden bg-sand-50/25">
          <span
            className="block h-full origin-left bg-sand-50 transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </span>
      </div>

      {waiting && started ? (
        <div aria-hidden className="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2">
          <span className="block h-full w-full animate-spin rounded-full border-2 border-sand-50/25 border-t-sand-50" />
        </div>
      ) : null}
    </div>
  );
}
