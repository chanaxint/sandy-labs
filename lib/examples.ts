import type { ExperienceId, IndustryId, PageId, StyleId } from "./questionnaire";

export type PreviewLayout = "editorial" | "product" | "grid" | "dashboard" | "menu" | "showcase";

/**
 * A design concept / example template. These are illustrative directions,
 * not client work. Add more entries here and the gallery renders them.
 */
export type ExampleConcept = {
  id: string;
  category: string;
  title: string;
  description: string;
  highlights: string[];
  layout: PreviewLayout;
  palette: {
    background: string;
    surface: string;
    ink: string;
    accent: string;
  };
  /** Questionnaire answers this concept pre-fills when used as a starting point. */
  preset: {
    industry: IndustryId;
    style: StyleId;
    experiences: ExperienceId[];
    pages: PageId[];
  };
};

export const exampleConcepts: ExampleConcept[] = [
  {
    id: "luxury-fashion",
    category: "Luxury fashion",
    title: "Runway Editorial",
    description:
      "A magazine-paced storefront where each collection opens like a feature spread, with full-bleed imagery and quiet product detail.",
    highlights: ["Lookbook chapters", "Editorial product pages", "Seamless cart and checkout"],
    layout: "editorial",
    palette: { background: "#f3eee6", surface: "#1b1916", ink: "#1b1916", accent: "#a88a5b" },
    preset: {
      industry: "ecommerce-fashion",
      style: "luxury-editorial",
      experiences: ["scroll-storytelling", "subtle-animations"],
      pages: ["home", "about", "products", "store", "checkout"],
    },
  },
  {
    id: "beauty-brand",
    category: "Beauty brand",
    title: "Ritual Skincare",
    description:
      "Soft, tactile product storytelling built around ingredients and routines, with interactive product views and a calm shopping flow.",
    highlights: ["Ingredient explorer", "Routine builder layout", "Product detail close-ups"],
    layout: "product",
    palette: { background: "#f4e8e1", surface: "#e3c9bb", ink: "#3d2a24", accent: "#b9735b" },
    preset: {
      industry: "beauty-lifestyle",
      style: "minimal-elegant",
      experiences: ["interactive-products", "subtle-animations"],
      pages: ["home", "about", "products", "blog", "store", "checkout"],
    },
  },
  {
    id: "creative-portfolio",
    category: "Creative portfolio",
    title: "Studio Index",
    description:
      "An index-style portfolio that lets the work lead: large case-study tiles, expressive type and transitions between projects.",
    highlights: ["Filterable project index", "Case-study templates", "Expressive page transitions"],
    layout: "grid",
    palette: { background: "#ecebe6", surface: "#d24e2c", ink: "#151515", accent: "#d24e2c" },
    preset: {
      industry: "portfolio-creative",
      style: "bold-expressive",
      experiences: ["cinematic-video", "scroll-storytelling"],
      pages: ["home", "about", "portfolio", "contact"],
    },
  },
  {
    id: "saas-platform",
    category: "SaaS platform",
    title: "Product Clarity",
    description:
      "A focused product site that explains a platform in a few confident scrolls, with feature walkthroughs and a lightweight build.",
    highlights: ["Feature walkthroughs", "Pricing layout", "Docs and changelog structure"],
    layout: "dashboard",
    palette: { background: "#eef2f1", surface: "#0f3b42", ink: "#0f2a2e", accent: "#2c929a" },
    preset: {
      industry: "saas-technology",
      style: "modern-corporate",
      experiences: ["fast-lightweight", "subtle-animations"],
      pages: ["home", "products", "services", "blog", "contact"],
    },
  },
  {
    id: "restaurant",
    category: "Restaurant",
    title: "Coastal Table",
    description:
      "A warm, appetising presence for a restaurant: seasonal menus, the story of the kitchen and a clear path to reserve a table.",
    highlights: ["Seasonal menu pages", "Reservation call-to-action", "Atmosphere gallery"],
    layout: "menu",
    palette: { background: "#f1e9da", surface: "#2f4a35", ink: "#22301f", accent: "#c0613f" },
    preset: {
      industry: "restaurant-hospitality",
      style: "nature-inspired",
      experiences: ["subtle-animations", "fast-lightweight"],
      pages: ["home", "about", "services", "portfolio", "contact"],
    },
  },
  {
    id: "automotive",
    category: "Automotive brand",
    title: "Grand Tourer",
    description:
      "A cinematic model showcase with immersive transitions, specification breakdowns and an explorable 3D vehicle moment.",
    highlights: ["Model showcase", "3D vehicle viewer", "Specification comparisons"],
    layout: "showcase",
    palette: { background: "#16191b", surface: "#2a2f33", ink: "#f2f0eb", accent: "#c9a76a" },
    preset: {
      industry: "automotive",
      style: "luxury-editorial",
      experiences: ["3d-interactions", "cinematic-video", "interactive-products"],
      pages: ["home", "products", "about", "contact"],
    },
  },
];
