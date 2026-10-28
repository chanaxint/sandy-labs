"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
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
 * shows each one at its moment, word by word. When the language changes the words are
 * new elements, so the timeline is told to rebuild (`story:change`).
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
      {story.map((line) => (
        <Overlay key={line.id} line={line} words={line.text[lang]} ctaLabel={line.id === "final" ? cta[lang] : undefined} />
      ))}
    </div>
  );
}

function Overlay({ line, words, ctaLabel }: { line: StoryLine; words: string[]; ctaLabel?: string }) {
  const first = line.id === "clouds";
  const right = line.desktop.align === "right";
  const giant = line.size === "giant";
  const mask = line.motion === "mask";
  const size = giant ? "story-text-giant" : line.id === "final" ? "story-text-final" : "";

  return (
    <div
      className={`absolute [top:var(--mt)] [right:var(--mr)] [bottom:var(--mb)] [left:var(--ml)] md:[top:var(--dt)] md:[right:var(--dr)] md:[bottom:var(--db)] md:[left:var(--dl)] ${
        line.desktop.centerY ? "-translate-y-1/2" : ""
      } ${first ? "story-intro" : ""}`}
      style={placeVars(line.mobile, line.desktop)}
    >
      <div
        data-story={line.id}
        data-tone={line.tone}
        data-veil={line.veil ? "" : undefined}
        // Hidden until the timeline shows it (the first line is visible from the start).
        className={`story ${first ? "" : "invisible opacity-0"}`}
      >
        <p className={`story-text ${size} ${giant ? "text-center" : right ? "md:text-right" : ""}`}>
          {words.map((text, i) => (
            <span key={i} className="story-line">
              {text.split(" ").map((word, j, all) => (
                <span key={j}>
                  <span className={mask ? "story-mask" : "story-word"}>
                    <span data-word className="inline-block">
                      {word}
                    </span>
                  </span>
                  {j < all.length - 1 ? " " : null}
                </span>
              ))}
            </span>
          ))}
        </p>
        {ctaLabel ? (
          <div data-word className="mt-9 md:mt-11">
            <button type="button" className="story-cta pointer-events-auto">
              {ctaLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
