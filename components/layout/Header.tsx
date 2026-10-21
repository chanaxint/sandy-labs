"use client";

import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { scrollToSection, sectionIds } from "@/lib/navigation";
import { MenuPanel } from "./MenuPanel";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus({ preventScroll: true });
  }, []);

  const solid = scrolled || open;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,color] duration-500 ease-[var(--ease-island)] ${
          solid ? "border-b border-ink/10 bg-sand-50/95 text-ink backdrop-blur-sm" : "border-b border-transparent text-sand-50"
        }`}
      >
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-[72px] sm:px-8">
          <div className="flex items-center">
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="group flex items-center gap-3"
            >
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-sand-50 text-ink shadow-[0_1px_0_rgba(19,32,28,0.08)] ring-1 ring-ink/10 transition-transform duration-300 group-hover:scale-105">
                <span
                  aria-hidden
                  className={`absolute h-[1.5px] w-[18px] bg-current transition-transform duration-500 ease-[var(--ease-island)] ${
                    open ? "rotate-45" : "-translate-y-[4px]"
                  }`}
                />
                <span
                  aria-hidden
                  className={`absolute h-[1.5px] w-[18px] bg-current transition-transform duration-500 ease-[var(--ease-island)] ${
                    open ? "-rotate-45" : "translate-y-[4px]"
                  }`}
                />
              </span>
              <span className="eyebrow hidden md:inline">{open ? "Close" : "Menu"}</span>
            </button>
          </div>

          <a
            href={`#${sectionIds.home}`}
            onClick={(e) => {
              e.preventDefault();
              close(false);
              scrollToSection(sectionIds.home);
            }}
            className="font-display text-[1.35rem] font-normal tracking-[-0.01em] whitespace-nowrap sm:text-2xl"
            aria-label="Sandy Labs — back to top"
          >
            Sandy<span className="italic text-lagoon-500"> Labs</span>
          </a>

          <div className="flex justify-end">
            <a
              href={`#${sectionIds.create}`}
              onClick={(e) => {
                e.preventDefault();
                close(false);
                scrollToSection(sectionIds.create);
              }}
              className={`group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold tracking-wide transition-colors duration-300 sm:px-5 sm:text-sm ${
                solid ? "bg-ink text-sand-50 hover:bg-lagoon-900" : "bg-sand-50 text-ink hover:bg-white"
              }`}
            >
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create your website</span>
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </header>

      <MenuPanel open={open} onClose={close} />
    </>
  );
}
