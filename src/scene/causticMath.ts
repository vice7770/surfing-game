import { WATER_IOR } from './waterOptics';

/**
 * Caustics from the real water surface (plan §2.5, G5): the reference the
 * caustic shader mirrors. Sunlight refracts through the surface along its
 * normal and lands on the seabed; where neighbouring rays converge the bed is
 * brighter. The brightness at a bed point is the area a small patch of rays
 * covered under a flat surface over the area it covers now (Evan Wallace's
 * WebGL Water method), summed over every patch that lands there.
 */
export interface Vec3 { x: number; y: number; z: number }

/** GLSL's refract(I, N, η): I and N unit length, N against I; null past total internal reflection. */
export function refract(incident: Vec3, normal: Vec3, eta: number): Vec3 | null {
  const cosine = -(incident.x * normal.x + incident.y * normal.y + incident.z * normal.z);
  const k = 1 - eta * eta * (1 - cosine * cosine);
  if (k < 0) return null;
  const scale = eta * cosine - Math.sqrt(k);
  return { x: eta * incident.x + scale * normal.x, y: eta * incident.y + scale * normal.y, z: eta * incident.z + scale * normal.z };
}

/** Where a sun ray entering the surface at (x, surface height, z) with normal `normal` meets a bed `depth` below: its horizontal position. */
export function bedHit(x: number, z: number, depth: number, normal: Vec3, towardSun: Vec3): { x: number; z: number } {
  const length = Math.hypot(towardSun.x, towardSun.y, towardSun.z);
  const incident = { x: -towardSun.x / length, y: -towardSun.y / length, z: -towardSun.z / length };
  const ray = refract(incident, normal, 1 / WATER_IOR) ?? incident;
  const travel = depth / Math.max(1e-6, -ray.y);
  return { x: x + ray.x * travel, z: z + ray.z * travel };
}

/**
 * Relative sunlight on a flat bed `depth` below a surface η(x) that varies
 * along x only, in `bins` bins over [x0, x1) (periodic): each interval between
 * neighbouring rays deposits its flat-surface width, spread over where it now
 * lands. A flat surface gives 1 everywhere.
 */
export function causticProfile(
  heightSlopeAt: (x: number) => number, depth: number, towardSun: Vec3, x0: number, x1: number, rays: number, bins: number,
): Float64Array {
  const span = x1 - x0;
  const light = new Float64Array(bins);
  const flat = { x: 0, y: 1, z: 0 };
  const land = (x: number) => {
    const slope = heightSlopeAt(x);
    const norm = Math.hypot(slope, 1);
    return bedHit(x, 0, depth, { x: -slope / norm, y: 1 / norm, z: 0 }, towardSun).x;
  };
  const offset = bedHit(0, 0, depth, flat, towardSun).x;
  const binWidth = span / bins;
  for (let r = 0; r < rays; r += 1) {
    const a = x0 + (span * r) / rays;
    const b = x0 + (span * (r + 1)) / rays;
    let from = land(a) - offset;
    let to = land(b) - offset;
    if (to < from) [from, to] = [to, from];
    const width = Math.max(1e-12, to - from);
    const density = (b - a) / width;
    // Spread the interval's light over the bins it covers, wrapping periodically.
    for (let edge = from; edge < to; ) {
      const wrapped = ((((edge - x0) % span) + span) % span) + x0;
      const bin = Math.min(bins - 1, Math.floor((wrapped - x0) / binWidth));
      const binEnd = x0 + (bin + 1) * binWidth;
      const step = Math.min(to - edge, binEnd - wrapped);
      light[bin] += (density * Math.max(step, 0)) / binWidth;
      edge += Math.max(step, 1e-12);
    }
  }
  return light;
}

/** Depth at which a sinusoidal crest η = a cos kx focuses a vertical sun: f = 1 / ((1 − 1/n) a k²). */
export function crestFocalDepth(amplitude: number, wavenumber: number): number {
  return 1 / ((1 - 1 / WATER_IOR) * amplitude * wavenumber * wavenumber);
}
