/**
 * The glow and colour grade's maths (the web-ocean plan, item 6): the AgX
 * grade the composite draws, its inverse (so the underwater fog keeps today's
 * colour under the grade), the bloom's soft threshold, and the render targets'
 * sizes and memory. `GlowPass` builds its shaders from the same constants, so
 * the GLSL and these functions cannot drift apart.
 *
 * AgX is Troy Sobotka's; the matrices are Filament's and Blender's (Rec. 2020
 * primaries), as in three.js's `AgXToneMapping` (MIT), and the sigmoid fit and
 * the "punchy" look are from Benjamin Wrensch's minimal AgX (iolite engine
 * blog, 2023), the fit web-ocean also uses.
 */

export type Rgb = readonly [number, number, number];
/** A 3×3 matrix as GLSL's `mat3( col0, col1, col2 )`: three columns. */
type Columns = readonly [Rgb, Rgb, Rgb];

/**
 * The grade and the glow as tuned on the water sheet (docs/research/bloom-agx-2026-10-17/).
 * `exposure` scales the scene before AgX; `lookPower` and `lookSaturation` are AgX's look (power on the
 * log-encoded image, then saturation about its luminance); the bloom takes what passes the soft `threshold`
 * (scene-linear, before exposure, on the brightest channel, softened over ±`knee`) and adds `strength` of it back.
 */
export const GLOW = {
  exposure: 2.4,
  lookPower: 1.5,
  lookSaturation: 1.5,
  threshold: 1,
  knee: 0.5,
  strength: 0.1,
  /**
   * The sun disc's radiance per unit of the sun's intensity (scene units). The true sun's is its irradiance over its
   * solid angle, about 15 000; a tenth keeps its halo light.
   */
  sunRadiance: 1500,
  /** Bloom mips, from half resolution down. */
  levels: 5,
  /** MSAA samples of the scene's HDR target (the canvas's own antialias draws 4). */
  samples: 4,
} as const;

export type GlowSettings = { [K in keyof typeof GLOW]: number };

export const LINEAR_SRGB_TO_REC2020: Columns = [[0.6274, 0.0691, 0.0164], [0.3293, 0.9195, 0.0880], [0.0433, 0.0113, 0.8956]];
export const REC2020_TO_LINEAR_SRGB: Columns = [[1.6605, -0.1246, -0.0182], [-0.5876, 1.1329, -0.1006], [-0.0728, -0.0083, 1.1187]];
export const AGX_INSET: Columns = [
  [0.856627153315983, 0.137318972929847, 0.11189821299995],
  [0.0951212405381588, 0.761241990602591, 0.0767994186031903],
  [0.0482516061458583, 0.101439036467562, 0.811302368396859],
];
export const AGX_OUTSET: Columns = [
  [1.1271005818144368, -0.1413297634984383, -0.14132976349843826],
  [-0.11060664309660323, 1.157823702216272, -0.11060664309660294],
  [-0.016493938717834573, -0.016493938717834257, 1.2519364065950405],
];
/** log2 of 0.18 · 2^−10 and 0.18 · 2^6.5: the stops AgX encodes around middle grey. */
export const AGX_MIN_EV = -12.47393;
export const AGX_MAX_EV = 4.026069;
/** The sigmoid's polynomial coefficients, x⁶ down to x⁰. */
export const AGX_SIGMOID = [15.5, -40.14, 31.96, -6.868, 0.4298, 0.1191, -0.00232] as const;
export const LUMA: Rgb = [0.2126, 0.7152, 0.0722];

function apply(m: Columns, v: Rgb): [number, number, number] {
  return [0, 1, 2].map((row) => m[0][row] * v[0] + m[1][row] * v[1] + m[2][row] * v[2]) as [number, number, number];
}

function invert(m: Columns): Columns {
  // Rows of the matrix are m[c][r]; invert a[r][c] by cofactors and return it as columns again.
  const a = (r: number, c: number) => m[c][r];
  const det = a(0, 0) * (a(1, 1) * a(2, 2) - a(1, 2) * a(2, 1)) - a(0, 1) * (a(1, 0) * a(2, 2) - a(1, 2) * a(2, 0))
    + a(0, 2) * (a(1, 0) * a(2, 1) - a(1, 1) * a(2, 0));
  const inv = (r: number, c: number) => {
    const rows = [0, 1, 2].filter((k) => k !== c);
    const cols = [0, 1, 2].filter((k) => k !== r);
    const minor = a(rows[0], cols[0]) * a(rows[1], cols[1]) - a(rows[0], cols[1]) * a(rows[1], cols[0]);
    return ((r + c) % 2 === 0 ? 1 : -1) * minor / det;
  };
  return [0, 1, 2].map((c) => [0, 1, 2].map((r) => inv(r, c))) as unknown as Columns;
}

const dot = (a: Rgb, b: Rgb) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function agxSigmoid(x: number): number {
  return AGX_SIGMOID.reduce((sum, coefficient) => sum * x + coefficient, 0);
}

/** A monotonic function's inverse on [lo, hi] by bisection. */
function solve(f: (x: number) => number, target: number, lo: number, hi: number): number {
  for (let k = 0; k < 60; k += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The look on the sigmoid's output: power, then saturation about the luminance before it. */
function look(v: Rgb, power: number, saturation: number): [number, number, number] {
  const luma = dot(v, LUMA);
  return v.map((c) => luma + saturation * (Math.max(0, c) ** power - luma)) as [number, number, number];
}

/** What the composite draws for a scene-linear colour: linear sRGB in [0, 1], before the sRGB encoding. */
export function agx(color: Rgb, exposure: number = GLOW.exposure, power: number = GLOW.lookPower, saturation: number = GLOW.lookSaturation): Rgb {
  let v = apply(AGX_INSET, apply(LINEAR_SRGB_TO_REC2020, color.map((c) => c * exposure) as unknown as Rgb));
  v = v.map((c) => clamp01((Math.log2(Math.max(c, 1e-10)) - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV))) as typeof v;
  v = look(v.map(agxSigmoid) as unknown as Rgb, power, saturation);
  v = apply(AGX_OUTSET, v).map((c) => Math.max(0, c) ** 2.2) as typeof v;
  return apply(REC2020_TO_LINEAR_SRGB, v).map(clamp01) as unknown as Rgb;
}

const OUTSET_INVERSE = invert(AGX_OUTSET);
const INSET_INVERSE = invert(AGX_INSET);
const TO_REC2020_INVERSE = invert(REC2020_TO_LINEAR_SRGB);
const FROM_REC2020_INVERSE = invert(LINEAR_SRGB_TO_REC2020);

/**
 * The scene-linear colour the composite draws as `display` (linear sRGB): AgX run backwards. Fog and the
 * background are mixed in after the tone mapping on today's path, so under the grade they take this colour to
 * look the same. Valid for colours AgX reaches without clipping (every mid-tone).
 */
export function agxPreimage(display: Rgb, exposure: number = GLOW.exposure, power: number = GLOW.lookPower, saturation: number = GLOW.lookSaturation): Rgb {
  const shaped = apply(OUTSET_INVERSE, apply(TO_REC2020_INVERSE, display).map((c) => Math.max(0, c) ** (1 / 2.2)) as unknown as Rgb);
  // The look: shaped = luma + s (v^p − luma), with luma = LUMA · v. Given luma, v^p = (shaped − (1 − s) luma) / s,
  // so luma is the root of LUMA · v(luma) − luma, found between 0 and 1.
  const sigmoidAt = (luma: number) => shaped.map((c) => Math.max(0, (c - (1 - saturation) * luma) / saturation) ** (1 / power)) as unknown as Rgb;
  const luma = solve((l) => l - dot(LUMA, sigmoidAt(l)), 0, 0, 1);
  const encoded = sigmoidAt(luma).map((c) => solve(agxSigmoid, c, 0, 1));
  const inset = encoded.map((x) => 2 ** (x * (AGX_MAX_EV - AGX_MIN_EV) + AGX_MIN_EV)) as unknown as Rgb;
  return apply(FROM_REC2020_INVERSE, apply(INSET_INVERSE, inset)).map((c) => c / exposure) as unknown as Rgb;
}

/** three's `NeutralToneMapping` (Khronos PBR Neutral), today's grade, for comparing the two. */
export function neutral(color: Rgb, exposure = 1.05): Rgb {
  let v = color.map((c) => c * exposure);
  const x = Math.min(...v);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  v = v.map((c) => c - offset);
  const peak = Math.max(...v);
  const start = 0.8 - 0.04;
  if (peak < start) return v as unknown as Rgb;
  const d = 1 - start;
  const newPeak = 1 - (d * d) / (peak + d - start);
  v = v.map((c) => (c * newPeak) / peak);
  const g = 1 - 1 / (0.15 * (peak - newPeak) + 1);
  return v.map((c) => c + (newPeak - c) * g) as unknown as Rgb;
}

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/**
 * How much of a colour the bloom takes: none below `threshold − knee`, all above `threshold` less the threshold,
 * and a quadratic between, so the edge never shows (the soft knee of Unity's post-processing stack). `brightness`
 * is the colour's brightest channel; the colour is scaled by the returned weight.
 */
export function softThreshold(brightness: number, threshold: number = GLOW.threshold, knee: number = GLOW.knee): number {
  const soft = Math.min(2 * knee, Math.max(0, brightness - threshold + knee));
  const curve = (soft * soft) / (4 * knee + 1e-5);
  return Math.max(curve, brightness - threshold) / Math.max(brightness, 1e-5);
}

/** The bloom's mips: half the drawing buffer, then halved again for each level after. */
export function bloomSizes(width: number, height: number, levels: number = GLOW.levels): { width: number; height: number }[] {
  return Array.from({ length: levels }, (_, level) => ({
    width: Math.max(1, Math.floor(width / 2 ** (level + 1))),
    height: Math.max(1, Math.floor(height / 2 ** (level + 1))),
  }));
}

/**
 * The GPU memory the glow adds, bytes, as three 0.186 allocates it: the HDR scene's multisampled colour and
 * depth-stencil renderbuffers, its resolved colour texture, the depth-stencil renderbuffer three also gives the
 * resolve framebuffer, and the bloom mips (RGBA half floats, 8 bytes a pixel; depth-stencil 4).
 */
export function glowMemory(width: number, height: number, samples: number = GLOW.samples, levels: number = GLOW.levels): {
  sceneSamples: number; sceneResolve: number; bloom: number; total: number;
} {
  const pixels = width * height;
  const sceneSamples = pixels * samples * (8 + 4);
  const sceneResolve = pixels * (8 + 4);
  const bloom = bloomSizes(width, height, levels).reduce((sum, size) => sum + size.width * size.height * 8, 0);
  return { sceneSamples, sceneResolve, bloom, total: sceneSamples + sceneResolve + bloom };
}

/** A matrix as GLSL `mat3( vec3( … ), … )`, its columns in order. */
export function glslMat3(m: Columns): string {
  const number = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
  return `mat3( ${m.map((column) => `vec3( ${column.map(number).join(', ')} )`).join(', ')} )`;
}
