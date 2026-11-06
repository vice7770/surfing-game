/**
 * The Barrel's device traffic (barrel-gpu, 2026-11-06), in Node: the worker's runner (`SurfZoneRunner.forWorker`,
 * the contact and a riderless board in the lineup, the solo worker's water prefetch) on `GpuBoussinesq` with a stand-in
 * device (`fakeGpu.ts`) whose step is a second solver, in doubles, reading the device's f32 fields and writing its results
 * back as f32. `GpuBoussinesq`'s own upload, submit and readback code runs; every byte it moves is counted.
 *
 * The straight Barrel (the default) has periodic sides, which the device refused before barrel-gpu; on `main` its water
 * stepped on the CPU, and this bench counts what the device moves there now. `aframe` (`?poolBarrel=aframe`) is the
 * Barrel's A-frame floor, whose open sides the device already ran. Run against a tree from before barrel-gpu, it builds the
 * device past the refusal (the class's constructor): the upload code is the same either way.
 *
 *   rolldown docs/research/barrel-gpu-2026-11-06/traffic.ts -o dist/scripts/gpu-traffic.mjs --format esm --platform node
 *   node dist/scripts/gpu-traffic.mjs --swell medium --arms a38,old-a38,a38=deviceWater:old+launchWater:old+devicePlunge:old --steps 600
 *
 * Arms: `a38` (today's default), `pool` (`?poolTubeCase=pool`), `old-a38` / `old-pool` (`?tubeFace=old&tubeFrom=piece`:
 * the Barrel before the tube work), `aframe` / `aframe-pool`, each with `=key:value+key:value` config overrides.
 * `--hash 1` hashes, every step, the solver's water after the step, the snapshot (`fill`) and the device's fields at every
 * submission (the water, the carried breaking and predictor state, and the plunge zone's cells held): an arm with the
 * switches old against the same arm with them on must hash the same.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { BARREL_CASES } from '../../../src/wave/barrel/barrelLibraryIndex';
import { POOL_TUBE_CASES, POOL_TUBE_STAND_IN } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import type { BoussinesqSolver } from '../../../src/wave/BoussinesqSolver';
import { FIELD } from '../../../src/wave/gpu/boussinesqWgsl';
import { GpuBoussinesq } from '../../../src/wave/gpu/GpuBoussinesq';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../../../src/wave/SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../src/wave/surfZoneState';
import { FakeDevice, emptyTraffic, fakeGpu, installGpuGlobals, type Traffic } from './fakeGpu';

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const swell = option('swell', 'medium') as 'medium' | 'big';
const steps = Number(option('steps', '600'));
const warm = Number(option('warm', '30'));
const hash = option('hash', '0') === '1';
const settle = Number(option('settle', '50'));
const out = option('out', '');
const armNames = option('arms', 'a38,old-a38').split(',');
const SCRATCH = '/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad';
const seaPath = (label: string) => label.startsWith('aframe')
  ? `${SCRATCH}/gpu-traffic/sea-${label}-${swell}-${settle}.sea`
  : `${SCRATCH}/barrel-perf/sea-${label}-${swell}-${settle}.sea`;

installGpuGlobals();
const a38Cases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id)));
const poolCases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_CASES.includes(entry.id)));

interface Sample extends Traffic {
  /** Cells whose water the CPU changed between the device's last result and this step's upload (by value). */
  changed: number;
  /** The cells the solver marked: the span's length, whether all were marked, and the list's cells (this branch). */
  span: number; all: number; listed: number;
  /** Plunge-zone entries and exits this step, a discarded prefetch, the lip's launches. */
  plungeFlips: number; discards: number; launches: number;
}

async function build(name: string) {
  const [label, spec] = name.split('=');
  const overrides: Record<string, unknown> = {};
  if (spec) for (const pair of spec.split('+')) {
    const [key, value] = pair.split(':');
    overrides[key] = value;
  }
  const caseName = label.endsWith('pool') ? 'pool' : 'a38';
  if (label.startsWith('old-')) Object.assign(overrides, { tubeFace: 'old', tubeFrom: 'piece' });
  if (label.startsWith('aframe')) overrides.poolBarrel = 'aframe';
  overrides.poolTubeCase = caseName;
  const barrelCases = caseName === 'pool' ? poolCases : a38Cases;
  const settings = physicalSettingsFor('pool', { swell, tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'auto' });
  const config = { ...surfZoneConfigFor(settings as never, 8761, true), ...overrides } as SurfZoneConfig;
  const path = seaPath(label);
  if (!existsSync(path)) {
    // A fresh sea, spun up and stepped to `settle` s on the CPU, saved for every arm on it.
    const fresh = SurfZoneRunner.forWorker(config, { board: true, contact: true, barrelCases } as never, 'warm');
    await fresh.spinUp();
    while (fresh.simulation.solver.time < settle) fresh.advance(1);
    mkdirSync(path.replace(/\/[^/]+$/, ''), { recursive: true });
    writeFileSync(path, encodeSurfZoneState(fresh.simulation.exportState()));
  }
  const sea = () => decodeSurfZoneState(new Uint8Array(readFileSync(path)));
  const runner = SurfZoneRunner.forWorker(config, { board: true, contact: true, barrelCases } as never, 'warm');
  const sim = runner.simulation;
  sim.importState(sea());
  await runner.spinUp();
  const solver = sim.solver as BoussinesqSolver;
  const n = solver.nx * solver.nz;
  // The device's step: a second solver on the same sea, in doubles, from the device's f32 fields.
  const twin = new SurfZoneSimulation(config, 'warm');
  twin.importState(sea());
  const memory = twin.solver as BoussinesqSolver;
  const deviceHash = createHash('sha256');
  const held = new Uint8Array(n);
  const device = new FakeDevice(n, (fields) => {
    const field = (index: number) => fields.subarray(index * n, (index + 1) * n);
    memory.h.set(field(FIELD.H)); memory.qx.set(field(FIELD.QX)); memory.qz.set(field(FIELD.QZ));
    memory.breakingStrength.set(field(FIELD.STRENGTH)); memory.breakingAge.set(field(FIELD.AGE));
    memory.predictor!.x.set(field(FIELD.PREDX)); memory.predictor!.z.set(field(FIELD.PREDZ));
    // The kernels read only whether a cell's hold runs.
    memory.plungeHold.set(field(FIELD.HOLD));
    memory.time = solver.time;
    memory.step(SURF_ZONE_STEP);
    field(FIELD.H).set(memory.h); field(FIELD.QX).set(memory.qx); field(FIELD.QZ).set(memory.qz);
    field(FIELD.RATEH).set(memory.surfaceRiseRate); field(FIELD.STRENGTH).set(memory.breakingStrength);
    field(FIELD.AGE).set(memory.breakingAge); field(FIELD.NU).set(memory.viscosity);
    field(FIELD.PREDX).set(memory.predictor!.x); field(FIELD.PREDZ).set(memory.predictor!.z);
  });
  if (hash) device.onSubmit = (fields) => {
    for (const index of [FIELD.H, FIELD.QX, FIELD.QZ, FIELD.STRENGTH, FIELD.AGE, FIELD.PREDX, FIELD.PREDZ]) {
      deviceHash.update(new Uint8Array(fields.buffer, index * n * 4, n * 4));
    }
    const hold = fields.subarray(FIELD.HOLD * n, (FIELD.HOLD + 1) * n);
    for (let i = 0; i < n; i += 1) held[i] = hold[i] > 0 ? 1 : 0;
    deviceHash.update(held);
  };
  // Created as the worker creates it; a tree from before barrel-gpu refuses the periodic Barrel, so past the refusal there
  // (the class's private constructor): the counts are the upload code's own either way.
  const Host = GpuBoussinesq as unknown as new (solver: BoussinesqSolver, device: unknown, module: unknown) => GpuBoussinesq;
  const host = await GpuBoussinesq.create(solver, fakeGpu(device)) ?? new Host(solver, device, device.createShaderModule());
  // Attached as the worker attaches its device, so the config's switches reach it (`configure`).
  if (!(await runner.useDevice(async () => host))) throw new Error('no device');
  if (!runner.enableSoloWaterPrefetch()) throw new Error('no solo prefetch');
  // Each upload's marks and the water's changes since the device's last result, read before the host packs them.
  let reference = [solver.h.slice(), solver.qx.slice(), solver.qz.slice()];
  const heldWater = solver.waterHeld.bind(solver);
  solver.waterHeld = () => { heldWater(); reference = [solver.h.slice(), solver.qx.slice(), solver.qz.slice()]; };
  let pending = { changed: 0, span: 0, all: 0, listed: 0 };
  const watch = () => {
    let changed = 0;
    for (let i = 0; i < n; i += 1) {
      if (solver.h[i] !== reference[0][i] || solver.qx[i] !== reference[1][i] || solver.qz[i] !== reference[2][i]) changed += 1;
    }
    const s = solver as unknown as Record<string, number | boolean>;
    pending = {
      changed, span: solver.waterChangedFrom <= solver.waterChangedTo ? solver.waterChangedTo - solver.waterChangedFrom + 1 : 0,
      all: solver.waterChangedAll ? 1 : 0, listed: typeof s.waterChangedCount === 'number' ? s.waterChangedCount as number : Number.NaN,
    };
  };
  const prepare = host.prepareStep.bind(host);
  host.prepareStep = (dt: number) => { watch(); return prepare(dt); };
  const stepOn = host.step.bind(host);
  host.step = (dt: number) => { watch(); return stepOn(dt); };
  let discards = 0;
  const simRecord = sim as unknown as Record<string, unknown>;
  const consume = (simRecord.consumeWaterPrefetch as (...a: unknown[]) => Promise<boolean>).bind(sim);
  simRecord.consumeWaterPrefetch = async (...args: unknown[]) => {
    const used = await consume(...args);
    if (!used) discards += 1;
    return used;
  };

  const buffers = runner.createBuffers();
  const waterHash = createHash('sha256');
  const snapshotHash = createHash('sha256');
  async function step(): Promise<Sample> {
    device.traffic = emptyTraffic();
    discards = 0;
    const plunge = solver.plungeVersion;
    const launches = sim.lipLaunches;
    await runner.advanceAsync(1);
    runner.fill(buffers);
    if (hash) {
      for (const array of [solver.h, solver.qx, solver.qz]) waterHash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      for (const array of [buffers.surface, buffers.flow, buffers.aeration, buffers.lip, buffers.tubes, buffers.bubbles, buffers.spray,
        buffers.board, buffers.rider, buffers.lipHits, buffers.strokeHits, buffers.roar, buffers.reaction, buffers.front, buffers.roller, buffers.curl]) {
        snapshotHash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      }
      const status = runner.status();
      snapshotHash.update(JSON.stringify([buffers.lipCount, buffers.tubeCount, buffers.bubbleCount, buffers.sprayCount, buffers.frontCount,
        status.breakingFraction, status.lipLaunches, status.spray]));
    }
    return { ...device.traffic, ...pending, plungeFlips: Math.abs(solver.plungeVersion - plunge), discards, launches: sim.lipLaunches - launches };
  }
  return {
    label: name, step,
    hashes: () => ({ water: waterHash.digest('hex').slice(0, 16), snapshot: snapshotHash.digest('hex').slice(0, 16), device: deviceHash.digest('hex').slice(0, 16) }),
    grid: () => `${solver.nx} × ${solver.nz} = ${n} cells, x boundary ${solver.deviceLayout().xBoundary}, t ${solver.time.toFixed(2)}`,
  };
}

const quantile = (values: number[], q: number) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : Number.NaN;
};
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
const most = (values: number[]) => values.reduce((a, b) => (b > a ? b : a), -Infinity);

async function main(): Promise<void> {
  const arms = [];
  for (const name of armNames) {
    const t = Date.now();
    const arm = await build(name);
    arms.push(arm);
    console.log(`${name}: ${arm.grid()} (${((Date.now() - t) / 1000).toFixed(0)} s to build)`);
  }
  for (const arm of arms) for (let k = 0; k < warm; k += 1) await arm.step();
  const samples = arms.map(() => [] as Sample[]);
  for (let a = 0; a < arms.length; a += 1) for (let k = 0; k < steps; k += 1) samples[a].push(await arms[a].step());
  const lines: string[] = [];
  lines.push(`Wave Pool Barrel device traffic, ${swell}, ${steps} steps per arm after ${warm} warm, Node ${process.version}: p50 / p95 / max (mean); bytes a step`);
  for (const key of Object.keys(samples[0][0]) as (keyof Sample)[]) {
    const row = arms.map((arm, a) => {
      const values = samples[a].map((s) => s[key] as number);
      return `${arm.label}: ${quantile(values, 0.5).toFixed(0)} / ${quantile(values, 0.95).toFixed(0)} / ${most(values).toFixed(0)} (${mean(values).toFixed(1)})`;
    });
    lines.push(`${key.padEnd(12)} ${row.join(' | ')}`);
  }
  // The totals a step and per 100 steps.
  for (let a = 0; a < arms.length; a += 1) {
    const s = samples[a];
    const upload = s.map((x) => x.waterBytes + x.holdBytes + x.layoutBytes + x.otherBytes);
    const steps100 = 100 / s.length;
    lines.push(`total ${arms[a].label}: upload ${(mean(upload) / 1024).toFixed(1)} kB a step mean (p50 ${(quantile(upload, 0.5) / 1024).toFixed(1)}, p95 ${(quantile(upload, 0.95) / 1024).toFixed(1)}, max ${(most(upload) / 1024).toFixed(0)}); `
      + `readback ${(mean(s.map((x) => x.mappedBytes)) / 1024).toFixed(0)} kB a step; maps ${mean(s.map((x) => x.maps)).toFixed(2)}, submits ${mean(s.map((x) => x.submits)).toFixed(2)}, writes ${mean(s.map((x) => x.writes)).toFixed(1)} a step; `
      + `full water uploads ${(s.reduce((t, x) => t + x.fullWater, 0) * steps100).toFixed(1)} / 100 steps; whole plunge zone ${(s.reduce((t, x) => t + (x.holdBytes >= 4 * 1e4 ? 1 : 0), 0) * steps100).toFixed(1)} / 100; `
      + `layout ${(s.reduce((t, x) => t + (x.layoutBytes > 0 ? 1 : 0), 0) * steps100).toFixed(1)} / 100; discarded prefetches ${(s.reduce((t, x) => t + x.discards, 0) * steps100).toFixed(1)} / 100; launches ${(s.reduce((t, x) => t + x.launches, 0) / (s.length / 60)).toFixed(1)} a second`);
  }
  if (hash) for (const arm of arms) lines.push(`hashes ${arm.label}: ${JSON.stringify(arm.hashes())}`);
  const text = lines.join('\n');
  console.log(text);
  if (out) writeFileSync(out, `${text}\n`);
  if (process.argv.includes('--dump')) writeFileSync(`${out || 'traffic'}.json`, JSON.stringify({ arms: arms.map((a) => a.label), samples }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
