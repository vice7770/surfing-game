/**
 * The Barrel's costs over a long sea (pool-barrel-perf, 2026-11-06): does anything grow with time? One arm per run (the
 * bench's arms), from its saved 50 s sea, stepped `--seconds` on, every 1/60 s step and its page draw as the bench does;
 * every `--every` steps a line with the window's p50 of each stage and the sizes (the front's records, the slices).
 *
 *   rolldown docs/research/pool-barrel-perf-2026-11-06/long.ts -o dist/scripts/barrel-long.mjs --format esm --platform node
 *   node dist/scripts/barrel-long.mjs --arm a38 --swell medium --seconds 180
 */
import { tubeFaceOf } from '../../../src/wave/barrel/faceAnchor';
import { BARREL_SPOTS } from '../../../src/wave/barrel/barrelSpots';
import { BARREL_CASES } from '../../../src/wave/barrel/barrelLibraryIndex';
import { POOL_TUBE_CASES, POOL_TUBE_STAND_IN } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { createArm as createToday } from './arm';
import { createArm as createBase } from './arm-base';

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const label = option('arm', 'a38');
const swell = option('swell', 'medium') as 'medium' | 'big';
const seconds = Number(option('seconds', '180'));
const every = Number(option('every', '300'));
const base = label.startsWith('base-');
const caseName = label.endsWith('pool') ? 'pool' : 'a38';
const overrides: Record<string, unknown> = { poolTubeCase: caseName, ...(label.startsWith('old-') ? { tubeFace: 'old', tubeFrom: 'piece' } : {}) };
const ids = caseName === 'pool' ? POOL_TUBE_CASES : POOL_TUBE_STAND_IN;
const barrelCases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => ids.includes(entry.id)));
const face = base ? undefined : tubeFaceOf(BARREL_SPOTS.pool?.faceAnchor !== undefined, overrides as never);
const statePath = `/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/barrel-perf/sea-${label}-${swell}-50.sea`;

const quantile = (values: number[], q: number) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : Number.NaN;
};

async function main(): Promise<void> {
  const arm = await (base ? createBase : createToday)({ label, swell, overrides, barrelCases, face, statePath, settle: 50, hash: false });
  const keys = ['cpuStages', 'front', 'crash', 'anchors', 'contact', 'board', 'spray', 'snapshot', 'pageDraw', 'drawLoft', 'mesh', 'frontCount', 'slices', 'vertices', 'samples', 'sprayCount'];
  console.log(`${label} ${swell}: ${arm.grid()}; window p50 (max for sizes) every ${every} steps`);
  let window: Record<string, number>[] = [];
  const steps = Math.round(seconds * 60);
  for (let k = 1; k <= steps; k += 1) {
    window.push(arm.step());
    if (k % every === 0) {
      const t = 50 + k / 60;
      const sizes = ['frontCount', 'slices', 'vertices', 'samples', 'sprayCount'];
      console.log(`t ${t.toFixed(0).padStart(4)} s  ${keys.map((key) => `${key} ${sizes.includes(key) ? Math.max(...window.map((s) => s[key])).toFixed(0) : quantile(window.map((s) => s[key]), 0.5).toFixed(2)}`).join('  ')}`);
      window = [];
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
