/**
 * Keeps every phrase on screen: text that would run past an edge (a longer Turkish line,
 * an extra line, a narrow window, a phrase placed near the edge in the Studio) makes its
 * phrase smaller until it fits, then moves it in from the edge it crosses. Phrases that fit
 * are left exactly as laid out. Sets `--fit` (text size factor), `--fit-x` and `--fit-y`
 * (shifts) on each phrase's place element (app/globals.css).
 */

/**
 * Room kept free at the screen's edges (px): more on the right, where the progress line
 * is, and at the top, where the header is.
 */
function margins() {
  const desktop = window.matchMedia("(min-width: 48rem)").matches;
  return desktop ? { left: 28, right: 64, top: 76, bottom: 24 } : { left: 16, right: 36, top: 64, bottom: 18 };
}

/**
 * The extent of a phrase's text: across, its lines' text (not their boxes); up and down,
 * the phrase's own box, which the lines' entrance offsets (transforms) don't move.
 */
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
  const box = place.querySelector("[data-story]")?.getBoundingClientRect();
  if (!box || right <= left) return null;
  return { left, right, top: box.top, bottom: box.bottom, width: right - left, height: box.height };
}

export function fitPhrases(root: HTMLElement) {
  const area = root.getBoundingClientRect();
  if (!area.width) return;
  const m = margins();
  const min = area.left + m.left;
  const max = area.right - m.right;
  const minY = area.top + m.top;
  const maxY = area.bottom - m.bottom;
  for (const place of root.querySelectorAll<HTMLElement>("[data-phrase-place]")) {
    place.style.setProperty("--fit", "1");
    place.style.setProperty("--fit-x", "0px");
    place.style.setProperty("--fit-y", "0px");
    let b = textBounds(place);
    if (!b) continue;
    const scale = Math.min(1, (max - min) / b.width, (maxY - minY) / b.height);
    if (scale < 1) {
      place.style.setProperty("--fit", (scale * 0.99).toFixed(4));
      b = textBounds(place);
      if (!b) continue;
    }
    const dx = b.left < min ? min - b.left : b.right > max ? max - b.right : 0;
    const dy = b.top < minY ? minY - b.top : b.bottom > maxY ? maxY - b.bottom : 0;
    if (dx) place.style.setProperty("--fit-x", `${Math.round(dx)}px`);
    if (dy) place.style.setProperty("--fit-y", `${Math.round(dy)}px`);
  }
}
