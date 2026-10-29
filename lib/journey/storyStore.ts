/**
 * The story as the site shows it: the phrases designed in story.ts with the layout saved
 * from the Studio (/studio) on top (story-layout.json: text, timing, place, size, tone…).
 *
 * A small store, so the Studio can change phrases live: components read it with
 * useSyncExternalStore; the timeline rebuilds after React has rendered the change
 * (the overlays dispatch `story:change`).
 */
import savedLayout from "./story-layout.json";
import { designedCta, designedPhrases, type Lang, type Phrase, type Place } from "./story";

/** What the Studio saves: every phrase's editable fields, by id. */
export type StoryLayout = {
  version: 1;
  cta?: Record<Lang, string>;
  phrases: Record<
    string,
    Partial<Pick<Phrase, "text" | "in" | "shown" | "gone" | "enter" | "exit" | "tone" | "veil" | "desktop" | "mobile">> & {
      /** null: stays to the end (JSON has no Infinity). */
      out?: number | null;
    }
  >;
};

export type StudioMode = "off" | "edit" | "preview";

export type StoryState = {
  phrases: Phrase[];
  cta: Record<Lang, string>;
  /** Studio: "edit" shows only the selected phrase, still and draggable; "preview" plays as the site does. */
  studio: { mode: StudioMode; selected: string | null };
};

const isPlace = (p: unknown): p is Place =>
  !!p && typeof p === "object" && ["left", "right", "center"].includes((p as Place).align);

/** The designed phrases with a saved layout applied (unknown ids and bad fields are ignored). */
export function applyLayout(base: Phrase[], layout: StoryLayout | null | undefined): Phrase[] {
  const saved = layout?.phrases ?? {};
  return base.map((p) => {
    const s = saved[p.id];
    if (!s) return p;
    const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
    const lines = (v: unknown, d: string[]) => (Array.isArray(v) && v.every((x) => typeof x === "string") && v.length ? v : d);
    return {
      ...p,
      text: { en: lines(s.text?.en, p.text.en), tr: lines(s.text?.tr, p.text.tr) },
      in: num(s.in, p.in),
      shown: num(s.shown, p.shown),
      out: s.out === null ? Infinity : num(s.out, p.out),
      gone: s.out === null ? undefined : s.gone === undefined ? p.gone : num(s.gone, p.gone ?? 0),
      enter: s.enter ?? p.enter,
      exit: s.exit ?? p.exit,
      tone: s.tone === "light" || s.tone === "dark" ? s.tone : p.tone,
      veil: typeof s.veil === "boolean" ? s.veil : p.veil,
      desktop: isPlace(s.desktop) ? s.desktop : p.desktop,
      mobile: isPlace(s.mobile) ? s.mobile : p.mobile,
    };
  });
}

/** Everything the Studio can change, ready to save. */
export function toLayout(phrases: Phrase[], cta: Record<Lang, string>): StoryLayout {
  const out: StoryLayout = { version: 1, cta, phrases: {} };
  for (const p of phrases) {
    out.phrases[p.id] = {
      text: p.text,
      in: p.in,
      shown: p.shown,
      out: Number.isFinite(p.out) ? p.out : null,
      ...(p.gone !== undefined ? { gone: p.gone } : {}),
      enter: p.enter,
      exit: p.exit,
      tone: p.tone,
      veil: !!p.veil,
      desktop: p.desktop,
      mobile: p.mobile,
    };
  }
  return out;
}

const layout = savedLayout as StoryLayout;

let state: StoryState = {
  phrases: applyLayout(designedPhrases, layout),
  cta: layout.cta ?? designedCta,
  studio: { mode: "off", selected: null },
};
const listeners = new Set<() => void>();

export const storyStore = {
  get: () => state,
  set(patch: Partial<StoryState>) {
    state = { ...state, ...patch };
    for (const l of listeners) l();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

/** The phrases as designed in code, before any saved layout (for "reset"). */
export const designed = { phrases: designedPhrases, cta: designedCta };
