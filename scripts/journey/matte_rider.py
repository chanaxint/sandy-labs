"""Cuts the snowboarder out of the jump shot, so the big story line can sit behind him.

For film frames FIRST..LAST it runs Robust Video Matting (RVM, MobileNetV3, ONNX:
https://github.com/PeterL1n/RobustVideoMatting, file rvm_mobilenetv3_fp32.onnx) over the
film source at 2560x1440, starting a few frames early so its recurrent state has settled,
and writes the rider's pixels as transparent WebP frames to public/media/journey/rider/:
only the part of the frame above BAND (the sky and mountains, where the line is), cropped
to the box the rider ever covers there. rider.json says where that box sits in the frame.

Edge pixels use RVM's foreground estimate rather than the film's, so the snow and sky
mixed into soft edges don't show as a halo over the line.

Requirements: ffmpeg, Python with numpy + opencv-python-headless + onnxruntime.

Usage: python matte_rider.py journey-source.mp4 rvm_mobilenetv3_fp32.onnx
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np
import onnxruntime as ort

FIRST, LAST = 3020, 3215   # film frames the line is on screen (lib/journey/story.ts "rider")
WARMUP = 30                # frames run before FIRST, not written
W, H = 2560, 1440          # frame size the cutouts are made at
BAND = 0.62                # only rows above this fraction of the height can cover the line
DOWNSAMPLE = 0.375         # RVM's internal resolution: 960x540
QUALITY = 86

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "media", "journey", "rider")


def frames(path, first, last):
    vf = f"select='between(n\\,{first}\\,{last})',scale={W}:{H}:flags=lanczos"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", vf, "-vsync", "0", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    size = W * H * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    p.wait()


def main():
    src, model = sys.argv[1:3]
    sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    ratio = np.array([DOWNSAMPLE], np.float32)
    band = int(H * BAND)
    cuts = []
    for k, rgb in enumerate(frames(src, FIRST - WARMUP, LAST)):
        x = (rgb.astype(np.float32) / 255).transpose(2, 0, 1)[None]
        fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3],
                                          "downsample_ratio": ratio})
        f = FIRST - WARMUP + k
        if f < FIRST:
            continue
        a = pha[0, 0, :band]
        a = np.where(a < 0.04, 0, a)  # no faint specks of matte in the sky
        fg = (fgr[0].transpose(1, 2, 0)[:band] * 255).clip(0, 255).astype(np.uint8)
        solid = (a > 0.96)[..., None]
        color = np.where(solid, rgb[:band], fg)
        cuts.append((f, np.dstack([color, (a * 255).round().astype(np.uint8)])))
        print(f"frame {f}", file=sys.stderr)

    # The box the rider ever covers in the band, padded a little.
    cover = np.zeros((band, W), bool)
    for _, c in cuts:
        cover |= c[..., 3] > 0
    ys, xs = np.nonzero(cover)
    x0, x1 = max(0, xs.min() - 8), min(W, xs.max() + 9)
    y0, y1 = max(0, ys.min() - 8), band
    os.makedirs(OUT, exist_ok=True)
    for name in os.listdir(OUT):
        os.remove(os.path.join(OUT, name))
    total = 0
    for f, c in cuts:
        crop = cv2.cvtColor(c[y0:y1, x0:x1], cv2.COLOR_RGBA2BGRA)
        path = os.path.join(OUT, f"{f}.webp")
        cv2.imwrite(path, crop, [cv2.IMWRITE_WEBP_QUALITY, QUALITY])
        total += os.path.getsize(path)
    meta = {"first": FIRST, "last": LAST, "width": W, "height": H,
            "rect": {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}}
    with open(os.path.join(OUT, "rider.json"), "w") as fh:
        json.dump(meta, fh)
    print(f"{len(cuts)} frames, box {meta['rect']}, {total / 1e6:.1f} MB", file=sys.stderr)


if __name__ == "__main__":
    main()
