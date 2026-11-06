/**
 * The Wave Pool Barrel's frame-rate bench (pool-barrel-perf, 2026-11-06): the worker's CPU stages and the page's barrel
 * work per 1/60 s step, paired in one Node process across arms, stepped in alternating blocks so a busy spell falls on all.
 * Each arm is `arm.ts` (this tree) or `arm-base.ts` (the same file importing `.m1-cpu-base/src`, the pre-tube main).
 *
 *   git archive 135782d6 src | tar -x -C .m1-cpu-base
 *   sed 's#\.\./\.\./\.\./src/#../../../.m1-cpu-base/src/#g' docs/research/pool-barrel-perf-2026-11-06/arm.ts > docs/research/pool-barrel-perf-2026-11-06/arm-base.ts
 *   rolldown docs/research/pool-barrel-perf-2026-11-06/bench.ts -o dist/scripts/barrel-bench.mjs --format esm --platform node
 *   node dist/scripts/barrel-bench.mjs --swell medium --arms base-pool,old-pool,a38,pool --steps 600
 *
 * Arms: `base-pool` / `base-a38` (135782d6, its default pool cases / `poolTubeCase` a38), `a38` (today's default),
 * `pool` (`?poolTubeCase=pool`), `old-a38` / `old-pool` (`?tubeFace=old&tubeFrom=piece`, with either case), and any
 * `name=key:value+key:value` arm of today's tree (config overrides, e.g. `nocache=tubeLoftCache:old`).
 * `--hash 1` prints each arm's snapshot and drawn-mesh hashes (identity: the same hashes, the same bytes).
 */
import { writeFileSync } from 'node:fs';
import { tubeFaceOf } from '../../../src/wave/barrel/faceAnchor';
import { BARREL_SPOTS } from '../../../src/wave/barrel/barrelSpots';
import { BARREL_CASES } from '../../../src/wave/barrel/barrelLibraryIndex';
import { POOL_TUBE_CASES, POOL_TUBE_STAND_IN } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { LOFT } from '../../../src/wave/barrel/sweptLoft';
import { createArm as createToday } from './arm';
import { createArm as createBase } from './arm-base';

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const swell = option('swell', 'medium') as 'medium' | 'big';
const steps = Number(option('steps', '600'));
const block = Number(option('block', '25'));
const warm = Number(option('warm', '60'));
const hash = option('hash', '0') === '1';
const settle = Number(option('settle', '50'));
const out = option('out', '');
const armNames = option('arms', 'base-pool,a38,pool').split(',');
// `--loftSpacing <m>`: every loft of today's tree (the drawing's and the contact's) sampled this far apart along its front
// in place of `LOFT.spacing` (0.5 m), for the options' costs (it changes the look and the feel; not a game switch).
const loftSpacing = Number(option('loftSpacing', 'NaN'));
if (loftSpacing > 0) (LOFT as { spacing: number }).spacing = loftSpacing;
// `--loft levels=1,frames=6`: any of `LOFT`'s numbers so (the clock refinement's depth and threshold), for the options.
for (const pair of option('loft', '').split(',').filter(Boolean)) {
  const [key, value] = pair.split('=');
  (LOFT as unknown as Record<string, number>)[key] = Number(value);
}

const a38Cases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id)));
const poolCases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_CASES.includes(entry.id)));

async function build(name: string) {
  // `arm=key:value+key:value`: the arm's sea (its saved state) with config overrides; `barrelHeight:old` is the page's.
  const [label, spec] = name.split('=');
  const overrides: Record<string, unknown> = {};
  const page: Record<string, string> = {};
  if (spec) for (const pair of spec.split('+')) {
    const [key, value] = pair.split(':');
    if (key === 'barrelHeight' || key === 'cameraWater' || key === 'barrelMesh' || key === 'particles') page[key] = value;
    else overrides[key] = value === 'true' ? true : value === 'false' ? false : value;
  }
  const base = label.startsWith('base-');
  const caseName = label.endsWith('pool') || overrides.poolTubeCase === 'pool' ? 'pool' : 'a38';
  if (label.startsWith('old-')) Object.assign(overrides, { tubeFace: 'old', tubeFrom: 'piece' });
  overrides.poolTubeCase = caseName;
  const barrelCases = caseName === 'pool' ? poolCases : a38Cases;
  const face = base ? undefined : tubeFaceOf(BARREL_SPOTS.pool?.faceAnchor !== undefined, overrides as never);
  const create = base ? createBase : createToday;
  const statePath = `/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/barrel-perf/sea-${label}-${swell}-${settle}.sea`;
  return create({ label: name, swell, overrides, barrelCases, face, statePath, settle, hash, page });
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
    arms.push(await build(name));
    console.log(`${name}: ${arms[arms.length - 1].grid()} (${((Date.now() - t) / 1000).toFixed(0)} s to build)`);
  }
  for (const arm of arms) for (let k = 0; k < warm; k += 1) arm.step();
  const samples = arms.map(() => [] as Record<string, number>[]);
  for (let done = 0; done < steps; done += block) {
    for (let a = 0; a < arms.length; a += 1) {
      for (let k = 0; k < block && done + k < steps; k += 1) samples[a].push(arms[a].step());
    }
  }
  const keys = Object.keys(samples[0][0]);
  const lines: string[] = [];
  lines.push(`Wave Pool Barrel, ${swell}, ${steps} steps per arm after ${warm} warm, blocks of ${block}, Node ${process.version}; ms p50 / p95 (counts: p50 / max; mean where marked)`);
  for (const key of keys) {
    const row = arms.map((arm, a) => {
      const values = samples[a].map((s) => s[key]).filter(Number.isFinite);
      const counts = ['samples', 'builds', 'frontCount', 'slices', 'vertices', 'triangles', 'contactSlices', 'contactVertices', 'uploadRich', 'transfer', 'maskBytes', 'sprayCount', 'bubbleCount', 'lipCount', 'lipLaunches', 'deviceUpload', 'uploadAll', 'tubeFragments', 'tubeCovered', 'sprayFragments', 'inTubeMesh', 'inTubeSpray'].includes(key);
      return counts ? `${quantile(values, 0.5).toFixed(0)} / ${most(values).toFixed(0)} (mean ${mean(values).toFixed(0)})`
        : `${quantile(values, 0.5).toFixed(3)} / ${quantile(values, 0.95).toFixed(3)} (mean ${mean(values).toFixed(3)})`;
    });
    lines.push(`${key.padEnd(16)} ${row.map((cell, a) => `${arms[a].label}: ${cell}`).join(' | ')}`);
  }
  if (hash) for (const arm of arms) lines.push(`hashes ${arm.label}: ${JSON.stringify(arm.hashes())}`);
  const text = lines.join('\n');
  console.log(text);
  if (out) writeFileSync(out, `${text}\n`);
  if (process.argv.includes('--dump')) writeFileSync(`${out || 'bench'}.json`, JSON.stringify({ arms: arms.map((a) => a.label), samples }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
