import type { Lang } from "@/lib/journey/story";

/** Site chrome copy (English and Turkish). The story's own copy is in lib/journey/story.ts. */
export const copy = {
  start: { en: "Let's take a journey", tr: "Haydi, bir gezintiye çıkalım" },
  home: { en: "Sandy Labs, back to the start", tr: "Sandy Labs, başa dön" },
  menu: { en: "Menu", tr: "Menü" },
  close: { en: "Close menu", tr: "Menüyü kapat" },
  chaptersTitle: { en: "The journey", tr: "Yolculuk" },
  language: { en: "Language", tr: "Dil" },
} satisfies Record<string, Record<Lang, string>>;

/** Chapters of the film, for the menu: where each scene starts (film frames). */
export const chapters: { id: string; frame: number; label: Record<Lang, string> }[] = [
  { id: "clouds", frame: 0, label: { en: "Above the clouds", tr: "Bulutların üstünde" } },
  { id: "island", frame: 330, label: { en: "The island", tr: "Ada" } },
  { id: "takeoff", frame: 620, label: { en: "Take-off", tr: "Kalkış" } },
  { id: "clouds-swap", frame: 1500, label: { en: "Into the clouds", tr: "Bulutların içinde" } },
  { id: "fjord", frame: 1760, label: { en: "The fjord", tr: "Fiyort" } },
  { id: "snowboard", frame: 2440, label: { en: "On the snow", tr: "Karda" } },
  { id: "miami", frame: 3740, label: { en: "Miami", tr: "Miami" } },
  { id: "night", frame: 4590, label: { en: "Into the night", tr: "Geceye" } },
];
