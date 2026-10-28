"""Writes the frame index the scroll player needs to decode a video with WebCodecs.

For every frame: byte offset and size inside the MP4, plus which frames are
keyframes; and the codec string and decoder configuration (avcC / av1C box).
The encode has no B-frames / reordering, so decode order equals display order
and frame i is packet i.

Requirements: ffprobe, Python 3 (standard library only).

Files larger than --max-part MB are split into parts at keyframe boundaries
(VIDEO.0.bin, VIDEO.1.bin, ... next to the .mp4, which is then removed), so no
file passes GitHub's 100 MB limit; offsets stay positions in the whole file and
`parts` says which file holds which bytes.

Usage: python index.py VIDEO.mp4 OUT.json [--max-part MB]
"""
import os
import base64
import json
import struct
import subprocess
import sys


def boxes(data, start, end):
    """Yields (type, payload_start, box_end) for the boxes in data[start:end]."""
    i = start
    while i + 8 <= end:
        size, kind = struct.unpack(">I4s", data[i:i + 8])
        header = 8
        if size == 1:
            size = struct.unpack(">Q", data[i + 8:i + 16])[0]
            header = 16
        elif size == 0:
            size = end - i
        yield kind.decode("latin-1"), i + header, i + size
        i += size


def find(data, path, start=0, end=None):
    """Payload range of the first box along `path` (e.g. ['moov', 'trak', ...])."""
    end = len(data) if end is None else end
    for kind, s, e in boxes(data, start, end):
        if kind == path[0]:
            if len(path) == 1:
                return s, e
            # Sample entries carry fixed fields before their child boxes.
            skip = {"stsd": 8, "avc1": 78, "av01": 78}.get(kind, 0)
            found = find(data, path[1:], s + skip, e)
            if found:
                return found
    return None


def codec_config(data):
    stsd = ["moov", "trak", "mdia", "minf", "stbl", "stsd"]
    avcc = find(data, stsd + ["avc1", "avcC"])
    if avcc:
        cfg = data[avcc[0]:avcc[1]]
        return f"avc1.{cfg[1]:02x}{cfg[2]:02x}{cfg[3]:02x}", cfg
    av1c = find(data, stsd + ["av01", "av1C"])
    if av1c:
        cfg = data[av1c[0]:av1c[1]]
        profile, level = cfg[1] >> 5, cfg[1] & 0x1F
        tier = "H" if cfg[2] >> 7 else "M"
        depth = 10 if (cfg[2] >> 6) & 1 else 8
        return f"av01.{profile}.{level:02d}{tier}.{depth:02d}", cfg
    raise SystemExit("no avcC or av1C box found")


def split(src, data, index, max_part):
    """Cuts the file at keyframes into parts of at most max_part bytes."""
    stem = src[:-len(".mp4")]
    cuts = [0]
    for k in index["keyframes"][1:]:
        if index["offsets"][k] - cuts[-1] > max_part:
            prev = max(o for o in (index["offsets"][j] for j in index["keyframes"]) if o < index["offsets"][k])
            cuts.append(prev if prev > cuts[-1] else index["offsets"][k])
    cuts.append(len(data))
    parts = []
    for n, (a, b) in enumerate(zip(cuts, cuts[1:])):
        name = f"{stem}.{n}.bin"
        with open(name, "wb") as f:
            f.write(data[a:b])
        parts.append({"url": os.path.basename(name), "start": a, "end": b})
    os.remove(src)
    return parts


def main():
    src, out = sys.argv[1:3]
    max_part = float(sys.argv[sys.argv.index("--max-part") + 1]) * 1e6 if "--max-part" in sys.argv else None
    data = open(src, "rb").read()
    codec, cfg = codec_config(data)
    probe = json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate:packet=pos,size,flags", "-of", "json", src]))
    stream = probe["streams"][0]
    num, den = map(int, stream["r_frame_rate"].split("/"))
    packets = probe["packets"]
    index = {
        "codec": codec,
        "width": stream["width"],
        "height": stream["height"],
        "fps": num / den,
        "frames": len(packets),
        "bytes": len(data),
        "description": base64.b64encode(cfg).decode() if codec.startswith("avc1") else None,
        "offsets": [int(p["pos"]) for p in packets],
        "sizes": [int(p["size"]) for p in packets],
        "keyframes": [i for i, p in enumerate(packets) if "K" in p["flags"]],
        "parts": [{"url": os.path.basename(src), "start": 0, "end": len(data)}],
    }
    if max_part and len(data) > max_part:
        index["parts"] = split(src, data, index, max_part)
    with open(out, "w") as f:
        json.dump(index, f, separators=(",", ":"))
    print(f"{out}: {codec} {index['width']}x{index['height']} {index['fps']:g}fps, "
          f"{index['frames']} frames, {len(index['keyframes'])} keyframes, {len(index['parts'])} file(s)",
          file=sys.stderr)


if __name__ == "__main__":
    main()
