import type { DesignStyle } from "@/lib/site/create";

/**
 * A small moving picture of a design style, for the third step: abstract shapes on a
 * tiny page, not a screenshot. CSS keyframes on transform/opacity (app/globals.css,
 * `.sp-*`); they hold still with reduced motion. Decorative: the style's name labels it.
 */
export function StylePreview({ style }: { style: DesignStyle }) {
  return (
    <span aria-hidden className={`sp sp-${style}`}>
      {style === "minimal" ? (
        <>
          <span className="sp-m-nav" />
          <span className="sp-m-title" />
          <span className="sp-m-line" />
          <span className="sp-m-sub" />
          <span className="sp-m-item" />
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
        <>
          <span className="sp-3-glow" />
          <span className="sp-3-scene">
            <span className="sp-3-cube">
              {["front", "back", "right", "left", "top", "bottom"].map((f) => (
                <span key={f} className={`sp-3-face sp-3-${f}`} />
              ))}
            </span>
          </span>
        </>
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
          <span className="sp-f-blob sp-f-b1" />
          <span className="sp-f-blob sp-f-b2" />
          <span className="sp-f-blob sp-f-b3" />
          <span className="sp-f-blob sp-f-b4" />
          <span className="sp-f-squiggle" />
          <span className="sp-f-bar" />
        </>
      )}
    </span>
  );
}
