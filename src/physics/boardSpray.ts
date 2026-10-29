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
/** Floats per packed sheet (`packBoardSheets`): x, y, z, alongX, alongZ, length, vx, vy, vz, flux, spread, fall, mist. */
export const BOARD_SHEET_STRIDE = 13;
const WATER_DENSITY = 1025;
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
  return { x: 0, y: 0, z: 0, alongX: 0, alongZ: 0, length: 0, vx: 0, vy: 0, vz: 0, flux: 0, spread: 0, fall: 7, mist: 0.05 };
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
    sea: new Float64Array(n), axisX: new Float64Array(3), axisY: new Float64Array(3), axisZ: new Float64Array(3), lift: 0,
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
  fall: number; mist: number;
  first: number; last: number;
}
const sums: [SideSum, SideSum] = [createSum(), createSum()];
function createSum(): SideSum {
  return { flux: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, fall: 0, mist: 0, first: Infinity, last: -Infinity };
}
function clear(sum: SideSum): void {
  sum.flux = 0; sum.x = 0; sum.y = 0; sum.z = 0; sum.vx = 0; sum.vy = 0; sum.vz = 0; sum.fall = 0; sum.mist = 0;
  sum.first = Infinity; sum.last = -Infinity;
}
/** Add `flux` kg/s leaving at (x, y, z) (world), `along` m along the board, at (vx, vy, vz) over the ground. */
function add(sum: SideSum, flux: number, x: number, y: number, z: number, along: number, vx: number, vy: number, vz: number): void {
  if (!(flux > 0)) return;
  const drops = sheetDrops(Math.hypot(vx, vy, vz));
  sum.flux += flux;
  sum.x += flux * x; sum.y += flux * y; sum.z += flux * z;
  sum.vx += flux * vx; sum.vy += flux * vy; sum.vz += flux * vz;
  sum.fall += flux * drops.fall; sum.mist += flux * drops.mist;
  sum.first = Math.min(sum.first, along);
  sum.last = Math.max(sum.last, along);
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
    add(sums[side > 0 ? 1 : 0], flux, wx, surface + LIFT_OFF, wz, exitAlong,
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
      add(sums[rail > 0 ? 1 : 0], flux / 2, wx, surface + LIFT_OFF, wz, station.z,
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
    sheet.x = sum.x / sum.flux - sheet.alongX * span * 0.5;
    sheet.y = sum.y / sum.flux;
    sheet.z = sum.z / sum.flux - sheet.alongZ * span * 0.5;
    sheet.length = span;
    sheet.vx = sum.vx / sum.flux;
    sheet.vy = sum.vy / sum.flux;
    sheet.vz = sum.vz / sum.flux;
    sheet.flux = sum.flux;
    sheet.spread = SHEET_SPREAD * Math.hypot(sheet.vx, sheet.vy, sheet.vz);
    sheet.fall = sum.fall / sum.flux;
    sheet.mist = sum.mist / sum.flux;
  }
  return count;
}

/** `sheets` packed for a message (`BOARD_SHEET_STRIDE` floats each). */
export function packBoardSheets(sheets: readonly BoardSpraySheet[], out = new Float32Array(sheets.length * BOARD_SHEET_STRIDE)): Float32Array {
  sheets.forEach((sheet, n) => {
    out.set([
      sheet.x, sheet.y, sheet.z, sheet.alongX, sheet.alongZ, sheet.length, sheet.vx, sheet.vy, sheet.vz, sheet.flux, sheet.spread,
      sheet.fall, sheet.mist,
    ], n * BOARD_SHEET_STRIDE);
  });
  return out;
}

/** Packed sheets back (`packBoardSheets`). */
export function unpackBoardSheets(packed: ArrayLike<number>): BoardSpraySheet[] {
  const sheets: BoardSpraySheet[] = [];
  for (let o = 0; o + BOARD_SHEET_STRIDE <= packed.length; o += BOARD_SHEET_STRIDE) {
    sheets.push({
      x: packed[o], y: packed[o + 1], z: packed[o + 2], alongX: packed[o + 3], alongZ: packed[o + 4], length: packed[o + 5],
      vx: packed[o + 6], vy: packed[o + 7], vz: packed[o + 8], flux: packed[o + 9], spread: packed[o + 10],
      fall: packed[o + 11], mist: packed[o + 12],
    });
  }
  return sheets;
}
