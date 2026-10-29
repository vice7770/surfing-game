/**
 * The worker's snapshot fields alone (canyon-perf, 2026-10-29): a saved sea (scripts/m1-cpu-bench.ts `--state`) stepped a
 * few steps, then `writeUniformSnapshot` timed on that held state, and its two passes apart (the cells' velocities, cover
 * and air; the render nodes' interpolation), so a change can be judged by where its time goes.
 *   rolldown docs/research/canyon-perf-2026-10-29/snapshot-bench.ts -o dist/scripts/snapshot-bench.mjs --format esm --platform node \
 *     && node dist/scripts/snapshot-bench.mjs --state <sea> [--size medium] [--reps 60]
 */
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { SurfZoneRunner } from '../../../src/wave/SurfZoneRunner';
import { decodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const size = (option('size') ?? 'medium') as SwellSize;
const reps = Number(option('reps') ?? 60);
const settings = physicalSettingsFor('canyon', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
const runner = SurfZoneRunner.forWorker(surfZoneConfigFor(settings, 8761, true), { rider: true }, 'warm');
runner.simulation.importState(decodeSurfZoneState(new Uint8Array(readFileSync(option('state')!))));
await runner.spinUp();
for (let k = 0; k < 10; k += 1) runner.advance(1, { paddle: false, popUp: false, steer: 0, retry: false });
const buffers = runner.createBuffers();
const sim = runner.simulation as unknown as { writeUniformSnapshot(s: Float32Array, f: Float32Array, a: Float32Array, g: unknown): void; solver: { nx: number; nz: number } };
const grid = runner.grid;
const time = (label: string, run: () => void) => {
  for (let k = 0; k < 5; k += 1) run();
  const ms: number[] = [];
  for (let k = 0; k < reps; k += 1) { const t = performance.now(); run(); ms.push(performance.now() - t); }
  ms.sort((a, b) => a - b);
  console.log(`${label.padEnd(28)} p50 ${ms[Math.floor(reps / 2)].toFixed(2)} ms, p10 ${ms[Math.floor(reps / 10)].toFixed(2)}`);
};
console.log(`canyon ${size}: ${sim.solver.nx} × ${sim.solver.nz} cells, render ${grid.nx} × ${grid.nz}`);
time('writeUniformSnapshot', () => sim.writeUniformSnapshot(buffers.surface, buffers.flow, buffers.aeration, grid));
time('fill (the whole snapshot)', () => runner.fill(buffers));
const status = runner as unknown as { status(): unknown };
time('status (the summary)', () => status.status());
