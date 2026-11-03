#!/usr/bin/env python3
"""Decode one frame of an encoded journey size to an image.

The sizes in public/media/journey are length-prefixed H.264 (avcC) parts with a frame
index (journey-<size>.h264.json): this turns the frames from the last keyframe up to the
one asked for into an Annex-B stream and lets ffmpeg decode it, so a still matches the
film's own frame numbering exactly (the source video has fewer frames).

  python3 scripts/journey/frame_still.py public/media/journey/journey-1440.h264 4600 out.png
"""
import base64
import json
import os
import struct
import subprocess
import sys

base, frame, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
index = json.load(open(base + ".json"))
desc = base64.b64decode(index["description"])
length_size = (desc[4] & 3) + 1

# SPS and PPS from the avcC description.
params, i = [], 5
for count_mask in (31, 255):
    count = desc[i] & count_mask
    i += 1
    for _ in range(count):
        size = struct.unpack(">H", desc[i : i + 2])[0]
        i += 2
        params.append(desc[i : i + size])
        i += size

root = os.path.dirname(base)


def read(offset, size):
    for part in index["parts"]:
        if part["start"] <= offset < part["end"]:
            with open(os.path.join(root, part["url"]), "rb") as f:
                f.seek(offset - part["start"])
                return f.read(size)
    raise ValueError(f"offset {offset} outside the parts")


key = max(k for k in index["keyframes"] if k <= frame)
stream = b"".join(b"\x00\x00\x00\x01" + p for p in params)
for f in range(key, frame + 1):
    data, k = read(index["offsets"][f], index["sizes"][f]), 0
    while k < len(data):
        size = int.from_bytes(data[k : k + length_size], "big")
        k += length_size
        stream += b"\x00\x00\x00\x01" + data[k : k + size]
        k += size

subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-f", "h264", "-i", "-", "-vf", f"select=eq(n\\,{frame - key})", "-frames:v", "1", out],
    input=stream,
    check=True,
)
print(f"frame {frame} (from keyframe {key}) -> {out}")
