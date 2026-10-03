// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): Padang Padang's two peels, wave by wave (the advisor,
// 2026-09-30). The whitewater's: the solver's breaking onsets per reef column (the peel meter's, as the waves probe
// reads them). The barrel's: the swept barrel's front joins, and its lips' throws (where each crest crosses its throw
// depth). All grouped into waves the waves probe's way (time
// shifted along the reef at a guessed speed) and fitted on their own, speed along each break line, then paired by wave
// and set beside the design's 11.6 m/s (the build sheet). Seed and swell as the waves probe; FROM, SECONDS.
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { padangReefAt } from '../Bathymetry';
import { SurfZoneSimulation } from '../SurfZoneSimulation';

interface Onset { x: number; t: number; z: number }

/** A set of onsets' break line: speed along it, the r² of time against x, and which way it peels. */
function fitOf(set: readonly Onset[]) {
  const n = set.length;
  const mx = set.reduce((sum, onset) => sum + onset.x, 0) / n;
  const mt = set.reduce((sum, onset) => sum + onset.t, 0) / n;
  const mz = set.reduce((sum, onset) => sum + onset.z, 0) / n;
  let sxx = 0; let sxt = 0; let stt = 0; let sxz = 0;
  for (const onset of set) {
    const dx = onset.x - mx;
    sxx += dx * dx; sxt += dx * (onset.t - mt); stt += (onset.t - mt) ** 2; sxz += dx * (onset.z - mz);
  }
  const slope = sxt / sxx;
  return { mt, speed: Math.hypot(1, sxz / sxx) / Math.abs(slope), fit: (sxt * sxt) / (sxx * stt), leftward: slope > 0 };
}

/** Onsets grouped into waves: a wave's share t − x / guess; successive waves differ by about a period. */
function waves(onsets: readonly Onset[], guess: number, period: number): (Onset & { key: number })[][] {
  const keyed = onsets.map((onset) => ({ ...onset, key: onset.t - onset.x / guess })).sort((p, q) => p.key - q.key);
  const out: (typeof keyed)[] = [];
  for (const onset of keyed) {
    const wave = out[out.length - 1];
    if (wave && onset.key - wave[wave.length - 1].key < period / 3) wave.push(onset);
    else out.push([onset]);
  }
  return out;
}

it.skipIf(!process.env.PROBE)('pairs Padang Padang’s whitewater and barrel peels wave by wave', () => {
  const period = Number(process.env.TP ?? 16);
  const simulation = new SurfZoneSimulation({
    spot: 'padang', seed: Number(process.env.SEED ?? 1), significantHeight: Number(process.env.HS ?? 1.6), peakPeriod: period,
    directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0, componentCount: 24,
  });
  const { solver } = simulation;
  const xs = solver.xCenters;
  const tracker = simulation.peel as unknown as { onset: Float64Array; onsetZ: Float64Array };
  const columns = Array.from(xs, (_, column) => column).filter((column) => padangReefAt(xs[column]) && simulation.peel.measures(column));
  const last = new Float64Array(xs.length).fill(Number.NaN);
  const whitewater: Onset[] = [];
  const barrel: Onset[] = [];
  const throws: Onset[] = [];
  const known = new Set<number>();
  const thrown = new Set<number>();
  const from = Number(process.env.FROM ?? 144);
  const until = from + Number(process.env.SECONDS ?? 300);
  while (solver.time < until) {
    simulation.step(1 / 30);
    for (const column of columns) {
      const t = tracker.onset[column];
      if (!(t > 0) || t === last[column]) continue;
      last[column] = t;
      if (t >= from) whitewater.push({ x: xs[column], t, z: tracker.onsetZ[column] });
    }
    for (const point of simulation.front!.points) {
      if (!known.has(point.id)) {
        known.add(point.id);
        if (point.joined >= from && padangReefAt(point.x)) barrel.push({ x: point.x, t: point.joined, z: point.z });
      }
      if (point.thrown === null || thrown.has(point.id)) continue;
      thrown.add(point.id);
      if (point.thrown >= from && padangReefAt(point.x)) throws.push({ x: point.x, t: point.thrown, z: point.z });
    }
  }
  const guess = Number(process.env.GUESS ?? 8);
  const white = waves(whitewater, guess, period).filter((wave) => new Set(wave.map((o) => o.x)).size >= 20);
  const barrelWaves = waves(barrel, guess, period).filter((wave) => new Set(wave.map((o) => o.x)).size >= 10);
  const throwWaves = waves(throws, guess, period).filter((wave) => new Set(wave.map((o) => o.x)).size >= 10);
  log(`${whitewater.length} whitewater onsets, ${barrel.length} barrel joins and ${throws.length} throws on ${columns.length} reef columns, t ${from}–${until} s; the design's peel 11.6 m/s`);
  const pairs: { white: number; barrel: number }[] = [];
  const throwPairs: { white: number; thrown: number }[] = [];
  const keyOf = (wave: readonly { key: number }[]) => wave.reduce((sum, o) => sum + o.key, 0) / wave.length;
  const columnsOf = (wave: readonly Onset[]) => new Set(wave.map((o) => o.x)).size;
  for (const wave of white) {
    const w = fitOf(wave);
    const key = keyOf(wave);
    const match = barrelWaves.find((candidate) => Math.abs(keyOf(candidate) - key) < period / 3);
    const b = match ? fitOf(match) : undefined;
    const clean = w.fit > 0.8 && w.leftward && b && b.fit > 0.8 && b.leftward;
    if (clean) pairs.push({ white: w.speed, barrel: b.speed });
    const lips = throwWaves.find((candidate) => Math.abs(keyOf(candidate) - key) < period / 3);
    const t = lips ? fitOf(lips) : undefined;
    if (w.fit > 0.8 && w.leftward && t && t.fit > 0.8 && t.leftward) throwPairs.push({ white: w.speed, thrown: t.speed });
    log(`wave at t ${w.mt.toFixed(0)} s: whitewater ${w.speed.toFixed(1)} m/s (fit ${w.fit.toFixed(2)}, ${columnsOf(wave)} columns)` +
      (b ? `, barrel joins ${b.speed.toFixed(1)} m/s (fit ${b.fit.toFixed(2)}, ${columnsOf(match!)} columns)${clean ? `, joins/whitewater ${(b.speed / w.speed).toFixed(2)}` : ''}` : ', no barrel') +
      (t ? `, throws ${t.speed.toFixed(1)} m/s (fit ${t.fit.toFixed(2)}, ${columnsOf(lips!)} columns)` : ', no throws'));
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  if (pairs.length) {
    log(`clean pairs (both fits > 0.8, peeling toward +x): ${pairs.length}; median whitewater ${median(pairs.map((p) => p.white)).toFixed(1)} m/s, barrel joins ${median(pairs.map((p) => p.barrel)).toFixed(1)} m/s, ratio ${median(pairs.map((p) => p.barrel / p.white)).toFixed(2)}; the design 11.6 m/s`);
  } else log('no clean pairs');
  if (throwPairs.length) {
    log(`clean throw pairs: ${throwPairs.length}; median whitewater ${median(throwPairs.map((p) => p.white)).toFixed(1)} m/s, throws ${median(throwPairs.map((p) => p.thrown)).toFixed(1)} m/s, ratio ${median(throwPairs.map((p) => p.thrown / p.white)).toFixed(2)}`);
  } else log('no clean throw pairs');
}, 7_200_000);
