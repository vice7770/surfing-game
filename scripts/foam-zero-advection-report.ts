/** Scratch-only candidate: production FoamField is never edited.
 * node_modules/.bin/rolldown scripts/foam-zero-advection-report.ts -o /private/tmp/foam-zero-report.mjs --format esm --platform node
 * node /private/tmp/foam-zero-report.mjs --out /private/tmp/foam-zero-advection-20261003/report.json
 */
import { deepStrictEqual, strictEqual } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AdvectionStencil } from '../src/wave/AdvectionStencil';
import { AerationField } from '../src/wave/AerationField';
import { createSpot } from '../src/wave/Bathymetry';
import type { FoamField } from '../src/wave/FoamField';
import { ShallowWaterSolver, stretchedEdges, uniformEdges } from '../src/wave/ShallowWaterSolver';
import { alongShoreOf, tankDepth, tankLayout, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

type Constructor = typeof FoamField;
type Inspectable = Record<string, unknown>;
const hash = (input: string | ArrayBufferView) => createHash('sha256').update(typeof input === 'string' ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength)).digest('hex');
const views = (object: object) => Object.fromEntries(Object.entries(object).filter(([, value]) => ArrayBuffer.isView(value))) as Record<string, ArrayBufferView>;
const bytes = (array: ArrayBufferView) => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function oracle(dir: string) {
  const source = readFileSync('src/wave/FoamField.ts', 'utf8');
  writeFileSync(join(dir, 'before.ts'), source);
  writeFileSync(join(dir, 'dispersion.ts'), readFileSync('src/wave/dispersion.ts', 'utf8'));
  const compile = (name: string) => execFileSync(resolve('node_modules/.bin/rolldown'), [join(dir, `${name}.ts`), '-o', join(dir, `${name}.mjs`), '--format', 'esm', '--platform', 'node'], { stdio: 'pipe' });
  compile('before'); // Retain the canonical module before constructing the candidate.
  const old = `        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;
        if (indices && values) {
          indices[i] = k;
          values[i * 2] = tx;
          values[i * 2 + 1] = tz;
        }
        this.nextDense[i] = this.dense[k] * w00 + this.dense[k + 1] * w10 + this.dense[k + nx] * w01 + this.dense[k + nx + 1] * w11;
        this.nextResidual[i] = this.residual[k] * w00 + this.residual[k + 1] * w10 + this.residual[k + nx] * w01 + this.residual[k + nx + 1] * w11;`;
  const replacement = `        if (indices && values) {
          indices[i] = k;
          values[i * 2] = tx;
          values[i * 2 + 1] = tz;
        }
        const d00 = this.dense[k], d10 = this.dense[k + 1], d01 = this.dense[k + nx], d11 = this.dense[k + nx + 1];
        const r00 = this.residual[k], r10 = this.residual[k + 1], r01 = this.residual[k + nx], r11 = this.residual[k + nx + 1];
        if (tx === tx && tz === tz && d00 === 0 && d10 === 0 && d01 === 0 && d11 === 0 && r00 === 0 && r10 === 0 && r01 === 0 && r11 === 0) {
          // Clamped finite fractions have nonnegative weights. Sum zero signs in the original association.
          this.nextDense[i] = d00 + d10 + d01 + d11;
          this.nextResidual[i] = r00 + r10 + r01 + r11;
        } else {
          const w00 = (1 - tx) * (1 - tz);
          const w10 = tx * (1 - tz);
          const w01 = (1 - tx) * tz;
          const w11 = tx * tz;
          this.nextDense[i] = d00 * w00 + d10 * w10 + d01 * w01 + d11 * w11;
          this.nextResidual[i] = r00 * w00 + r10 * w10 + r01 * w01 + r11 * w11;
        }`;
  strictEqual(source.split(old).length, 2, 'canonical advection block changed');
  const candidate = source.replace(old, replacement);
  writeFileSync(join(dir, 'candidate.ts'), candidate);
  try { execFileSync('diff', ['-u', join(dir, 'before.ts'), join(dir, 'candidate.ts')], { encoding: 'utf8' }); }
  catch (error) { writeFileSync(join(dir, 'candidate.patch'), (error as { stdout: string }).stdout); }
  compile('candidate');
  const before = (await import(pathToFileURL(join(dir, 'before.mjs')).href)).FoamField as Constructor;
  const current = (await import(pathToFileURL(join(dir, 'candidate.mjs')).href)).FoamField as Constructor;
  return { before, current, sourceHash: hash(source), candidateHash: hash(candidate), scratch: dir };
}

function fields(water: ShallowWaterSolver, construct: Constructor, sparse = true) {
  const foam = new construct(water, { dense: 3, residual: 20 });
  const air = new AerationField(water, { period: 18 });
  for (let i = 0; i < water.h.length; i += 1) {
    const z = water.zCenters[Math.floor(i / water.nx)];
    const occupied = sparse ? z > -220 && z < -20 && water.h[i] > 0.1 && water.h[i] < 12 : i % 5 === 0;
    foam.dense[i] = occupied ? 0.13 + (i % 7) * 0.1 : 0;
    foam.residual[i] = occupied ? 0.12 : 0;
    air.air[i] = occupied ? 0.01 : 0;
    air.depth[i] = occupied ? 0.8 : 0;
    air.turbulence[i] = occupied ? 0.1 : 0;
  }
  const state = { foam, air, stencil: new AdvectionStencil(), identities: [views(foam), views(air)] };
  return state;
}
type State = ReturnType<typeof fields>;

function compare(a: State, b: State, context: string) {
  for (const [index, key] of (['foam', 'air', 'stencil'] as const).entries()) {
    const av = views(a[key]), bv = views(b[key]);
    deepStrictEqual(Object.keys(av), Object.keys(bv), `${context}: ${key} field names`);
    for (const name of Object.keys(av)) {
      strictEqual(bytes(av[name]).equals(bytes(bv[name])), true, `${context}: ${key}.${name} byte parity`);
      if (index < 2) {
        strictEqual(av[name], a.identities[index][name], `${context}: before ${key}.${name} identity`);
        strictEqual(bv[name], b.identities[index][name], `${context}: candidate ${key}.${name} identity`);
      }
    }
    const scalars = (object: object) => Object.fromEntries(Object.entries(object).filter(([, value]) => typeof value === 'number' || typeof value === 'boolean'));
    deepStrictEqual(scalars(a[key]), scalars(b[key]), `${context}: ${key} counters/window/stir/stencil state`);
  }
}

function couple(water: ShallowWaterSolver, state: State, breaking: ArrayLike<number>, dt: number) {
  for (let n = 0; n < state.foam.breakingCount; n += 1) {
    const i = state.foam.breakingCells[n], height = water.h[i] + water.bed[i] - water.restLevel;
    if (height > 0) state.air.addBore(i, state.foam.dissipation[i], height, dt);
    state.air.stir(i, breaking[i], dt);
  }
}

function replay(constructors: Awaited<ReturnType<typeof oracle>>) {
  const results = [];
  for (const scenario of ['normal', 'public-edge', 'stale'] as const) {
    const water = new ShallowWaterSolver({ nx: 12, xMin: -6, dx: 1, zEdges: scenario === 'normal' ? uniformEdges(-10, 10, 20) : stretchedEdges(-30, 10, -5, 1, 4), xBoundary: 'open' }, () => 2);
    const a = fields(water, constructors.before, false), b = fields(water, constructors.current, false);
    const breaking = new Float64Array(water.h.length);
    for (let step = 0; step < 24; step += 1) {
      if (step === 8 || step === 16) water.shiftAlongShore(step === 8 ? 2 : -3);
      if (step === 20) { water.shiftAlongShore(6); water.shiftAlongShore(6); }
      const dt = [1 / 60, 1 / 30, 0.05, 0.2, 0, -1][step % 6];
      for (let i = 0; i < water.h.length; i += 1) {
        water.h[i] = (i + step) % 17 === 0 ? [0, 0.005, 0.01, 0.0100001][step % 4] : 2.4 + 0.2 * Math.sin(i + step);
        const extreme = scenario === 'public-edge' && i % 3 === 0;
        water.qx[i] = water.h[i] * (extreme ? (i % 2 ? 1000 : -1000) : 2 * Math.sin(i + step));
        water.qz[i] = water.h[i] * (extreme ? (i % 2 ? -1000 : 1000) : 3 * Math.cos(i + step));
        breaking[i] = (i + step) % 5 === 0 ? [0.4, 1, 4][step % 3] : 0;
      }
      if (scenario === 'public-edge') {
        // All signed-zero corners, mixed signs, NaN field contents, and NaN departure fractions.
        water.qx[20] = water.qz[20] = 0;
        water.qx[30] = 0; water.qz[30] = Number.NaN;
        water.qx[40] = Number.NaN;
        for (const state of [a, b]) {
          for (const k of [20, 21, 20 + water.nx, 21 + water.nx]) state.foam.dense[k] = state.foam.residual[k] = -0;
          state.foam.dense[21] = step % 2 ? 0 : -0;
          state.foam.dense[50] = Number.NaN;
          state.foam.residual[60] = Number.NaN;
          for (const k of [30, 31, 30 + water.nx, 31 + water.nx]) state.foam.dense[k] = state.foam.residual[k] = 0;
        }
      }
      for (const state of [a, b]) {
        state.foam.addSplash(water.xCenters[3], water.zCenters[4], 0.02);
        state.air.addAir(water.xCenters[3], water.zCenters[4], 0.01, 0.7);
        // Aliased public breaking arrays remain legal; finishing is unchanged.
        const input = scenario === 'public-edge' && step % 3 === 0 ? state.foam.dense.subarray(0) : breaking;
        state.foam.update(dt, input, state.stencil);
        if (dt > 0) couple(water, state, input, dt);
      }
      compare(a, b, `${scenario} step ${step} foam+sources`);
      const airDt = scenario === 'stale' && step % 4 === 0 ? 0.02 : dt;
      if (scenario === 'stale' && step % 4 === 1) water.time += 0.02;
      if (scenario === 'stale' && step % 4 === 2) water.shiftAlongShore(1);
      if (scenario === 'stale' && step % 4 === 3) { water.qx.fill(0.5); water.h[10] = 0; a.stencil.invalidate(); b.stencil.invalidate(); }
      for (const state of [a, b]) state.air.update(airDt, state.stencil);
      compare(a, b, `${scenario} step ${step} material air`);
    }
    results.push({ scenario, steps: 24, cells: water.h.length, arrays: Object.keys(views(a.foam)), hashes: Object.fromEntries(Object.entries(views(a.foam)).map(([key, array]) => [key, hash(array)])) });
  }
  return results;
}

function benchmark(constructors: Awaited<ReturnType<typeof oracle>>) {
  const config: SurfZoneConfig = { spot: 'padang', seed: 8761, significantHeight: 3.8, peakPeriod: 18, directionDegrees: 0, spreading: 150, tide: 0, dx: 2, fineSpacing: 1, componentCount: 64 };
  const tank = tankLayout(config), width = alongShoreOf(config), spot = createSpot('padang', config.seed);
  const water = new ShallowWaterSolver({ nx: Math.round(width / 2), xMin: -width / 2, dx: 2, zEdges: stretchedEdges(tank.offshore, tank.shore, tank.fineFrom, 1, 4), xBoundary: 'open' }, (x, z) => tankDepth(spot, tank.edgeDepth, x, z, tank));
  const breaking = new Float64Array(water.h.length);
  for (let i = 0; i < water.h.length; i += 1) {
    const z = water.zCenters[Math.floor(i / water.nx)], still = water.restLevel - water.bed[i];
    const surf = z > -220 && z < -20 && still > 0.1 && still < 12;
    water.h[i] = Math.max(0, still + (surf ? 0.35 + 0.3 * Math.sin(i / 13) : 0));
    water.qx[i] = water.h[i] * (surf ? 0.6 : 0.1); water.qz[i] = water.h[i] * (surf ? 3 : 0.3);
    if (surf && i % 19 === 0) breaking[i] = 0.5;
  }
  strictEqual(water.h.length, 116000, 'ordinary grid changed');
  const states = { before: fields(water, constructors.before), candidate: fields(water, constructors.current) };
  const step = (state: State) => {
    const start = performance.now(); state.foam.update(1 / 60, breaking, state.stencil); const foam = performance.now();
    couple(water, state, breaking, 1 / 60); const sources = performance.now(); state.air.update(1 / 60, state.stencil); const end = performance.now();
    return { foam: foam - start, sources: sources - foam, air: end - sources, total: end - start };
  };
  for (let frame = 0; frame < 30; frame += 1) for (const mode of frame % 2 ? ['candidate', 'before'] as const : ['before', 'candidate'] as const) step(states[mode]);
  let wet = 0, eligible = 0;
  const { indices, values } = states.before.stencil, { dense, residual } = states.before.foam;
  for (let i = 0; i < water.h.length; i += 1) {
    if (!(water.h[i] > 0.01)) continue;
    wet += 1;
    const k = indices[i];
    if (Number.isFinite(values[i * 2]) && Number.isFinite(values[i * 2 + 1]) && [k, k + 1, k + water.nx, k + water.nx + 1].every((n) => dense[n] === 0 && residual[n] === 0)) eligible += 1;
  }
  const rows = [];
  for (let frame = 0; frame < 30; frame += 1) {
    const row = { frame, order: frame % 2 ? ['candidate', 'before'] as const : ['before', 'candidate'] as const } as { frame: number; order: readonly ('before' | 'candidate')[]; before: ReturnType<typeof step>; candidate: ReturnType<typeof step> };
    for (const mode of row.order) row[mode] = step(states[mode]);
    rows.push(row);
  }
  compare(states.before, states.candidate, 'benchmark final');
  const stages = ['foam', 'sources', 'air', 'total'] as const;
  return { config, grid: { nx: water.nx, nz: water.nz, cells: water.h.length, wet, zeroStencilEligible: eligible, eligibleWetFraction: eligible / wet }, warmupFrames: 30, measuredAdjacentPairs: 30, rows,
    summary: Object.fromEntries(stages.map((key) => [key, { beforeMedian: median(rows.map((r) => r.before[key])), candidateMedian: median(rows.map((r) => r.candidate[key])), adjacentPairedMedianSaved: median(rows.map((r) => r.before[key] - r.candidate[key])), meanSaved: rows.reduce((sum, r) => sum + r.before[key] - r.candidate[key], 0) / rows.length }])) };
}

const at = process.argv.indexOf('--out'), out = resolve(at < 0 ? '/private/tmp/foam-zero-advection-20261003/report.json' : process.argv[at + 1]);
mkdirSync(dirname(out), { recursive: true });
const meta: Inspectable = { startedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), machine: cpus()[0]?.model, node: process.version, limitations: 'Scratch candidate only. Prescribed sparse surf-band foam/flow on the ordinary116k grid; no live solver-state census, water solve, rendering, browser or FPS claim. One bounded alternating adjacent-pair sample. Production source is not edited.' };
try {
  const constructors = await oracle(dirname(out)); Object.assign(meta, { sourceHash: constructors.sourceHash, candidateHash: constructors.candidateHash, scratch: constructors.scratch });
  meta.replay = replay(constructors); meta.benchmark = benchmark(constructors); meta.productionSourceUnchanged = hash(readFileSync('src/wave/FoamField.ts', 'utf8')) === constructors.sourceHash;
  strictEqual(meta.productionSourceUnchanged, true); meta.finishedAt = new Date().toISOString(); writeFileSync(out, `${JSON.stringify(meta, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ output: out, replay: meta.replay, benchmark: (meta.benchmark as ReturnType<typeof benchmark>).grid, summary: (meta.benchmark as ReturnType<typeof benchmark>).summary }, null, 2)}\n`);
} catch (error) {
  meta.failure = { message: (error as Error).message, stack: (error as Error).stack }; meta.finishedAt = new Date().toISOString(); writeFileSync(out, `${JSON.stringify(meta, null, 2)}\n`); throw error;
}
