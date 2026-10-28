#!/usr/bin/env bash
# Encodes the journey video for the scroll-driven WebCodecs player.
#
#   scripts/journey/build-journey.sh <source.mp4> [work-dir]
#
# First smooth_cuts.py softens two rough spots of the source (a hard cut, an abrupt
# camera turn) into <work-dir>/journey-source.mp4 (kept: delete it to redo); then
# For each size (1440p "2K" for large screens, 1080p, 720p for phones) it writes
# an H.264 file (decoded in hardware almost everywhere) and an AV1 file (used where
# H.264 decoding isn't available), each with a frame index (index.py; files over
# 45 MB are split into parts at keyframes), plus a
# poster of the first frame and a sheet of small frames (every 10th, 192x108,
# 16 per row) shown blurred wherever the real frame isn't decoded yet.
#
# - No B-frames / reordering (H.264 -bf 0, AV1 low-delay), so frame i is packet i.
# - A keyframe every GOP frames: scrolling backwards decodes at most one GOP.
# - Every source frame is kept (same frame rate, no interpolation); audio is dropped.
# - x264 adaptive quantisation mode 3 and lighter deblocking keep flat sky, snow and
#   cloud gradients free of blocks and banding.
#
# Requirements: ffmpeg with libx264 and libsvtav1, Python 3 with numpy +
# opencv-python-headless (PYTHON=... to pick the interpreter).
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${2:-/tmp/journey-work}
OUT=$(cd "$HERE/../.." && pwd)/public/media/journey
PY=${PYTHON:-python3}
GOP=30
mkdir -p "$OUT" "$WORK"
SRC="$WORK/journey-source.mp4"
[ -f "$SRC" ] || "$PY" "$HERE/smooth_cuts.py" "$1" "$SRC"

encode() { # height h264-crf av1-crf
  local vf="scale=-2:$1:flags=lanczos" name="journey-$1"
  rm -f "$OUT/$name".*
  ffmpeg -v error -y -i "$SRC" -an -vf "$vf" -c:v libx264 -preset slow -tune film -crf "$2" -profile:v high \
    -x264-params aq-mode=3:deblock=-1,-1 \
    -bf 0 -g $GOP -keyint_min $GOP -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart "$OUT/$name.h264.mp4"
  ffmpeg -v error -y -i "$SRC" -an -vf "$vf" -c:v libsvtav1 -crf "$3" -g $GOP -svtav1-params pred-struct=1 \
    -pix_fmt yuv420p -movflags +faststart "$OUT/$name.av1.mp4"
  for codec in h264 av1; do
    "$PY" "$HERE/index.py" "$OUT/$name.$codec.mp4" "$OUT/$name.$codec.json" --max-part 45
  done
}

encode 1440 22 32
encode 1080 22 34
encode 720 23 36
ffmpeg -v error -y -i "$SRC" -vf "scale=1920:-2:flags=lanczos" -frames:v 1 -q:v 3 "$OUT/journey-poster.jpg"
ffmpeg -v error -y -i "$SRC" -vf "select='not(mod(n\,10))',scale=192:108:flags=area,tile=16x16" -frames:v 1 -q:v 5 \
  "$OUT/journey-thumbs.jpg"

ls -la "$OUT"
