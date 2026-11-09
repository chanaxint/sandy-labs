"use client";

import { SandyMark } from "@/components/brand/SandyLogo";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { SmartLink } from "@/components/ui/SmartLink";
import { services } from "@/lib/ecosystem/services";
import { useLang } from "@/lib/i18n/lang";
import { home } from "@/lib/site/home";
import { homeHref, homeSections } from "@/lib/site/nav";

/** The footer of every page: the brand, the ecosystem, the home page's sections, the language. */
export function SiteFooter() {
  const { lang } = useLang();
  const c = home.footer;
  return (
    <footer className="border-t border-line bg-ivory text-ink">
      <div className="mx-auto grid w-full max-w-[80rem] gap-12 px-6 py-16 md:grid-cols-12 md:px-10 md:py-20">
        <div className="md:col-span-5">
          <SmartLink href="/" className="inline-flex items-center gap-3" ariaLabel="Sandy Labs">
            <SandyMark className="h-8 w-auto" weight={2} />
            <span className="font-serif text-[1.6rem]">Sandy Labs</span>
          </SmartLink>
          <p className="mt-5 max-w-[22rem] leading-relaxed text-stone">{c.line[lang]}</p>
        </div>
        <nav aria-label={c.services[lang]} className="md:col-span-3 md:col-start-7">
          <p className="eyebrow">{c.services[lang]}</p>
          <ul className="mt-4 space-y-2.5">
            {services.map((s) => (
              <li key={s.id}>
                <SmartLink href={s.route} className="text-link">
                  {s.name}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={c.company[lang]} className="md:col-span-3">
          <p className="eyebrow">{c.company[lang]}</p>
          <ul className="mt-4 space-y-2.5">
            {homeSections
              .filter((s) => s.id !== "introduction")
              .map((s) => (
                <li key={s.id}>
                  <SmartLink href={homeHref(s.id)} className="text-link">
                    {s.label[lang]}
                  </SmartLink>
                </li>
              ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex w-full max-w-[80rem] items-center justify-between gap-6 border-t border-line px-6 py-6 text-[0.85rem] text-stone md:px-10">
        <p>© {new Date().getFullYear()} Sandy Labs</p>
        <LangSwitch label={c.language[lang]} />
      </div>
    </footer>
  );
}
