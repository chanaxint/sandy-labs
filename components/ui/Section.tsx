import type { ReactNode } from "react";

const grounds = { ivory: "bg-ivory", cream: "bg-cream", beige: "bg-beige" } as const;

/** A band of the corporate pages: its ground colour, the shared width and rhythm. */
export function Section({
  id,
  tone = "ivory",
  labelledBy,
  className = "",
  children,
}: {
  id?: string;
  tone?: keyof typeof grounds;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${grounds[tone]} text-ink ${className}`}>
      <div className="mx-auto w-full max-w-[80rem] px-6 py-[clamp(5rem,11vw,9.5rem)] md:px-10">{children}</div>
    </section>
  );
}
