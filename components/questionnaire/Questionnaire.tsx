"use client";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { AnimatePresence, m, type Variants } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { buildBrief } from "@/lib/brief";
import { sectionIds } from "@/lib/navigation";
import { createNote, steps, validateStep, type StepErrors } from "@/lib/questionnaire";
import { Reveal } from "../ui/Reveal";
import { BriefConfirmation } from "./BriefConfirmation";
import { useBrief } from "./BriefProvider";
import { Composer } from "./Composer";
import { ProgressIndicator } from "./ProgressIndicator";
import { SelectionSummary } from "./SelectionSummary";
import { BusinessStep, ExperienceStep, IndustryStep, PagesStep, StyleStep } from "./Steps";

const LAST_GUIDED = steps.length - 2;
const DETAILS = steps.length - 1;

// Steps glide in from the direction of travel and out the opposite way.
const stepVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -32, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }),
};

const panelVariants: Variants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

export function Questionnaire() {
  const { answers, update, stepIndex, setStepIndex, brief, setBrief, reset, appliedConcept } = useBrief();
  const [errors, setErrors] = useState<StepErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [reached, setReached] = useState(0);
  const [draft, setDraft] = useState("");
  const [direction, setDirection] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);

  // The incoming step mounts after the outgoing one has animated away, so
  // focus its heading on mount rather than straight after navigation.
  const headingRef = useCallback((node: HTMLHeadingElement | null) => {
    if (node && pendingFocus.current) {
      pendingFocus.current = false;
      node.focus({ preventScroll: true });
    }
  }, []);

  const step = steps[stepIndex];
  // Once the user has tried to continue, keep errors live as they edit.
  const liveErrors = attempted ? validateStep(step.id, answers) : errors;
  const furthest = Math.max(reached, stepIndex);

  const bringIntoView = () => {
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const top = panel.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.4) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: window.scrollY + top - 96, behavior: reduce ? "auto" : "smooth" });
      }
    });
  };

  const goTo = (index: number) => {
    pendingFocus.current = true;
    setDirection(index >= stepIndex ? 1 : -1);
    setErrors({});
    setAttempted(false);
    setStepIndex(index);
    setReached((r) => Math.max(r, index));
    bringIntoView();
  };

  const focusFirstError = (errs: StepErrors) => {
    requestAnimationFrame(() => {
      const key = Object.keys(errs)[0];
      if (!key) return;
      const el =
        document.getElementById(key) ?? panelRef.current?.querySelector<HTMLElement>(`input[name="${key}"]`) ?? null;
      el?.focus();
    });
  };

  const next = () => {
    const errs = validateStep(step.id, answers);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setAttempted(true);
      focusFirstError(errs);
      return;
    }
    goTo(stepIndex + 1);
  };

  const back = () => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  };

  /** Jump to a step only if every step before it is valid. */
  const jump = (index: number) => {
    for (let i = 0; i < index; i++) {
      const errs = validateStep(steps[i].id, answers);
      if (Object.keys(errs).length) {
        goTo(i);
        setErrors(errs);
        setAttempted(true);
        return;
      }
    }
    goTo(index);
  };

  const createBrief = () => {
    for (let i = 0; i <= LAST_GUIDED; i++) {
      const errs = validateStep(steps[i].id, answers);
      if (Object.keys(errs).length) {
        goTo(i);
        setErrors(errs);
        setAttempted(true);
        return;
      }
    }
    // Include an unsent draft so nothing typed is lost.
    const pending = draft.trim();
    const finalAnswers = pending ? { ...answers, notes: [...answers.notes, createNote(pending)] } : answers;
    if (pending) {
      update("notes", finalAnswers.notes);
      setDraft("");
    }
    setDirection(1);
    setBrief(buildBrief(finalAnswers));
    bringIntoView();
  };

  const startOver = () => {
    reset();
    setDraft("");
    setReached(0);
    setErrors({});
    setAttempted(false);
    bringIntoView();
  };

  const renderStep = () => {
    switch (step.id) {
      case "industry":
        return <IndustryStep errors={liveErrors} />;
      case "business":
        return <BusinessStep errors={liveErrors} />;
      case "style":
        return <StyleStep errors={liveErrors} />;
      case "experience":
        return <ExperienceStep errors={liveErrors} />;
      case "pages":
        return <PagesStep errors={liveErrors} />;
      case "details":
        return (
          <div className="grid gap-10">
            <Composer draft={draft} onDraftChange={setDraft} />
            <div className="mx-auto w-full max-w-3xl">
              <SelectionSummary onEdit={jump} />
            </div>
          </div>
        );
    }
  };

  return (
    <section id={sectionIds.create} aria-labelledby="create-title" className="relative bg-sand-100 py-24 sm:py-32">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-20">
          {/* Intro + progress */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <p className="eyebrow text-lagoon-700">The website brief</p>
              <h2
                id="create-title"
                className="mt-5 font-display text-4xl leading-[1.05] font-light tracking-[-0.02em] text-balance sm:text-5xl"
              >
                Chart your island, <span className="italic">step by step.</span>
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                Six short steps turn your idea into a clear, structured brief. Your answers stay put as you move back
                and forth.
              </p>
            </Reveal>
            {!brief ? (
              <div className="mt-10">
                <ProgressIndicator current={stepIndex} reached={furthest} onSelect={jump} />
              </div>
            ) : null}
          </div>

          {/* Panel */}
          <div
            ref={panelRef}
            className="min-w-0 scroll-mt-28 overflow-hidden border border-ink/10 bg-sand-50 p-5 sm:p-10 lg:p-12"
          >
            <AnimatePresence mode="wait" initial={false}>
              {brief ? (
                <m.div key="brief" variants={panelVariants} initial="enter" animate="center" exit="exit">
                  <BriefConfirmation
                    brief={brief}
                    onEdit={() => {
                      setBrief(null);
                      goTo(DETAILS);
                    }}
                    onStartOver={startOver}
                  />
                </m.div>
              ) : (
                <m.div key="form" variants={panelVariants} initial="enter" animate="center" exit="exit">
                  {appliedConcept && stepIndex === 0 ? (
                    <p className="animate-fade mb-8 flex items-start gap-3 bg-lagoon-100/70 p-4 text-sm leading-relaxed text-lagoon-900">
                      <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Started from the <strong className="font-semibold">{appliedConcept.title}</strong> concept.
                        We&apos;ve pre-selected its industry, style, experience and pages — change anything you like.
                      </span>
                    </p>
                  ) : null}

                  <AnimatePresence mode="wait" initial={false} custom={direction}>
                    <m.div
                      key={step.id}
                      custom={direction}
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <p className="eyebrow text-mist">
                        Step {stepIndex + 1} <span aria-hidden>·</span> {step.label}
                      </p>
                      <h3
                        ref={headingRef}
                        tabIndex={-1}
                        className="mt-4 font-display text-3xl leading-tight font-light tracking-[-0.02em] text-ink focus:outline-none sm:text-4xl"
                      >
                        {step.title}
                      </h3>
                      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{step.lead}</p>
                      <div className="mt-9">{renderStep()}</div>
                    </m.div>
                  </AnimatePresence>

                  <div className="mt-12 flex flex-col-reverse gap-4 border-t border-ink/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={back}
                      disabled={stepIndex === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:text-lagoon-700 disabled:opacity-35 disabled:hover:text-ink"
                    >
                      <ArrowLeft aria-hidden className="h-4 w-4" />
                      Back
                    </button>
                    {stepIndex < DETAILS ? (
                      <button
                        type="button"
                        onClick={next}
                        className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-sand-50 transition-colors hover:bg-lagoon-900"
                      >
                        Continue
                        <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={createBrief}
                        className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-lagoon-700 px-7 py-4 text-sm font-semibold text-sand-50 transition-colors hover:bg-lagoon-900"
                      >
                        Create my website brief
                        <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    )}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
