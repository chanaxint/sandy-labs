"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import { AnimatePresence, domMax, LazyMotion, m, MotionConfig } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLang } from "@/lib/i18n/lang";
import { goToFrame } from "@/lib/journey/navigate";
import { createCopy, createStore, morningFrame, sectors } from "@/lib/site/create";
import { holdScroll, releaseScroll } from "@/lib/site/intro";
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";

/** Seconds the night takes to turn back into morning. */
const toMorning = 3.2;
const ease = [0.22, 1, 0.36, 1] as const;

/**
 * "Create my website": the night turns back into morning and the first step opens over
 * the morning sky. The film plays its dusk backwards by itself (the scroll position is
 * animated, scroll held), a warm dawn light rises from the horizon on the way, and the
 * story's lines and the shooting stars step aside (`create-mode`, app/globals.css).
 * There is no way back to the night from it: it stays until the menu takes the visitor
 * to a chapter of the film.
 * GSAP owns the film run and the dawn light; Motion owns the step's enter and exit.
 */
export function CreateFlow() {
  const state = useSyncExternalStore(createStore.subscribe, createStore.get, () => "closed" as const);
  const dawn = useRef<HTMLDivElement>(null);
  /** Where focus goes back to when the menu leaves it (the call to action pressed). */
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const reduce = prefersReducedMotion();
    if (state === "opening") {
      opener.current = document.activeElement as HTMLElement | null;
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
    } else if (state === "closed") {
      // Left through the menu (it jumps to a chapter): the story is back.
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
  /** The industry written in when none of the list fits ("other"). */
  const [other, setOther] = useState("");
  const card = useRef<HTMLDivElement>(null);
  const otherField = useRef<HTMLInputElement>(null);
  /** "Other" was picked with a click or tap (not arrowed onto with the keyboard). */
  const pointed = useRef(false);

  useEffect(() => {
    card.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, []);

  // "Other" picked with a click or tap: straight into its field (arrowing through the
  // choices with the keyboard stays on them; Tab goes on to it).
  // (Once the click is over: the label's own click would take focus back to the choice.)
  useEffect(() => {
    const go = sector === "other" && pointed.current;
    pointed.current = false;
    if (!go) return;
    const later = gsap.delayedCall(0.01, () => otherField.current?.focus());
    return () => void later.kill();
  }, [sector]);

  const t = createCopy;
  const ready = sector !== null && (sector !== "other" || other.trim() !== "");
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
        {/* The title opens just after the card: it slides up from behind its own edge. */}
        <h2 id="create-title" className="overflow-hidden pb-[0.08em] font-serif text-[1.9rem] leading-[1.08] md:text-[2.4rem]">
          <m.span
            className="block"
            initial={{ y: "105%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.85, ease, delay: 0.3 }}
          >
            {t.title[lang]}
          </m.span>
        </h2>

        <fieldset className="mt-6">
          <legend className="mb-4 text-[1.02rem] text-snow/90">{t.question[lang]}</legend>
          <div className="grid grid-cols-2 gap-2 md:gap-2.5">
            {sectors.map((s) => {
              const radio = (
                <input
                  type="radio"
                  name="sector"
                  value={s.id}
                  checked={sector === s.id}
                  onChange={() => setSector(s.id)}
                  className="peer sr-only"
                />
              );
              const check = (
                <CircleCheck aria-hidden className="size-[18px] shrink-0 opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={1.6} />
              );
              if (s.id !== "other")
                return (
                  <label key={s.id} className="create-option">
                    {radio}
                    <span>{s.label[lang]}</span>
                    {check}
                  </label>
                );
              // "Other": once chosen, a small field opens in the box's own free space to
              // write the industry in. The whole box picks it.
              return (
                <div
                  key={s.id}
                  className="create-option create-option-other"
                  onPointerDown={(e) => {
                    pointed.current = true;
                    if (!(e.target as HTMLElement).closest("label, input")) setSector("other");
                  }}
                >
                  <label className="flex shrink-0 cursor-pointer items-center">
                    {radio}
                    <span>{s.label[lang]}</span>
                  </label>
                  {sector === "other" ? (
                    <input
                      ref={otherField}
                      type="text"
                      name="sector-other"
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                      aria-label={t.otherLabel[lang]}
                      placeholder={t.otherPlaceholder[lang]}
                      maxLength={60}
                      autoComplete="off"
                      className="create-inline-input"
                    />
                  ) : (
                    <span className="flex-1" />
                  )}
                  <CircleCheck
                    aria-hidden
                    className={`size-[18px] shrink-0 transition-opacity ${sector === "other" ? "opacity-100" : "opacity-0"}`}
                    strokeWidth={1.6}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>

        {/* Not connected yet: the next steps (and any backend) don't exist in this project. */}
        <button
          type="button"
          disabled={!ready}
          className="select-dark mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-snow py-3.5 font-medium text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.continue[lang]}
          <ArrowRight aria-hidden className="size-[18px]" strokeWidth={1.8} />
        </button>
      </m.div>
    </div>
  );
}
