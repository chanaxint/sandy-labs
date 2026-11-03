import { Morph3DPreview } from "@/components/site/Morph3DPreview";
import type { DesignStyle } from "@/lib/site/create";

/**
 * A small moving picture of a design style, for the third step: a tiny page of abstract
 * shapes, not a screenshot. CSS keyframes on transform/opacity (app/globals.css, `.sp-*`),
 * except the 3D one's turning models (Morph3DPreview, a canvas); all hold still with
 * reduced motion. Decorative: the style's name labels it.
 */
export function StylePreview({ style }: { style: DesignStyle }) {
  return (
    <span aria-hidden className={`sp sp-${style}`}>
      {style === "minimal" ? (
        <>
          <span className="sp-l-frame" />
          <span className="sp-l-brand" lang="fr">MAISON</span>
          <span className="sp-l-title" lang="fr">Élégance</span>
          <span className="sp-l-line" />
          <span className="sp-l-arch" />
          <span className="sp-l-sheen" />
        </>
      ) : style === "modern" ? (
        <>
          <span className="sp-d-bar sp-d-bar1" />
          <span className="sp-d-bar sp-d-bar2" />
          <span className="sp-d-pill" />
          <span className="sp-d-card sp-d-card1" />
          <span className="sp-d-card sp-d-card2" />
          <span className="sp-d-card sp-d-card3" />
        </>
      ) : style === "3d" ? (
        <Morph3DPreview />
      ) : style === "cinematic" ? (
        <>
          <span className="sp-c-sun" />
          <span className="sp-c-far" />
          <span className="sp-c-near" />
          <span className="sp-c-caption" />
          <span className="sp-c-bar sp-c-top" />
          <span className="sp-c-bar sp-c-bottom" />
        </>
      ) : (
        <>
          <span className="sp-p-hero" />
          <span className="sp-p-nav" />
          <span className="sp-p-h sp-p-h1" />
          <span className="sp-p-h sp-p-h2" />
          <span className="sp-p-cta" />
          <span className="sp-p-dot" />
          <span className="sp-p-star" />
          <span className="sp-p-card sp-p-card1" />
          <span className="sp-p-card sp-p-card2" />
          <span className="sp-p-card sp-p-card3" />
        </>
      )}
    </span>
  );
}
