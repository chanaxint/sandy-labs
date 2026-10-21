import { ArrowRight } from "lucide-react";
import { sectionIds } from "@/lib/navigation";
import { Reveal } from "../ui/Reveal";
import { SectionHeading } from "../ui/SectionHeading";

const process = [
  {
    title: "Describe your vision",
    body: "Tell us about your business and goals.",
    status: "Available now",
  },
  {
    title: "Shape the experience",
    body: "Define the design direction, pages and features.",
    status: "Available now",
  },
  {
    title: "Review your website brief",
    body: "Confirm your requirements before the future generation and publishing workflow.",
    status: "Brief review available now",
  },
];

export function HowItWorks() {
  return (
    <section id={sectionIds.howItWorks} aria-labelledby="how-title" className="bg-sand-100 py-24 sm:py-36">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
        <SectionHeading
          eyebrow="How it works"
          title={
            <span id="how-title">
              Three steps from idea <span className="italic">to brief.</span>
            </span>
          }
          lead="A simple path, honestly described. Today you can build and review a complete website brief. Generating and publishing the website itself is the next stage we're building."
        />

        <ol className="relative mt-20 grid gap-14 md:grid-cols-3 md:gap-10">
          {/* Shoreline connecting the steps */}
          <span aria-hidden className="absolute top-6 right-0 left-0 hidden h-px bg-ink/15 md:block" />
          {process.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 120} className="relative">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-ink/15 bg-sand-50 font-display text-lg italic">
                {i + 1}
              </span>
              <h3 className="mt-8 font-display text-3xl font-light tracking-[-0.01em]">{step.title}</h3>
              <p className="mt-3 max-w-xs leading-relaxed text-ink-soft">{step.body}</p>
              <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-palm-700">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-palm-500" />
                {step.status}
              </p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-20 grid gap-8 border-t border-ink/10 pt-10 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="eyebrow text-lagoon-700">Works today</h3>
            <p className="mt-4 leading-relaxed text-ink-soft">
              The guided questionnaire, your own requirements in plain language, and a structured brief you can review,
              copy or download.
            </p>
          </div>
          <div>
            <h3 className="eyebrow text-sand-700">Coming next</h3>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Website generation from your brief, accounts to save your work, and publishing. These aren&apos;t live
              yet, and we won&apos;t pretend otherwise.
            </p>
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <a
            href={`#${sectionIds.create}`}
            className="group inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-sand-50 transition-colors hover:bg-lagoon-900"
          >
            Start your brief
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
