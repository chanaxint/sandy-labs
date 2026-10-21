"""Press the Sandy Labs logo into the sand of the intro's closing shot.

The grooves are taken from a photo of the logo written in sand: only their
shading (a high-pass of the photo's lightness inside a stroke mask) is used,
so the film keeps its own sand colour and grain. The logo is laid on the
ground in perspective in the final frame and tracked backwards through the
closing frames (frame-to-frame ECC homographies on the sand), so it stays put
on the beach while the camera settles over it.

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
TRACK_SECONDS = 2.6   # closing stretch over which the logo is tracked
FADE_FRAMES = 10      # soft start where the tracked stretch begins
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


def main():
    src, photo, out = sys.argv[1:4]
    total = int(subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
         "stream=nb_read_packets", "-of", "csv=p=0", src], text=True).strip())
    start = total - int(TRACK_SECONDS * FPS)

    shade, mask, patch = groove_layer(photo)
    place = placement(shade.shape[1], shade.shape[0])
    homs = track(decode(src, start, (TW, TH)))

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)
    size = W * H * 3
    for n in range(total):
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        if n >= start:
            k = n - start
            m = homs[k] @ place
            sh = cv2.warpPerspective(shade, m, (W, H), flags=cv2.INTER_LINEAR)
            ma = cv2.warpPerspective(mask, m, (W, H), flags=cv2.INTER_LINEAR)
            pa = cv2.warpPerspective(patch, m, (W, H), flags=cv2.INTER_LINEAR)
            sh = cv2.GaussianBlur(sh, (0, 0), 1.0)  # match the footage's softness
            fade = min(1.0, (k + 1) / FADE_FRAMES)
            lab = cv2.cvtColor(frame, cv2.COLOR_RGB2LAB).astype(np.float32)
            L = lab[..., 0]
            flat = cv2.GaussianBlur(L, (0, 0), 28)
            amount = SMOOTHING * fade * pa
            L = L * (1 - amount) + flat * amount
            lab[..., 0] = np.clip(L + STRENGTH * fade * sh * ma, 0, 255)
            frame = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2RGB)
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
    enc.stdin.close()
    enc.wait()
    dec.wait()
    print(f"pressed the logo into frames {start}-{total - 1} of {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
