"""The intro's ending: the camera comes to rest looking out at the beach through
the palms, and the Sandy Labs logo is drawn in white in the middle of the frame,
stroke by stroke, as if written in the air.

- Ending: the film stops at END. The camera moves forward through the palms,
  so every frame here is motion-blurred toward the edges; only the middle is
  sharp. The last stretch is retimed to slow to a stop, and as it slows the
  camera pushes in on the sharp middle while the blur left at the edges is
  turned into a soft, even focus blur, so the still reads as a stopped camera
  focused on the sea rather than a paused moving shot.
- Logo: the white-on-black logo image, cleaned into crisp anti-aliased lines at
  4K, with a soft shadow so it reads against the sky and sand.
- Drawing: the island outline is swept around the island from its notch, then
  the lagoon, S A N D Y one letter after another, then the lines and LABS.

Requirements: ffmpeg, Python with numpy + opencv-python-headless.

Usage: python air_logo.py IN.mp4 LOGO.png OUT.mp4
"""
import subprocess
import sys
from collections import deque

import cv2
import numpy as np

W, H, FPS = 3840, 2160, 24

END = 635             # last frame of footage (sharp centre, view out to the beach)
EASE_SOURCE = 12      # the source frames before END that are slowed down...
EASE_FRAMES = 24      # ...over this many output frames, so the camera glides to a stop
REST_FRAMES = 6       # still frame before the drawing starts
DRAW_FRAMES = 84      # drawing the logo (3.5s)
GAP_FRAMES = 1.0      # pause between strokes, in frames
DRAW_TAIL = 3         # last strokes finish this many frames before the end
FRONT_FRAMES = 1.5    # softness of the drawing front, in frames
CUT_RADIUS = 5        # (logo image pixels) where closed shapes are opened to be drawn in one direction
PUSH_IN = 1.55        # final zoom on the sharp middle of the frame
FOCUS_SIGMA = 14      # (output pixels) soft focus blur at the frame's edges
FOCUS_FROM, FOCUS_TO = 0.35, 0.9  # radius (fraction of the half-diagonal) where it starts / is full
LOGO_WIDTH = 0.3      # logo width as a fraction of the frame width
LOGO_CENTRE = (0.5, 0.48)
SHADOW = 0.35         # darkening under the lines, for contrast
DIM = 0.12            # the whole picture dims this much while the logo appears


def decode(path, first, last):
    vf = f"select='between(n\\,{first}\\,{last})'"
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", vf, "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def between(a, b, f):
    """The frame a fraction f of the way from a to b, warped along the optical flow both ways."""
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    ga, gb = (cv2.cvtColor(cv2.resize(x, (W // 2, H // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
              for x in (a, b))
    up = lambda flow: cv2.resize(flow, (W, H), interpolation=cv2.INTER_LINEAR) * 2
    fab, fba = up(dis.calc(ga, gb, None)), up(dis.calc(gb, ga, None))
    gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    wa = cv2.remap(a, gx - f * fab[..., 0], gy - f * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    wb = cv2.remap(b, gx - (1 - f) * fba[..., 0], gy - (1 - f) * fba[..., 1], cv2.INTER_LINEAR,
                   borderMode=cv2.BORDER_REFLECT)
    return (wa.astype(np.float32) * (1 - f) + wb.astype(np.float32) * f).astype(np.uint8)


def settle(frame, u, focus):
    """The frame pushed in on its middle and softened at the edges, u (0..1) of the way to the still."""
    e = 1 - (1 - u) ** 2
    z = 1 + (PUSH_IN - 1) * e
    m = cv2.getRotationMatrix2D((W / 2, H / 2), 0, z)
    f = cv2.warpAffine(frame, m, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    w = (focus * e)[..., None]
    return f * (1 - w) + cv2.GaussianBlur(f, (0, 0), FOCUS_SIGMA) * w


def logo_alpha(path):
    """Coverage of the white lines (0..1), cropped to the logo with a small margin."""
    g = cv2.imread(path, cv2.IMREAD_GRAYSCALE).astype(np.float32)
    a = np.clip((g - 30) / 170, 0, 1)
    ys, xs = np.nonzero(a > 0.3)
    m = 12
    return a[ys.min() - m:ys.max() + m, xs.min() - m:xs.max() + m]


def _sweep(ys, xs, along_x):
    """0..1 progress through a letter or line: left to right for lines, top-down (slightly diagonal) otherwise."""
    v = xs.astype(np.float64) if along_x else ys + 0.35 * xs
    return (v - v.min()) / max(1.0, np.ptp(v))


def _along(ys, xs, start, leftwards):
    """0..1 progress along a closed line from `start`, as a pen would travel it.

    The loop is cut open at the start and walked (breadth-first, through the
    line's pixels) from the cut end on the chosen side, so it is drawn in one
    direction all the way round.
    """
    h, w = ys.max() + 3, xs.max() + 3
    on = np.zeros((h, w), bool)
    on[ys, xs] = True
    cut = (ys - start[0]) ** 2 + (xs - start[1]) ** 2 <= CUT_RADIUS ** 2
    on[ys[cut], xs[cut]] = False
    rim = [(y, x) for y, x in zip(ys[~cut], xs[~cut])
           if (y - start[0]) ** 2 + (x - start[1]) ** 2 <= (CUT_RADIUS + 2) ** 2]
    y0, x0 = min(rim, key=lambda p: p[1]) if leftwards else max(rim, key=lambda p: p[1])
    dist = np.full((h, w), -1, np.int32)
    dist[y0, x0] = 0
    q = deque([(y0, x0)])
    while q:
        y, x = q.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = y + dy, x + dx
                if on[ny, nx] and dist[ny, nx] < 0:
                    dist[ny, nx] = dist[y, x] + 1
                    q.append((ny, nx))
    d = dist[ys, xs].astype(np.float64)
    top = d.max()
    d[d < 0] = top + 1  # the cut itself closes the loop at the very end
    return d / (top + 1)


def time_map(lines):
    """Frame (from the start of the drawing) at which each line pixel is drawn; -1 elsewhere."""
    n, lab, stats, cent = cv2.connectedComponentsWithStats(lines)
    comps = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 15]
    island = max(comps, key=lambda i: stats[i, cv2.CC_STAT_AREA])
    ix, iy, iw, ih = stats[island, :4]
    inside = [i for i in comps if i != island and ix < cent[i][0] < ix + iw and iy < cent[i][1] < iy + ih]
    text = [i for i in comps if i != island and i not in inside]
    split = (min(stats[i, 1] for i in text) + max(stats[i, 1] + stats[i, 3] for i in text)) / 2
    top = sorted([i for i in text if cent[i][1] < split], key=lambda i: cent[i][0])
    bottom = sorted([i for i in text if cent[i][1] >= split], key=lambda i: cent[i][0])

    strokes = []
    ys, xs = np.nonzero(lab == island)
    k = np.argmin(ys - 0.5 * xs)  # the island's notch at its top right
    strokes.append((ys, xs, _along(ys, xs, (ys[k], xs[k]), leftwards=True)))
    for i in sorted(inside, key=lambda i: cent[i][0]):
        ys, xs = np.nonzero(lab == i)
        k = np.argmin(ys)
        strokes.append((ys, xs, _along(ys, xs, (ys[k], xs[k]), leftwards=True)))
    for i in top + bottom:
        ys, xs = np.nonzero(lab == i)
        strokes.append((ys, xs, _sweep(ys, xs, np.ptp(xs) > 3 * np.ptp(ys))))

    sizes = np.array([len(s[0]) for s in strokes], np.float64) ** 0.85
    budget = DRAW_FRAMES - DRAW_TAIL - GAP_FRAMES * (len(strokes) - 1)
    spans = sizes / sizes.sum() * budget
    t = np.full(lines.shape, -1.0, np.float32)
    at = 0.0
    for (ys, xs, u), span in zip(strokes, spans):
        t[ys, xs] = at + u * span
        at += span + GAP_FRAMES
    return t


def spread(t, lines):
    """Give every pixel the drawing time of its nearest line pixel (so anti-aliased edges follow)."""
    _, labels = cv2.distanceTransformWithLabels(1 - lines, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(lines)
    table = np.zeros(labels.max() + 1, np.float32)
    table[labels[ys, xs]] = t[ys, xs]
    return table[labels]


def main():
    src, logo_path, out = sys.argv[1:4]

    # Logo at output size: upscaled, then re-sharpened into crisp anti-aliased lines.
    a = logo_alpha(logo_path)
    scale = LOGO_WIDTH * W / a.shape[1]
    lines = (a > 0.3).astype(np.uint8)
    near = spread(time_map(lines), lines)
    lw, lh = round(a.shape[1] * scale), round(a.shape[0] * scale)
    a_up = cv2.resize(cv2.GaussianBlur(a, (0, 0), 0.6), (lw, lh), interpolation=cv2.INTER_CUBIC)
    a_up = np.clip((a_up - 0.3) / 0.35, 0, 1)
    near_up = cv2.resize(near, (lw, lh), interpolation=cv2.INTER_NEAREST)
    x0 = round(LOGO_CENTRE[0] * W - lw / 2)
    y0 = round(LOGO_CENTRE[1] * H - lh / 2)
    alpha = np.zeros((H, W), np.float32)
    alpha[y0:y0 + lh, x0:x0 + lw] = a_up
    times = np.full((H, W), 1e9, np.float32)
    times[y0:y0 + lh, x0:x0 + lw] = near_up

    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)
    write = lambda f: enc.stdin.write(np.ascontiguousarray(f).tobytes())

    # Footage up to the slow-down, unchanged.
    first_eased = END - EASE_SOURCE
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-frames:v", str(first_eased),
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    size = W * H * 3
    written = 0
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        enc.stdin.write(buf)
        written += 1
    dec.wait()

    # The camera glides to a stop: speed falls linearly from 1 to 0, so the source
    # position follows an ease-out. In-between positions are synthesised from the
    # optical flow between neighbouring frames (a plain blend would show doubles).
    gx, gy = np.meshgrid(np.linspace(-1, 1, W, dtype=np.float32), np.linspace(-1, 1, H, dtype=np.float32))
    r = np.sqrt((gx ** 2 + gy ** 2) / 2)
    focus = np.clip((r - FOCUS_FROM) / (FOCUS_TO - FOCUS_FROM), 0, 1)
    focus = focus * focus * (3 - 2 * focus)
    tail = decode(src, first_eased, END)
    for k in range(1, EASE_FRAMES + 1):
        u = k / EASE_FRAMES
        pos = EASE_SOURCE * (1 - (1 - u) ** 2)
        i = min(int(pos), EASE_SOURCE - 1)
        f = pos - i
        frame = tail[i] if f < 0.02 else tail[i + 1] if f > 0.98 else between(tail[i], tail[i + 1], f)
        write(np.clip(settle(frame, u, focus), 0, 255).astype(np.uint8))
        written += 1
    last = settle(tail[-1], 1.0, focus)
    for _ in range(REST_FRAMES):
        write(np.clip(last, 0, 255).astype(np.uint8))
        written += 1

    # Draw the logo, dimming the picture a little as it appears.
    for k in range(1, DRAW_FRAMES + 1):
        m = np.clip((k - times) / FRONT_FRAMES, 0, 1) * alpha
        dim = 1 - DIM * min(1.0, k / 24)
        shade = 1 - SHADOW * cv2.GaussianBlur(m, (0, 0), 10)
        frame = last * (dim * shade)[..., None]
        frame = frame * (1 - m[..., None]) + 255 * m[..., None]
        write(np.clip(frame, 0, 255).astype(np.uint8))
        written += 1

    enc.stdin.close()
    enc.wait()
    print(f"ending: footage to frame {END} (last {EASE_SOURCE} slowed over {EASE_FRAMES}), rest {REST_FRAMES}, "
          f"drawing {DRAW_FRAMES}; {written} frames ({written / FPS:.3f}s) in {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
