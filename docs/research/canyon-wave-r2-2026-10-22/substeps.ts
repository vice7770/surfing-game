/**
 * Why the Canyon's Big step costs more with the breaking-age join (canyon-wave-r2, 2026-10-22): over 300 steps of 1/30 s
 * after spin-up, the share of steps the solver splits into substeps, and which limit sets the stable step: the
 * advective CFL (|u| + √(g h)) or the eddy viscosity's (0.2 dx² / ν_peak).
 *   rolldown docs/research/canyon-wave-r2-2026-10-22/substeps.ts -o dist/scripts/substeps.mjs --format esm --platform node \
 *     && node dist/scripts/substeps.mjs --size big [--canyon ageJoin=0]
 */
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { ShallowWaterSolver } from '../../../src/wave/ShallowWaterSolver';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const size = (option('size') ?? 'big') as SwellSize;
applyCanyonShape(option('canyon'));
const settings = physicalSettingsFor('canyon', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
const config: SurfZoneConfig = { ...surfZoneConfigFor(settings, 1, true), compute: 'cpu', sweptBarrel: false };
const sim = new SurfZoneSimulation(config);
const solver = sim.solver;
const dt = 1 / 30;
let split = 0; let viscous = 0; const ratios: number[] = [];
for (let i = 0; i < 330; i += 1) {
  if (i >= 30) {
    const advective = ShallowWaterSolver.prototype.maxStableStep.call(solver);
    const stable = solver.maxStableStep();
    if (Math.ceil(dt / stable) > 1) { split += 1; if (stable < advective) viscous += 1; }
    ratios.push(dt / advective);
  }
  sim.step(dt);
}
ratios.sort((a, b) => a - b);
console.log(`canyon ${size} ${option('canyon') ?? 'today'}: ${split} of 300 steps split (${viscous} by the eddy viscosity); dt over the advective limit p50 ${ratios[150].toFixed(2)}, p95 ${ratios[285].toFixed(2)}, max ${ratios[299].toFixed(2)}`);
