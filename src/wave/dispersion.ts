/** Linear (Airy) water-wave dispersion, ω² = g k tanh(kh), in SI units. */
export const GRAVITY = 9.81;

export type DepthClass = 'deep' | 'transitional' | 'shallow';

export interface WaveKinematics {
  k: number;
  wavelength: number;
  phaseSpeed: number;
  groupSpeed: number;
  kh: number;
}

/**
 * Explicit wavenumber from Guo (2002), exact in both limits and within 0.8 %
 * of the dispersion root at every depth. Cheap enough for per-cell use.
 * `depth` is still-water depth in metres; Infinity means deep water.
 */
export function waveNumber(omega: number, depth: number, g = GRAVITY): number {
  if (!(depth > 0)) throw new RangeError(`Water depth must be positive, got ${depth}`);
  const deep = (omega * omega) / g;
  if (!Number.isFinite(depth)) return deep;
  const x = deep * depth;
  const y = omega * Math.sqrt(depth / g);
  return (x * Math.pow(1 - Math.exp(-Math.pow(y, 2.5)), -0.4)) / depth;
}

/** Exact dispersion root by Newton iteration from the Guo estimate, for setup-time use. */
export function exactWaveNumber(omega: number, depth: number, g = GRAVITY): number {
  let k = waveNumber(omega, depth, g);
  if (!Number.isFinite(depth)) return k;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const tanh = Math.tanh(k * depth);
    const residual = g * k * tanh - omega * omega;
    const slope = g * tanh + g * k * depth * (1 - tanh * tanh);
    const next = k - residual / slope;
    if (Math.abs(next - k) <= 1e-15 * k) return next;
    k = next;
  }
  return k;
}

export function waveKinematics(period: number, depth: number, g = GRAVITY): WaveKinematics {
  const omega = (2 * Math.PI) / period;
  const k = exactWaveNumber(omega, depth, g);
  const kh = k * depth;
  const n = Number.isFinite(kh) ? 0.5 * (1 + (2 * kh) / Math.sinh(2 * kh)) : 0.5;
  const phaseSpeed = omega / k;
  return { k, wavelength: (2 * Math.PI) / k, phaseSpeed, groupSpeed: n * phaseSpeed, kh };
}

/** Passyworld/Sandwell classes: deep above L/2, shallow below L/20. */
export function depthClass(depth: number, wavelength: number): DepthClass {
  const ratio = depth / wavelength;
  if (ratio > 0.5) return 'deep';
  if (ratio < 1 / 20) return 'shallow';
  return 'transitional';
}
