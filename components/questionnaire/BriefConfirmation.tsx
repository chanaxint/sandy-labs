"use client";

import { Check, Copy, Download, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { briefToText, type WebsiteBrief } from "@/lib/brief";

type BriefConfirmationProps = {
  brief: WebsiteBrief;
  onEdit: () => void;
  onStartOver: () => void;
};

function Block({ title, rows }: { title: string; rows: [string, string | undefined][] }) {
  const visible = rows.filter(([, v]) => v && v.length > 0);
  return (
    <div className="border-t border-ink/10 pt-6">
      <h4 className="eyebrow text-lagoon-700">{title}</h4>
      <dl className="mt-4 grid gap-4">
        {visible.map(([label, value]) => (
          <div key={label} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-6">
            <dt className="text-sm text-mist">{label}</dt>
            <dd className="text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function BriefConfirmation({ brief, onEdit, onStartOver }: BriefConfirmationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(briefToText(brief));
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2400);
  };

  const download = () => {
    const blob = new Blob([briefToText(brief)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sandy-labs-brief-${brief.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-lagoon-700 text-sand-50">
            <Check aria-hidden className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="mt-6 font-display text-3xl font-light tracking-[-0.02em] text-ink focus:outline-none sm:text-4xl"
          >
            Your website brief is ready.
          </h3>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
            Here is everything you described, organised into a single brief. It lives in this browser tab only —
            website generation and publishing aren&apos;t connected yet, so nothing has been sent or built.
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-mist">Ref. {brief.id}</p>
      </div>

      <div className="mt-10 grid gap-8">
        <Block
          title="Business"
          rows={[
            ["Name", brief.business.name],
            ["Industry", brief.business.industry],
            ["What it does", brief.business.description],
            ["Audience", brief.business.audience],
          ]}
        />
        <Block
          title="Design"
          rows={[
            ["Visual style", brief.design.style],
            ["Custom direction", brief.design.customDirection],
            ["Experience", brief.design.experiences.join(", ")],
          ]}
        />
        <Block
          title="Structure"
          rows={[
            ["Pages", brief.structure.pages.join(", ")],
            ["Additional features", brief.structure.additionalFeatures],
          ]}
        />
        <div className="border-t border-ink/10 pt-6">
          <h4 className="eyebrow text-lagoon-700">Additional requirements</h4>
          {brief.requirements.length ? (
            <ul className="mt-4 space-y-2.5">
              {brief.requirements.map((r, i) => (
                <li key={i} className="flex gap-3 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-ink">
                  <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-lagoon-500" />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-mist">None added.</p>
          )}
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-8">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-sand-50 transition-colors hover:bg-lagoon-900"
        >
          {copied === "copied" ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
          {copied === "copied" ? "Copied" : copied === "failed" ? "Copy unavailable" : "Copy brief"}
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          <Download aria-hidden className="h-4 w-4" />
          Download .txt
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:text-lagoon-700"
        >
          <Pencil aria-hidden className="h-4 w-4" />
          Edit answers
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-mist transition-colors hover:text-ink sm:ml-auto"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          Start a new brief
        </button>
        <p className="sr-only" aria-live="polite">
          {copied === "copied" ? "Brief copied to clipboard" : copied === "failed" ? "Copying is not available" : ""}
        </p>
      </div>
    </div>
  );
}
