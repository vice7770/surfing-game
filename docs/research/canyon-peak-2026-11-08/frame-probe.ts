/**
 * canyon-c (2026-11-03; revised 2026-11-04 for the advisor's second ruling: the frame is 8 steps, 0.267 s, not the 0.25 s
 * its label said; both jump limits, 6 m and 15 m; `--bed half|b|old` and `--join zone`): canyon-b's frame probe for version C (the bank peeling −x from its tip into the flipped bowl),
 * the ruling's bars 1–5 frame by frame (wave only, no riders). Every FRAME s, for the solver's breaking (strength > 0.3)
 * and the white drawn (`drawnWhitewater` > 0.3), in each region:
 * - `line`: the bank and the bowl together, from the bowl's −x end (where its base bar has faded, x −70) to the end of the
 *   bank's fade past its tip (x 165): one line from each wave's first break to the bowl's end (`canyonArmEndX`, x −55);
 * - `bank`: from the join (x −22) to x 165;
 * - `bowl`: the flipped bowl, x −70 to −22: its own breaking.
 * As canyon-b's probe: per column the most seaward white cell deeper than SWASH m; runs of neighbouring white columns
 * within LINK m across shore (one column may be skipped), PATCH columns or more; a wave's runs are those within CREST m
 * across shore of where its crest should be; its line is the longest, the rest patches; a new wave starts when a run
 * seaward of every live wave by NEW_WAVE m appears. Each end of a wave's line travels while it never vanishes and never
 * jumps more than JUMP m (after the first SECTION s, when a breaking section may spread at any speed). Each end is followed with
 * two limits (the second ruling, §7.3): JUMP, 6 m a frame (about 22.5 m/s along shore), the end stopping too in any frame
 * the wave's white is not seen; and JUMP_SECTION, 15 m (a section a rider at 10 m/s crosses in about 1.5 s, counted as
 * continuous), by the advisor's relaxed rule (offprobe.mjs): the end holds through frames its wave is not seen (the
 * tracker keeps a wave 1 s unseen) and stops at the first jump of more than 15 m.
 *
 * Per wave, besides canyon-b's measures:
 * - **the first break** (bar 2): its first frame's run, its x (the run's middle) and its distance from the waterline, and
 *   the wave's height there, H (the crest within 4 cells of the white over the lowest water within 40 cells either side);
 * - **up the line** (bar 1): how far any of its white got toward +x past its first frame's +x end, m;
 * - **its −x end's path** (bar 4): Hutt's peel per 20 m stretch along shore, sin α = c / V (Hutt, Black & Mead 2001):
 *   V the end's speed along its path over the stretch, c the crest's own speed there: at each column's onset (the
 *   solver's), its crest (the highest water within 4 cells of the white) followed for 0.5 s, the stretch's median over
 *   the run (the crests run square to the beach to within about 10°, so their speed across shore is their own);
 * - **the take-off column** (x 75 ± 4 m): its most seaward break there, for `CANYON_BANK_TAKE_OFF_DEPTH`'s fit.
 * And each column's onsets binned along shore (`--bins`): depth, height, face, the bed's slope along +z and ξb.
 *
 *   rolldown docs/research/canyon-c-2026-11-03/frame-probe.ts -o dist/scripts/frame-probe-c.mjs --format esm --platform node \
 *     && node dist/scripts/frame-probe-c.mjs --size medium --seed 1 --periods 12 [--bed half|b|old] [--join zone] [--canyon key=value,...] [--json <file>]
 *        [--stills <dir> --from <s> --to <s> --every <s> --x <x0,x1> --z <z0,z1>]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { SWELLS } from '../../../src/game/SurfConditions';
import { canyonArmEndX, canyonBankEdgeZ, canyonBankJoin, canyonBars, canyonReefSpan, canyonShape, type CanyonBed } from '../../../src/wave/Bathymetry';
import { GRAVITY } from '../../../src/wave/dispersion';
import { SurfMeter, TAKE_OFF_BAND } from '../../../src/wave/SurfMeter';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
const seed = Number(option('seed') ?? 1);
const periods = Number(option('periods') ?? 12);
applyCanyonShape(option('canyon'));
// The layout (`?canyonBed`; 'half', `?canyonRamp=half`) and the bank's join (`?canyonJoin=zone`).
const bed = (['half', 'peak', 'peak-steep', 'b', 'old'] as const).find((b) => b === option('bed')) as CanyonBed | undefined;
const joinRule = option('join') === 'zone' ? 'zone' as const : undefined;
/** The solver's step and the frame: every PER_FRAME steps, 8 × 1/30 = 0.267 s (the label said 0.25 s until 2026-11-04). */
const STEP = 1 / 30;
const PER_FRAME = 8;
const FRAME = PER_FRAME * STEP;
const THRESHOLD = 0.3;
const SWASH = 0.5;
const LINK = 4;
const PATCH = 3;
const CREST = 12;
const NEW_WAVE = 15;
const JUMP = 6;
const JUMP_SECTION = 15;
const SECTION = 1.5;
const SECTION_CHECK = 2;
const STRETCH = 20;
const TAKE_OFF_X = 75;

const sim = new SurfZoneSimulation({
  spot: 'canyon', seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0, spreading: swell.spreading ?? 150,
  tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(bed ? { canyonBed: bed } : {}), ...(joinRule ? { canyonJoin: joinRule } : {}),
} as unknown as SurfZoneConfig);
const { solver } = sim;
const c = canyonShape(bed);
const { nx, nz, xCenters, zCenters } = solver;
const firstRow = solver.rowBelow(sim.tank.fineFrom);
const columnOf = (x: number) => Math.min(nx - 1, Math.max(0, Math.round((x - xCenters[0]) / solver.dx)));
const bowl = canyonReefSpan(c);
const join = canyonBankJoin(c).x;
const bank = canyonBars(c)[0];
const bowlEnd = canyonArmEndX(c);
const lineTo = bank.x + bank.plusTaper;
interface Region { name: string; from: number; to: number; ends: { side: 1 | -1; x: number }[] }
const regions: Region[] = [
  { name: 'line', from: bowl.from, to: lineTo, ends: [{ side: -1, x: bowlEnd }, { side: 1, x: lineTo }] },
  { name: 'bank', from: join, to: lineTo, ends: [{ side: -1, x: join }, { side: 1, x: lineTo }] },
  { name: 'bowl', from: bowl.from, to: bowl.to, ends: [{ side: -1, x: bowlEnd }, { side: 1, x: bowl.to }] },
];
const drawn = (sim as unknown as { drawnWhitewater?: Float64Array }).drawnWhitewater;
const fields: { name: string; values: () => ArrayLike<number> }[] = [
  { name: 'solver', values: () => sim.breaking.strength },
  { name: 'drawn', values: () => drawn ?? sim.breaking.strength },
];
// The surf at the start's band over the whole run (`SWELL_SURF`'s measure: the size report's typical and sets faces).
const meter = new SurfMeter([{ xMin: TAKE_OFF_X - TAKE_OFF_BAND, xMax: TAKE_OFF_X + TAKE_OFF_BAND }], swell.peakPeriod, Infinity);
sim.onBreak = (wave) => meter.add(wave);
const eta = (iz: number, col: number) => solver.h[iz * nx + col] + solver.bed[iz * nx + col] - solver.restLevel;
const depthAt = (iz: number, col: number) => solver.restLevel - solver.bed[iz * nx + col];

interface Line { from: number; to: number; along: number; z: number; zFrom: number; patches: number; t: number }
interface Run { low: number; high: number; z: number; zLow: number; zHigh: number }
function runsIn(values: ArrayLike<number>, region: Region): { c0: number; white: Float64Array; rows: Int32Array; runs: Run[] } {
  const c0 = columnOf(region.from);
  const c1 = columnOf(region.to);
  const white = new Float64Array(c1 - c0 + 1).fill(Number.NaN);
  const rows = new Int32Array(c1 - c0 + 1).fill(-1);
  for (let col = c0; col <= c1; col += 1) {
    for (let iz = firstRow; iz < nz; iz += 1) {
      const i = iz * nx + col;
      if (values[i] > THRESHOLD && solver.restLevel - solver.bed[i] > SWASH && solver.h[i] > 0.05) { white[col - c0] = zCenters[iz]; rows[col - c0] = iz; break; }
    }
  }
  const runs: Run[] = [];
  const used = new Uint8Array(white.length);
  for (let k = 0; k < white.length; k += 1) {
    if (white[k] !== white[k] || used[k]) continue;
    let high = k;
    let last = white[k];
    used[k] = 1;
    for (let m = k + 1; m < white.length;) {
      if (white[m] === white[m] && !used[m] && Math.abs(white[m] - last) <= LINK) { high = m; last = white[m]; used[m] = 1; m += 1; continue; }
      const skip = m + 1;
      if (skip < white.length && white[skip] === white[skip] && !used[skip] && Math.abs(white[skip] - last) <= LINK) { high = skip; last = white[skip]; used[skip] = 1; m = skip + 1; continue; }
      break;
    }
    if (high - k + 1 < PATCH) continue;
    let zSum = 0; let count = 0;
    for (let m = k; m <= high; m += 1) if (white[m] === white[m]) { zSum += white[m]; count += 1; }
    runs.push({ low: k, high, z: zSum / count, zLow: white[k], zHigh: white[high] });
  }
  return { c0, white, rows, runs };
}

interface Wave {
  start: number; z: number; speed: number; seen: number; frames: Line[]; first: Line; reached: Map<number, { x: number; ok: boolean; t?: number }>;
  /** Each end with the 15 m limit, the advisor's relaxed rule (JUMP_SECTION), and the −x end's path while it held. */
  relaxed: Map<number, { x: number; ok: boolean }>; path15: [number, number, number][];
  gap: number; split: number; streak: number;
  /** The first break: its run's middle x, its most seaward white z, the wave's height there. */
  firstX: number; firstZ: number; firstH: number;
  /** How far its white got +x of its first frame's +x end, m (any run on its crest). */
  up: number;
  /** Its −x end's path while it travelled: [t, x, z]. */
  path: [number, number, number][];
  /** Its most seaward white in the take-off column (x 75 ± 4), z, and the still depth there. */
  takeOffZ: number; takeOffDepth: number;
}
const waves = new Map<string, Wave[]>();
const live = new Map<string, Wave[]>();
const frames = new Map<string, { length: number; patches: number }[]>();

function heightAt(row: number, col: number): number {
  let crest = -Infinity; let trough = Infinity;
  for (let iz = Math.max(firstRow, row - 40); iz < Math.min(nz, row + 40); iz += 1) {
    const e = eta(iz, col);
    if (Math.abs(iz - row) <= 4) crest = Math.max(crest, e);
    trough = Math.min(trough, e);
  }
  return crest - trough;
}

function record(time: number): void {
  for (const field of fields) {
    const values = field.values();
    for (const region of regions) {
      const key = `${field.name} ${region.name}`;
      const { c0, white, rows, runs } = runsIn(values, region);
      const active = (live.get(key) ?? []).filter((w) => time - w.seen <= 1);
      const taken = new Set<Run>();
      for (const wave of [...active].sort((a, b) => a.z - b.z)) {
        const expected = wave.z + wave.speed * (time - wave.seen);
        const mine = runs.filter((r) => !taken.has(r) && Math.abs(r.z - expected) <= CREST);
        if (!mine.length) continue;
        for (const r of mine) taken.add(r);
        const main = mine.reduce((a, b) => (b.high - b.low > a.high - a.low ? b : a));
        for (const r of mine) {
          if (r === main) continue;
          wave.gap = Math.max(wave.gap, (r.low > main.high ? r.low - main.high : main.low - r.high) * solver.dx);
        }
        wave.streak = mine.length > 1 ? wave.streak + FRAME : 0;
        wave.split = Math.max(wave.split, wave.streak);
        const line: Line = {
          from: xCenters[c0 + main.low], to: xCenters[c0 + main.high], along: (main.high - main.low) * solver.dx, z: main.z, zFrom: main.zLow,
          patches: mine.length - 1, t: time,
        };
        wave.speed = time > wave.seen ? Math.max(0, Math.min(8, (line.z - wave.z) / (time - wave.seen))) * 0.5 + wave.speed * 0.5 : wave.speed;
        wave.z = line.z;
        wave.seen = time;
        wave.frames.push(line);
        (frames.get(key) ?? frames.set(key, []).get(key)!).push({ length: line.along, patches: line.patches });
        for (const [side, end] of wave.reached) {
          if (!end.ok) continue;
          const x = side > 0 ? line.to : line.from;
          if (side * (x - end.x) > JUMP && time - wave.start > SECTION) wave.reached.set(side, { x: end.x, ok: false, t: end.t });
          else if (side * (x - end.x) > 0) wave.reached.set(side, { x, ok: true, t: time });
        }
        if (wave.reached.get(-1)?.ok) wave.path.push([time, line.from, line.zFrom]);
        for (const [side, end] of wave.relaxed) {
          if (!end.ok) continue;
          const x = side > 0 ? line.to : line.from;
          if (side * (x - end.x) > JUMP_SECTION && time - wave.start > SECTION) end.ok = false;
          else if (side * (x - end.x) > 0) end.x = x;
        }
        if (wave.relaxed.get(-1)?.ok) wave.path15.push([time, line.from, line.zFrom]);
        // Up the line and the take-off column: over all its runs on its crest.
        for (const r of mine) {
          wave.up = Math.max(wave.up, xCenters[c0 + r.high] - wave.first.to);
          for (let k = r.low; k <= r.high; k += 1) {
            const z = white[k];
            if (z !== z) continue;
            const col = c0 + k;
            if (Math.abs(xCenters[col] - TAKE_OFF_X) <= 4 && z < wave.takeOffZ) { wave.takeOffZ = z; wave.takeOffDepth = depthAt(rows[k], col); }
          }
        }
      }
      for (const wave of active) {
        if (wave.seen === time) continue;
        for (const [side, end] of wave.reached) wave.reached.set(side, { ...end, ok: false });
      }
      const seaward = Math.min(Infinity, ...active.map((w) => w.z));
      for (const r of runs) {
        if (taken.has(r) || !(r.z < seaward - NEW_WAVE)) continue;
        const line: Line = {
          from: xCenters[c0 + r.low], to: xCenters[c0 + r.high], along: (r.high - r.low) * solver.dx, z: r.z, zFrom: r.zLow, patches: 0, t: time,
        };
        // The first break: the run's most seaward column, the wave's height there.
        let outer = r.low;
        for (let k = r.low; k <= r.high; k += 1) if (white[k] < white[outer]) outer = k;
        const wave: Wave = {
          start: time, z: r.z, speed: 4, seen: time, frames: [line], first: line, reached: new Map(), gap: 0, split: 0, streak: 0,
          firstX: 0.5 * (line.from + line.to), firstZ: white[outer], firstH: heightAt(rows[outer], c0 + outer), up: 0, path: [[time, line.from, line.zFrom]],
          takeOffZ: Infinity, takeOffDepth: Number.NaN, relaxed: new Map(), path15: [[time, line.from, line.zFrom]],
        };
        for (let k = r.low; k <= r.high; k += 1) {
          if (white[k] !== white[k]) continue;
          if (Math.abs(xCenters[c0 + k] - TAKE_OFF_X) <= 4 && white[k] < wave.takeOffZ) { wave.takeOffZ = white[k]; wave.takeOffDepth = depthAt(rows[k], c0 + k); }
        }
        for (const end of region.ends) wave.reached.set(end.side, { x: end.side > 0 ? line.to : line.from, ok: true, t: time });
        for (const end of region.ends) wave.relaxed.set(end.side, { x: end.side > 0 ? line.to : line.from, ok: true });
        (waves.get(key) ?? waves.set(key, []).get(key)!).push(wave);
        active.push(wave);
        (frames.get(key) ?? frames.set(key, []).get(key)!).push({ length: line.along, patches: 0 });
        break;
      }
      live.set(key, active.filter((w) => w.seen === time));
    }
  }
}

// Stills: the water from above, the solver's white and the drawn white side by side, seaward up.
const stills = option('stills');
const stillFrom = Number(option('from') ?? Infinity);
const stillTo = Number(option('to') ?? -Infinity);
const stillEvery = Number(option('every') ?? 0.5);
const [sx0, sx1] = (option('x') ?? '-200,200').split(',').map(Number);
const [sz0, sz1] = (option('z') ?? '-320,0').split(',').map(Number);
if (stills) mkdirSync(stills, { recursive: true });
function png(w: number, h: number, rgb: Buffer): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const table = new Int32Array(256).map((_, n) => { let v = n; for (let k = 0; k < 8; k += 1) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; return v; });
  const crc = (buf: Buffer) => { let v = -1; for (const byte of buf) v = table[(v ^ byte) & 0xff] ^ (v >>> 8); return (v ^ -1) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function still(path: string): void {
  const i0 = columnOf(sx0); const i1 = columnOf(sx1);
  const j0 = solver.rowBelow(sz0); const j1 = solver.rowBelow(sz1);
  const w = i1 - i0 + 1; const h = j1 - j0 + 1;
  const W = 2 * w + 6; const H = h;
  const rgb = Buffer.alloc(W * H * 3, 255);
  const hs = swell.significantHeight;
  fields.forEach((field, f) => {
    const values = field.values();
    for (let jj = 0; jj < h; jj += 1) for (let ii = 0; ii < w; ii += 1) {
      // Seaward up: the first image row is the most seaward.
      const k = (j0 + jj) * nx + i0 + ii;
      const depth = solver.restLevel - solver.bed[k];
      const e = solver.h[k] + solver.bed[k] - solver.restLevel;
      let r: number; let g: number; let b: number;
      if (solver.h[k] < 0.02) { r = 214; g = 196; b = 150; } else {
        const s = Math.max(-1, Math.min(1, e / hs));
        const base = 0.55 + 0.4 * s;
        r = 20 * base; g = 110 * base + 40 * Math.max(0, 1 - depth / 6); b = 170 * base + 40;
        const white = Math.min(1, values[k] * 1.5);
        r += (255 - r) * white; g += (255 - g) * white; b += (255 - b) * white;
      }
      const level = (kk: number) => Math.floor(solver.restLevel - solver.bed[kk]);
      if (depth > 0.5 && depth < 6.5 && ii + 1 < w && jj + 1 < h && (level(k) !== level(k + 1) || level(k) !== level(k + nx))) { r = r * 0.6 + 60; g = g * 0.6 + 40; b *= 0.6; }
      // +x to the right, as a surfer on the beach looking out sees it (the bank's tip far out on the right).
      const o = (jj * W + f * (w + 6) + ii) * 3;
      rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
    }
  });
  writeFileSync(path, png(W, H, rgb));
}

// Each column's onsets along the bank and the bowl, binned along shore (canyon-b's `--bins`, by x here).
const BIN = 10;
const L0 = (GRAVITY * swell.peakPeriod * swell.peakPeriod) / (2 * Math.PI);
const lastWhite = new Float64Array(nx).fill(Number.NaN);
/** Onsets seaward of the bank's edge (on its face, or the bowl's bed) and inside it (the bores re-breaking over its inside). */
const onsetBins = new Map<number, { depth: number; height: number; face: number; slope: number; xi: number }[]>();
/** The same onsets one by one, for pooling over seeds (pool.mjs's bar 6): [x, depth, H, face °, ξb]. */
const onsetList: [number, number, number, number, number][] = [];
const insideBins = new Map<number, number>();
/** Each column's crest speeds at its onsets (the crest followed for CREST_FOLLOW s), m/s, and the onsets still followed. */
const CREST_FOLLOW = 1;
const crestSpeeds: number[][] = Array.from({ length: nx }, () => []);
const following: { col: number; t: number; z: number }[] = [];
const crestRowNear = (col: number, from: number, to: number) => {
  let best = -1; let top = -Infinity;
  for (let iz = Math.max(firstRow, from); iz <= Math.min(nz - 1, to); iz += 1) {
    if (solver.h[iz * nx + col] <= 0.05) continue;
    const e = eta(iz, col);
    if (e > top) { top = e; best = iz; }
  }
  return best;
};
/** The crest's z in a row's neighbourhood, refined by a parabola through the rows either side (as the crest report's). */
const crestZ = (col: number, row: number) => {
  if (row <= firstRow || row >= nz - 1) return zCenters[row];
  const a = eta(row - 1, col); const b = eta(row, col); const d = eta(row + 1, col);
  const den = a - 2 * b + d;
  const shift = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - d)) / den)) : 0;
  return zCenters[row] + shift * (zCenters[row + 1] - zCenters[row]);
};
/** The crests' own speed over the STRETCH m ending at `edge` (the run's median over its columns' onsets), m/s. */
function crestSpeedIn(edge: number): number {
  const speeds: number[] = [];
  for (let col = 0; col < nx; col += 1) if (xCenters[col] <= edge && xCenters[col] > edge - STRETCH) speeds.push(...crestSpeeds[col]);
  return median(speeds);
}
function onsetShapes(): void {
  const now = solver.time;
  for (let k = following.length - 1; k >= 0; k -= 1) {
    const f = following[k];
    if (now - f.t < CREST_FOLLOW - 1e-6) continue;
    following.splice(k, 1);
    const row = crestRowNear(f.col, solver.rowBelow(f.z - 1), solver.rowBelow(f.z + 10));
    if (row >= 0) crestSpeeds[f.col].push((crestZ(f.col, row) - f.z) / (now - f.t));
  }
  const values = sim.breaking.strength;
  const c0 = columnOf(bowl.from);
  const c1 = columnOf(lineTo);
  for (let col = c0; col <= c1; col += 1) {
    let row = -1;
    for (let iz = firstRow; iz < nz; iz += 1) {
      const i = iz * nx + col;
      if (values[i] > THRESHOLD && solver.restLevel - solver.bed[i] > SWASH && solver.h[i] > 0.05) { row = iz; break; }
    }
    const z = row >= 0 ? zCenters[row] : Number.NaN;
    const before = lastWhite[col];
    lastWhite[col] = z;
    if (row < 0 || !(before !== before || z < before - NEW_WAVE)) continue;
    let crest = -Infinity; let trough = Infinity; let face = 0;
    for (let iz = Math.max(firstRow, row - 40); iz < Math.min(nz - 1, row + 40); iz += 1) {
      const e = eta(iz, col);
      if (Math.abs(iz - row) <= 4) crest = Math.max(crest, e);
      trough = Math.min(trough, e);
      if (iz >= row - 2 && iz <= row + 12) face = Math.max(face, (e - eta(iz + 1, col)) / (zCenters[iz + 1] - zCenters[iz]));
    }
    const depthAtZ = (dz: number) => solver.restLevel - solver.bed[solver.rowBelow(z + dz) * nx + col];
    const slope = Math.max(0, (depthAtZ(-2) - depthAtZ(2)) / 4);
    const height = crest - trough;
    const bin = Math.floor(xCenters[col] / BIN) * BIN;
    const crestRow = crestRowNear(col, row - 4, row + 4);
    if (crestRow >= 0) following.push({ col, t: now, z: crestZ(col, crestRow) });
    // Inside the bank's edge (its level top, its back and the inside, shoreward of where its face reaches the edge's
    // depth), where the bores re-break: counted, not shaped.
    const x = xCenters[col];
    const edgeZ = canyonBankEdgeZ(x, c);
    if (x > join && x < bank.x + bank.plusTaper && z > edgeZ + 0.5) {
      insideBins.set(bin, (insideBins.get(bin) ?? 0) + 1);
      continue;
    }
    const shape = {
      depth: solver.restLevel - solver.bed[row * nx + col], height, face: (Math.atan(face) * 180) / Math.PI, slope,
      xi: height > 0 ? slope / Math.sqrt(height / L0) : Number.NaN,
    };
    (onsetBins.get(bin) ?? onsetBins.set(bin, []).get(bin)!).push(shape);
    onsetList.push([+x.toFixed(1), +shape.depth.toFixed(3), +height.toFixed(3), +shape.face.toFixed(2), +shape.xi.toFixed(4)]);
  }
}

const step = STEP;
const perFrame = PER_FRAME;
const perStill = Math.round(stillEvery / step);
const steps = Math.round((periods * swell.peakPeriod) / step);
const t0 = Date.now();
const spinUp = sim.solver.time;
// The run's health (as crest-current.ts's): the fastest water (|q|/h where h > 5 cm), every frame, NaN anywhere, the
// Froude caps and the volume.
const boussinesq = solver as unknown as { froudeCaps?: number; froudeCapsInWater?: number; totalVolume(): number; qx: Float64Array; qz: Float64Array };
const caps0 = boussinesq.froudeCaps ?? 0;
const capsInWater0 = boussinesq.froudeCapsInWater ?? 0;
const volume0 = boussinesq.totalVolume();
let fastest = 0;
let finite = true;
for (let n = 1; n <= steps; n += 1) {
  sim.step(step);
  if (n % perFrame === 0) {
    record(solver.time); onsetShapes();
    for (let i = 0; i < solver.h.length; i += 1) {
      const h = solver.h[i];
      if (!Number.isFinite(h) || !Number.isFinite(boussinesq.qx[i]) || !Number.isFinite(boussinesq.qz[i])) finite = false;
      if (h > 0.05) fastest = Math.max(fastest, Math.hypot(boussinesq.qx[i], boussinesq.qz[i]) / h);
    }
  }
  if (stills && n % perStill === 0 && solver.time >= stillFrom && solver.time <= stillTo) still(`${stills}/${size}-s${seed}-t${solver.time.toFixed(2).padStart(7, '0')}.png`);
}
const quantile = (values: number[], q: number) => {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? v[Math.min(v.length - 1, Math.floor(q * v.length))] : Number.NaN;
};
const median = (values: number[]) => quantile(values, 0.5);
const fmt = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
/** Spearman's rank correlation. */
function spearman(a: number[], b: number[]): number {
  const rank = (v: number[]) => { const order = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]); const r = new Array<number>(v.length); order.forEach(([, i], k) => { r[i] = k; }); return r; };
  const ra = rank(a); const rb = rank(b); const n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n; const mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i += 1) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
}
/** Hutt's peel per STRETCH m along shore over a wave's −x end's path: [stretch's +x edge, α°, V, c]. */
function peels(wave: Wave, path = wave.path): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  if (path.length < 3) return out;
  const at = (x: number) => path.findIndex((p) => p[1] <= x);
  for (let edge = Math.floor(path[0][1] / STRETCH) * STRETCH; edge - STRETCH >= path[path.length - 1][1] - 1e-9; edge -= STRETCH) {
    const a = at(edge); const b = at(edge - STRETCH);
    if (a < 0 || b < 0 || b <= a) continue;
    const dt = path[b][0] - path[a][0];
    if (!(dt > 0)) continue;
    const v = Math.hypot(path[b][1] - path[a][1], path[b][2] - path[a][2]) / dt;
    const crest = crestSpeedIn(edge);
    if (!(crest > 0)) continue;
    out.push([edge, (Math.asin(Math.min(1, crest / v)) * 180) / Math.PI, v, crest]);
  }
  return out;
}

console.log(`canyon C ${size} seed ${seed}${bed ? ` (--bed ${bed})` : ''}${joinRule ? ` (--join ${joinRule})` : ''}, ${periods} periods after ${spinUp.toFixed(0)} s of spin-up (${((Date.now() - t0) / 1000).toFixed(0)} s wall); `
  + `frames every ${FRAME.toFixed(3)} s (${PER_FRAME} steps); jump limits ${JUMP} m and ${JUMP_SECTION} m; ${option('canyon') ?? ''}`);
console.log(`grid ${nx}×${nz}; regions: line ${bowl.from}…${lineTo} (the bowl's end x ${bowlEnd}), bank ${join}…${lineTo}, bowl ${bowl.from}…${bowl.to}; take-off column x ${TAKE_OFF_X} ± 4`);
const json: Record<string, unknown> = { size, seed, periods, grid: [nx, nz], bed: bed ?? 'reef', join: joinRule ?? 'bed', frame: FRAME, jumps: [JUMP, JUMP_SECTION] };
for (const field of fields) {
  for (const region of regions) {
    const key = `${field.name} ${region.name}`;
    const list = (waves.get(key) ?? []).filter((w) => w.frames.length >= 4);
    const lines = frames.get(key) ?? [];
    const longest = list.map((w) => Math.max(...w.frames.map((l) => l.along)));
    const typical = list.map((w) => median(w.frames.map((l) => l.along)));
    const patchy = list.map((w) => w.frames.filter((l) => l.patches > 0).length / w.frames.length);
    const sections = list.map((w) => w.frames.find((l) => l.t >= w.start + SECTION_CHECK)?.along ?? Number.NaN).filter(Number.isFinite);
    const ends = region.ends.map((end) => {
      const ok = list.filter((w) => end.side * (w.reached.get(end.side)!.x - end.x) >= -LINK);
      const travel = list.map((w) => end.side * (w.reached.get(end.side)!.x - (end.side > 0 ? w.first.to : w.first.from)));
      const ok15 = list.filter((w) => end.side * (w.relaxed.get(end.side)!.x - end.x) >= -LINK);
      const travel15 = list.map((w) => end.side * (w.relaxed.get(end.side)!.x - (end.side > 0 ? w.first.to : w.first.from)));
      return `${end.side > 0 ? '+x' : '−x'} end: travelled median ${fmt(median(travel))} / ${fmt(median(travel15))} m (6 m / 15 m; 90th ${fmt(quantile(travel, 0.9))} / ${fmt(quantile(travel15, 0.9))}), `
        + `reached x ${fmt(end.x)} in ${ok.length} / ${ok15.length} of ${list.length}`;
    });
    console.log(`${key}: ${list.length} waves; frames breaking ${lines.length}, frames with a patch ${fmt((100 * lines.filter((l) => l.patches > 0).length) / Math.max(1, lines.length))} %; `
      + `per wave: longest line p50 ${fmt(median(longest))} m (90th ${fmt(quantile(longest, 0.9))}), typical ${fmt(median(typical))} m, frames with a patch p50 ${fmt(100 * median(patchy))} %; `
      + `its line ${SECTION_CHECK} s after it starts p50 ${fmt(median(sections))} m (≥ 40 m: ${sections.filter((v) => v >= 40).length} of ${sections.length}); ${ends.join('; ')}`);
    if (region.name !== 'bowl') {
      const up = list.map((w) => w.up);
      const xs = list.map((w) => w.firstX);
      const hs = list.map((w) => w.firstH);
      const setH = quantile(hs, 2 / 3);
      const sets = list.filter((w) => w.firstH >= setH);
      const toEnd = (w: Wave) => w.reached.get(-1)!.x - bowlEnd <= LINK;
      const toEnd15 = (w: Wave) => w.relaxed.get(-1)!.x - bowlEnd <= LINK;
      const ps = list.flatMap((w) => peels(w));
      console.log(`  bar 1, up the line: white ≤ 10 m +x of the first break in ${list.filter((w) => w.up <= 10).length} of ${list.length} (${fmt((100 * list.filter((w) => w.up <= 10).length) / Math.max(1, list.length))} %); `
        + `up p50 ${fmt(median(up))} m, p90 ${fmt(quantile(up, 0.9))} m`);
      console.log(`  bar 2, first breaks: all x p10/p50/p90 ${fmt(quantile(xs, 0.1))}/${fmt(median(xs))}/${fmt(quantile(xs, 0.9))}, out p50 ${fmt(-median(list.map((w) => w.firstZ)))} m; `
        + `sets (top third by H ≥ ${fmt(setH, 2)} m, ${sets.length}) x p10/p50/p90 ${fmt(quantile(sets.map((w) => w.firstX), 0.1))}/${fmt(median(sets.map((w) => w.firstX)))}/${fmt(quantile(sets.map((w) => w.firstX), 0.9))}, `
        + `out p50 ${fmt(-median(sets.map((w) => w.firstZ)))} m; Spearman(x*, H) ${fmt(spearman(xs, hs), 2)} (n ${list.length}); within 10 m of the tip ${list.filter((w) => w.firstX >= bank.x - 10).length} of ${list.length}`);
      console.log(`  bar 3, one line from the first break to the bowl's end (x ${bowlEnd}), 6 m / 15 m: ${list.filter(toEnd).length} / ${list.filter(toEnd15).length} of ${list.length}, `
        + `sets ${sets.filter(toEnd).length} / ${sets.filter(toEnd15).length} of ${sets.length}`);
      const stretchRows: string[] = [];
      for (let edge = Math.ceil(lineTo / STRETCH) * STRETCH; edge > bowl.from; edge -= STRETCH) {
        const here = ps.filter((p) => p[0] === edge);
        if (here.length) stretchRows.push(`${edge - STRETCH}…${edge}: ${fmt(median(here.map((p) => p[1])))}° (${here.length}; V ${fmt(median(here.map((p) => p[2])), 1)}, c ${fmt(median(here.map((p) => p[3])), 1)} m/s)`);
      }
      console.log(`  bar 4, Hutt's peel on the bank (x ${join}…${bank.x}): median ${fmt(median(ps.filter((p) => p[0] > join && p[0] - STRETCH < bank.x).map((p) => p[1])))}° over ${ps.length} stretches; by stretch: ${stretchRows.join('; ')}`);
      const take = list.filter((w) => Number.isFinite(w.takeOffDepth));
      console.log(`  take-off column (x ${TAKE_OFF_X} ± 4): ${take.length} of ${list.length} waves break there; start depth p50 ${fmt(median(take.map((w) => w.takeOffDepth)), 2)} m, p90 ${fmt(quantile(take.map((w) => w.takeOffDepth), 0.9), 2)} m; `
        + `most seaward z p10 ${fmt(quantile(take.map((w) => w.takeOffZ), 0.1), 1)}, p50 ${fmt(median(take.map((w) => w.takeOffZ)), 1)}`);
    }
    json[key] = list.map((w) => ({
      start: w.start, firstX: +w.firstX.toFixed(1), firstZ: +w.firstZ.toFixed(1), firstH: +w.firstH.toFixed(3), up: +w.up.toFixed(1),
      reached: [...w.reached].map(([side, r]) => [side, +r.x.toFixed(1), r.ok]), frames: w.frames.length, patchy: +(w.frames.filter((l) => l.patches > 0).length / w.frames.length).toFixed(3),
      longest: Math.max(...w.frames.map((l) => l.along)), typical: median(w.frames.map((l) => l.along)), split: w.split, gap: w.gap,
      peels: peels(w).map((p) => p.map((v) => +v.toFixed(2))), peels15: peels(w, w.path15).map((p) => p.map((v) => +v.toFixed(2))),
      reached15: [...w.relaxed].map(([side, r]) => [side, +r.x.toFixed(1), r.ok]), takeOffZ: Number.isFinite(w.takeOffZ) ? +w.takeOffZ.toFixed(1) : null,
      takeOffDepth: Number.isFinite(w.takeOffDepth) ? +w.takeOffDepth.toFixed(3) : null,
      lines: w.frames.map((l) => [+l.t.toFixed(2), +l.from.toFixed(1), +l.to.toFixed(1), +l.z.toFixed(1), l.patches]),
    }));
  }
}
const bins: Record<string, unknown> = {};
for (const bin of [...onsetBins.keys()].sort((a, b) => b - a)) {
  const list = onsetBins.get(bin)!;
  const xi = median(list.map((o) => o.xi));
  bins[bin] = { n: list.length, depth: median(list.map((o) => o.depth)), height: median(list.map((o) => o.height)), face: median(list.map((o) => o.face)), xi, plunging: list.filter((o) => o.xi >= 0.5).length / list.length };
  console.log(`onsets x ${String(bin).padStart(4)}…${bin + BIN}: ${String(list.length).padStart(3)} (and ${insideBins.get(bin) ?? 0} inside the edge); crest speed p50 ${fmt(median(Array.from({ length: BIN }, (_, k) => crestSpeeds[columnOf(bin + k)] ?? []).flat()), 1)} m/s; depth p50 ${fmt(median(list.map((o) => o.depth)), 2)} m, H p50 ${fmt(median(list.map((o) => o.height)), 2)} m, `
    + `face p50 ${fmt(median(list.map((o) => o.face)))}° (p90 ${fmt(quantile(list.map((o) => o.face), 0.9))}), bed 1:${fmt(1 / median(list.map((o) => o.slope)))}, `
    + `ξb p50 ${fmt(xi, 2)} (p90 ${fmt(quantile(list.map((o) => o.xi), 0.9), 2)}), ξb ≥ 0.5 in ${fmt((100 * list.filter((o) => o.xi >= 0.5).length) / list.length)} %`);
}
json.bins = bins;
json.onsets = onsetList;
json.inside = Object.fromEntries(insideBins);
const surf = meter.reading(solver.time, Infinity);
console.log(`surf at the start's band (x ${TAKE_OFF_X} ± ${TAKE_OFF_BAND}): typical ${fmt(surf?.typical ?? Number.NaN, 2)} m, sets ${fmt(surf?.sets ?? Number.NaN, 2)} m, ${surf?.waves ?? 0} waves`);
json.surf = surf ?? null;
json.faces = meter.waves().map((w) => +w.face.toFixed(3));
const health = { fastest, finite, caps: (boussinesq.froudeCaps ?? 0) - caps0, capsInWater: (boussinesq.froudeCapsInWater ?? 0) - capsInWater0, volumeDrift: boussinesq.totalVolume() / volume0 - 1 };
console.log(`health: fastest water ${fastest.toFixed(2)} m/s; Froude caps ${health.caps} (${health.capsInWater} in water); volume ${(100 * health.volumeDrift).toFixed(2)} %; finite ${finite}`);
json.health = health;
console.log(`wall ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const out = option('json');
if (out) writeFileSync(out, JSON.stringify(json));
