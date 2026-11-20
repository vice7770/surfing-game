/**
 * pool-barrel (2026-11-01): the Wave Pool's waves as a player sees them, frame by frame (no riders), on either floor.
 * Adapted from canyon-b's frame probe (docs/research/canyon-b-2026-11-01/frame-probe.ts): every FRAME s, for the solver's
 * breaking (strength > 0.3), in each arm's region (the right arm, x −3 to 75; the left, mirrored):
 * - per column, the most seaward white cell deeper than SWASH m;
 * - **the line:** from the region's most seaward white column, the run of neighbouring columns whose white lies within LINK m
 *   across shore of the last (one column may be skipped); **patches:** the other runs of at least PATCH columns on its crest;
 * - **waves:** a new wave starts when the region's most seaward white jumps seaward by more than NEW_WAVE m. Per wave: its
 *   longest line, its frames with a patch, and its end's travel along the arm while it travels as one line (never
 *   vanishing, never jumping more than JUMP m): how far along the arm (u, the crest line's arc length from the tip) it got,
 *   and how fast (the end's u against time over the barrel section);
 * - **the start:** where each wave first goes white (x, z, depth, time within the period), and its line SECTION_CHECK s on;
 * - **the onsets** along each arm, by u (5 m bins): each column's white appearing or jumping seaward, with its depth, the
 *   wave's height, the water's steepest slope there (any direction) and whether it threw a lip jet (`onThrow`): the jets'
 *   Mead & Black X and Y (along the crest's travel), ξb along that ray, (1/X)/√(H/L0), and the void's W, L;
 * - **sameness:** each wave's start time within the period, its arrivals at u of the take-off and the barrel's end, and its
 *   face there.
 *
 *   rolldown docs/research/pool-barrel-2026-11-01/frame-probe.ts -o dist/scripts/pool-frame-probe.mjs --format esm --platform node \
 *     && node dist/scripts/pool-frame-probe.mjs --size small|big|medium [--waves barrel|training] [--H <m>] [--periods 12] [--settle 50]
 *        [--barrel key=value,...] [--join J] [--json <file>]
 */
import { writeFileSync } from 'node:fs';
import {
  POOL, POOL_BARREL, POOL_BARREL_EDGE_HEIGHT, POOL_EDGE_HEIGHT, poolCrestZ, regularSignificantHeight, type PoolBarrelSize, type PoolSize, type PoolWaves,
} from '../../../src/wave/pool';
import { GRAVITY } from '../../../src/wave/dispersion';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const waves = (option('waves') ?? 'barrel') as PoolWaves;
const barrel = waves === 'barrel';
const size = option('size') ?? (barrel ? 'small' : 'medium');
for (const pair of (option('barrel') ?? '').split(',').filter(Boolean)) {
  const [key, value] = pair.split('=');
  (POOL_BARREL as Record<string, number>)[key] = Number(value);
}
// The floor's planform: the Barrel floor's own keys (`--barrel armAngle=…`), or the training's.
const planform = barrel ? POOL_BARREL : POOL;
const height = Number(option('H') ?? (barrel ? POOL_BARREL_EDGE_HEIGHT[size as PoolBarrelSize] : POOL_EDGE_HEIGHT[size as PoolSize]));
const periods = Number(option('periods') ?? 12);
const settle = Number(option('settle') ?? 50);
const FRAME = 0.25;
const THRESHOLD = 0.3;
const SWASH = 0.5;
const LINK = 4;
const PATCH = 3;
const CREST = 12;
const NEW_WAVE = 15;
const JUMP = 6;
const SECTION = 1.5;
const SECTION_CHECK = [1, 2];
const BIN = 5;
const L0 = (GRAVITY * POOL.period ** 2) / (2 * Math.PI);

const sim = new SurfZoneSimulation({
  spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
  tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(barrel ? { poolWaves: 'barrel' } : {}),
  // `--join J`: the Barrel floor's breaking-age join in place of its own (`?poolAgeJoin`; 0 is rule A).
  ...(option('join') !== undefined ? { poolAgeJoin: Number(option('join')) } : {}),
} as unknown as SurfZoneConfig);
const { solver } = sim;
const { nx, nz, xCenters, zCenters } = solver;
const firstRow = solver.rowBelow(sim.tank.fineFrom);
const columnOf = (x: number) => Math.min(nx - 1, Math.max(0, Math.round((x - xCenters[0]) / solver.dx - 0.5)));
const strength = sim.breaking.strength;
const eta = (i: number) => solver.h[i] + solver.bed[i] - solver.restLevel;
const depthAt = (i: number) => solver.restLevel - solver.bed[i];
// The barrel section's end and the back-off's: the training floor's arm and taper otherwise.
const armEnd = barrel ? POOL_BARREL.armLength : POOL.armLength;
const backOffEnd = barrel ? POOL_BARREL.armLength + POOL_BARREL.taperWidth : POOL.armLength + POOL.taperWidth;

// The crest line's arc length from the tip, u(|x|), on a 0.25 m table.
const ARC_STEP = 0.25;
const arcTable = new Float64Array(Math.ceil(150 / ARC_STEP) + 2);
for (let k = 1; k < arcTable.length; k += 1) {
  const x0 = (k - 1) * ARC_STEP; const x1 = k * ARC_STEP;
  arcTable[k] = arcTable[k - 1] + Math.hypot(x1 - x0, poolCrestZ(x1, planform) - poolCrestZ(x0, planform));
}
const arc = (x: number) => { const at = Math.min(arcTable.length - 1.001, Math.abs(x) / ARC_STEP); const i = Math.floor(at); return arcTable[i] + (arcTable[i + 1] - arcTable[i]) * (at - i); };
const U_TAKE_OFF = arc(POOL.takeOffX);
const U_ARM = arc(armEnd);

interface Region { name: string; side: 1 | -1; from: number; to: number; endX: number }
const regions: Region[] = [
  { name: 'right', side: 1, from: -3, to: backOffEnd + 5, endX: backOffEnd },
  { name: 'left', side: -1, from: -(backOffEnd + 5), to: 3, endX: -backOffEnd },
];
interface Line { from: number; to: number; along: number; z: number; patches: number; t: number }
interface Run { low: number; high: number; z: number }
function runsIn(region: Region): { c0: number; runs: Run[] } {
  const c0 = columnOf(region.from);
  const c1 = columnOf(region.to);
  const white = new Float64Array(c1 - c0 + 1).fill(Number.NaN);
  for (let col = c0; col <= c1; col += 1) {
    for (let iz = firstRow; iz < nz; iz += 1) {
      const i = iz * nx + col;
      if (strength[i] > THRESHOLD && depthAt(i) > SWASH && solver.h[i] > 0.05) { white[col - c0] = zCenters[iz]; break; }
    }
  }
  const runs: Run[] = [];
  const used = new Uint8Array(white.length);
  for (let k = 0; k < white.length; k += 1) {
    if (white[k] !== white[k] || used[k]) continue;
    let high = k; let last = white[k]; used[k] = 1;
    for (let m = k + 1; m < white.length;) {
      if (white[m] === white[m] && !used[m] && Math.abs(white[m] - last) <= LINK) { high = m; last = white[m]; used[m] = 1; m += 1; continue; }
      const skip = m + 1;
      if (skip < white.length && white[skip] === white[skip] && !used[skip] && Math.abs(white[skip] - last) <= LINK) { high = skip; last = white[skip]; used[skip] = 1; m = skip + 1; continue; }
      break;
    }
    if (high - k + 1 < PATCH) continue;
    let zSum = 0; let count = 0;
    for (let m = k; m <= high; m += 1) if (white[m] === white[m]) { zSum += white[m]; count += 1; }
    runs.push({ low: k, high, z: zSum / count });
  }
  return { c0, runs };
}
interface Wave {
  start: number; startX: number; startZ: number; startDepth: number; z: number; speed: number; seen: number; frames: Line[];
  end: { x: number; ok: boolean; t: number }; track: [number, number][];
}
const allWaves = new Map<string, Wave[]>();
const live = new Map<string, Wave[]>();
function record(time: number): void {
  for (const region of regions) {
    const { c0, runs } = runsIn(region);
    const active = (live.get(region.name) ?? []).filter((w) => time - w.seen <= 1);
    const taken = new Set<Run>();
    for (const wave of [...active].sort((a, b) => a.z - b.z)) {
      const expected = wave.z + wave.speed * (time - wave.seen);
      const mine = runs.filter((r) => !taken.has(r) && Math.abs(r.z - expected) <= CREST);
      if (!mine.length) continue;
      for (const r of mine) taken.add(r);
      // The line: the run reaching furthest along the arm from the tip (the tip's own section is the A-frame's start).
      const main = mine.reduce((a, b) => (b.high - b.low > a.high - a.low ? b : a));
      const line: Line = { from: xCenters[c0 + main.low], to: xCenters[c0 + main.high], along: (main.high - main.low) * solver.dx, z: main.z, patches: mine.length - 1, t: time };
      wave.speed = time > wave.seen ? Math.max(0, Math.min(8, (line.z - wave.z) / (time - wave.seen))) * 0.5 + wave.speed * 0.5 : wave.speed;
      wave.z = line.z; wave.seen = time; wave.frames.push(line);
      const x = region.side > 0 ? line.to : line.from;
      const end = wave.end;
      if (end.ok) {
        if (region.side * (x - end.x) > JUMP && time - wave.start > SECTION) end.ok = false;
        else if (region.side * (x - end.x) > 0) { end.x = x; end.t = time; wave.track.push([time, arc(x)]); }
      }
    }
    for (const wave of active) if (wave.seen !== time) wave.end.ok = false;
    const seaward = Math.min(Infinity, ...active.map((w) => w.z));
    for (const r of runs) {
      if (taken.has(r) || !(r.z < seaward - NEW_WAVE)) continue;
      const line: Line = { from: xCenters[c0 + r.low], to: xCenters[c0 + r.high], along: (r.high - r.low) * solver.dx, z: r.z, patches: 0, t: time };
      // Where it first went white: its most seaward cell.
      let best = { x: 0, z: Infinity, depth: 0 };
      for (let col = c0 + r.low; col <= c0 + r.high; col += 1) {
        for (let iz = firstRow; iz < nz; iz += 1) {
          const i = iz * nx + col;
          if (strength[i] > THRESHOLD && depthAt(i) > SWASH) { if (zCenters[iz] < best.z) best = { x: xCenters[col], z: zCenters[iz], depth: depthAt(i) }; break; }
        }
      }
      const wave: Wave = {
        start: time, startX: best.x, startZ: best.z, startDepth: best.depth, z: r.z, speed: 4, seen: time, frames: [line],
        end: { x: region.side > 0 ? line.to : line.from, ok: true, t: time }, track: [[time, arc(region.side > 0 ? line.to : line.from)]],
      };
      (allWaves.get(region.name) ?? allWaves.set(region.name, []).get(region.name)!).push(wave);
      active.push(wave);
      break;
    }
    live.set(region.name, active.filter((w) => w.seen === time));
  }
}

// Onsets along both arms, per column, by u, and the jets (`onThrow`).
interface Onset { t: number; x: number; u: number; z: number; depth: number; height: number; face: number }
interface Jet { t: number; x: number; u: number; z: number; depth: number; X: number; Y: number; xiRay: number; xiBed: number; H: number; W: number; L: number; tilt: number; volume: number }
const onsets: Onset[] = [];
const jets: Jet[] = [];
sim.onThrow = (e) => {
  if (solver.time < settle) return;
  const X = e.orthogonalGradient ? 1 / e.orthogonalGradient : Number.NaN;
  jets.push({
    t: solver.time, x: e.x, u: arc(e.x), z: e.z ?? Number.NaN, depth: e.depth ?? Number.NaN, X, Y: e.vortexRatio ?? Number.NaN,
    xiRay: Number.isFinite(X) ? (1 / X) / Math.sqrt(e.height / L0) : Number.NaN, xiBed: e.iribarren ?? Number.NaN, H: e.height, W: e.tube.width, L: e.tube.length,
    tilt: (e.tube.tilt * 180) / Math.PI, volume: e.thrown,
  });
};
const reach = backOffEnd + 5;
const c0 = columnOf(-reach); const c1 = columnOf(reach);
const lastWhite = new Float64Array(nx).fill(Number.NaN);
function onsetShapes(time: number): void {
  for (let col = c0; col <= c1; col += 1) {
    let row = -1;
    for (let iz = firstRow; iz < nz; iz += 1) {
      const i = iz * nx + col;
      if (strength[i] > THRESHOLD && depthAt(i) > SWASH && solver.h[i] > 0.05) { row = iz; break; }
    }
    const z = row >= 0 ? zCenters[row] : Number.NaN;
    const before = lastWhite[col];
    lastWhite[col] = z;
    if (row < 0 || !(before !== before || z < before - NEW_WAVE)) continue;
    let crest = -Infinity; let trough = Infinity; let face = 0;
    for (let iz = Math.max(firstRow, row - 40); iz < Math.min(nz - 1, row + 20); iz += 1) {
      const e = eta(iz * nx + col);
      if (Math.abs(iz - row) <= 4) crest = Math.max(crest, e);
      trough = Math.min(trough, e);
    }
    // The water's steepest slope within 6 m of the onset, in any direction.
    for (let iz = Math.max(1, row - 6); iz <= Math.min(nz - 2, row + 6); iz += 1) {
      for (let c = Math.max(1, col - 6); c <= Math.min(nx - 2, col + 6); c += 1) {
        const i = iz * nx + c;
        const gz = (eta(i + nx) - eta(i - nx)) / (zCenters[iz + 1] - zCenters[iz - 1]);
        const gx = (eta(i + 1) - eta(i - 1)) / (2 * solver.dx);
        face = Math.max(face, Math.hypot(gx, gz));
      }
    }
    const x = xCenters[col];
    onsets.push({ t: time, x, u: arc(x), z, depth: depthAt(row * nx + col), height: crest - trough, face: (Math.atan(face) * 180) / Math.PI });
  }
}

const step = 1 / 30;
const perFrame = Math.round(FRAME / step);
const steps = Math.round((settle + periods * POOL.period) / step);
let fastest = 0; let leastTop = Infinity; let volume0 = Number.NaN; let finite = true;
const volume = () => { let v = 0; for (let i = 0; i < solver.h.length; i += 1) v += solver.h[i]; return v; };
const t0 = Date.now();
for (let n = 1; n <= steps; n += 1) {
  sim.step(step);
  if (solver.time < settle) continue;
  if (volume0 !== volume0) volume0 = volume();
  if (n % perFrame === 0) {
    record(solver.time);
    onsetShapes(solver.time);
    for (let i = 0; i < solver.h.length; i += 1) {
      const h = solver.h[i];
      if (!Number.isFinite(h)) finite = false;
      if (h > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / h);
      const d = depthAt(i);
      if (d > 0.6 && d < 1.2 && zCenters[Math.floor(i / nx)] < -30) leastTop = Math.min(leastTop, h);
    }
  }
}
const q = (values: number[], p: number) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : Number.NaN; };
const f = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const sd = (values: number[]) => { const v = values.filter(Number.isFinite); if (v.length < 2) return Number.NaN; const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };
console.log(`pool ${waves} ${size} (H ${height} m at the feed), ${periods} periods after ${settle} s (${((Date.now() - t0) / 1000).toFixed(0)} s wall); frames every ${FRAME} s; `
  + `u of the take-off ${U_TAKE_OFF.toFixed(0)} m, of the barrel section's end ${U_ARM.toFixed(0)} m${barrel ? `; ${JSON.stringify(POOL_BARREL)}` : ''}`);
const reading = sim.surf.reading(solver.time);
console.log(`surf meter typical ${f(reading?.typical ?? Number.NaN, 2)} m, sets ${f(reading?.sets ?? Number.NaN, 2)} m (${reading?.waves ?? 0} waves); health: finite ${finite}, fastest ${f(fastest, 2)} m/s, `
  + `least water on the reef top ${f(leastTop, 2)} m, volume ${f((100 * (volume() - volume0)) / volume0, 2)} % since ${settle} s; lip jets ${sim.lipJets}, rollers ${sim.lipRollers}`);
const json: Record<string, unknown> = {};
for (const region of regions) {
  const list = (allWaves.get(region.name) ?? []).filter((w) => w.frames.length >= 4);
  const reachU = list.map((w) => arc(w.end.x));
  const longest = list.map((w) => Math.max(...w.frames.map((l) => l.along)));
  const patchy = list.map((w) => w.frames.filter((l) => l.patches > 0).length / w.frames.length);
  // The end's speed along the arm over the barrel section (u 20 m to its end), by a straight fit to its track.
  const speeds = list.map((w) => {
    const pts = w.track.filter(([, u]) => u >= 20 && u <= U_ARM + 5);
    if (pts.length < 4 || pts[pts.length - 1][0] - pts[0][0] < 1) return Number.NaN;
    const mt = pts.reduce((a, p) => a + p[0], 0) / pts.length; const mu = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    let num = 0; let den = 0;
    for (const [t, u] of pts) { num += (t - mt) * (u - mu); den += (t - mt) ** 2; }
    return num / den;
  });
  // When it reached the take-off and the barrel's end, from its start.
  const at = (w: Wave, u: number) => { const p = w.track.find(([, v]) => v >= u); return p ? p[0] - w.start : Number.NaN; };
  const sections = SECTION_CHECK.map((s) => list.map((w) => w.frames.find((l) => l.t >= w.start + s)?.along ?? Number.NaN));
  console.log(`${region.name}: ${list.length} waves; one travelling line from the tip reached the take-off (u ${U_TAKE_OFF.toFixed(0)}) in ${reachU.filter((u) => u >= U_TAKE_OFF).length}, `
    + `the barrel's end (u ${U_ARM.toFixed(0)}) in ${reachU.filter((u) => u >= U_ARM - LINK).length}, the back-off's end in ${list.filter((w) => region.side * (w.end.x - region.endX) >= -LINK).length}; `
    + `its end median u ${f(q(reachU, 0.5))} m (10th ${f(q(reachU, 0.1))}, 90th ${f(q(reachU, 0.9))}); along the arm over the barrel section ${f(q(speeds, 0.5), 2)} m/s (${f(q(speeds, 0.1), 2)}–${f(q(speeds, 0.9), 2)}); `
    + `longest line median ${f(q(longest, 0.5))} m; frames with a patch median ${f(100 * q(patchy, 0.5))} %; the start's line after ${SECTION_CHECK.map((s, k) => `${s} s ${f(q(sections[k], 0.5))} m`).join(', ')}`);
  console.log(`  waves: ${list.map((w) => `t ${(w.start % POOL.period).toFixed(2)} @ x ${w.startX.toFixed(0)} z ${w.startZ.toFixed(0)} d ${w.startDepth.toFixed(2)}, take-off +${f(at(w, U_TAKE_OFF), 2)} s, end +${f(at(w, U_ARM), 2)} s, u ${f(arc(w.end.x))}`).join(' | ')}`);
  console.log(`  sameness: start within the period sd ${f(sd(list.map((w) => w.start % POOL.period)), 3)} s, x sd ${f(sd(list.map((w) => w.startX)), 2)} m; arrival at the take-off sd ${f(sd(list.map((w) => at(w, U_TAKE_OFF))), 3)} s, at the barrel's end sd ${f(sd(list.map((w) => at(w, U_ARM))), 3)} s`);
  json[region.name] = list.map((w) => ({ start: w.start, x: w.startX, z: w.startZ, d: w.startDepth, track: w.track.map(([t, u]) => [Number(t.toFixed(2)), Number(u.toFixed(1))]) }));
}
// The onsets and jets along each arm by u.
const plunging: Record<string, number[]> = { right: [], left: [] };
for (const side of [1, -1] as const) {
  const name = side > 0 ? 'right' : 'left';
  for (let u = 0; u < arc(backOffEnd) + 5; u += BIN) {
    const o = onsets.filter((v) => Math.sign(v.x || side) === side && v.u >= u && v.u < u + BIN && Math.abs(v.x) <= backOffEnd + 5);
    const j = jets.filter((v) => Math.sign(v.x || side) === side && v.u >= u && v.u < u + BIN);
    if (!o.length && !j.length) continue;
    const share = o.length ? j.length / o.length : Number.NaN;
    const xi = q(j.map((v) => v.xiRay), 0.5);
    if (j.length >= 0.5 * o.length && xi >= 0.5) plunging[name].push(u);
    console.log(`${name} u ${String(u).padStart(3)}–${u + BIN} (|x| ${f(Math.min(...[...o, ...j].map((v) => Math.abs(v.x))))}–${f(Math.max(...[...o, ...j].map((v) => Math.abs(v.x))))}): onsets ${o.length}, depth ${f(q(o.map((v) => v.depth), 0.5), 2)} m, H ${f(q(o.map((v) => v.height), 0.5), 2)} m, `
      + `face ${f(q(o.map((v) => v.face), 0.5))}° (p90 ${f(q(o.map((v) => v.face), 0.9))}); jets ${j.length} (${f(100 * share)} % of onsets), at ${f(q(j.map((v) => v.depth), 0.5), 2)} m, X ${f(q(j.map((v) => v.X), 0.5), 1)} Y ${f(q(j.map((v) => v.Y), 0.5), 2)}, `
      + `ξb along the ray ${f(xi, 2)} (bed's ${f(q(j.map((v) => v.xiBed), 0.5), 2)}), H ${f(q(j.map((v) => v.H), 0.5), 2)} m, void W ${f(q(j.map((v) => v.W), 0.5), 2)} × L ${f(q(j.map((v) => v.L), 0.5), 2)} m, tilt ${f(q(j.map((v) => v.tilt), 0.5))}°`);
  }
  const bins = plunging[name];
  console.log(`${name}: plunging (jets on half the onsets or more, ξb along the ray ≥ 0.5) over ${bins.length * BIN} m of the arm (${bins.map((b) => `${b}–${b + BIN}`).join(', ') || 'none'})`);
}
const out = option('json');
if (out) writeFileSync(out, JSON.stringify({ ...json, onsets, jets }));
