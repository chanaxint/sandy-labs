#!/usr/bin/env bash
# Builds the intro film from the three source clips.
#
#   scripts/intro/build-intro.sh <plane.mp4> <drone.mp4> <forest.mp4> <work-dir>
#
# 1. Brings every clip to 3840x2160 at 24 fps. Clips already at 4K are used as they
#    are (the forest clip is a TensorPix 4K upscale supplied separately). The drone
#    clip (rocky island, coastline) uses Real-ESRGAN (upscale.py: Python with
#    numpy/onnx/onnxruntime + the weights next to it). Other clips use Lanczos +
#    contrast-adaptive sharpening; Real-ESRGAN smooths dense foliage into a painted look.
# 2. Joins them with short cross-fades and removes audio.
# 3. Writes a 4K master to <work-dir> and web encodes (1080p/720p, forward and
#    reversed, H.264 + AV1) to public/media/intro/.
#
# After changing footage, update `duration` and the stop times in lib/intro.ts.
set -euo pipefail

A=$1 B=$2 C=$3 WORK=$4
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$(cd "$HERE/../.." && pwd)/public/media/intro
PY=${PYTHON:-python3}
mkdir -p "$WORK" "$OUT"

is4k() {
  [ "$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$1")" -ge 2160 ]
}

native() { # src dst: already 4K, just match frame rate and size
  ffmpeg -v error -y -i "$1" -an -vf "fps=24,scale=3840:2160:flags=lanczos" \
    -c:v libx264 -preset medium -crf 12 -pix_fmt yuv420p "$2"
}

classic() { # src dst [extra filters]
  ffmpeg -v error -y -i "$1" -an \
    -vf "${3:+$3,}scale=3840:2160:flags=lanczos,cas=0.45" \
    -c:v libx264 -preset medium -crf 12 -pix_fmt yuv420p "$2"
}

[ -f "$WORK/a4k.mp4" ] || classic "$A" "$WORK/a4k.mp4" "hqdn3d=1.2:1.2:2:2"
[ -f "$WORK/b4k.mp4" ] || "$PY" "$HERE/upscale.py" "$B" "$WORK/b4k.mp4" --denoise 0.2
if is4k "$C"; then
  [ -f "$WORK/c4k.mp4" ] || native "$C" "$WORK/c4k.mp4"
else
  # The 720p forest source is slightly hazy: a touch more contrast and saturation.
  [ -f "$WORK/c4k.mp4" ] || classic "$C" "$WORK/c4k.mp4" "eq=contrast=1.06:saturation=1.08"
fi

# A ends where B begins (island from above); B ends where C begins (forest).
# Cross-fade 0.5s and 0.3s respectively: total = 10 + 10 + 10 - 0.8 = 29.2s.
norm="fps=24,settb=AVTB,format=yuv420p,setsar=1"
ffmpeg -v error -y -i "$WORK/a4k.mp4" -i "$WORK/b4k.mp4" -i "$WORK/c4k.mp4" -filter_complex \
  "[0:v]$norm,trim=duration=10,setpts=PTS-STARTPTS[a];
   [1:v]$norm,trim=duration=10,setpts=PTS-STARTPTS[b];
   [2:v]$norm,setpts=PTS-STARTPTS[c];
   [a][b]xfade=transition=fade:duration=0.5:offset=9.5[ab];
   [ab][c]xfade=transition=fade:duration=0.3:offset=19.2,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset slow -crf 16 -profile:v high -movflags +faststart \
  "$WORK/sandy-labs-intro-4k.mp4"

web() { # height h264-crf av1-crf name
  local vf="scale=-2:$1:flags=lanczos"
  local gop=(-g 48 -keyint_min 48)
  local h264=(-an -c:v libx264 -preset slow -crf "$2" -profile:v high -pix_fmt yuv420p "${gop[@]}"
    -sc_threshold 0 -movflags +faststart)
  local av1=(-an -c:v libsvtav1 -preset 6 -crf "$3" -pix_fmt yuv420p "${gop[@]}" -movflags +faststart)
  for dir in "" "-reverse"; do
    local f="$vf"
    [ -n "$dir" ] && f="$vf,reverse"
    ffmpeg -v error -y -i "$WORK/sandy-labs-intro-4k.mp4" -vf "$f" "${h264[@]}" "$OUT/$4$dir.mp4"
    ffmpeg -v error -y -i "$WORK/sandy-labs-intro-4k.mp4" -vf "$f" "${av1[@]}" "$OUT/$4$dir.av1.mp4"
  done
}
# H.264 for every browser, AV1 (~30-45% smaller) where supported. Keyframe every 2s
# keeps the one seek per direction change quick.
web 1080 23 32 intro-1080
web 720 25 35 intro-720

ffmpeg -v error -y -i "$OUT/intro-1080.mp4" -frames:v 1 -q:v 4 "$OUT/intro-poster.jpg"

ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/intro-1080.mp4"
ls -la "$OUT" "$WORK/sandy-labs-intro-4k.mp4"
