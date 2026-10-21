/**
 * Helpers for playing a video from memory: pick the codec the device decodes
 * best, then download the whole file before playback so seeking and variable-
 * speed playback never wait on the network.
 */

export type VideoVariant = { ext: string; mime: string };

const VARIANTS: VideoVariant[] = [
  { ext: ".av1.mp4", mime: 'video/mp4; codecs="av01.0.08M.08"' },
  { ext: ".mp4", mime: 'video/mp4; codecs="avc1.640028"' },
];

/**
 * Playable variants, best first. AV1 is smaller, but decoding it in software
 * (common on phones and older laptops) drops frames at higher playback speeds,
 * so it only goes first when the device decodes it in hardware.
 */
export async function rankVariants(probe: HTMLVideoElement, width: number, height: number): Promise<VideoVariant[]> {
  const playable = VARIANTS.filter((v) => probe.canPlayType(v.mime) !== "");
  if (playable.length < 2 || !("mediaCapabilities" in navigator)) return playable;
  const scored = await Promise.all(
    playable.map(async (v) => {
      try {
        const info = await navigator.mediaCapabilities.decodingInfo({
          type: "file",
          video: { contentType: v.mime, width, height, bitrate: 6_000_000, framerate: 24 },
        });
        return { v, score: (info.supported ? 1 : 0) + (info.smooth ? 1 : 0) + (info.powerEfficient ? 2 : 0) };
      } catch {
        return { v, score: 0 };
      }
    }),
  );
  // Stable sort keeps AV1 first when both score the same.
  return scored.sort((a, b) => b.score - a.score).map((s) => s.v);
}

/** Downloads a file completely and returns an object URL for it. */
export async function fetchToObjectUrl(
  url: string,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`Failed to load ${url}: ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total) onProgress?.(Math.min(1, received / total));
  }
  onProgress?.(1);
  return URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
}
