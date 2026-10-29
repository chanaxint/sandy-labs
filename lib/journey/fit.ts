/**
 * Keeps every phrase on screen: a line that would run past the edge (a longer Turkish line,
 * a narrow window, a phrase placed near the edge in the Studio) makes its phrase smaller
 * until it fits the width, then moves it in from the edge it crosses. Phrases that fit are
 * left exactly as laid out. Sets `--fit` (text size factor) and `--fit-x` (shift) on each
 * phrase's place element (app/globals.css).
 */

/** Room kept free at the screen's edges (px); more on the right, where the progress line is. */
function margins() {
  const desktop = window.matchMedia("(min-width: 48rem)").matches;
  return desktop ? { left: 28, right: 64 } : { left: 16, right: 36 };
}

/** The painted extent of a phrase's text (its lines' text, not their boxes). */
function textBounds(place: HTMLElement) {
  let left = Infinity;
  let right = -Infinity;
  const range = document.createRange();
  for (const line of place.querySelectorAll<HTMLElement>("[data-line]")) {
    if (!line.textContent) continue;
    range.selectNodeContents(line);
    const r = range.getBoundingClientRect();
    if (!r.width) continue;
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
  }
  return right > left ? { left, right, width: right - left } : null;
}

export function fitPhrases(root: HTMLElement) {
  const area = root.getBoundingClientRect();
  if (!area.width) return;
  const m = margins();
  const min = area.left + m.left;
  const max = area.right - m.right;
  for (const place of root.querySelectorAll<HTMLElement>("[data-phrase-place]")) {
    place.style.setProperty("--fit", "1");
    place.style.setProperty("--fit-x", "0px");
    let b = textBounds(place);
    if (!b) continue;
    if (b.width > max - min) {
      place.style.setProperty("--fit", (((max - min) / b.width) * 0.99).toFixed(4));
      b = textBounds(place);
      if (!b) continue;
    }
    const dx = b.left < min ? min - b.left : b.right > max ? max - b.right : 0;
    if (dx) place.style.setProperty("--fit-x", `${Math.round(dx)}px`);
  }
}
