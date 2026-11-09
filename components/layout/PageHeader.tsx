"use client";

import { useEffect, useState } from "react";
import { SandyMark } from "@/components/brand/SandyLogo";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { SmartLink } from "@/components/ui/SmartLink";
import { services, type ServiceId } from "@/lib/ecosystem/services";
import { useLang } from "@/lib/i18n/lang";
import { copy } from "@/lib/site/copy";
import { home } from "@/lib/site/home";
import { homeHref, homeSections } from "@/lib/site/nav";

/**
 * The header of the pages beyond the journey (the service pages, and later ones): the
 * Sandy Labs mark (home), the four services, the language and contact. On phones the
 * services fold into a panel under the bar.
 */
export function PageHeader({ current }: { current?: ServiceId }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const contact = homeSections.find((s) => s.id === "contact")!.label[lang];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ivory/95 text-ink">
      <div className="mx-auto flex h-16 w-full max-w-[80rem] items-center justify-between gap-6 px-6 md:h-[4.5rem] md:px-10">
        <SmartLink href="/" className="flex items-center gap-2.5" ariaLabel={copy.home[lang]}>
          <SandyMark className="h-7 w-auto" weight={2.2} />
          <span className="font-serif text-[1.35rem] leading-none">Sandy Labs</span>
        </SmartLink>
        <nav aria-label={home.footer.services[lang]} className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[0.95rem]">
            {services.map((s) => (
              <li key={s.id}>
                <SmartLink href={s.route} current={s.id === current} className="text-link flex items-center gap-2 py-1">
                  <span aria-hidden className="size-1.5 rounded-full" style={{ background: s.accent.base }} />
                  {s.name}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-5">
          <LangSwitch label={home.footer.language[lang]} />
          <SmartLink href={homeHref("contact")} className="text-link hidden py-1 text-[0.95rem] sm:inline">
            {contact}
          </SmartLink>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="page-menu"
            aria-label={open ? copy.close[lang] : copy.menu[lang]}
            onClick={() => setOpen((o) => !o)}
            className="menu-toggle -mr-2 p-2 lg:hidden"
          >
            <span />
            <span />
          </button>
        </div>
      </div>
      {open ? (
        <nav id="page-menu" aria-label={copy.menu[lang]} className="border-t border-line bg-ivory lg:hidden">
          <ul className="mx-auto w-full max-w-[80rem] divide-y divide-line px-6 md:px-10">
            {services.map((s) => (
              <li key={s.id}>
                <SmartLink
                  href={s.route}
                  current={s.id === current}
                  onNavigate={() => setOpen(false)}
                  className="flex items-center gap-3 py-4 font-serif text-[1.4rem]"
                >
                  <span aria-hidden className="size-2 rounded-full" style={{ background: s.accent.base }} />
                  {s.name}
                </SmartLink>
              </li>
            ))}
            <li>
              <SmartLink href={homeHref("contact")} onNavigate={() => setOpen(false)} className="block py-4 text-[1rem]">
                {contact}
              </SmartLink>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
