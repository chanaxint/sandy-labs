/**
 * The opening: before the journey starts, the full logo stands over the clouds with the
 * start button and the scroll is held; "leaving" while the logo's mark travels to the
 * top of the page; "done" once it sits there and the scroll is the visitor's.
 */
import { getLenis } from "@/lib/scroll/engine";

export type IntroState = "intro" | "leaving" | "done";

let state: IntroState = "intro";
const listeners = new Set<() => void>();

export const introStore = {
  get: () => state,
  set(next: IntroState) {
    if (state === next) return;
    state = next;
    for (const l of listeners) l();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

/**
 * Holds the scroll (the opening, the open menu). `scroll-held` keeps the scrollbar in
 * place with a mouse, so the page doesn't shift (app/globals.css).
 */
export function holdScroll() {
  document.documentElement.classList.add("scroll-held");
  getLenis()?.stop();
}

export function releaseScroll() {
  document.documentElement.classList.remove("scroll-held");
  getLenis()?.start();
}
