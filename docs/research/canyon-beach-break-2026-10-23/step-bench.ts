/**
 * canyon-beach-break (2026-10-23): canyon-wave-r2's step bench, with `--tube on` (main's default Canyon); before it, canyon-long-wave's, with `--canyon key=value,...` (reshape today's layout) and
 * `--tube off` (no swept barrel, as the old layout runs), so a pair times one change at a time.
 *
 * The Canyon's CPU step on this machine, today's layout against the one before it (canyon-layout's, 2026-10-22, reused by canyon-long-wave): the game's
 * own sea at a size (`surfZoneConfigFor`, the GPU tier's 64 components, stage 2 on the CPU), spun up, then `--steps`
 * solver steps of 1/30 s timed one by one (the whole `SurfZoneSimulation.step`: the solver, breaking, foam, the front,
 * roller and curl). Prints the cells and the step's p50, mean and p95, ms.
 *
 *   rolldown docs/research/canyon-beach-break-2026-10-23/step-bench.ts -o dist/scripts/step-bench-bb.mjs --format esm --platform node \
 *     && node dist/scripts/step-bench-bb.mjs --size medium --steps 300 [--bed old] [--canyon key=value,...] [--tube on|off]
 */
import { performance } from 'node:perf_hooks';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const size = (option('size') ?? 'medium') as SwellSize;
const steps = Number(option('steps') ?? 300);
const bed = option('bed') === 'old' ? 'old' as const : undefined;
applyCanyonShape(option('canyon'));
const settings = physicalSettingsFor('canyon', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
const config: SurfZoneConfig = {
  ...surfZoneConfigFor(settings, 1, true), compute: 'cpu', ...(bed ? { canyonBed: bed } : {}), ...(option('tube') === 'off' ? { sweptBarrel: false } : option('tube') === 'on' ? { sweptBarrel: true } : {}),
};
const built = performance.now();
const simulation = new SurfZoneSimulation(config);
const { solver } = simulation;
console.log(`canyon ${size} (${bed ?? 'today'}${option('canyon') ? ` ${option('canyon')}` : ''}${option('tube') ? `, tube ${option('tube')}` : ''}): ${solver.nx} × ${solver.nz} = ${solver.nx * solver.nz} cells, ${config.componentCount} components; spun up in ${((performance.now() - built) / 1000).toFixed(1)} s`);
for (let i = 0; i < 30; i += 1) simulation.step(1 / 30);
const times: number[] = [];
for (let i = 0; i < steps; i += 1) {
  const t0 = performance.now();
  simulation.step(1 / 30);
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
const q = (p: number) => times[Math.min(times.length - 1, Math.floor(p * times.length))];
console.log(`step (1/30 s), ${steps} steps: p50 ${q(0.5).toFixed(2)} ms, mean ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)} ms, p95 ${q(0.95).toFixed(2)} ms; `
  + `${((q(0.5) * 1000) / (solver.nx * solver.nz)).toFixed(3)} µs a cell (p50)`);
