/**
 * The test wave against the Canyon's Medium sea (`?testWave`, 2026-11-20): runs version B's surf zone (`?canyonWaves=true`)
 * on the Medium sea at a seed, or on the test wave's regular train at a height, and reads every wave's breaking along the
 * upcoast peak's +x arm from the solver's own onsets (`SurfZoneSimulation.onBreak`, the wave-sizes spec's measure): where
 * it first breaks (x, z, the still depth there) and its face there, the white's x against time from the tip along the arm
 * (the peel's direction and speed, a least-squares line), and the peel tracker's reading.
 *
 *   rolldown scripts/test-wave-report.ts -o dist/scripts/test-wave-report.mjs --format esm --platform node \
 *     && node dist/scripts/test-wave-report.mjs --sea medium --seed 2 --periods 8
 *   node dist/scripts/test-wave-report.mjs --sea test --height 1.6 --periods 8
 */
import { CANYON_B } from '../src/wave/Bathymetry';
import { SURF_ZONE_STEP } from '../src/wave/SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { TEST_WAVE } from '../src/wave/testWave';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const sea = option('sea') ?? 'test';
const seed = Number(option('seed') ?? TEST_WAVE.seed);
const periods = Number(option('periods') ?? 8);
const height = Number(option('height') ?? TEST_WAVE.height);
const components = Number(option('components') ?? 24);
const step = Number(option('step') ?? SURF_ZONE_STEP);

const tip = CANYON_B.takeOffX;
const config: SurfZoneConfig = sea === 'test'
  ? { spot: 'canyon', canyonBed: 'b', seed: TEST_WAVE.seed, significantHeight: height, peakPeriod: TEST_WAVE.period, directionDegrees: 0, spreading: TEST_WAVE.spreading, tide: 0, windSpeed: 0, stage: 2, componentCount: 1, testWave: 'ride' }
  : { spot: 'canyon', canyonBed: 'b', seed, significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0, stage: 2, componentCount: components };
const simulation = new SurfZoneSimulation(config);
const { solver } = simulation;
const depthAt = (x: number, z: number) => solver.restLevel - solver.sampleCentered(solver.bed, x, z);
const events: { time: number; x: number; z: number; face: number }[] = [];
simulation.onBreak = (wave) => {
  // The upcoast peak's +x arm, from just upcoast of its tip on into the bowl.
  if (wave.x >= tip - 4 && wave.x <= tip + 100) events.push({ ...wave, time: wave.time + (simulation.seaTime - solver.time) });
};
const started = Date.now();
const total = Math.round((periods * config.peakPeriod) / step);
for (let index = 0; index < total; index += 1) simulation.step(step);
console.log(`${sea} ${sea === 'test' ? `H ${height} m` : `seed ${seed}, ${components} components`}: ${periods} periods from sea time ${(simulation.seaTime - periods * config.peakPeriod).toFixed(1)} s, ${((Date.now() - started) / 1000).toFixed(0)} s wall`);

// Waves: each column breaks once a wave (`newBreaker`), so a wave's onsets run along the arm in time; an onset joins the
// wave whose last onset lies within 12 m and 3 s of it, else starts one.
interface Wave { onsets: typeof events }
const waves: Wave[] = [];
for (const event of [...events].sort((a, b) => a.time - b.time)) {
  let best: Wave | undefined;
  let bestGap = Infinity;
  for (const wave of waves) {
    const last = wave.onsets[wave.onsets.length - 1];
    if (event.time - last.time > 3) continue;
    const near = Math.min(...wave.onsets.map((o) => Math.abs(o.x - event.x)));
    if (near < 12 && near < bestGap) { best = wave; bestGap = near; }
  }
  if (best) best.onsets.push(event);
  else waves.push({ onsets: [event] });
}
const fit = (points: { t: number; x: number }[]) => {
  const n = points.length;
  if (n < 3) return Number.NaN;
  const mt = points.reduce((s, p) => s + p.t, 0) / n;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const stt = points.reduce((s, p) => s + (p.t - mt) ** 2, 0);
  return stt > 0 ? points.reduce((s, p) => s + (p.t - mt) * (p.x - mx), 0) / stt : Number.NaN;
};
const rows: { first: (typeof events)[number]; tipZ: number; tipFace: number; peel: number; peelArm: number; reach: number; columns: number }[] = [];
for (const wave of waves) {
  if (wave.onsets.length < 6) continue;
  const first = wave.onsets.reduce((a, b) => (b.time < a.time ? b : a));
  const atTip = wave.onsets.filter((o) => Math.abs(o.x - tip) <= 3);
  const tipZ = atTip.length ? atTip.reduce((s, o) => s + o.z, 0) / atTip.length : Number.NaN;
  const tipFace = atTip.length ? atTip.reduce((s, o) => s + o.face, 0) / atTip.length : Number.NaN;
  // The peel: the white's x against time, on the arm from the tip to 60 m along it (the open face before the bowl), and on the whole arm.
  const arm = wave.onsets.filter((o) => o.x >= tip && o.x <= tip + 60).map((o) => ({ t: o.time, x: o.x }));
  const whole = wave.onsets.filter((o) => o.x >= tip).map((o) => ({ t: o.time, x: o.x }));
  rows.push({ first, tipZ, tipFace, peel: fit(arm), peelArm: fit(whole), reach: Math.max(...wave.onsets.map((o) => o.x)) - tip, columns: wave.onsets.length });
}
for (const [index, row] of rows.entries()) {
  const { first } = row;
  console.log(`wave ${index + 1}: first break t ${first.time.toFixed(1)} s at x ${first.x.toFixed(1)} z ${first.z.toFixed(1)} (${depthAt(first.x, first.z).toFixed(2)} m deep), face ${first.face.toFixed(2)} m; at the tip z ${row.tipZ.toFixed(1)} face ${row.tipFace.toFixed(2)} m; peel ${row.peel >= 0 ? '+x' : '−x'} ${Math.abs(row.peel).toFixed(1)} m/s (tip to +60 m), ${row.peelArm.toFixed(1)} m/s whole arm to +${row.reach.toFixed(0)} m; ${row.columns} columns`);
}
const median = (values: number[]) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[sorted.length >> 1] : Number.NaN;
};
console.log(`median of ${rows.length} waves: first break x ${median(rows.map((r) => r.first.x)).toFixed(1)} z ${median(rows.map((r) => r.first.z)).toFixed(1)}, face ${median(rows.map((r) => r.first.face)).toFixed(2)} m; at the tip z ${median(rows.map((r) => r.tipZ)).toFixed(1)} face ${median(rows.map((r) => r.tipFace)).toFixed(2)} m; peel ${median(rows.map((r) => r.peel)).toFixed(1)} m/s (tip to +60), ${median(rows.map((r) => r.peelArm)).toFixed(1)} m/s whole arm`);
const estimate = simulation.peelEstimate(tip + 20);
if (estimate) console.log(`peel tracker at x ${tip + 20}: ${estimate.angleDegrees.toFixed(0)}° dir ${estimate.direction} speed ${estimate.peelSpeed.toFixed(1)} m/s fit ${estimate.fit.toFixed(2)}`);
