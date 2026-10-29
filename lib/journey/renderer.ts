/**
 * Draws the journey film on its canvas and holds the decoded frames it draws.
 *
 * WebGL 2 where available: a decoded VideoFrame is copied into a texture on the GPU
 * (no trip through main memory, which is what limits ImageBitmap copies on many
 * machines), and drawing is one textured quad, cropped to "cover" the canvas.
 * Without WebGL 2, or where WebGL is emulated in software (no GPU: slower than 2D),
 * the same calls fall back to ImageBitmaps on a 2D canvas. `prefer` overrides the
 * choice (for comparing the two: `?renderer=2d` or `?renderer=webgl` in the URL).
 */

/** A stored picture: a decoded frame, the thumbnail sheet, the fallback video. */
export type Picture = { readonly width: number; readonly height: number };

/** Region of a picture, in its pixels. */
export type Region = { x: number; y: number; w: number; h: number };

export interface Renderer {
  readonly kind: "webgl" | "2d";
  /** Copies a decoded frame (the caller closes it once this returns or resolves). */
  storeFrame(frame: VideoFrame): Picture | Promise<Picture>;
  /** A picture that reads `source` when drawn (an image) or now (`refresh`, a video). */
  wrap(source: HTMLImageElement | HTMLVideoElement, width: number, height: number): Picture;
  /** Takes the current frame of a wrapped video (WebGL copies it; 2D reads it when drawn). */
  refresh(p: Picture): void;
  release(p: Picture): void;
  /** Draws (a region of) p to cover the canvas, at `alpha` over what is there. */
  draw(p: Picture, alpha?: number, region?: Region): void;
  /** Called when the canvas backing size changed. */
  resized(): void;
  /** Becomes false when the GPU context is lost; stored pictures are then gone. */
  readonly ok: boolean;
  dispose(): void;
}

/**
 * The kind of context each canvas already has: a canvas keeps its first context for good
 * (a WebGL canvas can't give a 2D one), and a film can be set up again on the same canvas
 * (React's development double mount, Fast Refresh).
 */
const kinds = new WeakMap<HTMLCanvasElement, Renderer["kind"]>();

export function createRenderer(canvas: HTMLCanvasElement, onLost: () => void, prefer?: "webgl" | "2d"): Renderer {
  const known = kinds.get(canvas);
  // Tested on a spare canvas: once a canvas has a WebGL context it can't get a 2D one.
  const useGL = known ? known === "webgl" : prefer === "webgl" || (prefer !== "2d" && hardwareGL());
  const r = (useGL && createGL(canvas, onLost)) || create2D(canvas);
  kinds.set(canvas, r.kind);
  return r;
}

/** WebGL 2 runs on a GPU here (not emulated on the CPU: SwiftShader, llvmpipe, basic renderer). */
function hardwareGL() {
  const gl = document.createElement("canvas").getContext("webgl2");
  if (!gl) return false;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return !/swiftshader|llvmpipe|software|basic render/i.test(name);
}

/** Source rectangle of a w×h picture region that covers the canvas (centred crop). */
function coverRect(cw: number, ch: number, r: Region): Region {
  const scale = Math.max(cw / r.w, ch / r.h);
  const w = cw / scale;
  const h = ch / scale;
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h };
}

// ---------------------------------------------------------------- WebGL 2

type GLPicture = Picture & {
  tex: WebGLTexture | null;
  source?: HTMLImageElement | HTMLVideoElement;
};

const VERTEX = `#version 300 es
uniform vec4 u_rect; // source x, y, w, h in texture coordinates
out vec2 v_uv;
void main() {
  vec2 p = vec2(gl_VertexID & 1, gl_VertexID >> 1);
  v_uv = u_rect.xy + p * u_rect.zw;
  gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform float u_alpha;
in vec2 v_uv;
out vec4 color;
void main() {
  color = vec4(texture(u_tex, v_uv).rgb * u_alpha, u_alpha);
}`;

function createGL(canvas: HTMLCanvasElement, onLost: () => void): Renderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  let ok = true;
  let frameUploadFails = false;
  let program: WebGLProgram | null = null;
  let uRect: WebGLUniformLocation | null = null;
  let uAlpha: WebGLUniformLocation | null = null;
  /** Released textures by size, reused for the next frames (no reallocation per frame). */
  let pool = new Map<string, WebGLTexture[]>();
  const live = new Set<GLPicture>();

  const setup = () => {
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);
    uRect = gl.getUniformLocation(program, "u_rect");
    uAlpha = gl.getUniformLocation(program, "u_alpha");
    gl.uniform1i(gl.getUniformLocation(program, "u_tex"), 0);
    gl.bindVertexArray(gl.createVertexArray());
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied "over"
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.viewport(0, 0, canvas.width, canvas.height);
    return true;
  };
  if (!setup()) return null;

  const onContextLost = (e: Event) => {
    e.preventDefault();
    ok = false;
    pool = new Map();
    for (const p of live) p.tex = null;
    onLost();
  };
  const onContextRestored = () => {
    ok = setup();
    // Wrapped images are uploaded again on their next draw; frames are decoded again.
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  const texture = (w: number, h: number) => {
    const reuse = pool.get(`${w}x${h}`)?.pop();
    if (reuse) {
      gl.bindTexture(gl.TEXTURE_2D, reuse);
      return reuse;
    }
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };

  const upload = (p: GLPicture, source: TexImageSource) => {
    if (!ok) return;
    if (!p.tex) p.tex = texture(p.width, p.height);
    else gl.bindTexture(gl.TEXTURE_2D, p.tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
  };

  return {
    kind: "webgl",
    get ok() {
      return ok;
    },
    storeFrame(frame) {
      const p: GLPicture = { width: frame.displayWidth, height: frame.displayHeight, tex: null };
      live.add(p);
      if (!frameUploadFails) {
        try {
          upload(p, frame);
          return p;
        } catch {
          // Some browsers can't upload a VideoFrame to WebGL: go through an ImageBitmap.
          frameUploadFails = true;
        }
      }
      return createImageBitmap(frame).then((bitmap) => {
        upload(p, bitmap);
        bitmap.close();
        return p;
      });
    },
    wrap(source, width, height) {
      const p: GLPicture = { width, height, tex: null, source };
      live.add(p);
      return p;
    },
    refresh(p) {
      const g = p as GLPicture;
      if (g.source) upload(g, g.source);
    },
    release(p) {
      const g = p as GLPicture;
      live.delete(g);
      if (!g.tex || !ok) return;
      const key = `${g.width}x${g.height}`;
      const list = pool.get(key) ?? [];
      // Keep a few spare textures of each size; free the rest.
      if (list.length < 8) {
        list.push(g.tex);
        pool.set(key, list);
      } else gl.deleteTexture(g.tex);
      g.tex = null;
    },
    draw(p, alpha = 1, region) {
      const g = p as GLPicture;
      if (!ok) return;
      if (!g.tex && g.source instanceof HTMLImageElement) upload(g, g.source);
      if (!g.tex) return;
      const r = coverRect(canvas.width, canvas.height, region ?? { x: 0, y: 0, w: g.width, h: g.height });
      gl.bindTexture(gl.TEXTURE_2D, g.tex);
      gl.uniform4f(uRect, r.x / g.width, r.y / g.height, r.w / g.width, r.h / g.height);
      gl.uniform1f(uAlpha, alpha);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    resized() {
      if (ok) gl.viewport(0, 0, canvas.width, canvas.height);
    },
    dispose() {
      for (const list of pool.values()) for (const t of list) gl.deleteTexture(t);
      for (const p of live) if (p.tex) gl.deleteTexture(p.tex);
      pool.clear();
      live.clear();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      // The context itself stays: the canvas can't get another one, and the film may be
      // set up on it again.
    },
  };
}

// ---------------------------------------------------------------- 2D fallback

type BitmapPicture = Picture & { image: CanvasImageSource | null };

function create2D(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext("2d");
  if (!ctx) return blank;
  return {
    kind: "2d",
    ok: true,
    async storeFrame(frame) {
      // Size read now: the caller closes the frame before the bitmap is ready.
      const width = frame.displayWidth;
      const height = frame.displayHeight;
      const image = await createImageBitmap(frame);
      return { width, height, image } as BitmapPicture;
    },
    wrap(source, width, height) {
      return { width, height, image: source } as BitmapPicture;
    },
    refresh() {
      // Drawn straight from the video element.
    },
    release(p) {
      const b = p as BitmapPicture;
      if (b.image instanceof ImageBitmap) b.image.close();
      b.image = null;
    },
    draw(p, alpha = 1, region) {
      const b = p as BitmapPicture;
      if (!b.image) return;
      const r = coverRect(canvas.width, canvas.height, region ?? { x: 0, y: 0, w: b.width, h: b.height });
      ctx.globalAlpha = alpha;
      ctx.drawImage(b.image, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    },
    resized() {},
    dispose() {},
  };
}

/** Draws nothing: for a canvas that gives neither context (shouldn't happen; never crash). */
const blank: Renderer = {
  kind: "2d",
  ok: false,
  storeFrame: (frame) => ({ width: frame.displayWidth, height: frame.displayHeight }),
  wrap: (_source, width, height) => ({ width, height }),
  refresh() {},
  release() {},
  draw() {},
  resized() {},
  dispose() {},
};
