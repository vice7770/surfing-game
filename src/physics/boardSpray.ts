import type { BoardSpraySheet } from '../wave/SprayCloud';
import type { BoardShape } from './boardShape';

/**
 * The spray a planing board throws (board-spray, 2026-10-29, after the water-physics advisor's ruling of that day):
 * drawn only, from the hull's own state. Nothing here changes the board, the rider, the water or the sound.
 *
 * Each cross-section of the hull (a station of patches across the beam) is a wedge entering the water, the 2D+t view of
 * a planing hull (Faltinsen 2005, ch. 9). Its bottom meets the water at W, the hull's speed into it along the bottom's
 * normal, and moves through it at V along its path f̂ in the bottom's plane. Across that path, toward the side the
 * bottom rises to (ŝ), the bottom stands at β_e to the surface; a banked board is half a V hull, its roll its dead-rise
 * (NACA TN 4187, Savitsky, Prowse & Lueders 1958), and drift (the tail skidding) turns the trim into it as well.
 * - **The jet (β_e over 15°):** where the waterline crosses the bottom, the water rises up it to a spray root at
 *   tan α = k(β) tan τ_e / tan β_e from the path (Savitsky 1964, with Zhao & Faltinsen 1993's pile-up k in place of
 *   Wagner's π/2; tan τ_e = W/V). Over the water it leaves at κ·2V sin α (κ 0.8, Savitsky & Breslin 1958's measured
 *   blisters) along sin α f̂ + cos α ŝ, 8° above the bottom's plane. Its water: Wagner's jet, k/(4 cos β)·ρ·W·D per
 *   metre of hull a second, D the low rail's depth (the jet δ = c tan²β / 2π at the root's speed). It runs over the dry
 *   bottom at 2α from the path and leaves at the high (outside) rail, or over the tail edge when it misses the rail.
 *   The low rail throws none: with thick rails at large roll the cross-flow does not separate there (TN 4187).
 * - **The flat board (β_e under 5°):** no jet but Savitsky & Breslin's side blister off both rails at the spray root
 *   (the foremost wetted station), sideways over the water at s(τ)·V and e(τ) up (`BLISTER`); its water from the
 *   momentum the hull turns, ṁ = L tan τ / 2V (L the hull's lift). Between 5° and 15° the two blend.
 * - **Drops:** 2–5 mm off carves, 1–3 mm off fast sheets (the air breaks anything over 12σ/(ρ_a U²); Aalbers & Hoving
 *   2019 for the jet-thickness limit): they fall at `fall` (Gunn & Kinzer 1949), and the mist share rises with the
 *   sheet's speed (inferred). Nothing is thrown backward over the water.
 */

/** Sheets a board throws at most: off each side. */
export const BOARD_SHEETS = 2;
/** The packed sheet's fields, in order (`packBoardSheets`). */
const SHEET_FIELDS = [
  'x', 'y', 'z', 'alongX', 'alongZ', 'length', 'vx', 'vy', 'vz', 'flux', 'spread', 'fall', 'mist', 'boardX', 'boardY', 'boardZ',
  'thickness', 'fan', 'breakup', 'onset', 'side', 'source', 'tearX', 'tearY', 'tearZ', 'tearAlongX', 'tearAlongZ', 'tearLength',
  'tearVX', 'tearVY', 'tearVZ', 'aftVX', 'aftVY', 'aftVZ', 'foreVX', 'foreVY', 'foreVZ', 'fluxMean',
] as const satisfies readonly (keyof BoardSpraySheet)[];
/** Floats per packed sheet (`packBoardSheets`): `SHEET_FIELDS`. */
export const BOARD_SHEET_STRIDE = SHEET_FIELDS.length;
/** Where each field sits in a packed sheet. */
export const SHEET_AT = Object.fromEntries(SHEET_FIELDS.map((name, k) => [name, k])) as Record<(typeof SHEET_FIELDS)[number], number>;
const WATER_DENSITY = 1025;
const GRAVITY = 9.81;
const DEGREE = Math.PI / 180;
/** The sheet's measured share of its potential-flow speed (Savitsky & Breslin 1958: 0.77–0.87 at β 20–30°). */
const KAPPA = 0.8;
/** The sheet leaves this far above the bottom's plane (the measured blisters: 6–12°). */
const LAUNCH_TILT = 8 * DEGREE;
/** Below FLAT the bottom throws the flat blister, over JET the jet; between, both blend. */
const FLAT = 5 * DEGREE;
const JET = 15 * DEGREE;
/** Spawned this far above the surface, m: a sheet heading down a face is not taken back at once. */
const LIFT_OFF = 0.04;
/** The drops' velocities spread this share of the sheet's either way (provisional). */
const SHEET_SPREAD = 0.15;
/** Zhao & Faltinsen 1993's pile-up k against the dead-rise (via Iafrati, Table 1; 50° extrapolated). */
const PILE_UP = { degrees: [0, 10, 20, 30, 40, 50], k: [Math.PI / 2, 1.56, 1.51, 1.42, 1.29, 1.2] } as const;
/**
 * Savitsky & Breslin 1958's flat-plate side blister against the trim, degrees: its sideways speed over the water as a
 * share of V, and its elevation, degrees (4° extrapolated by the advisor).
 */
const BLISTER = {
  trim: [4, 6, 8, 10, 12, 15], sideways: [0.25, 0.3, 0.37, 0.47, 0.52, 0.57], elevation: [47, 51, 47, 42, 44, 49],
} as const;

function interpolate(xs: readonly number[], ys: readonly number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i += 1) {
    if (x <= xs[i]) return ys[i - 1] + ((ys[i] - ys[i - 1]) * (x - xs[i - 1])) / (xs[i] - xs[i - 1]);
  }
  return ys[ys.length - 1];
}

function smoothstep(from: number, to: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** The pile-up k at dead-rise `beta`, rad. */
export function pileUp(beta: number): number {
  return interpolate(PILE_UP.degrees, PILE_UP.k, beta / DEGREE);
}

/**
 * The drops a sheet leaving at `speed` m/s breaks into: their fall speed, m/s (2–5 mm off slow carve sheets, 1–3 mm off
 * fast ones; Gunn & Kinzer), and the share drawn as mist (5 % to 5 m/s, rising to 22 % by 12 m/s; inferred).
 */
export function sheetDrops(speed: number): { fall: number; mist: number } {
  const fast = Math.min(1, Math.max(0, (speed - 5) / 7));
  return { fall: 7.5 - 2.25 * fast, mist: 0.05 + 0.17 * fast };
}

export function createBoardSpraySheet(): BoardSpraySheet {
  return {
    x: 0, y: 0, z: 0, alongX: 0, alongZ: 0, length: 0, vx: 0, vy: 0, vz: 0, flux: 0, spread: 0, fall: 7, mist: 0.05,
    boardX: 0, boardY: 0, boardZ: 0, thickness: 0, fan: 0, breakup: 0, onset: 0, side: 1, source: 0,
    tearX: 0, tearY: 0, tearZ: 0, tearAlongX: 0, tearAlongZ: 1, tearLength: 0, tearVX: 0, tearVY: 0, tearVZ: 0,
    aftVX: 0, aftVY: 0, aftVZ: 0, foreVX: 0, foreVY: 0, foreVZ: 0, fluxMean: 0.5,
  };
}

const AIR_DENSITY = 1.2;
const SURFACE_TENSION = 0.072;
const KINEMATIC_VISCOSITY = 1e-6;
/**
 * The curtain's clock (spray-sheet, 2026-10-30; the water-physics advisor's rulings of that day). The air's sinuous
 * waves (Squire 1953) grow on the sheet from the rail at n and tear it after N_t e-folds: t_b = N_t / n, N_t = 2.5
 * (provisional, to calibrate against footage; a smooth nozzle sheet needs 12–13, Clark & Dombrowski; Gaillard et al.
 * 2021), clamped to 12/n and `longest`. The turbulent wall jet's onset (Dai, Hsiang & Faeth 1997: roughness at
 * 0.061·D·Re_D^¼, D = 4h; first drops (x_i − x_r)/Λ = 18 800·We_Λ^−0.67, Λ = h/2) is not in series with it: the
 * bottom's boundary layer is 2.5–6 mm after the run, against cm-thick sheets, so the spray root's near-potential water
 * leaves the rail smooth; the onset is only when the sheet sheds its first drops, capped at the tear.
 */
export const CURTAIN_CLOCK = { foldings: 2.5, shortest: 0.01, longest: 0.3, thinnest: 0.001, jetShare: 0.5 } as const;

/**
 * Squire's growth rate of the sheet's sinuous waves, 1/s, for a sheet `thickness` m thick moving through the air at
 * `speed` m/s: ρ_a U² / √(2σρh) in the long-wave limit (ρ_a U² h/2σ under 27/16), 0.385 ρ_a^1.5 U³ / (σ√ρ) past it.
 */
export function squireGrowth(thickness: number, speed: number): number {
  const weber = (AIR_DENSITY * speed * speed * thickness) / (2 * SURFACE_TENSION);
  return weber < 27 / 16
    ? (AIR_DENSITY * speed * speed) / Math.sqrt(2 * SURFACE_TENSION * WATER_DENSITY * thickness)
    : (0.385 * AIR_DENSITY ** 1.5 * speed ** 3) / (SURFACE_TENSION * Math.sqrt(WATER_DENSITY));
}

/**
 * When the turbulent sheet sheds its first drops, s after it leaves the hull: Dai, Hsiang & Faeth's onset run, less what
 * it ran over the bottom (`run`, m), at `wallSpeed` m/s.
 */
export function curtainOnset(thickness: number, wallSpeed: number, run: number): number {
  if (!(thickness > 0) || !(wallSpeed > 0)) return 0;
  const d = 4 * thickness;
  const rough = 0.061 * d * ((wallSpeed * d) / KINEMATIC_VISCOSITY) ** 0.25;
  const half = thickness / 2;
  const weber = (WATER_DENSITY * wallSpeed * wallSpeed * half) / SURFACE_TENSION;
  const first = rough + half * 18_800 * weber ** -0.67;
  return Math.max(0, (first - run) / wallSpeed);
}

/**
 * The curtain a sheet leaves the hull as: `flux` kg/s off `width` m of rail, crossing it at `across` m/s relative to the
 * hull (normal to the root line), through the air at `airSpeed` m/s, having run `run` m over the bottom at `wallSpeed`
 * m/s, `jetShare` of it the jet's. Its thickness there, m (ṁ / ρ L |(U − U_hull)·n̂|: a line source, no 1/r thinning),
 * when it first sheds drops and when it tears, s (0: no curtain: drops at once). No curtain where it is the flat
 * blister's, under a millimetre, or tears within CURTAIN_CLOCK.shortest.
 */
export function sprayCurtain(
  flux: number, width: number, across: number, airSpeed: number, wallSpeed: number, run: number, jetShare: number,
): { thickness: number; onset: number; breakup: number } {
  const thickness = across > 0 && width > 0 ? flux / (WATER_DENSITY * across * width) : 0;
  if (!(thickness >= CURTAIN_CLOCK.thinnest) || !(airSpeed > 0.5) || jetShare < CURTAIN_CLOCK.jetShare) return { thickness, onset: 0, breakup: 0 };
  const growth = squireGrowth(thickness, airSpeed);
  const onset = curtainOnset(thickness, wallSpeed, run);
  const breakup = Math.min(CURTAIN_CLOCK.foldings / growth, CURTAIN_CLOCK.longest);
  return breakup < CURTAIN_CLOCK.shortest ? { thickness, onset: 0, breakup: 0 } : { thickness, onset: Math.min(onset, breakup), breakup };
}

/**
 * A hull's state for its spray: its patches station by station (`stations` × `lanes`, slot `i * lanes + j` the j-th
 * across, from −x to +x, of the i-th station from the tail), and per patch: its across and along place in the board's
 * frame, its width, its bottom centre (world), how deep it lies under the surface (m, negative above), the water's
 * velocity there and the hull's (world, m/s), and whether the water there is the sea's. The board's axes (world): across
 * (+x), up, and along (+z); the hull's lift, N (what the water holds up).
 */
export interface HullSprayState {
  stations: number;
  lanes: number;
  stationLength: number;
  width: ArrayLike<number>;
  across: ArrayLike<number>;
  along: ArrayLike<number>;
  point: ArrayLike<number>;
  depth: ArrayLike<number>;
  water: ArrayLike<number>;
  hull: ArrayLike<number>;
  sea: ArrayLike<number>;
  axisX: ArrayLike<number>;
  axisY: ArrayLike<number>;
  axisZ: ArrayLike<number>;
  lift: number;
  /** The wind over the water, m/s along +z (onshore): the sheet tears by its speed through the air. */
  wind: number;
}

/** A `HullSprayState` to fill: its arrays made for `stations` × `lanes` patches. */
export interface HullSprayBuffers extends HullSprayState {
  width: Float64Array;
  across: Float64Array;
  along: Float64Array;
  point: Float64Array;
  depth: Float64Array;
  water: Float64Array;
  hull: Float64Array;
  sea: Float64Array;
  axisX: Float64Array;
  axisY: Float64Array;
  axisZ: Float64Array;
}

export function createHullSprayBuffers(stations: number, lanes: number, stationLength: number): HullSprayBuffers {
  const n = stations * lanes;
  return {
    stations, lanes, stationLength, width: new Float64Array(n), across: new Float64Array(n), along: new Float64Array(n),
    point: new Float64Array(n * 3), depth: new Float64Array(n), water: new Float64Array(n * 3), hull: new Float64Array(n * 3),
    sea: new Float64Array(n), axisX: new Float64Array(3), axisY: new Float64Array(3), axisZ: new Float64Array(3), lift: 0, wind: 0,
  };
}

/**
 * A board shape's patches as `HullSprayState` orders them (station by station from the tail, −x to +x across each),
 * for a hull drawn from a pose (another player's board): each slot's bottom centre from the board's centre of mass in
 * the board's frame (x, y, z), and its width across, m.
 */
export interface HullSprayLayout {
  stations: number;
  lanes: number;
  stationLength: number;
  local: Float64Array;
  width: Float64Array;
}

export function hullSprayLayout(shape: BoardShape): HullSprayLayout {
  const byStation = new Map<number, number[]>();
  shape.patches.forEach((patch, k) => {
    const list = byStation.get(patch.position.z) ?? [];
    list.push(k);
    byStation.set(patch.position.z, list);
  });
  const stationsZ = [...byStation.keys()].sort((a, b) => a - b);
  const lanes = byStation.get(stationsZ[0])!.length;
  const stationLength = shape.patches[0].length;
  const local = new Float64Array(stationsZ.length * lanes * 3);
  const width = new Float64Array(stationsZ.length * lanes);
  const center = shape.centerOfMass;
  stationsZ.forEach((z, i) => {
    byStation.get(z)!.forEach((k, j) => {
      const o = i * lanes + j;
      const patch = shape.patches[k];
      local[o * 3] = patch.position.x - center.x;
      local[o * 3 + 1] = patch.position.y - center.y;
      local[o * 3 + 2] = patch.position.z - center.z;
      width[o] = patch.area / stationLength;
    });
  });
  return { stations: stationsZ.length, lanes, stationLength, local, width };
}

/** One side's sheet, summed over its sources, water-weighted. */
interface SideSum {
  flux: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  /** The hull's own velocity where it leaves (world, m/s), and the water's. */
  bx: number; by: number; bz: number;
  wx: number; wy: number; wz: number;
  /** How much of it is the jet's (not the flat blister's), and its run over the bottom, root to rail, water-weighted. */
  jet: number; run: number;
  fall: number; mist: number;
  /** Its exits' extent along the board (board frame, m), and their water-weighted sum. */
  first: number; last: number; along: number;
  /** For the launch's straight-line fit along the root (spray-rework): Σ f·a², and Σ f·a·v. */
  aa: number; avx: number; avy: number; avz: number;
}
const sums: [SideSum, SideSum] = [createSum(), createSum()];
function createSum(): SideSum {
  return {
    flux: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, bx: 0, by: 0, bz: 0, wx: 0, wy: 0, wz: 0, jet: 0, run: 0, fall: 0, mist: 0,
    first: Infinity, last: -Infinity, along: 0, aa: 0, avx: 0, avy: 0, avz: 0,
  };
}
function clear(sum: SideSum): void {
  sum.flux = 0; sum.x = 0; sum.y = 0; sum.z = 0; sum.vx = 0; sum.vy = 0; sum.vz = 0; sum.fall = 0; sum.mist = 0;
  sum.bx = 0; sum.by = 0; sum.bz = 0; sum.wx = 0; sum.wy = 0; sum.wz = 0; sum.jet = 0; sum.run = 0;
  sum.first = Infinity; sum.last = -Infinity; sum.along = 0;
  sum.aa = 0; sum.avx = 0; sum.avy = 0; sum.avz = 0;
}
/**
 * Add `flux` kg/s leaving patch `at` of `hull` at (x, y, z) (world), `along` m along the board, at (vx, vy, vz) over the
 * ground.
 */
function add(sum: SideSum, hull: HullSprayState, at: number, flux: number, x: number, y: number, z: number, along: number, vx: number, vy: number, vz: number): void {
  if (!(flux > 0)) return;
  sum.bx += flux * hull.hull[at * 3]; sum.by += flux * hull.hull[at * 3 + 1]; sum.bz += flux * hull.hull[at * 3 + 2];
  sum.wx += flux * hull.water[at * 3]; sum.wy += flux * hull.water[at * 3 + 1]; sum.wz += flux * hull.water[at * 3 + 2];
  const drops = sheetDrops(Math.hypot(vx, vy, vz));
  sum.flux += flux;
  sum.x += flux * x; sum.y += flux * y; sum.z += flux * z;
  sum.vx += flux * vx; sum.vy += flux * vy; sum.vz += flux * vz;
  sum.fall += flux * drops.fall; sum.mist += flux * drops.mist;
  sum.first = Math.min(sum.first, along);
  sum.last = Math.max(sum.last, along);
  sum.along += flux * along;
  sum.aa += flux * along * along;
  sum.avx += flux * along * vx; sum.avy += flux * along * vy; sum.avz += flux * along * vz;
}

/** A station's reading: its wetted patches' mean speed into the water and its path through it (world), and its depth line. */
interface Station {
  wet: number;
  into: number;
  px: number; py: number; pz: number;
  /** Depth across the beam: D(x) = depth0 + slope·x, m (x in the board's frame). */
  depth0: number;
  slope: number;
  half: number;
  z: number;
}
const station: Station = { wet: 0, into: 0, px: 0, py: 0, pz: 0, depth0: 0, slope: 0, half: 0, z: 0 };

function readStation(hull: HullSprayState, i: number, out: Station): void {
  const { lanes, width, across, along, depth, water, hull: velocity, sea, axisY } = hull;
  const nx = -axisY[0];
  const ny = -axisY[1];
  const nz = -axisY[2];
  let sumX = 0; let sumD = 0; let sumXX = 0; let sumXD = 0; let beam = 0;
  out.wet = 0; out.into = 0; out.px = 0; out.py = 0; out.pz = 0; out.z = along[i * lanes];
  for (let j = 0; j < lanes; j += 1) {
    const k = i * lanes + j;
    const x = across[k];
    const d = depth[k];
    sumX += x; sumD += d; sumXX += x * x; sumXD += x * d;
    beam += width[k];
    if (!(d > 0) || !(sea[k] > 0)) continue;
    out.wet += 1;
    const ux = velocity[k * 3] - water[k * 3];
    const uy = velocity[k * 3 + 1] - water[k * 3 + 1];
    const uz = velocity[k * 3 + 2] - water[k * 3 + 2];
    const normal = ux * nx + uy * ny + uz * nz;
    out.into += Math.max(0, normal);
    out.px += ux - normal * nx; out.py += uy - normal * ny; out.pz += uz - normal * nz;
  }
  const spread = lanes * sumXX - sumX * sumX;
  out.slope = spread > 0 ? (lanes * sumXD - sumX * sumD) / spread : 0;
  out.depth0 = (sumD - out.slope * sumX) / lanes;
  out.half = beam / 2;
  if (out.wet === 0) return;
  out.into /= out.wet;
  out.px /= out.wet; out.py /= out.wet; out.pz /= out.wet;
}

/**
 * The sheets a hull throws now (`HullSprayState`), into `out`: how many. One a side that throws any, its root the
 * stations it leaves from, its water summed and its launch velocity (over the ground) the water-weighted mean.
 */
export function hullSpraySheets(hull: HullSprayState, out: BoardSpraySheet[]): number {
  const { stations, lanes, stationLength, across, point, depth, water, axisX, axisY, axisZ } = hull;
  clear(sums[0]);
  clear(sums[1]);
  // The bottom's depth along the board (the trim's slope against the surface, dD/dz), over the stations' centre lines.
  let sz = 0; let sd = 0; let szz = 0; let szd = 0;
  for (let i = 0; i < stations; i += 1) {
    readStation(hull, i, station);
    sz += station.z; sd += station.depth0; szz += station.z * station.z; szd += station.z * station.depth0;
  }
  const lengthwise = stations * szz - sz * sz > 0 ? (stations * szd - sz * sd) / (stations * szz - sz * sz) : 0;
  const tail = hull.along[0] - stationLength / 2;
  let blend = 0;
  let wetStations = 0;
  let front = -1;
  for (let i = 0; i < stations; i += 1) {
    readStation(hull, i, station);
    if (station.wet === 0) continue;
    const speed = Math.hypot(station.px, station.py, station.pz);
    if (!(speed > 0.5) || !(station.into > 0)) continue;
    front = i;
    // The path in the bottom's plane (board frame) and across it, toward the side the bottom rises to.
    const fx = (station.px * axisX[0] + station.py * axisX[1] + station.pz * axisX[2]) / speed;
    const fz = (station.px * axisZ[0] + station.py * axisZ[1] + station.pz * axisZ[2]) / speed;
    let sx = -fz;
    let szAcross = fx;
    if (station.slope * sx + lengthwise * szAcross > 0) { sx = -sx; szAcross = -szAcross; }
    const beta = Math.atan(Math.abs(station.slope * sx + lengthwise * szAcross));
    const weight = smoothstep(FLAT, JET, beta);
    wetStations += 1;
    blend += weight;
    // The jet: only where the waterline crosses the bottom, the low rail under water and the high one out of it.
    const side = sx >= 0 ? 1 : -1;
    const low = station.depth0 - side * station.slope * station.half;
    const high = station.depth0 + side * station.slope * station.half;
    if (!(weight > 0) || !(low > 0) || !(high < 0)) continue;
    const k = pileUp(beta);
    const tanTau = station.into / speed;
    const alpha = Math.atan2(k * tanTau, Math.tan(beta));
    const flux = (k / (4 * Math.cos(beta))) * WATER_DENSITY * station.into * low * stationLength * weight;
    // Over the water: κ·2V sin α along sin α f̂ + cos α ŝ, tilted up off the bottom's plane.
    const launch = KAPPA * 2 * speed * Math.sin(alpha);
    const ax = Math.sin(alpha) * fx + Math.cos(alpha) * sx;
    const az = Math.sin(alpha) * fz + Math.cos(alpha) * szAcross;
    let dx = ax * axisX[0] + az * axisZ[0];
    let dy = ax * axisX[1] + az * axisZ[1];
    let dz = ax * axisX[2] + az * axisZ[2];
    const tilt = Math.tan(LAUNCH_TILT);
    dx += tilt * axisY[0]; dy += tilt * axisY[1]; dz += tilt * axisY[2];
    const norm = Math.hypot(dx, dy, dz) || 1;
    // Where it leaves: from the root (the waterline) over the dry bottom at 2α from the path, at the high rail, or over the tail.
    const root = -station.depth0 / station.slope;
    const reach = Math.abs(side * station.half - root);
    const back = reach / Math.max(1e-3, Math.tan(2 * alpha));
    let exitAcross = side * station.half;
    let exitAlong = station.z - back;
    if (exitAlong < tail) {
      exitAcross = root + side * (station.z - tail) * Math.tan(2 * alpha);
      exitAlong = tail;
    }
    const at = i * lanes + (side > 0 ? lanes - 1 : 0);
    const wx = point[at * 3] + axisX[0] * (exitAcross - across[at]) + axisZ[0] * (exitAlong - station.z);
    const wz = point[at * 3 + 2] + axisX[2] * (exitAcross - across[at]) + axisZ[2] * (exitAlong - station.z);
    const surface = point[at * 3 + 1] + depth[at];
    const sum = sums[side > 0 ? 1 : 0];
    sum.jet += flux;
    // Its run over the dry bottom, root to where it leaves: at 2α from the path (the spray-sheet's turbulent onset).
    sum.run += flux * Math.hypot(exitAcross - root, station.z - exitAlong);
    add(sum, hull, at, flux, wx, surface + LIFT_OFF, wz, exitAlong,
      water[at * 3] + (launch * dx) / norm, water[at * 3 + 1] + (launch * dy) / norm, water[at * 3 + 2] + (launch * dz) / norm);
  }
  // The flat board's side blister, off both rails at its spray root (the foremost wetted station), for the share of the
  // hull that is flat.
  const flatShare = wetStations > 0 ? 1 - blend / wetStations : 0;
  if (front >= 0 && flatShare > 0 && hull.lift > 0) {
    readStation(hull, front, station);
    const speed = Math.hypot(station.px, station.py, station.pz);
    const tanTau = station.into / speed;
    const trim = Math.atan(tanTau) / DEGREE;
    const flux = (hull.lift * tanTau) / (2 * speed) * flatShare;
    const sideways = interpolate(BLISTER.trim, BLISTER.sideways, trim) * speed;
    const elevation = interpolate(BLISTER.trim, BLISTER.elevation, trim) * DEGREE;
    // Off each rail, sideways over the water (across the path, outward), and up at the blister's elevation.
    const hx = station.px / speed;
    const hz = station.pz / speed;
    const flat = Math.hypot(hx, hz) || 1;
    for (const rail of [-1, 1]) {
      // The rail's outward direction (its side of the board, level), less its share along the path.
      let cx = rail * axisX[0];
      let cz = rail * axisX[2];
      const on = (cx * hx + cz * hz) / (flat * flat);
      cx -= on * hx;
      cz -= on * hz;
      const level = Math.hypot(cx, cz);
      if (!(level > 1e-6)) continue;
      cx /= level;
      cz /= level;
      const at = front * lanes + (rail > 0 ? lanes - 1 : 0);
      const edge = rail * station.half;
      const wx = point[at * 3] + axisX[0] * (edge - across[at]);
      const wz = point[at * 3 + 2] + axisX[2] * (edge - across[at]);
      const surface = point[at * 3 + 1] + depth[at];
      add(sums[rail > 0 ? 1 : 0], hull, at, flux / 2, wx, surface + LIFT_OFF, wz, station.z,
        water[at * 3] + cx * sideways, water[at * 3 + 1] + sideways * Math.tan(elevation), water[at * 3 + 2] + cz * sideways);
    }
  }
  let count = 0;
  const horizontal = Math.hypot(axisZ[0], axisZ[2]) || 1;
  for (const sum of sums) {
    if (!(sum.flux > 0) || count >= out.length) continue;
    const sheet = out[count];
    count += 1;
    const span = Math.max(stationLength, sum.last - sum.first);
    sheet.alongX = axisZ[0] / horizontal;
    sheet.alongZ = axisZ[2] / horizontal;
    // From its aftmost exit to its foremost (spray-sheet: not centred on its water's mean, which a heavy tail and a
    // light nose put past the tail), about a station either side of a lone one.
    const mean = sum.along / sum.flux;
    const back = span > stationLength ? mean - sum.first : stationLength * 0.5;
    sheet.x = sum.x / sum.flux - axisZ[0] * back;
    sheet.y = sum.y / sum.flux;
    sheet.z = sum.z / sum.flux - axisZ[2] * back;
    sheet.length = span;
    sheet.vx = sum.vx / sum.flux;
    sheet.vy = sum.vy / sum.flux;
    sheet.vz = sum.vz / sum.flux;
    sheet.flux = sum.flux;
    sheet.spread = SHEET_SPREAD * Math.hypot(sheet.vx, sheet.vy, sheet.vz);
    sheet.fall = sum.fall / sum.flux;
    sheet.mist = sum.mist / sum.flux;
    sheet.boardX = sum.bx / sum.flux;
    sheet.boardY = sum.by / sum.flux;
    sheet.boardZ = sum.bz / sum.flux;
    sheet.side = sum === sums[0] ? -1 : 1;
    // Its launch along the root (spray-rework): the water-weighted straight-line fit against the place along it, at
    // its two ends (the tail's stations, sweeping wider with the yaw, throw faster than the mean); a lone station's is
    // the mean.
    const spreadAlong = sum.aa / sum.flux - mean * mean;
    const fit = span > stationLength && spreadAlong > 1e-6;
    const slope = (moment: number, average: number) => (fit ? (moment / sum.flux - mean * average) / spreadAlong : 0);
    const sx = slope(sum.avx, sheet.vx);
    const sy = slope(sum.avy, sheet.vy);
    const sz = slope(sum.avz, sheet.vz);
    const aft = sum.first - mean;
    const fore = sum.last - mean;
    sheet.aftVX = sheet.vx + sx * aft; sheet.aftVY = sheet.vy + sy * aft; sheet.aftVZ = sheet.vz + sz * aft;
    sheet.foreVX = sheet.vx + sx * fore; sheet.foreVY = sheet.vy + sy * fore; sheet.foreVZ = sheet.vz + sz * fore;
    sheet.fluxMean = fit ? Math.min(1, Math.max(0, (mean - sum.first) / (sum.last - sum.first))) : 0.5;
    // The sheet itself (spray-sheet): how thick it leaves the hull, and when it sheds its first drops and tears.
    const rx = sheet.vx - sheet.boardX;
    const ry = sheet.vy - sheet.boardY;
    const rz = sheet.vz - sheet.boardZ;
    const onRoot = rx * sheet.alongX + rz * sheet.alongZ;
    const across = Math.sqrt(Math.max(0, rx * rx + ry * ry + rz * rz - onRoot * onRoot));
    const airSpeed = Math.hypot(sheet.vx, sheet.vy, sheet.vz - hull.wind);
    const curtain = sprayCurtain(sum.flux, span, across, airSpeed, Math.hypot(rx, ry, rz), sum.jet > 0 ? sum.run / sum.jet : 0, sum.jet / sum.flux);
    sheet.thickness = curtain.thickness;
    sheet.onset = curtain.onset;
    sheet.breakup = curtain.breakup;
    sheet.fan = 0;
    // Where it tears, as if the hull had held its course (the history's `tearOf` places it where the water went).
    placeTear(sheet, sheet.x, sheet.y, sheet.z, sheet.alongX, sheet.alongZ, sheet.length, rx, ry, rz, sheet.vx, sheet.vy, sheet.vz, sheet.breakup);
  }
  return count;
}

/** `sheets` packed for a message (`BOARD_SHEET_STRIDE` floats each). */
export function packBoardSheets(sheets: readonly BoardSpraySheet[], out: Float32Array<ArrayBufferLike> = new Float32Array(sheets.length * BOARD_SHEET_STRIDE)): Float32Array<ArrayBufferLike> {
  sheets.forEach((sheet, n) => {
    for (let k = 0; k < BOARD_SHEET_STRIDE; k += 1) out[n * BOARD_SHEET_STRIDE + k] = sheet[SHEET_FIELDS[k]];
  });
  return out;
}

/** Packed sheets back (`packBoardSheets`). */
export function unpackBoardSheets(packed: ArrayLike<number>): BoardSpraySheet[] {
  const sheets: BoardSpraySheet[] = [];
  for (let o = 0; o + BOARD_SHEET_STRIDE <= packed.length; o += BOARD_SHEET_STRIDE) {
    const sheet = createBoardSpraySheet();
    for (let k = 0; k < BOARD_SHEET_STRIDE; k += 1) sheet[SHEET_FIELDS[k]] = packed[o + k];
    sheets.push(sheet);
  }
  return sheets;
}

/**
 * Where a sheet tears (spray-sheet): its root line then (from (x, y, z), `length` m along (alongX, alongZ)) carried
 * `age` s at (carryX, carryY, carryZ) and pulled down by gravity since; and its water's velocity there, from (vx, vy, vz)
 * over the ground at the root.
 */
export function placeTear(
  sheet: BoardSpraySheet, x: number, y: number, z: number, alongX: number, alongZ: number, length: number,
  carryX: number, carryY: number, carryZ: number, vx: number, vy: number, vz: number, age: number,
): void {
  sheet.tearX = x + carryX * age;
  sheet.tearY = y + carryY * age - 0.5 * GRAVITY * age * age;
  sheet.tearZ = z + carryZ * age;
  sheet.tearAlongX = alongX;
  sheet.tearAlongZ = alongZ;
  sheet.tearLength = length;
  sheet.tearVX = vx;
  sheet.tearVY = vy - GRAVITY * age;
  sheet.tearVZ = vz;
}

/** One root line a sheet left from, and its water's velocity over the ground then. */
interface SheetRow {
  time: number;
  x: number; y: number; z: number;
  alongX: number; alongZ: number; length: number;
  vx: number; vy: number; vz: number;
}

/**
 * The root lines a sheet has left from lately (spray-sheet; the advisor: a turning board's curtain is the water it
 * launched from where it was, not the present sheet carried along rigidly): one a step, for `keep` s, by key (a board
 * and a side). `at` reads the row launched `age` s before `now`, between the two nearest.
 */
const ROW_FIELDS = ['x', 'y', 'z', 'alongX', 'alongZ', 'length', 'vx', 'vy', 'vz'] as const;

export class SheetHistory {
  private readonly rows = new Map<string, SheetRow[]>();

  constructor(private readonly keep = CURTAIN_CLOCK.longest + 0.05) {}

  push(key: string, time: number, sheet: BoardSpraySheet): void {
    let list = this.rows.get(key);
    if (!list) {
      list = [];
      this.rows.set(key, list);
    }
    const last = list.at(-1);
    if (last && time <= last.time) list.pop();
    list.push({
      time, x: sheet.x, y: sheet.y, z: sheet.z, alongX: sheet.alongX, alongZ: sheet.alongZ, length: sheet.length,
      vx: sheet.vx, vy: sheet.vy, vz: sheet.vz,
    });
  }

  /** A packed sheet's row (`packBoardSheets`, at `o`). */
  pushPacked(key: string, time: number, packed: ArrayLike<number>, o: number): void {
    const sheet = this.scratch;
    for (const name of ROW_FIELDS) sheet[name] = packed[o + SHEET_AT[name]];
    this.push(key, time, sheet);
  }

  private readonly scratch = createBoardSpraySheet();

  /** Forget rows older than `keep`, and boards' sides that threw nothing for `missing` s. */
  prune(now: number, missing: number): void {
    for (const [key, list] of this.rows) {
      if (!list.length || now - list[list.length - 1].time > missing) {
        this.rows.delete(key);
        continue;
      }
      while (list.length > 2 && now - list[1].time > this.keep) list.shift();
    }
  }

  /** How far back the rows of `key` go, s. */
  span(key: string, now: number): number {
    const list = this.rows.get(key);
    return list?.length ? now - list[0].time : 0;
  }

  /** The row launched `age` s before `now` (interpolated; the oldest one past the history), into `out`; false with none. */
  at(key: string, now: number, age: number, out: SheetRow): boolean {
    const list = this.rows.get(key);
    if (!list?.length) return false;
    const time = now - age;
    let b = list.length - 1;
    while (b > 0 && list[b - 1].time >= time) b -= 1;
    const later = list[b];
    const earlier = list[Math.max(0, b - 1)];
    const f = later.time > earlier.time ? Math.min(1, Math.max(0, (time - earlier.time) / (later.time - earlier.time))) : 1;
    out.x = earlier.x + (later.x - earlier.x) * f;
    out.y = earlier.y + (later.y - earlier.y) * f;
    out.z = earlier.z + (later.z - earlier.z) * f;
    out.alongX = earlier.alongX + (later.alongX - earlier.alongX) * f;
    out.alongZ = earlier.alongZ + (later.alongZ - earlier.alongZ) * f;
    out.length = earlier.length + (later.length - earlier.length) * f;
    out.vx = earlier.vx + (later.vx - earlier.vx) * f;
    out.vy = earlier.vy + (later.vy - earlier.vy) * f;
    out.vz = earlier.vz + (later.vz - earlier.vz) * f;
    out.time = time;
    return true;
  }

  /** Each sheet's tear placed where its water went (`placeTear` with the row it left from), `breakup` s ago. */
  tearOf(key: string, now: number, sheet: BoardSpraySheet): void {
    if (!(sheet.breakup > 0) || !this.at(key, now, sheet.breakup, this.row)) return;
    const age = Math.min(sheet.breakup, now - this.row.time);
    const row = this.row;
    placeTear(sheet, row.x, row.y, row.z, row.alongX, row.alongZ, row.length, row.vx, row.vy, row.vz, row.vx, row.vy, row.vz, age);
  }

  private readonly row: SheetRow = { time: 0, x: 0, y: 0, z: 0, alongX: 0, alongZ: 0, length: 0, vx: 0, vy: 0, vz: 0 };
}

export function createSheetRow(): SheetRow {
  return { time: 0, x: 0, y: 0, z: 0, alongX: 0, alongZ: 0, length: 0, vx: 0, vy: 0, vz: 0 };
}
