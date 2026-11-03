#!/usr/bin/env bash
# The video behind "Describe your dream website" (step 4 of Create my website):
# a 4K 60 fps flight round a seaside residence, GitHub release `create-video` (1103.mp4).
#
# Silent (the audio is dropped), 30 fps, at one even pace and looping with no cut or fade:
# scripts/create/dream_loop.py re-times it (slow stretches sped up) and plays it forward,
# then the same way back. Two sizes (1080p for large screens, 720p for phones) in AV1
# (small) and H.264 (plays everywhere), plus a poster of the first frame.
#
#   scripts/create/build-dream.sh path/to/1103.mp4    (needs OpenCV: pip install opencv-python-headless)
set -euo pipefail
SRC="${1:?source video}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/public/media/create"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

python3 "$(dirname "$0")/dream_loop.py" "$SRC" "$TMP/master.mp4"

encode() { # name width av1-crf h264-crf
  ffmpeg -v error -y -i "$TMP/master.mp4" -an -vf "scale=$2:-2:flags=lanczos" \
    -c:v libsvtav1 -preset 6 -crf "$3" -g 60 -pix_fmt yuv420p -movflags +faststart "$OUT/dream-$1.av1.mp4"
  ffmpeg -v error -y -i "$TMP/master.mp4" -an -vf "scale=$2:-2:flags=lanczos" \
    -c:v libx264 -preset slow -crf "$4" -profile:v high -g 60 -pix_fmt yuv420p -movflags +faststart "$OUT/dream-$1.h264.mp4"
}
encode 1080 1920 36 25
encode 720 1280 36 25
ffmpeg -v error -y -i "$TMP/master.mp4" -frames:v 1 -vf "scale=1920:-2" -q:v 4 "$OUT/dream-poster.jpg"
ls -la "$OUT"
