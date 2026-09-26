import { GRAVITY } from '../wave/dispersion';

/**
 * Tessendorf (2001) FFT chop for the WebGPU tier (plan §2.2, P6): the shading
 * wind sea as a 256² periodic patch of deep-water waves, ω = √(g k), with a
 * Phillips spectrum from the local wind. Waves long enough for the solver to
 * carry are filtered out, and the patch's slopes are scaled to the procedural
 * chop's root-mean-square slope so `waterChop` means the same on every tier.
 */
export const FFT_CHOP_SIZE = 256;
/** Patch side, m: 0.25 m texels, so the shortest wave is 0.5 m. */
export const FFT_CHOP_PATCH = 64;
/** The procedural chop's six waves of steepness 0.075: √(6 · 0.075² / 2), the slope vector's rms. */
export const CHOP_RMS_SLOPE = Math.sqrt((6 * 0.075 * 0.075) / 2);
/** Waves longer than this, m, are the solver's; the chop leaves them out. */
const LONGEST_CHOP = 6;
/** Waves shorter than this, m, are damped (Tessendorf's small-wave cut). */
const SHORTEST_CHOP = 0.5;

/** Signed wavenumber index of FFT bin m: 0, 1, …, N/2 − 1, −N/2, …, −1. */
export function binWave(m: number, n: number): number {
  return m < n / 2 ? m : m - n;
}

function gaussianPair(random: () => number): [number, number] {
  const u = Math.max(1e-12, random());
  const v = random();
  const r = Math.sqrt(-2 * Math.log(u));
  return [r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v)];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The patch's initial amplitudes: per bin (row-major, z rows then x columns)
 * h̃0(k) and conj(h̃0(−k)), as re, im, re, im. The wind blows along +z
 * (onshore) or −z (offshore); calm air still carries a light 2 m/s sea.
 */
export function chopSpectrum(windSpeed: number, seed: number, n = FFT_CHOP_SIZE, patch = FFT_CHOP_PATCH): Float32Array {
  const random = mulberry32(seed * 7919 + 17);
  const wind = Math.max(2, Math.abs(windSpeed));
  const direction = windSpeed >= 0 ? 1 : -1;
  const largest = (wind * wind) / GRAVITY;
  const small = SHORTEST_CHOP / (2 * Math.PI);
  const kMin = (2 * Math.PI) / LONGEST_CHOP;
  const amplitude = new Float64Array(n * n * 2);
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const kx = (2 * Math.PI * binWave(column, n)) / patch;
      const kz = (2 * Math.PI * binWave(row, n)) / patch;
      const k = Math.hypot(kx, kz);
      const [a, b] = gaussianPair(random);
      if (k === 0) continue;
      const along = (kz / k) * direction;
      // Phillips, with waves against the wind damped and the solver's long waves and the tiniest cut away.
      let phillips = (Math.exp(-1 / (k * largest) ** 2) / k ** 4) * along * along * Math.exp(-((k * small) ** 2));
      if (along < 0) phillips *= 0.07;
      phillips *= 1 - Math.exp(-((k / kMin) ** 4));
      const scale = Math.sqrt(phillips / 2);
      amplitude[(row * n + column) * 2] = a * scale;
      amplitude[(row * n + column) * 2 + 1] = b * scale;
    }
  }
  // Scale to the procedural chop's rms slope: Σ k² (|h̃0(k)|² + |h̃0(−k)|²) over the patch.
  let variance = 0;
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const k2 = ((2 * Math.PI) / patch) ** 2 * (binWave(column, n) ** 2 + binWave(row, n) ** 2);
      const i = (row * n + column) * 2;
      variance += k2 * (amplitude[i] ** 2 + amplitude[i + 1] ** 2) * 2;
    }
  }
  const normal = variance > 0 ? CHOP_RMS_SLOPE / Math.sqrt(variance) : 0;
  const packed = new Float32Array(n * n * 4);
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const i = (row * n + column) * 2;
      const mirror = (((n - row) % n) * n + ((n - column) % n)) * 2;
      const o = (row * n + column) * 4;
      packed[o] = amplitude[i] * normal;
      packed[o + 1] = amplitude[i + 1] * normal;
      packed[o + 2] = amplitude[mirror] * normal;
      packed[o + 3] = -amplitude[mirror + 1] * normal;
    }
  }
  return packed;
}

/**
 * The slope spectrum at time t, packed as one complex field F = i kx h̃ − kz h̃,
 * whose inverse transform is sx + i sz (both slopes are real), with
 * h̃(k, t) = h̃0(k) e^{iωt} + conj(h̃0(−k)) e^{−iωt}. The shader's spectrum pass does the same per texel.
 */
export function slopeSpectrum(spectrum: Float32Array, t: number, n = FFT_CHOP_SIZE, patch = FFT_CHOP_PATCH): Float64Array {
  const out = new Float64Array(n * n * 2);
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const kx = (2 * Math.PI * binWave(column, n)) / patch;
      const kz = (2 * Math.PI * binWave(row, n)) / patch;
      const omega = Math.sqrt(GRAVITY * Math.hypot(kx, kz));
      const c = Math.cos(omega * t);
      const s = Math.sin(omega * t);
      const o = (row * n + column) * 4;
      const hr = spectrum[o] * c - spectrum[o + 1] * s + spectrum[o + 2] * c + spectrum[o + 3] * s;
      const hi = spectrum[o] * s + spectrum[o + 1] * c - spectrum[o + 2] * s + spectrum[o + 3] * c;
      const i = (row * n + column) * 2;
      out[i] = -kx * hi - kz * hr;
      out[i + 1] = kx * hr - kz * hi;
    }
  }
  return out;
}

/**
 * One radix-2 Stockham pass of an inverse transform along rows (`alongRows`) or
 * columns, stage `stage` (sub-transforms of 2^stage already done), written per
 * output element exactly as the fragment shader computes it. log2(n) passes in
 * each direction leave Σ F(k) e^{+2πi k·x/n} in natural order.
 */
export function stockhamPass(input: Float64Array, output: Float64Array, n: number, stage: number, alongRows: boolean): void {
  const span = 1 << stage;
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const o = alongRows ? column : row;
      const q = o % (2 * span);
      const upper = q >= span;
      const within = q % span;
      const j = Math.floor(o / (2 * span)) * span + within;
      const at = (index: number) => ((alongRows ? row * n + index : index * n + column) * 2);
      const a = at(j);
      const b = at(j + n / 2);
      const angle = (Math.PI * within) / span;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const br = input[b] * c - input[b + 1] * s;
      const bi = input[b] * s + input[b + 1] * c;
      const out = (row * n + column) * 2;
      output[out] = upper ? input[a] - br : input[a] + br;
      output[out + 1] = upper ? input[a + 1] - bi : input[a + 1] + bi;
    }
  }
}

/** The whole inverse 2D transform by Stockham passes (rows, then columns): the shader's reference. */
export function inverseFft2d(field: Float64Array, n: number): Float64Array {
  let from = Float64Array.from(field);
  let to = new Float64Array(field.length);
  const stages = Math.round(Math.log2(n));
  for (const alongRows of [true, false]) {
    for (let stage = 0; stage < stages; stage += 1) {
      stockhamPass(from, to, n, stage, alongRows);
      [from, to] = [to, from];
    }
  }
  return from;
}
