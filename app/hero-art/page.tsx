import { notFound } from "next/navigation";
import { Cloud, IslandIllustration } from "@/components/hero/IslandIllustration";

/**
 * Development-only source for `scripts/hero/render-hero.mjs`, which turns the
 * code-drawn hero art into the WebP images the homepage actually loads.
 */
export default function HeroArtPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main>
      <IslandIllustration className="h-[1000px] w-[1600px]" />
      <Cloud seed={21} shadow className="w-[600px]" />
      <Cloud seed={34} shadow className="w-[600px]" />
      <Cloud seed={21} className="w-[600px]" />
      <Cloud seed={34} className="w-[600px]" />
      <Cloud seed={57} className="w-[600px]" />
    </main>
  );
}
