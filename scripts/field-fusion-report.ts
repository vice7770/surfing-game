/** Exact checkpoint replay plus bounded CPU timings; no water stepping or rendering.
 * rolldown scripts/field-fusion-report.ts -o /tmp/field-fusion.mjs --format esm --platform node
 * node /tmp/field-fusion.mjs --out /tmp/field-fusion.json
 */
import { deepStrictEqual, strictEqual } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AdvectionStencil } from '../src/wave/AdvectionStencil';
import { AerationField } from '../src/wave/AerationField';
import { createSpot } from '../src/wave/Bathymetry';
import { BubbleCloud } from '../src/wave/BubbleCloud';
import { FoamField } from '../src/wave/FoamField';
import { ShallowWaterSolver, stretchedEdges, uniformEdges } from '../src/wave/ShallowWaterSolver';
import { alongShoreOf, tankDepth, tankLayout, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

export const CHECKPOINT = '1bcc7c0c99943e81fdb5378e5a8a16af3f133f54';
type Constructors = { FoamField: typeof FoamField; AerationField: typeof AerationField };
const current: Constructors = { FoamField, AerationField };
const hash = (values: ArrayBufferView) => createHash('sha256').update(Buffer.from(values.buffer, values.byteOffset, values.byteLength)).digest('hex');
const bytes = (values: ArrayBufferView) => Buffer.from(values.buffer, values.byteOffset, values.byteLength);

/** Compile the unchanged canonical classes in isolation, before invoking current classes. */
export async function checkpointOracle() {
  const dir = mkdtempSync(join(tmpdir(), 'foam-air-checkpoint-'));
  const sources: Record<string, string> = {};
  for (const name of ['FoamField', 'AerationField', 'dispersion']) {
    const source = execFileSync('git', ['show', `${CHECKPOINT}:src/wave/${name}.ts`], { encoding: 'utf8' });
    sources[name] = createHash('sha256').update(source).digest('hex');
    writeFileSync(join(dir, `${name}.ts`), source);
  }
  writeFileSync(join(dir, 'entry.ts'), "export { FoamField } from './FoamField';\nexport { AerationField } from './AerationField';\n");
  execFileSync(resolve('node_modules/.bin/rolldown'), [join(dir, 'entry.ts'), '-o', join(dir, 'before.mjs'), '--format', 'esm', '--platform', 'node'], { stdio: 'pipe' });
  const before = await import(pathToFileURL(join(dir, 'before.mjs')).href) as Constructors;
  writeFileSync(join(dir, 'checkpoint.json'), JSON.stringify({ checkpoint: CHECKPOINT, sources }, null, 2));
  return { before, dir, sources };
}

function fields(water: ShallowWaterSolver, constructors: Constructors, bubbles = false) {
  const foam = new constructors.FoamField(water, { dense: 3, residual: 20 });
  const air = new constructors.AerationField(water, { period: 18 });
  // Include exact trace thresholds, an empty plume with depth, and saturated destinations.
  const dense = [0, 0.999e-6, 1e-6, 1.001e-6, 0.13, 0.95, 1];
  const aerated = [0, 0.999e-7, 1e-7, 1.001e-7, 0.004, 0.03, 0.2];
  for (let i = 0; i < water.h.length; i += 1) {
    foam.dense[i] = dense[i % dense.length];
    foam.residual[i] = Math.min(1 - foam.dense[i], dense[(i + 3) % dense.length] / 4);
    air.air[i] = aerated[i % aerated.length];
    air.depth[i] = [0, 0.025, 0.05, 0.4, 1, 3][i % 6];
    air.turbulence[i] = aerated[(i + 2) % aerated.length] * 3;
  }
  const arrays = [foam.dense, foam.residual, foam.source, foam.sourceCells, foam.breakingCells, foam.dissipation, air.air, air.depth, air.turbulence];
  return { foam, air, arrays, stencil: new AdvectionStencil(), bubbles: bubbles ? new BubbleCloud(8761, 64) : undefined };
}
type Fields = ReturnType<typeof fields>;

function diagnostics(water: ShallowWaterSolver, state: Fields) {
  let dense = 0, lace = 0, air = 0, energy = 0, voidSum = 0;
  for (let i = 0; i < water.h.length; i += 1) {
    const area = water.dx * water.dz[Math.floor(i / water.nx)];
    dense += state.foam.dense[i] * area;
    lace += state.foam.residual[i] * area;
    air += state.air.air[i] * area;
    energy += state.air.turbulence[i] * water.h[i] * area;
    voidSum += state.air.voidFraction(i);
  }
  return { dense, lace, air, energy, voidSum, sources: state.foam.sourceCount, breaking: state.foam.breakingCount };
}

function compare(water: ShallowWaterSolver, before: Fields, after: Fields, context: string) {
  const now = (state: Fields) => [state.foam.dense, state.foam.residual, state.foam.source, state.foam.sourceCells, state.foam.breakingCells, state.foam.dissipation, state.air.air, state.air.depth, state.air.turbulence];
  const a = now(before), b = now(after);
  for (let k = 0; k < a.length; k += 1) {
    strictEqual(a[k], before.arrays[k], `${context}: checkpoint public array identity ${k}`);
    strictEqual(b[k], after.arrays[k], `${context}: current public array identity ${k}`);
    strictEqual(bytes(a[k]).equals(bytes(b[k])), true, `${context}: byte parity array ${k}`);
  }
  deepStrictEqual(diagnostics(water, before), diagnostics(water, after), `${context}: mass/decay/degas/turbulence diagnostics`);
  const stirred = (state: Fields) => (state.air as unknown as { stirred: Uint8Array }).stirred;
  strictEqual(bytes(stirred(before)).equals(bytes(stirred(after))), true, `${context}: dry/stirred clearing`);
  if (before.bubbles && after.bubbles) {
    strictEqual(before.bubbles.count, after.bubbles.count, `${context}: bubble count`);
    strictEqual(bytes(before.bubbles.positions).equals(bytes(after.bubbles.positions)), true, `${context}: bubble material positions`);
    // Age is internal; compare it to cover swap removal and expiry, not just packed positions.
    const age = (cloud: BubbleCloud) => (cloud as unknown as { age: Float64Array }).age;
    strictEqual(bytes(age(before.bubbles)).equals(bytes(age(after.bubbles))), true, `${context}: bubble age`);
  }
}

function boreSources(water: ShallowWaterSolver, state: Fields, breaking: Float64Array, dt: number) {
  for (let n = 0; n < state.foam.breakingCount; n += 1) {
    const i = state.foam.breakingCells[n];
    const height = water.h[i] + water.bed[i] - water.restLevel;
    if (height > 0) state.air.addBore(i, state.foam.dissipation[i], height, dt);
    state.air.stir(i, breaking[i], dt);
  }
}

export type ReplayCase = 'uniform' | 'stretched' | 'boundary' | 'stale';
/** Changes water and source inputs between steps; deliberately does not advance the solver clock. */
export function differentialReplay(before: Constructors, scenario: ReplayCase, steps = 90) {
  const water = new ShallowWaterSolver({ nx: 18, xMin: -9, dx: 1, zEdges: scenario === 'stretched' ? stretchedEdges(-30, 10, -5, 1, 4) : uniformEdges(-9, 9, 18), xBoundary: 'open' }, () => 2);
  const old = fields(water, before, true), fused = fields(water, current, true);
  const breaking = new Float64Array(water.h.length);
  let checks = 0;
  for (let step = 0; step < steps; step += 1) {
    if (step === 20 || step === 40) water.shiftAlongShore(step === 20 ? 3 : -2);
    // Two legal solver shifts before field updates also exercise clearing a whole window.
    if (step === 60) { water.shiftAlongShore(water.nx / 2); water.shiftAlongShore(water.nx / 2); }
    const dt = [1 / 60, 1 / 30, 0.05, 0.2, 0, -1][(scenario === 'stale' ? Math.floor(step / 6) : step) % 6];
    for (let i = 0; i < water.h.length; i += 1) {
      water.h[i] = (i + step) % 17 === 0 ? [0, 0.005, 0.01, 0.0100001][step % 4] : 2.2 + 0.25 * Math.sin(i * 0.3 + step * 0.4);
      const extreme = scenario === 'boundary' && i % 3 === 0;
      water.qx[i] = water.h[i] * (extreme ? (i % 2 ? 1000 : -1000) : 3 * Math.sin(i * 0.2 + step));
      water.qz[i] = water.h[i] * (extreme ? (i % 2 ? -1000 : 1000) : 4 * Math.cos(i * 0.4 + step));
      if (scenario === 'boundary' && i % 4 === 0) water.qx[i] = water.qz[i] = 0;
      breaking[i] = (i + step) % 5 === 0 ? [0.4, 1, 4][step % 3] : 0;
    }
    const beforeAir: number[] = [];
    for (const state of [old, fused]) {
      // Sources follow moving windows before any update, matching lip/crash ordering.
      const x = water.xCenters[3], z = water.zCenters[4];
      state.foam.addSplash(x, z, 0.02);
      state.air.addPlunge(x, z, 200, 0.6);
      state.air.addAir(x + 1, z + 1, 0.01, 0.7);
      state.foam.update(dt, breaking, scenario === 'uniform' ? undefined : state.stencil);
      if (dt > 0) boreSources(water, state, breaking, dt);
      beforeAir.push(diagnostics(water, state).air);
    }
    let airDt = dt;
    if (scenario === 'stale') {
      const change = step % 6;
      if (change === 0) airDt = 0.02;
      if (change === 1) water.time += 0.02;
      if (change === 2) water.shiftAlongShore(1);
      if (change === 3) {
        const otherGrid = new ShallowWaterSolver({ nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(-4, 4, 8) }, () => 1);
        for (const state of [old, fused]) { state.stencil.begin(otherGrid, dt); state.stencil.commit(); }
      }
      if (change === 4) {
        water.qx.fill(0.5);
        // A destination stirred while wet can dry before an explicitly invalidated lookup is consumed.
        water.h[10] = 0;
        for (const state of [old, fused]) state.stencil.invalidate();
      }
    }
    for (const state of [old, fused]) {
      state.air.update(airDt, scenario === 'uniform' ? undefined : state.stencil);
      if (scenario === 'stale' && step % 6 === 5) state.air.update(airDt, state.stencil); // consumed lookup: independent next call
      state.bubbles?.update({ solver: water, foam: state.foam }, dt);
    }
    compare(water, old, fused, `${scenario} step ${step}`);
    strictEqual(beforeAir[0] - diagnostics(water, old).air, beforeAir[1] - diagnostics(water, fused).air, `${scenario}: degas mass delta`);
    checks += 1;
  }
  return { scenario, steps: checks, cells: water.h.length, diagnostics: diagnostics(water, fused), hashes: fused.arrays.map(hash) };
}

function defaultPadangGrid() {
  const config: SurfZoneConfig = { spot: 'padang', seed: 8761, significantHeight: 3.8, peakPeriod: 18, directionDegrees: 0, spreading: 150, tide: 0, dx: 2, fineSpacing: 1, componentCount: 64 };
  const tank = tankLayout(config), width = alongShoreOf(config), spot = createSpot('padang', config.seed);
  const water = new ShallowWaterSolver({ nx: Math.round(width / config.dx!), xMin: -width / 2, dx: config.dx!, zEdges: stretchedEdges(tank.offshore, tank.shore, tank.fineFrom, config.fineSpacing!, config.coarseSpacing ?? 4), xBoundary: 'open' }, (x, z) => tankDepth(spot, tank.edgeDepth, x, z, tank));
  const breaking = new Float64Array(water.h.length);
  for (let i = 0; i < water.h.length; i += 1) {
    const row = Math.floor(i / water.nx), z = water.zCenters[row];
    const still = water.restLevel - water.bed[i];
    const inSurf = z > -220 && z < -20 && still > 0.1 && still < 12;
    water.h[i] = Math.max(0, still + (inSurf ? 0.35 + 0.3 * Math.sin(i / 13) : 0));
    water.qx[i] = water.h[i] * (inSurf ? 0.6 : 0.1);
    water.qz[i] = water.h[i] * (inSurf ? 3 : 0.3);
    if (inSurf && i % 19 === 0) breaking[i] = 0.5;
  }
  return { water, breaking, config, tank };
}

/** Counts explicit typed-array construction only, not arbitrary V8 heap allocation or GC. */
function countTypedAllocations<T>(operation: () => T) {
  const names = ['Float64Array', 'Uint32Array', 'Uint8Array'] as const;
  const counts = Object.fromEntries(names.map((name) => [name, 0])) as Record<typeof names[number], number>;
  const originals = names.map((name) => globalThis[name]);
  try {
    for (let n = 0; n < names.length; n += 1) {
      const name = names[n];
      Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: new Proxy(originals[n], { construct(target, args) { counts[name] += 1; return Reflect.construct(target, args); } }) });
    }
    return { result: operation(), counts };
  } finally {
    for (let n = 0; n < names.length; n += 1) Object.defineProperty(globalThis, names[n], { configurable: true, writable: true, value: originals[n] });
  }
}

function measure(water: ShallowWaterSolver, breaking: Float64Array, constructors: Constructors, warmup: number, frames: number) {
  const state = fields(water, constructors);
  const rows = Array.from({ length: frames }, () => ({ foam: 0, sources: 0, aeration: 0, total: 0 }));
  const step = (row?: typeof rows[number]) => {
    const start = performance.now();
    state.foam.update(1 / 60, breaking, state.stencil);
    const foam = performance.now();
    boreSources(water, state, breaking, 1 / 60);
    const sources = performance.now();
    state.air.update(1 / 60, state.stencil);
    const end = performance.now();
    if (row) { row.foam = foam - start; row.sources = sources - foam; row.aeration = end - sources; row.total = end - start; }
  };
  const warm = countTypedAllocations(() => { for (let n = 0; n < warmup; n += 1) step(); });
  const measured = countTypedAllocations(() => { for (const row of rows) step(row); });
  const mean = Object.fromEntries(['foam', 'sources', 'aeration', 'total'].map((key) => [key, rows.reduce((sum, row) => sum + row[key as keyof typeof row], 0) / frames]));
  return { rows, mean, warmupTypedArrays: warm.counts, measuredTypedArrays: measured.counts, hashes: state.arrays.map(hash), diagnostics: diagnostics(water, state) };
}

export async function report(frames = 30, trials = 3, warmup = 30) {
  const oracle = await checkpointOracle();
  const replay = (['uniform', 'stretched', 'boundary', 'stale'] as const).map((scenario) => differentialReplay(oracle.before, scenario));
  const { water, breaking, config, tank } = defaultPadangGrid();
  const pairs: { order: readonly ('before' | 'current')[]; before: ReturnType<typeof measure>; current: ReturnType<typeof measure>; saved: number }[] = [];
  for (let trial = 0; trial < trials; trial += 1) {
    const order = trial % 2 ? ['current', 'before'] as const : ['before', 'current'] as const;
    const pair = {} as Record<'before' | 'current', ReturnType<typeof measure>>;
    for (const mode of order) pair[mode] = measure(water, breaking, mode === 'before' ? oracle.before : current, warmup, frames);
    deepStrictEqual(pair.before.hashes, pair.current.hashes, 'benchmark final public fields differ');
    deepStrictEqual(pair.before.diagnostics, pair.current.diagnostics, 'benchmark mass/energy diagnostics differ');
    pairs.push({ order, ...pair, saved: pair.before.mean.total - pair.current.mean.total });
  }
  const median = (numbers: number[]) => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)];
  return {
    generatedAt: new Date().toISOString(), checkpoint: CHECKPOINT, oracle: { dir: oracle.dir, sources: oracle.sources },
    currentSources: Object.fromEntries(['FoamField', 'AerationField'].map((name) => [name, createHash('sha256').update(readFileSync(`src/wave/${name}.ts`)).digest('hex')])),
    machine: cpus()[0]?.model, node: process.version, frames, trials, warmup, config, tank,
    grid: { nx: water.nx, nz: water.nz, cells: water.h.length, breakingCells: breaking.reduce((count, b) => count + (b > 0 ? 1 : 0), 0) }, replay, pairs,
    summary: { before: Object.fromEntries(['foam', 'sources', 'aeration', 'total'].map((key) => [key, median(pairs.map((pair) => pair.before.mean[key]))])), current: Object.fromEntries(['foam', 'sources', 'aeration', 'total'].map((key) => [key, median(pairs.map((pair) => pair.current.mean[key]))])), pairedMedianSaved: median(pairs.map((pair) => pair.saved)) },
    limitations: 'Isolated Node field work on the actual ordinary Padang Big grid, with prescribed flow and sparse bores. No water solving, rendering, or gameplay FPS claim. Allocation counters cover explicit typed-array construction only; stage medians are not summed into total.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
  const result = await report(Number(option('frames') ?? 30), Number(option('trials') ?? 3), Number(option('warmup') ?? 30));
  const out = option('out');
  if (out) writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ grid: result.grid, summary: result.summary, replay: result.replay.map(({ scenario, steps }) => ({ scenario, steps })), output: out }, null, 2)}\n`);
}
