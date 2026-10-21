import {
  experiences,
  industries,
  labelFor,
  pages,
  visualStyles,
  type BriefAnswers,
} from "./questionnaire";

/**
 * A structured website brief. This is the payload a future generation
 * backend would receive; today it is only assembled and shown on the client.
 */
export type WebsiteBrief = {
  id: string;
  createdAt: string;
  business: {
    name: string;
    industry: string;
    description: string;
    audience: string;
  };
  design: {
    style: string;
    customDirection?: string;
    experiences: string[];
  };
  structure: {
    pages: string[];
    additionalFeatures?: string;
  };
  requirements: string[];
};

function createId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SL-${stamp}-${rand}`;
}

export function buildBrief(a: BriefAnswers): WebsiteBrief {
  const industry =
    a.industry === "other" ? a.industryOther.trim() || "Other" : labelFor(industries, a.industry);

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    business: {
      name: a.businessName.trim(),
      industry,
      description: a.businessDescription.trim(),
      audience: a.targetAudience.trim(),
    },
    design: {
      style: labelFor(visualStyles, a.style),
      customDirection: a.style === "custom" ? a.styleCustom.trim() : undefined,
      experiences: a.experiences.map((id) => labelFor(experiences, id)),
    },
    structure: {
      pages: a.pages.map((id) => labelFor(pages, id)),
      additionalFeatures: a.additionalFeatures.trim() || undefined,
    },
    requirements: a.notes.map((n) => n.text.trim()).filter(Boolean),
  };
}

/** Plain-text rendering of a brief, used for copying and downloading. */
export function briefToText(b: WebsiteBrief): string {
  const lines = [
    `SANDY LABS — WEBSITE BRIEF`,
    `Reference: ${b.id}`,
    `Created: ${new Date(b.createdAt).toLocaleString()}`,
    ``,
    `BUSINESS`,
    `Name: ${b.business.name}`,
    `Industry: ${b.business.industry}`,
    `What it does: ${b.business.description}`,
    `Audience: ${b.business.audience}`,
    ``,
    `DESIGN`,
    `Visual style: ${b.design.style}`,
    ...(b.design.customDirection ? [`Custom direction: ${b.design.customDirection}`] : []),
    `Experience: ${b.design.experiences.join(", ")}`,
    ``,
    `STRUCTURE`,
    `Pages: ${b.structure.pages.join(", ")}`,
    ...(b.structure.additionalFeatures ? [`Additional features: ${b.structure.additionalFeatures}`] : []),
    ``,
    `ADDITIONAL REQUIREMENTS`,
    ...(b.requirements.length ? b.requirements.map((r) => `- ${r}`) : ["- None"]),
  ];
  return lines.join("\n");
}
