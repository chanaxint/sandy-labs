/**
 * The story told over the journey film: scenes, each told in one or more phrases.
 *
 * Every phrase is timed in film frames (60 fps, 0 … film.frames - 1), so it stays tied
 * to its moment in the footage whatever the scroll pace (lib/journey/pace.ts maps frames
 * to scroll). Four points per phrase, each adjustable on its own:
 *   in    — starts appearing          shown — fully visible (reading starts)
 *   out   — starts leaving            gone  — fully hidden (omit to stay to the end)
 * The gap to the next phrase's `in` is the pause between them: the phrases are grouped
 * around the film's events, with stretches of film alone between. Comments name the visual
 * event each phrase follows. Every normal phrase stands at one fixed spot (`storyPlace`)
 * as a single block; `tone` is the text colour for the footage behind it.
 */

export type Lang = "en" | "tr";

export type Place = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  align: "left" | "right" | "center";
  /** Centre the block on `top`. */
  centerY?: boolean;
  /** Text size, relative to the phrase's size (1 = as designed). */
  scale?: number;
};

export type Phrase = {
  id: string;
  /** The scene the phrase belongs to (filled in from `scenes`). */
  scene?: string;
  /** The scene's text colours (filled in from `scenes`): the phrase uses the one for its tone. */
  ink?: Ink;
  /** Lines of the phrase (each language breaks its own lines). */
  text: Record<Lang, string[]>;
  in: number;
  shown: number;
  out: number;
  gone?: number;
  /**
   * rise: fades in rising ~16px; mask: lines slide up from behind their own edge;
   * statement: a larger, slower mask reveal for the key line; cut: no entrance at all,
   * it is simply there (the jump's freeze, lib/journey/jumpBeat.ts).
   */
  enter: "rise" | "mask" | "statement" | "cut";
  /** rise: fades out drifting up a little; fade: fades out in place. */
  exit: "rise" | "fade";
  tone: "light" | "dark";
  /** A faint local shade behind the words, for busy footage (never over the whole frame). */
  veil?: boolean;
  /** statement: larger type; giant: across the whole frame; final: the closing line. */
  size?: "statement" | "giant" | "final";
  /** jump-freeze: shown by the jump's beat (film holds, line cuts in), not by the scroll. */
  interaction?: "jump-freeze";
  desktop: Place;
  mobile: Place;
};

/**
 * A scene's text colours, one per tone, taken from its own footage: light text in the
 * colour of the scene's light, dark text in the colour of its shadows. Each is as rich as
 * legibility allows over the frames its phrases sit on (never much below plain snow or
 * ink there, and 7:1 or more where those reach it).
 */
export type Ink = { light: string; dark: string };

export type Scene = { id: string; ink: Ink; phrases: Phrase[] };

const phone = { x: "1.5rem" };


/** The rider heads for the lip: scrolling onto this frame hands the jump over to the film. */
export const jumpApproach = 3062;
/** In the air, the board seen exactly side-on (3112–3120): the freeze frame. */
export const jumpFrame = 3116;
/** Landed (3150), carved off to the left and gone from the frame (3222): the beat's own run ends and the scroll takes over again. */
export const jumpResume = 3224;

/**
 * Where every normal phrase stands: one fixed spot, low in the middle of the frame (under
 * the planes, the rider and the city, which hold the centre), so each new line takes the
 * place of the last while the film carries on behind. Only the jump's line has its own.
 */
const storyPlace = {
  desktop: { bottom: "clamp(3.5rem, 13vh, 8rem)", left: "0", right: "0", align: "center" } as Place,
  mobile: { bottom: "11vh", left: phone.x, right: phone.x, align: "center" } as Place,
};

/**
 * In the cloud (veils.ts): still, in the middle of the screen, there for the whole of the
 * cloud (`from` to `to`) but seen only where the cloud is behind it.
 */
const cloudPlace = {
  desktop: { top: "50%", left: "0", right: "0", align: "center", centerY: true } as Place,
  mobile: { top: "50%", left: phone.x, right: phone.x, align: "center", centerY: true } as Place,
};

/**
 * Where the lines with the private jet stand (10–11): the same spot higher up, in the sky
 * above the skyline, because the jet fills the lower middle of those shots; dark on the
 * pale sky. (Miami's own line, 09, keeps the story's place: its shot has little sky.)
 */
const skyPlace = {
  desktop: { top: "clamp(6.5rem, 15vh, 9.5rem)", left: "0", right: "0", align: "center" } as Place,
  mobile: { top: "16vh", left: phone.x, right: phone.x, align: "center" } as Place,
};

/** A normal phrase: one block, fading in rising a little, fading out in place, at the story's spot. */
const line = (p: Omit<Phrase, "enter" | "exit" | "desktop" | "mobile"> & Partial<Pick<Phrase, "enter" | "exit" | "desktop" | "mobile">>): Phrase => ({
  enter: "rise",
  exit: "fade",
  ...storyPlace,
  ...p,
});

export const scenes: Scene[] = [
  {
    id: "clouds",
    // dawn sky blue; cloud ivory
    ink: { light: "#f6f1e6", dark: "#24364a" },
    phrases: [
      // 02. Above the clouds (0–300), then into them (300–450), before the island. Shown as
      // the camera goes into the cloud, once the opening's drifting band has gone with it
      // (IntroClouds, ~315), dark on the white. The opening's run stops here
      // (components/site/IntroGate.tsx); the opening itself (01) is the start button's line
      // (lib/site/copy.ts).
      line({
        id: "clouds",
        text: {
          en: ["Let's see just how far", "an idea can take us."],
          tr: ["Bir fikrin bizi ne kadar ileri", "götürebileceğini birlikte görelim."],
        },
        in: 312,
        shown: 331,
        out: 424,
        gone: 440,
        tone: "dark",
      }),
    ],
  },
  {
    id: "island-reveal",
    // dawn-cloud umber; island sand
    ink: { light: "#f0dfc1", dark: "#392b1d" },
    phrases: [
      // Out of the cloud the island appears (460) and fills the frame until the cut to the
      // runway (586). (The opening's run stops here: components/site/IntroGate.tsx.)
      line({
        id: "island-1",
        text: { en: ["Because every journey", "begins with a small idea."], tr: ["Çünkü her yolculuk,", "önce küçük bir fikirle başlar."] },
        in: 462,
        shown: 482,
        out: 568,
        gone: 584,
        tone: "light",
        // Over white rock / snow: a faint shade behind the words.
        veil: true,
      }),
    ],
  },
  {
    id: "takeoff",
    // pine shade; sand
    ink: { light: "#f7f1e4", dark: "#252f1e" },
    phrases: [
      // Transition A: the take-off (600–912) closes into cloud (880–996, lib/journey/veils.ts),
      // the cut to the flight over the sea (908–918) happens inside it; the line is written in the cloud.
      line({
        id: "takeoff",
        text: {
          en: ["And the right beginning can take that idea", "to places you never imagined."],
          tr: ["Ve doğru başlangıç, o fikri", "hiç beklemediğin yerlere taşır."],
        },
        in: 880,
        shown: 882,
        out: 1070,
        gone: 1072,
        tone: "dark",
        ...cloudPlace,
      }),
    ],
  },
  {
    id: "aircraft-transition",
    // slate in the white-out; cloud white
    ink: { light: "#e2e8ee", dark: "#21303d" },
    phrases: [
      // The first plane flies into the cloud wall (1520) and is lost in it; nothing but
      // white until the second plane takes shape (1685–1720).
      line({
        id: "swap",
        text: {
          en: ["Sometimes the route changes.", "But the desire to explore never fades."],
          tr: ["Bazen yol değişir.", "Ama keşfetme isteği hiç bitmez."],
        },
        in: 1560,
        shown: 1582,
        out: 1694,
        gone: 1712,
        tone: "dark",
      }),
    ],
  },
  {
    id: "norwegian-mountains",
    // glacier navy; ice
    ink: { light: "#c7e4ec", dark: "#183040" },
    phrases: [
      // 06. The second plane flies up the fjord between the snow mountains (1790–2190) with
      // no line; the line is in cloud B over the peaks (2166–2458, lib/journey/veils.ts), as in
      // cloud A: still in the middle, brought out by the cloud as it rises, taken away as it
      // leaves.
      line({
        id: "mountains",
        text: { en: ["Because every new horizon", "brings new possibilities."], tr: ["Çünkü her yeni ufuk, beraberinde", "yeni ihtimaller getirir."] },
        in: 2166,
        shown: 2168,
        out: 2456,
        gone: 2458,
        tone: "dark",
        ...cloudPlace,
      }),
    ],
  },
  {
    id: "snowboard",
    // steel navy; ice
    ink: { light: "#deedf2", dark: "#1c2f44" },
    phrases: [
      // 07. Cloud B (06 in it) opens on the slope below the crest (2458), and the snowboarder
      // rides into the frame from the right (2470) to its middle (2490 on).
      // It leads into the jump's line; it isn't shown again at the jump.
      line({
        id: "snowboard-a",
        text: { en: ["That's when watching", "isn't enough…"], tr: ["İşte o zaman,", "sadece izlemek değil…"] },
        in: 2474,
        shown: 2510,
        out: 2650,
        gone: 2680,
        tone: "dark",
      }),
      {
        // The jump. From the approach the film plays by itself; at the freeze frame (board
        // side-on) it holds ~0.8 s and this cuts in, large, in the open sky either side of
        // the rider, his cut-out drawn in front of it (rider.ts); it fades as the film moves
        // on by itself. Phones: the frame is all rider, so it sits on the snow below.
        // in/out are used only with reduced motion (no freeze): a plain fade around the jump.
        id: "snowboard-b",
        text: { en: ["You want", "to feel it."], tr: ["Hissetmek", "istersin."] },
        in: jumpFrame - 30,
        shown: jumpFrame,
        out: jumpFrame + 30,
        gone: jumpResume,
        enter: "cut",
        exit: "fade",
        tone: "dark",
        size: "giant",
        interaction: "jump-freeze",
        desktop: { top: "27%", left: "0", right: "0", align: "center", centerY: true },
        mobile: { bottom: "8vh", left: "0", right: "0", align: "center" },
      },
    ],
  },
  {
    id: "miami-reveal",
    // deep marine; Miami sand
    ink: { light: "#f9f0e2", dark: "#163042" },
    phrases: [
      // Miami appears through the clouds (3860–3890); gone before the jet rises (~3975).
      line({
        id: "miami",
        text: {
          en: ["At Sandy Labs, that's exactly", "how we see brands."],
          tr: ["Biz Sandy Labs'ta, markalara", "tam da böyle bakıyoruz."],
        },
        in: 3866,
        shown: 3885,
        out: 3970,
        gone: 3986,
        tone: "light",
        veil: true,
      }),
    ],
  },
  {
    id: "jet-arrival",
    // sky marine; sand
    ink: { light: "#f6ecda", dark: "#11263f" },
    phrases: [
      // 10. The private jet climbs into the frame from below (3975–4030) and holds the
      // centre (4040–4190).
      line({
        id: "jet",
        text: {
          en: ["We shape their identities", "and digital worlds."],
          tr: ["Kimliklerini ve", "dijital dünyalarını tasarlıyoruz."],
        },
        in: 3992,
        shown: 4024,
        out: 4154,
        gone: 4180,
        tone: "dark",
        ...skyPlace,
      }),
    ],
  },
  {
    id: "jet-leaves",
    // marine; warm ivory sand
    ink: { light: "#f7f1e4", dark: "#10253c" },
    phrases: [
      // 11. The jet banks to the left and leaves (4200–4330); gone well before the camera
      // tilts up into the sky (4480–4580), which plays without a line.
      line({
        id: "jet-leaves",
        text: { en: ["We help them grow", "and make their work easier."], tr: ["Büyümelerine yardımcı oluyor,", "işlerini kolaylaştırıyoruz."] },
        in: 4196,
        shown: 4220,
        out: 4324,
        gone: 4344,
        tone: "dark",
        ...skyPlace,
      }),
    ],
  },
  {
    id: "day-to-night",
    // dusk; silver
    ink: { light: "#eff2f8", dark: "#171f36" },
    phrases: [
      // The sky darkens (4660–4800).
      line({
        id: "night",
        text: {
          en: ["Because every brand has", "a story waiting to be told."],
          tr: ["Çünkü her markanın, anlatılmayı", "bekleyen bir hikâyesi vardır."],
        },
        in: 4646,
        shown: 4675,
        out: 4816,
        gone: 4840,
        tone: "light",
      }),
    ],
  },
  {
    id: "finale",
    // night; moonlight silver-blue
    ink: { light: "#d5dff0", dark: "#171f36" },
    phrases: [
      // The night sky to the end of the film: stays, with the call to action.
      {
        id: "final",
        text: { en: ["Now it's time", "to tell yours."], tr: ["Şimdi sıra", "senin hikâyende."] },
        in: 4880,
        shown: 4930,
        out: Infinity,
        enter: "rise",
        exit: "fade",
        tone: "light",
        size: "final",
        // On the left, as one block with its call to action under it.
        desktop: { top: "56%", left: "clamp(1.5rem, 6vw, 6.5rem)", align: "left", centerY: true },
        mobile: { top: "52%", left: phone.x, right: phone.x, align: "left", centerY: true },
      },
    ],
  },
];

/**
 * Every phrase, in film order, as designed here. What the site shows is these with the
 * Studio's saved layout on top (story-layout.json, see storyStore.ts).
 */
export const designedPhrases: Phrase[] = scenes.flatMap((s) => s.phrases.map((p) => ({ ...p, scene: s.id, ink: s.ink })));

/** The closing line's call to action: opens Create my website (components/site/CreateFlow.tsx). Editable in the Studio. */
export const designedCta: Record<Lang, string> = { en: "Build Your Brand", tr: "Markanı Oluştur" };
/** Beside it, quieter: the ecosystem's four services, on the home page after the journey (#ecosystem). */
export const exploreCta: Record<Lang, string> = { en: "Explore Our Services", tr: "Hizmetleri Keşfet" };
