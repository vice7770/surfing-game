/**
 * pool-barrel (2026-11-01): canyon-b's pin check, for the Wave Pool. Is a build's sea byte for byte another's? For each
 * spot (the shared Medium swell) and the Wave Pool's three Training sizes (its own machine, `physicalSettingsFor`), a small
 * sea (seed 1, stage 2 on the CPU, one period's spin-up) stepped STEPS times at 1/30 s, then an FNV-1a hash over its
 * solver's bed, water depth and fluxes and its breaking, with its take-off, start offset and tank. Run the same file
 * bundled against two trees (main's and the branch's) and compare the lines: they must match exactly. `--barrel` adds the
 * Barrel sizes (the branch only).
 *   rolldown docs/research/pool-barrel-2026-11-01/pin-check.ts -o dist/scripts/pool-pin-check.mjs --format esm --platform node && node dist/scripts/pool-pin-check.mjs [steps] [--barrel]
 */
import { SWELLS, physicalSettingsFor, type SurfConditions } from '../../../src/game/SurfConditions';
import { SurfZoneSimulation, rideLineupOffset, takeOffPoint, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const STEPS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 60);
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
const shared = { seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0 };
const pool = (swellSize: 'small' | 'medium' | 'big', waves?: 'barrel') => {
  const s = physicalSettingsFor('pool', { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday', ...(waves ? { waves } : {}) } as SurfConditions, { stage: 2, compute: 'cpu' });
  return { spot: 'pool', seed: 1, significantHeight: s.significantHeight, peakPeriod: s.peakPeriod, directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0, ...((s as { poolWaves?: string }).poolWaves ? { poolWaves: 'barrel' } : {}) };
};
const cases: [string, Partial<SurfZoneConfig>][] = [
  ['beach', { ...shared, spot: 'beach' }], ['point', { ...shared, spot: 'point' }], ['reef', { ...shared, spot: 'reef' }], ['padang', { ...shared, spot: 'padang' }],
  ['canyon', { ...shared, spot: 'canyon' }], ['pool shared swell', { ...shared, spot: 'pool' }],
  ['pool small', pool('small')], ['pool medium', pool('medium')], ['pool big', pool('big')],
  ...(process.argv.includes('--barrel') ? [['pool barrel small', pool('small', 'barrel')], ['pool barrel big', pool('big', 'barrel')]] as [string, Partial<SurfZoneConfig>][] : []),
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
