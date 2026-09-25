import { exactWaveNumber } from './dispersion';

export interface WaveComponent {
  /** Amplitude a, m. */
  amplitude: number;
  /** Angular frequency ω, rad/s. */
  omega: number;
  /** Travel direction, rad from shore-normal +z, positive toward +x. */
  direction: number;
  /** Phase φ, rad. */
  phase: number;
}

export interface ResolvedComponent extends WaveComponent {
  k: number;
  kx: number;
  kz: number;
}

export interface SpectrumParams {
  /** Hs = 4√m0, m. */
  significantHeight: number;
  /** Tp, s. */
  peakPeriod: number;
  /** Mean direction, rad from shore-normal +z. */
  direction: number;
  /** cos-2s exponent s; larger values give narrower, cleaner lines. */
  spreading: number;
  componentCount: number;
  /** Reference still-water depth for each wavenumber, m (Infinity = deep water). */
  depth: number;
}

export const JONSWAP_GAMMA = 3.3;

/** JONSWAP spectral shape without the α g² scale, which fromSpectrum normalizes to Hs. */
export function jonswapShape(omega: number, peakOmega: number, gamma = JONSWAP_GAMMA): number {
  if (!(omega > 0)) return 0;
  const sigma = omega <= peakOmega ? 0.07 : 0.09;
  const r = Math.exp(-((omega - peakOmega) ** 2) / (2 * sigma * sigma * peakOmega * peakOmega));
  return Math.pow(omega, -5) * Math.exp(-1.25 * Math.pow(peakOmega / omega, 4)) * Math.pow(gamma, r);
}

function seededRandom(seed: number): () => number {
  let value = (seed ^ 0x5eaa57a7) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tabulated inverse CDF of `density` on [lo, hi] (trapezoid rule, linear inversion). */
function inverseCdf(lo: number, hi: number, samples: number, density: (x: number) => number): (u: number) => number {
  const xs = new Float64Array(samples);
  const cdf = new Float64Array(samples);
  const dx = (hi - lo) / (samples - 1);
  xs[0] = lo;
  let previous = density(lo);
  for (let index = 1; index < samples; index += 1) {
    xs[index] = lo + index * dx;
    const value = density(xs[index]);
    cdf[index] = cdf[index - 1] + 0.5 * (value + previous) * dx;
    previous = value;
  }
  const total = cdf[samples - 1];
  return (u: number) => {
    const target = Math.min(1, Math.max(0, u)) * total;
    let low = 0;
    let high = samples - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (cdf[middle] < target) low = middle;
      else high = middle;
    }
    const span = cdf[high] - cdf[low];
    const t = span > 0 ? (target - cdf[low]) / span : 0;
    return xs[low] + t * (xs[high] - xs[low]);
  };
}

/** A linear sea: a fixed set of seeded Airy components over a reference depth. */
export class SeaState {
  readonly components: readonly ResolvedComponent[];

  constructor(components: readonly WaveComponent[], readonly depth: number) {
    this.components = components.map((component) => {
      const k = exactWaveNumber(component.omega, depth);
      return { ...component, k, kx: k * Math.sin(component.direction), kz: k * Math.cos(component.direction) };
    });
  }

  /**
   * Split a JONSWAP spectrum into equal-energy frequency bins and draw each bin's
   * frequency, direction (cos-2s, clipped to shoreward travel), and phase from the
   * seed. Equal energy per component makes the realized Hs exact.
   */
  static fromSpectrum(params: SpectrumParams, seed: number): SeaState {
    const count = Math.max(1, Math.floor(params.componentCount));
    const peakOmega = (2 * Math.PI) / params.peakPeriod;
    const frequencyAt = inverseCdf(0.5 * peakOmega, 4 * peakOmega, 2048, (omega) => jonswapShape(omega, peakOmega));
    const halfWidth = Math.PI / 2;
    const s = Math.max(0, params.spreading);
    const directionAt = inverseCdf(-halfWidth, halfWidth, 721, (theta) => Math.pow(Math.cos(theta / 2), 2 * s));
    const amplitude = params.significantHeight / Math.sqrt(8 * count);
    const random = seededRandom(seed);
    const components: WaveComponent[] = [];
    for (let index = 0; index < count; index += 1) {
      const omega = frequencyAt((index + 0.25 + 0.5 * random()) / count);
      const direction = params.direction + directionAt(random());
      components.push({ amplitude, omega, direction, phase: 2 * Math.PI * random() });
    }
    return new SeaState(components, params.depth);
  }

  get significantHeight(): number {
    let m0 = 0;
    for (const component of this.components) m0 += 0.5 * component.amplitude * component.amplitude;
    return 4 * Math.sqrt(m0);
  }
}
