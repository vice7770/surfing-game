// Complete three-field publication kernel only; no water/material step, observer or browser.
import { existsSync, writeFileSync } from 'node:fs';
import { intake } from './intake';
import { Baseline, Candidate, outputs, exactOutputs, exactInputs, scratch, type Scene } from './test-helpers';

export const PLAN = {
  baselineCommit: 'e3e630bc45339e0f7564e59cfdd556275c06de92', cells: 116000, renderNodes: 101913,
  warmPairs: 8, measuredPairs: 24, orderBlock: ['AB', 'BA', 'BA', 'AB'], wholeOperationBoundMs: 20000,
  timedScope: 'Complete writeUniformSnapshot: all velocity/void preprocessing plus all height/foam/flow/air output interpolation and stores.',
  excluded: ['Unchanged Runner pose/event/front/particle packing', 'water/front/lip/contact/body/material steps', 'transport', 'renderer/GPU', 'intake/creation/equality'],
  retainedF32PostState: true, historicalReplay: false, noFpsClaim: true, retries: 0,
};

const data = (array: ArrayBufferView) => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
function fields(scene: Scene): Array<[string, ArrayBufferView]> {
  return [
    ...(['h', 'bed', 'qx', 'qz', 'xCenters', 'zCenters', 'dz'] as const).map(key => [key, scene.solver[key]] as [string, ArrayBufferView]),
    ...(['dense', 'residual'] as const).map(key => ['foam.' + key, scene.foam[key]] as [string, ArrayBufferView]),
    ...(['air', 'depth', 'turbulence'] as const).map(key => ['air.' + key, scene.aeration[key]] as [string, ArrayBufferView]),
  ];
}
function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b), n = sorted.length;
  if (!n) throw Error('Empty statistics');
  return { n, median: n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
    mean: values.reduce((a, b) => a + b, 0) / n, p95: sorted[Math.ceil(n * .95) - 1], min: sorted[0], max: sorted[n - 1] };
}

export function run(out: string, readySha256: string) {
  if (existsSync(out)) throw Error('Refuse overwrite existing cost result');
  const startedAt = new Date().toISOString(), start = performance.now();
  const bound = () => { if (performance.now() - start > PLAN.wholeOperationBoundMs) throw Error('Declared 20 s complete operation bound exceeded'); };
  const input = intake(); bound();
  const prepare = (Arm: typeof Baseline | typeof Candidate) => {
    const scene = new Arm(input.config, 'warm'); scene.importState(input.state);
    const grid = scene.renderGrid(2);
    for (const key of ['nx', 'nz', 'spacing', 'xMin', 'zMin'] as const) if (!Object.is(grid[key], input.grid[key])) throw Error('Controlled render grid changed: ' + key);
    if (scene.solver.h.length !== PLAN.cells || grid.nx * grid.nz !== PLAN.renderNodes) throw Error('Controlled complete workload counts differ');
    const saved = fields(scene).map(([name, value]) => ({ name, value, bytes: Buffer.from(data(value)) }));
    if (saved.some(row => row.value.byteLength === 0)) throw Error('Empty held field');
    const time = scene.solver.time, seaTime = scene.seaTime, buffers = outputs(grid);
    for (const key of ['velocityX', 'velocityZ', 'voidFractions'] as const) if (scratch(scene)[key] !== undefined) throw Error('Unexpected pre-publication scratch: ' + key);
    scene.writeUniformSnapshot(...buffers, grid);
    if (!buffers.every(array => array.every(Number.isFinite))) throw Error('Nonfinite controlled snapshot');
    const identities = { ...scratch(scene) };
    for (const key of ['velocityX', 'velocityZ', 'voidFractions'] as const) if (!(identities[key] instanceof Float64Array) || identities[key]?.length !== scene.solver.h.length) throw Error('Initial scratch allocation changed: ' + key);
    const stable = () => {
      const now = fields(scene);
      for (const [i, row] of saved.entries()) {
        if (now[i][1] !== row.value || !data(row.value).equals(row.bytes)) throw Error('Held input changed: ' + row.name);
      }
      if (!Object.is(scene.solver.time, time) || !Object.is(scene.seaTime, seaTime)) throw Error('Held clocks changed');
      for (const key of ['velocityX', 'velocityZ', 'voidFractions'] as const) if (scratch(scene)[key] !== identities[key]) throw Error('Steady scratch reallocated: ' + key);
    };
    const call = (): number => {
      const t0 = performance.now(); scene.writeUniformSnapshot(...buffers, grid); return performance.now() - t0;
    };
    stable(); bound(); return { scene, grid, buffers, stable, call };
  };
  const a = prepare(Baseline), b = prepare(Candidate);
  exactOutputs(a.buffers, b.buffers); exactInputs(a.scene, b.scene);
  const equal = () => { exactOutputs(a.buffers, b.buffers); exactInputs(a.scene, b.scene); a.stable(); b.stable(); bound(); };
  const pair = (order: string) => {
    let baselineMs: number, candidateMs: number;
    if (order === 'AB') { baselineMs = a.call(); candidateMs = b.call(); }
    else { candidateMs = b.call(); baselineMs = a.call(); }
    equal(); return { order, baselineMs, candidateMs, savingMs: baselineMs - candidateMs };
  };
  for (let i = 0; i < PLAN.warmPairs; i++) pair(PLAN.orderBlock[i % 4]);
  const rows = Array.from({ length: PLAN.measuredPairs }, (_, i) => pair(PLAN.orderBlock[i % 4]));
  equal();
  const report = {
    schema: 'full-snapshot-writer-cost/v1', valid: true, startedAt, finishedAt: new Date().toISOString(), elapsedMs: performance.now() - start,
    readySha256, plan: PLAN, inputAuthority: input.authority, config: input.config, grid: a.grid,
    actualCounts: { cells: a.scene.solver.h.length, nodes: a.grid.nx * a.grid.nz, outputFloat32Words: a.buffers.reduce((n, x) => n + x.length, 0) },
    rows, baseline: stats(rows.map(row => row.baselineMs)), candidate: stats(rows.map(row => row.candidateMs)), pairedSaving: stats(rows.map(row => row.savingMs)),
    positivePairs: rows.filter(row => row.savingMs > 0).length,
    orderStrata: ['AB', 'BA'].map(order => ({ order, pairedSaving: stats(rows.filter(row => row.order === order).map(row => row.savingMs)) })),
    allOutputAndScratchBitsExact: true, allInputIdentitiesBytesClocksUnchanged: true, initialScratchEmptyAndAllocationSizesVerified: true, steadyScratchIdentitiesUnchanged: true,
    limitations: ['Single controlled retained F32 poststate imported into F64 accepted e3, not historical original precision or late live gameplay.',
      'No solver step, BreakingModel.update(0), foam/air source or evolution, contact/body, front/lip replay, particles, postMessage or GPU/render work.',
      'Includes whole three-field preprocess/interpolation writer; excludes unchanged other Runner.fill packing.',
      'Source removes optional dispatch branches; optimizing runtimes may already specialize them. One CPU result is not FPS or adoption.'],
  };
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ valid: true, out, elapsedMs: report.elapsedMs, baseline: report.baseline, candidate: report.candidate, pairedSaving: report.pairedSaving, positivePairs: report.positivePairs }));
  return report;
}
