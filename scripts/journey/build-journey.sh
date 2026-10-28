#!/usr/bin/env bash
# Encodes the journey video for the scroll-driven WebCodecs player.
#
#   scripts/journey/build-journey.sh <source.mp4> [work-dir]
#
# The source is the 4K 60 fps film. First fix_duplicates.py rebuilds its copied
# in-between frames (<work-dir>/journey-dedup.mp4), then smooth_cuts.py softens two
# rough spots (a hard cut, an abrupt camera turn) into <work-dir>/journey-source.mp4
# (both kept: delete them to redo). Then for each size it writes an H.264 file
# (decoded in hardware almost everywhere) with a frame index (index.py; files over
# 45 MB are split into parts at keyframes): 2160p for 4K screens, 1440p ("2K") for
# large ones, 1080p, and 720p, which plays first everywhere while the sharp size
# loads. 720p also gets an AV1 file (used where H.264 decoding isn't available;
# such browsers then play 720p). Plus a
# poster of the first frame and a sheet of small frames (every 20th, 192x108,
# 16 per row) shown blurred wherever the real frame isn't decoded yet.
#
# - No B-frames / reordering (H.264 -bf 0, AV1 low-delay), so frame i is packet i.
# - A keyframe every GOP frames (one second): scrolling backwards decodes at most one GOP.
# - Every source frame is kept (same frame rate); audio is dropped.
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
GOP=60
mkdir -p "$OUT" "$WORK"
DEDUP="$WORK/journey-dedup.mp4"
SRC="$WORK/journey-source.mp4"
[ -f "$DEDUP" ] || "$PY" "$HERE/fix_duplicates.py" "$1" "$DEDUP"
[ -f "$SRC" ] || "$PY" "$HERE/smooth_cuts.py" "$DEDUP" "$SRC"

encode() { # height h264-crf [av1-crf]
  local vf="scale=-2:$1:flags=lanczos" name="journey-$1" preset=slow
  [ "$1" -lt 2160 ] || preset=medium # 4K: several times the work; the difference doesn't show
  rm -f "$OUT/$name".*
  ffmpeg -v error -y -i "$SRC" -an -vf "$vf" -c:v libx264 -preset $preset -tune film -crf "$2" -profile:v high \
    -x264-params aq-mode=3:deblock=-1,-1 \
    -bf 0 -g $GOP -keyint_min $GOP -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart "$OUT/$name.h264.mp4"
  "$PY" "$HERE/index.py" "$OUT/$name.h264.mp4" "$OUT/$name.h264.json" --max-part 45
  [ -n "${3:-}" ] || return 0
  ffmpeg -v error -y -i "$SRC" -an -vf "$vf" -c:v libsvtav1 -crf "$3" -g $GOP -svtav1-params pred-struct=1 \
    -pix_fmt yuv420p -movflags +faststart "$OUT/$name.av1.mp4"
  "$PY" "$HERE/index.py" "$OUT/$name.av1.mp4" "$OUT/$name.av1.json" --max-part 45
}

encode 2160 24
encode 1440 23
encode 1080 23
encode 720 24 36
ffmpeg -v error -y -i "$SRC" -vf "scale=1920:-2:flags=lanczos" -frames:v 1 -q:v 3 "$OUT/journey-poster.jpg"
ffmpeg -v error -y -i "$SRC" -vf "select='not(mod(n\,20))',scale=192:108:flags=area,tile=16x16" -frames:v 1 -q:v 5 \
  "$OUT/journey-thumbs.jpg"

ls -la "$OUT"
