"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ExampleConcept } from "@/lib/examples";
import { experiences, labelFor, pages, visualStyles } from "@/lib/questionnaire";
import { ExamplePreview } from "./ExamplePreview";

type ExampleDialogProps = {
  concept: ExampleConcept | null;
  onClose: () => void;
  onUse: (concept: ExampleConcept) => void;
};

/** Detail view for an example concept, built on the native <dialog> element. */
export function ExampleDialog({ concept, onClose, onUse }: ExampleDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (concept && !dialog.open) dialog.showModal();
    if (!concept && dialog.open) dialog.close();
  }, [concept]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="example-dialog-title"
      className="m-auto max-h-[92svh] w-[min(1080px,calc(100vw-1.5rem))] overflow-y-auto bg-sand-50 p-0 text-ink backdrop:bg-ink/55 open:animate-fade"
    >
      {concept ? (
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
            <h3 id="example-dialog-title" className="mt-4 font-display text-3xl font-light tracking-[-0.02em] sm:text-4xl">
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
      ) : null}
    </dialog>
  );
}
