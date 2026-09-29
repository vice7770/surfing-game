// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): Padang Padang's peel wave by wave.
// The peel meter fits a period's onsets at once (Breaking.ts PeelTracker, sampled once per peak period by the rideability
// report). A slow peel down Padang Padang's 130 m reef takes about as long as its 16 s period, so a period's onsets mix
// the tail of one wave with the head of the next, and a line through both reads as a fast peel. Here every onset is kept,
// grouped into waves by its time shifted along the reef at a guessed peel speed (a wave's onsets share it; waves come a
// period apart), and each wave is fitted on its own: speed along its break line, the meter's angle (√(g h_b)) and the
// geometric one (crests at breaking run 1.2 times faster: Tissier et al. 2013, the advisor's lower bound).
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { PADANG, createSpot, padangReefAt } from '../Bathymetry';
import { SurfZoneSimulation } from '../SurfZoneSimulation';

it.skipIf(!process.env.PROBE)('fits Padang Padang’s peel wave by wave', () => {
  for (const pair of (process.env.PADANG ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');
    (PADANG as Record<string, number>)[key] = Number(value);
  }
  const period = Number(process.env.TP ?? 16);
  const simulation = new SurfZoneSimulation({
    spot: 'padang', seed: Number(process.env.SEED ?? 1), significantHeight: Number(process.env.HS ?? 1.6), peakPeriod: period,
    directionDegrees: Number(process.env.DIRECTION ?? 0), spreading: Number(process.env.SPREADING ?? 150), tide: 0, windSpeed: 0, componentCount: 24,
  });
  const bed = createSpot('padang', 1);
  const { solver } = simulation;
  const xs = solver.xCenters;
  const tracker = simulation.peel as unknown as { onset: Float64Array; onsetZ: Float64Array };
  const columns = Array.from(xs, (_, column) => column).filter((column) => padangReefAt(xs[column]) && simulation.peel.measures(column));
  const last = new Float64Array(xs.length).fill(Number.NaN);
  const onsets: { x: number; t: number; z: number }[] = [];
  const from = Number(process.env.FROM ?? 144);
  const until = from + Number(process.env.SECONDS ?? 400);
  while (solver.time < until) {
    simulation.step(1 / 30);
    for (const column of columns) {
      const t = tracker.onset[column];
      if (!(t > 0) || t === last[column]) continue;
      last[column] = t;
      if (t >= from) onsets.push({ x: xs[column], t, z: tracker.onsetZ[column] });
    }
  }
  // Group: a wave's onsets share t − x / guess; successive waves differ by about a period.
  const guess = Number(process.env.GUESS ?? 8);
  const keyed = onsets.map((onset) => ({ ...onset, key: onset.t - onset.x / guess })).sort((p, q) => p.key - q.key);
  const waves: (typeof keyed)[] = [];
  for (const onset of keyed) {
    const wave = waves[waves.length - 1];
    if (wave && onset.key - wave[wave.length - 1].key < period / 3) wave.push(onset);
    else waves.push([onset]);
  }
  const breakerCelerity = simulation.breakerCelerity();
  /** A set of onsets' break line: speed along it, its dz/dx, the r² of time against x, and which way it peels. */
  const fitOf = (set: typeof keyed) => {
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
    const line = sxz / sxx;
    return { mt, speed: Math.hypot(1, line) / Math.abs(slope), line, fit: (sxt * sxt) / (sxx * stt), leftward: slope > 0 };
  };
  const angle = (speed: number, factor: number) => (Math.asin(Math.min(1, (factor * breakerCelerity) / speed)) * 180) / Math.PI;
  const clean: { speed: number; peak: number; down: number }[] = [];
  log(`PADANG ${JSON.stringify(PADANG)}; ${onsets.length} onsets on ${columns.length} reef columns, t ${from}–${until} s; guess ${guess} m/s along x; √(g h_b) ${breakerCelerity.toFixed(2)} m/s`);
  for (const wave of waves) {
    const xsOf = [...new Set(wave.map((onset) => onset.x))];
    if (xsOf.length < 20) continue;
    const whole = fitOf(wave);
    const depth = wave.reduce((sum, onset) => sum + bed.depthAt(onset.x, onset.z), 0) / wave.length;
    // The peak's half and the down-reef half apart: crests reaching the down-reef half already tilted peel faster there.
    const peakHalf = wave.filter((onset) => onset.x < 0);
    const downHalf = wave.filter((onset) => onset.x >= 0);
    const half = (set: typeof keyed) => (new Set(set.map((onset) => onset.x)).size >= 10 ? fitOf(set) : undefined);
    const peak = half(peakHalf);
    const down = half(downHalf);
    const halfText = (label: string, h: ReturnType<typeof fitOf> | undefined) => (h ? `${label} ${h.speed.toFixed(1)} m/s (fit ${h.fit.toFixed(2)})` : `${label} -`);
    if (whole.fit > 0.8 && whole.leftward) clean.push({ speed: whole.speed, peak: peak?.speed ?? Number.NaN, down: down?.speed ?? Number.NaN });
    log(`wave at t ${whole.mt.toFixed(0)} s: ${xsOf.length} columns, x ${Math.min(...xsOf).toFixed(0)}…${Math.max(...xsOf).toFixed(0)}, ${whole.speed.toFixed(1)} m/s along a line of dz/dx ${whole.line.toFixed(2)} (fit ${whole.fit.toFixed(2)}, ${whole.leftward ? 'toward +x' : 'toward −x'}), onset depth ${depth.toFixed(1)} m; α ${angle(whole.speed, 1).toFixed(0)}° on the meter, ${angle(whole.speed, 1.2).toFixed(0)}° geometric | ${halfText('peak half', peak)}, ${halfText('down-reef half', down)}`);
  }
  // The middle value, or the mean of the middle two.
  const median = (values: number[]) => {
    const sorted = values.filter((value) => Number.isFinite(value)).sort((p, q) => p - q);
    const m = sorted.length / 2;
    return sorted.length === 0 ? Number.NaN : sorted.length % 2 ? sorted[Math.floor(m)] : (sorted[m - 1] + sorted[m]) / 2;
  };
  const speeds = clean.map((wave) => wave.speed);
  const geometric = speeds.map((speed) => angle(speed, 1.2));
  log(`clean waves (fit > 0.8, peeling toward +x): ${clean.length}; median ${median(speeds).toFixed(1)} m/s (geometric α ${angle(median(speeds), 1.2).toFixed(0)}°; ≥ 27°: ${geometric.filter((a) => a >= 27).length}, 30–40°: ${geometric.filter((a) => a >= 30 && a <= 40).length}); peak half ${median(clean.map((wave) => wave.peak)).toFixed(1)} m/s, down-reef half ${median(clean.map((wave) => wave.down)).toFixed(1)} m/s`);
}, 7_200_000);
