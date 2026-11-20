/**
 * canyon-b (2026-11-01): is a build's sea byte for byte another's? For each spot (and the Canyon's `?canyonBed=old`), a
 * small sea (Medium, seed 1, stage 2 on the CPU, one period's spin-up) stepped STEPS times at 1/30 s, then an FNV-1a hash
 * over its solver's bed, water depth and fluxes and its breaking, with its take-off, start offset and bounds. Run the same
 * file bundled against two trees (main's and the branch's) and compare the lines: every other spot, and the old Canyon
 * against main's Canyon, must match exactly.
 *   rolldown docs/research/canyon-b-2026-11-01/pin-check.ts -o dist/scripts/pin-check.mjs --format esm --platform node && node dist/scripts/pin-check.mjs
 */
import { SWELLS } from '../../../src/game/SurfConditions';
import { SurfZoneSimulation, rideLineupOffset, takeOffPoint, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const STEPS = Number(process.argv[2] ?? 60);
const swell = SWELLS.medium;
function hash(arrays: ArrayLike<number>[]): string {
  let h = 0x811c9dc5;
  const view = new DataView(new ArrayBuffer(8));
  for (const array of arrays) {
    for (let i = 0; i < array.length; i += 1) {
      view.setFloat64(0, array[i]);
      for (let b = 0; b < 8; b += 1) h = Math.imul(h ^ view.getUint8(b), 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, '0');
}
const cases: [string, Partial<SurfZoneConfig>][] = [
  ['beach', { spot: 'beach' }], ['point', { spot: 'point' }], ['reef', { spot: 'reef' }], ['padang', { spot: 'padang' }], ['pool', { spot: 'pool' }],
  ['canyon', { spot: 'canyon' }], ['canyon old', { spot: 'canyon', canyonBed: 'old' }],
];
for (const [name, extra] of cases) {
  const config = {
    seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0,
    stage: 2, compute: 'cpu', spinUpPeriods: 1, componentCount: 24, ...extra,
  } as unknown as SurfZoneConfig;
  const sim = new SurfZoneSimulation(config);
  for (let n = 0; n < STEPS; n += 1) sim.step(1 / 30);
  const { solver } = sim;
  const s = solver as unknown as { bed: Float64Array; h: Float64Array; qx: Float64Array; qz: Float64Array };
  const t = takeOffPoint(config);
  const tank = tankLayout(config);
  console.log(`${name}: sea ${hash([s.bed, s.h, s.qx, s.qz, sim.breaking.strength])} grid ${solver.nx}×${solver.nz} take-off ${t.x.toFixed(3)},${t.z.toFixed(3)} start ${rideLineupOffset(config)} tank ${JSON.stringify(tank)}`);
}
