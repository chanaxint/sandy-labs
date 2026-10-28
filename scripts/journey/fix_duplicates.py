"""Replaces duplicated in-between frames of an interpolated 60 fps source.

The 60 fps journey source was interpolated from 30 fps: even frames are the
originals, odd frames are in-betweens — but about one in three in-betweens is a
copy of a neighbour, so the motion stops for a frame twelve times a second.
Each copied in-between is rebuilt as the midpoint of its two neighbours, warped
along the optical flow both ways; the good in-betweens stay as they are.

Requirements: ffmpeg, Python with numpy + opencv-python-headless.

Usage: python fix_duplicates.py SOURCE60.mp4 OUT.mp4
"""
import subprocess
import sys

import cv2
import numpy as np

COPY = 0.15  # an in-between this close to a neighbour (relative to the neighbours' gap) is a copy


def probe(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
         "-of", "csv=p=0", path], text=True).strip()
    w, h, rate = out.split(",")
    return int(w), int(h), rate


def small(f):
    return cv2.resize(cv2.cvtColor(f, cv2.COLOR_RGB2GRAY), (240, 135), interpolation=cv2.INTER_AREA).astype(np.float32)


def midpoint(a, b):
    """The frame halfway between a and b along the optical flow both ways."""
    h, w = a.shape[:2]
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    size = (w // 4, h // 4)
    ga, gb = (cv2.cvtColor(cv2.resize(x, size, interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY) for x in (a, b))
    up = lambda flow: cv2.resize(flow, (w, h), interpolation=cv2.INTER_LINEAR) * 4
    fab, fba = up(dis.calc(ga, gb, None)), up(dis.calc(gb, ga, None))
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    wa = cv2.remap(a, gx - 0.5 * fab[..., 0], gy - 0.5 * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    wb = cv2.remap(b, gx - 0.5 * fba[..., 0], gy - 0.5 * fba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return ((wa.astype(np.uint16) + wb.astype(np.uint16)) // 2).astype(np.uint8)


def main():
    src, dst = sys.argv[1:3]
    w, h, rate = probe(src)
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
                            "-r", rate, "-i", "-", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "12",
                            "-pix_fmt", "yuv420p", dst], stdin=subprocess.PIPE)
    size = w * h * 3

    def read():
        buf = dec.stdout.read(size)
        return np.frombuffer(buf, np.uint8).reshape(h, w, 3) if len(buf) == size else None

    # Slide a window of three frames: (previous original, in-between, next original).
    prev, i, fixed = read(), 0, 0
    enc.stdin.write(prev.tobytes())
    while True:
        mid, nxt = read(), read()
        if mid is None:
            break
        if nxt is None:
            enc.stdin.write(mid.tobytes())
            break
        sp, sm, sn = small(prev), small(mid), small(nxt)
        gap = np.abs(sn - sp).mean()
        if gap > 1 and min(np.abs(sm - sp).mean(), np.abs(sm - sn).mean()) < COPY * gap:
            mid = midpoint(prev, nxt)
            fixed += 1
        enc.stdin.write(mid.tobytes())
        enc.stdin.write(nxt.tobytes())
        prev = nxt
        i += 2
    enc.stdin.close()
    dec.wait()
    enc.wait()
    print(f"{dst}: rebuilt {fixed} copied in-between frames", file=sys.stderr)


if __name__ == "__main__":
    main()
