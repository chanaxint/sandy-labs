import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  tone?: "dark" | "light";
};

export function SectionHeading({ eyebrow, title, lead, align = "left", tone = "dark" }: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <Reveal className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className={`eyebrow ${tone === "dark" ? "text-lagoon-700" : "text-lagoon-300"}`}>{eyebrow}</p>
      <h2
        className={`mt-5 font-display text-4xl leading-[1.05] font-light tracking-[-0.02em] text-balance sm:text-5xl lg:text-6xl ${
          tone === "dark" ? "text-ink" : "text-sand-50"
        }`}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={`mt-6 text-base leading-relaxed text-pretty sm:text-lg ${
            tone === "dark" ? "text-ink-soft" : "text-sand-100/80"
          } ${centered ? "mx-auto max-w-2xl" : "max-w-2xl"}`}
        >
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}
