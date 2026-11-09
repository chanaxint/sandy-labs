"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { ServiceCard } from "@/components/ecosystem/ServiceCard";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SmartLink } from "@/components/ui/SmartLink";
import { services } from "@/lib/ecosystem/services";
import { useLang } from "@/lib/i18n/lang";
import { storyStore } from "@/lib/journey/storyStore";
import { home } from "@/lib/site/home";
import { homeHref } from "@/lib/site/nav";

/** After the valley: what Sandy Labs is (the introduction's title stands on the valley, WhatWeDo). */
export function HomeIntroduction() {
  const { lang } = useLang();
  const [first, second] = home.introduction.body;
  return (
    <Section tone="ivory" className="-mt-px">
      <div className="grid gap-10 md:grid-cols-12">
        <p className="display-3 md:col-span-7">{first[lang]}</p>
        <p className="lede md:col-span-4 md:col-start-9 md:self-end">{second[lang]}</p>
      </div>
    </Section>
  );
}

/** The four services, each a card leading to its page. */
export function HomeEcosystem() {
  const { lang } = useLang();
  const c = home.ecosystem;
  return (
    <Section id="ecosystem" tone="cream" labelledBy="ecosystem-title">
      <SectionHeading id="ecosystem-title" eyebrow={c.eyebrow[lang]} title={c.title[lang]} lede={c.lede[lang]} />
      <ul className="mt-14 grid gap-x-8 sm:grid-cols-2 md:mt-20 lg:grid-cols-4">
        {services.map((s) => (
          <li key={s.id}>
            <ServiceCard service={s} explore={c.explore[lang]} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Sandy Platform: the vision of one panel for a brand (in development; nothing here is built). */
export function HomePlatform() {
  const { lang } = useLang();
  const c = home.platform;
  return (
    <Section id="platform" tone="ivory" labelledBy="platform-title">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SectionHeading
            id="platform-title"
            eyebrow={c.eyebrow[lang]}
            aside={<span className="rounded-full border border-line px-3 py-1 text-[0.68rem] tracking-[0.14em]">{c.status[lang]}</span>}
            title={c.title[lang]}
            lede={c.lede[lang]}
          />
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          {/* A sketch of the panel: the brand's workspace and the four modules inside it. */}
          <div className="rounded-[1.25rem] border border-line bg-cream p-6 md:p-8">
            <p className="eyebrow">{c.workspace.title[lang]}</p>
            <p className="mt-3 text-[1rem] leading-relaxed text-ink/75">{c.workspace.note[lang]}</p>
            <p className="eyebrow mt-8">{c.modulesTitle[lang]}</p>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {services.map((s) => (
                <li key={s.id} className="flex items-baseline gap-4 py-4" style={{ "--accent": s.accent.base } as CSSProperties}>
                  <span aria-hidden className="size-2 shrink-0 translate-y-[-1px] rounded-full bg-[var(--accent)]" />
                  <span className="w-[8.5rem] shrink-0 font-serif text-[1.25rem]">{s.name}</span>
                  <span className="text-[0.95rem] text-stone">{s.platformModule[lang]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

/** About Sandy Labs: what it is becoming, and how it works. */
export function HomeAbout() {
  const { lang } = useLang();
  const c = home.about;
  return (
    <Section id="about" tone="cream" labelledBy="about-title">
      <SectionHeading id="about-title" eyebrow={c.eyebrow[lang]} title={c.title[lang]} lede={c.body[lang]} />
      <ul className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3">
        {c.principles.map((p) => (
          <li key={p.title.en} className="border-t border-line pt-6">
            <h3 className="display-3">{p.title[lang]}</h3>
            <p className="mt-3 max-w-[22rem] leading-relaxed text-ink/75">{p.note[lang]}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Contact: start a website now, or begin from a part of the ecosystem. */
export function HomeContact() {
  const { lang } = useLang();
  const c = home.contact;
  const cta = useSyncExternalStore(storyStore.subscribe, () => storyStore.get().cta, () => storyStore.get().cta);
  return (
    <Section id="contact" tone="beige" labelledBy="contact-title">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionHeading id="contact-title" eyebrow={c.eyebrow[lang]} title={c.title[lang]} lede={c.lede[lang]} />
          <div className="mt-10">
            <SmartLink href={homeHref("create")} className="btn btn-solid">
              {cta[lang]}
              <span aria-hidden>→</span>
            </SmartLink>
          </div>
        </div>
        <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
          <p className="eyebrow">{c.servicesTitle[lang]}</p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {services.map((s) => (
              <li key={s.id}>
                <SmartLink href={s.route} className="group flex items-center justify-between gap-4 py-4">
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: s.accent.base }} />
                    <span className="font-serif text-[1.3rem]">{s.name}</span>
                  </span>
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </SmartLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
