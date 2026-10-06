/**
 * How much the Canyon's spilling front changes the whitewater (the canyon spilling prototype): each second, the share
 * of the solver's breaking the foam is fed, the cells withheld ahead of a front and thinned behind it, and the fronts.
 *
 *   rolldown scripts/canyon-gate-probe.ts -o dist/scripts/canyon-gate-probe.mjs --format esm --platform node \
 *     && node dist/scripts/canyon-gate-probe.mjs --seconds 60
 */
import { SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

const option = (name: string, fallback: number) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? Number(process.argv[index + 1]) : fallback;
};
const config = {
  spot: 'canyon', seed: option('seed', 1), significantHeight: option('hs', 1.4), peakPeriod: option('tp', 11), directionDegrees: 0, spreading: 150,
  tide: 0, windSpeed: 0, stage: 2,
} as unknown as SurfZoneConfig;
const simulation = new SurfZoneSimulation(config);
const front = simulation.spilling!;
const step = 1 / 30;
let fed = 0;
let solver = 0;
let gated = 0;
let ramped = 0;
for (let frame = 1; frame <= option('seconds', 60) * 30; frame += 1) {
  simulation.step(step);
  const ww = simulation.whitewaterStrength;
  const b = simulation.breaking.strength;
  for (let i = 0; i < b.length; i += 1) {
    fed += ww[i];
    solver += b[i];
  }
  gated += front.gated;
  ramped += front.ramped;
  if (frame % 30 === 0) {
    console.log(`t=${simulation.solver.time.toFixed(0)} fed ${(solver > 0 ? (100 * fed) / solver : 100).toFixed(0)} % of the solver's breaking; gated ${(gated / 30).toFixed(0)} cells, ramped ${(ramped / 30).toFixed(0)} per step; ${front.describe()}`);
    fed = 0;
    solver = 0;
    gated = 0;
    ramped = 0;
  }
}
