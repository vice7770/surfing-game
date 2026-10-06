/**
 * The Canyon's peel, wave by wave (the canyon spilling prototype, docs/research/canyon-spilling-2026-10-05): runs the
 * Canyon's surf zone with a square (0°), narrow (s = 150) groundswell and samples, once per peak period, the
 * PeelTracker's angle, direction (+1 toward +x: left to right seen from the beach) and fit, plus the lip's
 * jets and rollers and the spilling front's state.
 *
 *   rolldown scripts/canyon-peel-report.ts -o dist/scripts/canyon-peel-report.mjs --format esm --platform node \
 *     && node dist/scripts/canyon-peel-report.mjs --hs 1.4 --tp 11 --periods 16 --seeds 2
 */
import { MIXED_PEAK_FIT } from '../src/wave/Breaking';
import { SurfZoneSimulation, takeOffPoint, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from './canyonShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const number = (name: string, fallback: number) => Number(option(name) ?? fallback);
const hs = number('hs', 1.4);
const tp = number('tp', 11);
const periods = number('periods', 16);
const seeds = number('seeds', 2);
const direction = number('direction', 0);
const spreading = number('spreading', 150);
applyCanyonShape(option('canyon'));

const angles: number[] = [];
const directions: number[] = [];
const speeds: number[] = [];
let jets = 0;
let rollers = 0;
for (let seed = 1; seed <= seeds; seed += 1) {
  const config = {
    spot: 'canyon', seed, significantHeight: hs, peakPeriod: tp, directionDegrees: direction, spreading, tide: 0, windSpeed: 0, stage: 2,
  } as unknown as SurfZoneConfig;
  const simulation = new SurfZoneSimulation(config);
  const takeOff = takeOffPoint(config);
  console.log(`seed ${seed}: take-off x=${takeOff.x.toFixed(1)} z=${takeOff.z.toFixed(1)}, iribarren ${simulation.iribarren().value.toFixed(2)} ${simulation.iribarren().type}`);
  const events: { time: number; x: number; z: number; face: number }[] = [];
  simulation.onBreak = (wave) => events.push({ ...wave });
  const verbose = process.argv.includes('--verbose');
  const step = 1 / 30;
  const perPeriod = Math.round(tp / step);
  for (let period = 0; period < periods; period += 1) {
    for (let index = 0; index < perPeriod; index += 1) simulation.step(step);
    const estimate = simulation.peelEstimate();
    if (verbose) {
      const bins = new Map<number, string>();
      for (const e of events) {
        const bin = Math.floor(e.x / 10) * 10;
        if (!bins.has(bin)) bins.set(bin, `${bin}:${(e.time - simulation.solver.time + tp).toFixed(1)}s@${e.z.toFixed(0)}(${e.face.toFixed(1)})`);
      }
      console.log('    ' + [...bins.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1]).join(' '));
      events.length = 0;
    }
    const front = (simulation as unknown as { spilling?: { describe(): string } }).spilling?.describe() ?? '';
    if (!estimate) {
      console.log(`  t=${simulation.solver.time.toFixed(0)} no wave ${front}`);
      continue;
    }
    const clean = estimate.fit >= MIXED_PEAK_FIT;
    console.log(`  t=${simulation.solver.time.toFixed(0)} angle ${estimate.angleDegrees.toFixed(0)}° dir ${estimate.direction} fit ${estimate.fit.toFixed(2)} speed ${estimate.peelSpeed.toFixed(1)} cols ${estimate.columns}${clean ? '' : ' (mixed)'} ${front}`);
    if (clean) {
      angles.push(estimate.angleDegrees);
      directions.push(estimate.direction);
      speeds.push(estimate.peelSpeed);
    }
  }
  jets += simulation.lipJets;
  rollers += simulation.lipRollers;
}
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[sorted.length >> 1] : Number.NaN;
};
console.log(`clean waves ${angles.length}; median angle ${median(angles).toFixed(0)}°; +x ${directions.filter((d) => d > 0).length}, −x ${directions.filter((d) => d < 0).length}; median peel speed ${median(speeds).toFixed(1)} m/s; lip jets ${jets}, rollers ${rollers}`);
