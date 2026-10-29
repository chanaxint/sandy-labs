/**
 * Messages between the Studio page (/studio) and the site it edits, shown in an iframe
 * (/?studio). Same origin only.
 */
import type { Lang, Phrase, Place } from "./story";
import type { StudioMode } from "./storyStore";

export type Device = "desktop" | "mobile";

/** Studio → site. */
export type ToSite =
  | { type: "state"; phrases: Phrase[]; cta: Record<Lang, string>; mode: StudioMode; selected: string | null; lang: Lang }
  | { type: "frame"; frame: number }
  | { type: "play"; from: number; to: number; seconds: number }
  | { type: "align"; id: string; align: Place["align"] };

/** Site → Studio. */
export type ToStudio =
  | { type: "ready" }
  | { type: "frame"; frame: number }
  | { type: "move"; id: string; device: Device; place: Place };

export const isMessage = <T extends { type: string }>(e: MessageEvent): e is MessageEvent<T> =>
  e.origin === location.origin && !!e.data && typeof e.data === "object" && typeof e.data.type === "string";
