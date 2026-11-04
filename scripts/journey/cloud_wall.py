"""
The cloud wall over the film's two hard cuts (lib/journey/veils.ts): the top of a bank of
cumulus, as it rises past the camera.

    python3 scripts/journey/cloud_wall.py <cloud-frame.png> <out.webp> [--seed 1] [--shade 1.0]

The outline is built the way cumulus grows: large billows along the bank, smaller ones on
their tops, smaller still on those, a little ragged at the very edge (soft, wispy, never a
hard cut-out). Each billow is lit from above like a ball of cloud (bright tops, soft blue
grey under them), and the fine texture is the film's own cloud (a frame inside the cloud,
high-pass), so it reads as real vapour. It tiles left to right; the bottom fades into plain
white (#fff), which the wall continues below it.
"""
import argparse

import cv2
import numpy as np

p = argparse.ArgumentParser()
p.add_argument("src", help="a film frame inside the cloud (texture)")
p.add_argument("out")
p.add_argument("--seed", type=int, default=1)
p.add_argument("--shade", type=float, default=1.0, help="below 1: a little greyer (a layer further back)")
a = p.parse_args()
rng = np.random.default_rng(a.seed)

W, H = 2560, 960
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
acc = np.zeros((H, W), np.float32)  # the billows, blended softly into one surface
K = 4.0


def billow(cx, cy, r):
    """A ball of cloud, added to the surface (a soft max, so neighbours melt together)."""
    y0, y1 = max(0, int(cy - r - 2)), min(H, int(cy + r + 3))
    if y0 >= y1:
        return
    for shift in (-W, 0, W):  # tiles left to right
        lo, hi = max(0, int(cx - r - 2) + shift), min(W, int(cx + r + 3) + shift)
        if lo >= hi:
            continue
        sx, sy = xx[y0:y1, lo:hi] - (cx + shift), yy[y0:y1, lo:hi] - cy
        q = np.clip(1 - (sx * sx + sy * sy) / (r * r), 0, 1)
        acc[y0:y1, lo:hi] += (r * np.sqrt(q)) ** K


# The bank: big billows along it, then smaller on their upper halves, three generations.
gen, x = [], 0.0
while x < W:
    r = rng.uniform(95, 230)
    gen.append((x, rng.uniform(0.52, 0.76) * H, r))
    x += r * rng.uniform(0.7, 1.2)
everything = list(gen)
for scale, count in ((0.55, 3), (0.5, 3), (0.45, 3)):
    nxt = []
    for cx, cy, r in gen:
        for _ in range(rng.integers(1, count + 1)):
            ang = rng.uniform(-2.8, -0.35)  # on the upper side
            d = r * rng.uniform(0.6, 0.95)
            nxt.append(((cx + np.cos(ang) * d) % W, cy + np.sin(ang) * d, r * scale * rng.uniform(0.7, 1.3)))
    everything += nxt
    gen = nxt
for b in everything:
    billow(*b)
# The body of the bank under the billows rises steadily, so no billow's underside shows.
floor = np.clip((yy - 0.58 * H) * 1.6, 0, None)
height = (acc + floor**K) ** (1 / K)


def fbm(scales, seed_off=0):
    out = np.zeros((H, W), np.float32)
    for i, s in enumerate(scales):
        n = rng.random((H // s + 2, W // s + 2)).astype(np.float32)
        n[:, -2:] = n[:, :2]  # roughly tiling
        out += cv2.resize(n, (W + 2 * s, H + 2 * s), interpolation=cv2.INTER_CUBIC)[s : s + H, s : s + W] * (0.55**i)
    return (out - out.mean()) / out.std()


# Cauliflower detail on the surface, and a ragged, soft edge.
height = height + (fbm((70, 28)) * 6 + fbm((12,)) * 1.2) * np.clip(height / 50, 0, 1)
inside = height > 10
# Solid below the outline: no gaps through to the film.
top = np.where(inside.any(axis=0), inside.argmax(axis=0), H)
inside = yy >= top[None, :]
height = np.where(inside, np.maximum(height, 6), 0)
dist_in = cv2.distanceTransform(inside.astype(np.uint8), cv2.DIST_L2, 5)
dist_out = cv2.distanceTransform((~inside).astype(np.uint8), cv2.DIST_L2, 5)
sd = dist_in - dist_out + fbm((20, 8)) * 4
alpha = np.clip((sd + 2) / 16, 0, 1)
alpha = alpha * alpha * (3 - 2 * alpha)

# Light from above and a little left, from the surface's own slope: bright tops,
# blue-grey under each billow and in the hollows between them.
hs = cv2.GaussianBlur(height, (0, 0), 4)
gx = cv2.Sobel(hs, cv2.CV_32F, 1, 0, ksize=3) / 8
gy = cv2.Sobel(hs, cv2.CV_32F, 0, 1, ksize=3) / 8
n = np.dstack([-gx, -gy, np.full_like(gx, 0.9)])
n /= np.linalg.norm(n, axis=2, keepdims=True)
L = np.array([-0.35, -0.8, 0.5], np.float32)
L /= np.linalg.norm(L)
lam = np.clip(n @ L, 0, 1)
ao = np.clip((cv2.GaussianBlur(height, (0, 0), 28) - height) / 55, 0, 1)
light = (0.4 + 0.6 * lam) * (1 - 0.4 * ao)
# The film's own cloud for the fine texture (high-pass, gentle).
tex = cv2.imread(a.src, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255
tex = cv2.resize(tex, (W, int(W * tex.shape[0] / tex.shape[1])), interpolation=cv2.INTER_AREA)
tex = np.vstack([tex, tex[::-1]])[:H]
tex = tex - cv2.GaussianBlur(tex, (0, 0), 24)
light = np.clip(cv2.GaussianBlur(light, (0, 0), 1.5) + tex * 0.9, 0, 1.05)
lit = np.array([1.0, 0.995, 0.985])
shadow = np.array([0.6, 0.67, 0.79])
c = shadow + (lit - shadow) * light[..., None]
# Plain white towards the bottom, where the wall goes on.
w = np.clip((yy / H - 0.74) / 0.2, 0, 1)[..., None]
w = w * w * (3 - 2 * w)
c = (c * (1 - w) + w) * a.shade + (1 - a.shade) * w
alpha = np.maximum(alpha, w[..., 0])

bgr = (np.clip(c, 0, 1)[..., ::-1] * 255).round().astype(np.uint8)
rgba = np.dstack([bgr, (alpha * 255).round().astype(np.uint8)])
cv2.imwrite(a.out, rgba, [cv2.IMWRITE_WEBP_QUALITY, 84])
