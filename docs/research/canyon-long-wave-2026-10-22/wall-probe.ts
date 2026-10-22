/**
 * The Canyon's wall, wave only (canyon-long-wave, 2026-10-22; no riders, the owner rides): how much steep, unbroken face
 * stands down the line from each wave's break, and top-down stills of the water.
 *
 * Runs the Canyon's surf zone with a size's swell (the game's `SWELLS`: square, s = 150, mid tide, calm, stage 2 on the
 * CPU) and every SAMPLE s reads each 1 m column over the reef (its upcoast end to 20 m past its end on the beach face),
 * from 30 m seaward of the reef's 6 m foot to the beach:
 * - **the wave's crest nearest the reef's break**, the most seaward crest standing more than a third of Hs above the
 *   still level whose shoreward front is not breaking (the solver's breaking strength under 0.1 over its top third);
 * - **its face**: its height H (crest to the trough within 25 m shoreward) and the slope of its top third (the crest's
 *   drop of H/3 over the distance it takes; big-start's catchable faces stand at about 17° there);
 * - **the wall**: columns whose unbroken face is at least WALL_FACE × Hs high and steeper than WALL_ANGLE; the wall down
 *   the line is the contiguous run of wall columns (gaps under 3 m) whose upcoast end lies within 6 m of a column
 *   breaking on the reef at the same time (the solver's breaking strength over 0.3 within the reef's band), its
 *   along-shore length and the face's height and steepness along it.
 * Reported over every sample in which the reef is breaking: the wall down the line's length (median, 75th, 90th, most),
 * the share of samples with a wall of 15 m or more, and the reef's breaking columns. `--stills <dir>` writes a PNG of
 * the water every STILL_EVERY s (η shaded, breaking white, the bed's 1–6 m contours, the take-off red).
 *
 *   rolldown docs/research/canyon-long-wave-2026-10-22/wall-probe.ts -o dist/scripts/wall-probe.mjs --format esm --platform node \
 *     && node dist/scripts/wall-probe.mjs --size medium --seed 1 --periods 8 [--canyon key=value,...] [--bed old] [--stills <dir>] [--json <file>]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { SWELLS } from '../../../src/game/SurfConditions';
import { canyonArmEndX, canyonShape, type CanyonBed } from '../../../src/wave/Bathymetry';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const number = (name: string, fallback: number) => Number(option(name) ?? fallback);

const SAMPLE = 0.5;
const WALL_FACE = 0.6;
const WALL_ANGLE = Number(option('angle') ?? 17);
const STILL_EVERY = number('still-every', 2);
const SCALE = number('scale', 3);

const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
const hs = number('hs', swell.significantHeight);
const tp = number('tp', swell.peakPeriod);
const seed = number('seed', 1);
const periods = number('periods', 8);
const bed: CanyonBed = option('bed') === 'old' ? 'old' : 'reef';
applyCanyonShape(option('canyon'));
const c = canyonShape(bed);
const stills = option('stills');
if (stills) mkdirSync(stills, { recursive: true });

const config = {
  spot: 'canyon', seed, significantHeight: hs, peakPeriod: tp, directionDegrees: 0, spreading: swell.spreading ?? 150, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu',
  ...(bed === 'old' ? { canyonBed: 'old' } : {}),
} as unknown as SurfZoneConfig;
const t0 = Date.now();
const sim = new SurfZoneSimulation(config);
const { solver } = sim;
const take = sim.breakPoint();
const nx = solver.nx;
const still = (x: number, z: number) => -sim.bedAt(x, z);
// The reef's columns and band: from its upcoast end to 20 m past its end on the beach face; from 30 m seaward of where
// the bed first rises off the shelf anywhere over them to the beach.
const upcoast = c.peakX - (c.shelfDepth - c.crestDepth) / c.endSlope;
const columns: number[] = [];
for (let i = 0; i < nx; i += 1) if (solver.xCenters[i] >= upcoast - 5 && solver.xCenters[i] <= canyonArmEndX(c) + 20) columns.push(i);
let foot = 0;
for (const i of columns) {
  for (let z = sim.tank.blendEnd; z < 0; z += 1) if (still(solver.xCenters[i], z) < c.shelfDepth - 0.05) { foot = Math.min(foot, z); break; }
}
const rowFrom = solver.rowBelow(foot - 30);
const rowTo = solver.rowBelow(-1);
console.log(`canyon ${size} Hs ${hs} Tp ${tp} seed ${seed}: take-off (${take.x}, ${take.z.toFixed(1)}); reef columns x ${solver.xCenters[columns[0]].toFixed(0)}…${solver.xCenters[columns[columns.length - 1]].toFixed(0)}, `
  + `rows z ${solver.zCenters[rowFrom].toFixed(0)}…${solver.zCenters[rowTo].toFixed(0)}; spin-up ${((Date.now() - t0) / 1000).toFixed(0)} s`);

interface Face { x: number; z: number; height: number; angle: number; breaking: boolean }
interface Sample { t: number; breaking: number; wall: number; wallHeight: number; wallAngle: number; steep: number }
const samples: Sample[] = [];
/** Every column's steepest unbroken face's top third, °, over every sample: the distribution says how steep the faces get. */
const unbrokenAngles: number[] = [];

/**
 * Each column's steepest unbroken crest (more than a third of Hs above the still level, at least WALL_FACE × Hs high,
 * its top third's front not breaking), or, when none stands, its steepest crest at all, marked breaking.
 */
function faceOf(i: number): Face | undefined {
  const eta = (j: number) => solver.h[j * nx + i] + solver.bed[j * nx + i] - solver.restLevel;
  const strength = (j: number) => sim.breaking.strength[j * nx + i];
  let best: Face | undefined;
  for (let j = rowFrom + 1; j < rowTo - 2; j += 1) {
    const e = eta(j);
    if (!(e > hs / 3 && e >= eta(j - 1) && e >= eta(j + 1))) continue;
    if (solver.h[j * nx + i] < 0.05) continue;
    // The trough ahead, within 25 m shoreward.
    let trough = e;
    const zLimit = solver.zCenters[j] + 25;
    for (let k = j + 1; k < rowTo && solver.zCenters[k] <= zLimit; k += 1) trough = Math.min(trough, eta(k));
    const height = e - trough;
    if (height < WALL_FACE * hs) continue;
    // The top third's slope, and whether it is breaking.
    let m = j + 1;
    let breaking = strength(j) > 0.1;
    while (m < rowTo && eta(m) > e - height / 3) {
      if (strength(m) > 0.1) breaking = true;
      m += 1;
    }
    const run = Math.max(0.5, solver.zCenters[m] - solver.zCenters[j]);
    const angle = (Math.atan(height / 3 / run) * 180) / Math.PI;
    const face = { x: solver.xCenters[i], z: solver.zCenters[j], height, angle, breaking };
    if (!best || (best.breaking && !breaking) || (best.breaking === breaking && angle > best.angle)) best = face;
  }
  return best;
}

function sample(): void {
  const faces = columns.map(faceOf);
  // The reef's breaking columns: breaking strength over 0.3 anywhere in the band.
  const breakingCol = columns.map((i) => {
    for (let j = rowFrom; j < rowTo; j += 1) {
      const z = solver.zCenters[j];
      if (z > -2) break;
      // Leave out the beach face's shore break: only where the reef is shallower than the plain profile.
      const plain = Math.min(c.shelfDepth, -z * c.shoreSlope);
      if (plain - still(solver.xCenters[i], z) < 0.1) continue;
      if (sim.breaking.strength[j * nx + i] > 0.3) return true;
    }
    return false;
  });
  const breaking = breakingCol.filter(Boolean).length;
  const isWall = faces.map((f) => !!f && !f.breaking && f.angle >= WALL_ANGLE);
  for (const f of faces) if (f && !f.breaking) unbrokenAngles.push(f.angle);
  const steep = isWall.filter(Boolean).length;
  // The wall down the line: a run of wall columns whose upcoast end is within 6 m of a breaking column.
  let best = { length: 0, height: 0, angle: 0 };
  for (let a = 0; a < columns.length; a += 1) {
    if (!isWall[a] || (a > 0 && isWall[a - 1])) continue;
    let near = false;
    for (let k = Math.max(0, a - 6); k <= a; k += 1) if (breakingCol[k]) near = true;
    if (!near) continue;
    let b = a;
    let gap = 0;
    for (let k = a + 1; k < columns.length; k += 1) {
      if (isWall[k]) { b = k; gap = 0; } else if (++gap > 3) break;
    }
    const along = faces.slice(a, b + 1).filter((f, n) => f && isWall[a + n]) as Face[];
    const length = b - a + 1;
    if (length > best.length) {
      best = {
        length,
        height: along.reduce((s, f) => s + f.height, 0) / along.length,
        angle: along.reduce((s, f) => s + f.angle, 0) / along.length,
      };
    }
  }
  samples.push({ t: solver.time, breaking, wall: best.length, wallHeight: best.height, wallAngle: best.angle, steep });
}

/** A PNG of the water over the reef: η shaded, breaking white, the bed's contours, the take-off red. */
function writeStill(path: string): void {
  const i0 = Math.max(0, columns[0] - 60);
  const i1 = Math.min(nx - 1, columns[columns.length - 1] + 60);
  const j0 = rowFrom;
  const j1 = solver.rowBelow(8);
  const w = i1 - i0 + 1;
  const h = j1 - j0 + 1;
  const rgb = Buffer.alloc(w * h * 3);
  for (let jj = 0; jj < h; jj += 1) {
    const j = j0 + jj;
    for (let ii = 0; ii < w; ii += 1) {
      const i = i0 + ii;
      const k = j * nx + i;
      const depth = solver.restLevel - solver.bed[k];
      const e = solver.h[k] + solver.bed[k] - solver.restLevel;
      const strength = sim.breaking.strength[k];
      let r: number; let g: number; let b: number;
      if (solver.h[k] < 0.02) { r = 214; g = 196; b = 150; } else {
        const s = Math.max(-1, Math.min(1, e / hs));
        const base = 0.55 + 0.4 * s;
        r = 20 * base; g = 110 * base + 40 * Math.max(0, 1 - depth / 6); b = 170 * base + 40;
        const white = Math.min(1, strength * 1.5);
        r = r + (255 - r) * white; g = g + (255 - g) * white; b = b + (255 - b) * white;
      }
      // Contours every metre of still depth.
      const below = (kk: number) => Math.floor(solver.restLevel - solver.bed[kk]);
      if (depth > 0.5 && depth < 6.5 && ii + 1 < w && jj + 1 < h && (below(k) !== below(k + 1) || below(k) !== below(k + nx))) { r = r * 0.6 + 60; g = g * 0.6 + 40; b = b * 0.6; }
      if (Math.abs(solver.xCenters[i] - take.x) < 1.5 && Math.abs(solver.zCenters[j] - take.z) < 1.5) { r = 230; g = 20; b = 20; }
      // Seaward up: row 0 of the image is the seaward end.
      const o = (jj * w + ii) * 3;
      rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
    }
  }
  // Upscaled SCALE× (nearest) so a metre reads.
  const W = w * SCALE;
  const H = h * SCALE;
  const big = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) rgb.copy(big, (y * W + x) * 3, (Math.floor(y / SCALE) * w + Math.floor(x / SCALE)) * 3, (Math.floor(y / SCALE) * w + Math.floor(x / SCALE)) * 3 + 3);
  writeFileSync(path, png(W, H, big));
}

function png(w: number, h: number, rgb: Buffer): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const table = new Int32Array(256).map((_, n) => { let v = n; for (let k = 0; k < 8; k += 1) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; return v; });
  const crc = (buf: Buffer) => { let v = -1; for (const byte of buf) v = table[(v ^ byte) & 0xff] ^ (v >>> 8); return (v ^ -1) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2; header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const step = 1 / 30;
const steps = Math.round((periods * tp) / step);
const every = Math.round(SAMPLE / step);
const stillEvery = Math.round(STILL_EVERY / step);
for (let n = 1; n <= steps; n += 1) {
  sim.step(step);
  if (n % every === 0) sample();
  if (stills && n % stillEvery === 0) writeStill(`${stills}/${size}-s${seed}-t${solver.time.toFixed(0).padStart(4, '0')}.png`);
}
const active = samples.filter((s) => s.breaking >= 3);
const q = (values: number[], f: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
};
const walls = active.map((s) => s.wall);
const withWall = active.filter((s) => s.wall > 0);
console.log(`${size} seed ${seed}: ${samples.length} samples, ${active.length} with the reef breaking; wall down the line (≥ ${WALL_FACE} Hs, ≥ ${WALL_ANGLE}°): `
  + `median ${q(walls, 0.5)} m, 75th ${q(walls, 0.75)} m, 90th ${q(walls, 0.9)} m, most ${Math.max(0, ...walls)} m; ≥ 15 m in ${active.filter((s) => s.wall >= 15).length} of ${active.length}; `
  + `its face where it stands: height ${q(withWall.map((s) => s.wallHeight), 0.5).toFixed(2)} m, top third ${q(withWall.map((s) => s.wallAngle), 0.5).toFixed(0)}°; `
  + `steep unbroken columns anywhere over the reef median ${q(active.map((s) => s.steep), 0.5)}; breaking columns median ${q(active.map((s) => s.breaking), 0.5)}; `
  + `unbroken faces' top third 50/90/99 % ${q(unbrokenAngles, 0.5).toFixed(1)}/${q(unbrokenAngles, 0.9).toFixed(1)}/${q(unbrokenAngles, 0.99).toFixed(1)}°; `
  + `run ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const json = option('json');
if (json) writeFileSync(json, JSON.stringify({ size, hs, tp, seed, periods, canyon: { ...c }, bed, samples }));
