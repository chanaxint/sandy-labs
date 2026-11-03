import type { Lang } from "@/lib/journey/story";

/** Site chrome copy (English and Turkish). The story's own copy is in lib/journey/story.ts. */
export const copy = {
  start: { en: "Let's take a journey", tr: "Haydi, bir gezintiye çıkalım" },
  scroll: { en: "Scroll", tr: "Kaydır" },
  home: { en: "Sandy Labs, back to the start", tr: "Sandy Labs, başa dön" },
  contact: { en: "Contact us", tr: "Bize ulaşın" },
  menu: { en: "Menu", tr: "Menü" },
  homeLink: { en: "Home", tr: "Ana sayfa" },
  close: { en: "Close menu", tr: "Menüyü kapat" },
} satisfies Record<string, Record<Lang, string>>;
