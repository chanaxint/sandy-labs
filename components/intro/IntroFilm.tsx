"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { introConfig } from "@/lib/intro";

type IntroFilmProps = {
  /** Called once the visitor has left the intro (finished or skipped). */
  onExit: () => void;
  leaving: boolean;
};

type Playback = {
  /** Stop the film is at, or heading to. */
  to: number;
  /** Stop the film left from (equals `to` when idle). */
  from: number;
  playing: boolean;
  dir: 1 | -1;
  rate: number;
};

const { stops, duration } = introConfig;
const LAST = stops.length - 1;
/** Index one past the last stop: playing to it means "leave the intro". */
const EXIT = stops.length;
/** Wheel events closer together than this belong to the same gesture (trackpad inertia). */
const GESTURE_GAP_MS = 220;
const SWIPE_MIN_PX = 40;

function stopTime(index: number) {
  return index >= EXIT ? duration : stops[index].time;
}

/**
 * Full-screen intro film. Each scroll gesture, swipe or key press plays the
 * clip to the next stop and pauses; scrolling back plays a reversed copy.
 * Further input in the same direction while playing speeds the step up;
 * input in the opposite direction turns around.
 */
export function IntroFilm({ onExit, leaving }: IntroFilmProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fwdRef = useRef<HTMLVideoElement>(null);
  const revRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef(0);
  const reduceRef = useRef(false);
  const exitedRef = useRef(false);
  const pb = useRef<Playback>({ to: 0, from: 0, playing: false, dir: 1, rate: introConfig.playbackRate });

  const [active, setActive] = useState<"fwd" | "rev">("fwd");
  const [stop, setStop] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [flash, setFlash] = useState(false);
  const activeRef = useRef<"fwd" | "rev">("fwd");

  const exit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    fwdRef.current?.pause();
    revRef.current?.pause();
    onExit();
  }, [onExit]);

  /** Current position in forward-clip time, whichever element is showing. */
  const currentTime = () => {
    const fwd = fwdRef.current;
    const rev = revRef.current;
    if (activeRef.current === "rev" && rev) return duration - rev.currentTime;
    return fwd?.currentTime ?? 0;
  };

  const show = (which: "fwd" | "rev") => {
    activeRef.current = which;
    setActive(which);
  };

  const settle = useCallback(
    (index: number) => {
      const p = pb.current;
      p.playing = false;
      p.from = p.to = index;
      p.rate = introConfig.playbackRate;
      setPlaying(false);
      if (index >= EXIT) {
        exit();
        return;
      }
      setStop(index);
    },
    [exit],
  );

  const seek = (video: HTMLVideoElement, time: number) =>
    new Promise<void>((resolve) => {
      if (Math.abs(video.currentTime - time) < 0.01) return resolve();
      const done = () => {
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
      video.currentTime = time;
    });

  /** Reduced motion, or reverse clip not ready: cross-fade straight to the stop. */
  const jump = useCallback(
    async (index: number) => {
      const fwd = fwdRef.current;
      if (!fwd) return;
      const p = pb.current;
      p.playing = true;
      setPlaying(true);
      setFlash(true);
      await new Promise((r) => setTimeout(r, 280));
      if (index >= EXIT) return settle(index);
      revRef.current?.pause();
      show("fwd");
      await seek(fwd, stopTime(index));
      setFlash(false);
      settle(index);
    },
    [settle],
  );

  const run = useCallback(async () => {
    const p = pb.current;
    const fwd = fwdRef.current;
    const rev = revRef.current;
    if (!fwd || !rev) return;
    cancelAnimationFrame(rafRef.current);

    const target = stopTime(p.to);
    const t = currentTime();
    const dir: 1 | -1 = target >= t ? 1 : -1;
    p.dir = dir;

    if (reduceRef.current || (dir === -1 && rev.readyState < 3)) {
      fwd.pause();
      rev.pause();
      return jump(p.to);
    }

    const video = dir === 1 ? fwd : rev;
    const other = dir === 1 ? rev : fwd;
    const want = dir === 1 ? "fwd" : "rev";
    const end = dir === 1 ? target : duration - target;

    // Switching direction: line the other copy up on the same frame before showing it.
    if (activeRef.current !== want) {
      other.pause();
      await seek(video, dir === 1 ? t : duration - t);
      show(want);
    }

    video.playbackRate = p.rate;
    p.playing = true;
    setPlaying(true);
    try {
      await video.play();
    } catch {
      // Autoplay refused (e.g. data saver): fall back to a cut.
      return jump(p.to);
    }

    const tick = () => {
      if (pb.current !== p || !p.playing) return;
      video.playbackRate = p.rate;
      if (video.currentTime >= end - 0.03 || video.ended) {
        video.pause();
        settle(p.to);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [jump, settle]);

  /** One gesture = one step. */
  const step = useCallback(
    (dir: 1 | -1) => {
      if (exitedRef.current) return;
      const p = pb.current;
      if (p.playing) {
        if (dir === p.dir) {
          p.rate = Math.min(p.rate * 1.8, 4);
          return;
        }
        // Turn around: head back to the stop we just left.
        const back = p.from;
        p.from = p.to;
        p.to = back;
        run();
        return;
      }
      const next = p.to + dir;
      if (next < 0) return;
      if (next > EXIT) return;
      p.from = p.to;
      p.to = next;
      run();
    },
    [run],
  );

  // Input: wheel, touch and keyboard. The page underneath is scroll-locked.
  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rootRef.current?.focus({ preventScroll: true });
    let lastWheel = 0;
    let touchY: number | null = null;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      const fresh = now - lastWheel > GESTURE_GAP_MS;
      lastWheel = now;
      if (fresh && Math.abs(e.deltaY) > 2) step(e.deltaY > 0 ? 1 : -1);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      // Stop pull-to-refresh and rubber-banding while the intro is open.
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchY === null) return;
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      touchY = null;
      if (Math.abs(dy) > SWIPE_MIN_PX) step(dy > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("button")) {
        if (e.key === " " || e.key === "Enter") return; // let buttons handle themselves
      }
      if (["ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Escape") {
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
      cancelAnimationFrame(rafRef.current);
    };
  }, [step, exit]);

  // Pick a resolution once on the client, then load the reverse copy after the forward one.
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
    fwd.addEventListener("error", onError);
    rev.addEventListener("error", onError);
    assign(fwd, false);

    const loadReverse = () => {
      if (reduceRef.current || rev.getAttribute("src")) return;
      assign(rev, true);
    };
    fwd.addEventListener("canplaythrough", loadReverse, { once: true });
    const onWaiting = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);
    for (const v of [fwd, rev]) {
      v.addEventListener("waiting", onWaiting);
      v.addEventListener("playing", onPlaying);
    }
    return () => {
      fwd.removeEventListener("canplaythrough", loadReverse);
      fwd.removeEventListener("error", onError);
      rev.removeEventListener("error", onError);
      for (const v of [fwd, rev]) {
        v.removeEventListener("waiting", onWaiting);
        v.removeEventListener("playing", onPlaying);
      }
    };
  }, []);

  const current = stops[Math.min(stop, LAST)];
  const idle = !playing && !leaving;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Sandy Labs intro"
      className={`fixed inset-0 z-[70] overflow-hidden outline-none bg-[#0b1f27] text-sand-50 transition-opacity duration-[900ms] ease-[var(--ease-island)] ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ overscrollBehavior: "contain", touchAction: "none" } as CSSProperties}
    >
      {/* Film: two stacked copies, forward and reversed. */}
      <div className={`absolute inset-0 ${stop === 0 && idle ? "animate-intro-drift" : ""}`}>
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
      </div>

      {/* Cut-to-stop veil (reduced motion and fallbacks) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[#0b1f27] transition-opacity duration-300 ${
          flash ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Legibility */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/30" />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 sm:px-8">
        <span
          aria-hidden={stop === 0}
          className={`font-display text-xl tracking-[-0.01em] transition-opacity duration-700 sm:text-2xl ${
            stop === 0 ? "opacity-0" : "opacity-100"
          }`}
        >
          Sandy<span className="italic text-lagoon-300"> Labs</span>
        </span>
        <button
          type="button"
          onClick={exit}
          className="rounded-full border border-sand-50/40 px-4 py-2 text-xs font-semibold tracking-wide text-sand-50 transition-colors hover:border-sand-50 hover:bg-sand-50 hover:text-ink sm:text-sm"
        >
          Skip intro
        </button>
      </div>

      {/* Caption for the current stop */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-10 sm:px-8 sm:pb-14 lg:px-14">
        <div
          key={stop}
          aria-live="polite"
          className={`max-w-3xl transition-[opacity,transform] duration-700 ease-[var(--ease-island)] ${
            idle ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {stop === 0 ? (
            <p className="font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] font-light tracking-[-0.035em]">
              Sandy<span className="italic text-lagoon-100"> Labs</span>
            </p>
          ) : (
            <p className="font-display text-[clamp(1.75rem,4.2vw,3.5rem)] leading-[1.08] font-light tracking-[-0.02em] text-balance">
              {current.title}
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => step(1)}
            className={`group flex items-center gap-3 text-sm text-sand-100/85 transition-opacity duration-500 hover:text-sand-50 ${
              idle ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="relative flex h-10 w-6 justify-center rounded-full border border-sand-50/50">
              <span className="animate-intro-wheel mt-2 h-2 w-[2px] rounded-full bg-sand-50" />
            </span>
            {current.hint}
          </button>

          <ol className="flex items-center gap-2" aria-label="Intro progress">
            {stops.map((s, i) => (
              <li key={s.time}>
                <span
                  className={`block h-[3px] rounded-full transition-all duration-700 ease-[var(--ease-island)] ${
                    i === stop ? "w-8 bg-sand-50" : i < stop ? "w-3 bg-sand-50/70" : "w-3 bg-sand-50/30"
                  }`}
                />
                <span className="sr-only">
                  Part {i + 1} of {stops.length}
                  {i === stop ? " (current)" : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {waiting && playing ? (
        <div aria-hidden className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2">
          <span className="block h-full w-full animate-spin rounded-full border-2 border-sand-50/25 border-t-sand-50" />
        </div>
      ) : null}
    </div>
  );
}
