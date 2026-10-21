/**
 * A procedurally drawn aerial island: deep ocean, reef shallows, surf, sand
 * and textured canopy. Rendered as a single static SVG so it is light to ship
 * and scales to any viewport. Replace with real footage via `lib/media.ts`.
 */

import { blobPath, type Harmonic } from "@/lib/shapes";

const main: Harmonic[] = [
  [0.16, 2, 0.6],
  [0.09, 3, 2.1],
  [0.06, 5, 0.3],
  [0.035, 7, 1.7],
  [0.02, 11, 0.9],
  [0.012, 17, 2.6],
];

const islet: Harmonic[] = [
  [0.14, 2, 1.4],
  [0.08, 3, 0.2],
  [0.03, 6, 2.2],
  [0.015, 13, 0.4],
];

const ISLAND = { cx: 930, cy: 510, rx: 290, ry: 200 };
const ISLET = { cx: 1330, cy: 250, rx: 70, ry: 48 };

const paths = {
  reef: blobPath(ISLAND.cx, ISLAND.cy, ISLAND.rx, ISLAND.ry, main, 1.55),
  shallows: blobPath(ISLAND.cx, ISLAND.cy, ISLAND.rx, ISLAND.ry, main, 1.22),
  surf: blobPath(ISLAND.cx, ISLAND.cy, ISLAND.rx, ISLAND.ry, main, 1.09),
  sand: blobPath(ISLAND.cx, ISLAND.cy, ISLAND.rx, ISLAND.ry, main, 1.05),
  canopy: blobPath(ISLAND.cx, ISLAND.cy, ISLAND.rx, ISLAND.ry, main, 0.93),
  isletReef: blobPath(ISLET.cx, ISLET.cy, ISLET.rx, ISLET.ry, islet, 1.9),
  isletShallows: blobPath(ISLET.cx, ISLET.cy, ISLET.rx, ISLET.ry, islet, 1.35),
  isletSand: blobPath(ISLET.cx, ISLET.cy, ISLET.rx, ISLET.ry, islet, 1.08),
  isletCanopy: blobPath(ISLET.cx, ISLET.cy, ISLET.rx, ISLET.ry, islet, 0.82),
};

export function IslandIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustrated aerial view of a tropical island in turquoise water"
    >
      <defs>
        <radialGradient id="ocean" cx="58%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#1f8a96" />
          <stop offset="38%" stopColor="#11616f" />
          <stop offset="75%" stopColor="#0a3d4b" />
          <stop offset="100%" stopColor="#062a35" />
        </radialGradient>

        <radialGradient id="reefGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5fd0c8" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#2aa5aa" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1a8590" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="sandTone" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#f8edd3" />
          <stop offset="100%" stopColor="#ecd8ad" />
        </radialGradient>

        <radialGradient id="canopyTone" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#4f7f45" />
          <stop offset="60%" stopColor="#355f35" />
          <stop offset="100%" stopColor="#264a2c" />
        </radialGradient>

        {/* Ocean surface ripples */}
        <filter id="waterTexture" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.018" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.62" />
        </filter>

        {/* Organic, slightly ragged coastline */}
        <filter id="coast" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Canopy: bump-mapped noise lit from the upper left */}
        <filter id="canopy" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="4" seed="11" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="3.2" lightingColor="#c9dcae" result="light">
            <feDistantLight azimuth="225" elevation="48" />
          </feDiffuseLighting>
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="4" result="edgeNoise" />
          <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="22" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feComposite in="light" in2="shape" operator="in" result="litShape" />
          <feBlend in="litShape" in2="shape" mode="multiply" />
        </filter>

        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id="softer" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="foam" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="2.2" />
        </filter>

        <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="#031a22" stopOpacity="0" />
          <stop offset="100%" stopColor="#031a22" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      {/* Ocean */}
      <rect width="1600" height="1000" fill="url(#ocean)" />
      <rect width="1600" height="1000" filter="url(#waterTexture)" opacity="0.22" />

      {/* Islet */}
      <path d={paths.isletReef} fill="url(#reefGlow)" filter="url(#soft)" opacity="0.8" />
      <path d={paths.isletShallows} fill="#78d8cf" filter="url(#softer)" opacity="0.8" />
      <path d={paths.isletSand} fill="url(#sandTone)" filter="url(#coast)" />
      <path d={paths.isletCanopy} fill="url(#canopyTone)" filter="url(#canopy)" />

      {/* Main island */}
      <path d={paths.reef} fill="url(#reefGlow)" filter="url(#soft)" />
      <path d={paths.shallows} fill="#74d4cc" filter="url(#softer)" opacity="0.85" />
      <path d={paths.surf} fill="none" stroke="#ffffff" strokeWidth="7" filter="url(#foam)" opacity="0.55" />
      <path d={paths.sand} fill="url(#sandTone)" filter="url(#coast)" />
      <path d={paths.canopy} fill="url(#canopyTone)" filter="url(#canopy)" />

      <rect width="1600" height="1000" fill="url(#vignette)" />
    </svg>
  );
}

/** Soft, noise-textured cloud used as a drifting overlay layer. */
export function Cloud({ className = "", seed = 1, shadow = false }: { className?: string; seed?: number; shadow?: boolean }) {
  const id = `cloud-${seed}-${shadow ? "s" : "c"}`;
  return (
    <svg className={className} viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id={`${id}-mask-g`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="65%" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <ellipse cx="300" cy="180" rx="300" ry="180" fill={`url(#${id}-mask-g)`} />
        </mask>
        <filter id={`${id}-f`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="5" seed={seed} />
          <feColorMatrix
            values={
              shadow
                ? "0 0 0 0 0.01  0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 2.4 -1.2"
                : "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.6 -1.15"
            }
          />
          <feGaussianBlur stdDeviation={shadow ? 8 : 1.5} />
        </filter>
      </defs>
      <rect width="600" height="360" filter={`url(#${id}-f)`} mask={`url(#${id}-mask)`} />
    </svg>
  );
}
