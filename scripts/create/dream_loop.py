#!/usr/bin/env python3
"""The master of the dream-website video: one even, fluid pace, forward only.

1. How fast the picture moves, frame by frame (median optical flow, small grey frames).
2. Re-timed to one even pace: slow stretches (after leaving the glass, the long pull
   away at the end) play faster, so the whole flight moves at the pace of its approach
   and its rooms (sped up at most `MAX_SPEED`x, slowed at most to `MIN_SPEED`x).
3. Fluid: the source is first raised to 120 fps with motion-compensated (optical flow)
   in-betweens, the output is 60 fps, and each output frame blends the in-betweens it
   covers (a half-open shutter), so sped-up stretches glide instead of stepping.
4. Forward only, start to end, nothing added at the end: the page loops it (the
   <video> loop) straight back to the start.

  python3 scripts/create/dream_loop.py source.mp4 master.mp4
Needs ffmpeg and OpenCV (pip install opencv-python-headless numpy).
"""
import subprocess
import sys
from collections import deque

import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
FPS_IN, FPS_FLUID, FPS_OUT = 60, 120, 60
MAX_SPEED, MIN_SPEED = 4.0, 0.75
SHUTTER = 0.5
W, H = 1920, 1080


def frames(vf, fmt, width, height, channels):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", fmt, "-"], stdout=subprocess.PIPE)
    size = width * height * channels
    while True:
        b = p.stdout.read(size)
        if len(b) < size:
            break
        a = np.frombuffer(b, np.uint8)
        yield a.reshape(height, width, channels) if channels > 1 else a.reshape(height, width)
    p.wait()


# 1. Speed of the picture, per source frame.
prev, speed = None, []
for g in frames("scale=320:180:flags=area", "gray", 320, 180, 1):
    speed.append(0.0 if prev is None else float(np.median(np.linalg.norm(cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 3, 15, 3, 5, 1.2, 0), axis=2))))
    prev = g
s = np.array(speed)
s[0] = s[1]
n = len(s)
k = np.exp(-0.5 * (np.arange(-30, 31) / 10) ** 2)
smooth = np.convolve(np.pad(s, 30, mode="edge"), k / k.sum(), mode="valid")

# 2. One even pace: the approach's and the rooms' (glass to glass).
target = float(np.median(smooth[30 : int(10 * FPS_IN)]))
rate = np.clip(target / np.maximum(smooth, 1e-3), MIN_SPEED, MAX_SPEED)
t_out = np.concatenate([[0], np.cumsum(1 / rate[1:])]) / FPS_IN  # output seconds at each source frame
times = np.arange(0, t_out[-1], 1 / FPS_OUT)
src_pos = np.interp(times, t_out, np.arange(n))  # source frame (60 fps units) shown at each output frame
fluid_pos = src_pos * (FPS_FLUID / FPS_IN)  # in 120 fps units
print(f"{n} source frames, pace {target:.2f}; {len(times) / FPS_OUT:.1f} s at {FPS_OUT} fps (was {n / FPS_IN:.1f} s)")

# 3. Each output frame: the in-betweens it covers, blended.
windows = []
for i, c in enumerate(fluid_pos):
    step = c - fluid_pos[i - 1] if i else 1.0
    lo, hi = int(round(c - max(0.0, SHUTTER * step - 1))), int(round(c))
    windows.append((min(lo, hi), hi))

enc = subprocess.Popen(
    ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS_OUT), "-i", "-",
     "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "medium", OUT],
    stdin=subprocess.PIPE,
)
vf = f"scale={W}:{H}:flags=lanczos,minterpolate=fps={FPS_FLUID}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none"
buf, w, written = deque(), 0, 0
for j, fr in enumerate(frames(vf, "bgr24", W, H, 3)):
    buf.append((j, fr))
    while w < len(windows) and windows[w][1] <= j:
        lo, hi = windows[w]
        picked = [f for idx, f in buf if lo <= idx <= hi] or [buf[-1][1]]
        out = picked[0] if len(picked) == 1 else np.mean(np.stack(picked).astype(np.float32), axis=0).astype(np.uint8)
        enc.stdin.write(out.tobytes())
        written += 1
        w += 1
    keep = windows[w][0] if w < len(windows) else j
    while buf and buf[0][0] < keep:
        buf.popleft()
    if w >= len(windows):
        break
while w < len(windows):  # the very end, if the in-betweens ran out
    enc.stdin.write(buf[-1][1].tobytes())
    written += 1
    w += 1
enc.stdin.close()
enc.wait()
print(f"{written} frames, {written / FPS_OUT:.1f} s -> {OUT}")
