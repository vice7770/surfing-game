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

/** The Phillips power of the wind sea at (kx, kz), unnormalized, with the solver's long waves and the tiniest cut away. */
function phillipsPower(kz: number, k: number, largest: number, direction: number): number {
  const small = SHORTEST_CHOP / (2 * Math.PI);
  const kMin = (2 * Math.PI) / LONGEST_CHOP;
  const along = (kz / k) * direction;
  // Phillips, with waves against the wind damped and the solver's long waves and the tiniest cut away.
  let phillips = (Math.exp(-1 / (k * largest) ** 2) / k ** 4) * along * along * Math.exp(-((k * small) ** 2));
  if (along < 0) phillips *= 0.07;
  phillips *= 1 - Math.exp(-((k / kMin) ** 4));
  return phillips;
}

/**
 * One patch's h̃0 per bin (row-major, re and im) from the seeded Gaussians, each bin's Phillips power times
 * `share(k)` and `binArea`. Every bin draws its pair whether or not it carries any, so the stream is the patch's own.
 */
function patchAmplitudes(windSpeed: number, random: () => number, n: number, patch: number, share?: (k: number) => number, binArea = 1): Float64Array {
  const wind = Math.max(2, Math.abs(windSpeed));
  const direction = windSpeed >= 0 ? 1 : -1;
  const largest = (wind * wind) / GRAVITY;
  const amplitude = new Float64Array(n * n * 2);
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const kx = (2 * Math.PI * binWave(column, n)) / patch;
      const kz = (2 * Math.PI * binWave(row, n)) / patch;
      const k = Math.hypot(kx, kz);
      const [a, b] = gaussianPair(random);
      if (k === 0) continue;
      let phillips = phillipsPower(kz, k, largest, direction);
      if (share) phillips *= share(k) * binArea;
      const scale = Math.sqrt(phillips / 2);
      amplitude[(row * n + column) * 2] = a * scale;
      amplitude[(row * n + column) * 2 + 1] = b * scale;
    }
  }
  return amplitude;
}

/** The slope covariance (xx, zz, xz) of a patch's amplitudes: Σ k k (|h̃0(k)|² + |h̃0(−k)|²) over the patch, scaled by `normal`². */
function patchCovariance(amplitude: Float64Array, n: number, patch: number, normal = 1): [number, number, number] {
  let xx = 0;
  let zz = 0;
  let xz = 0;
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const kx = (2 * Math.PI * binWave(column, n)) / patch;
      const kz = (2 * Math.PI * binWave(row, n)) / patch;
      const i = (row * n + column) * 2;
      const power = (amplitude[i] ** 2 + amplitude[i + 1] ** 2) * 2 * normal * normal;
      xx += kx * kx * power;
      zz += kz * kz * power;
      xz += kx * kz * power;
    }
  }
  return [xx, zz, xz];
}

/** Packs h̃0(k) and conj(h̃0(−k)) per bin as re, im, re, im, scaled by `normal`. */
function packSpectrum(amplitude: Float64Array, normal: number, n: number, into = new Float32Array(n * n * 4), offset = 0): Float32Array {
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const i = (row * n + column) * 2;
      const mirror = (((n - row) % n) * n + ((n - column) % n)) * 2;
      const o = offset + (row * n + column) * 4;
      into[o] = amplitude[i] * normal;
      into[o + 1] = amplitude[i + 1] * normal;
      into[o + 2] = amplitude[mirror] * normal;
      into[o + 3] = -amplitude[mirror + 1] * normal;
    }
  }
  return into;
}

/**
 * The patch's initial amplitudes: per bin (row-major, z rows then x columns)
 * h̃0(k) and conj(h̃0(−k)), as re, im, re, im. The wind blows along +z
 * (onshore) or −z (offshore); calm air still carries a light 2 m/s sea.
 * The Classic look's chop, one 64 m patch of waves 0.5–6 m.
 */
export function chopSpectrum(windSpeed: number, seed: number, n = FFT_CHOP_SIZE, patch = FFT_CHOP_PATCH): Float32Array {
  const amplitude = patchAmplitudes(windSpeed, mulberry32(seed * 7919 + 17), n, patch);
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
  return packSpectrum(amplitude, normal, n);
}

/**
 * Rich's chop (web-ocean plan, item 4): the same wind sea as two cascades on their own bands, so the 64 m patch's
 * repeat is broken by a finer patch that never lines up with it. The coarse 64 m patch carries the waves longer than
 * about CASCADE_SPLIT (to LONGEST_CHOP, as before), the fine patch the shorter (to SHORTEST_CHOP), with a smooth
 * crossover in log wavelength whose two shares sum to one; both stay out of the solver's band.
 */
export const COARSE_CHOP_PATCH = FFT_CHOP_PATCH;
/** The fine cascade's patch, m: 64/12.25 = 256/49, so the two repeats meet only every 3136 m. */
export const FINE_CHOP_PATCH = 12.25;
/** The wavelength the cascades hand over at, m (the fine patch's sixth: web-ocean's rule, a cascade carries waves of ≤ L/6). */
export const CASCADE_SPLIT = 2;
/** The crossover spans the split ÷ and × this. */
const CASCADE_BLEND = 1.25;
/** Rich's time loop, s: every frequency is a whole number of turns per loop, so the sea repeats exactly and its clock can wrap. */
export const CHOP_LOOP = 600;
export { LONGEST_CHOP, SHORTEST_CHOP };

/** The coarse cascade's share of the wind sea's power at wavenumber k (the fine takes the rest): smooth in log wavelength. */
export function coarseShare(k: number): number {
  const wavelength = (2 * Math.PI) / k;
  const t = Math.min(1, Math.max(0, Math.log(wavelength / (CASCADE_SPLIT / CASCADE_BLEND)) / Math.log(CASCADE_BLEND * CASCADE_BLEND)));
  return t * t * (3 - 2 * t);
}

export interface ChopCascades {
  /** The coarse patch's h̃0 then the fine's, each n² bins packed as `chopSpectrum`'s: n wide, 2n rows. */
  readonly spectrum: Float32Array;
  readonly patches: readonly [number, number];
  /** Each cascade's slope covariance (xx, zz, xz) at unit chop strength: their sum is CHOP_RMS_SLOPE². */
  readonly covariance: { readonly coarse: [number, number, number]; readonly fine: [number, number, number] };
}

/** Rich's two cascades for the local wind, scaled together to the procedural chop's rms slope. */
export function chopCascades(windSpeed: number, seed: number, n = FFT_CHOP_SIZE): ChopCascades {
  const coarseArea = ((2 * Math.PI) / COARSE_CHOP_PATCH) ** 2;
  const fineArea = ((2 * Math.PI) / FINE_CHOP_PATCH) ** 2;
  const kShortest = (2 * Math.PI) / SHORTEST_CHOP;
  // The coarse patch draws the Classic patch's stream, so its waves are the Classic sea's own, the short ones left out.
  const coarse = patchAmplitudes(windSpeed, mulberry32(seed * 7919 + 17), n, COARSE_CHOP_PATCH, coarseShare, coarseArea);
  const fine = patchAmplitudes(windSpeed, mulberry32(seed * 7919 + 0x2545f491), n, FINE_CHOP_PATCH,
    (k) => (k <= kShortest ? 1 - coarseShare(k) : 0), fineArea);
  const [cxx, czz] = patchCovariance(coarse, n, COARSE_CHOP_PATCH);
  const [fxx, fzz] = patchCovariance(fine, n, FINE_CHOP_PATCH);
  const variance = cxx + czz + fxx + fzz;
  const normal = variance > 0 ? CHOP_RMS_SLOPE / Math.sqrt(variance) : 0;
  const spectrum = new Float32Array(n * n * 8);
  packSpectrum(coarse, normal, n, spectrum, 0);
  packSpectrum(fine, normal, n, spectrum, n * n * 4);
  return {
    spectrum,
    patches: [COARSE_CHOP_PATCH, FINE_CHOP_PATCH],
    covariance: { coarse: patchCovariance(coarse, n, COARSE_CHOP_PATCH, normal), fine: patchCovariance(fine, n, FINE_CHOP_PATCH, normal) },
  };
}

/** ω rounded to a whole number of turns per `loop` s (web-ocean's time loop), so nothing pops when the clock wraps. */
export function loopFrequency(omega: number, loop = CHOP_LOOP): number {
  const step = (2 * Math.PI) / loop;
  return Math.round(omega / step) * step;
}

/**
 * The slope spectrum at time t, packed as one complex field F = i kx h̃ − kz h̃,
 * whose inverse transform is sx + i sz (both slopes are real), with
 * h̃(k, t) = h̃0(k) e^{iωt} + conj(h̃0(−k)) e^{−iωt}. The shader's first pass does the same per texel.
 * With `loop`, ω is rounded to it (Rich's cascades); `offset` starts at a later patch of a stacked spectrum.
 */
export function slopeSpectrum(spectrum: Float32Array, t: number, n = FFT_CHOP_SIZE, patch = FFT_CHOP_PATCH, loop?: number, offset = 0): Float64Array {
  const out = new Float64Array(n * n * 2);
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const kx = (2 * Math.PI * binWave(column, n)) / patch;
      const kz = (2 * Math.PI * binWave(row, n)) / patch;
      const exact = Math.sqrt(GRAVITY * Math.hypot(kx, kz));
      const omega = loop ? loopFrequency(exact, loop) : exact;
      const c = Math.cos(omega * t);
      const s = Math.sin(omega * t);
      const o = offset + (row * n + column) * 4;
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

/**
 * One radix-r Stockham pass of the inverse transform, written per output element exactly as the fragment shader
 * computes it: for output o along the axis, q = o mod r·s (s = r^stage, the sub-transforms already done),
 * j = ⌊o / r·s⌋ s + (q mod s), and out[o] = Σ_m in[j + m n/r] e^{2πi m q / r·s}. Radix 2 is `stockhamPass`;
 * log_r(n) passes in each direction leave Σ F(k) e^{+2πi k·x/n} in natural order.
 */
export function stockhamRadixPass(input: Float64Array, output: Float64Array, n: number, radix: number, stage: number, alongRows: boolean): void {
  const span = radix ** stage;
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const o = alongRows ? column : row;
      const q = o % (radix * span);
      const j = Math.floor(o / (radix * span)) * span + (q % span);
      let re = 0;
      let im = 0;
      for (let m = 0; m < radix; m += 1) {
        const index = j + (m * n) / radix;
        const at = (alongRows ? row * n + index : index * n + column) * 2;
        // The turn as the shader takes it: a fraction of a whole turn, exact in binary, then 2π.
        const turn = (m * q) / (radix * span);
        const angle = 2 * Math.PI * (turn - Math.floor(turn));
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        re += input[at] * c - input[at + 1] * s;
        im += input[at] * s + input[at + 1] * c;
      }
      const out = (row * n + column) * 2;
      output[out] = re;
      output[out + 1] = im;
    }
  }
}

/**
 * The transform's radix for an n, a power of four: 4. Radix 16 (two passes a direction at 256) is supported, but on
 * the M1 its sixteen-tap passes timed slower than radix 4's eight four-tap ones (0.83 against 0.41 ms, 2026-10-17).
 */
export function chopRadix(n: number): number {
  if (4 ** Math.round(Math.log2(n) / 2) === n) return 4;
  throw new Error(`The chop's transform needs a power of four, not ${n}`);
}

/** Passes per direction at a radix. */
export function radixStages(n: number, radix: number): number {
  return Math.round(Math.log2(n) / Math.log2(radix));
}

/** The whole inverse 2D transform by radix-r Stockham passes (rows, then columns): the shaders' reference. */
export function inverseFft2dRadix(field: Float64Array, n: number, radix = chopRadix(n)): Float64Array {
  let from = Float64Array.from(field);
  let to = new Float64Array(field.length);
  const stages = radixStages(n, radix);
  if (radix ** stages !== n) throw new Error(`${n} is not a power of ${radix}`);
  for (const alongRows of [true, false]) {
    for (let stage = 0; stage < stages; stage += 1) {
      stockhamRadixPass(from, to, n, radix, stage, alongRows);
      [from, to] = [to, from];
    }
  }
  return from;
}

/**
 * The slope moments the Rich chop's final pass writes per texel and its mipmaps box-filter (item 4): from the slope
 * field (sx, sz interleaved, n²), level by level, (sx, sz, sx², sz², sx·sz) averaged over 2^level texels a side.
 * Each level's variance, E[s²] − E[s]², is what a footprint that size leaves unresolved.
 */
export function slopeMomentLevels(slopes: Float64Array, n: number): Float64Array[] {
  let level = new Float64Array(n * n * 5);
  for (let i = 0; i < n * n; i += 1) {
    const sx = slopes[i * 2];
    const sz = slopes[i * 2 + 1];
    level.set([sx, sz, sx * sx, sz * sz, sx * sz], i * 5);
  }
  const levels = [level];
  for (let size = n / 2; size >= 1; size /= 2) {
    const next = new Float64Array(size * size * 5);
    const wide = size * 2;
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        for (let c = 0; c < 5; c += 1) {
          const at = (r: number, k: number) => level[((2 * row + r) * wide + 2 * column + k) * 5 + c];
          next[(row * size + column) * 5 + c] = (at(0, 0) + at(0, 1) + at(1, 0) + at(1, 1)) / 4;
        }
      }
    }
    levels.push(next);
    level = next;
  }
  return levels;
}
