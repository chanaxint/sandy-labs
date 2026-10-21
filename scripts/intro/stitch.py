"""Frame-matched stitching of the intro clips.

For every join (outgoing clip X -> incoming clip Y):
  1. Find the best-matching frame pair among X's last frames and Y's first frames
     (ECC image alignment, scored by correlation after alignment).
  2. Estimate the geometric difference (shift, zoom, slight rotation) between them.
  3. Build a colour-matching look-up table (per-channel histogram matching on the
     aligned overlap).
  4. Ease X's tail into Y's framing and colour over RAMP frames, cut on the matched
     pair, and dissolve over a few frames to hide any residual difference.

Requirements: ffmpeg, Python 3 with numpy and opencv-python-headless.
Usage: python stitch.py OUT.mp4 CLIP1.mp4 CLIP2.mp4 [CLIP3.mp4 ...]
Clips must already be 3840x2160 at 24 fps.
"""
import subprocess
import sys

import cv2
import numpy as np

W, H, FPS = 3840, 2160, 24
SEARCH_TAIL = 24   # candidate frames at the end of the outgoing clip
SEARCH_HEAD = 12   # candidate frames at the start of the incoming clip
RAMP = 36          # frames (1.5s) over which framing and colour ease into the next clip
DISSOLVE = 3       # frames of dissolve on the matched cut
AW, AH = 480, 270  # analysis resolution


def frame_count(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
         "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path], text=True)
    return int(out.strip())


def read_frames(path, start, count, size=(W, H)):
    """Decode `count` frames starting at frame index `start` (RGB uint8)."""
    w, h = size
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf",
           f"select='between(n\\,{start}\\,{start + count - 1})',scale={w}:{h}:flags=area",
           "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    n = len(raw) // (w * h * 3)
    return np.frombuffer(raw, np.uint8).reshape(n, h, w, 3)


def stream_frames(path):
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                            stdout=subprocess.PIPE)
    size = W * H * 3
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    proc.wait()


def align(src, dst):
    """ECC affine alignment of src to dst (analysis frames). Returns (score, warp).

    The warp follows OpenCV's ECC convention: it maps dst coordinates to src
    coordinates, so it is applied with WARP_INVERSE_MAP.
    """
    g1 = cv2.cvtColor(src, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    g2 = cv2.cvtColor(dst, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        score, warp = cv2.findTransformECC(g2, g1, warp, cv2.MOTION_AFFINE,
                                           (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    except cv2.error:
        return -1.0, np.eye(2, 3, dtype=np.float32)
    return float(score), warp


def to_full_forward(warp):
    """Analysis-resolution ECC warp -> full-resolution forward (src -> dst) affine."""
    m = warp.astype(np.float64).copy()
    m[0, 2] *= W / AW
    m[1, 2] *= H / AH
    return cv2.invertAffineTransform(m)


def cover(m):
    """Extra centred zoom so the warped frame never exposes empty borders."""
    corners = np.array([[0, 0, 1], [W, 0, 1], [0, H, 1], [W, H, 1]], np.float64)
    inv = cv2.invertAffineTransform(m)
    pts = corners @ inv.T  # where output corners sample from in the source
    need = 1.0
    for x, y in pts:
        dx = max(0.0, -x, x - W) / (W / 2)
        dy = max(0.0, -y, y - H) / (H / 2)
        need = max(need, 1 + dx + 0.002, 1 + dy + 0.002)
    return need


def zoom_about_centre(s):
    return np.array([[s, 0, (1 - s) * W / 2], [0, s, (1 - s) * H / 2]], np.float64)


def compose(a, b):
    """Affine a after b."""
    A = np.vstack([a, [0, 0, 1]])
    B = np.vstack([b, [0, 0, 1]])
    return (A @ B)[:2]


def histogram_lut(src, dst, mask):
    """Per-channel LUT mapping src's distribution onto dst's within mask."""
    lut = np.zeros((3, 256), np.uint8)
    for c in range(3):
        s = src[..., c][mask]
        d = dst[..., c][mask]
        s_cdf = np.cumsum(np.bincount(s, minlength=256)).astype(np.float64)
        d_cdf = np.cumsum(np.bincount(d, minlength=256)).astype(np.float64)
        s_cdf /= s_cdf[-1]
        d_cdf /= d_cdf[-1]
        mapped = np.interp(s_cdf, d_cdf, np.arange(256))
        # Smooth the curve so it never introduces banding.
        mapped = np.convolve(np.pad(mapped, 8, mode="edge"), np.ones(17) / 17, mode="valid")
        lut[c] = np.clip(mapped, 0, 255).round().astype(np.uint8)
    return lut


def apply_lut(img, lut, amount):
    if amount <= 0:
        return img
    out = np.empty_like(img)
    ident = np.arange(256, dtype=np.float64)
    for c in range(3):
        table = np.clip(ident * (1 - amount) + lut[c] * amount, 0, 255).astype(np.uint8)
        out[..., c] = cv2.LUT(img[..., c], table)
    return out


def smoothstep(t):
    return t * t * (3 - 2 * t)


def plan_join(x_path, y_path):
    nx = frame_count(x_path)
    xs = read_frames(x_path, nx - SEARCH_TAIL, SEARCH_TAIL, (AW, AH))
    ys = read_frames(y_path, 0, SEARCH_HEAD, (AW, AH))
    best = None
    for i in range(len(xs)):
        for j in range(len(ys)):
            score, warp = align(xs[i], ys[j])
            # Prefer keeping footage: tiny bonus for late cuts in X and early starts in Y.
            key = score + 0.0005 * i - 0.0005 * j
            if best is None or key > best[0]:
                best = (key, score, i, j, warp)
    _, score, i, j, warp = best
    cut_x = nx - SEARCH_TAIL + i  # last frame of X that is used
    m = to_full_forward(warp)
    zoom = cover(m)
    if zoom > 1:
        m = compose(zoom_about_centre(zoom), m)

    # Colour LUT from the aligned matched pair, at analysis resolution.
    inv = cv2.WARP_INVERSE_MAP
    xa = cv2.warpAffine(xs[i], warp, (AW, AH), flags=cv2.INTER_LINEAR | inv, borderMode=cv2.BORDER_CONSTANT)
    valid = cv2.warpAffine(np.ones((AH, AW), np.uint8), warp, (AW, AH), flags=cv2.INTER_NEAREST | inv) > 0
    valid = cv2.erode(valid.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    lut = histogram_lut(xa, ys[j], valid)
    sx = np.sqrt(abs(np.linalg.det(m[:, :2])))
    print(f"join {x_path.split('/')[-1]} -> {y_path.split('/')[-1]}: frames {cut_x}->{j}, "
          f"ecc {score:.4f}, scale {sx:.4f}, shift ({m[0, 2]:.1f}, {m[1, 2]:.1f})px, cover zoom {zoom:.4f}",
          file=sys.stderr)
    return {"cut_x": cut_x, "start_y": j, "warp": m, "lut": lut, "zoom": zoom}


def ease_warp(m, a):
    """Interpolate between identity (a=0) and m (a=1)."""
    return np.eye(2, 3) * (1 - a) + m * a


def main():
    out, clips = sys.argv[1], sys.argv[2:]
    joins = [plan_join(clips[k], clips[k + 1]) for k in range(len(clips) - 1)]

    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)

    held = []  # last DISSOLVE frames of the previous clip, waiting to be blended
    total = 0
    for k, path in enumerate(clips):
        start = joins[k - 1]["start_y"] if k > 0 else 0
        end = joins[k]["cut_x"] if k < len(joins) else frame_count(path) - 1
        join = joins[k] if k < len(joins) else None
        entry_zoom = joins[k - 1]["zoom"] if k > 0 else 1.0
        for n, frame in enumerate(stream_frames(path)):
            if n < start or n > end:
                continue
            if entry_zoom > 1 and n - start < RAMP:
                # The outgoing clip ended with a small cover zoom: ease it back out here.
                z = 1 + (entry_zoom - 1) * (1 - smoothstep((n - start) / RAMP))
                frame = cv2.warpAffine(frame, zoom_about_centre(z), (W, H), flags=cv2.INTER_CUBIC,
                                       borderMode=cv2.BORDER_REFLECT)
            if join is not None and n > end - RAMP:
                a = smoothstep(min(1.0, (n - (end - RAMP)) / RAMP))
                frame = cv2.warpAffine(frame, ease_warp(join["warp"], a), (W, H), flags=cv2.INTER_CUBIC,
                                       borderMode=cv2.BORDER_REFLECT)
                frame = apply_lut(frame, join["lut"], a)
            if held and n - start < DISSOLVE:
                prev = held.pop(0)
                w = (n - start + 1) / (DISSOLVE + 1)
                frame = cv2.addWeighted(prev, 1 - w, frame, w, 0)
            if join is not None and n > end - DISSOLVE:
                held.append(frame)  # blended into the next clip's first frames
                continue
            enc.stdin.write(np.ascontiguousarray(frame).tobytes())
            total += 1
    for frame in held:
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
        total += 1
    enc.stdin.close()
    enc.wait()
    print(f"wrote {total} frames ({total / FPS:.3f}s) to {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
