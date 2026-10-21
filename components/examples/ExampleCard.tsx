import { ArrowUpRight } from "lucide-react";
import type { ExampleConcept } from "@/lib/examples";
import { ExamplePreview } from "./ExamplePreview";

type ExampleCardProps = {
  concept: ExampleConcept;
  index: number;
  onExplore: (concept: ExampleConcept) => void;
};

export function ExampleCard({ concept, index, onExplore }: ExampleCardProps) {
  return (
    <article className="group flex h-full flex-col">
      <button
        type="button"
        onClick={() => onExplore(concept)}
        className="relative block overflow-hidden text-left"
        aria-label={`Explore the ${concept.title} concept`}
      >
        <div className="transition-transform duration-[1200ms] ease-[var(--ease-island)] group-hover:scale-[1.03]">
          <ExamplePreview concept={concept} />
        </div>
        <span className="absolute top-4 left-4 bg-sand-50/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.18em] text-ink uppercase">
          Concept
        </span>
      </button>

      <div className="flex flex-1 flex-col pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow text-lagoon-700">{concept.category}</p>
          <span className="text-xs tabular-nums text-mist">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <h3 className="mt-3 font-display text-2xl font-light tracking-[-0.01em] text-ink sm:text-3xl">{concept.title}</h3>
        <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{concept.description}</p>
        <button
          type="button"
          onClick={() => onExplore(concept)}
          className="mt-6 inline-flex w-fit items-center gap-2 border-b border-ink/30 pb-1 text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          Explore
          <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </article>
  );
}
