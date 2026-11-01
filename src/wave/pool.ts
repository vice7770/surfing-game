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
 * Where the machine's wave starts breaking at the take-off, m deep for a wave H m high at the feed: the size probe's
 * first breaks at x 27 (2026-10-01) were 1.73, 1.85 and 2.20 m deep for H 0.85, 1.05 and 1.3, about 0.84 + 1.04 H.
 * At 1.5 H (the break-line probe's contour) riders waited 13–23 m inside the break, in its whitewater.
 */
export const POOL_BREAK_DEPTH = { base: 0.84, perMetre: 1.04 } as const;

/** How deep the pool's wave of height H at the feed first breaks at the take-off, m. */
export function poolBreakDepth(height: number): number {
  return POOL_BREAK_DEPTH.base + POOL_BREAK_DEPTH.perMetre * height;
}

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

/** A finger's planform, its crest line: the training floor's (`POOL`) or the Barrel floor's (`POOL_BARREL`'s own keys). */
export interface PoolPlanform {
  apexZ: number; armAngle: number; outerArmAngle: number; bendX: number; bendWidth: number; tipRounding: number; alongShore: number;
}

/** The crest line's slope dz/d|x| at along-shore position x: the hyperbola's at the tip, its arms easing from armAngle to outerArmAngle. */
function crestSlope(u: number, p: PoolPlanform = POOL): number {
  const bend = ease(p.bendX - p.bendWidth / 2, p.bendX + p.bendWidth / 2, u);
  const angle = p.armAngle + (p.outerArmAngle - p.armAngle) * bend;
  return Math.tan((angle * Math.PI) / 180) * (u / Math.hypot(u, p.tipRounding));
}

/**
 * The crest line's z at |x| on a 0.25 m table, integrated from its slope; rebuilt when its planform changes (the probes set
 * it). One table per planform (the training's keyed on all of `POOL`, as before the Barrel floor), a few kept.
 */
const CREST_STEP = 0.25;
const crestTables = new Map<string, Float64Array>();
function crestTableFor(p: PoolPlanform = POOL): Float64Array {
  const key = p === POOL ? JSON.stringify(POOL) : `planform ${JSON.stringify(p)}`;
  const cached = crestTables.get(key);
  if (cached) return cached;
  const count = Math.ceil(p.alongShore / CREST_STEP) + 2;
  const z = new Float64Array(count);
  for (let i = 1; i < count; i += 1) z[i] = z[i - 1] + (CREST_STEP * (crestSlope((i - 1) * CREST_STEP, p) + crestSlope(i * CREST_STEP, p))) / 2;
  if (crestTables.size >= 8) crestTables.clear();
  crestTables.set(key, z);
  return z;
}

/** Where the crest line (the top of the reef's arms) crosses along-shore position x: rounded at the tip, bent outward. */
export function poolCrestZ(x: number, p: PoolPlanform = POOL): number {
  const table = crestTableFor(p);
  const at = Math.min(table.length - 1.001, Math.abs(x) / CREST_STEP);
  const i = Math.floor(at);
  return p.apexZ + table[i] + (table[i + 1] - table[i]) * (at - i);
}

/** The share of a step along +z that lies square to the crest line at along-shore position x: the cosine of the line's angle there. */
export function poolNormalShare(x: number, p: PoolPlanform = POOL): number {
  return 1 / Math.hypot(1, crestSlope(Math.abs(x), p));
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

/**
 * The Wave Pool's two kinds of wave (the pool-barrel decisions, 2026-10-31): 'training', the A-frame above (faces 1.0,
 * 1.25 and 1.5 m, unchanged), and 'barrel', a mirrored A-frame whose arms plunge a tube a crouched rider fits
 * (`POOL_BARREL`, faces 1.5 and 1.8 m). The same machine sends the same regular wave onto either.
 */
export type PoolWaves = 'training' | 'barrel';

/**
 * The Barrel mode's floor (docs/research/pool-barrel-2026-11-01; the water-physics advisor's design, 2026-11-01): the
 * training finger's planform (its tip, its arms at `POOL.armAngle` easing to `POOL.outerArmAngle`, `poolCrestZ`) under the
 * same machine (its feed, zone, ramp foot and terrace edge, so `poolTankLayout` is the same), with the face made a tube's:
 * - **a level platform** `platformDepth` deep from `platformLead` m seaward of the terrace's edge (`poolBarrelPlatformZ`) to the face's knee, so the 1.8 m
 *   faces cross it unbroken (H/h about 0.48–0.52 on it; Nelson's and Gourlay's 0.55 limit on a level bed and a reef flat,
 *   via Saket et al. 2017; the training terrace's 2.5 m would hold them at 0.65–0.68), and crests reach the knee straight;
 * - **no ridges seaward of it:** seaward of the platform the bed is the ramp alone, square to the crests, from the
 *   machine's floor at the training ramp's foot (`poolRampFootZ`) up to the platform: the finger's faces don't run on as
 *   the training's do (on a 1:9.5 face they would reach the zone's edge about 6 m deep), so the zone's inner edge is the
 *   plain feed and has no step;
 * - **one steep face** square to the crest line from the knee to the crest: `gradient` about 1:9.5, so along the breaking
 *   ray (α_b about 50°) it is about 1:14.5, Mead & Black's (2001) X 14–15 and vortex ratio Y = 0.065 X + 0.821 of
 *   1.73–1.80, their "extreme" class (Pipeline 1.56–1.92), and ξb about 0.64–0.70 at 1.5–1.8 m faces (plunging; Battjes
 *   1974). One slope, not two: Mead & Black's band (h_b ± 2.5 m) spans the whole face at both sizes, so a gentler lower
 *   part would soften Y. At the tip, met square, it is `tipGradient` (X 15 there too), easing to `gradient` by |x|
 *   `tipEase`. The knee is rounded over ±`kneeRounding` m;
 * - **its crest** `crestDepth` deep at the tip, easing to `armCrestDepth` by |x| `crestEase`: a low relative crest
 *   submergence (h_c/H 0.5–0.6; Blenkinsopp & Chaplin's 1:10 reef broke more intensely as it fell; Surf Ranch's bar is at
 *   0.48), no shallower than 0.8 m so the 1.8 m wave's trough and backwash leave water on the top;
 * - **a reef top** `flatWidth` m wide square to the crest line, then the lagoon's inner slope at `lagoonSlope` down to
 *   `lagoonDepth`;
 * - **the barrel section** along each arm to |x| `armLength` (u 24–103 m along the arm from the tip; riders wait at
 *   `takeOffX` on it), then **a back-off** over `taperWidth` m, the crest deepening to the platform with the face's
 *   gradient held, so the wave backs off into a shoulder to kick out on and the lagoon drains through the channels beside
 *   it; past the taper the platform runs level to the beach face, the same across the window's open side edges.
 * Mutable for the probes.
 */
export const POOL_BARREL = {
  /** Its planform (`PoolPlanform`): the training finger's, unless a key here differs. */
  apexZ: -210,
  armAngle: 71,
  outerArmAngle: 65,
  bendX: 40,
  bendWidth: 14,
  tipRounding: 15,
  alongShore: 280,
  platformDepth: 4.5,
  gradient: 1 / 9.5,
  tipGradient: 1 / 14,
  tipEase: 15,
  crestDepth: 1.0,
  armCrestDepth: 0.9,
  crestEase: 25,
  /** The crest's depth where the barrel section ends (|x| `armLength`), reached linearly from |x| `crestEase`. */
  outerCrestDepth: 0.6,
  kneeRounding: 3,
  flatWidth: 6,
  lagoonSlope: 1 / 18,
  lagoonDepth: 1.8,
  armLength: 45,
  taperWidth: 25,
  /**
   * The solver's breaking age passes to a cell from the diagonal parents behind its face only where the cell's own surface
   * rises at least `ageJoin` √(g h) (`KennedyOptions.diagonalJoin`, as the Canyon's `CANYON.ageJoin`; 0: rule A, as the
   * training floor runs). Measured (pool-barrel, 2026-11-01): under rule A the aged threshold ran from the tip's focus
   * along the crest at 6–20 m/s, so the inner arm broke at 2.0–2.2 m under 1.3 m crests (H/h about 0.6) and the line
   * stalled for 3–7 s around x 34–38 where the tip's focus faded and the natural break took over; gated, each part of the
   * crest breaks at its own threshold, as in nature (Dally 1990; Goda 1992's sideways spread, 0–C_b; the advisor).
   */
  ageJoin: 0.5,
  /** Where riders wait, x, m: on the right arm's plunging section (the training's `POOL.takeOffX` unless measured otherwise). */
  takeOffX: 27,
  /**
   * Where riders start, m seaward (along −z) of the take-off: 6, not the other spots' 11 (`RIDE_LINEUP_OFFSET`). The face
   * along +z at x 27 is 1:26, so 11 m out is only 0.4 m deeper, and the headless riders there were left on the crest by
   * most 1.8 m waves (0–2 of 12 rides against 3–6 of 12 from 4–8 m out; the catch probe, pool-barrel 2026-11-01).
   */
  startOut: 6,
  /** How far seaward of the training terrace's edge (`poolTerraceZ`) the platform begins, m: room for the knee near the tip. */
  platformLead: 20,
};

/** Where the barrel floor's platform begins, z, m: the ramp below it, the platform shoreward of it. */
export function poolBarrelPlatformZ(): number {
  return poolTerraceZ() - POOL_BARREL.platformLead;
}

/** The barrel floor's ramp, from the machine's floor at the training ramp's foot to the platform at the terrace's edge, m deep. */
function barrelRamp(z: number): number {
  const p = POOL;
  const foot = poolRampFootZ();
  const edge = poolBarrelPlatformZ();
  if (z <= foot) return p.feedDepth;
  return POOL_BARREL.platformDepth + ((edge - z) * (p.feedDepth - POOL_BARREL.platformDepth)) / (edge - foot);
}

/**
 * The barrel face's depth `seaward` m out from its crest square to the crest line: the face at `gradient` from `crest`
 * down to the platform, its knee rounded by a parabola tangent to both over ±`kneeRounding` m (never wider than the face).
 */
function barrelFace(crest: number, gradient: number, seaward: number): number {
  const b = POOL_BARREL;
  const knee = (b.platformDepth - crest) / gradient;
  const half = Math.min(b.kneeRounding, knee);
  if (seaward <= knee - half) return crest + seaward * gradient;
  if (seaward >= knee + half) return b.platformDepth;
  const left = knee + half - seaward;
  return b.platformDepth - (gradient * left * left) / (4 * half);
}

/** How far each barrel arm has backed off into the platform at along-shore position x: 0 on its barrel section, 1 past its taper. */
export function poolBarrelTaper(x: number): number {
  return ease(POOL_BARREL.armLength, POOL_BARREL.armLength + POOL_BARREL.taperWidth, Math.abs(x));
}

/** The barrel floor's face gradient square to the crest line at along-shore position x: `tipGradient` at the tip, `gradient` from |x| `tipEase`. */
export function poolBarrelGradient(x: number): number {
  const b = POOL_BARREL;
  return b.tipGradient + (b.gradient - b.tipGradient) * ease(0, b.tipEase, Math.abs(x));
}

/** The barrel floor's crest depth at along-shore position x, m: easing from the tip's to the arm's, then backing off to the platform. */
export function poolBarrelCrestDepth(x: number): number {
  const b = POOL_BARREL;
  const u = Math.abs(x);
  const along = Math.min(1, Math.max(0, (u - b.crestEase) / (b.armLength - b.crestEase)));
  const arm = b.crestDepth + (b.armCrestDepth - b.crestDepth) * ease(0, b.crestEase, u) + (b.outerCrestDepth - b.armCrestDepth) * along;
  return arm + (b.platformDepth - arm) * poolBarrelTaper(x);
}

/** The Barrel mode's still depth below datum at (x, z), m; negative on the deck (`POOL_BARREL`). */
export function poolBarrelDepth(x: number, z: number): number {
  const p = POOL;
  const b = POOL_BARREL;
  const beach = Math.max(-p.deck, -z * p.shoreSlope);
  // Seaward of the terrace's edge, the ramp alone, square to the crests: no ridges run on (the advisor, 2026-11-01).
  if (z < poolBarrelPlatformZ()) return Math.min(barrelRamp(z), beach);
  const crest = poolBarrelCrestDepth(x);
  const crestLine = poolCrestZ(x, b);
  const normal = poolNormalShare(x, b);
  let reef: number;
  if (z <= crestLine) reef = barrelFace(crest, poolBarrelGradient(x), (crestLine - z) * normal);
  else {
    // The top, square to the crest line, then the lagoon's inner slope down to the lagoon (the platform past the taper).
    const lagoon = b.lagoonDepth + (b.platformDepth - b.lagoonDepth) * poolBarrelTaper(x);
    const inside = Math.max(0, (z - crestLine) * normal - b.flatWidth);
    reef = Math.min(lagoon, crest + inside * b.lagoonSlope);
  }
  return Math.min(reef, beach);
}

/** The Barrel mode's two sizes, as faces at the break, m (decision Q6): a crouched rider fits from 1.5 m, the smallest. */
export const POOL_BARREL_FACES = { small: 1.5, big: 1.8 } as const;
export type PoolBarrelSize = keyof typeof POOL_BARREL_FACES;

/** The wave height the machine makes at the tank's edge for each Barrel size, m: set so the surf meter reads its face (the size probe). */
export const POOL_BARREL_EDGE_HEIGHT: Record<PoolBarrelSize, number> = { small: 0.99, big: 1.24 };

/**
 * Where the machine's wave starts breaking at the barrel's take-off, m deep for a wave H m high at the feed: the frame
 * probe's first breaks at x 26–28 (pool-barrel, 2026-11-01) were 1.36 and 1.90 m deep for H 0.99 and 1.24 (1.5 and 1.8 m
 * faces), a line through the two (the bigger wave breaks further down the face, on its steeper ray).
 */
export const POOL_BARREL_BREAK_DEPTH = { base: -0.78, perMetre: 2.16 } as const;

/** How deep the pool's wave of height H at the feed first breaks at the barrel's take-off, m. */
export function poolBarrelBreakDepth(height: number): number {
  return POOL_BARREL_BREAK_DEPTH.base + POOL_BARREL_BREAK_DEPTH.perMetre * height;
}

/** The arm the barrel's peel is measured on: the right one (riders wait there), out to where its back-off ends. */
export function poolBarrelRiddenAt(x: number): boolean {
  return x >= 0 && x <= POOL_BARREL.armLength + POOL_BARREL.taperWidth;
}

/**
 * The Barrel mode's layouts (pool-barrel-straight, 2026-11-01): 'straight', the default, one straight reef the machine's
 * oblique wave peels along from the +x end (`POOL_STRAIGHT`); 'aframe', step 1's mirrored A-frame (`POOL_BARREL`), kept
 * for A/B (`?poolBarrel=aframe`).
 */
export type PoolBarrelLayout = 'straight' | 'aframe';

/** The pool's floors: the training A-frame, the Barrel's straight reef, the Barrel's A-frame. */
export type PoolFloor = 'training' | PoolBarrelLayout;

/** Which floor a sea runs: Training unless its waves are the Barrel's; then the straight reef unless the A-frame is asked for. */
export function poolFloorOf(config: { poolWaves?: PoolWaves; poolBarrel?: PoolBarrelLayout }): PoolFloor {
  if (config.poolWaves !== 'barrel') return 'training';
  return config.poolBarrel === 'aframe' ? 'aframe' : 'straight';
}

/**
 * The Barrel mode's straight floor (docs/research/pool-barrel-straight-2026-11-01; the water-physics advisor's layout,
 * 2026-11-01): the owner's "straight, starting from right to left", a right-hander from the +x end along one reef, its
 * crests straight lines from the machine to the beach. As in real pools, straight peeling crests come from angling the
 * generated wave onto a straight reef, not from refraction over a V. Under the same machine (its 9 m feed, zone, ramp foot):
 * - **the machine's regular wave travels obliquely** toward −x (`side` +1), so the crest's +x end leads. The window's sides
 *   wrap (`periodicWaves` n > 0): the wave's direction is the one whose along-shore wavenumber is 2πn / W at the feed (kx is
 *   conserved by Snell over a bed uniform along x), so an oblique regular wave crosses the walls exactly, with no shadow
 *   from the zone's upwave corner and no reflection off the downwave wall. n 2: about 39° at the feed and 27–30° on the
 *   platform. (Open sides, n 0, shade the reef's start and reflect at −x; the side feed's linear transform is out of range on
 *   the 1:8.6 ramp and the 1:8 beach, and lagged Padang's crests 15–28 m.)
 * - **a level platform** `platformDepth` deep from `platformLead` m seaward of the training terrace's edge (step 1: at 3.25 m
 *   the waves broke at the knee);
 * - **one straight reef** at `reefAngle`° to x, seaward at its +x start (`startX`, `startZ`), so the crest meets it at
 *   θ_p + φ ≈ 68–70°, the A-frame arm's angle, and peels along it at c_p / sin(θ_p + φ), about 7 m/s (a reef parallel to the
 *   machine could not peel slower than the feed's celerity, 8.8 m/s, α_b about 32°: pros only). Square to its line: a face
 *   at `gradient` from the knee (rounded ±`kneeRounding` m) to the crest; the crest's depth along the reef (s from the start,
 *   `crestProfile`: rising from the platform over 30 m, the take-off section easing to the barrel's crest, the barrel, a
 *   back-off and the fade back to the platform); a top `flatWidth` m across; behind it a slope `backSlope` straight back
 *   down to the platform (no shallow lagoon: the bed stays periodic, the return flow slow, and the bores re-break on the
 *   beach);
 * - the beach face and deck as the training floor's; the columns at the walls are the plain ramp, platform and beach.
 * `side` −1 mirrors it into a left-hander (x → −x). Mutable for the probes.
 */
export const POOL_STRAIGHT = {
  side: 1,
  /** Along-shore wavelengths of the machine's wave in the window (its sides wrap); 0: open sides at `direction`°. */
  periodicWaves: 2,
  direction: 39,
  platformDepth: 4.5,
  platformLead: 20,
  /** The reef's start (s = 0): where its crest line leaves the platform, x and z, m (before mirroring). */
  startX: 115,
  startZ: -221,
  reefAngle: 40,
  gradient: 1 / 9.5,
  kneeRounding: 3,
  /** The crest's depth along the reef: [s, depth] knots, m, eased between (smoothstep), the platform's depth beyond. */
  crestProfile: [[0, 4.5], [30, 1.6], [65, 0.9], [175, 0.9], [205, 2.0], [235, 4.5]] as [number, number][],
  flatWidth: 6,
  backSlope: 1 / 10,
  /**
   * Where riders wait: s along the reef, m (the advisor's, where the white has come down the start's convex end); and how
   * far seaward of the take-off they start, m, by size (the catch probe's best: 18 m at 1.5 m faces, 13.5 m at 1.8 m; the
   * face along +z there is 1:12.4, so nearer starts sit barely deeper than the break), eased between on the sea's Hs.
   */
  takeOffS: 40,
  startOut: { small: 18, big: 13.5 },
  /** The breaking age's gate along the crests (as the A-frame Barrel's and the Canyon's): the reef's start is a convex end. */
  ageJoin: 0.5,
  /**
   * A land barrier on the wrap column, `wrapWallWidth` m wide, from the beach out to z `wrapWallFrom` (0: none, the
   * default): the walled pool's own side wall where the bores and currents are, which stops the along-shore current the
   * wrap lets circulate behind the reef (the advisor's fix). Measured at 1.8 m over 600 s with 2 m: the current stays
   * under 0.15 m/s, but the line ends sooner (median u 136 against 152) and the fastest water reaches 11 m/s, so it is
   * off (the owner's call; docs/research/pool-barrel-straight-2026-11-01).
   */
  wrapWallWidth: 0,
  wrapWallFrom: -150,
};

/** Where the straight floor's platform begins, z, m. */
export function poolStraightPlatformZ(): number {
  return poolTerraceZ() - POOL_STRAIGHT.platformLead;
}

/** The straight reef's along (s, from its start) and seaward (n, square to its line) distances at (x, z), m. */
export function poolStraightFrame(x: number, z: number): { s: number; n: number } {
  const r = POOL_STRAIGHT;
  const phi = (r.reefAngle * Math.PI) / 180;
  const dx = r.side * x - r.startX;
  const dz = z - r.startZ;
  // Along the reef: toward −x (mirrored) and shoreward; seaward: square to it, toward −z.
  return { s: -dx * Math.cos(phi) + dz * Math.sin(phi), n: -dx * Math.sin(phi) - dz * Math.cos(phi) };
}

/** The point on the straight reef's crest line s m from its start, (x, z), m. */
export function poolStraightAt(s: number): { x: number; z: number } {
  const r = POOL_STRAIGHT;
  const phi = (r.reefAngle * Math.PI) / 180;
  return { x: r.side * (r.startX - s * Math.cos(phi)), z: r.startZ + s * Math.sin(phi) };
}

/** The straight reef's crest depth s m along it, m: `crestProfile`'s knots eased, the platform's depth beyond them. */
export function poolStraightCrestDepth(s: number): number {
  const knots = POOL_STRAIGHT.crestProfile;
  if (s <= knots[0][0] || s >= knots[knots.length - 1][0]) return POOL_STRAIGHT.platformDepth;
  let k = 1;
  while (s > knots[k][0]) k += 1;
  const [s0, d0] = knots[k - 1];
  const [s1, d1] = knots[k];
  return d0 + (d1 - d0) * ease(s0, s1, s);
}

/** The Barrel mode's straight floor's still depth below datum at (x, z), m; negative on the deck (`POOL_STRAIGHT`). */
export function poolStraightDepth(x: number, z: number): number {
  const p = POOL;
  const r = POOL_STRAIGHT;
  const beach = Math.max(-p.deck, -z * p.shoreSlope);
  const edge = poolStraightPlatformZ();
  if (z < edge) {
    // The ramp square to the tank, from the machine's floor at the training ramp's foot up to the platform.
    const foot = poolRampFootZ();
    const ramp = z <= foot ? p.feedDepth : r.platformDepth + ((edge - z) * (p.feedDepth - r.platformDepth)) / (edge - foot);
    return Math.min(ramp, beach);
  }
  // The wrap's land barrier (none by default): the deck, from the beach out to `wrapWallFrom`.
  if (r.wrapWallWidth > 0 && z > r.wrapWallFrom && Math.abs(x) >= p.alongShore / 2 - r.wrapWallWidth / 2) return -p.deck;
  const { s, n } = poolStraightFrame(x, z);
  const crest = poolStraightCrestDepth(s);
  let reef: number;
  if (n >= 0) {
    // The face square to the crest line, from the crest down to the platform, its knee rounded.
    const knee = (r.platformDepth - crest) / r.gradient;
    const half = Math.min(r.kneeRounding, knee);
    if (n <= knee - half) reef = crest + n * r.gradient;
    else if (n >= knee + half) reef = r.platformDepth;
    else {
      const left = knee + half - n;
      reef = r.platformDepth - (r.gradient * left * left) / (4 * half);
    }
  } else {
    // The top, then straight back down to the platform.
    reef = Math.min(r.platformDepth, crest + Math.max(0, -n - r.flatWidth) * r.backSlope);
  }
  return Math.min(reef, beach);
}

/** The machine's wave height at the tank's edge for each Barrel size on the straight floor, m (the size probe). */
export const POOL_STRAIGHT_EDGE_HEIGHT: Record<PoolBarrelSize, number> = { small: 1.05, big: 1.32 };

/**
 * Where the machine's wave first breaks at the straight floor's take-off, m deep for a wave H m high at the feed: the frame
 * probe's first breaks at s 40–50 (x 78–84) were 1.52 and 1.91 m deep for H 1.05 and 1.32 (1.5 and 1.8 m faces).
 */
export const POOL_STRAIGHT_BREAK_DEPTH = { base: 0.01, perMetre: 1.44 } as const;

/** How far seaward of the straight floor's take-off riders start for a machine wave H m high at the feed, m (`startOut`). */
export function poolStraightStartOut(height: number): number {
  const { small, big } = POOL_STRAIGHT.startOut;
  const t = Math.min(1, Math.max(0, (height - POOL_STRAIGHT_EDGE_HEIGHT.small) / (POOL_STRAIGHT_EDGE_HEIGHT.big - POOL_STRAIGHT_EDGE_HEIGHT.small)));
  return small + (big - small) * t;
}

/** How deep the pool's wave of height H at the feed first breaks at the straight floor's take-off, m. */
export function poolStraightBreakDepth(height: number): number {
  return POOL_STRAIGHT_BREAK_DEPTH.base + POOL_STRAIGHT_BREAK_DEPTH.perMetre * height;
}

/** The straight reef the peel is measured on: its columns from its start to its end. */
export function poolStraightRiddenAt(x: number): boolean {
  const knots = POOL_STRAIGHT.crestProfile;
  const start = poolStraightAt(knots[0][0]).x;
  const end = poolStraightAt(knots[knots.length - 1][0]).x;
  return x <= Math.max(start, end) && x >= Math.min(start, end);
}

/**
 * The machine's wave direction on the straight floor, rad from +z (toward −x for `side` +1): `direction`°, or with wrapped
 * sides the one whose along-shore wavenumber k sin θ is 2π n / W at the feed (`waveNumber`, the solver's k there).
 */
export function poolStraightDirection(waveNumber: number, alongShore = POOL.alongShore): number {
  const s = POOL_STRAIGHT;
  const theta = s.periodicWaves > 0 ? Math.asin(Math.min(1, (2 * Math.PI * s.periodicWaves) / (alongShore * waveNumber))) : (s.direction * Math.PI) / 180;
  return -s.side * theta;
}

/** The pool's bed for its floor: the training A-frame (the default), the Barrel's straight reef or its A-frame. */
export function poolSpot(waves: PoolWaves = 'training', barrel?: PoolBarrelLayout): SurfSpot {
  const floor = poolFloorOf({ poolWaves: waves, poolBarrel: barrel });
  return { name: 'pool', depthAt: floor === 'training' ? poolDepth : floor === 'aframe' ? poolBarrelDepth : poolStraightDepth };
}

/**
 * The machine's sea: one regular wave of height H = Hs/√2 at the edge, every POOL.period s, square to the tank
 * (`direction` 0, the training and A-frame floors) or oblique (the straight floor's, rad from +z).
 * Every wave is the same one, so the pool needs no seed.
 */
export function poolSea(significantHeight: number, depth: number, waveNumberAt: WaveNumberFunction, direction = 0): SeaState {
  const height = significantHeight / Math.SQRT2;
  return new SeaState([{ amplitude: height / 2, omega: (2 * Math.PI) / POOL.period, direction, phase: 0 }], depth, waveNumberAt);
}

/** The machine's relaxation zone is this many wavelengths at its floor long: 1.5–2 absorb a 10 s wave (the advisor). */
const POOL_ZONE_WAVELENGTHS = 1.75;

/**
 * The pool's tank across shore, m (a TankLayout without its edge depth): the relaxation zone over the machine's
 * floor ending just seaward of the ramp, the fine grid from just seaward of the terrace to the shore.
 */
export function poolTankLayout(shore: number, floor: PoolFloor | PoolWaves = 'training'): { offshore: number; zoneInner: number; blendEnd: number; fineFrom: number; shore: number } {
  const zoneInner = poolRampFootZ() - 10;
  const zone = POOL_ZONE_WAVELENGTHS * waveKinematics(POOL.period, POOL.feedDepth).wavelength;
  // The Barrel floors' platforms begin seaward of the terrace's edge: their 1 m cells from 10 m seaward of it, as the terrace's.
  // ('barrel' alone is the A-frame's, as step 1 called it.)
  const platform = floor === 'straight' ? poolStraightPlatformZ() : floor === 'aframe' || floor === 'barrel' ? poolBarrelPlatformZ() : poolTerraceZ();
  const fineFrom = Math.min(poolTerraceZ(), platform) - 10;
  return { offshore: zoneInner - zone, zoneInner, blendEnd: zoneInner + 10, fineFrom, shore };
}
