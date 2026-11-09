"use client";

import { AnimatePresence, domMax, LazyMotion, m, MotionConfig } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SandyMark } from "@/components/brand/SandyLogo";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { SmartLink } from "@/components/ui/SmartLink";
import { services } from "@/lib/ecosystem/services";
import { useLang } from "@/lib/i18n/lang";
import { goToFrame } from "@/lib/journey/navigate";
import type { Lang } from "@/lib/journey/story";
import { storyStore } from "@/lib/journey/storyStore";
import { copy } from "@/lib/site/copy";
import { createStore, openCreate } from "@/lib/site/create";
import { holdScroll, introStore, releaseScroll } from "@/lib/site/intro";
import { home } from "@/lib/site/home";
import { homeSections } from "@/lib/site/nav";
import { goToSection } from "@/lib/site/sections";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * The home page's chrome: "Contact us" at the top left (to the contact section), the logo's
 * mark at the top centre (back to the start) once the journey has started, and the menu
 * button at the top right. White over the film, ink over the corporate content (HomeEntry).
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
      // (Not while the creation steps hold it: the menu's call to action opens them.)
      if (introStore.get() === "done" && createStore.get() === "closed") releaseScroll();
      button?.focus();
    };
  }, [open]);

  /** Close the menu and jump to a place in the film (this starts the journey if needed). */
  const goTo = (frame: number) => {
    setOpen(false);
    createStore.set("closed");
    introStore.set("done");
    releaseScroll();
    goToFrame(frame);
  };

  return (
    <>
      <header className="site-header pointer-events-none fixed inset-x-0 top-0 z-[60] text-snow transition-colors duration-300">
        <button
          type="button"
          onClick={() => goToSection("contact", { smooth: true })}
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
      <SiteMenu
        open={open}
        lang={lang}
        onGo={goTo}
        onSection={(id) => {
          setOpen(false);
          goToSection(id);
        }}
        onCreate={() => {
          setOpen(false);
          introStore.set("done");
          openCreate();
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function SiteMenu({
  open,
  lang,
  onGo,
  onSection,
  onCreate,
  onClose,
}: {
  open: boolean;
  lang: Lang;
  onGo: (frame: number) => void;
  onSection: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
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
              // While it fades out it no longer takes clicks (what opened from the menu does).
              exit={{ opacity: 0, pointerEvents: "none" }}
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
              exit={{ x: "100%", pointerEvents: "none" }}
              transition={{ duration: 0.6, ease }}
            >
              <ul className="space-y-1">
                {[
                  { id: "home", label: copy.homeLink[lang], go: () => onGo(0) },
                  ...homeSections
                    .filter((x) => x.id !== "contact")
                    .map((x) => ({ id: x.id, label: x.label[lang], go: () => onSection(x.id) })),
                  { id: "create", label: cta[lang], go: onCreate },
                  { id: "contact", label: homeSections.find((x) => x.id === "contact")!.label[lang], go: () => onSection("contact") },
                ].map((item, i) => (
                  <m.li
                    key={item.id}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease, delay: 0.12 + i * 0.05 }}
                  >
                    <button
                      ref={i === 0 ? first : undefined}
                      type="button"
                      onClick={item.go}
                      className="font-serif text-[1.9rem] leading-tight text-snow/90 transition-colors duration-200 hover:text-white focus-visible:underline focus-visible:outline-none"
                    >
                      {item.label}
                    </button>
                  </m.li>
                ))}
              </ul>
              <m.div
                className="mt-10 border-t border-snow/15 pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: 0.45 }}
              >
                <p className="eyebrow text-snow/55">{home.footer.services[lang]}</p>
                <ul className="mt-3 space-y-2">
                  {services.map((s) => (
                    <li key={s.id}>
                      <SmartLink href={s.route} onNavigate={onClose} className="flex items-center gap-3 text-[1.05rem] text-snow/85 hover:text-white">
                        <span aria-hidden className="size-1.5 rounded-full" style={{ background: s.accent.soft }} />
                        {s.name}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
                <LangSwitch label={home.footer.language[lang]} className="mt-8 text-snow" />
              </m.div>
            </m.nav>
          ) : null}
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
