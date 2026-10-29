/**
 * The story told over the journey film: scenes, each told in one or more phrases.
 *
 * Every phrase is timed in film frames (60 fps, 0 … film.frames - 1), so it stays tied
 * to its moment in the footage whatever the scroll pace (lib/journey/pace.ts maps frames
 * to scroll). Four points per phrase, each adjustable on its own:
 *   in    — starts appearing          shown — fully visible (reading starts)
 *   out   — starts leaving            gone  — fully hidden (omit to stay to the end)
 * The gap to the next phrase's `in` is the pause between them. Comments name the visual
 * event each phrase follows. `place` is per device (portrait phones see only the middle
 * of the frame, so phrases sit in its top or bottom band there); `tone` is the text
 * colour for the footage behind the phrase.
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

export type Scene = { id: string; phrases: Phrase[] };

const margin = { x: "clamp(1.5rem, 6vw, 6.5rem)", top: "clamp(5rem, 14vh, 9rem)", bottom: "clamp(3rem, 11vh, 7rem)" };
const phone = { x: "1.5rem", top: "5.5rem", bottom: "4.5rem" };

const topLeft: Place = { top: margin.top, left: margin.x, align: "left" };
const topRight: Place = { top: margin.top, right: margin.x, align: "right" };
const bottomLeft: Place = { bottom: margin.bottom, left: margin.x, align: "left" };
const phoneTop: Place = { top: phone.top, left: phone.x, right: phone.x, align: "left" };
const phoneBottom: Place = { bottom: phone.bottom, left: phone.x, right: phone.x, align: "left" };

/** The snowboarder's board leaves the lip (3103) and is clearly in the air: the freeze frame. */
export const jumpFrame = 3104;
/** Where the beat's own forward run ends and the scroll takes over again (just before landing). */
export const jumpResume = 3156;

export const scenes: Scene[] = [
  {
    id: "island-reveal",
    phrases: [
      {
        // Diving through the white cloud (330–455): dark text over the cloud.
        id: "island-1",
        text: { en: ["Because every journey…"], tr: ["Çünkü her yolculuk…"] },
        in: 345,
        shown: 392,
        out: 440,
        gone: 474,
        enter: "rise",
        exit: "rise",
        tone: "dark",
        desktop: topLeft,
        mobile: phoneTop,
      },
      {
        // The island clears from the clouds (~460) and fills the frame until the cut to
        // the runway (~585). It grows towards the bottom left, so the open sea at the top
        // left holds the phrase on desktop.
        id: "island-2",
        text: { en: ["…begins with", "a simple idea."], tr: ["Önce küçük bir", "fikirle başlar."] },
        in: 478,
        shown: 512,
        out: 552,
        gone: 582,
        enter: "mask",
        exit: "rise",
        tone: "light",
        veil: true,
        desktop: { ...topLeft, top: "clamp(3.5rem, 9vh, 6rem)" },
        mobile: phoneBottom,
      },
    ],
  },
  {
    id: "takeoff",
    phrases: [
      {
        // The first plane on the runway, starting to roll (600–800).
        id: "takeoff-1",
        text: { en: ["And the right beginning…"], tr: ["Ve doğru başlangıç…"] },
        in: 640,
        shown: 688,
        out: 768,
        gone: 804,
        enter: "rise",
        exit: "rise",
        tone: "light",
        desktop: topRight,
        mobile: { ...phoneTop, top: "17vh" },
      },
      {
        // It lifts off over the cliff (~905) and climbs over the sea; gone before the cloud
        // wall rises at the top right (~1030).
        id: "takeoff-2",
        text: {
          en: ["…can take that idea", "somewhere unexpected."],
          tr: ["…o fikri hiç beklemediğin", "yerlere taşır."],
        },
        in: 815,
        shown: 868,
        out: 975,
        gone: 1018,
        enter: "mask",
        exit: "rise",
        tone: "light",
        desktop: topRight,
        mobile: { ...phoneTop, top: "17vh" },
      },
    ],
  },
  {
    id: "aircraft-transition",
    phrases: [
      {
        // The first plane flies into the cloud wall (1520) and fades into it (gone ~1650).
        id: "swap-1",
        text: { en: ["Sometimes the route changes…"], tr: ["Bazen yol değişir…"] },
        in: 1528,
        shown: 1566,
        out: 1606,
        gone: 1634,
        enter: "rise",
        exit: "rise",
        tone: "dark",
        desktop: topLeft,
        mobile: phoneTop,
      },
      {
        // Nothing but white; the second plane takes shape (~1685) and is clear by ~1720:
        // the phrase is gone just before.
        id: "swap-2",
        text: { en: ["…but the urge to explore", "never does."], tr: ["Ama keşfetme isteği", "hep devam eder."] },
        in: 1638,
        shown: 1664,
        out: 1690,
        gone: 1712,
        enter: "rise",
        exit: "fade",
        tone: "dark",
        desktop: topLeft,
        mobile: phoneTop,
      },
    ],
  },
  {
    id: "norwegian-mountains",
    phrases: [
      {
        // The second plane flies up the fjord between the snow mountains (1790–2100); the
        // snowfield on the right, below the wing and above the dark shore, stays clear.
        id: "mountains-1",
        text: { en: ["With every new horizon…"], tr: ["Yeni bir manzarayla", "birlikte…"] },
        in: 1792,
        shown: 1840,
        out: 1922,
        gone: 1958,
        enter: "rise",
        exit: "rise",
        tone: "dark",
        // While the plane holds the centre its right wing reaches the snowfield: the bright
        // peaks at the top right instead.
        desktop: topRight,
        mobile: phoneTop,
      },
      {
        // The plane banks away to the left (~2100); before the cut to the peaks (2196).
        id: "mountains-2",
        text: { en: ["…come new possibilities."], tr: ["…yeni ihtimaller", "de belirir."] },
        in: 1964,
        shown: 2010,
        out: 2110,
        gone: 2150,
        enter: "mask",
        exit: "rise",
        tone: "dark",
        desktop: { bottom: "25vh", right: margin.x, align: "right" },
        mobile: phoneTop,
      },
    ],
  },
  {
    id: "snowboard",
    phrases: [
      {
        // The snowboarder rides in from the top right (~2476) and carves down the slope.
        id: "snowboard-a",
        text: { en: ["That's when,"], tr: ["İşte o zaman,"] },
        in: 2448,
        shown: 2505,
        out: 2570,
        gone: 2600,
        enter: "rise",
        exit: "rise",
        tone: "dark",
        // Below the dark ridge at the top, on open snow.
        desktop: { top: "25vh", left: margin.x, align: "left" },
        mobile: { ...phoneTop, top: "20vh" },
      },
      {
        // A short pause, then while he carves across the slope (2700–2880, centre right)
        // the open snow to his left holds the phrase; gone before he swings to the centre
        // and speeds up towards the jump.
        id: "snowboard-a2",
        text: { en: ["you want to do more", "than watch…"], tr: ["sadece izlemek", "değil…"] },
        in: 2660,
        shown: 2702,
        out: 2840,
        gone: 2882,
        enter: "rise",
        exit: "rise",
        tone: "dark",
        desktop: { top: "44%", right: "57.5%", align: "right" },
        mobile: { ...phoneTop, top: "20vh" },
      },
      {
        // The jump. At the freeze frame the film holds ~0.8 s and this cuts in, large, in
        // the open sky either side of the rider (arms out, he spans ~35–61% of the width),
        // his cut-out drawn in front of it (lib/journey/rider.ts); it fades as the film
        // moves on by itself. Phones: the frame is all rider, so it sits on the snow below.
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
    phrases: [
      {
        // The white-out over the city (3790–3860): dark text.
        id: "miami-1",
        text: { en: ["At Sandy Labs…"], tr: ["Biz Sandy Labs'ta…"] },
        in: 3790,
        shown: 3828,
        out: 3858,
        gone: 3884,
        enter: "rise",
        exit: "rise",
        tone: "dark",
        desktop: bottomLeft,
        mobile: phoneBottom,
      },
      {
        // Miami appears through the clouds (3860–3890). The skyline holds the top band and
        // the islands the middle, so the phrase sits on the open water at the bottom left;
        // gone before the jet's nose rises from the bottom (~3975).
        id: "miami-2",
        text: {
          en: ["…that's exactly how", "we see websites."],
          tr: ["Web sitelerine tam da", "böyle bakıyoruz."],
        },
        in: 3888,
        shown: 3914,
        out: 3944,
        gone: 3970,
        enter: "mask",
        exit: "fade",
        tone: "light",
        veil: true,
        // Below the marina, on the open water.
        desktop: { bottom: "clamp(2rem, 6vh, 4rem)", left: margin.x, align: "left" },
        mobile: phoneBottom,
      },
    ],
  },
  {
    id: "jet-arrival",
    phrases: [
      {
        // The private jet climbs into the frame from under the camera (3975–4030).
        id: "jet-1",
        text: { en: ["You share your idea…"], tr: ["Sen fikrini anlatırsın…"] },
        in: 3988,
        shown: 4026,
        out: 4076,
        gone: 4100,
        enter: "rise",
        exit: "rise",
        tone: "dark",
        desktop: { top: "clamp(2rem, 6vh, 4rem)", right: margin.x, align: "right" },
        mobile: phoneTop,
      },
      {
        // The jet holds the centre (4040–4190); gone before it banks and its right wing
        // sweeps up to the top right (~4200).
        id: "jet-2",
        text: {
          en: ["We turn it into an experience", "worth exploring."],
          tr: ["Biz onu keşfedilecek", "bir deneyime dönüştürürüz."],
        },
        in: 4102,
        shown: 4134,
        out: 4168,
        gone: 4192,
        enter: "mask",
        exit: "rise",
        tone: "dark",
        desktop: { top: "clamp(2rem, 6vh, 4rem)", right: margin.x, align: "right" },
        mobile: phoneTop,
      },
    ],
  },
  {
    id: "jet-leaves",
    phrases: [
      {
        // The jet banks left and leaves (4200–4330): the water right of it is open.
        id: "value-1",
        text: {
          en: ["With immersive 3D worlds", "and fluid scroll animations."],
          tr: ["3D dünyalar ve akıcı", "scroll animasyonlarıyla."],
        },
        in: 4206,
        shown: 4246,
        out: 4318,
        gone: 4348,
        enter: "rise",
        exit: "rise",
        tone: "light",
        veil: true,
        // The band of water between the skyline and the islands.
        desktop: { top: "51%", right: margin.x, align: "right" },
        mobile: phoneBottom,
      },
      {
        // Miami alone, the jet gone: a short pause.
        id: "value-2",
        text: { en: ["What's more…"], tr: ["Üstelik…"] },
        in: 4362,
        shown: 4384,
        out: 4416,
        gone: 4440,
        enter: "rise",
        exit: "fade",
        tone: "light",
        veil: true,
        desktop: { top: "51%", right: margin.x, align: "right" },
        mobile: phoneBottom,
      },
      {
        // The camera tilts up from the skyline into the sky (4480–4580): the key line, in
        // the sky above the city, held the longest.
        id: "value-3",
        text: { en: ["In around", "5 minutes."], tr: ["Yaklaşık", "5 dakikada."] },
        in: 4448,
        shown: 4510,
        out: 4612,
        gone: 4648,
        enter: "statement",
        exit: "rise",
        tone: "dark",
        size: "statement",
        desktop: { top: "clamp(2rem, 7vh, 4.5rem)", right: margin.x, align: "right" },
        mobile: phoneTop,
      },
    ],
  },
  {
    id: "day-to-night",
    phrases: [
      {
        // The sky darkens (4660–4800).
        id: "night-1",
        text: { en: ["Because every brand…"], tr: ["Çünkü her markanın…"] },
        in: 4654,
        shown: 4690,
        out: 4728,
        gone: 4752,
        enter: "rise",
        exit: "rise",
        tone: "light",
        desktop: bottomLeft,
        mobile: phoneBottom,
      },
      {
        // Gone as the first stars come out (~4820).
        id: "night-2",
        text: { en: ["…has a story", "waiting to be told."], tr: ["Anlatılmayı bekleyen", "bir hikâyesi vardır."] },
        in: 4756,
        shown: 4788,
        out: 4826,
        gone: 4852,
        enter: "mask",
        exit: "fade",
        tone: "light",
        desktop: bottomLeft,
        mobile: phoneBottom,
      },
    ],
  },
  {
    id: "finale",
    phrases: [
      {
        // The night sky to the end of the film: stays, with the call to action.
        id: "final",
        text: { en: ["Now it's time", "to tell yours."], tr: ["Şimdi sıra", "senin hikâyende."] },
        in: 4866,
        shown: 4950,
        out: Infinity,
        enter: "mask",
        exit: "fade",
        tone: "light",
        size: "final",
        desktop: { top: "56%", left: margin.x, align: "left", centerY: true },
        mobile: { top: "52%", left: phone.x, right: phone.x, align: "left", centerY: true },
      },
    ],
  },
];

/**
 * Every phrase, in film order, as designed here. What the site shows is these with the
 * Studio's saved layout on top (story-layout.json, see storyStore.ts).
 */
export const designedPhrases: Phrase[] = scenes.flatMap((s) => s.phrases.map((p) => ({ ...p, scene: s.id })));

export const designedCta: Record<Lang, string> = { en: "Create My Website", tr: "Web Sitemi Oluştur" };
