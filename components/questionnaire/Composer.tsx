"use client";

import { ArrowUp, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { createNote } from "@/lib/questionnaire";
import { useBrief } from "./BriefProvider";

type ComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
};

const MAX_LENGTH = 1200;

/**
 * Chat-style requirements composer. Each sent message becomes a requirement
 * note in the brief. There is no AI on the other end yet, so nothing replies;
 * notes simply collect above the input.
 */
export function Composer({ draft, onDraftChange }: ComposerProps) {
  const { answers, update } = useBrief();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();

  // Auto-grow the textarea up to a comfortable maximum.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [draft]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    update("notes", [...answers.notes, createNote(text)]);
    onDraftChange("");
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const removeNote = (id: string) => {
    update(
      "notes",
      answers.notes.filter((n) => n.id !== id),
    );
    textareaRef.current?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ul className="flex flex-col" aria-label="Your additional requirements">
        <AnimatePresence initial={false}>
          {answers.notes.map((note, i) => (
            <m.li
              key={note.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25 } }}
              style={{ originX: 1, originY: 1 }}
              className="flex justify-end pb-3 last:pb-5"
            >
              <div className="group relative max-w-[85%] rounded-[20px] rounded-br-[6px] bg-lagoon-900 py-3 pr-11 pl-5 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-sand-50">
                {note.text}
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  className="absolute top-2.5 right-2.5 rounded-full p-1 text-sand-50/60 transition-colors hover:bg-white/10 hover:text-sand-50"
                  aria-label={`Remove requirement ${i + 1}`}
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>

      <m.form
        layout="position"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="relative rounded-[26px] border border-ink/12 bg-white p-2.5 shadow-[0_24px_60px_-36px_rgba(10,54,64,0.55)] transition-[border-color,box-shadow] duration-300 focus-within:border-lagoon-500/60 focus-within:shadow-[0_24px_60px_-30px_rgba(10,54,64,0.6)]"
      >
        <label htmlFor="composer" className="sr-only">
          Anything else you want your website to include?
        </label>
        <textarea
          id="composer"
          ref={textareaRef}
          rows={2}
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Anything else you want your website to include?"
          aria-describedby={hintId}
          className="block max-h-[220px] min-h-[60px] w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base leading-relaxed text-ink placeholder:text-mist/90 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 pt-1 pr-1 pl-4">
          <p id={hintId} className="text-xs text-mist">
            <span className="hidden sm:inline">Enter to add · Shift + Enter for a new line</span>
            <span className="sm:hidden">Tap the arrow to add</span>
          </p>
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sand-50 transition-[background-color,opacity,transform] duration-300 hover:bg-lagoon-900 active:scale-95 disabled:bg-ink/15 disabled:text-ink/40"
            aria-label="Add requirement"
          >
            <ArrowUp aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        </div>
      </m.form>
    </div>
  );
}
