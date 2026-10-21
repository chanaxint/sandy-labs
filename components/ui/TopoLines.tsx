import { blobPath, type Harmonic } from "@/lib/shapes";

const harmonics: Harmonic[] = [
  [0.14, 2, 0.9],
  [0.08, 3, 2.4],
  [0.05, 5, 0.2],
  [0.02, 9, 1.3],
];

// Concentric contours, like depth lines on a nautical chart.
const contours = Array.from({ length: 9 }, (_, i) => blobPath(400, 400, 150, 120, harmonics, 0.6 + i * 0.32, 90));

/** Decorative topographic contour lines. */
export function TopoLines({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 800" className={className} aria-hidden fill="none">
      {contours.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth={1} opacity={0.9 - i * 0.08} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
