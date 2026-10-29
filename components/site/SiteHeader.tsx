"use client";

import { AnimatePresence, domMax, LazyMotion, m, MotionConfig } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SandyMark } from "@/components/brand/SandyLogo";
import { useLang } from "@/lib/i18n/lang";
import { goToFrame } from "@/lib/journey/navigate";
import type { Lang } from "@/lib/journey/story";
import { storyStore } from "@/lib/journey/storyStore";
import { chapters, copy } from "@/lib/site/copy";
import { holdScroll, introStore, releaseScroll } from "@/lib/site/intro";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * The page's chrome: "Contact us" at the top left, the logo's mark at the top centre (back
 * to the start) once the journey has started, and the menu button at the top right.
 */
export function SiteHeader() {
  const { lang } = useLang();
  const intro = useSyncExternalStore(introStore.subscribe, introStore.get, () => "intro" as const);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  // The menu holds the scroll while open (and gives it back only if the journey has started).
  useEffect(() => {
    if (!open) return;
    holdScroll();
    const button = toggle.current;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (introStore.get() === "done") releaseScroll();
      button?.focus();
    };
  }, [open]);

  /** Close the menu and jump to a place in the film (this starts the journey if needed). */
  const goTo = (frame: number) => {
    setOpen(false);
    introStore.set("done");
    releaseScroll();
    goToFrame(frame);
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[60] text-snow">
        {/* Not connected yet: there is no contact page or address in this project. */}
        <button
          type="button"
          className="header-link brand-shadow pointer-events-auto absolute top-[18px] left-4 flex h-[26px] items-center px-2 text-[0.82rem] tracking-[0.04em] md:top-[22px] md:left-7 md:text-[0.9rem]"
        >
          {copy.contact[lang]}
        </button>
        <button
          type="button"
          data-header-mark
          onClick={() => goTo(0)}
          aria-label={copy.home[lang]}
          className={`header-mark brand-shadow pointer-events-auto absolute top-[16px] left-1/2 -translate-x-1/2 transition-opacity duration-300 md:top-[20px] ${
            intro === "done" ? "opacity-100" : "invisible opacity-0"
          }`}
        >
          <SandyMark className="block h-[30px] w-auto md:h-[38px]" weight={2.3} />
        </button>
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? copy.close[lang] : copy.menu[lang]}
          onClick={() => setOpen((o) => !o)}
          className="menu-toggle brand-shadow pointer-events-auto absolute top-[18px] right-4 p-2 md:top-[22px] md:right-7"
        >
          <span />
          <span />
        </button>
      </header>
      <SiteMenu open={open} lang={lang} onGo={goTo} onClose={() => setOpen(false)} />
    </>
  );
}

function SiteMenu({
  open,
  lang,
  onGo,
  onClose,
}: {
  open: boolean;
  lang: Lang;
  onGo: (frame: number) => void;
  onClose: () => void;
}) {
  const { setLang } = useLang();
  const cta = useSyncExternalStore(storyStore.subscribe, () => storyStore.get().cta, () => storyStore.get().cta);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {open ? (
            <m.div
              key="scrim"
              className="fixed inset-0 z-40 bg-[rgb(8_20_32/0.42)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease }}
              onClick={onClose}
            />
          ) : null}
          {open ? (
            <m.nav
              key="panel"
              id="site-menu"
              aria-label={copy.menu[lang]}
              data-lenis-prevent
              className="fixed top-0 right-0 z-50 flex h-dvh w-[min(26rem,100vw)] flex-col overflow-y-auto bg-ink px-8 pt-24 pb-10 text-snow md:px-12"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.6, ease }}
            >
              <p className="mb-5 text-sm text-snow/55">{copy.chaptersTitle[lang]}</p>
              <ol className="space-y-1.5">
                {chapters.map((c, i) => (
                  <m.li
                    key={c.id}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease, delay: 0.12 + i * 0.04 }}
                  >
                    <button
                      ref={i === 0 ? first : undefined}
                      type="button"
                      onClick={() => onGo(c.frame)}
                      className="font-serif text-[1.85rem] leading-tight text-snow/90 transition-colors duration-200 hover:text-white focus-visible:underline focus-visible:outline-none"
                    >
                      {c.label[lang]}
                    </button>
                  </m.li>
                ))}
              </ol>

              <div className="mt-auto pt-12">
                <div role="group" aria-label={copy.language[lang]} className="mb-8 flex gap-1 text-sm">
                  {(["en", "tr"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      lang={l}
                      aria-pressed={lang === l}
                      onClick={() => setLang(l)}
                      className="rounded-full px-3 py-1.5 text-snow/55 transition-colors hover:text-snow aria-pressed:bg-snow aria-pressed:text-ink"
                    >
                      {l === "en" ? "English" : "Türkçe"}
                    </button>
                  ))}
                </div>
                {/* Not connected yet: there is no website-creation flow in this project. */}
                <button type="button" className="story-cta">
                  {cta[lang]}
                </button>
              </div>
            </m.nav>
          ) : null}
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
