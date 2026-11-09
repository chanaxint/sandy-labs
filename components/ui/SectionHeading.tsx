import type { ReactNode } from "react";

/** Eyebrow, title and lede: how every section of the corporate pages opens. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  aside,
  as: Tag = "h2",
  size = "display-2",
}: {
  id?: string;
  eyebrow: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  /** Beside the eyebrow (a status, a number). */
  aside?: ReactNode;
  as?: "h1" | "h2";
  size?: "display-1" | "display-2";
}) {
  return (
    <header className="max-w-[48rem]">
      <p className="eyebrow flex flex-wrap items-center gap-3">
        <span>{eyebrow}</span>
        {aside}
      </p>
      <Tag id={id} className={`${size} mt-5 md:mt-6`}>
        {title}
      </Tag>
      {lede ? <p className="lede mt-6 max-w-[40rem] md:mt-8">{lede}</p> : null}
    </header>
  );
}
