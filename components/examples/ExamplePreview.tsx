import type { ExampleConcept } from "@/lib/examples";

/**
 * A stylised, code-drawn wireframe of a concept's homepage. Swap for real
 * screenshots later by adding an image field to `ExampleConcept`.
 */
export function ExamplePreview({ concept, large = false }: { concept: ExampleConcept; large?: boolean }) {
  const { background: bg, surface, ink, accent } = concept.palette;
  const line = (w: string, o = 0.18, h = "h-1.5") => (
    <span className={`block ${h} rounded-full`} style={{ width: w, backgroundColor: ink, opacity: o }} />
  );

  // Soft light falloff so solid blocks read as photography rather than flat fills.
  const photo = (color: string, opacity = 1) => ({
    background: `radial-gradient(120% 90% at 28% 18%, rgba(255,255,255,0.24), transparent 58%), ${color}`,
    opacity,
  });

  const body = () => {
    switch (concept.layout) {
      case "editorial":
        return (
          <div className="grid h-full grid-cols-5 gap-[4%] p-[5%]">
            <div className="col-span-3 flex flex-col justify-end" style={photo(surface)}>
              <div className="p-[8%]">
                <span className="block font-display text-[clamp(0.9rem,2.6vw,2rem)] leading-none italic" style={{ color: bg }}>
                  The Summer Edit
                </span>
                <span className="mt-3 block h-px w-1/3" style={{ backgroundColor: accent }} />
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-[8%]">
              <div className="flex-1" style={photo(accent, 0.6)} />
              <div className="space-y-2">
                {line("80%", 0.5, "h-2")}
                {line("60%")}
                {line("70%")}
              </div>
              <div className="flex-1" style={{ backgroundColor: ink, opacity: 0.12 }} />
            </div>
          </div>
        );
      case "product":
        return (
          <div className="flex h-full items-center gap-[6%] p-[6%]">
            <div className="space-y-3" style={{ width: "42%" }}>
              {line("90%", 0.65, "h-3")}
              {line("70%", 0.65, "h-3")}
              <div className="pt-2 space-y-2">
                {line("85%")}
                {line("75%")}
              </div>
              <span className="mt-3 inline-block rounded-full px-[10%] py-[4%]" style={{ backgroundColor: accent }}>
                <span className="block h-1.5 w-8 rounded-full" style={{ backgroundColor: bg }} />
              </span>
            </div>
            <div className="relative flex flex-1 items-center justify-center self-stretch" style={photo(surface)}>
              <span className="block h-[62%] w-[26%] rounded-t-full rounded-b-[18%]" style={{ backgroundColor: bg }} />
              <span
                className="absolute bottom-[14%] left-[18%] block h-[22%] w-[18%] rounded-full"
                style={{ backgroundColor: accent, opacity: 0.7 }}
              />
            </div>
          </div>
        );
      case "grid":
        return (
          <div className="flex h-full flex-col p-[5%]">
            <span className="font-sans text-[clamp(1rem,3.2vw,2.6rem)] leading-none font-extrabold tracking-tight uppercase" style={{ color: ink }}>
              Selected work
            </span>
            <div className="mt-[5%] grid flex-1 grid-cols-3 grid-rows-2 gap-[3%]">
              <div className="col-span-2 row-span-2" style={photo(surface)} />
              <div style={photo(ink, 0.85)} />
              <div style={{ backgroundColor: ink, opacity: 0.15 }} />
            </div>
          </div>
        );
      case "dashboard":
        return (
          <div className="flex h-full flex-col items-center p-[6%] text-center">
            <div className="w-[60%] space-y-2">
              {line("100%", 0.7, "h-2.5")}
              <span className="mx-auto block h-2.5 w-[70%] rounded-full" style={{ backgroundColor: ink, opacity: 0.7 }} />
            </div>
            <div className="mt-[5%] flex w-[80%] flex-1 gap-[3%] rounded-t-md p-[3%]" style={{ backgroundColor: surface }}>
              <div className="w-1/4 space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="block h-1.5 rounded-full bg-white" style={{ opacity: i === 0 ? 0.8 : 0.25 }} />
                ))}
              </div>
              <div className="flex flex-1 items-end gap-[6%]">
                {[45, 70, 55, 90, 65, 80].map((h, i) => (
                  <span key={i} className="block flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: accent, opacity: 0.5 + i * 0.08 }} />
                ))}
              </div>
            </div>
          </div>
        );
      case "menu":
        return (
          <div className="grid h-full grid-cols-2">
            <div className="flex flex-col justify-center gap-[6%] p-[8%]">
              <span className="font-display text-[clamp(0.9rem,2.4vw,1.8rem)] leading-none" style={{ color: ink }}>
                Tonight&apos;s menu
              </span>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  {line("55%", 0.35)}
                  <span className="h-px flex-1 border-b border-dotted" style={{ borderColor: ink, opacity: 0.3 }} />
                  {line("12%", 0.5)}
                </div>
              ))}
              <span className="mt-2 inline-block w-fit rounded-full px-4 py-1.5" style={{ backgroundColor: accent }}>
                <span className="block h-1.5 w-10 rounded-full" style={{ backgroundColor: bg }} />
              </span>
            </div>
            <div className="relative" style={photo(surface)}>
              <span className="absolute inset-[18%] rounded-full" style={{ backgroundColor: bg, opacity: 0.9 }} />
              <span className="absolute inset-[30%] rounded-full" style={{ backgroundColor: accent, opacity: 0.55 }} />
            </div>
          </div>
        );
      case "showcase":
        return (
          <div className="relative flex h-full flex-col justify-end p-[6%]">
            <div
              className="absolute inset-x-0 top-[18%] bottom-[30%]"
              style={{ background: `radial-gradient(60% 70% at 50% 60%, ${surface}, transparent)` }}
            />
            <svg viewBox="0 0 200 60" className="relative mx-auto w-[70%]" aria-hidden>
              <path d="M10 44 Q30 22 70 20 L120 18 Q150 18 172 34 L190 38 Q194 46 186 48 L14 48 Q6 48 10 44Z" fill={ink} opacity="0.85" />
              <circle cx="50" cy="48" r="9" fill={bg} stroke={accent} strokeWidth="2" />
              <circle cx="152" cy="48" r="9" fill={bg} stroke={accent} strokeWidth="2" />
            </svg>
            <div className="relative mt-[6%] flex items-end justify-between">
              <span className="font-display text-[clamp(0.9rem,2.4vw,1.8rem)] leading-none tracking-[0.12em] uppercase" style={{ color: ink }}>
                GT — 01
              </span>
              <span className="h-px w-1/4" style={{ backgroundColor: accent }} />
            </div>
          </div>
        );
    }
  };

  return (
    <div
      aria-hidden
      className={`relative flex w-full flex-col overflow-hidden ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`}
      style={{ backgroundColor: bg }}
    >
      {/* Browser chrome + site nav */}
      <div className="flex items-center justify-between px-[5%] py-[3%]" style={{ borderBottom: `1px solid ${ink}1a` }}>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ink, opacity: 0.25 }} />
          ))}
        </span>
        <span className="h-1.5 w-[16%] rounded-full" style={{ backgroundColor: ink, opacity: 0.55 }} />
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-4 rounded-full" style={{ backgroundColor: ink, opacity: 0.25 }} />
          ))}
        </span>
      </div>
      <div className="min-h-0 flex-1">{body()}</div>
    </div>
  );
}
