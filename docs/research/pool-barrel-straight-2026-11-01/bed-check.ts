/**
 * pool-barrel-straight (2026-11-01): the straight floor's geometry: the wrap columns identical, the knee inside the platform,
 * the crest along the reef, and transects along +z.
 *   rolldown docs/research/pool-barrel-straight-2026-11-01/bed-check.ts -o dist/scripts/straight-bed.mjs --format esm --platform node && node dist/scripts/straight-bed.mjs
 */
import { POOL_STRAIGHT, poolStraightAt, poolStraightCrestDepth, poolStraightDepth, poolStraightPlatformZ } from '../../../src/wave/pool';

let worst = 0;
for (let z = -330; z <= 5; z += 0.5) worst = Math.max(worst, Math.abs(poolStraightDepth(-139.5, z) - poolStraightDepth(139.5, z)), Math.abs(poolStraightDepth(-140, z) - poolStraightDepth(140, z)));
console.log(`wrap: largest difference between the columns at ±140 (and ±139.5) ${worst.toFixed(6)} m; the platform's edge z ${poolStraightPlatformZ()}`);
let step = 0;
for (let x = -140; x <= 140; x += 0.5) step = Math.max(step, Math.abs(poolStraightDepth(x, poolStraightPlatformZ() + 1e-6) - poolStraightDepth(x, poolStraightPlatformZ() - 1e-6)));
console.log(`the largest step at the platform's edge ${step.toFixed(4)} m`);
for (const s of [0, 15, 30, 40, 50, 65, 100, 150, 175, 190, 205, 220, 235]) {
  const p = poolStraightAt(s);
  console.log(`s ${s}: x ${p.x.toFixed(1)}, z ${p.z.toFixed(1)}, crest ${poolStraightCrestDepth(s).toFixed(2)} m`);
}
for (const x of [139, 120, 100, 84, 60, 20, -20, -60, -100, -139]) {
  const row: string[] = [];
  for (let z = -320; z <= 0; z += 10) row.push(poolStraightDepth(x, z).toFixed(2));
  console.log(`x ${String(x).padStart(4)}: ${row.join(' ')}`);
}
void POOL_STRAIGHT;
