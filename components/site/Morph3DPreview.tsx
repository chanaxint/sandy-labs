"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";

/**
 * The "3D experience" preview: a solid, lit product model turning in perspective that
 * flows from one into the next: a watch (steel case, dark dial, leather strap), a
 * high-top basketball sneaker (white leather, red and black panels, a white midsole), a
 * perfume bottle (glass, gold cap), then the watch again.
 *
 * Every model is the same grid of cross-section rings × points, each point with its own
 * colour and shine, so one becomes the next by moving and recolouring each point (no
 * popping). Drawn on a small canvas from the shared GSAP ticker as shaded quads, back to
 * front, lit from the top left with a highlight on metal and glass; one still frame (the
 * watch) with reduced motion.
 */

type Vec = [number, number, number];
type Rgb = [number, number, number];
/** A point of a model: where it is, its colour, how shiny (0 matte … 1 polished). */
type Pt = { p: Vec; c: Rgb; s: number };
type Model = Pt[][];

const RINGS = 34;
const POINTS = 40;
/** Seconds each model is shown turning, and the seconds one takes to become the next. */
const HOLD = 3.4;
const MORPH = 1.2;
/** Turning speed (radians per second) and the tilt towards the viewer. */
const SPIN = 0.7;
const TILT = -0.32;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ring = <T,>(n: number, f: (a: number) => T): T[] => Array.from({ length: n }, (_, i) => f((i / n) * Math.PI * 2));

/** A rounded box's outline at angle a (half width w, half height h); p closer to 0 is boxier. */
function roundRect(a: number, w: number, h: number, p = 0.35): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [w * Math.sign(c) * Math.abs(c) ** p, h * Math.sign(s) * Math.abs(s) ** p];
}

const STEEL = hex("#c9cdd4");
const DIAL = hex("#141b2b");
const LEATHER = hex("#2a211c");

/** A watch, cut across its length: the strap, the round steel case with its dark dial, the strap. */
function watch(): Model {
  const r = 0.62;
  return Array.from({ length: RINGS }, (_, k) => {
    const y = lerp(-1.5, 1.5, k / (RINGS - 1));
    const inCase = Math.abs(y) < r;
    const w = inCase ? Math.max(0.32, Math.sqrt(r * r - y * y)) : 0.32;
    const d = inCase ? 0.17 : 0.05;
    return ring(POINTS, (a) => {
      const [x, z] = roundRect(a, w, d, inCase ? 0.25 : 0.35);
      const front = Math.sin(a) > 0.55;
      const dial = inCase && front && Math.abs(x) < w - 0.07 && Math.abs(y) < r - 0.08;
      const c = !inCase ? LEATHER : dial ? DIAL : STEEL;
      return { p: [x, y, z], c, s: !inCase ? 0.15 : dial ? 0.6 : 1 } as Pt;
    });
  });
}

const WHITE = hex("#f3f2ee");
const RED = hex("#c8102e");
const BLACK = hex("#1c1c1e");
const MIDSOLE = hex("#fbfaf6");

/**
 * A high-top basketball sneaker, cut across from toe to heel: a thick white midsole on a
 * red outsole, white leather, a red toe cap and heel, a black collar and side panel.
 */
function sneaker(): Model {
  return Array.from({ length: RINGS }, (_, k) => {
    const t = k / (RINGS - 1);
    const x = lerp(-1.45, 1.35, t);
    const toe = Math.sin(Math.min(1, t * 3) * (Math.PI / 2));
    // Low over the toes, rising to the high collar at the ankle, rounding off at the heel.
    const ankle = t > 0.55 ? Math.sin(Math.min(1, (t - 0.55) / 0.3) * (Math.PI / 2)) : 0;
    const heelRound = t > 0.92 ? 1 - ((t - 0.92) / 0.08) ** 2 * 0.55 : 1;
    const height = (0.3 + 0.38 * toe + 0.55 * ankle) * heelRound;
    const width = (0.24 + 0.2 * Math.sin(Math.min(1, t * 2.2) * (Math.PI / 2))) * (1 - 0.18 * t);
    const lift = t < 0.12 ? (0.12 - t) * 0.9 : 0; // toe spring
    return ring(POINTS, (a) => {
      const [z, yy] = roundRect(a, width, height / 2, 0.3);
      const y = yy + height / 2 - 0.62 + lift;
      const u = (yy + height / 2) / height; // 0 at the sole, 1 at the top
      const side = Math.abs(Math.cos(a)) > 0.55;
      let c = WHITE;
      let s = 0.35;
      if (u < 0.06) {
        c = RED; // outsole
        s = 0.1;
      } else if (u < 0.2) {
        c = MIDSOLE;
        s = 0.25;
      } else if (t < 0.16) c = RED; // toe cap
      else if (t > 0.82 && u < 0.75) c = RED; // heel
      else if (t > 0.6 && u > 0.72) c = BLACK; // collar
      else if (side && t > 0.3 && t < 0.8 && Math.abs(u - (0.42 + (t - 0.3) * 0.5)) < 0.09) c = BLACK; // the side's sweep
      return { p: [x, y, z], c, s } as Pt;
    });
  });
}

const GLASS = hex("#efcfc2");
const GOLD = hex("#c9a45c");

/** A perfume bottle, turned: a square-shouldered glass flask, a gold neck and cap. */
function bottle(): Model {
  return Array.from({ length: RINGS }, (_, k) => {
    const y = lerp(-1.1, 1.3, k / (RINGS - 1));
    const r = y < 0.35 ? 0.64 : y < 0.5 ? lerp(0.64, 0.2, (y - 0.35) / 0.15) : y < 0.74 ? 0.18 : 0.3;
    const glass = y < 0.5;
    return ring(POINTS, (a) => {
      const [x, z] = roundRect(a, r, r * 0.62, glass ? 0.25 : 0.4);
      return { p: [x, y, z], c: glass ? GLASS : GOLD, s: glass ? 0.85 : 1 } as Pt;
    });
  });
}

const models = [watch(), sneaker(), bottle()];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The model at time t (s): holding each, then flowing into the next. */
function shapeAt(t: number): Model {
  const cycle = HOLD + MORPH;
  const i = Math.floor(t / cycle) % models.length;
  const local = t % cycle;
  if (local < HOLD) return models[i];
  const m = ease((local - HOLD) / MORPH);
  const a = models[i];
  const b = models[(i + 1) % models.length];
  return a.map((r, k) =>
    r.map((q, j) => {
      const o = b[k][j];
      return {
        p: [lerp(q.p[0], o.p[0], m), lerp(q.p[1], o.p[1], m), lerp(q.p[2], o.p[2], m)],
        c: [lerp(q.c[0], o.c[0], m), lerp(q.c[1], o.c[1], m), lerp(q.c[2], o.c[2], m)],
        s: lerp(q.s, o.s, m),
      } as Pt;
    }),
  );
}

/** Light from the top left, a little in front. */
const LIGHT = (() => {
  const v: Vec = [-0.55, 0.7, 0.55];
  const n = Math.hypot(...v);
  return v.map((x) => x / n) as Vec;
})();

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec): Vec => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** The half-way vector between the light and the viewer, for the highlight. */
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

type Face = { z: number; pts: [number, number][]; c: Rgb; s: number; n: Vec };

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, shape: Model, angle: number) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w, h) * 0.3;
  const cy = Math.cos(angle);
  const sy = Math.sin(angle);
  const cx = Math.cos(TILT);
  const sx = Math.sin(TILT);
  const cam = 4.6;
  const mid = h * 0.47;
  // Into view space: turned about the vertical, tilted towards the viewer.
  const view = ([x, y, z]: Vec): Vec => {
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
  };
  const screen = ([x, y, z]: Vec): [number, number] => {
    const f = cam / (cam - z);
    return [w / 2 + x * scale * f, mid - y * scale * f];
  };
  const v = shape.map((r) => r.map((q) => view(q.p)));
  const s = v.map((r) => r.map(screen));

  // A soft shadow on the ground under it.
  const floor = mid + scale * 1.3;
  ctx.save();
  ctx.translate(w / 2, floor);
  ctx.scale(1, 0.16);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 1.15);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.5)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(-scale * 1.2, -scale * 1.2, scale * 2.4, scale * 2.4);
  ctx.restore();

  // Which way the rings wind decides which way the faces point: take the one that faces
  // out (away from the model's middle).
  const centre = v.flat().reduce<Vec>((a, q) => [a[0] + q[0], a[1] + q[1], a[2] + q[2]], [0, 0, 0]).map((x) => x / (RINGS * POINTS)) as Vec;
  const faces: Face[] = [];
  const add = (quad: Vec[], pts: [number, number][], c: Rgb, sh: number) => {
    const mean = quad.reduce<Vec>((a, q) => [a[0] + q[0], a[1] + q[1], a[2] + q[2]], [0, 0, 0]).map((x) => x / quad.length) as Vec;
    let n = norm(cross(sub(quad[1], quad[0]), sub(quad[quad.length - 1], quad[0])));
    if (dot(n, sub(mean, centre)) < 0) n = [-n[0], -n[1], -n[2]];
    if (n[2] <= 0.02) return; // facing away
    faces.push({ z: mean[2], pts, c, s: sh, n });
  };
  for (let k = 0; k < RINGS - 1; k++)
    for (let j = 0; j < POINTS; j++) {
      const j2 = (j + 1) % POINTS;
      const q = shape[k][j];
      add([v[k][j], v[k][j2], v[k + 1][j2], v[k + 1][j]], [s[k][j], s[k][j2], s[k + 1][j2], s[k + 1][j]], q.c, q.s);
    }
  // The two ends, closed.
  for (const k of [0, RINGS - 1]) add(v[k], s[k], shape[k][0].c, shape[k][0].s);

  faces.sort((a, b) => a.z - b.z);
  for (const f of faces) {
    const diffuse = Math.max(0, dot(f.n, LIGHT));
    const spec = Math.max(0, dot(f.n, HALF)) ** (8 + 40 * f.s) * f.s;
    const k = 0.3 + 0.8 * diffuse;
    const col = f.c.map((x) => Math.min(255, x * k + 255 * spec * 0.85));
    const fill = `rgb(${col[0] | 0}, ${col[1] | 0}, ${col[2] | 0})`;
    ctx.fillStyle = fill;
    ctx.strokeStyle = fill; // a hairline of the same colour closes the seams between faces
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function Morph3DPreview() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let w = 0;
    let h = 0;
    const size = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.round(r.width * dpr);
      h = Math.round(r.height * dpr);
      el.width = w;
      el.height = h;
    };
    size();
    const still = () => draw(ctx, w, h, models[0], 0.5);
    const ro = new ResizeObserver(() => {
      size();
      if (prefersReducedMotion()) still();
    });
    ro.observe(el);
    if (prefersReducedMotion()) {
      still();
      return () => ro.disconnect();
    }
    let t = 0;
    const tick = (_time: number, dt: number) => {
      t += Math.min(dt, 64) / 1000;
      draw(ctx, w, h, shapeAt(t), 0.5 + t * SPIN);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvas} className="sp-3-canvas" />;
}
