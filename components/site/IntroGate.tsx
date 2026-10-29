"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SandyMark, SandyWordmark } from "@/components/brand/SandyLogo";
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

/** A frame where the first phrase is fully there (early in its hold). */
function runTo() {
  const p = storyStore.get().phrases.find((x) => x.id === firstPhrase);
  if (!p) return 360;
  const out = Number.isFinite(p.out) ? p.out : p.shown + 60;
  return Math.round(p.shown + (out - p.shown) * 0.4);
}

/**
 * The opening: the full logo over the clouds and the start button; scrolling does nothing
 * until it is pressed. Starting fades the wordmark and the button, carries the mark up to its place
 * at the top of the page (SiteHeader's) while the film plays by itself up to the first
 * phrase, then hands the scroll over, with a small scroll hint until the visitor scrolls.
 * Skipped when the page opens mid-film (a reload) or in the Studio.
 */
export function IntroGate() {
  const { lang } = useLang();
  const state = useSyncExternalStore(introStore.subscribe, introStore.get, () => "intro" as const);
  const markRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(false);

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

  // The hint goes once the visitor scrolls on (or anything else moves the page: the menu).
  useEffect(() => {
    const lenis = getLenis();
    if (!hint || !lenis) return;
    const from = lenis.scroll;
    const onScroll = () => Math.abs(lenis.scroll - from) > hintGone && setHint(false);
    return lenis.on("scroll", onScroll);
  }, [hint]);

  if (state === "done") return <ScrollHint shown={hint} label={copy.scroll[lang]} />;

  return (
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
