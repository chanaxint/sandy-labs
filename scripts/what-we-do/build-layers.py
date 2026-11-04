#!/usr/bin/env python3
"""
The two layers of the "What we do" opening (components/site/WhatWeDo.tsx), from the
user's two pictures (design/what-we-do/):

  valley-source.webp   the whole painting: the valley at dawn, the village on its hill
  village-source.webp  the village and its hill alone, on white

Out, in public/media/what-we-do/:
  valley.webp   the painting with its own village taken out (filled from around it), so
                nothing doubles when the village layer rises a little over it
  village.webp  the village cut out of its white (only the white joined to the sky goes,
                the snow on the hill stays), placed exactly over the painting's village,
                its hill carried on down below the picture (its slope widening to the
                full width, then into the ground's shade) so no gap opens under it

The painting gets more of its sky above it (its top carried on up, a little deeper in
colour), so the whole picture fits a 16:10 screen across; both files share one frame
(village.webp the same, plus its hill below), so the page lays them over each other as they are.

    python3 scripts/what-we-do/build-layers.py
"""
import os

import cv2
import numpy as np

root = os.path.join(os.path.dirname(__file__), "..", "..")
src = os.path.join(root, "design", "what-we-do")
out = os.path.join(root, "public", "media", "what-we-do")
os.makedirs(out, exist_ok=True)

valley = cv2.imread(os.path.join(src, "valley-source.webp"))
village = cv2.imread(os.path.join(src, "village-source.webp"))
H, W = valley.shape[:2]
EXTRA = int(H * 0.75)  # the hill below the picture

# 1. The village cut out: the white joined to the top and sides goes.
lum = village.astype(np.float32).min(axis=2)
white = (lum > 238).astype(np.uint8)
n, lab = cv2.connectedComponents(white, connectivity=4)
edge_labels = set(np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge_labels))
# The white strip under the hill's foot goes too.
foot = np.where((~bg).any(axis=1))[0].max()
rows_hill = (~bg[: foot + 1]).sum(axis=1)
base = int(np.where(rows_hill > rows_hill.max() * 0.9)[0].max())  # the last full row of the hill
bg[base + 1 :] = True
alpha = (~bg).astype(np.float32)
alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
alpha = cv2.GaussianBlur(alpha, (0, 0), 0.8)

# 2. Placed over the painting's village (a similarity found by matching the two).
g1, g2 = cv2.cvtColor(village, cv2.COLOR_BGR2GRAY), cv2.cvtColor(valley, cv2.COLOR_BGR2GRAY)
sift = cv2.SIFT_create(4000)
k1, d1 = sift.detectAndCompute(g1, (alpha > 0.5).astype(np.uint8))
k2, d2 = sift.detectAndCompute(g2, None)
good = [m for m, s in cv2.BFMatcher().knnMatch(d1, d2, k=2) if m.distance < 0.75 * s.distance]
M, _ = cv2.estimateAffinePartial2D(
    np.float32([k1[m.queryIdx].pt for m in good]), np.float32([k2[m.trainIdx].pt for m in good]),
    method=cv2.RANSAC, ransacReprojThreshold=4,
)
rgba = np.dstack([village, (alpha * 255).astype(np.uint8)])
placed = cv2.warpAffine(rgba, M, (W, H + EXTRA), flags=cv2.INTER_LANCZOS4, borderValue=(0, 0, 0, 0))
col, a = placed[..., :3].astype(np.float32), placed[..., 3].astype(np.float32) / 255

# 3. The hill carried on down: below its foot it goes on as the hill's own lowest band,
#    enlarged twice and then four times (nearer ground, larger forms, as in perspective),
#    each blended softly into the one above, deepening into the ground's shade; its outline
#    widens from the foot's ends out to the full width.
full = (a > 0.9).sum(axis=1)
foot_y = int(np.where(full > full.max() * 0.8)[0].max()) - 9  # the last full row of the hill, short of its light edge
xs = np.where(a[foot_y] > 0.9)[0]
left, right = int(xs.min()), int(xs.max())
melt = 16  # rows over which the hill's foot dissolves into the ground below it
n_below = H + EXTRA - foot_y + melt
bh = 38
band = col[foot_y - bh : foot_y, left : right + 1].copy()
ok = a[foot_y - bh : foot_y, left : right + 1] > 0.95
fill_c = band[ok].mean(axis=0) if ok.any() else band.reshape(-1, 3).mean(axis=0)
band = np.where(ok[..., None], band, fill_c)


def enlarged(k):
    """The band k times larger, centred across, cut to the picture's width."""
    w, h = int(band.shape[1] * k), int(bh * k)
    big = cv2.resize(band, (w, h), interpolation=cv2.INTER_CUBIC)
    if w < W:
        big = cv2.copyMakeBorder(big, 0, 0, (W - w) // 2, W - w - (W - w) // 2, cv2.BORDER_REFLECT)
    x0 = (big.shape[1] - W) // 2
    return big[:, x0 : x0 + W]


rows = []
for k in (2.2, 4.6, 9.5):
    rows.append(enlarged(k))
below = rows[0]
for nxt in rows[1:]:
    ov = 40
    w8 = np.linspace(0, 1, ov)[:, None, None]
    below = np.vstack([below[:-ov], below[-ov:] * (1 - w8) + nxt[:ov] * w8, nxt[ov:]])
below = below[:n_below]
if len(below) < n_below:
    below = np.vstack([below, np.repeat(below[-1:], n_below - len(below), axis=0)])
below = cv2.GaussianBlur(below, (0, 0), 0.8)
t = np.linspace(0, 1, n_below)[:, None, None]
shade = np.array([50, 58, 66], np.float32)  # the hill's shadow (BGR)
d = 0.85 * t**0.65
below = below * (1 - d) + shade * d
yy = np.maximum(np.arange(n_below) - melt, 0)[:, None]
xx = np.arange(W)[None, :]
spread = 3.5  # px out per px down
inside = (xx >= left - yy * spread) & (xx <= right + yy * spread)
below_a = cv2.GaussianBlur(inside.astype(np.float32), (0, 0), 1.2)
# The ground goes under the hill's last rows; the hill fades out over them (no line).
y0 = foot_y - melt
fade = np.ones(len(a) - y0, np.float32)
fade[: melt + 1] = np.linspace(1, 0, melt + 1)
fade[melt + 1 :] = 0
keep = (a[y0:] * fade[:, None])[..., None]
col[y0:] = col[y0:] * keep + below * (1 - keep)
a[y0:] = np.maximum(a[y0:] * fade[:, None], below_a)
# More sky above the painting, so the frame is 16:10.
TOP = int(W / 1.6) - H
village_out = np.zeros((TOP + H + EXTRA, W, 4), np.uint8)
village_out[TOP:] = np.dstack([col.clip(0, 255), a * 255]).round().astype(np.uint8)
cv2.imwrite(os.path.join(out, "village.webp"), village_out, [cv2.IMWRITE_WEBP_QUALITY, 88])

# 4. The painting without its village: where the placed village (and a margin round it)
#    covers it, filled from around (only ever seen at the edges as the village rises).
cover = (a[:H] > 0.05).astype(np.uint8)
cover = cv2.dilate(cover, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
cover[foot_y:] = 0  # the painting's foreground below the hill stays (the hill covers it)
small = cv2.resize(valley, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
fill = cv2.inpaint(small, cv2.resize(cover, (W // 2, H // 2), interpolation=cv2.INTER_NEAREST) * 255, 15, cv2.INPAINT_TELEA)
fill = cv2.GaussianBlur(cv2.resize(fill, (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 2)
m = cv2.GaussianBlur(cover.astype(np.float32), (0, 0), 4)[..., None]
clean = valley * (1 - m) + fill * m
top_row = cv2.GaussianBlur(clean[:16].mean(axis=0, keepdims=True), (0, 0), sigmaX=40, sigmaY=0.1)[0]
deep = np.array([168, 128, 92], np.float32)  # the sky's blue higher up (BGR)
u = np.linspace(1, 0, TOP)[:, None, None]  # 1 at the very top
sky = top_row[None] * (1 - 0.55 * u**1.3) + deep * 0.55 * u**1.3
sky += np.random.default_rng(5).normal(0, 0.8, sky.shape)  # no banding
valley_out = np.vstack([sky, clean])
cv2.imwrite(os.path.join(out, "valley.webp"), valley_out.clip(0, 255).round().astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 88])
print(f"frame {W}x{TOP + H} (sky {TOP}), village {W}x{TOP + H + EXTRA} (foot at {TOP + foot_y}); placed with scale {np.hypot(M[0, 0], M[0, 1]):.3f}")
