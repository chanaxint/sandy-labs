"use client";

import { ArrowRight, CircleCheck, X } from "lucide-react";
import { AnimatePresence, domMax, LazyMotion, m, MotionConfig } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLang } from "@/lib/i18n/lang";
import { filmStatus } from "@/lib/journey/film";
import { goToFrame } from "@/lib/journey/navigate";
import { closeCreate, createCopy, createSteps, createStore, morningFrame, sectors } from "@/lib/site/create";
import { holdScroll, releaseScroll } from "@/lib/site/intro";
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";

/** Seconds the night takes to turn back into morning (and back again on closing). */
const toMorning = 3.2;
const toNight = 2.4;
const ease = [0.22, 1, 0.36, 1] as const;

/**
 * "Create my website": the night turns back into morning and the first step opens over
 * the morning sky. The film plays its dusk backwards by itself (the scroll position is
 * animated, scroll held), a warm dawn light rises from the horizon on the way, and the
 * story's lines and the shooting stars step aside (`create-mode`, app/globals.css).
 * Closing ("Back to the story", Escape) plays it forward to where the visitor was.
 * GSAP owns the film run and the dawn light; Motion owns the step's enter and exit.
 */
export function CreateFlow() {
  const state = useSyncExternalStore(createStore.subscribe, createStore.get, () => "closed" as const);
  const dawn = useRef<HTMLDivElement>(null);
  /** The film frame the visitor was on, to go back to. */
  const back = useRef(0);
  /** Where focus goes back to on closing (the call to action pressed). */
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const reduce = prefersReducedMotion();
    if (state === "opening") {
      opener.current = document.activeElement as HTMLElement | null;
      back.current = filmStatus.target;
      html.classList.add("create-mode");
      holdScroll();
      gsap.killTweensOf(dawn.current);
      if (reduce) gsap.to(dawn.current, { opacity: 0.35, duration: 0.4 });
      else
        gsap
          .timeline()
          .to(dawn.current, { opacity: 0.8, duration: toMorning * 0.5, ease: "sine.inOut" })
          .to(dawn.current, { opacity: 0.35, duration: toMorning * 0.5, ease: "sine.inOut" });
      goToFrame(morningFrame, reduce ? undefined : toMorning, () => {
        if (createStore.get() === "opening") createStore.set("open");
      });
    } else if (state === "closing") {
      gsap.killTweensOf(dawn.current);
      gsap.to(dawn.current, { opacity: 0, duration: reduce ? 0.3 : toNight * 0.8, ease: "sine.inOut" });
      goToFrame(back.current, reduce ? undefined : toNight, () => {
        if (createStore.get() === "closing") createStore.set("closed");
      });
    } else if (state === "closed") {
      // Done, or left another way (the menu jumps to a chapter): the story is back.
      gsap.killTweensOf(dawn.current);
      gsap.set(dawn.current, { opacity: 0 });
      if (html.classList.contains("create-mode")) {
        html.classList.remove("create-mode");
        releaseScroll();
        opener.current?.focus?.({ preventScroll: true });
        opener.current = null;
      }
    }
  }, [state]);

  return (
    <>
      {/* The morning's warm light rising from the horizon, over the film. */}
      <div ref={dawn} aria-hidden className="create-dawn pointer-events-none fixed inset-0 z-[15] opacity-0" />
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <AnimatePresence>{state === "open" ? <CreateStep key="step" /> : null}</AnimatePresence>
        </MotionConfig>
      </LazyMotion>
    </>
  );
}

/** The first step: which industry. */
function CreateStep() {
  const { lang } = useLang();
  const [sector, setSector] = useState<string | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    card.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCreate();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const n = 1;
  const t = createCopy;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center px-4 pt-20 pb-6 md:pt-24">
      <m.div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
        data-lenis-prevent
        className="create-card max-h-full w-full max-w-[44rem] overflow-y-auto rounded-[1.75rem] p-5 text-snow md:p-9"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.6, ease }}
      >
        <div className="flex items-center gap-3">
          <p className="text-[0.72rem] font-medium tracking-[0.14em] text-snow/70 uppercase">{t.eyebrow[lang]}</p>
          <p className="ml-auto rounded-full bg-snow/10 px-3 py-1 text-xs font-medium text-snow/90">
            {t.step[lang].replace("{n}", String(n)).replace("{total}", String(createSteps))}
          </p>
          <button
            type="button"
            onClick={closeCreate}
            aria-label={t.close[lang]}
            className="create-close -mr-1.5 grid size-9 place-items-center rounded-full text-snow/70 transition-colors hover:bg-snow/10 hover:text-snow"
          >
            <X className="size-[18px]" strokeWidth={1.6} />
          </button>
        </div>
        <div aria-hidden className="mt-4 h-px w-full bg-snow/12">
          <div className="h-px bg-snow" style={{ width: `${(n / createSteps) * 100}%` }} />
        </div>

        <h2 id="create-title" className="mt-7 font-serif text-[1.9rem] leading-[1.08] md:text-[2.4rem]">
          {t.title[lang]}
        </h2>

        <fieldset className="mt-6">
          <legend className="mb-4 text-[1.02rem] text-snow/80">{t.question[lang]}</legend>
          <div className="grid grid-cols-2 gap-2 md:gap-2.5">
            {sectors.map((s) => (
              <label key={s.id} className="create-option">
                <input
                  type="radio"
                  name="sector"
                  value={s.id}
                  checked={sector === s.id}
                  onChange={() => setSector(s.id)}
                  className="peer sr-only"
                />
                <span>{s.label[lang]}</span>
                <CircleCheck aria-hidden className="size-[18px] opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={1.6} />
              </label>
            ))}
          </div>
        </fieldset>

        {/* Not connected yet: the next steps (and any backend) don't exist in this project. */}
        <button
          type="button"
          disabled={!sector}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-snow py-3.5 font-medium text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.continue[lang]}
          <ArrowRight aria-hidden className="size-[18px]" strokeWidth={1.8} />
        </button>
      </m.div>
    </div>
  );
}
