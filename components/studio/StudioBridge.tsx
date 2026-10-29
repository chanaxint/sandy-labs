"use client";

import { useEffect } from "react";
import { useLang } from "@/lib/i18n/lang";
import { filmStatus } from "@/lib/journey/film";
import { progressAt } from "@/lib/journey/pace";
import type { Place } from "@/lib/journey/story";
import { storyStore } from "@/lib/journey/storyStore";
import { isMessage, type Device, type ToSite, type ToStudio } from "@/lib/journey/studioProtocol";
import { getLenis, gsap, ScrollTrigger } from "@/lib/scroll/engine";

const round = (n: number) => Math.round(n * 10) / 10;
/** Snap distance (site pixels) to a guide while dragging. */
const SNAP = 10;
/** Guides: the centre lines (strong) and the thirds (faint), as fractions of the screen. */
const GUIDES = [
  { at: 0.5, strong: true },
  { at: 1 / 3, strong: false },
  { at: 2 / 3, strong: false },
];

/** Lines over the site showing the guides; the one being snapped to lights up. */
function guideLayer() {
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "position:fixed;inset:0;z-index:60;pointer-events:none;display:none";
  const lines = new Map<string, HTMLElement>();
  for (const axis of ["x", "y"] as const) {
    for (const g of GUIDES) {
      const el = document.createElement("div");
      const pos = `${g.at * 100}%`;
      el.style.cssText =
        axis === "x"
          ? `position:absolute;top:0;bottom:0;left:${pos};width:0;border-left:1px dashed`
          : `position:absolute;left:0;right:0;top:${pos};height:0;border-top:1px dashed`;
      el.dataset.strong = String(g.strong);
      root.append(el);
      lines.set(`${axis}${g.at}`, el);
    }
  }
  document.body.append(root);
  const paint = (lit: Set<string>) => {
    for (const [key, el] of lines) {
      const on = lit.has(key);
      el.style.borderStyle = on ? "solid" : "dashed";
      el.style.borderColor = on ? "rgb(255 140 60)" : el.dataset.strong === "true" ? "rgb(255 255 255 / 0.55)" : "rgb(255 255 255 / 0.35)";
      el.style.boxShadow = on ? "0 0 0 0.5px rgb(255 140 60)" : el.dataset.strong === "true" ? "0 0 0 0.5px rgb(0 0 0 / 0.25)" : "0 0 0 0.5px rgb(0 0 0 / 0.14)";
    }
  };
  paint(new Set());
  return {
    show: (on: boolean) => (root.style.display = on ? "block" : "none"),
    paint,
    remove: () => root.remove(),
  };
}

/** Moves a box (left/top/width/height) so its centre sits on a guide within SNAP px; says which. */
function snap(box: { left: number; top: number; width: number; height: number }) {
  const lit = new Set<string>();
  /** The guide nearest the box's centre on one axis, if within SNAP px. */
  const nearest = (centre: number, size: number) => {
    let found: number | null = null;
    let best = SNAP;
    for (const g of GUIDES) {
      const d = Math.abs(centre - g.at * size);
      if (d < best) [best, found] = [d, g.at];
    }
    return found;
  };
  let { left, top } = box;
  const gx = nearest(left + box.width / 2, window.innerWidth);
  if (gx !== null) {
    left = gx * window.innerWidth - box.width / 2;
    lit.add(`x${gx}`);
  }
  const gy = nearest(top + box.height / 2, window.innerHeight);
  if (gy !== null) {
    top = gy * window.innerHeight - box.height / 2;
    lit.add(`y${gy}`);
  }
  return { left, top, lit };
}
const pct = (n: number) => `${round(n)}%`;

/** Scrolls the film to frame f (at once, or over `seconds`). */
function scrollToFrame(f: number, seconds?: number) {
  const st = ScrollTrigger.getById("journey");
  const lenis = getLenis();
  if (!st || !lenis) return;
  const y = st.start + (st.end - st.start) * progressAt(f);
  if (seconds) lenis.scrollTo(y, { duration: seconds, easing: (t) => t, force: true });
  else lenis.scrollTo(y, { immediate: true, force: true });
}

/**
 * The site's side of the Studio (only with `?studio`, inside the Studio's iframe): takes
 * the phrases and settings the Studio sends, scrolls the film where it asks, reports the
 * frame on screen, and turns dragging the selected phrase into a new place for the
 * device this width stands for (phone under 768px, desktop from there).
 */
export function StudioBridge() {
  const { setLang } = useLang();

  useEffect(() => {
    const post = (m: ToStudio) => window.parent.postMessage(m, location.origin);
    const device = (): Device => (window.innerWidth >= 768 ? "desktop" : "mobile");

    const placeOf = (id: string) => {
      const p = storyStore.get().phrases.find((x) => x.id === id);
      return p ? p[device()] : null;
    };

    /** The place that puts the phrase's box at `r` (keeping how it is anchored). */
    const placeFor = (old: Place, r: { left: number; top: number; right: number; height: number }): Place => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const next: Place = { align: old.align, ...(old.centerY ? { centerY: true } : {}), ...(old.scale ? { scale: old.scale } : {}) };
      next.top = pct(((old.centerY ? r.top + r.height / 2 : r.top) / vh) * 100);
      const hasLeft = old.left !== undefined && old.left !== "auto";
      const hasRight = old.right !== undefined && old.right !== "auto";
      if (hasLeft && hasRight) {
        next.left = pct((r.left / vw) * 100);
        next.right = pct(((vw - r.right) / vw) * 100);
      } else if (old.align === "right" || (hasRight && !hasLeft)) {
        next.right = pct(((vw - r.right) / vw) * 100);
      } else {
        next.left = pct((r.left / vw) * 100);
      }
      return next;
    };

    const update = (id: string, place: Place) => {
      const d = device();
      storyStore.set({ phrases: storyStore.get().phrases.map((p) => (p.id === id ? { ...p, [d]: place } : p)) });
      post({ type: "move", id, device: d, place });
    };

    const guides = guideLayer();
    let guidesOn = true;

    /** The selected phrase's box moved by (dx, dy), or set to (left, top). */
    const moveBox = (id: string, to: (r: DOMRect) => { left: number; top: number }) => {
      const el = document.querySelector<HTMLElement>(`[data-phrase-place="${id}"]`);
      const old = placeOf(id);
      if (!el || !old) return;
      const r = el.getBoundingClientRect();
      const { left, top } = to(r);
      update(id, placeFor(old, { left, top, right: left + r.width, height: r.height }));
    };

    const onMessage = (e: MessageEvent) => {
      if (!isMessage<ToSite>(e)) return;
      const m = e.data;
      if (m.type === "state") {
        storyStore.set({ phrases: m.phrases, cta: m.cta, studio: { mode: m.mode, selected: m.selected } });
        setLang(m.lang);
        guidesOn = m.guides;
        guides.show(m.guides && m.mode === "edit");
      } else if (m.type === "nudge") moveBox(m.id, (r) => ({ left: r.left + m.dx, top: r.top + m.dy }));
      else if (m.type === "center")
        moveBox(m.id, (r) =>
          m.axis === "x"
            ? { left: (window.innerWidth - r.width) / 2, top: r.top }
            : { left: r.left, top: (window.innerHeight - r.height) / 2 },
        );
      else if (m.type === "frame") scrollToFrame(m.frame);
      else if (m.type === "play") {
        scrollToFrame(m.from);
        gsap.delayedCall(0.15, () => scrollToFrame(m.to, m.seconds));
      } else if (m.type === "align") {
        // Switch the alignment where the phrase stands now (its box stays put).
        const el = document.querySelector<HTMLElement>(`[data-phrase-place="${m.id}"]`);
        const old = placeOf(m.id);
        if (!el || !old) return;
        const r = el.getBoundingClientRect();
        const hasBoth = old.left !== undefined && old.left !== "auto" && old.right !== undefined && old.right !== "auto";
        const base: Place = { ...old, align: m.align };
        if (!hasBoth) {
          // Anchor on the side the text now runs from.
          if (m.align === "right") {
            delete base.left;
            base.right = "0%";
          } else {
            delete base.right;
            base.left = "0%";
          }
        }
        update(m.id, placeFor(base, r));
      }
    };
    window.addEventListener("message", onMessage);

    // Dragging the selected phrase.
    let drag: { id: string; x: number; y: number; r: DOMRect; old: Place; el: HTMLElement } | null = null;
    const down = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-studio="selected"]');
      const id = el?.dataset.phrasePlace;
      const old = id ? placeOf(id) : null;
      if (!el || !id || !old || e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      drag = { id, x: e.clientX, y: e.clientY, r: el.getBoundingClientRect(), old, el };
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const r = drag.r;
      let left = r.left + e.clientX - drag.x;
      let top = r.top + e.clientY - drag.y;
      // Snap the phrase's centre to the guides (hold Alt to place it freely).
      if (guidesOn && !e.altKey) {
        const s = snap({ left, top, width: r.width, height: r.height });
        ({ left, top } = s);
        guides.paint(s.lit);
      } else guides.paint(new Set());
      update(drag.id, placeFor(drag.old, { left, top, right: left + r.width, height: r.height }));
    };
    const up = () => {
      drag = null;
      guides.paint(new Set());
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    // Report the frame on screen.
    let sent = -1;
    let last = 0;
    const tick = (time: number) => {
      const f = Math.round(filmStatus.target);
      if (f === sent || time - last < 0.08) return;
      sent = f;
      last = time;
      post({ type: "frame", frame: f });
    };
    gsap.ticker.add(tick);

    storyStore.set({ studio: { mode: "edit", selected: null } });
    post({ type: "ready" });
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      gsap.ticker.remove(tick);
      guides.remove();
    };
  }, [setLang]);

  return null;
}
