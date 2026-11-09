"use client";

import type { CSSProperties } from "react";
import { ServiceCard } from "@/components/ecosystem/ServiceCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SmartLink } from "@/components/ui/SmartLink";
import { getService, services, type ServiceId } from "@/lib/ecosystem/services";
import { useLang } from "@/lib/i18n/lang";
import { home } from "@/lib/site/home";
import { homeHref } from "@/lib/site/nav";
import { servicePage } from "@/lib/site/servicePage";

/**
 * One layout for every service of the ecosystem (app/[service]/page.tsx): its name and
 * line on its own accent, what it covers, its call to action, and the rest of the
 * ecosystem. Everything specific comes from lib/ecosystem/services.ts.
 */
export function ServicePage({ id }: { id: ServiceId }) {
  const { lang } = useLang();
  const service = getService(id)!;
  const others = services.filter((s) => s.id !== id);
  const c = servicePage;
  const accent = { "--accent": service.accent.base, "--accent-soft": service.accent.soft } as CSSProperties;

  return (
    <div style={accent} className="min-h-dvh bg-ivory text-ink">
      <PageHeader current={id} />
      <main>
        {/* The service: its place in the ecosystem, name, line and what it does. */}
        <section aria-labelledby="service-title" className="relative overflow-hidden bg-[var(--accent-soft)]">
          <div className="mx-auto w-full max-w-[80rem] px-6 pt-[clamp(8.5rem,20vh,12rem)] pb-[clamp(4.5rem,10vw,8rem)] md:px-10">
            <p className="eyebrow flex items-center gap-3">
              <SmartLink href={homeHref("ecosystem")} className="text-link">
                {c.ecosystem[lang]}
              </SmartLink>
              <span aria-hidden>·</span>
              <span>{service.index}</span>
            </p>
            <h1 id="service-title" className="display-1 mt-6">
              {service.name}
            </h1>
            <p className="display-3 mt-6 max-w-[40rem] text-ink/85">{service.tagline[lang]}</p>
            <p className="lede mt-6 max-w-[38rem]">{service.summary[lang]}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <SmartLink href={service.cta.href} className="btn btn-solid">
                {service.cta.label[lang]}
                <span aria-hidden>→</span>
              </SmartLink>
              <SmartLink href={homeHref("ecosystem")} className="btn btn-quiet">
                {c.allServices[lang]}
              </SmartLink>
            </div>
          </div>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--accent)]" />
        </section>

        {/* What it covers. */}
        <Section tone="ivory" labelledBy="categories-title">
          <SectionHeading id="categories-title" eyebrow={c.categoriesEyebrow[lang]} title={c.categoriesTitle[lang]} />
          <ol className="mt-12 grid gap-x-10 md:mt-16 md:grid-cols-2">
            {service.categories.map((cat, i) => (
              <li key={cat.id} className="flex gap-6 border-t border-line py-7">
                <span className="eyebrow w-8 shrink-0 pt-2 text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="display-3 text-[clamp(1.45rem,1.15rem+0.9vw,2rem)]">{cat.name[lang]}</h3>
                  <p className="mt-2 max-w-[30rem] leading-relaxed text-ink/75">{cat.note[lang]}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Where it will live in Sandy Platform (later phases). */}
        <Section tone="cream" labelledBy="platform-note-title">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-6">
              <p className="eyebrow flex flex-wrap items-center gap-3">
                <span>{home.platform.eyebrow[lang]}</span>
                <span className="rounded-full border border-line px-3 py-1 text-[0.68rem] tracking-[0.14em]">{home.platform.status[lang]}</span>
              </p>
              <h2 id="platform-note-title" className="display-3 mt-5">
                {service.platformModule[lang]}
              </h2>
            </div>
            <p className="lede md:col-span-5 md:col-start-8 md:self-end">{c.platformNote[lang].replace("{name}", service.name)}</p>
          </div>
        </Section>

        {/* The rest of the ecosystem. */}
        <Section tone="ivory" labelledBy="others-title">
          <SectionHeading id="others-title" eyebrow={home.ecosystem.eyebrow[lang]} title={c.othersTitle[lang]} />
          <ul className="mt-12 grid gap-x-8 md:mt-16 md:grid-cols-3">
            {others.map((s) => (
              <li key={s.id}>
                <ServiceCard service={s} explore={home.ecosystem.explore[lang]} compact />
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
