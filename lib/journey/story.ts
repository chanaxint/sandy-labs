/**
 * Story lines shown over the journey film, timed to what happens on screen.
 *
 * Times are film frames (60 fps, 0 … film.frames - 1), so a line stays tied to its
 * moment however fast the visitor scrolls. Each line has four points:
 *   in   — starts appearing        shown — fully visible
 *   out  — starts leaving          gone  — fully hidden (omit to stay to the end)
 * The comments give the visual event each one follows (see the frame studies in
 * README.md → "Story lines"). `place` sets where it sits on desktop and on phones
 * (portrait phones see only the middle quarter of the frame, so lines move to the
 * top or bottom band there); `tone` is the text colour for the footage behind it.
 */

export type Lang = "en" | "tr";

export type Place = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  align: "left" | "right";
  /** Centre the block on `top` (for a vertically centred line). */
  centerY?: boolean;
};

export type StoryLine = {
  id: string;
  /** Each entry is one line of the headline (same count in both languages). */
  text: Record<Lang, string[]>;
  in: number;
  shown: number;
  out: number;
  gone?: number;
  /**
   * haze: rises a little out of a soft blur (clouds, fog, dusk);
   * mask: lines slide up from behind a mask (crisp, bright shots);
   * drift: slides in sideways, with the camera (arrivals from one side).
   */
  motion: "haze" | "mask" | "drift";
  tone: "light" | "dark";
  /** A faint local shade behind the words, for busy footage (never over the whole frame). */
  veil?: boolean;
  desktop: Place;
  mobile: Place;
};

const margin = { x: "clamp(1.5rem, 6vw, 6.5rem)", top: "clamp(5rem, 14vh, 9rem)", bottom: "clamp(3rem, 11vh, 7rem)" };
const phone = { x: "1.5rem", top: "5.5rem", bottom: "4.5rem" };

const topLeft: Place = { top: margin.top, left: margin.x, align: "left" };
const topRight: Place = { top: margin.top, right: margin.x, align: "right" };
const bottomLeft: Place = { bottom: margin.bottom, left: margin.x, align: "left" };
const phoneTop: Place = { top: phone.top, left: phone.x, right: phone.x, align: "left" };
const phoneBottom: Place = { bottom: phone.bottom, left: phone.x, right: phone.x, align: "left" };

export const story: StoryLine[] = [
  {
    // Above the cloud sea (0–300), before the camera dives into the clouds (~320).
    // Shown from the first moment; its entrance plays on page load.
    id: "clouds",
    text: { en: ["Let's take a journey."], tr: ["Haydi, bir gezintiye çıkalım."] },
    in: 0,
    shown: 0,
    out: 210,
    gone: 285,
    motion: "haze",
    tone: "light",
    desktop: topLeft,
    mobile: phoneTop,
  },
  {
    // The island clears from the clouds (~455) and fills the frame until the cut to the
    // runway (~580). It grows from the centre towards the bottom left, so the open sea at
    // the top left holds the line on desktop; phones (all island) get a faint veil.
    id: "island",
    text: { en: ["Everything starts", "with an idea."], tr: ["Her şey bir", "fikirle başlar."] },
    in: 452,
    shown: 482,
    out: 540,
    gone: 572,
    motion: "mask",
    tone: "light",
    veil: true,
    desktop: { ...topLeft, top: "clamp(3.5rem, 9vh, 6rem)" },
    mobile: phoneBottom,
  },
  {
    // The first plane lifts off over the cliff (~905) and climbs over the sea; the cloud
    // wall rises top-right from ~1030, so the line is gone before it.
    id: "takeoff",
    text: { en: ["Imagine it.", "We'll bring it to life."], tr: ["Hayal et.", "Gerisini bize bırak."] },
    in: 880,
    shown: 920,
    out: 985,
    gone: 1022,
    motion: "drift",
    tone: "light",
    desktop: topRight,
    // Below the pale horizon, over the sea.
    mobile: { ...phoneTop, top: "17vh" },
  },
  {
    // The first plane fades into the cloud (gone ~1650); the second one takes shape in
    // the fog (~1685) and is clear by ~1720: the line lives in the white between.
    id: "swap",
    text: { en: ["One idea.", "Endless possibilities."], tr: ["Bir fikir.", "Sonsuz olasılık."] },
    in: 1612,
    shown: 1645,
    out: 1682,
    gone: 1712,
    motion: "haze",
    tone: "dark",
    desktop: topLeft,
    mobile: phoneTop,
  },
  {
    // The second plane flies up the fjord towards the snow mountains (1790–2080); the
    // snowfield on the right, below the wing and above the dark shore, stays clear while
    // the plane holds the centre. Phones: the bright peaks at the top.
    id: "mountains",
    text: { en: ["Experiences", "beyond the ordinary."], tr: ["Sıradanın ötesinde", "deneyimler."] },
    in: 1800,
    shown: 1840,
    out: 1990,
    gone: 2030,
    motion: "mask",
    tone: "dark",
    desktop: { bottom: "25vh", right: margin.x, align: "right" },
    mobile: phoneTop,
  },
  {
    // The snowboarder rides in from the top right (~2476) and carves to the centre; the
    // line leaves before he crosses towards the left (~2650).
    id: "rider",
    text: { en: ["Feel the motion."], tr: ["Hareketi hisset."] },
    in: 2440,
    shown: 2482,
    out: 2580,
    gone: 2622,
    motion: "drift",
    tone: "dark",
    // Below the dark ridge at the top, on open snow.
    desktop: { top: "25vh", left: margin.x, align: "left" },
    mobile: { ...phoneTop, top: "20vh" },
  },
  {
    // Miami appears through the clouds (3850–3890); gone before the jet's nose rises
    // from the bottom (~3975). The skyline holds the top band and the islands the
    // middle, so the line sits on the open water at the bottom left.
    id: "miami",
    text: { en: ["3D. Motion.", "Design without limits."], tr: ["3D. Animasyon.", "Sınır tanımayan tasarım."] },
    in: 3850,
    shown: 3892,
    out: 3935,
    gone: 3968,
    motion: "haze",
    tone: "light",
    veil: true,
    desktop: bottomLeft,
    mobile: phoneBottom,
  },
  {
    // The private jet climbs into the frame from under the camera (3975–4030) and holds
    // the centre; it banks left from ~4190, its right wing sweeping up to the top right,
    // so the line is gone by then.
    id: "jet",
    text: { en: ["In around", "5 minutes."], tr: ["Yaklaşık", "5 dakikada."] },
    in: 3992,
    shown: 4030,
    out: 4140,
    gone: 4180,
    motion: "mask",
    tone: "dark",
    desktop: { top: "clamp(2rem, 6vh, 4rem)", right: margin.x, align: "right" },
    mobile: phoneTop,
  },
  {
    // The camera tilts up into the sky (4500–4580) and the day turns to night (4640–4800).
    id: "night",
    text: { en: ["More than a website.", "An experience."], tr: ["Sadece bir site değil.", "Bir deneyim."] },
    in: 4632,
    shown: 4690,
    out: 4790,
    gone: 4836,
    motion: "haze",
    tone: "light",
    desktop: bottomLeft,
    mobile: phoneBottom,
  },
  {
    // The night sky to the end of the film: stays, with the call to action.
    id: "final",
    text: { en: ["The next journey", "is yours."], tr: ["Sıradaki yolculuk", "senin."] },
    in: 4870,
    shown: 4940,
    out: Infinity,
    motion: "haze",
    tone: "light",
    desktop: { top: "50%", left: margin.x, align: "left", centerY: true },
    mobile: { top: "50%", left: phone.x, right: phone.x, align: "left", centerY: true },
  },
];

export const cta: Record<Lang, string> = { en: "Create Your Website", tr: "Web Siteni Oluştur" };
