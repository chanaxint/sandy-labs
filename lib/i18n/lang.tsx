"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/journey/story";

type LangState = { lang: Lang; setLang: (lang: Lang) => void };

const LangContext = createContext<LangState>({ lang: "en", setLang: () => undefined });
const KEY = "sandy-lang";

/**
 * The site language (English or Turkish). The page renders in English first; on the
 * visitor's first visit it switches to Turkish if their browser prefers it, and their
 * own choice is remembered after that.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // Storage blocked: fall back to the browser's language.
    }
    const preferred = saved === "en" || saved === "tr" ? saved : navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
    // Syncing from the browser once on mount; the server can't know it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLangState(preferred);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not remembered; still switched for this visit.
    }
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
