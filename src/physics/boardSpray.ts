import type { BoardSpraySheet } from '../wave/SprayCloud';
import type { BoardShape } from './boardShape';

/**
 * The spray a planing board throws (board-spray, 2026-10-29): drawn only, from the hull's own state. Nothing here
 * changes the board, the rider, the water or the sound.
 *
 * Each cross-section of the hull (a station of patches across the beam) is treated as a wedge entering the water, the
 * 2D+t view of a planing hull (Faltinsen 2005, ch. 9): its bottom, at β to the water across the beam (the board's bank
 * against the surface), meets the water at W, the speed of the hull into it along the bottom's normal, and is wetted
 * D deep at its low side.
 * - **The sheet's water:** Wagner's water entry throws a jet up the bottom of mass ρ·W·D/4 per metre of hull a second,
 *   on the side the bottom rises toward (Wagner 1932; the jet thickness δ = c tan²β / 2π at the spray root's speed
 *   ċ = (π/2) W / tan β, Zhao & Faltinsen 1993). Banked into a turn, that is the high side: the fan off the outside of
 *   the turn. Flat and trimmed, W and D are small: a thin sheet.
 * - **Its speed:** the water meets the spray root at the hull's speed through it, V, and leaves it as fast (Bernoulli),
 *   turned about the root line, which lies at α to the hull's path with tan α = π tan τ / (2 tan β) (Savitsky 1964; here
 *   tan τ = W / V, the bottom's angle of attack along the path). Over the water it goes at 2 V sin α, along the bottom:
 *   sin α of it along the path, cos α of it up the bottom across the beam (Savitsky, DeLorme & Datla 2007's whisker
 *   spray). A deep bank and a light trim throw it out sideways and slow; a flat bottom forward and fast, but thin.
 * - **Off the tail:** PROVISIONAL (the advisor's ruling).
 */

/** Sheets a board throws at most: off each side of the bottom, and off the tail. */
export const BOARD_SHEETS = 3;
/** Floats per packed sheet (`packBoardSheets`): x, y, z, alongX, alongZ, length, vx, vy, vz, flux, spread. */
export const BOARD_SHEET_STRIDE = 11;
const WATER_DENSITY = 1025;
/** The drops' speeds spread this share of the sheet's either way (the sheet breaks up unevenly; provisional). */
const SHEET_SPREAD = 0.15;

export function createBoardSpraySheet(): BoardSpraySheet {
  return { x: 0, y: 0, z: 0, alongX: 0, alongZ: 0, length: 0, vx: 0, vy: 0, vz: 0, flux: 0, spread: 0 };
}

/**
 * A hull's state for its spray: its patches station by station (`stations` × `lanes`, patch `i * lanes + j` the j-th
 * across, from −x to +x, of the i-th station from the tail), and per patch: its bottom centre (world), how deep it lies
 * under the surface (m, negative above), the water's velocity there and the hull's (world, m/s), and whether the water
 * there is the sea's (not dry land or outside the domain). The board's axes (world): across (+x), up, and along (+z).
 */
export interface HullSprayState {
  stations: number;
  lanes: number;
  /** Each station's length along the board, and each patch's width across it, m. */
  stationLength: number;
  width: ArrayLike<number>;
  /** Each patch's across position in the board's frame, m. */
  across: ArrayLike<number>;
  point: ArrayLike<number>;
  depth: ArrayLike<number>;
  water: ArrayLike<number>;
  hull: ArrayLike<number>;
  sea: ArrayLike<number>;
  axisX: ArrayLike<number>;
  axisY: ArrayLike<number>;
  axisZ: ArrayLike<number>;
}

/** A `HullSprayState` to fill: its arrays made for `stations` × `lanes` patches. */
export interface HullSprayBuffers extends HullSprayState {
  width: Float64Array;
  across: Float64Array;
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
    stations, lanes, stationLength, width: new Float64Array(n), across: new Float64Array(n), point: new Float64Array(n * 3),
    depth: new Float64Array(n), water: new Float64Array(n * 3), hull: new Float64Array(n * 3), sea: new Float64Array(n),
    axisX: new Float64Array(3), axisY: new Float64Array(3), axisZ: new Float64Array(3),
  };
}

/**
 * A board shape's patches as `HullSprayState` orders them (station by station from the tail, −x to +x across each),
 * for a hull drawn from a pose (another player's board): each slot's patch, its bottom centre from the board's centre of
 * mass in the board's frame (x, y, z), and its width across, m.
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

/** Scratch for one side's sum over stations. */
interface SideSum {
  flux: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  first: number; last: number;
}
const sides: [SideSum, SideSum] = [
  { flux: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, first: Infinity, last: -Infinity },
  { flux: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, first: Infinity, last: -Infinity },
];

/**
 * The sheets a hull throws now (`HullSprayState`), into `out`: how many. One a side of the bottom that throws any, its
 * root the stations that throw, its water summed and its launch velocity their water-weighted mean.
 */
export function hullSpraySheets(hull: HullSprayState, out: BoardSpraySheet[]): number {
  const { stations, lanes, stationLength, width, across, point, depth, water, hull: velocity, sea, axisX, axisY, axisZ } = hull;
  for (const side of sides) {
    side.flux = 0; side.x = 0; side.y = 0; side.z = 0; side.vx = 0; side.vy = 0; side.vz = 0;
    side.first = Infinity; side.last = -Infinity;
  }
  const nx = -axisY[0];
  const ny = -axisY[1];
  const nz = -axisY[2];
  for (let i = 0; i < stations; i += 1) {
    // The bottom's slope against the surface across the beam (dD/dx, a least-squares line through the patches' depths),
    // how deep its lowest patch lies, how fast the hull goes into the water and through it, all over the wetted patches.
    let wet = 0;
    let sumX = 0; let sumD = 0; let sumXX = 0; let sumXD = 0;
    let deepest = 0;
    let into = 0;
    let rx = 0; let ry = 0; let rz = 0;
    for (let j = 0; j < lanes; j += 1) {
      const k = i * lanes + j;
      const x = across[k];
      const d = depth[k];
      sumX += x; sumD += d; sumXX += x * x; sumXD += x * d;
      if (!(d > 0) || !(sea[k] > 0)) continue;
      wet += 1;
      deepest = Math.max(deepest, d);
      const ux = velocity[k * 3] - water[k * 3];
      const uy = velocity[k * 3 + 1] - water[k * 3 + 1];
      const uz = velocity[k * 3 + 2] - water[k * 3 + 2];
      into += Math.max(0, ux * nx + uy * ny + uz * nz);
      rx += ux; ry += uy; rz += uz;
    }
    if (wet === 0) continue;
    into /= wet;
    rx /= wet; ry /= wet; rz /= wet;
    const slope = (lanes * sumXD - sumX * sumD) / (lanes * sumXX - sumX * sumX);
    // The jet runs up the bottom, toward the side its depth falls to: the side (−x or +x) and that direction (world).
    const toward = slope > 0 ? -1 : 1;
    const tanBeta = Math.abs(slope);
    // The hull's path through the water along the bottom (its speed and direction), and the angle of attack's tangent.
    const normal = rx * nx + ry * ny + rz * nz;
    const px = rx - normal * nx;
    const py = ry - normal * ny;
    const pz = rz - normal * nz;
    const speed = Math.hypot(px, py, pz);
    if (!(speed > 0.5) || !(into > 0)) continue;
    const alpha = Math.atan2(Math.PI * (into / speed), 2 * tanBeta);
    const sheetSpeed = 2 * speed * Math.sin(alpha);
    const along = Math.sin(alpha) / speed;
    const up = Math.cos(alpha) * toward;
    const dx = px * along + axisX[0] * up;
    const dy = py * along + axisX[1] * up;
    const dz = pz * along + axisX[2] * up;
    const norm = Math.hypot(dx, dy, dz) || 1;
    // Wagner's jet: ρ W D / 4 per metre of hull a second, over the station's length.
    const flux = (WATER_DENSITY * into * deepest * stationLength) / 4;
    if (!(flux > 0)) continue;
    // Where it leaves the hull: the waterline on that side, or the rail where the bottom is wetted to it.
    const edge = toward > 0 ? lanes - 1 : 0;
    let leave = edge;
    for (let j = toward > 0 ? 0 : lanes - 1; j !== edge + toward; j += toward) {
      if (depth[i * lanes + j] > 0) leave = j;
    }
    const k = i * lanes + leave;
    const reach = 0.5 * width[k];
    const side = sides[toward > 0 ? 1 : 0];
    side.flux += flux;
    side.x += flux * (point[k * 3] + axisX[0] * toward * reach);
    side.y += flux * (point[k * 3 + 1] + axisX[1] * toward * reach + depth[k]);
    side.z += flux * (point[k * 3 + 2] + axisX[2] * toward * reach);
    // Over the ground: the water's own velocity there and the sheet's over it.
    side.vx += flux * (water[k * 3] + (sheetSpeed * dx) / norm);
    side.vy += flux * (water[k * 3 + 1] + (sheetSpeed * dy) / norm);
    side.vz += flux * (water[k * 3 + 2] + (sheetSpeed * dz) / norm);
    side.first = Math.min(side.first, i);
    side.last = Math.max(side.last, i);
  }
  let count = 0;
  for (const side of sides) {
    if (!(side.flux > 0) || count >= out.length) continue;
    const sheet = out[count];
    count += 1;
    const span = (side.last - side.first + 1) * stationLength;
    const horizontal = Math.hypot(axisZ[0], axisZ[2]) || 1;
    sheet.x = side.x / side.flux - (axisZ[0] / horizontal) * span * 0.5;
    sheet.y = side.y / side.flux;
    sheet.z = side.z / side.flux - (axisZ[2] / horizontal) * span * 0.5;
    sheet.alongX = axisZ[0] / horizontal;
    sheet.alongZ = axisZ[2] / horizontal;
    sheet.length = span;
    sheet.vx = side.vx / side.flux;
    sheet.vy = side.vy / side.flux;
    sheet.vz = side.vz / side.flux;
    sheet.flux = side.flux;
    sheet.spread = SHEET_SPREAD * Math.hypot(sheet.vx, sheet.vy, sheet.vz);
  }
  return count;
}

/** `sheets` packed for a message (`BOARD_SHEET_STRIDE` floats each). */
export function packBoardSheets(sheets: readonly BoardSpraySheet[], out = new Float32Array(sheets.length * BOARD_SHEET_STRIDE)): Float32Array {
  sheets.forEach((sheet, n) => {
    out.set([sheet.x, sheet.y, sheet.z, sheet.alongX, sheet.alongZ, sheet.length, sheet.vx, sheet.vy, sheet.vz, sheet.flux, sheet.spread], n * BOARD_SHEET_STRIDE);
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
    });
  }
  return sheets;
}
