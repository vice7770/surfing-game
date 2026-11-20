/**
 * Every spot's breaking line as a player sees it, frame by frame (all-spots-breaking, 2026-10-28; wave only, no riders).
 * The Canyon's frame probe (`../canyon-beach-break-2026-10-23/frame-probe.ts`) made generic: the game's own sea for a spot
 * and size (`physicalSettingsFor` + `surfZoneConfigFor`, the CPU tier), one region per spot (the window inside its open
 * edges, cut to the ridden part where the spot has one: the Reef's ledge, Padang Padang's reef, the Wave Pool's arms,
 * one region each), and each wave's own peak (where its first line lies) in place of a fixed tip.
 *
 * Every FRAME s, for three fields: the solver's breaking (strength > 0.3); the white drawn (the Canyon's drawn white, else
 * the whitewater the foam is fed: the solver's, or at Padang Padang the swept crash's, which waits for each tube's
 * touchdown); and the foam drawn (dense + residual > 0.3). Per field: the leading line (the run of neighbouring columns
 * whose most seaward white lies within LINK m across shore of the last), patches (other runs on its crest), waves (a new
 * one when the region's most seaward white jumps seaward by NEW_WAVE m), and per wave its typical and longest line, its
 * line SECTION_CHECK s after it starts (40 m or more: closing out at its peak) and each end's travel from its peak while
 * it moves as one line (no vanishing, no jump past JUMP m after SECTION s).
 *
 * First breaks: in every column of the region, the outermost breaking cell jumping more than 5 m seaward (at least 0.7 Tp
 * after the column's last, in water at least 0.4 h_b deep: the game's own onsets, without the Canyon reef's), with the
 * crest (the highest surface up to four cells seaward), its face's steepest metre (degrees) and its front over back mean
 * slope, the face height (`waveHeightAt`), the still depth, and the Iribarren number ξb = tan β / √(H / L0) with β the
 * bed's slope along the waves' path (+z) over ±2 cells at the crest (and, beside it, over the bed's whole gradient).
 *
 *   rolldown docs/research/all-spots-breaking-2026-10-28/spot-probe.ts -o dist/scripts/spot-probe.mjs --format esm --platform node \
 *     && node dist/scripts/spot-probe.mjs --spot point --size medium [--seed 1] [--periods 9] [--onset 0.45 | --onset-rule old] [--join 0.5] [--json <file>]
 */
import { writeFileSync } from 'node:fs';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { POINT_ONSET, padangReefAt, reefLedgeAt, type SpotName } from '../../../src/wave/Bathymetry';
import { POOL } from '../../../src/wave/pool';
import { waveHeightAt } from '../../../src/wave/CrestKinematics';
import { GRAVITY } from '../../../src/wave/dispersion';
import { SurfZoneSimulation, sweptBarrelOn, sweptCrashOn, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { libraryFromBytes } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const spot = (option('spot') ?? 'point') as SpotName;
const size = (option('size') ?? 'medium') as 'small' | 'medium' | 'big';
const seed = Number(option('seed') ?? 1);
const periods = Number(option('periods') ?? 9);
const onsetOverride = option('onset') !== undefined ? Number(option('onset')) : undefined;
const FRAME = 0.25;
const THRESHOLD = 0.3;
const SWASH = 0.5;
const LINK = 4;
const PATCH = 3;
const CREST = 12;
const NEW_WAVE = 15;
const JUMP = 6;
const SECTION = 1.5;
const ARM = 40;
const SECTION_CHECK = 2;
const EDGE = 25;

// `--point-onset k=v,…`: the Point's depth-keyed onset reshaped for a screen (`POINT_ONSET`: shallow, shallowDepth, deepDepth).
for (const pair of (option('point-onset') ?? '').split(',').filter(Boolean)) {
  const [key, value] = pair.split('=');
  if (!(key in POINT_ONSET)) throw new Error(`POINT_ONSET has no ${key}`);
  (POINT_ONSET as Record<string, number>)[key] = Number(value);
}
const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
// `--onset-rule old`: every spot's onset as before step 3b (`SurfZoneConfig.onsetRule`, the `?onset=old` dev switch).
const onsetRule = option('onset-rule') === 'old' ? 'old' as const : undefined;
const config: SurfZoneConfig = {
  ...surfZoneConfigFor(settings, seed, false), compute: 'cpu', ...(onsetOverride !== undefined ? { breakingOnset: onsetOverride } : {}), ...(onsetRule ? { onsetRule } : {}),
};
// A swept spot's barrel cases, as the game loads them (Padang Padang: its tubes drawn, its crash on, its white waiting for
// each tube's touchdown); without them the sea runs no barrel.
const barrel = sweptBarrelOn(config) ? libraryFromBytes(readBarrelCases(spot)) : undefined;
const sim = new SurfZoneSimulation(config, 'spun-up', barrel);
const { solver } = sim;
// `--join J`: a screen only, no game change: Kennedy's breaking age passes through the diagonal parents only where the
// cell rises at J √(g h) or faster (the Canyon reef's gate, `CANYON.ageJoin`; 0, rule A, every other spot's), set on the
// solver's options after the spin-up, so the measured periods run with it.
const joinOverride = option('join') !== undefined ? Number(option('join')) : undefined;
if (joinOverride !== undefined) (solver as unknown as { kennedy: { diagonalJoin: number } }).kennedy.diagonalJoin = joinOverride;
const { nx, nz, xCenters, zCenters } = solver;
const firstRow = solver.rowBelow(sim.tank.fineFrom);
const columnOf = (x: number) => Math.min(nx - 1, Math.max(0, Math.round((x - xCenters[0]) / solver.dx)));
const ridden: ((x: number) => boolean) | undefined = spot === 'reef' ? reefLedgeAt : spot === 'padang' ? padangReefAt
  : spot === 'pool' ? (x: number) => Math.abs(x) <= POOL.armLength + POOL.taperWidth : undefined;
let from = Infinity;
let to = -Infinity;
for (const x of xCenters) {
  if (x < xCenters[0] + EDGE || x > xCenters[nx - 1] - EDGE || (ridden && !ridden(x))) continue;
  from = Math.min(from, x);
  to = Math.max(to, x);
}
interface Region { name: string; from: number; to: number; tip: number; ends: { side: 1 | -1; x: number }[] }
// The Wave Pool is an A-frame: its two arms' lines break apart from its apex on, so each arm is a region of its own.
const regions: Region[] = spot === 'pool'
  ? [{ name: 'pool −x arm', from, to: 0, tip: Number.NaN, ends: [{ side: -1, x: from }] }, { name: 'pool +x arm', from: 0, to, tip: Number.NaN, ends: [{ side: 1, x: to }] }]
  : [{ name: spot, from, to, tip: Number.NaN, ends: [{ side: -1, x: from }, { side: 1, x: to }] }];
const internals = sim as unknown as { drawnWhitewater?: Float64Array; breakerDepth(): number };
const foamSum = new Float64Array(nx * nz);
const fields: { name: string; values: () => ArrayLike<number> }[] = [
  { name: 'solver', values: () => sim.breaking.strength },
  { name: 'drawn', values: () => internals.drawnWhitewater ?? sim.whitewaterStrength },
  { name: 'foam', values: () => {
    for (let i = 0; i < foamSum.length; i += 1) foamSum[i] = sim.foam.dense[i] + sim.foam.residual[i];
    return foamSum;
  } },
];

interface Line { from: number; to: number; along: number; arc: number; z: number; patches: number; t?: number }
interface Run { low: number; high: number; z: number; zLow: number; zHigh: number }
/** A region's white per column now (the most seaward white cell, NaN for none), and its runs along shore. */
function runsIn(values: ArrayLike<number>, region: Region): { c0: number; white: Float64Array; runs: Run[] } {
  const c0 = columnOf(region.from);
  const c1 = columnOf(region.to);
  const white = new Float64Array(c1 - c0 + 1).fill(Number.NaN);
  for (let col = c0; col <= c1; col += 1) {
    for (let iz = firstRow; iz < nz; iz += 1) {
      const i = iz * nx + col;
      if (values[i] > THRESHOLD && solver.restLevel - solver.bed[i] > SWASH && solver.h[i] > 0.05) { white[col - c0] = zCenters[iz]; break; }
    }
  }
  // Runs: neighbouring white columns within LINK m across shore of each other (one column may be skipped).
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
  return { c0, white, runs };
}

/**
 * One wave's white over time: the runs on its crest each frame (their white within CREST m across shore of where its crest
 * should be, run on at its own speed), its line (the longest of them), its patches (the rest), and each end's travel.
 */
interface Wave {
  start: number; z: number; speed: number; seen: number; frames: Line[]; tip: Line; reached: Map<number, { x: number; ok: boolean; t?: number }>;
  /** The widest gap between its line and a patch on its crest, m; the longest its line stayed split, s (and the streak now). */
  gap: number; split: number; streak: number;
}
const waves = new Map<string, Wave[]>();
const live = new Map<string, Wave[]>();
const frames = new Map<string, { length: number; patches: number }[]>();
function record(time: number): void {
  for (const field of fields) {
    const values = field.values();
    for (const region of regions) {
      const key = `${field.name} ${region.name}`;
      const { c0, runs } = runsIn(values, region);
      const active = (live.get(key) ?? []).filter((w) => time - w.seen <= 1);
      const taken = new Set<Run>();
      // Each live wave takes the runs on its crest (seaward waves first: they are the newest).
      for (const wave of [...active].sort((a, b) => a.z - b.z)) {
        const expected = wave.z + wave.speed * (time - wave.seen);
        const mine = runs.filter((r) => !taken.has(r) && Math.abs(r.z - expected) <= CREST);
        if (!mine.length) continue;
        for (const r of mine) taken.add(r);
        const main = mine.reduce((a, b) => (b.high - b.low > a.high - a.low ? b : a));
        // Its gaps: from the line to each patch on its crest, along shore.
        for (const r of mine) {
          if (r === main) continue;
          wave.gap = Math.max(wave.gap, (r.low > main.high ? r.low - main.high : main.low - r.high) * solver.dx);
        }
        wave.streak = mine.length > 1 ? wave.streak + FRAME : 0;
        wave.split = Math.max(wave.split, wave.streak);
        const line: Line = {
          from: xCenters[c0 + main.low], to: xCenters[c0 + main.high], along: (main.high - main.low) * solver.dx,
          arc: Math.hypot((main.high - main.low) * solver.dx, main.zHigh - main.zLow), z: main.z, patches: mine.length - 1, t: time,
        };
        wave.speed = time > wave.seen ? Math.max(0, Math.min(8, (line.z - wave.z) / (time - wave.seen))) * 0.5 + wave.speed * 0.5 : wave.speed;
        wave.z = line.z;
        wave.seen = time;
        wave.frames.push(line);
        (frames.get(key) ?? frames.set(key, []).get(key)!).push({ length: line.along, patches: line.patches });
        for (const [side, end] of wave.reached) {
          if (!end.ok) continue;
          const x = side > 0 ? line.to : line.from;
          // The peak's own section spreads freely for its first SECTION s; after it, a farther jump is a patch ahead joining.
          if (side * (x - end.x) > JUMP && time - wave.start > SECTION) wave.reached.set(side, { x: end.x, ok: false, t: end.t });
          else if (side * (x - end.x) > 0) wave.reached.set(side, { x, ok: true, t: time });
        }
      }
      // A wave not seen this frame stops travelling: its line vanished.
      for (const wave of active) {
        if (wave.seen === time) continue;
        for (const [side, end] of wave.reached) wave.reached.set(side, { ...end, ok: false });
      }
      // A run no live wave takes, seaward of them all, starts a new wave.
      const seaward = Math.min(Infinity, ...active.map((w) => w.z));
      for (const r of runs) {
        if (taken.has(r) || !(r.z < seaward - NEW_WAVE)) continue;
        const line: Line = {
          from: xCenters[c0 + r.low], to: xCenters[c0 + r.high], along: (r.high - r.low) * solver.dx,
          arc: Math.hypot((r.high - r.low) * solver.dx, r.zHigh - r.zLow), z: r.z, patches: 0, t: time,
        };
        const wave: Wave = { start: time, z: r.z, speed: 4, seen: time, frames: [line], tip: line, reached: new Map(), gap: 0, split: 0, streak: 0 };
        for (const end of region.ends) wave.reached.set(end.side, { x: end.side > 0 ? line.to : line.from, ok: true });
        (waves.get(key) ?? waves.set(key, []).get(key)!).push(wave);
        active.push(wave);
        (frames.get(key) ?? frames.set(key, []).get(key)!).push({ length: line.along, patches: 0 });
        break;
      }
      live.set(key, active.filter((w) => w.seen === time));
    }
  }
}


// First breaks, with the face's shape and ξb (the size report's `faceShape`, canyon-beach-break).
function faceShape(crest: number, reach: number): { front: number; asymmetry: number } {
  const ix = crest % nx;
  const iz = Math.floor(crest / nx);
  const eta = (j: number) => solver.surfaceAt(j * nx + ix);
  const top = eta(iz);
  let steepest = 0;
  let ahead = iz;
  for (let j = iz + 1; j < nz && zCenters[j] - zCenters[iz] <= reach; j += 1) {
    if (eta(j) > eta(j - 1)) break;
    steepest = Math.max(steepest, (eta(j - 1) - eta(j)) / (zCenters[j] - zCenters[j - 1]));
    ahead = j;
  }
  let behind = iz;
  for (let j = iz - 1; j >= 0 && zCenters[iz] - zCenters[j] <= reach; j -= 1) {
    if (eta(j) > eta(j + 1)) break;
    behind = j;
  }
  const front = ahead > iz ? (top - eta(ahead)) / (zCenters[ahead] - zCenters[iz]) : 0;
  const back = behind < iz ? (top - eta(behind)) / (zCenters[iz] - zCenters[behind]) : 0;
  return { front: (Math.atan(steepest) * 180) / Math.PI, asymmetry: back > 0 ? front / back : Number.NaN };
}
interface FirstBreak { t: number; x: number; z: number; depth: number; face: number; steepest: number; asymmetry: number; xi: number; xiFull: number }
const firstBreaks: FirstBreak[] = [];
const outer = new Float64Array(nx).fill(Infinity);
const lastFirst = new Float64Array(nx).fill(-Infinity);
const deepWave = (GRAVITY * config.peakPeriod ** 2) / (2 * Math.PI);
const breakerDepth = internals.breakerDepth();
const c0 = columnOf(from);
const c1 = columnOf(to);
let armed = false;
function watchFirstBreaks(): void {
  const strength = sim.breaking.strength;
  for (let col = c0; col <= c1; col += 1) {
    let z = Infinity;
    let row = -1;
    for (let iz = firstRow; iz < nz; iz += 1) {
      if (strength[iz * nx + col] > THRESHOLD) { z = zCenters[iz]; row = iz; break; }
    }
    const previous = outer[col];
    outer[col] = z;
    if (!armed || !(z < previous - 5) || solver.time - lastFirst[col] < 0.7 * config.peakPeriod) continue;
    if (!(solver.restLevel - solver.bed[row * nx + col] >= 0.4 * breakerDepth)) continue;
    lastFirst[col] = solver.time;
    let crest = row * nx + col;
    for (let iz = row - 1; iz >= Math.max(1, row - 4); iz -= 1) if (solver.surfaceAt(iz * nx + col) > solver.surfaceAt(crest)) crest = iz * nx + col;
    const cr = Math.floor(crest / nx);
    const depth = Math.max(0.05, solver.restLevel - solver.bed[crest]);
    const reach = 0.5 * config.peakPeriod * Math.sqrt(GRAVITY * depth);
    const shape = faceShape(crest, reach);
    const face = waveHeightAt(solver, crest, reach);
    const up = Math.min(nz - 1, cr + 2);
    const down = Math.max(0, cr - 2);
    const slopeZ = (solver.bed[up * nx + col] - solver.bed[down * nx + col]) / (zCenters[up] - zCenters[down]);
    const left = Math.max(0, col - 2);
    const right = Math.min(nx - 1, col + 2);
    const slopeX = (solver.bed[cr * nx + right] - solver.bed[cr * nx + left]) / (xCenters[right] - xCenters[left]);
    const steep = (slope: number) => (face > 0.05 ? slope / Math.sqrt(face / deepWave) : Number.NaN);
    firstBreaks.push({ t: solver.time, x: xCenters[col], z: zCenters[cr], depth, face, steepest: shape.front, asymmetry: shape.asymmetry, xi: steep(slopeZ), xiFull: steep(Math.hypot(slopeX, slopeZ)) });
  }
  armed = true;
}

const step = 1 / 30;
const perFrame = Math.round(FRAME / step);
const steps = Math.round((periods * config.peakPeriod) / step);
const t0 = Date.now();
const lips0 = sim.lipLaunches;
for (let n = 1; n <= steps; n += 1) {
  sim.step(step);
  watchFirstBreaks();
  if (n % perFrame === 0) record(solver.time);
}
const quantile = (values: number[], q: number) => {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? v[Math.min(v.length - 1, Math.floor(q * v.length))] : Number.NaN;
};
const fmt = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const onset = `${onsetOverride ?? (onsetRule ? '(as before step 3b)' : '(the spot\'s)')}${option('point-onset') ? ` point ${option('point-onset')}` : ''}${joinOverride !== undefined ? `, age join ${joinOverride}` : ''}`;
console.log(`${spot} ${size} seed ${seed}: Hs ${config.significantHeight.toFixed(2)} m, Tp ${config.peakPeriod} s, onset ${onset}${barrel ? `, swept barrel (${sweptCrashOn(config) ? 'crash on' : 'no crash'})` : ''}; ${periods} periods from ${(solver.time - periods * config.peakPeriod).toFixed(0)} s (${((Date.now() - t0) / 1000).toFixed(0)} s wall); region x ${fmt(from)}…${fmt(to)}; frames every ${FRAME} s`);
const json: Record<string, unknown> = { spot, size, seed, periods, hs: config.significantHeight, tp: config.peakPeriod, region: [from, to] };
for (const field of fields) {
  for (const region of regions) {
    const key = `${field.name} ${region.name}`;
    const list = (waves.get(key) ?? []).filter((w) => w.frames.length >= 4);
    const lines = frames.get(key) ?? [];
    const longest = list.map((w) => Math.max(...w.frames.map((l) => l.along)));
    const typical = list.map((w) => quantile(w.frames.map((l) => l.along), 0.5));
    const patchy = list.map((w) => w.frames.filter((l) => l.patches > 0).length / w.frames.length);
    const sections = list.map((w) => w.frames.find((l) => l.t! >= w.start + SECTION_CHECK)?.along ?? Number.NaN).filter(Number.isFinite);
    const ends = region.ends.map((end) => {
      const fromPeak = list.map((w) => { const r = w.reached.get(end.side)!; const peak = 0.5 * (w.tip.from + w.tip.to); return end.side * (r.x - peak); });
      const peel = list.map((w) => {
        const r = w.reached.get(end.side)!;
        const first = w.frames[0];
        if (!(r.t !== undefined && r.t - first.t! >= 2)) return Number.NaN;
        const v = Math.abs(r.x - (end.side > 0 ? first.to : first.from)) / (r.t - first.t!);
        const last = w.frames.filter((l) => l.t! <= r.t!).at(-1)!;
        const crest = (last.z - first.z) / (r.t - first.t!);
        return crest > 0 && v > 0 ? (Math.atan(crest / v) * 180) / Math.PI : Number.NaN;
      });
      return { side: end.side, reach40: list.filter((_, k) => fromPeak[k] >= ARM).length, reach: quantile(fromPeak, 0.5), reach90: quantile(fromPeak, 0.9), peel: quantile(peel, 0.5), peelWaves: peel.filter(Number.isFinite).length };
    });
    console.log(`${key}: ${list.length} waves; per wave typical line p50 ${fmt(quantile(typical, 0.5))} m (90th ${fmt(quantile(typical, 0.9))}), longest p50 ${fmt(quantile(longest, 0.5))} m (90th ${fmt(quantile(longest, 0.9))}), `
      + `frames with patches p50 ${fmt(100 * quantile(patchy, 0.5))} % (all frames ${fmt((100 * lines.filter((l) => l.patches > 0).length) / Math.max(1, lines.length))} %); `
      + `line ${SECTION_CHECK} s in p50 ${fmt(quantile(sections, 0.5))} m, ≥ 40 m ${sections.filter((v) => v >= 40).length} of ${sections.length}; `
      + ends.map((e) => `${e.side > 0 ? '+x' : '−x'} arm: one line ≥ ${ARM} m from its peak in ${e.reach40} of ${list.length}, end median ${fmt(e.reach)} m (90th ${fmt(e.reach90)}), visible peel ${fmt(e.peel)}° (${e.peelWaves})`).join('; '));
    json[key] = { waves: list.length, typical: quantile(typical, 0.5), typical90: quantile(typical, 0.9), longest: quantile(longest, 0.5), longest90: quantile(longest, 0.9), patches: quantile(patchy, 0.5), section: quantile(sections, 0.5), sectionClose: sections.filter((v) => v >= 40).length, ends,
      perWave: list.map((w) => ({ start: w.start, peak: 0.5 * (w.tip.from + w.tip.to), z: w.tip.z, reached: [...w.reached], lines: w.frames.map((l) => [Number(l.from.toFixed(1)), Number(l.to.toFixed(1)), Number(l.z.toFixed(1)), l.patches]) })) };
  }
}
const stats = (pick: (b: FirstBreak) => number, d = 1) => `${fmt(quantile(firstBreaks.map(pick), 0.5), d)} (${fmt(quantile(firstBreaks.map(pick), 0.1), d)}–${fmt(quantile(firstBreaks.map(pick), 0.9), d)})`;
console.log(`first breaks: ${firstBreaks.length}; depth ${stats((b) => b.depth)} m, face ${stats((b) => b.face, 2)} m, steepest metre ${stats((b) => b.steepest, 0)}°, front/back ${stats((b) => b.asymmetry, 2)}, ξb along the path ${stats((b) => b.xi, 2)}, over the whole gradient ${stats((b) => b.xiFull, 2)}; x ${stats((b) => b.x, 0)}`);
console.log(`lips thrown in the measured periods: ${sim.lipLaunches - lips0} (the Iribarren number at each column's onset said plunging)`);
json.lips = sim.lipLaunches - lips0;
json.firstBreaks = firstBreaks;
const out = option('json');
if (out) writeFileSync(out, JSON.stringify(json));
