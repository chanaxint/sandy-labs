"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { SandyMark, SandyWordmark } from "@/components/brand/SandyLogo";
import { useLang } from "@/lib/i18n/lang";
import { goToFrame } from "@/lib/journey/navigate";
import { copy } from "@/lib/site/copy";
import { holdScroll, introStore, releaseScroll } from "@/lib/site/intro";
import { getLenis, gsap, prefersReducedMotion } from "@/lib/scroll/engine";

/** Where the film glides to by itself once the journey starts (the cloud dive begins ~320). */
const glideTo = 210;
/** Keys that would scroll: they start the journey too. */
const scrollKeys = new Set(["ArrowDown", "PageDown", " ", "End", "Spacebar"]);

/**
 * The opening: the full logo over the clouds and the start button. Starting (the button,
 * or a first scroll) fades the wordmark and the button, carries the mark up to its place
 * at the top of the page (SiteHeader's), then lets the film glide into the journey and
 * hands the scroll over. Skipped when the page opens mid-film (a reload) or in the Studio.
 */
export function IntroGate() {
  const { lang } = useLang();
  const state = useSyncExternalStore(introStore.subscribe, introStore.get, () => "intro" as const);
  const markRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const start = useRef(() => {});
  const startJourney = () => {
    if (introStore.get() !== "intro") return;
    introStore.set("leaving");
    const reduce = prefersReducedMotion();
    const slot = document.querySelector<HTMLElement>("[data-header-mark]");
    const mark = markRef.current;
    const finish = () => {
      introStore.set("done");
      releaseScroll();
      if (!reduce) goToFrame(glideTo, 2.6);
    };
    if (!slot || !mark || reduce) {
      gsap.to(rootRef.current, { autoAlpha: 0, duration: 0.5, ease: "power1.inOut", onComplete: finish });
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
    // The header's mark takes over as this one arrives.
    tl.to(mark, { autoAlpha: 0, duration: 0.25, ease: "none" }, 1.3);
  };

  useLayoutEffect(() => {
    start.current = startJourney;
  });

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

    // A first scroll starts it too.
    const onWheel = (e: WheelEvent) => e.deltaY > 0 && start.current();
    const onTouch = () => start.current();
    const onKey = (e: KeyboardEvent) => {
      if (!scrollKeys.has(e.key) || (e.target as HTMLElement).closest("button, a, input, textarea")) return;
      e.preventDefault();
      start.current();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      gsap.ticker.remove(hold);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (state === "done") return null;

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
        <button ref={buttonRef} type="button" onClick={() => start.current()} className="intro-start pointer-events-auto whitespace-nowrap">
          {copy.start[lang]}
        </button>
      </div>
    </div>
  );
}
