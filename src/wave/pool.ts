import type { SurfSpot } from './Bathymetry';
import { waveKinematics, type WaveNumberFunction } from './dispersion';
import { SeaState } from './SeaState';

/**
 * The Wave Pool (the movement-flow spec): a training pool whose machine sends the same wave every POOL.period
 * seconds onto an A-frame reef, a finger that breaks first at its tip and peels both ways, a right and a left each
 * wave, for faces of 1.0, 1.25 and 1.5 m. The same solver rides it as every spot. The layout is the water-physics
 * advisor's (2026-10-01 consult, docs/research/water-physics/consult-log.md), provisional until the sweep:
 * - the machine's floor `feedDepth` deep under the relaxation zone, where a regular wave of the pool's height is
 *   near linear (Ursell about 8; at 4.5 m it was 41 and a linear input would shed free harmonics);
 * - a ramp square to the crests (so it turns nothing) at `rampSlope`, at least half a wavelength long so it
 *   reflects little, up to a terrace `terraceDepth` deep;
 * - the reef on the terrace: a finger pointing seaward, its tip at z = `apexZ` (x = 0, on the grid's symmetry
 *   line), its two arms at `armAngle` to the incoming crests, rounded over `tipRounding` at the tip. Refraction
 *   turns the crests toward the arms, so arms at 70–75° break at a peel angle of about 50°: Scarfe's 46–55° for
 *   intermediates' standard manoeuvres, about 6.5 m/s at 1.25 m faces;
 * - its face climbs at `gradient` along the waves' path, Mead & Black's orthogonal gradient of about 1:28 (their
 *   intensity about 2.6–2.8, a face that throws without a tube; at 1:16 it tubed), to its crest `crestDepth` deep,
 *   just under the smallest size's breaking depth, so every size breaks on the slope;
 * - behind the crest a reef top `flatWidth` wide, then the lagoon inside the finger, `lagoonDepth` deep;
 * - past |x| = `armLength` each arm tapers over `taperWidth` into the terrace, its crest deepening to the terrace's,
 *   so the break fades into a shoulder to kick out on, and the lagoon's return flow leaves through the channels
 *   beside it, level across the window's open side edges;
 * - a beach face at `shoreSlope` up to the waterline at z = 0, and on up to the deck, `deck` m above the water.
 * Mutable for the probes.
 */
export const POOL = {
  period: 10,
  feedDepth: 9,
  rampSlope: 1 / 9,
  terraceDepth: 3.25,
  apexZ: -210,
  armAngle: 72,
  tipRounding: 25,
  gradient: 1 / 28,
  crestDepth: 0.75,
  flatWidth: 6,
  lagoonDepth: 1.8,
  armLength: 36,
  taperWidth: 18,
  /** How far seaward of the tip's face the terrace reaches before the ramp, m: short, so the ramp's free harmonics don't reorder the crest. */
  terraceLead: 20,
  shoreSlope: 1 / 8,
  deck: 0.6,
  alongShore: 220,
};

/** Where the beach face meets the deck, z, m. */
export function poolDeckZ(): number {
  return POOL.deck / POOL.shoreSlope;
}

/** Where the terrace begins, z, m: seaward of the tip's face by `terraceLead`. */
export function poolTerraceZ(): number {
  const p = POOL;
  return p.apexZ - (p.terraceDepth - p.crestDepth) / p.gradient - p.terraceLead;
}

/** Where the ramp rises from the machine's floor, z, m. */
export function poolRampFootZ(): number {
  return poolTerraceZ() - (POOL.feedDepth - POOL.terraceDepth) / POOL.rampSlope;
}

/** The pool's three sizes, as faces at the break, m (the movement-flow spec): the Surf screen's Small, Medium and Big. */
export const POOL_FACES = { small: 1.0, medium: 1.25, big: 1.5 } as const;
export type PoolSize = keyof typeof POOL_FACES;

/**
 * The wave height the machine makes at the tank's edge for each size, m: reverse-shoaled from the faces to the
 * feed's 9 m (the advisor: a 1.25 m breaker is about 0.76 m high there, Ursell about 8), to be calibrated by the pool
 * probe against the faces the solver breaks with.
 */
export const POOL_EDGE_HEIGHT: Record<PoolSize, number> = { small: 0.61, medium: 0.76, big: 0.91 };

/** A regular wave's Hs, 4√m0, for its height H: m0 = a²/2 = H²/8, so Hs = √2 H. */
/** smoothstep, kept here so this module and Bathymetry's import only each other's types. */
function ease(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function regularSignificantHeight(height: number): number {
  return Math.SQRT2 * height;
}

/** Where the crest line (the top of the reef's arms) crosses along-shore position x: rounded over tipRounding at the tip. */
export function poolCrestZ(x: number): number {
  const { apexZ, armAngle, tipRounding } = POOL;
  return apexZ + (Math.hypot(x, tipRounding) - tipRounding) * Math.tan((armAngle * Math.PI) / 180);
}

/** How far each arm has tapered into the terrace at along-shore position x: 0 on the reef, 1 past its end. */
export function poolTaper(x: number): number {
  return ease(POOL.armLength, POOL.armLength + POOL.taperWidth, Math.abs(x));
}

/** The pool's still depth below datum at (x, z), m; negative on the deck. */
export function poolDepth(x: number, z: number): number {
  const p = POOL;
  // The ramp square to the crests, from the machine's floor up to the terrace.
  const ramp = Math.min(p.feedDepth, p.terraceDepth + Math.max(0, poolTerraceZ() - z) * p.rampSlope);
  // The reef: its crest deepening along each arm's taper, its face climbing along the waves' path, its top, the lagoon.
  const taper = poolTaper(x);
  const crestLine = poolCrestZ(x);
  const crest = p.crestDepth + (p.terraceDepth - p.crestDepth) * taper;
  const lagoon = p.lagoonDepth + (p.terraceDepth - p.lagoonDepth) * taper;
  const face = crest + Math.max(0, crestLine - z) * p.gradient;
  const inside = Math.max(0, z - crestLine - p.flatWidth);
  const reef = z <= crestLine ? face : Math.min(lagoon, crest + inside * p.gradient);
  const bed = Math.min(ramp, reef);
  // The beach face at the shore end, up to the deck.
  const beach = Math.max(-p.deck, -z * p.shoreSlope);
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

/** The machine's relaxation zone is this many wavelengths at its floor long: 1.5–2 absorb a 10 s wave (the advisor). */
const POOL_ZONE_WAVELENGTHS = 1.75;

/**
 * The pool's tank across shore, m (a TankLayout without its edge depth): the relaxation zone over the machine's
 * floor ending just seaward of the ramp, the fine grid from just seaward of the terrace to the shore.
 */
export function poolTankLayout(shore: number): { offshore: number; zoneInner: number; blendEnd: number; fineFrom: number; shore: number } {
  const zoneInner = poolRampFootZ() - 10;
  const zone = POOL_ZONE_WAVELENGTHS * waveKinematics(POOL.period, POOL.feedDepth).wavelength;
  return { offshore: zoneInner - zone, zoneInner, blendEnd: zoneInner + 10, fineFrom: poolTerraceZ() - 10, shore };
}
