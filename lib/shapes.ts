export type Harmonic = [amplitude: number, frequency: number, phase: number];

/** Builds a smooth closed blob path from summed sine harmonics (deterministic for SSR). */
export function blobPath(cx: number, cy: number, rx: number, ry: number, harmonics: Harmonic[], scale = 1, points = 120) {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    let r = 1;
    for (const [amp, freq, phase] of harmonics) r += amp * Math.sin(freq * t + phase);
    pts.push([cx + Math.cos(t) * rx * r * scale, cy + Math.sin(t) * ry * r * scale]);
  }
  // Catmull-Rom to cubic Bézier for smooth curves.
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d}Z`;
}
