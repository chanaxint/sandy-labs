"use client";

import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";
import { AnimatePresence, domMax, LazyMotion, m, MotionConfig } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLang } from "@/lib/i18n/lang";
import { filmStatus } from "@/lib/journey/film";
import { goToFrame } from "@/lib/journey/navigate";
import { MorningSky } from "@/components/site/MorningSky";
import { StylePreview } from "@/components/site/StylePreview";
import {
  createCopy,
  createStore,
  designStyles,
  morningFrame,
  sectors,
  sitesFor,
  siteTypes,
  type DesignStyle,
  type SiteType,
} from "@/lib/site/create";
import { holdScroll, releaseScroll } from "@/lib/site/intro";
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";

/** Seconds the night takes to turn back into morning. */
const toMorning = 3.2;
/** Opened from before the night (the menu): the film cuts to the night first, here. */
const nightFrame = 5040;
const ease = [0.22, 1, 0.36, 1] as const;

/**
 * "Create my website": the night turns back into morning and the steps open over the
 * morning sky (1. the industry, 2. the kind of website, 3. the design style). The film plays its dusk backwards by itself (the scroll position is
 * animated, scroll held), a warm dawn light rises from the horizon on the way, and the
 * story's lines and the shooting stars step aside (`create-mode`, app/globals.css).
 * There is no way back to the night from it: it stays until the menu takes the visitor
 * to a chapter of the film.
 * Once it is morning the sky drifts slowly to the right behind the steps (MorningSky).
 * GSAP owns the film run and the dawn light; Motion owns the card's and the steps' enter
 * and exit; CSS the sky's drift.
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
      // From anywhere before the night (the menu), straight to the night first: the film
      // isn't wound through in a rush.
      if (filmStatus.target < nightFrame - 300) goToFrame(nightFrame);
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
      {/* Once there, the morning sky drifts slowly to the right behind the steps. */}
      {state === "open" ? <MorningSky /> : null}
      {/* The morning's warm light rising from the horizon, over the film. */}
      <div ref={dawn} aria-hidden className="create-dawn pointer-events-none fixed inset-0 z-[15] opacity-0" />
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <AnimatePresence>{state === "open" ? <CreateSteps key="steps" /> : null}</AnimatePresence>
        </MotionConfig>
      </LazyMotion>
    </>
  );
}

/** The card, and the step in it: the answers are kept while going back and forth. */
function CreateSteps() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sector, setSector] = useState<string | null>(null);
  /** The industry written in when none of the list fits ("other"). */
  const [other, setOther] = useState("");
  const [site, setSite] = useState<SiteType | null>(null);
  const [style, setStyle] = useState<DesignStyle | null>(null);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center px-4 pt-20 pb-6 md:pt-24">
      <m.div
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
        {/* One step leaves to the side, the next comes in from the other. */}
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease }}
          >
            {step === 1 ? (
              <SectorStep
                sector={sector}
                setSector={(id) => {
                  if (id !== sector) setSite(null);
                  setSector(id);
                }}
                other={other}
                setOther={setOther}
                onNext={() => setStep(2)}
              />
            ) : step === 2 ? (
              <SiteStep
                sector={sector ?? "other"}
                site={site}
                setSite={setSite}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            ) : (
              <StyleStep style={style} setStyle={setStyle} onBack={() => setStep(2)} />
            )}
          </m.div>
        </AnimatePresence>
      </m.div>
    </div>
  );
}

/** A step's title: it slides up from behind its own edge (after the card, on the first). */
function StepTitle({ children, delay }: { children: string; delay: number }) {
  return (
    <h2 id="create-title" className="overflow-hidden pb-[0.08em] font-serif text-[1.9rem] leading-[1.08] md:text-[2.4rem]">
      <m.span className="block" initial={{ y: "105%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.85, ease, delay }}>
        {children}
      </m.span>
    </h2>
  );
}

/** Focus on the step's chosen answer, or its first, as it comes in. */
function useStepFocus() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const radios = box.current?.querySelectorAll<HTMLInputElement>("input[type=radio]");
    const chosen = radios && [...radios].find((r) => r.checked);
    (chosen ?? radios?.[0])?.focus({ preventScroll: true });
  }, []);
  return box;
}

const continueClass =
  "select-dark flex w-full items-center justify-center gap-2 rounded-full bg-snow py-3.5 font-medium text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40";

/** 1. Which industry. */
function SectorStep({
  sector,
  setSector,
  other,
  setOther,
  onNext,
}: {
  sector: string | null;
  setSector: (id: string) => void;
  other: string;
  setOther: (v: string) => void;
  onNext: () => void;
}) {
  const { lang } = useLang();
  const box = useStepFocus();
  const otherField = useRef<HTMLInputElement>(null);
  /** "Other" was picked with a click or tap (not arrowed onto with the keyboard). */
  const pointed = useRef(false);

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
    <div ref={box}>
      <StepTitle delay={0.3}>{t.title[lang]}</StepTitle>

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
            if (s.id !== "other")
              return (
                <label key={s.id} className="create-option">
                  {radio}
                  <span>{s.label[lang]}</span>
                  <CircleCheck aria-hidden className="size-[18px] shrink-0 opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={1.6} />
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
                    onKeyDown={(e) => e.key === "Enter" && ready && onNext()}
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

      <button type="button" disabled={!ready} onClick={onNext} className={`${continueClass} mt-6`}>
        {t.continue[lang]}
        <ArrowRight aria-hidden className="size-[18px]" strokeWidth={1.8} />
      </button>
    </div>
  );
}

/** 2. What kind of website: the choices that fit the industry, best first. */
function SiteStep({
  sector,
  site,
  setSite,
  onBack,
  onNext,
}: {
  sector: string;
  site: SiteType | null;
  setSite: (t: SiteType) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { lang } = useLang();
  const box = useStepFocus();
  const t = createCopy;
  const choices = sitesFor[sector] ?? sitesFor.other;
  const any = sector === "other";
  return (
    <div ref={box}>
      <StepTitle delay={0.1}>{t.siteTitle[lang]}</StepTitle>

      <fieldset className="mt-5">
        <legend className="sr-only">{t.siteTitle[lang]}</legend>
        <div className="create-types grid gap-2 sm:grid-cols-2 md:gap-2.5">
          {choices.map((c, i) => (
            <label key={c.type} className="create-option create-type">
              <input
                type="radio"
                name="site"
                value={c.type}
                checked={site === c.type}
                onChange={() => setSite(c.type)}
                className="peer sr-only"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {siteTypes[c.type].label[lang]}
                  {i === 0 && !any ? (
                    <span className="rounded-full bg-snow/15 px-2 py-0.5 text-[0.7rem] font-medium tracking-wide text-snow/90">
                      {t.recommended[lang]}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-[0.84rem] font-normal text-snow/75">{(c.about ?? siteTypes[c.type].about)[lang]}</span>
              </span>
              <CircleCheck aria-hidden className="size-[18px] shrink-0 self-start opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={1.6} />
            </label>
          ))}
        </div>
      </fieldset>

      <StepNav onBack={onBack} onNext={onNext} ready={site !== null} />
    </div>
  );
}

/** Back and Continue at the foot of a later step. */
function StepNav({ onBack, onNext, ready }: { onBack: () => void; onNext?: () => void; ready: boolean }) {
  const { lang } = useLang();
  const t = createCopy;
  return (
    <div className="mt-6 flex items-center gap-2">
      <button type="button" onClick={onBack} className="create-back flex items-center gap-1.5 rounded-full px-4 py-3.5 text-snow/85 transition-colors hover:text-snow">
        <ArrowLeft aria-hidden className="size-[18px]" strokeWidth={1.8} />
        {t.back[lang]}
      </button>
      {/* Without onNext, not connected yet: the next steps (and any backend) don't exist in this project. */}
      <button type="button" disabled={!ready} onClick={onNext} className={continueClass}>
        {t.continue[lang]}
        <ArrowRight aria-hidden className="size-[18px]" strokeWidth={1.8} />
      </button>
    </div>
  );
}

/** 3. The design style: each shown as a small moving preview, named below it. */
function StyleStep({ style, setStyle, onBack }: { style: DesignStyle | null; setStyle: (s: DesignStyle) => void; onBack: () => void }) {
  const { lang } = useLang();
  const box = useStepFocus();
  const t = createCopy;
  return (
    <div ref={box}>
      <StepTitle delay={0.1}>{t.styleTitle[lang]}</StepTitle>

      <fieldset className="mt-5">
        <legend className="sr-only">{t.styleTitle[lang]}</legend>
        <div className="create-styles grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2.5">
          {designStyles.map((d) => (
            <label key={d.id} className="create-option create-style">
              <input
                type="radio"
                name="style"
                value={d.id}
                checked={style === d.id}
                onChange={() => setStyle(d.id)}
                className="peer sr-only"
              />
              <StylePreview style={d.id} />
              <span className="flex items-center justify-between gap-2 px-1">
                <span>{d.label[lang]}</span>
                <CircleCheck
                  aria-hidden
                  className={`size-[17px] shrink-0 transition-opacity ${style === d.id ? "opacity-100" : "opacity-0"}`}
                  strokeWidth={1.6}
                />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <StepNav onBack={onBack} ready={style !== null} />
    </div>
  );
}
