"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/scroll/engine";

/**
 * The "3D experience" preview: a wireframe object turning in perspective, in the same
 * thin see-through lines as the other previews, that flows from one model into the next:
 * a watch, a sneaker, a perfume bottle, then the watch again.
 *
 * Every model is the same number of cross-section rings with the same number of points,
 * so one becomes the next by moving each point to its place (no popping). Drawn on a
 * small canvas from the shared GSAP ticker while the step is open; one still frame (the
 * watch) with reduced motion.
 */

type Vec = [number, number, number];
type Model = Vec[][];

const RINGS = 26;
const POINTS = 36;
/** Seconds each model is shown turning, and the seconds one takes to become the next. */
const HOLD = 3.2;
const MORPH = 1.1;
/** Turning speed (radians per second) and the tilt towards the viewer. */
const SPIN = 0.7;
const TILT = -0.38;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ring = <T,>(n: number, f: (a: number) => T): T[] => Array.from({ length: n }, (_, i) => f((i / n) * Math.PI * 2));

/** A rounded rectangle's outline at angle a (half width w, half height h). */
function roundRect(a: number, w: number, h: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const p = 0.35; // superellipse: a rounded box
  return [w * Math.sign(c) * Math.abs(c) ** p, h * Math.sign(s) * Math.abs(s) ** p];
}

/** A watch, cut across its length: the strap, then the round case (a disc) and strap again. */
function watch(): Model {
  const r = 0.62;
  return Array.from({ length: RINGS }, (_, k) => {
    const y = lerp(-1.45, 1.45, k / (RINGS - 1));
    const inCase = Math.abs(y) < r;
    const w = inCase ? Math.max(0.3, Math.sqrt(r * r - y * y)) : 0.3;
    const d = inCase ? 0.16 : 0.05;
    return ring(POINTS, (a) => {
      const [x, z] = roundRect(a, w, d);
      return [x, y, z] as Vec;
    });
  });
}

/** A sneaker, cut across from toe to heel: a flat sole, low at the toe, high at the collar. */
function sneaker(): Model {
  return Array.from({ length: RINGS }, (_, k) => {
    const t = k / (RINGS - 1);
    const x = lerp(-1.4, 1.35, t);
    const toe = Math.sin(Math.min(1, t * 3.2) * (Math.PI / 2));
    const height = 0.18 + 0.42 * toe + (t > 0.62 ? 0.32 * Math.sin(((t - 0.62) / 0.38) * Math.PI * 0.9) : 0);
    const width = 0.2 + 0.28 * Math.sin(Math.min(1, t * 2.4) * (Math.PI / 2)) * (1 - 0.25 * t);
    return ring(POINTS, (a) => {
      const [z, yy] = roundRect(a, width, height / 2);
      // Standing on its sole: the bottom of every cut on one line.
      return [x, yy + height / 2 - 0.45, z] as Vec;
    });
  });
}

/** A perfume bottle, turned: a square-shouldered flask, a short neck, a cap. */
function bottle(): Model {
  return Array.from({ length: RINGS }, (_, k) => {
    const y = lerp(-1.1, 1.25, k / (RINGS - 1));
    const r = y < 0.35 ? 0.62 : y < 0.5 ? lerp(0.62, 0.2, (y - 0.35) / 0.15) : y < 0.72 ? 0.18 : 0.3;
    return ring(POINTS, (a) => {
      const [x, z] = roundRect(a, r, r * 0.62);
      return [x, y, z] as Vec;
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
  return a.map((r, k) => r.map((p, j) => [lerp(p[0], b[k][j][0], m), lerp(p[1], b[k][j][1], m), lerp(p[2], b[k][j][2], m)] as Vec));
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, shape: Model, angle: number) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w, h) * 0.3;
  const cy = Math.cos(angle);
  const sy = Math.sin(angle);
  const cx = Math.cos(TILT);
  const sx = Math.sin(TILT);
  const cam = 4.2;
  const project = ([x, y, z]: Vec): [number, number, number] => {
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y1 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const f = cam / (cam - z2);
    return [w / 2 + x1 * scale * f, h / 2 - y1 * scale * f, z2];
  };
  const pts = shape.map((r) => r.map(project));
  ctx.lineWidth = Math.max(0.6, w / 360);
  ctx.lineJoin = "round";
  // The rings, nearer ones a little brighter.
  for (const r of pts) {
    const depth = r.reduce((s, p) => s + p[2], 0) / r.length;
    ctx.strokeStyle = `rgba(180, 205, 255, ${0.32 + 0.22 * Math.max(-1, Math.min(1, depth))})`;
    ctx.beginPath();
    r.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }
  // A few lines along the length, tying the rings into a surface.
  ctx.strokeStyle = "rgba(190, 150, 255, 0.32)";
  for (let j = 0; j < POINTS; j += POINTS / 6) {
    ctx.beginPath();
    pts.forEach((r, k) => (k ? ctx.lineTo(r[j][0], r[j][1]) : ctx.moveTo(r[j][0], r[j][1])));
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
    const ro = new ResizeObserver(() => {
      size();
      if (prefersReducedMotion()) draw(ctx, w, h, models[0], 0.6);
    });
    ro.observe(el);
    if (prefersReducedMotion()) {
      draw(ctx, w, h, models[0], 0.6);
      return () => ro.disconnect();
    }
    let t = 0;
    const tick = (_time: number, dt: number) => {
      t += Math.min(dt, 64) / 1000;
      draw(ctx, w, h, shapeAt(t), t * SPIN);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvas} className="sp-3-canvas" />;
}
