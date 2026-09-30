import type { SurfSpot } from './Bathymetry';
import type { WaveNumberFunction } from './dispersion';
import { SeaState } from './SeaState';

/**
 * The Wave Pool (the movement-flow spec): a training pool whose machine sends the same wave every POOL.period
 * seconds over a V reef, an A-frame that breaks first at its apex and peels both ways, a right and a left each
 * wave, for faces of 1.0, 1.25 and 1.5 m. The same solver rides it as every spot.
 *
 * The bed, across shore (+z toward the beach) and along it (x, the apex at 0):
 * - the machine's flat floor, `generatorDepth` deep, under the tank's relaxation zone;
 * - the reef's two arms rising from it at `slope` along the waves' path (+z) to its crest, `crestDepth` deep;
 * - the crest line, running back from the apex (z = `peakZ`) at `angle` degrees to the incoming crests on both
 *   sides (rounded over `apexRadius` m at the apex, so the peak is no spike), so each wave breaks at the apex
 *   first and peels outward at its celerity over the sine of that angle;
 * - a reef top `flatWidth` m wide, then the lagoon inside the V, `lagoonDepth` deep;
 * - past |x| = `reefHalfWidth` the arms fade out over `endWidth` m into channels at the machine's depth, level
 *   across the window's open side edges (an open edge copies its neighbours: a bed sloping across it ran
 *   Padang Padang's Big swell to NaN);
 * - a beach face at `shoreSlope` up to the waterline at z = 0, and the deck beyond.
 *
 * Provisional until the water-physics advisor's ruling; mutable for the probes.
 */
export const POOL = {
  period: 10,
  generatorDepth: 4.5,
  peakZ: -130,
  angle: 50,
  slope: 1 / 16,
  crestDepth: 1,
  flatWidth: 8,
  lagoonDepth: 1.8,
  apexRadius: 15,
  reefHalfWidth: 90,
  endWidth: 20,
  shoreSlope: 1 / 8,
  alongShore: 240,
};

/** The pool's three sizes, as faces at the break, m (the movement-flow spec): the Surf screen's Small, Medium and Big. */
export const POOL_FACES = { small: 1.0, medium: 1.25, big: 1.5 } as const;
export type PoolSize = keyof typeof POOL_FACES;

/**
 * The wave height the machine makes at the tank's edge for each size, m: the face each breaks with over the reef,
 * measured by the pool probe. Provisional: a face of 1.25 m, until measured.
 */
export const POOL_EDGE_HEIGHT: Record<PoolSize, number> = { small: 0.7, medium: 0.9, big: 1.1 };

/** A regular wave's Hs, 4√m0, for its height H: m0 = a²/2 = H²/8, so Hs = √2 H. */
/** smoothstep, kept here so this module and Bathymetry's import only each other's types. */
function ease(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function regularSignificantHeight(height: number): number {
  return Math.SQRT2 * height;
}

/** Where the crest line (the top of the reef's arms) crosses along-shore position x: rounded over apexRadius at the apex. */
export function poolCrestZ(x: number): number {
  const { peakZ, angle, apexRadius } = POOL;
  const rounded = Math.hypot(x, apexRadius) - apexRadius;
  return peakZ + rounded * Math.tan((angle * Math.PI) / 180);
}

/** The pool's still depth below datum at (x, z), m; negative on the deck. */
export function poolDepth(x: number, z: number): number {
  const p = POOL;
  const crest = poolCrestZ(x);
  // The reef's arms along the waves' path; its top; then down to the lagoon inside the V.
  const face = p.crestDepth + Math.max(0, crest - z) * p.slope;
  const inside = Math.max(0, z - crest - p.flatWidth);
  const reef = Math.min(p.generatorDepth, z <= crest ? face : Math.min(p.lagoonDepth, p.crestDepth + inside * p.slope));
  // The arms fade into the channels past the reef's ends, level across the open edges.
  const end = ease(p.reefHalfWidth, p.reefHalfWidth + p.endWidth, Math.abs(x));
  const bed = reef + (p.generatorDepth - reef) * end;
  // The beach face at the shore end, and the deck beyond the waterline.
  const beach = -z * p.shoreSlope;
  return Math.min(bed, beach);
}

export function poolSpot(): SurfSpot {
  return { name: 'pool', depthAt: poolDepth };
}

/**
 * The machine's sea: one regular wave square to the tank, of height H = Hs/√2 at the edge, every POOL.period s.
 * Every wave is the same one, so the pool needs no seed.
 */
export function poolSea(significantHeight: number, depth: number, waveNumberAt: WaveNumberFunction): SeaState {
  const height = significantHeight / Math.SQRT2;
  return new SeaState([{ amplitude: height / 2, omega: (2 * Math.PI) / POOL.period, direction: 0, phase: 0 }], depth, waveNumberAt);
}
