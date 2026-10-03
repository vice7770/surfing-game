import type { FrontPoint } from './BreakingFront';

/**
 * A front point as the snapshot carries it to the page (the Padang Padang spec, Part B, PR 3): where its crest is, which
 * front and how far along it, its clock, its foot crest and depth (which size and scale its profile), and its crest's z
 * where it crossed its throw depth (NaN until then), which the loft anchors the profile's τ = 0 crest on.
 */
export const FRONT_STRIDE = 8;
export const FRONT_FIELD = { x: 0, z: 1, front: 2, sigma: 3, tau: 4, footHeight: 5, footDepth: 6, throwZ: 7 } as const;
/** Most front points a snapshot carries: about one per metre of breaking crest, several fronts across a 320 m window. */
export const FRONT_CAPACITY = 2048;

/** Writes `points` (in their order: by front, then σ) into `out` as records, as many as fit; returns how many. */
export function writeFrontRecords(points: readonly FrontPoint[], out: Float32Array): number {
  const count = Math.min(points.length, Math.floor(out.length / FRONT_STRIDE));
  for (let k = 0; k < count; k += 1) {
    const p = points[k];
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = p.x;
    out[o + FRONT_FIELD.z] = p.z;
    out[o + FRONT_FIELD.front] = p.front;
    out[o + FRONT_FIELD.sigma] = p.sigma;
    out[o + FRONT_FIELD.tau] = p.tau;
    out[o + FRONT_FIELD.footHeight] = p.footHeight;
    out[o + FRONT_FIELD.footDepth] = p.footDepth;
    out[o + FRONT_FIELD.throwZ] = p.throwZ ?? Number.NaN;
  }
  return count;
}
