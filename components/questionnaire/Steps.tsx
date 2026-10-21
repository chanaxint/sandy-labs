"use client";

import { Info } from "lucide-react";
import {
  experiences,
  industries,
  motionHeavyExperiences,
  pages,
  visualStyles,
  type ExperienceId,
  type PageId,
  type StepErrors,
  type StyleId,
} from "@/lib/questionnaire";
import { useBrief } from "./BriefProvider";
import { TextAreaField, TextField } from "./Field";
import { OptionTile } from "./OptionTile";

type StepProps = { errors: StepErrors };

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-4 text-sm font-medium text-coral">
      {message}
    </p>
  );
}

function toggle<T>(list: T[], value: T, on: boolean) {
  return on ? (list.includes(value) ? list : [...list, value]) : list.filter((v) => v !== value);
}

/* ---------- Step 1 ---------- */
export function IndustryStep({ errors }: StepProps) {
  const { answers, update } = useBrief();
  return (
    <fieldset>
      <legend className="sr-only">Choose your industry</legend>
      <div className="grid gap-3 sm:grid-cols-2" data-invalid={errors.industry ? "industry" : undefined}>
        {industries.map((o) => (
          <OptionTile
            key={o.id}
            type="radio"
            name="industry"
            value={o.id}
            label={o.label}
            description={o.description}
            icon={o.icon}
            checked={answers.industry === o.id}
            onChange={() => update("industry", o.id)}
            describedBy={errors.industry ? "industry-error" : undefined}
          />
        ))}
      </div>
      <ErrorText id="industry-error" message={errors.industry} />
      {answers.industry === "other" ? (
        <div className="animate-fade mt-6 max-w-lg">
          <TextField
            id="industryOther"
            label="Which industry?"
            placeholder="e.g. Boutique travel, independent publishing"
            value={answers.industryOther}
            onChange={(e) => update("industryOther", e.target.value)}
            error={errors.industryOther}
            maxLength={80}
          />
        </div>
      ) : null}
    </fieldset>
  );
}

/* ---------- Step 2 ---------- */
export function BusinessStep({ errors }: StepProps) {
  const { answers, update } = useBrief();
  return (
    <div className="grid max-w-2xl gap-7">
      <TextField
        id="businessName"
        label="Brand or business name"
        placeholder="Your brand name"
        autoComplete="organization"
        value={answers.businessName}
        onChange={(e) => update("businessName", e.target.value)}
        error={errors.businessName}
        maxLength={80}
      />
      <TextAreaField
        id="businessDescription"
        label="What does the business do?"
        hint="What you offer, what makes it distinctive, and what you want visitors to do."
        placeholder="We make small-batch ceramics for restaurants and homes…"
        value={answers.businessDescription}
        onChange={(e) => update("businessDescription", e.target.value)}
        error={errors.businessDescription}
        maxLength={800}
      />
      <TextField
        id="targetAudience"
        label="Target audience"
        placeholder="e.g. Design-conscious homeowners aged 28–45"
        value={answers.targetAudience}
        onChange={(e) => update("targetAudience", e.target.value)}
        error={errors.targetAudience}
        maxLength={160}
      />
    </div>
  );
}

/* ---------- Step 3 ---------- */
const stylePreview: Record<StyleId, { bg: string; fg: string; accent: string; type: string; sample: string }> = {
  "luxury-editorial": { bg: "#f2ece2", fg: "#1c1a17", accent: "#a88a5b", type: "font-display italic font-light", sample: "Maison" },
  "minimal-elegant": { bg: "#f7f6f3", fg: "#2b2b2b", accent: "#c9c4ba", type: "font-sans font-light tracking-[0.2em] uppercase text-base", sample: "Quiet" },
  "bold-expressive": { bg: "#d24e2c", fg: "#fff6ea", accent: "#151515", type: "font-sans font-extrabold tracking-tight uppercase", sample: "LOUD" },
  "modern-corporate": { bg: "#e9eef0", fg: "#0f2a2e", accent: "#2c929a", type: "font-sans font-semibold tracking-tight", sample: "Clarity" },
  "nature-inspired": { bg: "#e3ebdf", fg: "#2c4c35", accent: "#b39466", type: "font-display font-normal", sample: "Terra" },
  custom: { bg: "#ffffff", fg: "#13201c", accent: "#13201c", type: "font-display font-light", sample: "Yours" },
};

function StyleSwatch({ id }: { id: StyleId }) {
  const s = stylePreview[id];
  return (
    <div
      aria-hidden
      className={`relative flex h-24 items-end justify-between overflow-hidden px-4 pb-3 ${id === "custom" ? "border border-dashed border-ink/25" : ""}`}
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span className={`text-3xl leading-none ${s.type}`}>{s.sample}</span>
      <span className="flex gap-1.5">
        {[s.fg, s.accent, s.bg].map((c, i) => (
          <span key={i} className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
        ))}
      </span>
    </div>
  );
}

export function StyleStep({ errors }: StepProps) {
  const { answers, update } = useBrief();
  return (
    <fieldset>
      <legend className="sr-only">Choose your visual style</legend>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visualStyles.map((o) => (
          <OptionTile
            key={o.id}
            type="radio"
            name="style"
            value={o.id}
            label={o.label}
            description={o.description}
            checked={answers.style === o.id}
            onChange={() => update("style", o.id)}
            preview={<StyleSwatch id={o.id} />}
            describedBy={errors.style ? "style-error" : undefined}
          />
        ))}
      </div>
      <ErrorText id="style-error" message={errors.style} />
      {answers.style === "custom" ? (
        <div className="animate-fade mt-6 max-w-2xl">
          <TextAreaField
            id="styleCustom"
            label="Describe your direction"
            hint="References, colours, moods or brands whose feel you admire."
            placeholder="Warm terracotta, hand-drawn details, generous whitespace…"
            value={answers.styleCustom}
            onChange={(e) => update("styleCustom", e.target.value)}
            error={errors.styleCustom}
            rows={3}
            maxLength={500}
          />
        </div>
      ) : null}
    </fieldset>
  );
}

/* ---------- Step 4 ---------- */
export function ExperienceStep({ errors }: StepProps) {
  const { answers, update } = useBrief();
  const wantsStatic = answers.experiences.includes("clean-static");
  const heavy = answers.experiences.filter((e) => motionHeavyExperiences.includes(e));

  return (
    <fieldset>
      <legend className="sr-only">Choose the experience (select all that apply)</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {experiences.map((o) => (
          <OptionTile
            key={o.id}
            type="checkbox"
            name="experiences"
            value={o.id}
            label={o.label}
            description={o.description}
            icon={o.icon}
            checked={answers.experiences.includes(o.id)}
            onChange={(on) => update("experiences", toggle<ExperienceId>(answers.experiences, o.id, on))}
            describedBy={errors.experiences ? "experiences-error" : undefined}
          />
        ))}
      </div>
      <ErrorText id="experiences-error" message={errors.experiences} />
      {wantsStatic && heavy.length > 0 ? (
        <p className="animate-fade mt-5 flex max-w-2xl gap-3 bg-lagoon-100/60 p-4 text-sm leading-relaxed text-lagoon-900" role="status">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          You&apos;ve chosen a clean, static experience alongside motion-led features. We&apos;ll note that motion
          should stay focused and minimal. Deselect either if that isn&apos;t what you mean.
        </p>
      ) : null}
    </fieldset>
  );
}

/* ---------- Step 5 ---------- */
export function PagesStep({ errors }: StepProps) {
  const { answers, update } = useBrief();
  const storeWithoutCheckout = answers.pages.includes("store") && !answers.pages.includes("checkout");

  return (
    <div className="grid gap-8">
      <fieldset>
        <legend className="sr-only">Select pages (select all that apply)</legend>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {pages.map((o) => (
            <OptionTile
              key={o.id}
              type="checkbox"
              name="pages"
              value={o.id}
              label={o.label}
              compact
              checked={answers.pages.includes(o.id)}
              onChange={(on) => update("pages", toggle<PageId>(answers.pages, o.id, on))}
              describedBy={errors.pages ? "pages-error" : undefined}
            />
          ))}
        </div>
        <ErrorText id="pages-error" message={errors.pages} />
        {storeWithoutCheckout ? (
          <p className="animate-fade mt-4 flex gap-3 text-sm text-ink-soft" role="status">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-lagoon-700" />
            <span>
              Selling online? You may also want{" "}
              <button
                type="button"
                className="font-semibold text-lagoon-700 underline underline-offset-4"
                onClick={() => update("pages", toggle<PageId>(answers.pages, "checkout", true))}
              >
                Cart and checkout
              </button>
              .
            </span>
          </p>
        ) : null}
      </fieldset>

      <div className="max-w-2xl">
        <TextAreaField
          id="additionalFeatures"
          label="Additional features"
          optional
          hint="Booking, newsletter sign-up, multilingual content, member area…"
          placeholder="List any other features you need"
          value={answers.additionalFeatures}
          onChange={(e) => update("additionalFeatures", e.target.value)}
          rows={3}
          maxLength={600}
        />
      </div>
    </div>
  );
}
