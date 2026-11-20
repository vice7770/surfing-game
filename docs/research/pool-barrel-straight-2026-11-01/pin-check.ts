/**
 * pool-barrel-straight (2026-11-01): pool-barrel's pin check against main (c7fb4176): every spot on the shared Medium swell,
 * the Wave Pool's three Training sizes on its own machine, and step 1's A-frame Barrel (on main the Barrel's floor; here
 * `poolBarrel: 'aframe'`) at step 1's heights, each a small sea stepped STEPS times, hashed (FNV-1a over the bed, h, qx, qz
 * and the breaking), with its take-off, start and tank. Bundle against both trees and compare the lines.
 *   rolldown docs/research/pool-barrel-straight-2026-11-01/pin-check.ts -o dist/scripts/straight-pin.mjs --format esm --platform node && node dist/scripts/straight-pin.mjs [steps]
 */
import { SWELLS, physicalSettingsFor, type SurfConditions } from '../../../src/game/SurfConditions';
import { SurfZoneSimulation, rideLineupOffset, takeOffPoint, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const STEPS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 60);
const swell = SWELLS.medium;
function hash(arrays: ArrayLike<number>[]): string {
  let h = 0x811c9dc5;
  const view = new DataView(new ArrayBuffer(8));
  for (const array of arrays) for (let i = 0; i < array.length; i += 1) {
    view.setFloat64(0, array[i]);
    for (let b = 0; b < 8; b += 1) h = Math.imul(h ^ view.getUint8(b), 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
const shared = { seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0 };
const pool = (swellSize: 'small' | 'medium' | 'big') => {
  const s = physicalSettingsFor('pool', { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday' } as SurfConditions, { stage: 2, compute: 'cpu' });
  return { spot: 'pool', seed: 1, significantHeight: s.significantHeight, peakPeriod: s.peakPeriod, directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0 };
};
// Step 1's A-frame Barrel at its own heights (0.99 and 1.24 m at the feed).
const aframe = (height: number) => ({ spot: 'pool', seed: 1, significantHeight: Math.SQRT2 * height, peakPeriod: 10, directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0, poolWaves: 'barrel', poolBarrel: 'aframe' });
const cases: [string, Partial<SurfZoneConfig>][] = [
  ['beach', { ...shared, spot: 'beach' }], ['point', { ...shared, spot: 'point' }], ['reef', { ...shared, spot: 'reef' }], ['padang', { ...shared, spot: 'padang' }],
  ['canyon', { ...shared, spot: 'canyon' }], ['pool shared swell', { ...shared, spot: 'pool' }],
  ['pool small', pool('small')], ['pool medium', pool('medium')], ['pool big', pool('big')],
  ['pool A-frame barrel small', aframe(0.99) as Partial<SurfZoneConfig>], ['pool A-frame barrel big', aframe(1.24) as Partial<SurfZoneConfig>],
];
for (const [name, extra] of cases) {
  const config = { stage: 2, compute: 'cpu', spinUpPeriods: 1, componentCount: 24, ...extra } as unknown as SurfZoneConfig;
  const sim = new SurfZoneSimulation(config);
  for (let n = 0; n < STEPS; n += 1) sim.step(1 / 30);
  const { solver } = sim;
  const s = solver as unknown as { bed: Float64Array; h: Float64Array; qx: Float64Array; qz: Float64Array };
  const t = takeOffPoint(config);
  console.log(`${name}: sea ${hash([s.bed, s.h, s.qx, s.qz, sim.breaking.strength])} grid ${solver.nx}×${solver.nz} take-off ${t.x.toFixed(3)},${t.z.toFixed(3)} start ${rideLineupOffset(config)} tank ${JSON.stringify(tankLayout(config))} jets ${sim.lipJets}`);
}
