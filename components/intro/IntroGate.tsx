"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { IntroFilm } from "./IntroFilm";

type Phase = "intro" | "leaving" | "done";

const FADE_MS = 900;

/**
 * Shows the intro film above the homepage on arrival. While it runs, the page
 * underneath is scroll-locked and inert, and the hero's entrance animation
 * waits (see `[data-intro="active"]` in globals.css) so it plays on exit.
 * Links to a specific section (e.g. /#contact) skip the intro.
 */
export function IntroGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("intro");

  useEffect(() => {
    if (window.location.hash && window.location.hash !== "#home") {
      // Deep link: go straight to the section.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once on mount
      setPhase("done");
    }
  }, []);

  useEffect(() => {
    if (phase === "done") return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [phase]);

  const leave = useCallback(() => {
    setPhase("leaving");
    window.scrollTo(0, 0);
    window.setTimeout(() => {
      setPhase("done");
      // Hand keyboard focus back to the page from the removed intro.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }, FADE_MS);
  }, []);

  return (
    <>
      <div data-intro={phase === "intro" ? "active" : "done"} inert={phase === "intro"}>
        {children}
      </div>
      {phase !== "done" ? <IntroFilm onExit={leave} leaving={phase === "leaving"} /> : null}
    </>
  );
}
