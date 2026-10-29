"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { useLang } from "@/lib/i18n/lang";
import { cta, phrases, type Phrase, type Place } from "@/lib/journey/story";

/** Position as CSS variables: `--m*` on phones, `--d*` from the md breakpoint. */
function placeVars(mobile: Place, desktop: Place): CSSProperties {
  const v = (p: Place, k: "top" | "right" | "bottom" | "left") => p[k] ?? "auto";
  return {
    "--mt": v(mobile, "top"),
    "--mr": v(mobile, "right"),
    "--mb": v(mobile, "bottom"),
    "--ml": v(mobile, "left"),
    "--dt": v(desktop, "top"),
    "--dr": v(desktop, "right"),
    "--db": v(desktop, "bottom"),
    "--dl": v(desktop, "left"),
  } as CSSProperties;
}

const sizeClass: Record<NonNullable<Phrase["size"]>, string> = {
  statement: "story-text-statement",
  giant: "story-text-giant",
  final: "story-text-final",
};

/**
 * One phrase of the story over the film: rendered hidden, at its place for desktop and
 * phones, and shown at its moment by the story timeline (lib/journey/storyTimeline.ts)
 * or, for the jump, by its beat (lib/journey/jumpBeat.ts). Lines animate as whole
 * lines (`data-line`), each in its own mask when the phrase reveals with one.
 */
export function CinematicTextOverlay({ phrase, lines, ctaLabel }: { phrase: Phrase; lines: string[]; ctaLabel?: string }) {
  const first = phrase.in === 0 && phrase.shown === 0;
  const masked = phrase.enter === "mask" || phrase.enter === "statement";
  const align =
    phrase.desktop.align === "center" ? "text-center" : phrase.desktop.align === "right" ? "md:text-right" : "";

  return (
    <div
      className={`absolute [top:var(--mt)] [right:var(--mr)] [bottom:var(--mb)] [left:var(--ml)] md:[top:var(--dt)] md:[right:var(--dr)] md:[bottom:var(--db)] md:[left:var(--dl)] ${
        phrase.desktop.centerY ? "-translate-y-1/2" : ""
      } ${first ? "story-intro" : ""}`}
      style={placeVars(phrase.mobile, phrase.desktop)}
    >
      <div
        data-story={phrase.id}
        data-tone={phrase.tone}
        data-veil={phrase.veil ? "" : undefined}
        // Hidden until its moment (the opening phrase is visible from the start).
        className={`story ${first ? "" : "invisible opacity-0"}`}
      >
        <p className={`story-text ${phrase.size ? sizeClass[phrase.size] : ""} ${align}`}>
          {lines.map((line, i) =>
            masked ? (
              <span key={i} className="story-mask">
                <span data-line className="story-line">
                  {line}
                </span>
              </span>
            ) : (
              <span key={i} data-line className="story-line">
                {line}
              </span>
            ),
          )}
        </p>
        {ctaLabel ? (
          <div data-line className="mt-9 md:mt-11">
            {/* Not connected yet: there is no website-creation flow in this project. */}
            <button type="button" className="story-cta pointer-events-auto">
              {ctaLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Every phrase of the story, in the selected language. When the language changes the
 * lines are new elements, so the timeline is told to rebuild (`story:change`).
 */
export function StoryOverlays() {
  const { lang } = useLang();
  const root = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    if (mounted.current) root.current?.dispatchEvent(new Event("story:change", { bubbles: true }));
    mounted.current = true;
  }, [lang]);

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 z-10">
      {phrases.map((p) => (
        <CinematicTextOverlay key={p.id} phrase={p} lines={p.text[lang]} ctaLabel={p.id === "final" ? cta[lang] : undefined} />
      ))}
    </div>
  );
}
