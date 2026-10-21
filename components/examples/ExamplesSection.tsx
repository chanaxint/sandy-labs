"use client";

import { useState } from "react";
import { exampleConcepts, type ExampleConcept } from "@/lib/examples";
import { scrollToSection, sectionIds } from "@/lib/navigation";
import { useBrief } from "../questionnaire/BriefProvider";
import { Reveal } from "../ui/Reveal";
import { SectionHeading } from "../ui/SectionHeading";
import { ExampleCard } from "./ExampleCard";
import { ExampleDialog } from "./ExampleDialog";

// Asymmetric, editorial column spans; repeats for any number of concepts.
const spans = ["lg:col-span-7", "lg:col-span-5 lg:mt-24", "lg:col-span-5", "lg:col-span-7 lg:mt-24", "lg:col-span-6", "lg:col-span-6 lg:mt-24"];

export function ExamplesSection() {
  const [active, setActive] = useState<ExampleConcept | null>(null);
  const { applyConcept } = useBrief();

  const use = (concept: ExampleConcept) => {
    applyConcept(concept);
    setActive(null);
    requestAnimationFrame(() => scrollToSection(sectionIds.create));
  };

  return (
    <section id={sectionIds.examples} aria-labelledby="examples-title" className="bg-sand-50 py-24 sm:py-36">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Example websites"
            title={
              <span id="examples-title">
                Explore what&apos;s <span className="italic">possible.</span>
              </span>
            }
            lead="Six design concepts that show the range of directions a brief can take. They are example templates created to illustrate styles — not client projects."
          />
        </div>

        <div className="mt-16 grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-y-24">
          {exampleConcepts.map((concept, i) => (
            <Reveal key={concept.id} className={spans[i % spans.length]} delay={(i % 2) * 120}>
              <ExampleCard concept={concept} index={i} onExplore={setActive} />
            </Reveal>
          ))}
        </div>
      </div>

      <ExampleDialog concept={active} onClose={() => setActive(null)} onUse={use} />
    </section>
  );
}
