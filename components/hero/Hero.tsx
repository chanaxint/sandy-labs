"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { heroMedia } from "@/lib/media";
import { scrollToSection, sectionIds } from "@/lib/navigation";

/** A pre-rendered cloud layer (see scripts/hero/render-hero.mjs). */
function CloudImage({ name, className }: { name: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static art, already optimised
    <img src={`/media/hero/${name}.webp`} alt="" width={1200} height={720} decoding="async" className={className} />
  );
}

/**
 * Cinematic opening. Layers (ocean/island, cloud shadows, clouds) move at
 * different rates on scroll and pointer for depth; all motion is disabled
 * for reduced-motion users.
 */
export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      videoRef.current?.pause();
      return;
    }

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const render = () => {
      frame = 0;
      const h = root.offsetHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / h, 0), 1);
      root.style.setProperty("--p", progress.toFixed(4));
      root.style.setProperty("--mx", pointerX.toFixed(4));
      root.style.setProperty("--my", pointerY.toFixed(4));
    };
    // Nothing to update while the intro film covers the page.
    const covered = () => root.closest('[data-intro="active"]') !== null;
    const schedule = () => {
      if (!frame && !covered()) frame = requestAnimationFrame(render);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointerX = e.clientX / window.innerWidth - 0.5;
      pointerY = e.clientY / window.innerHeight - 0.5;
      schedule();
    };

    render();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  const layer = (depth: number, scroll: number): CSSProperties => ({
    transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px + var(--p, 0) * ${scroll}px), 0)`,
  });

  return (
    <section
      id={sectionIds.home}
      ref={rootRef}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-lagoon-900 text-sand-50"
    >
      {/* Background media */}
      <div aria-hidden={!heroMedia.video && !heroMedia.image} className="absolute inset-0 -z-10">
        <div className="absolute -inset-[6%] will-change-transform" style={layer(-14, 160)}>
          {heroMedia.video ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              src={heroMedia.video}
              poster={heroMedia.poster ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              aria-label={heroMedia.alt}
            />
          ) : heroMedia.image ? (
            <Image src={heroMedia.image} alt={heroMedia.alt} fill priority unoptimized className="object-cover" />
          ) : (
            <div className="animate-breathe h-full w-full">
              {/* Pre-rendered from IslandIllustration (scripts/hero/render-hero.mjs): painting
                  the live SVG filters made the page stutter. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- static art, already optimised */}
              <img
                src="/media/hero/island-2560.webp"
                srcSet="/media/hero/island-1280.webp 1280w, /media/hero/island-2560.webp 2560w"
                sizes="112vw"
                alt=""
                width={2560}
                height={1600}
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Cloud shadows sit on the water, clouds float above: parallax gives altitude */}
        <div className="pointer-events-none absolute inset-0 will-change-transform" style={layer(-22, 90)}>
          <CloudImage
            name="cloud-shadow-1"
            className="animate-cloud absolute top-[52%] left-[8%] w-[46vw] max-w-[720px] opacity-40 [--cloud-duration:70s]"
          />
          <CloudImage
            name="cloud-shadow-2"
            className="animate-cloud absolute top-[6%] right-[2%] w-[38vw] max-w-[600px] opacity-35 [--cloud-duration:85s]"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 will-change-transform" style={layer(-40, -40)}>
          <CloudImage
            name="cloud-1"
            className="animate-cloud absolute top-[44%] left-[3%] w-[46vw] max-w-[720px] opacity-90 [--cloud-duration:70s]"
          />
          <CloudImage
            name="cloud-2"
            className="animate-cloud absolute -top-[4%] right-[-4%] w-[38vw] max-w-[600px] opacity-80 [--cloud-duration:85s]"
          />
          <CloudImage
            name="cloud-3"
            className="animate-cloud absolute bottom-[-6%] right-[22%] w-[30vw] max-w-[480px] opacity-60 [--cloud-duration:95s]"
          />
        </div>

        {/* Legibility gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#04202a]/85 via-[#04202a]/25 to-[#04202a]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04202a]/70 via-[#04202a]/10 to-transparent" />
      </div>

      {/* Content */}
      <div
        className="relative mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-end px-5 pt-32 pb-14 sm:px-8 sm:pb-20 lg:px-14"
        style={{ opacity: "calc(1 - var(--p, 0) * 1.4)", transform: "translate3d(0, calc(var(--p, 0) * -60px), 0)" }}
      >
        <p className="eyebrow animate-rise text-lagoon-100/90" style={{ "--rise-delay": "150ms" } as CSSProperties}>
          A website studio, shaped like an island
        </p>
        <h1
          id="hero-title"
          className="mt-6 max-w-5xl font-display text-[clamp(3rem,9vw,8.5rem)] leading-[0.95] font-light tracking-[-0.035em] text-balance"
        >
          <span className="animate-rise block" style={{ "--rise-delay": "300ms" } as CSSProperties}>
            Your vision.
          </span>
          <span className="animate-rise block italic text-sand-100" style={{ "--rise-delay": "480ms" } as CSSProperties}>
            Your website.
          </span>
        </h1>

        <div className="mt-10 flex flex-col gap-8 sm:mt-12 md:flex-row md:items-end md:justify-between">
          <div className="animate-rise max-w-md" style={{ "--rise-delay": "700ms" } as CSSProperties}>
            <p className="text-lg leading-relaxed text-sand-100/90 sm:text-xl">
              Describe what you imagine. We&apos;ll help bring it to life.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => scrollToSection(sectionIds.create)}
                className="group inline-flex items-center gap-3 rounded-full bg-sand-50 py-4 pr-5 pl-7 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-white"
              >
                Start your website brief
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sand-50 transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(sectionIds.examples)}
                className="rounded-full px-4 py-4 text-sm font-semibold text-sand-50 underline-offset-[6px] hover:underline"
              >
                See example concepts
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollToSection(sectionIds.create)}
            className="animate-rise group hidden items-center gap-3 self-start text-sand-100/80 transition-colors hover:text-sand-50 md:flex md:self-end"
            style={{ "--rise-delay": "900ms" } as CSSProperties}
            aria-label="Scroll to the website brief"
          >
            <span className="eyebrow">Scroll to explore</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-sand-50/40 transition-colors group-hover:border-sand-50">
              <ArrowDown aria-hidden className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
