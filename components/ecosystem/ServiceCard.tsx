"use client";

import type { CSSProperties } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { useLang } from "@/lib/i18n/lang";
import type { Service } from "@/lib/ecosystem/services";

/** A service of the ecosystem as a card leading to its page (accent line, name, line, what it covers). */
export function ServiceCard({ service, explore, compact = false }: { service: Service; explore: string; compact?: boolean }) {
  const { lang } = useLang();
  return (
    <SmartLink
      href={service.route}
      className="card-link group h-full pt-7 pb-8 md:pt-8"
      style={{ "--accent": service.accent.base } as CSSProperties}
    >
      <p className="eyebrow flex items-center gap-3">
        <span>{service.index}</span>
        <span aria-hidden className="size-1.5 rounded-full" style={{ background: service.accent.base }} />
      </p>
      <h3 className="display-3 mt-5">{service.name}</h3>
      <p className="mt-3 max-w-[28rem] text-[1.05rem] leading-relaxed text-ink/75">{service.tagline[lang]}</p>
      {compact ? null : (
        <ul className="mt-6 space-y-1.5 text-[0.92rem] text-stone">
          {service.categories.map((c) => (
            <li key={c.id}>{c.name[lang]}</li>
          ))}
        </ul>
      )}
      <span className="mt-auto flex items-center gap-2 pt-8 text-[0.95rem]">
        {explore}
        <span aria-hidden className="card-arrow">
          →
        </span>
      </span>
    </SmartLink>
  );
}
