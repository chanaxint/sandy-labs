"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang, Phrase, Place } from "@/lib/journey/story";
import { applyLayout, designed, storyStore, toLayout, type StoryLayout, type StudioMode } from "@/lib/journey/storyStore";
import { isMessage, type Device, type ToSite, type ToStudio } from "@/lib/journey/studioProtocol";

const sizes: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1440, h: 900, label: "Desktop 1440×900" },
  mobile: { w: 390, h: 844, label: "Phone 390×844" },
};
const lastFrame = 5057;
const DRAFT = "sandy-studio-draft";

type FileHandle = { createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }> };
type SavePicker = (o: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileHandle>;

/**
 * The Studio: place, size and write the story's phrases on the real site, shown in an
 * iframe at desktop or phone size, then save them as story-layout.json (the file the
 * site reads, lib/journey/story-layout.json).
 */
export function Studio() {
  const initial = useMemo(() => storyStore.get(), []);
  const [phrases, setPhrases] = useState<Phrase[]>(initial.phrases);
  const [cta, setCta] = useState(initial.cta);
  const [selected, setSelected] = useState<string | null>(initial.phrases[0]?.id ?? null);
  const [device, setDevice] = useState<Device>("desktop");
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<StudioMode>("edit");
  const [frame, setFrame] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const handle = useRef<FileHandle | null>(null);

  const post = useCallback((m: ToSite) => frameRef.current?.contentWindow?.postMessage(m, location.origin), []);
  const say = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  };

  // A draft left from last time comes back.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT);
      if (!raw) return;
      const draft = JSON.parse(raw) as StoryLayout;
      // Restoring browser-held state once on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhrases(applyLayout(designed.phrases, draft));
      if (draft.cta) setCta(draft.cta);
      setHasDraft(true);
      setDirty(true);
    } catch {
      // No draft.
    }
  }, []);

  // Every change goes to the site and to the draft.
  useEffect(() => {
    post({ type: "state", phrases, cta, mode, selected, lang });
  }, [post, phrases, cta, mode, selected, lang]);
  useEffect(() => {
    if (!dirty) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify(toLayout(phrases, cta)));
    } catch {
      // Draft not kept; the session still works.
    }
  }, [dirty, phrases, cta]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isMessage<ToStudio>(e)) return;
      const m = e.data;
      if (m.type === "ready") {
        post({ type: "state", phrases, cta, mode, selected, lang });
        post({ type: "frame", frame });
      } else if (m.type === "frame") setFrame(m.frame);
      else if (m.type === "move") {
        setPhrases((all) => all.map((p) => (p.id === m.id ? { ...p, [m.device]: m.place } : p)));
        setDirty(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post, phrases, cta, mode, selected, lang, frame]);

  const current = phrases.find((p) => p.id === selected) ?? null;

  const change = (patch: Partial<Phrase>) => {
    if (!current) return;
    setPhrases((all) => all.map((p) => (p.id === current.id ? { ...p, ...patch } : p)));
    setDirty(true);
  };
  const changePlace = (patch: Partial<Place>) => current && change({ [device]: { ...current[device], ...patch } });

  const goTo = (f: number) => {
    const clamped = Math.max(0, Math.min(lastFrame, Math.round(f)));
    setFrame(clamped);
    post({ type: "frame", frame: clamped });
  };
  const select = (p: Phrase) => {
    setSelected(p.id);
    setMode("edit");
    goTo(p.interaction === "jump-freeze" ? p.shown : Math.max(p.shown, Math.min(p.out, p.shown + 20)));
  };
  const play = () => {
    if (!current) return;
    setMode("preview");
    const from = Math.max(0, current.in - 50);
    const to = Math.min(lastFrame, Number.isFinite(current.out) ? (current.gone ?? current.out) + 40 : lastFrame);
    post({ type: "play", from, to, seconds: ((to - from) / 60) * 1.4 });
  };

  const json = () => `${JSON.stringify(toLayout(phrases, cta), null, 2)}\n`;
  const saveToProject = async () => {
    const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
    if (!picker) return download();
    try {
      handle.current ??= await picker({
        suggestedName: "story-layout.json",
        types: [{ description: "Story layout", accept: { "application/json": [".json"] } }],
      });
      const w = await handle.current.createWritable();
      await w.write(json());
      await w.close();
      say("Saved. Send this file to Claude to put it on the site.");
    } catch {
      // Picker closed.
    }
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json()], { type: "application/json" }));
    a.download = "story-layout.json";
    a.click();
    URL.revokeObjectURL(a.href);
    say("Downloaded story-layout.json. Send it to Claude.");
  };
  const copy = async () => {
    await navigator.clipboard.writeText(json());
    say("Copied. Paste it to Claude.");
  };
  const resetPhrase = () => {
    if (!current) return;
    const base = initial.phrases.find((p) => p.id === current.id);
    if (base) change(base);
  };
  const resetAll = () => {
    if (!window.confirm("Discard every change and go back to the site as it is?")) return;
    setPhrases(initial.phrases);
    setCta(initial.cta);
    setDirty(false);
    setHasDraft(false);
    try {
      localStorage.removeItem(DRAFT);
    } catch {
      // Nothing stored.
    }
  };

  const scenes = useMemo(() => {
    const out: { id: string; phrases: Phrase[] }[] = [];
    for (const p of phrases) {
      const s = p.scene ?? "story";
      if (out.at(-1)?.id !== s) out.push({ id: s, phrases: [] });
      out.at(-1)!.phrases.push(p);
    }
    return out;
  }, [phrases]);

  return (
    <div className="flex h-dvh flex-col bg-[#15171a] font-sans text-[13px] text-neutral-200">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <h1 className="mr-3 text-sm font-semibold tracking-tight text-white">Story Studio</h1>
        <Segmented value={device} onChange={setDevice} options={[["desktop", "Desktop"], ["mobile", "Phone"]]} label="Device" />
        <Segmented value={lang} onChange={setLang} options={[["en", "EN"], ["tr", "TR"]]} label="Language" />
        <Segmented value={mode} onChange={setMode} options={[["edit", "Edit"], ["preview", "Play"]]} label="Mode" />
        <label className="ml-2 flex min-w-64 flex-1 items-center gap-2">
          <span className="text-neutral-400">Frame</span>
          <input
            type="range"
            min={0}
            max={lastFrame}
            value={frame}
            onChange={(e) => goTo(+e.target.value)}
            className="flex-1 accent-orange-400"
            aria-label="Film frame"
          />
          <input
            type="number"
            min={0}
            max={lastFrame}
            value={frame}
            onChange={(e) => goTo(+e.target.value)}
            className="w-20 rounded border border-white/15 bg-black/30 px-2 py-1 text-right tabular-nums"
            aria-label="Film frame number"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          {dirty ? <span className="text-orange-300">{hasDraft ? "Draft restored" : "Unsaved changes"}</span> : null}
          <Button onClick={saveToProject} primary>
            Save…
          </Button>
          <Button onClick={download}>Download</Button>
          <Button onClick={copy}>Copy JSON</Button>
          <Button onClick={resetAll}>Reset all</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Stage device={device} frameRef={frameRef} />

        <aside className="flex w-[400px] shrink-0 flex-col border-l border-white/10">
          <nav data-lenis-prevent className="max-h-[38%] overflow-y-auto border-b border-white/10 p-2" aria-label="Phrases">
            {scenes.map((s) => (
              <div key={s.id} className="mb-1.5">
                <p className="px-2 pt-1.5 pb-1 text-[11px] text-neutral-500">{s.id}</p>
                {s.phrases.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p)}
                    aria-current={p.id === selected}
                    className="flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left hover:bg-white/5 aria-[current=true]:bg-orange-400/15 aria-[current=true]:text-white"
                  >
                    <span className="truncate">{p.text[lang].join(" ")}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-neutral-500 tabular-nums">
                      {p.in}–{Number.isFinite(p.out) ? p.gone : "end"}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {current ? (
            <PhraseEditor
              key={current.id}
              phrase={current}
              device={device}
              frame={frame}
              cta={current.id === "final" ? cta : undefined}
              onCta={(v) => {
                setCta(v);
                setDirty(true);
              }}
              onChange={change}
              onPlace={changePlace}
              onAlign={(align) => post({ type: "align", id: current.id, align })}
              onGo={goTo}
              onPlay={play}
              onReset={resetPhrase}
            />
          ) : null}
        </aside>
      </div>

      {toast ? (
        <p role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm text-black shadow-lg">
          {toast}
        </p>
      ) : null}
    </div>
  );
}

/** The site in an iframe at the device's size, scaled to fit. */
function Stage({ device, frameRef }: { device: Device; frameRef: React.RefObject<HTMLIFrameElement | null> }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const { w, h, label } = sizes[device];
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min((el.clientWidth - 48) / w, (el.clientHeight - 64) / h, 1));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [w, h]);
  return (
    <div ref={box} className="relative flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[#0d0e10]">
      <p className="mb-3 text-[11px] text-neutral-500">
        {label} · drag the outlined phrase to move it ({device === "desktop" ? "desktop" : "phone"} layout)
      </p>
      <div style={{ width: w * scale, height: h * scale }} className="relative overflow-hidden rounded-md ring-1 ring-white/10">
        <iframe
          ref={frameRef}
          // Re-created per device, so the site lays out for that width.
          key={device}
          src="/?studio"
          title="Site preview"
          style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "0 0" }}
          className="block border-0 bg-white"
        />
      </div>
    </div>
  );
}

function PhraseEditor({
  phrase,
  device,
  frame,
  cta,
  onCta,
  onChange,
  onPlace,
  onAlign,
  onGo,
  onPlay,
  onReset,
}: {
  phrase: Phrase;
  device: Device;
  frame: number;
  cta?: Record<Lang, string>;
  onCta: (v: Record<Lang, string>) => void;
  onChange: (patch: Partial<Phrase>) => void;
  onPlace: (patch: Partial<Place>) => void;
  onAlign: (align: Place["align"]) => void;
  onGo: (f: number) => void;
  onPlay: () => void;
  onReset: () => void;
}) {
  const place = phrase[device];
  const stays = !Number.isFinite(phrase.out);
  const timing: { key: "in" | "shown" | "out" | "gone"; label: string }[] = [
    { key: "in", label: "Starts appearing" },
    { key: "shown", label: "Fully visible" },
    ...(stays
      ? []
      : [
          { key: "out" as const, label: "Starts leaving" },
          { key: "gone" as const, label: "Gone" },
        ]),
  ];
  const setText = (l: Lang, v: string) =>
    onChange({ text: { ...phrase.text, [l]: v.split("\n").map((s) => s.trimEnd()).filter((s, i, a) => s || i < a.length - 1) } });

  return (
    <div data-lenis-prevent className="flex-1 space-y-5 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white">{phrase.id}</h2>
        {phrase.interaction === "jump-freeze" ? (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">shown by the jump&apos;s freeze</span>
        ) : null}
        <div className="ml-auto flex gap-1.5">
          <Button onClick={onPlay}>Play it</Button>
          <Button onClick={onReset}>Reset</Button>
        </div>
      </div>

      <Section title="Text (one line per row)">
        {(["en", "tr"] as const).map((l) => (
          <label key={l} className="block">
            <span className="mb-1 block text-neutral-400">{l === "en" ? "English" : "Turkish"}</span>
            <textarea
              value={phrase.text[l].join("\n")}
              onChange={(e) => setText(l, e.target.value)}
              rows={Math.max(2, phrase.text[l].length)}
              className="w-full resize-y rounded border border-white/15 bg-black/30 px-2.5 py-2 font-serif text-[17px] leading-snug text-white"
            />
          </label>
        ))}
        {cta ? (
          <div className="grid grid-cols-2 gap-2">
            {(["en", "tr"] as const).map((l) => (
              <label key={l} className="block">
                <span className="mb-1 block text-neutral-400">Button ({l.toUpperCase()})</span>
                <input
                  value={cta[l]}
                  onChange={(e) => onCta({ ...cta, [l]: e.target.value })}
                  className="w-full rounded border border-white/15 bg-black/30 px-2 py-1.5"
                />
              </label>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title={`Place and size · ${device === "desktop" ? "desktop" : "phone"} (drag it on the preview)`}>
        <label className="flex items-center gap-3">
          <span className="w-16 text-neutral-400">Size</span>
          <input
            type="range"
            min={0.4}
            max={2.5}
            step={0.05}
            value={place.scale ?? 1}
            onChange={(e) => onPlace({ scale: +e.target.value })}
            className="flex-1 accent-orange-400"
          />
          <span className="w-12 text-right tabular-nums">{Math.round((place.scale ?? 1) * 100)}%</span>
        </label>
        <div className="flex items-center gap-3">
          <span className="w-16 text-neutral-400">Align</span>
          <Segmented
            value={place.align}
            onChange={onAlign}
            options={[["left", "Left"], ["center", "Centre"], ["right", "Right"]]}
            label="Align"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["top", "bottom", "left", "right"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <span className="w-12 text-neutral-400 capitalize">{k}</span>
              <input
                value={place[k] ?? ""}
                placeholder="auto"
                onChange={(e) => onPlace({ [k]: e.target.value || undefined })}
                className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 tabular-nums"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Look">
        <div className="flex items-center gap-3">
          <span className="w-16 text-neutral-400">Colour</span>
          <Segmented value={phrase.tone} onChange={(tone) => onChange({ tone })} options={[["light", "Light"], ["dark", "Dark"]]} label="Colour" />
          <label className="ml-auto flex items-center gap-2">
            <input type="checkbox" checked={!!phrase.veil} onChange={(e) => onChange({ veil: e.target.checked })} className="accent-orange-400" />
            Soft shade behind
          </label>
        </div>
        {phrase.interaction !== "jump-freeze" ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-neutral-400">Entrance</span>
              <select
                value={phrase.enter}
                onChange={(e) => onChange({ enter: e.target.value as Phrase["enter"] })}
                className="w-full rounded border border-white/15 bg-black/30 px-2 py-1.5"
              >
                <option value="rise">Fade, rising</option>
                <option value="mask">Mask reveal</option>
                <option value="statement">Slow mask (key line)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-neutral-400">Exit</span>
              <select
                value={phrase.exit}
                onChange={(e) => onChange({ exit: e.target.value as Phrase["exit"] })}
                className="w-full rounded border border-white/15 bg-black/30 px-2 py-1.5"
              >
                <option value="rise">Fade, rising</option>
                <option value="fade">Fade in place</option>
              </select>
            </label>
          </div>
        ) : null}
      </Section>

      <Section title="Timing (film frames, 60 per second of film)">
        {timing.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-32 text-neutral-400">{label}</span>
            <input
              type="number"
              value={(phrase[key] as number | undefined) ?? 0}
              onChange={(e) => onChange({ [key]: +e.target.value })}
              className="w-20 rounded border border-white/15 bg-black/30 px-2 py-1 text-right tabular-nums"
            />
            <Button onClick={() => onChange({ [key]: frame })}>= now ({frame})</Button>
            <Button onClick={() => onGo((phrase[key] as number | undefined) ?? 0)}>Go</Button>
          </div>
        ))}
        {phrase.interaction === "jump-freeze" ? (
          <p className="text-neutral-500">The film freezes on the take-off frame by itself; these frames only matter with reduced motion.</p>
        ) : null}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] text-neutral-500">{title}</h3>
      {children}
    </section>
  );
}

function Button({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2.5 py-1.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-400 ${
        primary ? "bg-orange-400 font-medium text-black hover:bg-orange-300" : "bg-white/8 hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded bg-white/8 p-0.5">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className="rounded px-2.5 py-1 aria-pressed:bg-white aria-pressed:text-black"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
