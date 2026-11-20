/**
 * pool-barrel (2026-11-01): the Wave Pool's CPU step on this machine, Barrel against Training, at a size: the game's own
 * sea (`surfZoneConfigFor`, the GPU tier's 64 components... one regular wave here; stage 2 on the CPU), spun up, then
 * `--steps` solver steps of 1/30 s timed one by one (the whole `SurfZoneSimulation.step`). Prints the cells and the step's
 * p50, mean and p95, ms, and how many steps took a second CFL substep (the solver's `substeps`, where it reports them).
 *   rolldown docs/research/pool-barrel-2026-11-01/step-bench.ts -o dist/scripts/pool-step-bench.mjs --format esm --platform node \
 *     && node dist/scripts/pool-step-bench.mjs --size small|medium|big [--waves barrel] --steps 300
 */
import { performance } from 'node:perf_hooks';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const size = (option('size') ?? 'medium') as SwellSize;
const steps = Number(option('steps') ?? 300);
const waves = option('waves') === 'barrel' ? 'barrel' as const : undefined;
const settings = physicalSettingsFor('pool', { swell: size, tide: 'mid', wind: 'calm', time: 'midday', ...(waves ? { waves } : {}) }, { stage: 2, compute: 'cpu' });
const config: SurfZoneConfig = { ...surfZoneConfigFor(settings, 1, true), compute: 'cpu' };
const built = performance.now();
const simulation = new SurfZoneSimulation(config);
const { solver } = simulation;
console.log(`pool ${waves ?? 'training'} ${size} (Hs ${config.significantHeight.toFixed(3)}): ${solver.nx} × ${solver.nz} = ${solver.nx * solver.nz} cells; spun up in ${((performance.now() - built) / 1000).toFixed(1)} s`);
for (let i = 0; i < 30; i += 1) simulation.step(1 / 30);
const times: number[] = [];
for (let i = 0; i < steps; i += 1) {
  const t0 = performance.now();
  simulation.step(1 / 30);
  times.push(performance.now() - t0);
}
const sorted = [...times].sort((a, b) => a - b);
const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
console.log(`step p50 ${at(0.5).toFixed(1)} ms, mean ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} ms, p95 ${at(0.95).toFixed(1)} ms over ${steps} steps; lip jets ${simulation.lipJets}`);
