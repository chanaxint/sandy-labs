"""
The cloud wall over the film's two hard cuts (lib/journey/veils.ts): the edge of a bank of
real cumulus, keyed out of one of the film's own cloud frames.

    python3 scripts/journey/cloud_wall.py <frame.png> <out.webp> [--flip] [--shade 1.0]

Bright billow tops survive near the top, all the cloud lower down, so the outline follows
the cloud's own forms; specks are dropped, the colour is lifted towards white, and the
bottom fades into plain white (#fff), which the wall continues below it.
"""
import argparse

import cv2
import numpy as np

p = argparse.ArgumentParser()
p.add_argument("src")
p.add_argument("out")
p.add_argument("--flip", action="store_true", help="mirror left to right")
p.add_argument("--shade", type=float, default=1.0, help="below 1: a little greyer (a layer further back)")
a = p.parse_args()

im = cv2.imread(a.src).astype(np.float32) / 255
im = cv2.resize(im, (1920, 1080), interpolation=cv2.INTER_AREA)
if a.flip:
    im = im[:, ::-1]
H, W = im.shape[:2]
y = np.linspace(0, 1, H)[:, None]

lum = cv2.GaussianBlur(im.mean(axis=2), (0, 0), 1.2)
lo, hi = np.percentile(lum, 5), np.percentile(lum, 99.5)
lum = np.clip((lum - lo) / (hi - lo), 0, 1)
# The threshold falls from the top (only the brightest tops) to the bottom (all cloud).
alpha = np.clip((lum - np.clip(1.2 - 1.45 * y, -0.5, 1.2)) / 0.16, 0, 1)
alpha = alpha * alpha * (3 - 2 * alpha)
# No specks: small islands in the upper part go, pinholes close.
n, lab, st, _ = cv2.connectedComponentsWithStats((alpha > 0.5).astype(np.uint8))
keep = np.zeros(n, bool)
keep[1:] = (st[1:, cv2.CC_STAT_AREA] > 20000) | (st[1:, cv2.CC_STAT_TOP] > H * 0.55)
alpha = alpha * cv2.GaussianBlur(keep[lab].astype(np.float32), (0, 0), 3)
alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
alpha = cv2.GaussianBlur(alpha, (0, 0), 1.6)
ramp = np.clip((y - 0.72) / 0.22, 0, 1)
alpha = np.maximum(alpha, ramp * ramp * (3 - 2 * ramp))

# Colour: the cloud's own shading, lifted towards white, slightly cool; plain white below.
# Sunlit: bright, with the shading kept only softly in the hollows.
c = 0.6 + 0.4 * im**0.5
c = np.clip(c * np.array([1.0, 0.985, 0.97]) * a.shade, 0, 1)
w = np.clip((y - 0.5) / 0.35, 0, 1)[..., None]
c = c * (1 - w) + w

rgba = np.dstack([c * 255, alpha * 255]).round().astype(np.uint8)
cv2.imwrite(a.out, rgba, [cv2.IMWRITE_WEBP_QUALITY, 82])
