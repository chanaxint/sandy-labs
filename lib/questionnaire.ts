import type { LucideIcon } from "lucide-react";
import {
  Box,
  Briefcase,
  Building,
  Car,
  CircleDashed,
  Cpu,
  Dumbbell,
  Feather,
  Film,
  Flower2,
  Gauge,
  Gem,
  Leaf,
  MousePointerClick,
  Palette,
  PenTool,
  ScrollText,
  Shapes,
  ShoppingBag,
  Sparkles,
  Square,
  UtensilsCrossed,
  Zap,
} from "lucide-react";

export type Option<T extends string = string> = {
  id: T;
  label: string;
  description: string;
  icon?: LucideIcon;
};

export const industries = [
  { id: "ecommerce-fashion", label: "E-commerce / Fashion", description: "Collections, lookbooks and storefronts", icon: ShoppingBag },
  { id: "beauty-lifestyle", label: "Beauty & Lifestyle", description: "Rituals, products and brand stories", icon: Flower2 },
  { id: "portfolio-creative", label: "Portfolio / Creative Studio", description: "Work, process and personality", icon: PenTool },
  { id: "saas-technology", label: "SaaS / Technology", description: "Products, features and onboarding", icon: Cpu },
  { id: "restaurant-hospitality", label: "Restaurant / Hospitality", description: "Menus, rooms and reservations", icon: UtensilsCrossed },
  { id: "automotive", label: "Automotive", description: "Models, specifications and showrooms", icon: Car },
  { id: "real-estate-architecture", label: "Real Estate / Architecture", description: "Properties, projects and spaces", icon: Building },
  { id: "corporate-professional", label: "Corporate / Professional Services", description: "Expertise, teams and trust", icon: Briefcase },
  { id: "fitness-wellness", label: "Fitness / Wellness", description: "Classes, coaching and memberships", icon: Dumbbell },
  { id: "other", label: "Other", description: "Something else entirely", icon: CircleDashed },
] as const satisfies readonly Option[];

export const visualStyles = [
  { id: "luxury-editorial", label: "Luxury & Editorial", description: "Serif typography, generous space, magazine pacing", icon: Gem },
  { id: "minimal-elegant", label: "Minimal & Elegant", description: "Quiet layouts, restrained palette, precise details", icon: Feather },
  { id: "bold-expressive", label: "Bold & Expressive", description: "Large type, strong colour, confident motion", icon: Zap },
  { id: "modern-corporate", label: "Modern & Corporate", description: "Clear structure, credible and composed", icon: Square },
  { id: "nature-inspired", label: "Nature-Inspired", description: "Organic textures, earthy tones, soft light", icon: Leaf },
  { id: "custom", label: "Custom Direction", description: "Describe a direction of your own", icon: Palette },
] as const satisfies readonly Option[];

export const experiences = [
  { id: "3d-interactions", label: "3D interactions", description: "Objects or scenes users can explore", icon: Box },
  { id: "scroll-storytelling", label: "Scroll-based storytelling", description: "Content that unfolds as you scroll", icon: ScrollText },
  { id: "cinematic-video", label: "Cinematic video transitions", description: "Full-bleed footage between moments", icon: Film },
  { id: "subtle-animations", label: "Premium, subtle animations", description: "Gentle reveals and refined hover states", icon: Sparkles },
  { id: "fast-lightweight", label: "Fast and lightweight design", description: "Performance and clarity come first", icon: Gauge },
  { id: "interactive-products", label: "Interactive product displays", description: "Configurators, zoom and comparisons", icon: MousePointerClick },
  { id: "clean-static", label: "A clean, static experience", description: "Little to no motion, content-led", icon: Shapes },
] as const satisfies readonly Option[];

export const pages = [
  { id: "home", label: "Home", description: "" },
  { id: "about", label: "About", description: "" },
  { id: "products", label: "Products", description: "" },
  { id: "services", label: "Services", description: "" },
  { id: "portfolio", label: "Portfolio / Gallery", description: "" },
  { id: "contact", label: "Contact", description: "" },
  { id: "blog", label: "Blog", description: "" },
  { id: "store", label: "Online store", description: "" },
  { id: "checkout", label: "Cart and checkout", description: "" },
] as const satisfies readonly Option[];

export type IndustryId = (typeof industries)[number]["id"];
export type StyleId = (typeof visualStyles)[number]["id"];
export type ExperienceId = (typeof experiences)[number]["id"];
export type PageId = (typeof pages)[number]["id"];

/** Experiences that imply heavier motion; used to flag conflicts with a static preference. */
export const motionHeavyExperiences: ExperienceId[] = [
  "3d-interactions",
  "scroll-storytelling",
  "cinematic-video",
  "interactive-products",
];

export type RequirementNote = {
  id: string;
  text: string;
};

export type BriefAnswers = {
  industry: IndustryId | null;
  industryOther: string;
  businessName: string;
  businessDescription: string;
  targetAudience: string;
  style: StyleId | null;
  styleCustom: string;
  experiences: ExperienceId[];
  pages: PageId[];
  additionalFeatures: string;
  notes: RequirementNote[];
};

let noteCounter = 0;

export function createNote(text: string): RequirementNote {
  noteCounter += 1;
  return { id: `note-${Date.now().toString(36)}-${noteCounter}`, text };
}

export const emptyAnswers: BriefAnswers = {
  industry: null,
  industryOther: "",
  businessName: "",
  businessDescription: "",
  targetAudience: "",
  style: null,
  styleCustom: "",
  experiences: [],
  pages: ["home"],
  additionalFeatures: "",
  notes: [],
};

export const steps = [
  { id: "industry", label: "Industry", title: "Choose your industry", lead: "Where does your business live? This shapes structure, tone and the features we suggest." },
  { id: "business", label: "Business", title: "Tell us about your business", lead: "A few honest sentences are enough. You can refine everything later." },
  { id: "style", label: "Style", title: "Choose your visual style", lead: "Pick the direction that feels closest. It is a starting point, not a cage." },
  { id: "experience", label: "Experience", title: "Choose the experience", lead: "Select as many as you like. Not every website needs heavy motion or 3D — choose what suits your audience." },
  { id: "pages", label: "Pages", title: "Select pages and features", lead: "Which pages should your website include?" },
  { id: "details", label: "Details", title: "Anything else?", lead: "Add any final requirements in your own words, then create your brief." },
] as const;

export type StepId = (typeof steps)[number]["id"];

export type StepErrors = Partial<Record<keyof BriefAnswers, string>>;

/** Validates a single questionnaire step. Returns an empty object when valid. */
export function validateStep(step: StepId, a: BriefAnswers): StepErrors {
  const errors: StepErrors = {};
  switch (step) {
    case "industry":
      if (!a.industry) errors.industry = "Please choose the industry closest to your business.";
      else if (a.industry === "other" && a.industryOther.trim().length < 2)
        errors.industryOther = "Tell us which industry you're in.";
      break;
    case "business":
      if (a.businessName.trim().length < 2) errors.businessName = "Please enter your brand or business name.";
      if (a.businessDescription.trim().length < 10)
        errors.businessDescription = "Add a short description (at least 10 characters).";
      if (a.targetAudience.trim().length < 3) errors.targetAudience = "Who is the website for?";
      break;
    case "style":
      if (!a.style) errors.style = "Please choose a visual direction.";
      else if (a.style === "custom" && a.styleCustom.trim().length < 5)
        errors.styleCustom = "Describe your custom direction in a few words.";
      break;
    case "experience":
      if (a.experiences.length === 0) errors.experiences = "Choose at least one experience.";
      break;
    case "pages":
      if (a.pages.length === 0) errors.pages = "Choose at least one page.";
      break;
    case "details":
      break;
  }
  return errors;
}

export function labelFor<T extends string>(list: readonly Option<T>[], id: T | null): string {
  if (!id) return "";
  return list.find((o) => o.id === id)?.label ?? id;
}
