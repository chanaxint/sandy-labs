"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef } from "react";
import type { ExampleConcept } from "@/lib/examples";
import { experiences, labelFor, pages, visualStyles } from "@/lib/questionnaire";
import { ExamplePreview } from "./ExamplePreview";

type ExampleDialogProps = {
  concept: ExampleConcept | null;
  onClose: () => void;
  onUse: (concept: ExampleConcept) => void;
  /** Called once the exit animation has finished and the dialog is closed. */
  onExited?: () => void;
};

/**
 * Detail view for an example concept, built on the native <dialog> element
 * (focus trapping, Escape, top layer). The dialog stays open while Motion
 * plays the exit animation, then closes.
 */
export function ExampleDialog({ concept, onClose, onUse, onExited }: ExampleDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (concept && dialog && !dialog.open) dialog.showModal();
  }, [concept]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // Escape: run the exit animation instead of closing instantly.
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="example-dialog-title"
      className="m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <AnimatePresence
        onExitComplete={() => {
          ref.current?.close();
          onExited?.();
        }}
      >
        {concept ? (
          <div key="dialog" className="fixed inset-0 flex items-center justify-center p-3">
            <m.div
              aria-hidden
              onClick={onClose}
              className="absolute inset-0 bg-ink/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            />
            <m.div
              className="relative max-h-[92svh] w-[min(1080px,100%)] overflow-y-auto bg-sand-50"
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.25 } }}
            >
              <div className="grid lg:grid-cols-[1.25fr_1fr]">
                <div className="bg-sand-100 p-4 sm:p-8">
                  <ExamplePreview concept={concept} large />
                  <p className="mt-4 text-xs leading-relaxed text-mist">
                    Illustrative design concept by Sandy Labs. Not a client project or a live website.
                  </p>
                </div>
                <div className="relative flex flex-col p-6 sm:p-10">
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-ink transition-colors hover:bg-sand-200"
                    aria-label="Close concept details"
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                  <p className="eyebrow pr-12 text-lagoon-700">{concept.category} · Concept</p>
                  <h3
                    id="example-dialog-title"
                    className="mt-4 font-display text-3xl font-light tracking-[-0.02em] sm:text-4xl"
                  >
                    {concept.title}
                  </h3>
                  <p className="mt-4 leading-relaxed text-ink-soft">{concept.description}</p>

                  <ul className="mt-6 space-y-2.5">
                    {concept.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-3 text-sm">
                        <Check aria-hidden className="h-4 w-4 text-lagoon-700" />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-8 grid gap-3 border-t border-ink/10 pt-6 text-sm">
                    <div className="flex gap-4">
                      <dt className="w-24 shrink-0 text-mist">Style</dt>
                      <dd>{labelFor(visualStyles, concept.preset.style)}</dd>
                    </div>
                    <div className="flex gap-4">
                      <dt className="w-24 shrink-0 text-mist">Experience</dt>
                      <dd>{concept.preset.experiences.map((e) => labelFor(experiences, e)).join(", ")}</dd>
                    </div>
                    <div className="flex gap-4">
                      <dt className="w-24 shrink-0 text-mist">Pages</dt>
                      <dd>{concept.preset.pages.map((p) => labelFor(pages, p)).join(", ")}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap gap-3 pt-10">
                    <button
                      type="button"
                      onClick={() => onUse(concept)}
                      className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-sand-50 transition-colors hover:bg-lagoon-900"
                    >
                      Start a brief from this concept
                      <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full px-5 py-3.5 text-sm font-semibold text-ink hover:text-lagoon-700"
                    >
                      Keep exploring
                    </button>
                  </div>
                </div>
              </div>
            </m.div>
          </div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
