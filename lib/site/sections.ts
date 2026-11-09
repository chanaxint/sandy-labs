/**
 * Going to a place on the home page from its own controls (the menu, the header, the
 * section links): a section after the journey, or "create" (opens Create my website).
 * From other pages the same places are plain links to `/#id` (lib/site/nav.ts), which the
 * home page follows on load (components/home/HomeEntry.tsx).
 */
import { getLenis } from "@/lib/scroll/engine";
import { createStore, openCreate } from "@/lib/site/create";
import { introStore, releaseScroll } from "@/lib/site/intro";

/** Farther than this many screens away, the jump is immediate (no run through the film). */
const glideLimit = 2.5;

export function goToSection(id: string, opts: { smooth?: boolean } = {}): boolean {
  if (id === "create") {
    introStore.set("done");
    openCreate();
    return true;
  }
  const el = document.getElementById(id);
  const lenis = getLenis();
  if (!el || !lenis) return false;
  createStore.set("closed");
  introStore.set("done");
  releaseScroll();
  const far = Math.abs(el.getBoundingClientRect().top) > window.innerHeight * glideLimit;
  lenis.scrollTo(el, { immediate: !opts.smooth || far, force: true, duration: 1.1 });
  return true;
}
