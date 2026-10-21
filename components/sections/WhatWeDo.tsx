import { sectionIds } from "@/lib/navigation";
import { Reveal } from "../ui/Reveal";
import { TopoLines } from "../ui/TopoLines";

const services = [
  {
    title: "Custom website design",
    body: "Every site begins with your story, not a template. We shape layout, typography and colour around what makes your business distinct.",
  },
  {
    title: "E-commerce experiences",
    body: "Storefronts that feel considered from first glance to checkout — product pages, collections and a calm path to purchase.",
  },
  {
    title: "3D and scroll-driven interactions",
    body: "Depth and motion where they earn their place: explorable objects, scenes that unfold as you scroll, and transitions with intent.",
  },
  {
    title: "Responsive design",
    body: "Composed for every screen. Layouts are designed for phones, tablets and large displays, not merely squeezed to fit.",
  },
  {
    title: "Customisation and launch support",
    body: "Refine the details, adjust content and prepare for launch with guidance at each step, so the final site is unmistakably yours.",
  },
];

export function WhatWeDo() {
  return (
    <section
      id={sectionIds.whatWeDo}
      aria-labelledby="what-title"
      className="relative overflow-hidden bg-lagoon-900 py-24 text-sand-50 sm:py-36"
    >
      <TopoLines className="pointer-events-none absolute -top-40 -right-56 h-[900px] w-[900px] text-lagoon-500/25 sm:-right-32" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-10">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow text-lagoon-300">What we do</p>
            <h2
              id="what-title"
              className="mt-5 font-display text-4xl leading-[1.05] font-light tracking-[-0.02em] text-balance sm:text-5xl lg:text-6xl"
            >
              Websites with the patience of <span className="italic text-lagoon-100">a shoreline.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-sand-100/75">
              Sandy Labs is a studio for considered websites. We pair careful design with modern craft, and only add
              motion, depth and complexity where they serve the people visiting.
            </p>
          </Reveal>

          <ol className="lg:col-span-7 lg:col-start-6">
            {services.map((s, i) => (
              <Reveal
                as="li"
                key={s.title}
                delay={i * 70}
                className="grid gap-3 border-t border-sand-50/15 py-8 last:border-b sm:grid-cols-[72px_minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-8 sm:py-10"
              >
                <span className="font-display text-sm text-lagoon-300 italic tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-2xl leading-tight font-light tracking-[-0.01em] sm:text-[1.7rem]">
                  {s.title}
                </h3>
                <p className="leading-relaxed text-sand-100/70">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
