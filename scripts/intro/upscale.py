"""AI video upscaler for the intro film: Real-ESRGAN realesr-general-x4v3 on CPU.

No PyTorch needed. The .pth weights are read with a restricted unpickler (only
tensor data is accepted, nothing executable), the SRVGGNetCompact network from
Real-ESRGAN (BSD-3) is rebuilt as an ONNX graph, and frames stream through
onnxruntime via ffmpeg pipes.

Requirements: ffmpeg, Python 3 with `numpy onnx onnxruntime`, and next to this file
(from https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0):
  realesr-general-x4v3.pth      sha256 8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292
  realesr-general-wdn-x4v3.pth  sha256 1641f8c4464b9f097c9fdda5589273713f67cf59f3d909e0bd688f0cee269dca

Usage: python upscale.py IN.mp4 OUT.mp4 [--start S] [--seconds N] [--denoise 0.2]
Output: 4x model output, Lanczos-downscaled to 3840x2160, H.264 CRF 12 intermediate.
"""
import argparse
import os
import pickle
import subprocess
import sys
import time
import zipfile

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper

HERE = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_DIR = os.environ.get("ESRGAN_WEIGHTS", HERE)

_DTYPES = {"FloatStorage": np.float32, "HalfStorage": np.float16}


def load_pth(path):
    """Read a PyTorch zip checkpoint into numpy arrays without importing torch."""
    zf = zipfile.ZipFile(path)
    root = zf.namelist()[0].split("/")[0]

    class Storage:
        def __init__(self, dtype, key):
            self.array = np.frombuffer(zf.read(f"{root}/data/{key}"), dtype=dtype)

    def rebuild_tensor(storage, offset, size, stride, *_):
        item = storage.array.itemsize
        return np.lib.stride_tricks.as_strided(
            storage.array[offset:], shape=tuple(size), strides=tuple(s * item for s in stride)
        ).copy()

    class Restricted(pickle.Unpickler):
        def find_class(self, module, name):
            if module == "collections" and name == "OrderedDict":
                import collections
                return collections.OrderedDict
            if module == "torch._utils" and name == "_rebuild_tensor_v2":
                return rebuild_tensor
            if module == "torch" and name in _DTYPES:
                return name
            raise pickle.UnpicklingError(f"blocked: {module}.{name}")

        def persistent_load(self, pid):
            _, storage_type, key, _location, _numel = pid
            return Storage(_DTYPES[storage_type], key)

    sd = Restricted(zf.open(f"{root}/data.pkl")).load()
    return sd.get("params", sd.get("params_ema", sd))


def build_model(denoise: float, num_conv=32, scale=4) -> bytes:
    w = load_pth(os.path.join(WEIGHTS_DIR, "realesr-general-x4v3.pth"))
    if denoise < 1:
        # Same as Real-ESRGAN's --denoise_strength: blend with the weak-denoise weights.
        wdn = load_pth(os.path.join(WEIGHTS_DIR, "realesr-general-wdn-x4v3.pth"))
        w = {k: denoise * w[k] + (1 - denoise) * wdn[k] for k in w}

    nodes, inits = [], []

    def const(name, arr):
        inits.append(numpy_helper.from_array(np.ascontiguousarray(arr, dtype=np.float32), name))
        return name

    cur, idx = "x", 0
    for i in range(num_conv + 1):
        out = f"c{i}"
        nodes.append(helper.make_node(
            "Conv", [cur, const(f"w{idx}", w[f"body.{idx}.weight"]), const(f"b{idx}", w[f"body.{idx}.bias"])],
            [out], pads=[1, 1, 1, 1], kernel_shape=[3, 3]))
        slope = w[f"body.{idx + 1}.weight"].reshape(-1, 1, 1)
        nodes.append(helper.make_node("PRelu", [out, const(f"p{idx + 1}", slope)], [f"a{i}"]))
        cur, idx = f"a{i}", idx + 2
    nodes.append(helper.make_node(
        "Conv", [cur, const(f"w{idx}", w[f"body.{idx}.weight"]), const(f"b{idx}", w[f"body.{idx}.bias"])],
        ["last"], pads=[1, 1, 1, 1], kernel_shape=[3, 3]))
    nodes.append(helper.make_node("DepthToSpace", ["last"], ["up"], blocksize=scale, mode="CRD"))
    nodes.append(helper.make_node(
        "Resize", ["x", "", const("scales", [1, 1, scale, scale])], ["base"],
        mode="nearest", coordinate_transformation_mode="asymmetric", nearest_mode="floor"))
    nodes.append(helper.make_node("Add", ["up", "base"], ["sum"]))
    nodes.append(helper.make_node("Clip", ["sum", const("lo", 0.0), const("hi", 1.0)], ["y"]))

    graph = helper.make_graph(
        nodes, "srvggnet_compact",
        [helper.make_tensor_value_info("x", TensorProto.FLOAT, [1, 3, "h", "w"])],
        [helper.make_tensor_value_info("y", TensorProto.FLOAT, [1, 3, "H", "W"])],
        inits)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 9  # readable by older onnxruntime releases too
    onnx.checker.check_model(model)
    return model.SerializeToString()


def probe(path):
    w, h, rate = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate", "-of", "csv=p=0", path], text=True).strip().split(",")
    return int(w), int(h), rate


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--start", type=float, default=0)
    ap.add_argument("--seconds", type=float, default=None)
    ap.add_argument("--denoise", type=float, default=0.2)
    args = ap.parse_args()

    opts = ort.SessionOptions()
    opts.intra_op_num_threads = os.cpu_count() or 4
    sess = ort.InferenceSession(build_model(args.denoise), opts, providers=["CPUExecutionProvider"])
    w, h, rate = probe(args.src)

    dec = ["ffmpeg", "-v", "error", "-ss", str(args.start)]
    if args.seconds:
        dec += ["-t", str(args.seconds)]
    dec += ["-i", args.src, "-an", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    dec = subprocess.Popen(dec, stdout=subprocess.PIPE)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w * 4}x{h * 4}",
         "-r", rate, "-i", "-", "-vf", "scale=3840:2160:flags=lanczos", "-c:v", "libx264",
         "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p", args.dst],
        stdin=subprocess.PIPE)

    size, n, t0 = w * h * 3, 0, time.time()
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        x = np.frombuffer(buf, np.uint8).reshape(h, w, 3).transpose(2, 0, 1)[None].astype(np.float32) / 255
        y = sess.run(["y"], {"x": x})[0][0]
        enc.stdin.write((y.transpose(1, 2, 0) * 255 + 0.5).astype(np.uint8).tobytes())
        n += 1
        if n % 12 == 0:
            print(f"{n} frames, {(time.time() - t0) / n:.2f}s/frame", file=sys.stderr, flush=True)
    enc.stdin.close()
    enc.wait()
    dec.wait()
    print(f"done: {n} frames in {time.time() - t0:.0f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
