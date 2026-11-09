/**
 * Where the site's navigation leads: the home page's sections (after the journey) and
 * the service pages (from lib/ecosystem/services.ts). The menu, the service pages'
 * header and the footer all read from here.
 *
 * Reserved for later phases, not built: an account, a brand workspace and the Sandy
 * Dashboard (`plannedRoutes`); nothing links to them yet.
 */
import type { Localized } from "@/lib/i18n/types";

export type HomeSectionId = "introduction" | "ecosystem" | "platform" | "about" | "contact";

export const homeSections: { id: HomeSectionId; label: Localized }[] = [
  { id: "introduction", label: { en: "Sandy Labs", tr: "Sandy Labs" } },
  { id: "ecosystem", label: { en: "Ecosystem", tr: "Ekosistem" } },
  { id: "platform", label: { en: "Platform", tr: "Platform" } },
  { id: "about", label: { en: "About", tr: "Hakkımızda" } },
  { id: "contact", label: { en: "Contact", tr: "İletişim" } },
];

/** A home section's address from any page (a full load of the home page: see HomeEntry). */
export const homeHref = (id: HomeSectionId | "create") => `/#${id}`;

/** Later phases (not built, not linked): kept here so their addresses are settled. */
export const plannedRoutes = {
  account: "/account",
  workspace: "/workspace",
  dashboard: "/dashboard",
} as const;
