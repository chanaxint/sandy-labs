/**
 * Hero media configuration.
 *
 * The homepage ships with an illustrated, code-drawn aerial island (see
 * `components/hero/IslandIllustration.tsx`) so nothing depends on asset
 * files that do not exist yet.
 *
 * To use your own cinematic footage, drop the files into `public/media/`
 * and set the paths below, e.g.:
 *
 *   video: "/media/island-hero.mp4",
 *   poster: "/media/island-hero-poster.jpg",
 *
 * A video takes priority over an image. Both fall back to the illustration
 * when left as `null`. Remote URLs work too.
 */
export const heroMedia: {
  video: string | null;
  poster: string | null;
  image: string | null;
  alt: string;
} = {
  video: null,
  poster: null,
  image: null,
  alt: "Aerial view of a tropical island surrounded by turquoise water",
};
