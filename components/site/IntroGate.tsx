"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { SandyMark, SandyWordmark } from "@/components/brand/SandyLogo";
import { IntroClouds } from "@/components/site/IntroClouds";
import { useLang } from "@/lib/i18n/lang";
import { goToFrame } from "@/lib/journey/navigate";
import { storyStore } from "@/lib/journey/storyStore";
import { copy } from "@/lib/site/copy";
import { holdScroll, introStore, releaseScroll } from "@/lib/site/intro";
import { getLenis, gsap, prefersReducedMotion } from "@/lib/scroll/engine";

/** The film plays by itself up to this phrase (the first of the story), then the scroll takes over. */
const firstPhrase = "island-1";
/** How long that opening run lasts (s): quick, straight into the story. */
const runSeconds = 2.4;
/** Scrolled this far (px) from where the run stopped: the scroll hint goes. */
const hintGone = 24;
/** Back at the very top this long (ms) before scrolling further up returns to the opening. */
const topRest = 400;
/** A wheel event this long (ms) after the last one starts a new gesture (a trackpad's momentum streams without such gaps). */
const wheelGap = 250;
/** Keys that scroll up: at the top they return to the opening. */
const upKeys = new Set(["ArrowUp", "PageUp", "Home"]);

/** A frame where the first phrase is fully there (early in its hold). */
function runTo() {
  const p = storyStore.get().phrases.find((x) => x.id === firstPhrase);
  if (!p) return 360;
  const out = Number.isFinite(p.out) ? p.out : p.shown + 60;
  return Math.round(p.shown + (out - p.shown) * 0.4);
}

/**
 * The opening: the full logo over the clouds (drifting slowly left, and going down with
 * the camera once started: IntroClouds) and the start button; scrolling does nothing
 * until it is pressed. Starting fades the wordmark and the button, carries the mark up to its place
 * at the top of the page (SiteHeader's) while the film plays by itself up to the first
 * phrase, then hands the scroll over, with a small scroll hint until the visitor scrolls.
 * Scrolling further up from the very start of the film brings the opening back (the mark
 * comes down from the header). Skipped when the page opens mid-film (a reload) or in the
 * Studio.
 */
export function IntroGate() {
  const { lang } = useLang();
  const state = useSyncExternalStore(introStore.subscribe, introStore.get, () => "intro" as const);
  const markRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** The drifting clouds are on screen (until the camera has gone down into them). */
  const [clouds, setClouds] = useState(true);
  const cloudsGone = useCallback(() => setClouds(false), []);
  const [hint, setHint] = useState(false);
  /** The opening is coming back (scrolled up past the start): it animates in. */
  const returning = useRef(false);

  const startJourney = () => {
    if (introStore.get() !== "intro") return;
    introStore.set("leaving");
    const reduce = prefersReducedMotion();
    const slot = document.querySelector<HTMLElement>("[data-header-mark]");
    const mark = markRef.current;
    // The film runs to the first phrase while the mark travels; the scroll stays held
    // (Lenis' `force`) until both are over.
    let ran = false;
    const handOver = () => {
      if (!ran || introStore.get() !== "done") return;
      releaseScroll();
      setHint(true);
    };
    const run = () =>
      goToFrame(runTo(), reduce ? undefined : runSeconds, () => {
        ran = true;
        handOver();
      });
    const finish = () => {
      introStore.set("done");
      handOver();
    };
    if (!slot || !mark || reduce) {
      gsap.to(rootRef.current, {
        autoAlpha: 0,
        duration: 0.5,
        ease: "power1.inOut",
        onComplete: () => {
          finish();
          run();
        },
      });
      return;
    }
    // Carry the mark onto the header's: same centre, same height.
    const from = mark.getBoundingClientRect();
    const to = slot.getBoundingClientRect();
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(buttonRef.current, { autoAlpha: 0, y: 14, duration: 0.45, ease: "power2.in" }, 0);
    tl.to(wordRef.current, { autoAlpha: 0, y: -10, filter: "blur(6px)", duration: 0.6, ease: "power2.in" }, 0.05);
    tl.to(
      mark,
      {
        x: to.left + to.width / 2 - (from.left + from.width / 2),
        y: to.top + to.height / 2 - (from.top + from.height / 2),
        scale: to.height / from.height,
        duration: 1.35,
        ease: "power3.inOut",
      },
      0.15,
    );
    tl.call(run, undefined, 0.35);
    // The header's mark takes over as this one arrives.
    tl.to(mark, { autoAlpha: 0, duration: 0.25, ease: "none" }, 1.3);
  };

  useEffect(() => {
    // Opened mid-film (a restored position, a link to a place) or in the Studio: no opening.
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(`scroll:${location.pathname}`)) || 0;
    } catch {
      saved = 0;
    }
    if (new URLSearchParams(location.search).has("studio") || saved > 40 || location.hash || window.scrollY > 40) {
      introStore.set("done");
      return;
    }

    // Hold the scroll until the journey starts (the engine may start after this effect).
    const hold = () => {
      if (introStore.get() !== "intro") return gsap.ticker.remove(hold);
      if (!getLenis()) return;
      holdScroll();
      gsap.ticker.remove(hold);
    };
    gsap.ticker.add(hold);

    return () => gsap.ticker.remove(hold);
  }, []);

  // Back at the very top, scrolling further up returns to the opening.
  useEffect(() => {
    if (new URLSearchParams(location.search).has("studio")) return;
    let topSince = 0;
    let lastWheel = 0;
    let touchY: number | null = null;
    const atRest = () => {
      const lenis = getLenis();
      return (
        !!lenis &&
        introStore.get() === "done" &&
        !document.documentElement.classList.contains("scroll-held") &&
        lenis.scroll <= 1 &&
        topSince > 0 &&
        performance.now() - topSince > topRest
      );
    };
    const back = () => {
      returning.current = true;
      setHint(false);
      setClouds(true);
      getLenis()?.scrollTo(0, { immediate: true, force: true });
      holdScroll();
      introStore.set("intro");
    };
    const track = () => {
      const lenis = getLenis();
      if (!lenis) return;
      if (lenis.scroll > 1) topSince = 0;
      else if (!topSince) topSince = performance.now();
    };
    gsap.ticker.add(track);
    const inMenu = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.("#site-menu");
    // Only a new gesture made while resting at the top, never the momentum of the scroll
    // that brought the page there.
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      const fresh = now - lastWheel > wheelGap;
      lastWheel = now;
      if (e.deltaY < 0 && fresh && !inMenu(e) && atRest()) back();
    };
    const onTouchStart = (e: TouchEvent) => (touchY = atRest() ? (e.touches[0]?.clientY ?? null) : null);
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (touchY === null || y === undefined || y - touchY < 40 || inMenu(e) || !atRest()) return;
      touchY = null;
      back();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!upKeys.has(e.key) || (e.target as HTMLElement).closest("input, textarea") || !atRest()) return;
      back();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      gsap.ticker.remove(track);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Coming back: the mark comes down from the header's place, then the wordmark and the button.
  useLayoutEffect(() => {
    if (state !== "intro" || !returning.current) return;
    returning.current = false;
    const mark = markRef.current;
    const slot = document.querySelector<HTMLElement>("[data-header-mark]");
    if (prefersReducedMotion() || !mark || !slot) {
      gsap.from(rootRef.current, { autoAlpha: 0, duration: 0.5, ease: "power1.inOut" });
      return;
    }
    const at = mark.getBoundingClientRect();
    const from = slot.getBoundingClientRect();
    const tl = gsap.timeline();
    tl.from(mark, {
      x: from.left + from.width / 2 - (at.left + at.width / 2),
      y: from.top + from.height / 2 - (at.top + at.height / 2),
      scale: from.height / at.height,
      duration: 1.2,
      ease: "power3.inOut",
    });
    tl.from(wordRef.current, { autoAlpha: 0, y: -10, filter: "blur(6px)", duration: 0.6, ease: "power2.out" }, 0.75);
    tl.from(buttonRef.current, { autoAlpha: 0, y: 14, duration: 0.5, ease: "power2.out" }, 0.9);
    return () => void tl.kill();
  }, [state]);

  // The hint goes once the visitor scrolls on (or anything else moves the page: the menu).
  useEffect(() => {
    const lenis = getLenis();
    if (!hint || !lenis) return;
    const from = lenis.scroll;
    const onScroll = () => Math.abs(lenis.scroll - from) > hintGone && setHint(false);
    return lenis.on("scroll", onScroll);
  }, [hint]);

  const drift = clouds ? <IntroClouds leaving={state !== "intro"} onGone={cloudsGone} /> : null;
  if (state === "done")
    return (
      <>
        {drift}
        <ScrollHint shown={hint} label={copy.scroll[lang]} />
      </>
    );

  return (
    <>
      {drift}
      <div ref={rootRef} className="pointer-events-none fixed inset-0 z-20 text-snow [--mh:clamp(92px,15vh,150px)]">
        <div className="absolute top-[33vh] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div ref={markRef} className="brand-shadow">
            <SandyMark className="block h-(--mh) w-auto" />
          </div>
          <div ref={wordRef} className="brand-shadow mt-[calc(var(--mh)*0.13)]">
            <SandyWordmark className="block w-[calc(var(--mh)*2)]" title="Sandy Labs" />
          </div>
        </div>
        <div className="absolute bottom-[max(10vh,4.5rem)] left-1/2 -translate-x-1/2">
          <button ref={buttonRef} type="button" onClick={startJourney} className="intro-start pointer-events-auto whitespace-nowrap">
            {copy.start[lang]}
          </button>
        </div>
      </div>
    </>
  );
}

/** A small "Scroll" with a line below it, at the bottom centre (dark: it stands over the white cloud). */
function ScrollHint({ shown, label }: { shown: boolean; label: string }) {
  return (
    <div
      aria-hidden={!shown}
      className={`scroll-hint pointer-events-none fixed bottom-[max(4.5vh,1.75rem)] left-1/2 z-20 -translate-x-1/2 text-ink ${shown ? "is-shown" : ""}`}
    >
      <span>{label}</span>
      <i />
    </div>
  );
}
