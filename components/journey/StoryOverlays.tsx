"use client";

import type { CSSProperties } from "react";
import { useLang } from "@/lib/i18n/lang";
import { cta, story, type Place, type StoryLine } from "@/lib/journey/story";

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

/**
 * The story lines over the journey film (copy and timing: lib/journey/story.ts). They
 * are rendered once, hidden; the film's scroll timeline (lib/journey/storyTimeline.ts)
 * shows each one at its moment. Only the words change with the language.
 */
export function StoryOverlays() {
  const { lang } = useLang();
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {story.map((line) => (
        <Overlay key={line.id} line={line} words={line.text[lang]} ctaLabel={line.id === "final" ? cta[lang] : undefined} />
      ))}
    </div>
  );
}

function Overlay({ line, words, ctaLabel }: { line: StoryLine; words: string[]; ctaLabel?: string }) {
  const first = line.id === "clouds";
  const right = line.desktop.align === "right";
  const mask = line.motion === "mask";
  const block = (
    <div
      data-story={line.id}
      data-tone={line.tone}
      data-veil={line.veil ? "" : undefined}
      // Hidden until the timeline shows it (the first line is visible from the start).
      className={`story ${first ? "" : "invisible opacity-0"}`}
    >
      <p className={`story-text ${line.id === "final" ? "story-text-final" : ""} ${right ? "md:text-right" : ""}`}>
        {words.map((w, i) =>
          mask ? (
            <span key={i} className="story-mask">
              <span data-line className="block">
                {w}
              </span>
            </span>
          ) : (
            <span key={i} data-line className="block">
              {w}
            </span>
          ),
        )}
      </p>
      {ctaLabel ? (
        <div data-line className="mt-8 md:mt-10">
          <button type="button" className="story-cta pointer-events-auto">
            {ctaLabel}
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={`absolute [top:var(--mt)] [right:var(--mr)] [bottom:var(--mb)] [left:var(--ml)] md:[top:var(--dt)] md:[right:var(--dr)] md:[bottom:var(--db)] md:[left:var(--dl)] ${
        line.desktop.centerY ? "-translate-y-1/2" : ""
      } ${first ? "story-intro" : ""}`}
      style={placeVars(line.mobile, line.desktop)}
    >
      {block}
    </div>
  );
}
