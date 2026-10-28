"""Smooths two rough spots of the journey source before it is encoded.

- CUT (frames 1097 → 1098): a hard cut between two mountain shots. The outgoing shot
  gathers a forward (zoom) motion blur into the cut, its last frame keeps drifting
  forward while the incoming shot fades in over a few frames, and the blur clears.
- TURN (around frame 1619): the camera tilts down and reverses within one frame, which
  reads as a jump (the image can't be re-framed there: the mountains sit at the very
  top edge). Instead time is eased through the turn: the camera slows into it and
  speeds out, with in-between frames made from the optical flow between real ones.
  This adds TURN_EXTRA frames (scripts/journey/build-journey.sh prints the new count;
  `film.frames` in lib/journey/config.ts must match).

Requirements: ffmpeg, Python with numpy + opencv-python-headless.

Usage: python smooth_cuts.py SOURCE.mp4 OUT.mp4
"""
import subprocess
import sys

import cv2
import numpy as np

# Frame numbers and durations below are at 30 fps; they are scaled to the source's rate.
CUT = 1098            # first frame of the incoming shot
CUT_BLUR = (1092, 1105)  # frames that get motion blur (peak at the cut)
CUT_FADE = 5          # frames the incoming shot takes to fade in
BLUR_ZOOM = 0.02      # strength of the zoom blur at the cut (fraction of the frame): light
DRIFT = 0.004         # forward zoom per frame of the held outgoing frame

TURN = (1609, 1629)   # source frames eased through (the turn is at 1619)
TURN_EXTRA = 12       # frames added: the turn plays at a quarter of the speed at its slowest


def at_rate(scale):
    """Rescales the frame numbers above from 30 fps to the source's frame rate."""
    global CUT, CUT_BLUR, CUT_FADE, DRIFT, TURN, TURN_EXTRA
    CUT = round(CUT * scale)
    CUT_BLUR = (round(CUT_BLUR[0] * scale), round(CUT_BLUR[1] * scale))
    CUT_FADE = round(CUT_FADE * scale)
    DRIFT /= scale
    TURN = (round(TURN[0] * scale), round(TURN[1] * scale))
    TURN_EXTRA = round(TURN_EXTRA * scale)


def probe(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
         "stream=width,height,r_frame_rate,nb_read_packets", "-of", "csv=p=0", path], text=True).strip()
    w, h, rate, n = out.split(",")
    return int(w), int(h), rate, int(n)


def decode_range(path, first, last, w, h):
    vf = f"select='between(n\\,{first}\\,{last})'"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", vf, "-vsync", "0", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, check=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    return {first + i: f for i, f in enumerate(frames)}


def zoom(img, z):
    """Scale about the centre by z."""
    h, w = img.shape[:2]
    m = np.float32([[z, 0, (1 - z) * w / 2], [0, z, (1 - z) * h / 2]])
    return cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)


def zoom_blur(img, amount, steps=9):
    """Radial blur, as of a camera moving forward: average of slightly larger copies."""
    if amount <= 1e-4:
        return img.astype(np.float32)
    acc = np.zeros(img.shape, np.float32)
    for k in range(steps):
        acc += zoom(img, 1 + amount * k / (steps - 1)).astype(np.float32)
    return acc / steps


def smoothstep(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def fix_cut(frames, scale):
    out = {}
    a0, a1 = CUT_BLUR
    # The last real frame of the outgoing shot: above 30 fps, the in-betweens next to the
    # cut were interpolated across it (a morph of both shots), so they are left out.
    last = CUT - max(1, round(scale))
    last_out = frames[last]
    for i in range(a0, a1 + 1):
        # Blur rises into the cut and clears after it.
        if i < CUT:
            b = smoothstep((i - a0 + 1) / (CUT - a0))
        else:
            b = smoothstep(1 - (i - CUT) / (a1 - CUT + 1))
        amount = BLUR_ZOOM * b
        if i <= last:
            out[i] = np.clip(zoom_blur(frames[i], amount), 0, 255).astype(np.uint8)
            continue
        if i < CUT:  # in-between across the cut: the outgoing shot drifting on instead
            out[i] = np.clip(zoom_blur(zoom(last_out, 1 + DRIFT * (i - last)), amount), 0, 255).astype(np.uint8)
            continue
        incoming = zoom_blur(frames[i], amount)
        fade = smoothstep((i - CUT + 1) / (CUT_FADE + 1))
        if fade < 1:
            held = zoom_blur(zoom(last_out, 1 + DRIFT * (i - last)), amount)
            incoming = held * (1 - fade) + incoming * fade
        out[i] = np.clip(incoming, 0, 255).astype(np.uint8)
    return out


def between(a, b, f):
    """The frame a fraction f of the way from a to b, warped along the optical flow both ways."""
    h, w = a.shape[:2]
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    small = (w // 4, h // 4)
    ga, gb = (cv2.cvtColor(cv2.resize(x, small, interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY) for x in (a, b))
    up = lambda flow: cv2.resize(flow, (w, h), interpolation=cv2.INTER_LINEAR) * 4
    fab, fba = up(dis.calc(ga, gb, None)), up(dis.calc(gb, ga, None))
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    wa = cv2.remap(a, gx - f * fab[..., 0], gy - f * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    wb = cv2.remap(b, gx - (1 - f) * fba[..., 0], gy - (1 - f) * fba[..., 1], cv2.INTER_LINEAR,
                   borderMode=cv2.BORDER_REFLECT)
    return (wa.astype(np.float32) * (1 - f) + wb.astype(np.float32) * f).astype(np.uint8)


def ease_turn(frames):
    """Frames replacing TURN[0]..TURN[1]: same start and end, slower through the middle."""
    s0, s1 = TURN
    count = s1 - s0 + 1 + TURN_EXTRA
    # Speed (source frames per output frame) 1 at both ends, dipping smoothly in the middle;
    # its average makes the window span exactly s1 - s0 source frames.
    mean = (s1 - s0) / (count - 1)
    dip = 2 * (1 - mean)  # speed = 1 - dip * sin²(πu): average 1 - dip / 2
    u = np.linspace(0, 1, 2001)
    speed = 1 - dip * np.sin(np.pi * u) ** 2
    cum = np.concatenate([[0], np.cumsum((speed[1:] + speed[:-1]) / 2)])
    cum /= cum[-1]
    out = []
    for k in range(count):
        pos = s0 + (s1 - s0) * float(np.interp(k / (count - 1), u, cum))
        i = min(int(pos), s1 - 1)
        f = pos - i
        out.append(frames[i] if f < 0.02 else frames[i + 1] if f > 0.98 else between(frames[i], frames[i + 1], f))
    print(f"turn: {s1 - s0 + 1} frames → {count}, slowest {1 - dip:.2f}x", file=sys.stderr)
    return out


def main():
    src, dst = sys.argv[1:3]
    w, h, rate, n = probe(src)
    num, den = map(int, rate.split("/"))
    scale = num / den / 30
    if abs(scale - 1) > 1e-3:
        at_rate(scale)
    patches = fix_cut(decode_range(src, CUT_BLUR[0], CUT_BLUR[1], w, h), scale)
    turn = ease_turn(decode_range(src, TURN[0], TURN[1], w, h))

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
                            "-r", rate, "-i", "-", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "12",
                            "-pix_fmt", "yuv420p", dst], stdin=subprocess.PIPE)
    size = w * h * 3
    i = written = 0
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        if i == TURN[0]:
            for f in turn:
                enc.stdin.write(f.tobytes())
                written += 1
        if not TURN[0] <= i <= TURN[1]:
            enc.stdin.write(patches[i].tobytes() if i in patches else buf)
            written += 1
        i += 1
    enc.stdin.close()
    dec.wait()
    enc.wait()
    print(f"{dst}: {written} frames (source {n})", file=sys.stderr)


if __name__ == "__main__":
    main()
