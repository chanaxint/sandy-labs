/**
 * "Create my website": the start of the website-creation questions. The call to action
 * (the closing phrase's, the menu's) turns the film's night back into morning and opens
 * the first step over the morning sky; closing it goes back to the night.
 *
 * Only the first step exists so far, and nothing is sent anywhere: there is no backend.
 */
import type { Lang } from "@/lib/journey/story";

/** closed: the story; opening: night turning to morning; open: the step; closing: back to the night. */
export type CreateState = "closed" | "opening" | "open" | "closing";

let state: CreateState = "closed";
const listeners = new Set<() => void>();

export const createStore = {
  get: () => state,
  set(next: CreateState) {
    if (state === next) return;
    state = next;
    for (const l of listeners) l();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

/** Opens the creation steps (from the story, or the menu). */
export function openCreate() {
  if (createStore.get() === "closed") createStore.set("opening");
}

/** Back to the story (Escape, or a click beside the step). */
export function closeCreate() {
  if (createStore.get() === "open" || createStore.get() === "opening") createStore.set("closing");
}

/** The film frame the night turns back to: the clear blue sky of the day, before dusk. */
export const morningFrame = 4600;

type Copy = Record<Lang, string>;

export const createCopy = {
  title: { en: "First, let's get to know you.", tr: "Önce sizi biraz tanıyalım." },
  question: { en: "Which industry are you in?", tr: "Hangi sektörde faaliyet gösteriyorsunuz?" },
  continue: { en: "Continue", tr: "Devam et" },
  otherLabel: { en: "Your industry", tr: "Sektörünüz" },
  otherPlaceholder: { en: "e.g. Architecture, Education…", tr: "ör. Mimarlık, Eğitim…" },
} satisfies Record<string, Copy>;

/** The industries of the first step ("other" opens a field to write one in). */
export const sectors: { id: string; label: Copy }[] = [
  { id: "fashion", label: { en: "Fashion & Apparel", tr: "Moda & Giyim" } },
  { id: "beauty", label: { en: "Beauty & Cosmetics", tr: "Güzellik & Kozmetik" } },
  { id: "health", label: { en: "Health & Wellness", tr: "Sağlık & Wellness" } },
  { id: "food", label: { en: "Restaurant & Café", tr: "Restoran & Kafe" } },
  { id: "ecommerce", label: { en: "E-commerce", tr: "E-ticaret" } },
  { id: "real-estate", label: { en: "Real Estate", tr: "Gayrimenkul" } },
  { id: "tech", label: { en: "Technology & SaaS", tr: "Teknoloji & SaaS" } },
  { id: "other", label: { en: "Other", tr: "Diğer" } },
];
