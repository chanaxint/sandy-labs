#!/usr/bin/env python3
"""The master of the dream-website video: one even speed, forward only.

1. How fast the picture moves, frame by frame (median optical flow, small grey frames).
2. Re-timed to one even speed: slow stretches (after leaving the glass, the long pull
   away at the end) play faster, so the whole flight moves at the pace of its approach
   and its rooms (a stretch is sped up at most `MAX_SPEED`x, slowed at most to `MIN_SPEED`x).
3. Forward only, start to end, nothing added at the end: the page loops it (the
   <video> loop) straight back to the start.

  python3 scripts/create/dream_loop.py source.mp4 master.mp4
Needs ffmpeg and OpenCV (pip install opencv-python-headless numpy).
"""
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
FPS_IN, FPS_OUT = 60, 30
MAX_SPEED, MIN_SPEED = 4.0, 0.75
W, H = 1920, 1080


def frames(width, height, fmt, channels):
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", SRC, "-an", "-vf", f"scale={width}:{height}:flags=area", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
        stdout=subprocess.PIPE,
    )
    size = width * height * channels
    while True:
        b = p.stdout.read(size)
        if len(b) < size:
            break
        yield np.frombuffer(b, np.uint8).reshape(height, width, channels) if channels > 1 else np.frombuffer(b, np.uint8).reshape(height, width)
    p.wait()


# 1. Speed of the picture, per source frame.
prev, speed = None, []
for g in frames(320, 180, "gray", 1):
    if prev is not None:
        f = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        speed.append(float(np.median(np.linalg.norm(f, axis=2))))
    else:
        speed.append(0.0)
    prev = g
s = np.array(speed)
s[0] = s[1]
n = len(s)
# Smoothed over a third of a second, so the pace follows the flight, not each frame.
k = np.exp(-0.5 * (np.arange(-30, 31) / 10) ** 2)
smooth = np.convolve(np.pad(s, 30, mode="edge"), k / k.sum(), mode="valid")

# 2. One even pace: the approach's and the rooms' (glass to glass).
target = float(np.median(smooth[30 : int(10 * FPS_IN)]))
rate = np.clip(target / np.maximum(smooth, 1e-3), MIN_SPEED, MAX_SPEED)  # source frames per real frame
t_out = np.concatenate([[0], np.cumsum(1 / rate[1:])]) / FPS_IN  # seconds of output at each source frame
picks = np.searchsorted(t_out, np.arange(0, t_out[-1], 1 / FPS_OUT))
picks = np.clip(picks, 0, n - 1)
print(f"{n} source frames, pace {target:.2f}; forward {len(picks) / FPS_OUT:.1f} s (was {n / FPS_IN:.1f} s)")
for sec in range(int(len(picks) / FPS_OUT) + 1):
    seg = picks[sec * FPS_OUT : (sec + 1) * FPS_OUT]
    if len(seg) > 1:
        print(f"  {sec:2d}s  source {seg[0] / FPS_IN:5.2f}–{seg[-1] / FPS_IN:5.2f}s  pace {np.mean(s[seg[0]:seg[-1] + 1]) * np.mean(rate[seg[0]:seg[-1] + 1]):.2f}")

# 3. The chosen frames, in order.
tmp = tempfile.mkdtemp()
want = set(picks.tolist())
for i, fr in enumerate(frames(W, H, "bgr24", 3)):
    if i in want:
        cv2.imwrite(os.path.join(tmp, f"{i:05d}.jpg"), fr, [cv2.IMWRITE_JPEG_QUALITY, 96])
order = list(picks)
with open(os.path.join(tmp, "list.txt"), "w") as f:
    for i in order:
        f.write(f"file '{tmp}/{i:05d}.jpg'\nduration {1 / FPS_OUT:.6f}\n")
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "list.txt"), "-vf", f"fps={FPS_OUT},format=yuv420p",
     "-c:v", "libx264", "-crf", "12", "-preset", "medium", OUT],
    check=True,
)
print(f"{len(order) / FPS_OUT:.1f} s -> {OUT}")
