"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ExampleConcept } from "@/lib/examples";
import { emptyAnswers, type BriefAnswers } from "@/lib/questionnaire";
import type { WebsiteBrief } from "@/lib/brief";

type BriefContextValue = {
  answers: BriefAnswers;
  update: <K extends keyof BriefAnswers>(key: K, value: BriefAnswers[K]) => void;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  brief: WebsiteBrief | null;
  setBrief: (brief: WebsiteBrief | null) => void;
  /** Pre-fills industry, style, experiences and pages from an example concept. */
  applyConcept: (concept: ExampleConcept) => void;
  /** The concept most recently applied, so the questionnaire can acknowledge it. */
  appliedConcept: ExampleConcept | null;
  reset: () => void;
};

const BriefContext = createContext<BriefContextValue | null>(null);

/**
 * Holds questionnaire answers for the whole homepage so they persist while
 * moving between steps, and so other sections (e.g. example concepts) can
 * seed a new brief.
 */
export function BriefProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<BriefAnswers>(emptyAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [brief, setBrief] = useState<WebsiteBrief | null>(null);
  const [appliedConcept, setAppliedConcept] = useState<ExampleConcept | null>(null);

  const update = useCallback(<K extends keyof BriefAnswers>(key: K, value: BriefAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyConcept = useCallback((concept: ExampleConcept) => {
    setAnswers((prev) => ({
      ...prev,
      industry: concept.preset.industry,
      style: concept.preset.style,
      experiences: [...concept.preset.experiences],
      pages: [...concept.preset.pages],
    }));
    setAppliedConcept(concept);
    setBrief(null);
    setStepIndex(0);
  }, []);

  const reset = useCallback(() => {
    setAnswers(emptyAnswers);
    setBrief(null);
    setAppliedConcept(null);
    setStepIndex(0);
  }, []);

  const value = useMemo(
    () => ({ answers, update, stepIndex, setStepIndex, brief, setBrief, applyConcept, appliedConcept, reset }),
    [answers, update, stepIndex, brief, applyConcept, appliedConcept, reset],
  );

  return <BriefContext.Provider value={value}>{children}</BriefContext.Provider>;
}

export function useBrief() {
  const ctx = useContext(BriefContext);
  if (!ctx) throw new Error("useBrief must be used inside <BriefProvider>");
  return ctx;
}
