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
 * Written in the cloud (veils.ts): laid out in the middle of the screen, and carried by the
 * cloud, in the middle of its inside; shown for the whole of the cloud (`from` to `to`).
 */
const cloudPlace = {
  desktop: { top: "50%", left: "0", right: "0", align: "center", centerY: true } as Place,
  mobile: { top: "50%", left: phone.x, right: phone.x, align: "center", centerY: true } as Place,
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
    id: "island-reveal",
    // dawn-cloud umber; island sand
    ink: { light: "#f0dfc1", dark: "#392b1d" },
    phrases: [
      // Out of the cloud the island appears (460) and fills the frame until the cut to the
      // runway (586). (The opening's run stops here: components/site/IntroGate.tsx.)
      line({
        id: "island-1",
        text: { en: ["Because every journey", "begins with a simple idea."], tr: ["Çünkü her yolculuk,", "önce küçük bir fikirle başlar."] },
        in: 470,
        shown: 500,
        out: 556,
        gone: 578,
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
          en: ["And the right beginning can take", "that idea somewhere unexpected."],
          tr: ["Ve doğru başlangıç, o fikri", "hiç beklemediğin yerlere taşır."],
        },
        in: 880,
        shown: 882,
        out: 994,
        gone: 996,
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
          en: ["Sometimes the route changes,", "but the urge to explore never does."],
          tr: ["Bazen yol değişir;", "ama keşfetme isteği hep devam eder."],
        },
        in: 1600,
        shown: 1626,
        out: 1688,
        gone: 1708,
        tone: "dark",
      }),
    ],
  },
  {
    id: "norwegian-mountains",
    // glacier navy; ice
    ink: { light: "#c7e4ec", dark: "#183040" },
    phrases: [
      // The second plane flies up the fjord between the snow mountains (1790–2190).
      line({
        id: "mountains",
        text: { en: ["With every new horizon", "come new possibilities."], tr: ["Yeni bir manzarayla birlikte,", "yeni ihtimaller de belirir."] },
        in: 1880,
        shown: 1906,
        out: 1990,
        gone: 2012,
        tone: "light",
        // Over white rock / snow: a faint shade behind the words.
        veil: true,
      }),
    ],
  },
  {
    id: "snowboard",
    // steel navy; ice
    ink: { light: "#deedf2", dark: "#1c2f44" },
    phrases: [
      // Transition B: the plane's view of the peaks closes into cloud (2166–2490,
      // lib/journey/veils.ts), the cut to the snowboard slope (2196) happens inside it, and it
      // opens on the slope below the crest (gone at 2458); the line is written in the cloud.
      // It leads into the jump's line; it isn't shown again at the jump.
      line({
        id: "snowboard-a",
        text: { en: ["That's when you want", "to do more than watch…"], tr: ["İşte o zaman,", "sadece izlemek değil…"] },
        in: 2166,
        shown: 2168,
        out: 2456,
        gone: 2458,
        tone: "dark",
        ...cloudPlace,
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
          en: ["At Sandy Labs, that's exactly", "how we see websites."],
          tr: ["Biz Sandy Labs'ta, web sitelerine", "tam da böyle bakıyoruz."],
        },
        in: 3876,
        shown: 3900,
        out: 3950,
        gone: 3970,
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
      // The private jet climbs in (3975–4030) and holds the centre (4040–4190).
      line({
        id: "jet",
        text: {
          en: ["You share your idea; we turn it", "into an experience worth exploring."],
          tr: ["Sen fikrini anlatırsın; biz onu keşfedilecek", "bir deneyime dönüştürürüz."],
        },
        in: 4036,
        shown: 4062,
        out: 4150,
        gone: 4172,
        tone: "light",
        veil: true,
      }),
    ],
  },
  {
    id: "jet-leaves",
    // marine; warm ivory sand
    ink: { light: "#f7f1e4", dark: "#10253c" },
    phrases: [
      // The jet banks away and leaves (4200–4330): three lines close together, the last
      // the strongest and the longest.
      line({
        id: "value-1",
        text: { en: ["With immersive 3D worlds", "and fluid scroll animations."], tr: ["3D dünyalar ve", "akıcı scroll animasyonlarıyla."] },
        in: 4210,
        shown: 4236,
        out: 4292,
        gone: 4312,
        tone: "light",
        veil: true,
      }),
      line({
        id: "value-2",
        text: { en: ["What's more…"], tr: ["Üstelik…"] },
        in: 4322,
        shown: 4342,
        out: 4372,
        gone: 4390,
        tone: "light",
        veil: true,
      }),
      // The camera tilts up into the sky (4480–4580).
      line({
        id: "value-3",
        text: { en: ["In around 5 minutes."], tr: ["Yaklaşık 5 dakikada."] },
        in: 4400,
        shown: 4428,
        out: 4520,
        gone: 4550,
        tone: "light",
        size: "statement",
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
        in: 4650,
        shown: 4676,
        out: 4780,
        gone: 4806,
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

export const designedCta: Record<Lang, string> = { en: "Create My Website", tr: "Web Sitemi Oluştur" };
