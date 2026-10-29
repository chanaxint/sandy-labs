import { mark, wordmark } from "@/lib/brand/logo";

/**
 * The island mark (stroked, so it stays crisp at any size). Decorative unless titled.
 * `weight` thickens the lines for small sizes, where the artwork's hairlines would vanish;
 * `line` instead draws every loop at one width (in the artwork's units).
 */
export function SandyMark({
  className,
  title,
  weight = 1,
  line,
}: {
  className?: string;
  title?: string;
  weight?: number;
  line?: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${mark.width} ${mark.height}`}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
    >
      {mark.loops.map((l, i) => (
        <path key={i} d={l.d} strokeWidth={line ?? l.stroke * weight} />
      ))}
    </svg>
  );
}

/** "SANDY / LABS" as in the brand artwork. */
export function SandyWordmark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${wordmark.width} ${wordmark.height}`}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="currentColor"
    >
      <path d={wordmark.d} fillRule="evenodd" />
    </svg>
  );
}
