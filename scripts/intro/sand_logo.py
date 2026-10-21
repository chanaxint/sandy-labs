"""Press the Sandy Labs logo into the sand of the intro's closing shot, then tilt
the camera down to look straight at it.

The grooves are taken from a photo of the logo written in sand: only their
shading (a high-pass of the photo's lightness inside a stroke mask) is used,
so the film keeps its own sand colour and grain. The logo is laid on the
ground in perspective in the final frame and tracked backwards through the
closing frames (frame-to-frame ECC homographies on the sand). Tracking starts
while the logo is still a few pixels wide far down the beach, so it is simply
there as the camera arrives rather than fading in.

After the last frame, the camera tilts down to a top-down view of the logo
(the ground is flat, so this is an exact re-projection of the last frame) and
ends on the photo itself, colour-matched to the film's sand; the logo sits in
the same place in both, so the hand-over is invisible.

Requirements: ffmpeg, Python with numpy + opencv-python-headless. If the
Real-ESRGAN weights are next to upscale.py (see that file), the photo crop is
upscaled 4x with them; otherwise with bicubic interpolation.

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
# Placement in the final frame: centre (fractions of the frame), width of the
# near (bottom) edge as a fraction of the frame width, how much narrower the far
# edge is, and how much the ground plane foreshortens the logo's height.
CENTER = (0.5, 0.6)
NEAR_WIDTH = 0.5
FAR_SCALE = 0.8
FORESHORTEN = 0.62
STRENGTH = 1.3        # groove contrast relative to the photo
SMOOTHING = 0.65      # how much the footprints are smoothed out around the logo, as if prepared by hand
TRACK_SECONDS = 4.5   # closing stretch over which the logo is tracked (starts far down the beach)
FADE_FRAMES = 24      # soft start while the logo is still tiny
TILT_FRAMES = 40      # camera tilting down to the top-down view (about 1.7s)
PHOTO_FROM = 0.55     # point in the tilt where the sharp photo starts taking over
VIEW_WIDTH = 1.45     # top-down view width relative to the logo
TW, TH = 960, 540     # tracking resolution
PAD = 320             # empty margin (layer pixels) around the logo


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


def groove_layer(photo_path):
    """Returns (shading, mask) in float32 at 4x the photo crop size."""
    x0, y0, x1, y1 = PHOTO_CROP
    up = upscale_crop(cv2.imread(photo_path)[y0:y1, x0:x1])
    L = cv2.cvtColor(up, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
    # Local background from a large median (robust to the dark grooves): no halo.
    small = cv2.resize(L, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    bg = cv2.medianBlur(np.clip(small, 0, 255).astype(np.uint8), 31).astype(np.float32)
    bg = cv2.GaussianBlur(cv2.resize(bg, (L.shape[1], L.shape[0]), interpolation=cv2.INTER_CUBIC), (0, 0), 6)
    shade = L - bg
    # Stroke mask: strong structured contrast, minus pebbles and stray clumps.
    energy = cv2.GaussianBlur(np.abs(cv2.GaussianBlur(shade, (0, 0), 2)), (0, 0), 10)
    m = (energy > np.percentile(energy, 62)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((19, 19), np.uint8))
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        cx, cy = cent[i]
        junk = cy < 150 or cy > 1180 or (cx < 250 and cy < 700) or (cx > 1400 and cy > 1050)
        if stats[i, cv2.CC_STAT_AREA] > 1800 and not junk:
            keep[lab == i] = 1
    keep = cv2.dilate(keep, np.ones((13, 13), np.uint8))
    # Room around the logo so the soft patch below can fade out fully instead of
    # being cut off at the edge of the photo crop.
    keep = np.pad(keep, PAD)
    shade = np.pad(shade, PAD)
    mask = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 7)
    # A wider, very soft patch around the strokes where the sand gets smoothed.
    patch = cv2.GaussianBlur(cv2.dilate(keep, np.ones((121, 121), np.uint8)).astype(np.float32), (0, 0), 60)
    return shade, mask, patch


def upscale_full(photo_path):
    """The whole photo at 4x, for the top-down ending."""
    return upscale_crop(cv2.imread(photo_path))


def pyramid(layers, levels=6):
    """Pre-blurred half-size copies of the layers, so a far-away logo doesn't shimmer."""
    out = [layers]
    for _ in range(levels):
        out.append(tuple(cv2.pyrDown(x) for x in out[-1]))
    return out


def pick_level(pyr, m, layer_w):
    """Pyramid level whose resolution suits the logo's on-screen size, with the warp adjusted to it."""
    corners = np.float32([[PAD, PAD], [layer_w - PAD, PAD]]).reshape(-1, 1, 2)
    p = cv2.perspectiveTransform(corners, m).reshape(-1, 2)
    scale = np.linalg.norm(p[1] - p[0]) / (layer_w - 2 * PAD)
    level = int(np.clip(np.floor(np.log2(1 / max(scale, 1e-6))), 0, len(pyr) - 1))
    f = 2 ** level
    return pyr[level], m @ np.diag([f, f, 1.0])


def match_colours(src, ref):
    """Per-channel (Lab) histogram matching of src onto ref."""
    s = cv2.cvtColor(src, cv2.COLOR_RGB2LAB)
    r = cv2.cvtColor(ref, cv2.COLOR_RGB2LAB)
    out = np.empty_like(s)
    for c in range(3):
        sc = np.cumsum(np.bincount(s[..., c].ravel(), minlength=256)).astype(np.float64)
        rc = np.cumsum(np.bincount(r[..., c].ravel(), minlength=256)).astype(np.float64)
        lut = np.interp(sc / sc[-1], rc / rc[-1], np.arange(256))
        out[..., c] = cv2.LUT(s[..., c], np.clip(lut, 0, 255).astype(np.uint8))
    return cv2.cvtColor(out, cv2.COLOR_LAB2RGB)


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


def track(frames):
    """Homographies mapping final-frame coordinates into each frame (tracking resolution)."""
    gray = [cv2.cvtColor(f, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255 for f in frames]
    mask = np.zeros((TH, TW), np.uint8)
    mask[int(TH * 0.3):, :] = 255  # the sand; the sea and sky near the top don't follow the ground plane
    n = len(gray)
    to_final = [np.eye(3, dtype=np.float64) for _ in range(n)]
    for i in range(n - 2, -1, -1):
        warp = np.eye(3, dtype=np.float32)
        try:
            # ECC: gray[i](warp(x)) ~ gray[i+1](x), i.e. warp maps frame i+1 coords into frame i.
            _, warp = cv2.findTransformECC(gray[i + 1], gray[i], warp, cv2.MOTION_HOMOGRAPHY,
                                           (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 100, 1e-6),
                                           mask, 5)
        except cv2.error:
            pass
        to_final[i] = warp.astype(np.float64) @ to_final[i + 1]
    s = np.diag([W / TW, H / TH, 1.0])
    return [s @ m @ np.linalg.inv(s) for m in to_final]


def press(frame, layers, m, fade):
    """Smooth the sand around the logo a little and press the grooves in."""
    shade, mask, patch = layers
    sh = cv2.warpPerspective(shade, m, (W, H), flags=cv2.INTER_LINEAR)
    ma = cv2.warpPerspective(mask, m, (W, H), flags=cv2.INTER_LINEAR)
    pa = cv2.warpPerspective(patch, m, (W, H), flags=cv2.INTER_LINEAR)
    sh = cv2.GaussianBlur(sh, (0, 0), 1.0)  # match the footage's softness
    lab = cv2.cvtColor(frame, cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[..., 0]
    flat = cv2.GaussianBlur(L, (0, 0), 28)
    amount = SMOOTHING * fade * pa
    L = L * (1 - amount) + flat * amount
    lab[..., 0] = np.clip(L + STRENGTH * fade * sh * ma, 0, 255)
    return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2RGB)


def top_down_view(layer_w, layer_h):
    """The top-down framing at the end: a 16:9 rectangle around the logo, in layer coordinates."""
    lw, lh = layer_w - 2 * PAD, layer_h - 2 * PAD
    vw = lw * VIEW_WIDTH
    vh = vw * H / W
    cx, cy = PAD + lw / 2, PAD + lh / 2
    return np.float32([[cx - vw / 2, cy - vh / 2], [cx + vw / 2, cy - vh / 2],
                       [cx + vw / 2, cy + vh / 2], [cx - vw / 2, cy + vh / 2]])


def main():
    src, photo, out = sys.argv[1:4]
    total = int(subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
         "stream=nb_read_packets", "-of", "csv=p=0", src], text=True).strip())
    start = total - int(TRACK_SECONDS * FPS)

    shade, mask, patch = groove_layer(photo)
    layer_h, layer_w = shade.shape
    pyr = pyramid((shade, mask, patch))
    place = placement(layer_w, layer_h)
    homs = track(decode(src, start, (TW, TH)))

    # The whole photo, in layer coordinates (4x the original, offset by the crop and margin).
    x0, y0 = PHOTO_CROP[:2]
    photo_up = cv2.cvtColor(upscale_full(photo), cv2.COLOR_BGR2RGB)
    photo_to_layer = np.array([[1, 0, PAD - 4 * x0], [0, 1, PAD - 4 * y0], [0, 0, 1]], np.float64)

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)
    size = W * H * 3
    last = None
    written = 0
    for n in range(total):
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        if n >= start:
            k = n - start
            layers, m = pick_level(pyr, homs[k] @ place, layer_w)
            frame = press(frame, layers, m, smoothstep(min(1.0, (k + 1) / FADE_FRAMES)))
            last = frame
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
        written += 1
    dec.wait()

    # Tilt down from the last frame to a top-down view of the logo. Output corners
    # travel from the full frame to the view's footprint on the ground (place maps
    # layer coordinates into the last frame), so this is a re-projection of the
    # flat beach.
    view = top_down_view(layer_w, layer_h)
    start_quad = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    end_quad = cv2.perspectiveTransform(view.reshape(-1, 1, 2), place).reshape(-1, 2)
    out_rect = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    # The sharp photo for the end of the tilt: the same view, colour-matched to the film.
    photo_view = cv2.warpPerspective(
        photo_up, np.linalg.inv(photo_to_layer) @ cv2.getPerspectiveTransform(out_rect, view), (W, H),
        flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    film_view = cv2.warpPerspective(last, cv2.getPerspectiveTransform(out_rect, end_quad), (W, H),
                                    flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    photo_view = match_colours(photo_view, film_view)

    for k in range(1, TILT_FRAMES + 1):
        a = smoothstep(k / TILT_FRAMES)
        quad = (1 - a) * start_quad + a * end_quad
        frame = cv2.warpPerspective(last, cv2.getPerspectiveTransform(out_rect, quad), (W, H),
                                    flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
        b = smoothstep(np.clip((k / TILT_FRAMES - PHOTO_FROM) / (1 - PHOTO_FROM), 0, 1))
        if b > 0:
            # Same framing as the film at this point of the tilt, taken from the photo.
            to_view = np.linalg.inv(cv2.getPerspectiveTransform(out_rect, end_quad))
            m = to_view @ cv2.getPerspectiveTransform(out_rect, quad)
            photo_now = cv2.warpPerspective(photo_view, m, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP)
            # Only where the photo has picture; feathered so its edge never shows.
            inside = cv2.warpPerspective(np.ones((H, W), np.float32), m, (W, H),
                                         flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
            inside = cv2.GaussianBlur(cv2.erode(inside, np.ones((61, 61), np.uint8)), (0, 0), 40)
            w = (b * inside)[..., None]
            frame = (frame * (1 - w) + photo_now * w).astype(np.uint8)
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
        written += 1

    enc.stdin.close()
    enc.wait()
    print(f"pressed the logo into frames {start}-{total - 1}, added a {TILT_FRAMES}-frame tilt; "
          f"{written} frames ({written / FPS:.3f}s) in {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
