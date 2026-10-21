// Pre-renders the code-drawn hero island and clouds (SVG filters) into WebP images,
// so the browser paints plain images instead of recomputing turbulence and lighting
// filters. After changing IslandIllustration.tsx, with `npm run dev` running:
//
//   node scripts/hero/render-hero.mjs [http://localhost:3000]
//
// It reads the art from the development-only /hero-art page.
//
// Needs Playwright (with a Chromium) and ffmpeg with libwebp.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = (await import("node:module")).createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = (await import("/opt/node-tools/node_modules/playwright/index.js")).default;
}

const site = process.argv[2] ?? "http://localhost:3000";
const out = join(dirname(fileURLToPath(import.meta.url)), "../../public/media/hero");
const tmp = mkdtempSync(join(tmpdir(), "hero-"));
mkdirSync(out, { recursive: true });

const browser = await pw.chromium.launch();
const page = await browser.newPage();
await page.goto(`${site}/hero-art`, { waitUntil: "load" });
const island = await page.$eval("main svg[role=img]", (el) => el.outerHTML);
const clouds = await page.$$eval("main svg[aria-hidden]", (els) =>
  els.filter((el) => el.getAttribute("viewBox") === "0 0 600 360").map((el) => el.outerHTML),
);

async function render(svg, width, height, file, transparent) {
  const shot = await browser.newPage({ viewport: { width, height } });
  await shot.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace("<svg", `<svg width="${width}" height="${height}" style="display:block"`)}</body></html>`,
  );
  const png = join(tmp, `${file}.png`);
  await shot.screenshot({ path: png, omitBackground: transparent });
  await shot.close();
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-c:v", "libwebp", "-quality", transparent ? "82" : "80",
    ...(transparent ? ["-pix_fmt", "yuva420p"] : []), join(out, `${file}.webp`)]);
}

// Island: 16:10 at two widths (object-fit: cover crops like the SVG's "slice").
await render(island, 2560, 1600, "island-2560", false);
await render(island, 1280, 800, "island-1280", false);
// Clouds, in DOM order: two shadows, then three clouds.
const names = ["cloud-shadow-1", "cloud-shadow-2", "cloud-1", "cloud-2", "cloud-3"];
for (let i = 0; i < clouds.length; i++) await render(clouds[i], 1200, 720, names[i], true);

await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log(`Rendered ${2 + clouds.length} images to ${out}`);
