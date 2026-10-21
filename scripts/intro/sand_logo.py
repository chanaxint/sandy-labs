"""The intro's ending: the camera tilts down to look straight at clean sand, and
the Sandy Labs logo is drawn into it, stroke by stroke, as if by a fingertip.

- Sand: a photo of the logo written in sand (4x upscaled). A logo-free copy is
  made by inpainting the strokes (low frequencies) and re-graining them with
  sand texture from elsewhere in the photo.
- Tilt: after the last frame of footage, output corners travel from the full
  frame to a top-down view of the ground (an exact re-projection of the flat
  beach), handing over to the colour-matched clean photo.
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
PHOTO_FROM = 0.4      # point in the tilt where the photo's sand starts taking over
REST_FRAMES = 12      # looking at the clean sand before the drawing starts
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
GRAIN_STRIP = (200, 1200)         # logo-free columns of the 4x photo used to re-grain the cleaned sand


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


def clean_sand(photo_up, logo_mask_photo):
    """The photo with the logo removed: inpainted base + real sand grain from elsewhere."""
    m = cv2.dilate(logo_mask_photo, np.ones((31, 31), np.uint8))
    small = cv2.resize(photo_up, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    sm = cv2.resize(m, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    low = cv2.inpaint(small, sm, 9, cv2.INPAINT_TELEA)
    low = cv2.resize(low, (photo_up.shape[1], photo_up.shape[0]), interpolation=cv2.INTER_CUBIC)
    low = cv2.GaussianBlur(low, (0, 0), 6).astype(np.float32)
    f = photo_up.astype(np.float32)
    grain = f - cv2.GaussianBlur(f, (0, 0), 6)
    # Real grain from the logo-free strip at the photo's left, laid down as randomly picked,
    # overlapping patches (no repeats or seams), clipped so pebbles and footprints don't carry over.
    sx0, sx1 = GRAIN_STRIP
    strip = grain[:, sx0:sx1]
    lim = np.percentile(np.abs(strip), 90)
    strip = np.clip(strip, -lim, lim)
    ys, xs = np.nonzero(m)
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    size, step = 192, 96
    win = np.outer(np.hanning(size), np.hanning(size)).astype(np.float32)[..., None] + 1e-4
    acc = np.zeros((by1 - by0 + size + step, bx1 - bx0 + size + step, 3), np.float32)
    norm = np.zeros(acc.shape[:2] + (1,), np.float32)
    rng = np.random.default_rng(7)
    for y in range(0, by1 - by0 + step, step):
        for x in range(0, bx1 - bx0 + step, step):
            py = rng.integers(0, strip.shape[0] - size)
            px = rng.integers(0, strip.shape[1] - size)
            acc[y:y + size, x:x + size] += strip[py:py + size, px:px + size] * win
            norm[y:y + size, x:x + size] += win ** 2
    # Dividing by the root of the summed squared weights keeps the grain's contrast.
    donor = np.zeros_like(grain)
    donor[by0:by1, bx0:bx1] = (acc / np.sqrt(np.maximum(norm, 1e-8)))[size // 2:size // 2 + by1 - by0, size // 2:size // 2 + bx1 - bx0]
    soft = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 14)[..., None]
    filled = low + donor
    return np.clip(f * (1 - soft) + filled * soft, 0, 255).astype(np.uint8)


def colour_lut(src, ref):
    """Per-channel Lab look-up tables mapping src's histogram onto ref's."""
    s = cv2.cvtColor(src, cv2.COLOR_RGB2LAB)
    r = cv2.cvtColor(ref, cv2.COLOR_RGB2LAB)
    luts = []
    for c in range(3):
        sc = np.cumsum(np.bincount(s[..., c].ravel(), minlength=256)).astype(np.float64)
        rc = np.cumsum(np.bincount(r[..., c].ravel(), minlength=256)).astype(np.float64)
        luts.append(np.clip(np.interp(sc / sc[-1], rc / rc[-1], np.arange(256)), 0, 255).astype(np.uint8))
    return luts


def apply_lut(img, luts):
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    for c in range(3):
        lab[..., c] = cv2.LUT(lab[..., c], luts[c])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)


def main():
    src, photo_path, out = sys.argv[1:4]
    pad = PAD
    x0, y0, x1, y1 = PHOTO_CROP

    photo_bgr = cv2.imread(photo_path)
    crop_up = upscale_crop(photo_bgr[y0:y1, x0:x1])
    photo_up = cv2.cvtColor(upscale_crop(cv2.imread(photo_path)), cv2.COLOR_BGR2RGB)

    keep, extent = stroke_mask(crop_up)  # crop coordinates (4x)
    near, weight = reveal_field(keep, extent, time_map(keep))
    ch, cw = keep.shape
    layer_w, layer_h = cw + 2 * pad, ch + 2 * pad
    place = placement(layer_w, layer_h)

    # The logo's stroke mask in photo coordinates, for inpainting.
    logo_photo = np.zeros(photo_up.shape[:2], np.uint8)
    logo_photo[4 * y0:4 * y0 + ch, 4 * x0:4 * x0 + cw] = weight > 0
    clean_up = clean_sand(photo_up, logo_photo)

    # Views: output pixels -> layer coordinates (the top-down framing) -> photo coordinates.
    lw, lh = cw, ch
    vw = lw * VIEW_WIDTH
    vh = vw * H / W
    cx, cy = pad + lw / 2, pad + lh / 2
    view = np.float32([[cx - vw / 2, cy - vh / 2], [cx + vw / 2, cy - vh / 2],
                       [cx + vw / 2, cy + vh / 2], [cx - vw / 2, cy + vh / 2]])
    out_rect = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    out_to_layer = cv2.getPerspectiveTransform(out_rect, view)
    layer_to_photo = np.array([[1, 0, 4 * x0 - pad], [0, 1, 4 * y0 - pad], [0, 0, 1]], np.float64)
    out_to_photo = layer_to_photo @ out_to_layer
    end_quad = cv2.perspectiveTransform(view.reshape(-1, 1, 2), place).reshape(-1, 2)
    print("top-down view footprint in the last frame:", np.round(end_quad).tolist(), file=sys.stderr)

    def photo_view(img):
        return cv2.warpPerspective(img, out_to_photo, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                                   borderMode=cv2.BORDER_REFLECT)

    total = int(subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
         "stream=nb_read_packets", "-of", "csv=p=0", src], text=True).strip())
    last = decode(src, total - 1)[0]

    film_view = cv2.warpPerspective(last, cv2.getPerspectiveTransform(out_rect, end_quad), (W, H),
                                    flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    luts = colour_lut(photo_view(clean_up), film_view)
    clean_full = apply_lut(clean_up, luts)
    clean_v = photo_view(clean_full)
    logo_v = apply_lut(photo_view(photo_up), luts)

    # Reveal masks live on the crop grid: crop -> layer -> output.
    crop_to_layer = np.array([[1, 0, pad], [0, 1, pad], [0, 0, 1]], np.float64)
    out_to_crop = np.linalg.inv(crop_to_layer) @ out_to_layer

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

    # Tilt down to the clean sand.
    to_view = np.linalg.inv(cv2.getPerspectiveTransform(out_rect, end_quad))
    for k in range(1, TILT_FRAMES + 1):
        a = smoothstep(k / TILT_FRAMES)
        quad = (1 - a) * out_rect + a * end_quad
        tq = cv2.getPerspectiveTransform(out_rect, quad)
        frame = cv2.warpPerspective(last, tq, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                                    borderMode=cv2.BORDER_REFLECT)
        b = smoothstep(float(np.clip((k / TILT_FRAMES - PHOTO_FROM) / (1 - PHOTO_FROM), 0, 1)))
        if b > 0:
            # The whole picture dissolves into the photo's sand (a spatial seam between the
            # two sands would show), seen through the same tilting camera.
            sand = cv2.warpPerspective(clean_full, out_to_photo @ to_view @ tq, (W, H),
                                       flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
            frame = (frame * (1 - b) + sand * b).astype(np.uint8)
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
        written += 1

    for _ in range(REST_FRAMES):
        enc.stdin.write(np.ascontiguousarray(clean_v).tobytes())
        written += 1

    # Draw the logo: the drawing times and the logo's extent, seen from the top-down view.
    near_v = cv2.warpPerspective(near, out_to_crop, (W, H), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP)
    weight_v = cv2.warpPerspective(weight, out_to_crop, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    for f in range(1, DRAW_FRAMES + 1):
        mv = cv2.GaussianBlur(reveal_at(near_v, weight_v, f), (0, 0), 2)[..., None]
        frame = (clean_v * (1 - mv) + logo_v * mv).astype(np.uint8)
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
        written += 1

    enc.stdin.close()
    enc.wait()
    print(f"ending: tilt {TILT_FRAMES} + rest {REST_FRAMES} + drawing {DRAW_FRAMES} frames; "
          f"{written} frames ({written / FPS:.3f}s) in {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
