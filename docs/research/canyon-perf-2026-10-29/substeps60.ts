/**
 * The game's own step (1/60 s) and the solver's substeps (canyon-perf, 2026-10-29): canyon-wave-r2's `substeps.ts` timed
 * 1/30 s steps, where Big's eddy viscosity splits two in three; the worker steps 1/60 s. From a saved sea
 * (scripts/m1-cpu-bench.ts `--state`), the share of 1/60 s steps split into substeps over `--steps` steps, and by which
 * limit, the advective CFL or the eddy viscosity's 0.2 dx² / ν_peak.
 *   rolldown docs/research/canyon-perf-2026-10-29/substeps60.ts -o dist/scripts/substeps60.mjs --format esm --platform node \
 *     && node dist/scripts/substeps60.mjs --state <sea> --size big --steps 1800
 */
import { readFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { ShallowWaterSolver } from '../../../src/wave/ShallowWaterSolver';
import { SurfZoneSimulation } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const size = (option('size') ?? 'big') as SwellSize;
const steps = Number(option('steps') ?? 1800);
const dt = 1 / Number(option('rate') ?? 60);
const settings = physicalSettingsFor('canyon', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
const sim = new SurfZoneSimulation({ ...surfZoneConfigFor(settings, 8761, true), compute: 'cpu' }, 'warm');
sim.importState(decodeSurfZoneState(new Uint8Array(readFileSync(option('state')!))));
const solver = sim.solver;
const from = solver.time;
let split = 0; let viscous = 0; let substeps = 0;
for (let i = 0; i < steps; i += 1) {
  const advective = ShallowWaterSolver.prototype.maxStableStep.call(solver);
  const stable = solver.maxStableStep();
  const n = Math.ceil(dt / stable);
  substeps += n;
  if (n > 1) { split += 1; if (stable < advective) viscous += 1; }
  sim.step(dt);
}
console.log(`canyon ${size}, 1/${Math.round(1 / dt)} s steps, t ${from.toFixed(1)}–${solver.time.toFixed(1)} s: ${split} of ${steps} steps split (${viscous} by the eddy viscosity), ${(substeps / steps).toFixed(3)} substeps a step`);
