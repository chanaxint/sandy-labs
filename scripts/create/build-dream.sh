#!/usr/bin/env bash
# The video behind "Describe your dream website" (step 4 of Create my website):
# a 4K 60 fps flight round a seaside residence that ends on the shot it began with,
# GitHub release `create-video-2` (1104.mp4; the earlier one is release `create-video`).
#
# Silent (the audio is dropped), 60 fps, every scene at one even, slightly quick and fluid
# pace (scripts/create/dream_loop.py re-times it, optical-flow in-betweens blended),
# forward only, and a seamless loop: the in-betweens from its last frame to its first
# carry the camera on into the opening (no cut, no dissolve); the page loops it.
# Two sizes (1080p for large screens, 720p for phones) in AV1 (small) and H.264 (plays
# everywhere), plus a poster of the first frame.
#
#   scripts/create/build-dream.sh path/to/1104.mp4 [speed, default 1.3]    (needs OpenCV: pip install opencv-python-headless)
set -euo pipefail
SRC="${1:?source video}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/public/media/create"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

python3 "$(dirname "$0")/dream_loop.py" "$SRC" "$TMP/master.mp4" "${2:-1.3}"

encode() { # name width av1-crf h264-crf
  ffmpeg -v error -y -i "$TMP/master.mp4" -an -vf "scale=$2:-2:flags=lanczos" \
    -c:v libsvtav1 -preset 6 -crf "$3" -g 120 -pix_fmt yuv420p -movflags +faststart "$OUT/dream-$1.av1.mp4"
  ffmpeg -v error -y -i "$TMP/master.mp4" -an -vf "scale=$2:-2:flags=lanczos" \
    -c:v libx264 -preset slow -crf "$4" -profile:v high -g 120 -pix_fmt yuv420p -movflags +faststart "$OUT/dream-$1.h264.mp4"
}
encode 1080 1920 36 25
encode 720 1280 36 25
ffmpeg -v error -y -i "$TMP/master.mp4" -frames:v 1 -vf "scale=1920:-2" -q:v 4 "$OUT/dream-poster.jpg"
ls -la "$OUT"
