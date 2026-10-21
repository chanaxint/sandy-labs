import { Check } from "lucide-react";
import { steps } from "@/lib/questionnaire";

type ProgressIndicatorProps = {
  current: number;
  /** Highest step index the user has reached; earlier steps are clickable. */
  reached: number;
  onSelect: (index: number) => void;
};

export function ProgressIndicator({ current, reached, onSelect }: ProgressIndicatorProps) {
  const pct = ((current + 1) / steps.length) * 100;

  return (
    <div>
      {/* Compact bar for small screens */}
      <div className="lg:hidden">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-ink">{steps[current].label}</span>
          <span className="tabular-nums text-mist">
            Step {current + 1} of {steps.length}
          </span>
        </div>
        <div
          className="mt-3 h-[3px] w-full overflow-hidden bg-ink/10"
          role="progressbar"
          aria-label="Brief progress"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={current + 1}
          aria-valuetext={`Step ${current + 1} of ${steps.length}: ${steps[current].label}`}
        >
          <div
            className="h-full bg-lagoon-700 transition-[width] duration-700 ease-[var(--ease-island)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Vertical step list for large screens */}
      <ol className="hidden space-y-1 lg:block" aria-label="Brief steps">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= reached;
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!reachable || active}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                className={`group flex w-full items-center gap-4 py-2.5 text-left transition-colors disabled:cursor-default ${
                  active ? "text-ink" : reachable ? "text-ink-soft hover:text-ink" : "text-mist/60"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs tabular-nums transition-colors duration-300 ${
                    active
                      ? "border-ink bg-ink text-sand-50"
                      : done
                        ? "border-lagoon-700 bg-lagoon-700 text-sand-50"
                        : "border-ink/20"
                  }`}
                >
                  {done ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} /> : `0${i + 1}`}
                </span>
                <span className={`text-sm ${active ? "font-semibold" : ""}`}>{step.label}</span>
                {done ? <span className="sr-only">(completed)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
