"use client";

import { useLang } from "@/lib/i18n/lang";
import type { Lang } from "@/lib/journey/story";

const options: { lang: Lang; label: string; name: string }[] = [
  { lang: "en", label: "EN", name: "English" },
  { lang: "tr", label: "TR", name: "Türkçe" },
];

/** Language switch, top right; inverts against the footage so it reads on any frame. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label="Language" className="fixed top-4 right-4 z-30 flex gap-1 text-white mix-blend-difference md:top-6 md:right-6">
      {options.map((o) => (
        <button
          key={o.lang}
          type="button"
          lang={o.lang}
          aria-label={o.name}
          aria-pressed={lang === o.lang}
          onClick={() => setLang(o.lang)}
          className="rounded-full px-2.5 py-1.5 text-[0.8125rem] font-medium tracking-[0.02em] opacity-55 transition-opacity duration-200 hover:opacity-90 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 aria-pressed:opacity-100"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
