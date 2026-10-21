"use client";

import { Pencil } from "lucide-react";
import { experiences, industries, labelFor, pages, visualStyles } from "@/lib/questionnaire";
import { useBrief } from "./BriefProvider";

/** Concise, editable recap of the guided answers shown beside the composer. */
export function SelectionSummary({ onEdit }: { onEdit: (stepIndex: number) => void }) {
  const { answers } = useBrief();

  const rows: { label: string; value: string; step: number }[] = [
    { label: "Business", value: answers.businessName, step: 1 },
    {
      label: "Industry",
      value: answers.industry === "other" ? answers.industryOther : labelFor(industries, answers.industry),
      step: 0,
    },
    {
      label: "Style",
      value: answers.style === "custom" ? `Custom — ${answers.styleCustom}` : labelFor(visualStyles, answers.style),
      step: 2,
    },
    { label: "Experience", value: answers.experiences.map((id) => labelFor(experiences, id)).join(", "), step: 3 },
    { label: "Pages", value: answers.pages.map((id) => labelFor(pages, id)).join(", "), step: 4 },
  ];

  if (answers.additionalFeatures.trim()) {
    rows.push({ label: "Features", value: answers.additionalFeatures.trim(), step: 4 });
  }

  return (
    <aside aria-labelledby="summary-title" className="border border-ink/10 bg-white/60 p-5 sm:p-6">
      <h3 id="summary-title" className="eyebrow text-lagoon-700">
        Your selections
      </h3>
      <dl className="mt-4 divide-y divide-ink/8">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-4 py-3 text-sm">
            <dt className="w-24 shrink-0 text-mist">{row.label}</dt>
            <dd className="min-w-0 flex-1 break-words text-ink">{row.value || "—"}</dd>
            <button
              type="button"
              onClick={() => onEdit(row.step)}
              className="shrink-0 p-1 text-mist transition-colors hover:text-ink"
              aria-label={`Edit ${row.label.toLowerCase()}`}
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </dl>
    </aside>
  );
}
