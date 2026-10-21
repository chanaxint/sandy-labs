export type NavItem = {
  label: string;
  href: `#${string}`;
};

export const sectionIds = {
  home: "home",
  create: "create",
  examples: "examples",
  whatWeDo: "what-we-do",
  howItWorks: "how-it-works",
  contact: "contact",
} as const;

export const primaryNav: NavItem[] = [
  { label: "Home", href: `#${sectionIds.home}` },
  { label: "Example Websites", href: `#${sectionIds.examples}` },
  { label: "What We Do", href: `#${sectionIds.whatWeDo}` },
  { label: "How It Works", href: `#${sectionIds.howItWorks}` },
  { label: "Contact", href: `#${sectionIds.contact}` },
];

/** Smoothly scrolls to a section, respecting reduced-motion preferences. */
export function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}
