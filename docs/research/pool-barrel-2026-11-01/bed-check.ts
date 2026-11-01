/**
 * pool-barrel (2026-11-01): the barrel floor's geometry, for a parameter set: where each column's knee lies against the
 * terrace's edge (the platform must start shoreward of it, so the bed is continuous there), and transects along +z.
 *   rolldown docs/research/pool-barrel-2026-11-01/bed-check.ts -o dist/scripts/pool-bed-check.mjs --format esm --platform node \
 *     && node dist/scripts/pool-bed-check.mjs [--barrel key=value,...]
 */
import { POOL_BARREL, poolBarrelDepth, poolBarrelGradient, poolBarrelCrestDepth, poolBarrelPlatformZ, poolCrestZ, poolNormalShare, poolRampFootZ } from '../../../src/wave/pool';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
for (const pair of (option('barrel') ?? '').split(',').filter(Boolean)) {
  const [key, value] = pair.split('=');
  (POOL_BARREL as Record<string, number>)[key] = Number(value);
}
const edge = poolBarrelPlatformZ();
let worst = { x: 0, margin: Infinity, step: 0 };
let biggest = { x: 0, step: 0 };
for (let x = 0; x <= 140; x += 0.5) {
  // Where the face's rounded knee ends, seaward of the crest line, square to it: (platform − crest)/G + rounding.
  const knee = (POOL_BARREL.platformDepth - poolBarrelCrestDepth(x)) / poolBarrelGradient(x) + POOL_BARREL.kneeRounding;
  const z = poolCrestZ(x, POOL_BARREL) - knee / poolNormalShare(x, POOL_BARREL);
  const step = poolBarrelDepth(x, edge - 1e-6) - poolBarrelDepth(x, edge + 1e-6);
  if (z - edge < worst.margin) worst = { x, margin: z - edge, step };
  if (Math.abs(step) > Math.abs(biggest.step)) biggest = { x, step };
}
console.log(`biggest step at the platform's edge ${biggest.step.toFixed(4)} m at x ${biggest.x}`);
console.log(`terrace edge z ${edge}, ramp foot ${poolRampFootZ()}; the knee's least margin shoreward of the edge ${worst.margin.toFixed(2)} m at x ${worst.x} (step there ${worst.step.toFixed(4)} m)`);
for (const x of [0, 5, 10, 15, 20, 27, 35, 45, 55, 70, 100, 139]) {
  const row: string[] = [];
  for (let z = -320; z <= 0; z += 10) row.push(poolBarrelDepth(x, z).toFixed(2));
  console.log(`x ${String(x).padStart(3)} crest z ${poolCrestZ(x, POOL_BARREL).toFixed(0)}: ${row.join(' ')}`);
}
