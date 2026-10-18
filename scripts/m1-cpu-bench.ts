/**
 * The worker's CPU stages on this machine, in Node (the M1 CPU study, 2026-10-19): the game's sea at a spot and size,
 * ridden by an idle-then-paddling rider as `gpu-check.html?mode=replay` rides it, stepped on the CPU solver one 1/60 s
 * request at a time and filled into a snapshot after each, as the worker does. Reports each stage's p50/p95 ms (the
 * water's own CPU step is left out: on the device it is the GPU's) and a SHA-256 over every step's snapshot and the
 * final state arrays, so two builds that print the same hashes stepped and published the same bytes.
 *
 * The first run spins the sea up on the CPU and keeps it in `--state` (default under /tmp); later runs start from it.
 *
 *   rolldown scripts/m1-cpu-bench.ts -o dist/scripts/m1-cpu-bench.mjs --format esm --platform node
 *   node dist/scripts/m1-cpu-bench.mjs --spot canyon --steps 240
 *   node --cpu-prof --cpu-prof-dir=/tmp/prof dist/scripts/m1-cpu-bench.mjs --spot padang --steps 120 --hash 0
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { surfZoneConfigFor } from '../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../src/game/SurfConditions';
import { readBarrelCases } from '../src/wave/barrel/nodeBarrelCases';
import { BoussinesqSolver } from '../src/wave/BoussinesqSolver';
import { SurfZoneRunner, type SurfZoneStatus } from '../src/wave/SurfZoneRunner';
import { sweptBarrelOn, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../src/wave/surfZoneState';

const option = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const spot = (option('spot') ?? 'canyon') as SurfZoneConfig['spot'];
const size = (option('size') ?? 'medium') as SwellSize;
const steps = Number(option('steps') ?? 240);
const seed = Number(option('seed') ?? 8761);
const hashing = option('hash') !== '0';
const statePath = option('state') ?? `/tmp/m1-cpu-bench-${spot}-${size}-${seed}.sea`;
/** Steps after the import before timing starts (the rider settles; caches fill). */
const warm = Number(option('warm') ?? 20);

type Pipeline = NonNullable<SurfZoneStatus['pipelineMs']>;

async function main(): Promise<void> {
  const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const config = surfZoneConfigFor(settings, seed, true);
  const barrelCases = sweptBarrelOn(config) ? readBarrelCases(spot) : undefined;
  const runner = SurfZoneRunner.forWorker(config, { rider: true, ...(barrelCases ? { barrelCases } : {}) }, 'warm');
  const built = performance.now();
  if (existsSync(statePath)) {
    runner.simulation.importState(decodeSurfZoneState(new Uint8Array(readFileSync(statePath))));
    await runner.spinUp();
  } else {
    await runner.spinUp();
    writeFileSync(statePath, encodeSurfZoneState(runner.simulation.exportState()));
    // Start from the saved (32-bit) sea, as later runs do.
    runner.simulation.importState(decodeSurfZoneState(new Uint8Array(readFileSync(statePath))));
    console.log(`spun up on the CPU in ${((performance.now() - built) / 1000).toFixed(1)} s; kept in ${statePath}`);
  }
  const { solver } = runner.simulation;
  console.log(`${spot} ${size}, ${config.componentCount ?? 24} components, ${solver.nx} × ${solver.nz} = ${solver.nx * solver.nz} cells, render ${runner.grid.nx} × ${runner.grid.nz}, solver t ${solver.time.toFixed(3)}`);
  const buffers = runner.createBuffers();
  const snapshotHash = createHash('sha256');
  const samples: Pipeline[] = [];
  for (let frame = 0; frame < warm + steps; frame += 1) {
    const paddle = frame >= (warm + steps) / 3;
    runner.advance(1, { paddle, popUp: false, steer: paddle ? 0.3 * Math.sin(frame / 20) : 0, retry: false });
    runner.fill(buffers);
    const status = runner.status();
    if (frame >= warm) samples.push({ ...status.pipelineMs! });
    if (hashing) {
      for (const array of [buffers.surface, buffers.flow, buffers.aeration, buffers.lip, buffers.tubes, buffers.bubbles, buffers.spray,
        buffers.board, buffers.rider, buffers.lipHits, buffers.strokeHits, buffers.roar, buffers.reaction, buffers.front, buffers.roller]) {
        snapshotHash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      }
      snapshotHash.update(JSON.stringify([buffers.lipCount, buffers.tubeCount, buffers.bubbleCount, buffers.sprayCount, buffers.lipHitCount,
        buffers.strokeHitCount, buffers.frontCount, buffers.rollerCount, status.breakingFraction, status.lipLaunches, status.spray]));
    }
  }
  const quantile = (values: number[], q: number) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : Number.NaN;
  };
  const keys: (keyof Pipeline)[] = ['breaking', 'roller', 'front', 'lip', 'foam', 'airSources', 'aeration', 'contact', 'board', 'bubbles', 'spray',
    'sounds', 'snapshotFields', 'snapshot', 'summary'] as (keyof Pipeline)[];
  const line = keys.map((key) => {
    const values = samples.map((sample) => sample[key] as number);
    return `${key} ${quantile(values, 0.5).toFixed(2)}/${quantile(values, 0.95).toFixed(2)}`;
  });
  const cpuOnly = samples.map((sample) => sample.step - sample.water + sample.snapshot + sample.summary);
  console.log(`ms p50/p95 over ${samples.length} steps: ${line.join(', ')}`);
  console.log(`  CPU stages per step (step − water + snapshot + summary): ${quantile(cpuOnly, 0.5).toFixed(2)}/${quantile(cpuOnly, 0.95).toFixed(2)}; water (CPU solver, not timed on the device) ${quantile(samples.map((s) => s.water), 0.5).toFixed(1)}`);
  if (!hashing) return;
  const state = runner.simulation.exportState();
  const stateHash = createHash('sha256');
  const arrays: Record<string, ArrayBufferView> = { ...state.arrays, riseRate: solver.surfaceRiseRate };
  if (solver instanceof BoussinesqSolver) arrays.viscosity = solver.viscosity;
  for (const name of Object.keys(arrays).sort()) {
    const array = arrays[name];
    stateHash.update(name);
    stateHash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
  }
  const board = runner.board?.position;
  stateHash.update(JSON.stringify({ time: solver.time, board: board && [board.x, board.y, board.z], lip: state.lip, front: state.front ?? null, counters: state.counters }));
  console.log(`  hashes: snapshots ${snapshotHash.digest('hex').slice(0, 16)}, state ${stateHash.digest('hex').slice(0, 16)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
