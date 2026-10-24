"""The intro's ending: the camera tilts down to look straight at the beach's own
sand, and the Sandy Labs logo is drawn into it, stroke by stroke, as if by a
fingertip.

- Tilt: after the last frame of footage, output corners travel from the full
  frame to a top-down view of the ground (an exact re-projection of the flat
  beach), so the sand stays the film's sand throughout.
- Grooves: taken from a photo of the logo written in sand (4x upscaled): only
  their shading (lightness relative to the surrounding sand) is pressed into
  the film's sand, which is smoothed under the strokes.
- Drawing: the grooves are revealed in order (island outline swept around the
  island, its inner line, the lagoon, S A N D Y one letter after another, then
  the lines and LABS), so each groove grows along like a finger moving through
  the sand.

Requirements: ffmpeg, Python with numpy + opencv-python-headless (and
the Real-ESRGAN weights next to upscale.py for the 4x photo; bicubic otherwise).

Usage: python sand_logo.py IN.mp4 PHOTO.jpg OUT.mp4
"""
import os
import subprocess
import sys

import cv2
import numpy as np

W, H, FPS = 3840, 2160, 24

# Where the logo is in the photo (x0, y0, x1, y1), pixels of the 1024x683 original.
PHOTO_CROP = (320, 180, 710, 500)
PAD = 320             # margin (layer pixels) around the logo
# Where the logo would lie on the ground in the last frame of footage, which sets
# where the camera looks: centre (fractions of the frame), width of the near
# (bottom) edge as a fraction of the frame width, how much narrower the far edge
# is, and how much the ground plane foreshortens the logo's height.
CENTER = (0.5, 0.6)
NEAR_WIDTH = 0.26
FAR_SCALE = 0.8
FORESHORTEN = 0.62
VIEW_WIDTH = 2.4      # top-down view width relative to the logo: the camera ends well above it
TILT_FRAMES = 44      # camera tilting down to the top-down view
REST_FRAMES = 12      # looking at the untouched sand before the drawing starts
DRAW_FRAMES = 96      # drawing the logo (4s)
GAP_FRAMES = 1.0      # pause between strokes, in frames
DRAW_TAIL = 3         # last strokes finish this many frames before the end
FRONT_FRAMES = 1.5    # softness of the drawing front, in frames
HALO_INNER, HALO_OUTER = 18, 34  # groove ridges around the centre lines (crop pixels)

# Logo layout in the 4x crop of the photo (PHOTO_CROP).
ISLAND_BOTTOM = 800               # the island sits above the lettering
LETTERS_BOTTOM = 1050             # SANDY above, the lines and LABS below
LAGOON_BOX = (780, 410, 1030, 610)
ISLAND_CENTRE = (780, 450)
MOUTH_ANGLE = 0.6                 # radians: the island's outline starts at its open top right

STRENGTH = 0.95       # groove depth relative to the photo
SMOOTHING = 0.8       # how much of the film's footprints the finger smooths away under the strokes
SMOOTH_SIGMA = 10     # (output pixels)


def upscale_crop(crop):
    here = os.path.dirname(os.path.abspath(__file__))
    weights = os.environ.get("ESRGAN_WEIGHTS", here)
    try:
        if not os.path.exists(os.path.join(weights, "realesr-general-x4v3.pth")):
            raise FileNotFoundError
        import onnxruntime as ort

        sys.path.insert(0, here)
        from upscale import build_model

        sess = ort.InferenceSession(build_model(0.5), providers=["CPUExecutionProvider"])
        x = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB).transpose(2, 0, 1)[None].astype(np.float32) / 255
        y = sess.run(["y"], {"x": x})[0][0].transpose(1, 2, 0)
        return cv2.cvtColor((y * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR)
    except (FileNotFoundError, ImportError):
        return cv2.resize(crop, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)


def smoothstep(x):
    return x * x * (3 - 2 * x)


def placement(layer_w, layer_h):
    """Perspective transform from the layer (logo area inside its margin) to its quad on the ground."""
    layer_w, layer_h = layer_w - 2 * PAD, layer_h - 2 * PAD
    cx, cy = CENTER[0] * W, CENTER[1] * H
    near = NEAR_WIDTH * W
    far = near * FAR_SCALE
    height = near * (layer_h / layer_w) * FORESHORTEN
    quad = np.float32([
        [cx - far / 2, cy - height / 2], [cx + far / 2, cy - height / 2],
        [cx + near / 2, cy + height / 2], [cx - near / 2, cy + height / 2],
    ])
    src = np.float32([[0, 0], [layer_w, 0], [layer_w, layer_h], [0, layer_h]]) + PAD
    return cv2.getPerspectiveTransform(src, quad)


def decode(path, start, size=None):
    vf = [f"select='gte(n\\,{start})'"]
    if size:
        vf.append(f"scale={size[0]}:{size[1]}:flags=area")
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", ",".join(vf), "-vsync", "0",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    w, h = size or (W, H)
    raw = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def _background_shade(photo_crop_up):
    """Lightness minus the sand's slowly varying background, so grooves read as negative."""
    L = cv2.cvtColor(photo_crop_up, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
    small = cv2.resize(L, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    bg = cv2.medianBlur(np.clip(small, 0, 255).astype(np.uint8), 31).astype(np.float32)
    bg = cv2.GaussianBlur(cv2.resize(bg, (L.shape[1], L.shape[0]), interpolation=cv2.INTER_CUBIC), (0, 0), 6)
    return L - bg


def _logo_components(m, min_area):
    """Keep the logo's connected parts, dropping pebbles and footprints around it."""
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        cx, cy = cent[i]
        junk = cy < 150 or cy > 1180 or (cx < 250 and cy < 700) or (cx > 1400 and cy > 1050)
        if stats[i, cv2.CC_STAT_AREA] > min_area and not junk:
            keep[lab == i] = 1
    return keep


def stroke_mask(photo_crop_up):
    """(grooves, extent): groove centre lines and the whole disturbed area of the logo (crop coordinates, 4x)."""
    shade = _background_shade(photo_crop_up)
    groove = cv2.GaussianBlur(-shade, (0, 0), 4)
    m = (groove > np.percentile(groove, 86)).astype(np.uint8)
    grooves = _logo_components(cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)), 900)
    energy = cv2.GaussianBlur(np.abs(cv2.GaussianBlur(shade, (0, 0), 2)), (0, 0), 6)
    m = (energy > np.percentile(energy, 70)).astype(np.uint8)
    extent = _logo_components(cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8)), 1200)
    return grooves, cv2.dilate(extent | grooves, np.ones((9, 9), np.uint8))


def _sweep(ys, xs, along_x):
    """0..1 progress through a letter or line: left to right for lines, top-down (slightly diagonal) otherwise."""
    v = xs.astype(np.float64) if along_x else ys + 0.35 * xs
    return (v - v.min()) / max(1.0, np.ptp(v))


def time_map(keep):
    """Frame (from the start of the drawing) at which each groove pixel is drawn; -1 outside the logo.

    Order: island outline, its inner beach line, the lagoon, S A N D Y, then the
    left line, L A B S and the right line. The island lines are swept around the
    island from the mouth at its top right; letters are written one after another.
    """
    h, w = keep.shape
    ys, xs = np.nonzero(keep)
    island = ys < ISLAND_BOTTOM
    lx0, ly0, lx1, ly1 = LAGOON_BOX
    lagoon = island & (xs > lx0) & (xs < lx1) & (ys > ly0) & (ys < ly1)
    ring = island & ~lagoon

    # Angle around the island, counter-clockwise on screen, starting at the mouth.
    cx, cy = ISLAND_CENTRE
    dx, dy = xs - cx, ys - cy
    ang = np.mod(np.arctan2(-dx, -dy) + MOUTH_ANGLE, 2 * np.pi)
    rad = np.hypot(dx, dy)
    # Outer outline vs inner line: split each 3 degree wedge at its widest radial gap.
    outer = np.zeros_like(ring)
    bins = (ang / (2 * np.pi) * 120).astype(int)
    for b in range(120):
        sel = ring & (bins == b)
        if not sel.any():
            continue
        r = np.sort(rad[sel])
        gaps = np.diff(r)
        if len(gaps) and gaps.max() > 25:
            outer[sel] = rad[sel] > r[np.argmax(gaps)]
        else:
            outer[sel] = True
    inner = ring & ~outer

    strokes = [(outer, ang / (2 * np.pi)), (inner, ang / (2 * np.pi))]
    lag_u = np.zeros(len(ys))
    if lagoon.any():
        lag_u[lagoon] = _sweep(ys[lagoon], xs[lagoon], True)
    strokes.append((lagoon, lag_u))

    # Letters: group the grooves of each row into glyphs by horizontal closeness.
    for row in (~island & (ys < LETTERS_BOTTOM), ~island & (ys >= LETTERS_BOTTOM)):
        if not row.any():
            continue
        rm = np.zeros((h, w), np.uint8)
        rm[ys[row], xs[row]] = 1
        n, lab, stats, cent = cv2.connectedComponentsWithStats(cv2.dilate(rm, np.ones((60, 24), np.uint8)))
        glyph = lab[ys, xs]
        for g in sorted(range(1, n), key=lambda g: cent[g][0]):
            sel = row & (glyph == g)
            if sel.sum() < 400:
                continue
            gw, gh = np.ptp(xs[sel]), np.ptp(ys[sel])
            u = np.zeros(len(ys))
            u[sel] = _sweep(ys[sel], xs[sel], gw > 1.8 * gh)
            strokes.append((sel, u))

    # Each stroke gets drawing time in proportion to its length (area / groove width).
    sizes = np.array([float(sel.sum()) for sel, _ in strokes]) ** 0.85
    budget = DRAW_FRAMES - DRAW_TAIL - GAP_FRAMES * (len(strokes) - 1)
    spans = sizes / sizes.sum() * budget
    t = np.full((h, w), -1.0, np.float32)
    at = 0.0
    for (sel, u), span in zip(strokes, spans):
        t[ys[sel], xs[sel]] = at + u[sel] * span
        at += span + GAP_FRAMES
    return t


def reveal_field(keep, extent, t):
    """Spread the drawing times from the groove centres over the grooves' ridges.

    Returns (time, weight): per pixel, the time of the nearest groove pixel and how
    much of the sand there belongs to the logo (1 near the groove, fading out).
    """
    dist, labels = cv2.distanceTransformWithLabels(1 - keep, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(keep == 1)
    table = np.zeros(labels.max() + 1, np.float32)
    table[labels[ys, xs]] = t[ys, xs]
    near = table[labels]
    weight = np.clip((HALO_OUTER - dist) / (HALO_OUTER - HALO_INNER), 0, 1)
    weight = np.maximum(weight, cv2.GaussianBlur(extent.astype(np.float32), (0, 0), 6))
    return near, weight.astype(np.float32)


def reveal_at(near, weight, f):
    """Logo mask at drawing frame f, with a soft front like sand pushed ahead of the finger."""
    return np.clip((f - near) / FRONT_FRAMES, 0, 1) * weight


def pressed_logo(sand, shade_v):
    """The sand with the logo's grooves pressed in, for revealing stroke by stroke.

    Under the strokes the film's footprints are smoothed over, as a finger pushing
    through would, and the photo's groove shading (its lightness relative to the
    surrounding sand) is laid on top, scaled to the film sand's contrast.
    """
    lab = cv2.cvtColor(sand, cv2.COLOR_RGB2LAB).astype(np.float32)
    soft = cv2.GaussianBlur(lab, (0, 0), SMOOTH_SIGMA)
    base = lab * (1 - SMOOTHING) + soft * SMOOTHING
    base[..., 0] += STRENGTH * shade_v
    return cv2.cvtColor(np.clip(base, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)


def main():
    src, photo_path, out = sys.argv[1:4]
    pad = PAD
    x0, y0, x1, y1 = PHOTO_CROP

    photo_bgr = cv2.imread(photo_path)
    crop_up = upscale_crop(photo_bgr[y0:y1, x0:x1])

    keep, extent = stroke_mask(crop_up)  # crop coordinates (4x)
    near, weight = reveal_field(keep, extent, time_map(keep))
    ch, cw = keep.shape
    layer_w, layer_h = cw + 2 * pad, ch + 2 * pad
    place = placement(layer_w, layer_h)

    # Views: output pixels -> layer coordinates (the top-down framing).
    lw, lh = cw, ch
    vw = lw * VIEW_WIDTH
    vh = vw * H / W
    cx, cy = pad + lw / 2, pad + lh / 2
    view = np.float32([[cx - vw / 2, cy - vh / 2], [cx + vw / 2, cy - vh / 2],
                       [cx + vw / 2, cy + vh / 2], [cx - vw / 2, cy + vh / 2]])
    out_rect = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    out_to_layer = cv2.getPerspectiveTransform(out_rect, view)
    end_quad = cv2.perspectiveTransform(view.reshape(-1, 1, 2), place).reshape(-1, 2)
    print("top-down view footprint in the last frame:", np.round(end_quad).tolist(), file=sys.stderr)

    total = int(subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
         "stream=nb_read_packets", "-of", "csv=p=0", src], text=True).strip())
    last = decode(src, total - 1)[0]

    # The camera ends on the film's own beach, seen from above: the last frame re-projected.
    sand_v = cv2.warpPerspective(last, cv2.getPerspectiveTransform(out_rect, end_quad), (W, H),
                                 flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)

    # The logo lives on the crop grid: crop -> layer -> output.
    crop_to_layer = np.array([[1, 0, pad], [0, 1, pad], [0, 0, 1]], np.float64)
    out_to_crop = np.linalg.inv(crop_to_layer) @ out_to_layer
    shade_v = cv2.warpPerspective(_background_shade(crop_up), out_to_crop, (W, H),
                                  flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    shade_v = cv2.GaussianBlur(shade_v, (0, 0), 1.2)  # as soft as the film's re-projected sand
    logo_v = pressed_logo(sand_v, shade_v)

    # Copy the footage through unchanged.
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    size = W * H * 3
    written = 0
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        enc.stdin.write(buf)
        written += 1
    dec.wait()

    # Tilt down to look straight at the sand.
    for k in range(1, TILT_FRAMES + 1):
        a = smoothstep(k / TILT_FRAMES)
        quad = (1 - a) * out_rect + a * end_quad
        tq = cv2.getPerspectiveTransform(out_rect, quad)
        frame = cv2.warpPerspective(last, tq, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                                    borderMode=cv2.BORDER_REFLECT)
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
        written += 1

    for _ in range(REST_FRAMES):
        enc.stdin.write(np.ascontiguousarray(sand_v).tobytes())
        written += 1

    # Draw the logo: the drawing times and the logo's extent, seen from the top-down view.
    near_v = cv2.warpPerspective(near, out_to_crop, (W, H), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP)
    weight_v = cv2.warpPerspective(weight, out_to_crop, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    for f in range(1, DRAW_FRAMES + 1):
        mv = cv2.GaussianBlur(reveal_at(near_v, weight_v, f), (0, 0), 2)[..., None]
        frame = (sand_v * (1 - mv) + logo_v * mv).astype(np.uint8)
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
        written += 1

    enc.stdin.close()
    enc.wait()
    print(f"ending: tilt {TILT_FRAMES} + rest {REST_FRAMES} + drawing {DRAW_FRAMES} frames; "
          f"{written} frames ({written / FPS:.3f}s) in {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
