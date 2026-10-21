"""Bake the "camera turns toward the caption" move into the intro film.

While a caption is on screen the camera eases a little toward its side (a small
horizontal shift plus just enough zoom to keep the edges filled). Doing this in
the video itself, frame by frame, keeps the move in step with the footage;
applied as a CSS transform in the page it ran at the display rate while the
picture changed at 24 fps, which read as jitter.

Caption timings are read from lib/intro.ts, so the page and the video agree.

Usage: python camera_look.py IN.mp4 OUT.mp4
"""
import os
import re
import subprocess
import sys

import cv2
import numpy as np

W, H, FPS = 3840, 2160, 24
SHIFT = 0.018   # fraction of the frame width the picture moves at the strongest look
ZOOM = 0.045    # zoom at the strongest look (hides the edges the shift would expose)
EASE_FRAMES = 8  # extra smoothing (gaussian sigma, frames) of the look curve

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")


def captions():
    src = open(os.path.join(ROOT, "lib", "intro.ts"), encoding="utf-8").read()
    found = re.findall(r'from:\s*"(left|right)",\s*start:\s*([\d.]+),\s*end:\s*([\d.]+)', src)
    if not found:
        sys.exit("no captions found in lib/intro.ts")
    return [(1 if side == "right" else -1, float(a), float(b)) for side, a, b in found]


def look_curve(frames):
    caps = captions()
    look = np.zeros(frames)
    for i in range(frames):
        t = i / FPS
        for side, start, end in caps:
            p = (t - start) / (end - start)
            if 0 < p < 1:
                look[i] += side * np.sin(np.pi * p)
    look = np.clip(look, -1, 1)
    k = np.arange(-3 * EASE_FRAMES, 3 * EASE_FRAMES + 1)
    g = np.exp(-0.5 * (k / EASE_FRAMES) ** 2)
    return np.convolve(np.pad(look, len(k) // 2, mode="edge"), g / g.sum(), mode="valid")


def main():
    src, out = sys.argv[1:3]
    total = int(subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
         "stream=nb_read_packets", "-of", "csv=p=0", src], text=True).strip())
    look = look_curve(total)

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)
    size = W * H * 3
    moved = 0
    for n in range(total):
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        a = look[n]
        if abs(a) > 1e-3:
            z = 1 + ZOOM * abs(a)
            # Zoom about the centre, then shift: looking right moves the picture left.
            m = np.array([[z, 0, (1 - z) * W / 2 - a * SHIFT * W], [0, z, (1 - z) * H / 2]], np.float64)
            frame = cv2.warpAffine(frame, m, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
            moved += 1
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
    enc.stdin.close()
    enc.wait()
    dec.wait()
    print(f"camera look applied to {moved} of {total} frames in {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
