/**
 * The worker's CPU stages, an older tree against this one, in one process (the M1 CPU study, 2026-10-19): each tree
 * gets its own runner on the same sea, saved by scripts/m1-cpu-bench.ts (`--state`), and the two step alternately (the
 * order swapped every step) with the same idle-then-paddling input, filling a snapshot after each step as the worker
 * does. Reports each stage's p50/p95 for both, their ratio and the paired median difference, and compares every step's
 * snapshot and the final state byte for byte.
 *
 *   git archive a999e3e2 src | (mkdir -p .m1-cpu-base && tar -x -C .m1-cpu-base)   # or any commit or branch
 *   rolldown scripts/m1-cpu-ab.ts -o /tmp/m1-cpu-ab.mjs --format esm --platform node
 *   node /tmp/m1-cpu-ab.mjs --spot canyon --steps 300 --state /tmp/m1-cpu-bench-canyon-medium-8761.sea
 *   rm -r .m1-cpu-base
 *
 * `--base-state` gives the base tree a sea of its own, for a layout change whose window differs between the trees (the
 * Canyon's 240 m window, 2026-10-22, docs/research/perf-2026-10-22): save it with the base tree's own m1-cpu-bench,
 *   git archive <base> src scripts/m1-cpu-bench.ts | (mkdir -p .m1-cpu-base && tar -x -C .m1-cpu-base)
 *   rolldown ./.m1-cpu-base/scripts/m1-cpu-bench.ts -o /tmp/m1-cpu-bench-base.mjs --format esm --platform node
 *   node /tmp/m1-cpu-bench-base.mjs --spot canyon --steps 1 --hash 0 --state /tmp/canyon-base.sea
 *   node /tmp/m1-cpu-ab.mjs --spot canyon --steps 300 --state /tmp/canyon-new.sea --base-state /tmp/canyon-base.sea
 * (the leading ./ matters: rolldown reads a bare `.m1-cpu-base/…` entry as a package). The arms then step different
 * seas, so only their timings compare; the snapshot comparison reports them as differing.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../src/game/SurfConditions';
import { readBarrelCases } from '../src/wave/barrel/nodeBarrelCases';
import { SurfZoneRunner as NewRunner } from '../src/wave/SurfZoneRunner';
import { sweptBarrelOn } from '../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState as decodeNew } from '../src/wave/surfZoneState';
import { SurfZoneRunner as OldRunner } from '../.m1-cpu-base/src/wave/SurfZoneRunner';
import { decodeSurfZoneState as decodeOld } from '../.m1-cpu-base/src/wave/surfZoneState';

const option = (name: string) => {
  const at = process.argv.indexOf('--' + name);
  return at < 0 ? undefined : process.argv[at + 1];
};
const spot = (option('spot') ?? 'canyon') as 'canyon';
const size = (option('size') ?? 'medium') as SwellSize;
const steps = Number(option('steps') ?? 240);
const warm = Number(option('warm') ?? 20);
const seed = Number(option('seed') ?? 8761);
const statePath = option('state')!;
/** The base arm's own saved sea (default: `--state`, the same sea for both). */
const baseStatePath = option('base-state') ?? statePath;
const only = option('only'); // 'old' or 'new': time one arm alone (profiling)
for (const path of [statePath, baseStatePath]) if (!existsSync(path)) throw new Error('no state ' + path);

type Any = any;
async function make(Runner: Any, decode: Any, path: string): Promise<Any> {
  const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: (Number(option('stage') ?? 2) === 1 ? 1 : 2) as 1 | 2, compute: 'auto' });
  const config = surfZoneConfigFor(settings, seed, true);
  const barrelCases = sweptBarrelOn(config) ? readBarrelCases(spot) : undefined;
  const runner = Runner.forWorker(config, { rider: true, ...(barrelCases ? { barrelCases } : {}) }, 'warm');
  runner.simulation.importState(decode(new Uint8Array(readFileSync(path))));
  await runner.spinUp();
  return runner;
}

const BUFFERS = ['surface', 'flow', 'aeration', 'lip', 'tubes', 'bubbles', 'spray', 'board', 'rider', 'lipHits', 'strokeHits', 'roar', 'reaction',
  'front', 'roller', 'curl'];
/** Every snapshot array either tree fills (the spilling lip's curls only where it has them). */
function bufferList(b: Any): ArrayBufferView[] {
  return BUFFERS.map((name) => b[name] ?? new Float32Array(0));
}
function counts(b: Any) {
  return JSON.stringify([b.lipCount, b.tubeCount, b.bubbleCount, b.sprayCount, b.lipHitCount, b.strokeHitCount, b.frontCount, b.rollerCount, b.curlCount]);
}
function same(a: ArrayBufferView, b: ArrayBufferView): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const y = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return false;
  return true;
}

async function main(): Promise<void> {
  const arms: { name: string; runner: Any; buffers: Any; samples: Any[] }[] = [];
  if (only !== 'new') arms.push({ name: 'old', runner: await make(OldRunner, decodeOld, baseStatePath), buffers: undefined, samples: [] });
  if (only !== 'old') arms.push({ name: 'new', runner: await make(NewRunner, decodeNew, statePath), buffers: undefined, samples: [] });
  for (const arm of arms) arm.buffers = arm.runner.createBuffers();
  for (const arm of arms) {
    const { solver } = arm.runner.simulation;
    console.log(arm.name + ' ' + spot + ' ' + size + ': ' + solver.nx + ' x ' + solver.nz + ' cells, render ' + arm.runner.grid.nx + ' x ' + arm.runner.grid.nz + ', t ' + solver.time.toFixed(3));
  }
  let mismatches = 0;
  const firstMismatch: string[] = [];
  for (let frame = 0; frame < warm + steps; frame += 1) {
    const paddle = frame >= (warm + steps) / 3;
    const input = { paddle, popUp: false, steer: paddle ? 0.3 * Math.sin(frame / 20) : 0, retry: false };
    const order = frame % 2 === 0 ? arms : [...arms].reverse();
    for (const arm of order) {
      arm.runner.advance(1, input);
      arm.runner.fill(arm.buffers);
      const status = arm.runner.status();
      if (frame >= warm) arm.samples.push({ ...status.pipelineMs, breakingFraction: status.breakingFraction, sprayCount: status.spray });
    }
    if (arms.length === 2) {
      const [a, b] = arms;
      const la = bufferList(a.buffers);
      const lb = bufferList(b.buffers);
      const names = BUFFERS;
      let ok = counts(a.buffers) === counts(b.buffers);
      if (!ok && firstMismatch.length < 5) firstMismatch.push('frame ' + frame + ' counts');
      for (let k = 0; k < la.length; k += 1) {
        if (!same(la[k], lb[k])) {
          ok = false;
          if (firstMismatch.length < 5) firstMismatch.push('frame ' + frame + ' ' + names[k]);
        }
      }
      if (!ok) mismatches += 1;
    }
  }
  const quantile = (values: number[], q: number) => {
    const sorted = values.filter(Number.isFinite).sort((x, y) => x - y);
    return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : Number.NaN;
  };
  const keys = ['water', 'step', 'breaking', 'roller', 'front', 'lip', 'foam', 'airSources', 'aeration', 'contact', 'board', 'bubbles', 'spray', 'sounds', 'snapshotFields', 'snapshot', 'summary', 'cpu'];
  for (const arm of arms) for (const s of arm.samples) s.cpu = s.step - s.water + s.snapshot + s.summary;
  const rows: string[] = [];
  for (const key of keys) {
    const cells = arms.map((arm) => {
      const v = arm.samples.map((s) => s[key]);
      return quantile(v, 0.5).toFixed(2) + '/' + quantile(v, 0.95).toFixed(2);
    });
    let ratio = '';
    if (arms.length === 2) {
      const a = arms[0].samples.map((s) => s[key]);
      const b = arms[1].samples.map((s) => s[key]);
      const pa = quantile(a, 0.5);
      const pb = quantile(b, 0.5);
      const paired = quantile(a.map((x: number, k: number) => b[k] - x), 0.5);
      ratio = '  new/old p50 ' + (pa > 0 ? (pb / pa).toFixed(2) : '-') + ', paired median diff ' + paired.toFixed(2);
    }
    rows.push(key.padEnd(15) + arms.map((arm, k) => arm.name + ' ' + cells[k]).join('  ') + ratio);
  }
  console.log('ms p50/p95 over ' + steps + ' steps (order alternated):');
  console.log(rows.join('\n'));
  if (arms.length === 2) {
    const hashes = arms.map((arm) => {
      const state = arm.runner.simulation.exportState();
      const s = arm.runner.simulation.solver;
      const hash = createHash('sha256');
      const arrays: Any = { ...state.arrays, riseRate: s.surfaceRiseRate, viscosity: s.viscosity };
      for (const name of Object.keys(arrays).sort()) {
        const array = arrays[name];
        if (!array) continue;
        hash.update(name);
        hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      }
      const board = arm.runner.board?.position;
      hash.update(JSON.stringify({ time: s.time, board: board && [board.x, board.y, board.z], lip: state.lip, front: state.front ?? null, counters: state.counters }));
      return hash.digest('hex').slice(0, 16);
    });
    console.log('snapshots differing on ' + mismatches + ' of ' + (warm + steps) + ' steps ' + firstMismatch.join('; ') + '; state old ' + hashes[0] + ' new ' + hashes[1] + (hashes[0] === hashes[1] ? ' SAME' : ' DIFFER'));
  }
}
main().catch((error) => { console.error(error); process.exit(1); });
