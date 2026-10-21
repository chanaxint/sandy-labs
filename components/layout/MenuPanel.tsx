"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { primaryNav, scrollToSection, sectionIds } from "@/lib/navigation";

type MenuPanelProps = {
  open: boolean;
  onClose: (returnFocus?: boolean) => void;
};

export function MenuPanel({ open, onClose }: MenuPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock page scroll, move focus into the menu, handle Escape and trap Tab.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const panel = panelRef.current;
    const firstLink = panel?.querySelector<HTMLElement>("a[href]");
    const focusTimer = window.setTimeout(() => firstLink?.focus({ preventScroll: true }), 80);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Trap focus within the menu panel plus the header toggle button.
      const toggle = document.querySelector<HTMLElement>('[aria-controls="site-menu"]');
      const focusables = [
        ...(toggle ? [toggle] : []),
        ...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      root.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const go = (id: string) => {
    onClose(false);
    // Wait a frame so the scroll lock is released before scrolling.
    requestAnimationFrame(() => scrollToSection(id));
  };

  return (
    <div
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        onClick={() => onClose()}
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-700 ease-[var(--ease-island)] ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        id="site-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`absolute inset-y-0 left-0 flex w-full max-w-[560px] flex-col overflow-y-auto bg-sand-50 px-6 pt-28 pb-10 transition-transform duration-700 ease-[var(--ease-island)] sm:px-12 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="eyebrow text-mist">Navigate the island</p>

        <nav aria-label="Primary" className="mt-8">
          <ol className="divide-y divide-ink/10 border-y border-ink/10">
            {primaryNav.map((item, i) => (
              <li
                key={item.href}
                className={`transition-[opacity,transform] duration-700 ease-[var(--ease-island)] ${
                  open ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0"
                }`}
                style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
              >
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.href.slice(1));
                  }}
                  className="group flex items-baseline gap-5 py-5 text-ink"
                >
                  <span className="w-6 font-sans text-xs tabular-nums text-mist">0{i + 1}</span>
                  <span className="font-display text-3xl font-light tracking-[-0.02em] transition-colors duration-300 group-hover:text-lagoon-700 sm:text-4xl">
                    {item.label}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="ml-auto h-5 w-5 self-center text-mist opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-auto pt-12">
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            Start with a guided brief. Describe your business, choose a direction, and leave with a clear summary of
            your website.
          </p>
          <button
            type="button"
            onClick={() => go(sectionIds.create)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-sand-50 transition-colors hover:bg-lagoon-900"
          >
            Create your website
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
