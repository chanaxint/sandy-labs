"use client";

import { useLang } from "@/lib/i18n/lang";
import { langs } from "@/lib/i18n/types";

/** EN / TR: the site's language, remembered (lib/i18n/lang.tsx). */
export function LangSwitch({ className = "", label }: { className?: string; label: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label={label} className={`flex items-center gap-1 text-[0.8rem] tracking-[0.08em] ${className}`}>
      {langs.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 ? <span aria-hidden className="opacity-40">/</span> : null}
          <button
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={`px-1 py-1 uppercase transition-opacity duration-200 focus-visible:underline focus-visible:outline-none ${
              lang === l ? "opacity-100" : "opacity-50 hover:opacity-80"
            }`}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}
