/**
 * Isolated foam/aeration work on a deterministic 232,000-cell grid, with the
 * same bore sources between their updates. Independent Node processes keep
 * each variant's JIT warm-up separate. No water stepping or browser rendering.
 *
 * npx rolldown scripts/shared-advection-report.ts -o /tmp/shared-advection.mjs --format esm --platform node
 * node /tmp/shared-advection.mjs --out /tmp/shared-advection.md
 */
import { deepStrictEqual } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { AdvectionStencil } from '../src/wave/AdvectionStencil';
import { AerationField } from '../src/wave/AerationField';
import { FoamField } from '../src/wave/FoamField';
import { ShallowWaterSolver, uniformEdges } from '../src/wave/ShallowWaterSolver';

const option = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const frames = Number(option('frames') ?? 120);
const trials = Number(option('trials') ?? 3);
const mode = option('mode');
if (!(frames > 0 && trials > 0)) throw new Error('Frames and trials must be positive.');

function measure(shared: boolean) {
  const solver = new ShallowWaterSolver({ nx: 320, xMin: -160, dx: 1, zEdges: uniformEdges(-725, 0, 725), xBoundary: 'open' }, () => 2);
  const breaking = new Float64Array(solver.h.length);
  for (let r = 200; r < 440; r += 1) {
    for (let c = 20; c < 280; c += 1) {
      const i = r * solver.nx + c;
      solver.h[i] = 2.2 + 0.15 * Math.sin(r / 10);
      solver.qx[i] = solver.h[i] * 0.4;
      solver.qz[i] = solver.h[i] * 3;
      breaking[i] = 0.5;
    }
  }
  const foam = new FoamField(solver, { dense: 3, residual: 10 });
  const air = new AerationField(solver, { period: 18 });
  const stencil = shared ? new AdvectionStencil() : undefined;
  const dt = 1 / 60;
  const step = () => {
    const begin = performance.now();
    foam.update(dt, breaking, stencil);
    const afterFoam = performance.now();
    for (let n = 0; n < foam.breakingCount; n += 1) {
      const i = foam.breakingCells[n];
      if (foam.dissipation[i] > 0) air.addBore(i, foam.dissipation[i], solver.h[i] - 2, dt);
      air.stir(i, breaking[i], dt);
    }
    const afterSources = performance.now();
    air.update(dt, stencil);
    const end = performance.now();
    return { foam: afterFoam - begin, sources: afterSources - afterFoam, aeration: end - afterSources, total: end - begin };
  };
  for (let frame = 0; frame < 45; frame += 1) step();
  const measurements = [];
  for (let trial = 0; trial < trials; trial += 1) {
    const rows = Array.from({ length: frames }, step);
    measurements.push(Object.fromEntries(['foam', 'sources', 'aeration', 'total'].map((key) => [key, rows.reduce((sum, row) => sum + row[key as keyof typeof row], 0) / frames])));
  }
  const hash = (array: Float64Array) => createHash('sha256').update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)).digest('hex');
  return {
    mode: shared ? 'shared' : 'baseline', measurements, bytes: (stencil?.indices.byteLength ?? 0) + (stencil?.values.byteLength ?? 0),
    hashes: [foam.dense, foam.residual, foam.source, air.air, air.depth, air.turbulence].map(hash),
  };
}

if (mode) {
  if (mode !== 'baseline' && mode !== 'shared') throw new Error('Unknown mode.');
  process.stdout.write(`${JSON.stringify(measure(mode === 'shared'))}\n`);
} else {
  const runs = ['baseline', 'shared'].map((variant) => {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mode', variant, '--frames', String(frames), '--trials', String(trials)], { encoding: 'utf8' });
    if (child.status !== 0) throw new Error(child.stderr || `Child benchmark failed (${child.status}).`);
    return JSON.parse(child.stdout) as ReturnType<typeof measure>;
  });
  deepStrictEqual(runs[0].hashes, runs[1].hashes);
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const columns = ['foam', 'sources', 'aeration', 'total'];
  const summary = runs.map((run) => ({ mode: run.mode, bytes: run.bytes, ...Object.fromEntries(columns.map((key) => [key, median(run.measurements.map((row) => row[key]))])) }));
  const lines = [
    '# Shared advection CPU report', '',
    `Machine: ${cpus()[0]?.model ?? 'unknown'}; Node ${process.version}; ${trials} trials × ${frames} frames after 45 warm-up frames per variant.`, '',
    'A uniform 320 × 725 grid carries a steady current and 62,400 breaking cells. Both variants update foam, add the same cached bore dissipation and turbulence, then update aeration. These are isolated CPU timings, with no solver or renderer, and establish no gameplay FPS claim.', '',
    '| Variant | Foam, ms | Sources/stir, ms | Aeration, ms | Combined, ms | Stencil memory |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...summary.map((row) => `| ${row.mode} | ${columns.map((key) => row[key as keyof typeof row] as number).map((value) => value.toFixed(3)).join(' | ')} | ${(row.bytes / 1e6).toFixed(2)} MB |`), '',
    'Every final dense/residual/source/air/depth/turbulence array has the same SHA-256 hash. Unit replay checks also compare arrays exactly across changing flow, step sizes, dry cells and moving windows.', '',
    'The shared path records the departure cell and the original double-precision tx/tz in foam’s existing loop, then aeration reconstructs the same bilinear weights. Only the lookup is shared; bore sources and stirring still happen before aeration advection.', '',
  ];
  const out = option('out');
  if (out) {
    writeFileSync(out, lines.join('\n'));
    writeFileSync(out.replace(/\.md$/, '') + '.json', `${JSON.stringify({ frames, trials, runs, summary }, null, 2)}\n`);
  }
  process.stdout.write(lines.join('\n'));
}
