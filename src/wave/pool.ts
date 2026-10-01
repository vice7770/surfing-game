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
 *   reflects little, up to a terrace `terraceDepth` deep: shallow, so little depth is left to refract over (at
 *   2.5 m still 1.7 times the biggest breaking depth, so nothing breaks on it);
 * - the reef on the terrace: a finger pointing seaward, its tip at z = `apexZ` (x = 0, on the grid's symmetry
 *   line), its two arms at `armAngle` to the incoming crests, rounded over a half-width `tipRounding` at the tip (a
 *   hyperbola: the width over which the focus spreads, 0.5–1 wavelength on the terrace), easing to
 *   `outerArmAngle` past |x| = `bendX` over `bendWidth` m (a curve, not a kink, which would refract like a small
 *   tip), so the arms' longer outer run stays in the tank with its peel still about 46°. Refraction turns the
 *   crests toward the arms, so arms at 71° break at a peel angle of about 47–50° along them (measured): Scarfe's
 *   46–55° for intermediates' standard manoeuvres, about 6–6.5 m/s at 1.1–1.25 m faces;
 * - seaward of the terrace's edge the finger's faces run on at their gradient instead of stopping at the terrace:
 *   in front of the finger (|x| under about 90 m) two ridges aligned with the approach, their crests dipping seaward
 *   at about 1:43 along the path and their sides at 1:18 normal, down to 4–8 m at the zone's inner edge, where the
 *   tank blends them into the feed over 10 m (a step reflecting at most about 3 % of the energy into the zone). This
 *   is Mead's "focus" (Mead 2000, table 3.3: contour-normal gradients 1:10–1:80, alignments 40–90°), which gathers the
 *   waves onto the finger and eases the take-off. Found after the sweep and kept on the advisor's ruling
 *   (2026-10-01): every measurement was made on it. If the zone or the feed ever moves, recheck the step; if a size
 *   ever breaks on the arms before the tip, look at the axis first (deeper than the ridges, so it draws less);
 * - its face climbs at `gradient` square to the crest line, about 1:18: Mead & Black's orthogonal gradient of about
 *   1:28 along the ray at breaking, which crosses the arms at about 50° (their intensity about 2.6–2.8, a face that
 *   throws without a tube; set along +z it made the arms about 1:9 and tubed), to its crest: `crestDepth` deep at
 *   the tip, shallowing along each arm to `crestEndDepth` at its end (a ramped reef: a deeper tip focuses less, so
 *   it breaks over a small peak rather than closing out across the finger and starving the flanks, and the
 *   shallowing crest keeps the arms' refracted waves breaking in order; the advisor, 2026-10-01);
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
  terraceDepth: 2.5,
  apexZ: -210,
  armAngle: 71,
  outerArmAngle: 65,
  bendX: 40,
  bendWidth: 14,
  tipRounding: 15,
  gradient: 1 / 18,
  crestDepth: 1,
  crestEndDepth: 0.5,
  flatWidth: 6,
  lagoonDepth: 1.8,
  armLength: 82,
  taperWidth: 25,
  /**
   * Where riders wait, x, m: on the right arm just past the tip's fast section, where the break line settles to its
   * steady peel (about 6 m/s along the arm from |x| 27 out; the break-line probe, 2026-10-01).
   */
  takeOffX: 27,
  /** How far seaward of the tip's face the terrace reaches before the ramp, m: short, so the ramp's free harmonics don't reorder the crest. */
  terraceLead: 20,
  shoreSlope: 1 / 8,
  deck: 0.6,
  alongShore: 280,
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

/**
 * Where the machine's wave starts breaking on the arms, as the arm's depth over the wave's height at the feed: the
 * break-line probe's 1.5 m contour at H 1.0 m (2026-10-01).
 */
export const POOL_BREAK_DEPTH = 1.5;

/** The pool's three sizes, as faces at the break, m (the movement-flow spec): the Surf screen's Small, Medium and Big. */
export const POOL_FACES = { small: 1.0, medium: 1.25, big: 1.5 } as const;
export type PoolSize = keyof typeof POOL_FACES;

/**
 * The wave height the machine makes at the tank's edge for each size, m: set so the game's surf meter (each wave's
 * biggest breaking face within 10 m of the take-off, H1/3) reads the size's face. Measured on the pool (the size
 * probe, 2026-10-01): H 0.85 → 1.29 m, 1.05 → 1.46 m, 1.3 → 1.77 m, about 0.38 + 1.07 H.
 */
export const POOL_EDGE_HEIGHT: Record<PoolSize, number> = { small: 0.58, medium: 0.81, big: 1.05 };

/** A regular wave's Hs, 4√m0, for its height H: m0 = a²/2 = H²/8, so Hs = √2 H. */
/** smoothstep, kept here so this module and Bathymetry's import only each other's types. */
function ease(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function regularSignificantHeight(height: number): number {
  return Math.SQRT2 * height;
}

/** The crest line's slope dz/d|x| at along-shore position x: the hyperbola's at the tip, its arms easing from armAngle to outerArmAngle. */
function crestSlope(u: number): number {
  const p = POOL;
  const bend = ease(p.bendX - p.bendWidth / 2, p.bendX + p.bendWidth / 2, u);
  const angle = p.armAngle + (p.outerArmAngle - p.armAngle) * bend;
  return Math.tan((angle * Math.PI) / 180) * (u / Math.hypot(u, p.tipRounding));
}

/** The crest line's z at |x| on a 0.25 m table, integrated from its slope; rebuilt when POOL changes (the probes set it). */
const CREST_STEP = 0.25;
let crestTable: { key: string; z: Float64Array } | undefined;
function crestTableFor(): Float64Array {
  const key = JSON.stringify(POOL);
  if (crestTable?.key === key) return crestTable.z;
  const count = Math.ceil(POOL.alongShore / CREST_STEP) + 2;
  const z = new Float64Array(count);
  for (let i = 1; i < count; i += 1) z[i] = z[i - 1] + (CREST_STEP * (crestSlope((i - 1) * CREST_STEP) + crestSlope(i * CREST_STEP))) / 2;
  crestTable = { key, z };
  return z;
}

/** Where the crest line (the top of the reef's arms) crosses along-shore position x: rounded at the tip, bent outward. */
export function poolCrestZ(x: number): number {
  const table = crestTableFor();
  const at = Math.min(table.length - 1.001, Math.abs(x) / CREST_STEP);
  const i = Math.floor(at);
  return POOL.apexZ + table[i] + (table[i + 1] - table[i]) * (at - i);
}

/** The share of a step along +z that lies square to the crest line at along-shore position x: the cosine of the line's angle there. */
export function poolNormalShare(x: number): number {
  return 1 / Math.hypot(1, crestSlope(Math.abs(x)));
}

/** The arm the pool's peel is measured on: the right one (riders wait there), out to where its taper ends. */
export function poolRiddenAt(x: number): boolean {
  return x >= 0 && x <= POOL.armLength + POOL.taperWidth;
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
  const ramped = p.crestDepth + (p.crestEndDepth - p.crestDepth) * Math.min(1, Math.abs(x) / p.armLength);
  const crest = ramped + (p.terraceDepth - ramped) * taper;
  const lagoon = p.lagoonDepth + (p.terraceDepth - p.lagoonDepth) * taper;
  // The face and the lagoon's edge climb at `gradient` square to the crest line.
  const normal = poolNormalShare(x);
  const face = crest + Math.max(0, crestLine - z) * normal * p.gradient;
  const inside = Math.max(0, z - crestLine - p.flatWidth) * normal;
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
