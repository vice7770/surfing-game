/**
 * pool-tube-contact (2026-11-05): the step 7 follow-up's pin check. pin-wall's lines (every spot without a library, water
 * only; every swept barrel's whole path with its own library: the sea, the front's points, the crash's ledger, the contact's
 * loft and the drawing's loft, each hashed with FNV-1a over float64s after STEPS steps of 1/30 s from a spun-up start), and
 * at the pool's straight Barrel also the water the bodies feel: `PhysicalSurfWater.sampleAt` on a grid through the waves
 * (three columns, z −200…−100 every 0.5 m, eight heights from 0.5 m under the still level to 2 m over it): its surface,
 * normal, slope, flow and layers. The Barrel runs with the follow-up's four switches old
 * (`?tubeContact=old&tubeCap=old&tubeMerge=old`, the guard off by default since it became opt-in; on main the keys are unknown
 * and ignored, so main's default),
 * alone and with step 7's three old too, on each case list at 1.5 and 1.8 m; and each tree's default, twice. Bundle against
 * both trees and compare the lines (every line but the defaults must match):
 *   rolldown docs/research/pool-tube-contact-2026-11-05/pin-contact.ts -o dist/scripts/contact-pin.mjs --format esm --platform node && node dist/scripts/contact-pin.mjs [steps]
 */
import { SWELLS, physicalSettingsFor, type SurfConditions } from '../../../src/game/SurfConditions';
import { libraryFromBytes, POOL_TUBE_CASES, POOL_TUBE_STAND_IN } from '../../../src/wave/barrel/barrelLibrary';
import { BARREL_CASES } from '../../../src/wave/barrel/barrelLibraryIndex';
import { FRONT_CAPACITY, FRONT_STRIDE } from '../../../src/wave/barrel/frontRecords';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { SweptContact } from '../../../src/wave/barrel/sweptContact';
import { BARREL_SLOPE, SweptLoft } from '../../../src/wave/barrel/sweptLoft';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { createWaterSample } from '../../../src/physics/SurfWater';
import { SurfZoneSimulation, rideLineupOffset, takeOffPoint, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import type { SpotName } from '../../../src/wave/Bathymetry';

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
const barrel = (height: number, extra: Record<string, unknown> = {}) => ({
  spot: 'pool', seed: 1, significantHeight: Math.SQRT2 * height, peakPeriod: 10, directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0, poolWaves: 'barrel', ...extra,
});
// The guard is opt-in since 2026-11-05 (`?tubeGuard=on`), so off by default: the three old are main's build.
const followUpOld = { tubeContact: 'old', tubeCap: 'old', tubeMerge: 'old' };
const wallOld = { tubeAnchor: 'old', tubeForm: 'old', wallFlow: 'old' };
const plain: [string, Partial<SurfZoneConfig>][] = [
  ['beach', { ...shared, spot: 'beach' }], ['point', { ...shared, spot: 'point' }], ['reef', { ...shared, spot: 'reef' }], ['padang', { ...shared, spot: 'padang' }],
  ['canyon', { ...shared, spot: 'canyon' }], ['pool shared swell', { ...shared, spot: 'pool' }],
  ['pool small', pool('small')], ['pool medium', pool('medium')], ['pool big', pool('big')],
  ['pool A-frame barrel small', barrel(0.99, { poolBarrel: 'aframe' }) as Partial<SurfZoneConfig>],
];
for (const [name, extra] of plain) {
  const config = { stage: 2, compute: 'cpu', spinUpPeriods: 1, componentCount: 24, ...extra } as unknown as SurfZoneConfig;
  const sim = new SurfZoneSimulation(config);
  for (let n = 0; n < STEPS; n += 1) sim.step(1 / 30);
  const s = sim.solver as unknown as { bed: Float64Array; h: Float64Array; qx: Float64Array; qz: Float64Array };
  const t = takeOffPoint(config);
  console.log(`${name}: sea ${hash([s.bed, s.h, s.qx, s.qz, sim.breaking.strength])} grid ${sim.solver.nx}×${sim.solver.nz} take-off ${t.x.toFixed(3)},${t.z.toFixed(3)} start ${rideLineupOffset(config)} tank ${JSON.stringify(tankLayout(config))} jets ${sim.lipJets}`);
}
const ownCases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_CASES.includes(entry.id)));
const a38Cases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id)));
const swept: [string, Partial<SurfZoneConfig>, SpotName, Uint8Array[], number][] = [
  ['padang swept', { ...shared, spot: 'padang' }, 'padang', readBarrelCases('padang'), STEPS],
  ['canyon swept (canyonTube on)', { ...shared, spot: 'canyon', sweptBarrel: true }, 'canyon', readBarrelCases('canyon'), STEPS],
  ['reef swept', { ...shared, spot: 'reef', sweptBarrel: true }, 'reef', readBarrelCases('reef'), STEPS],
];
for (const [cases, bytes] of [['a38', a38Cases], ['pool cases', ownCases]] as const) {
  for (const height of [1.05, 1.32]) {
    const size = height === 1.05 ? '1.5 m' : '1.8 m';
    swept.push([`pool barrel ${size} ${cases}, follow-up off`, barrel(height, { ...followUpOld, poolTubeCase: cases === 'a38' ? 'a38' : 'pool' }) as Partial<SurfZoneConfig>, 'pool', bytes, 4 * STEPS]);
    swept.push([`pool barrel ${size} ${cases}, follow-up and step 7 off`, barrel(height, { ...followUpOld, ...wallOld, poolTubeCase: cases === 'a38' ? 'a38' : 'pool' }) as Partial<SurfZoneConfig>, 'pool', bytes, 4 * STEPS]);
  }
}
swept.push(
  ['pool barrel 1.5 m, the guard on', barrel(1.05, { tubeGuard: 'on' }) as Partial<SurfZoneConfig>, 'pool', a38Cases, 4 * STEPS],
  ['pool barrel 1.5 m, default', barrel(1.05) as Partial<SurfZoneConfig>, 'pool', a38Cases, 4 * STEPS],
  ['pool barrel 1.5 m, default again', barrel(1.05) as Partial<SurfZoneConfig>, 'pool', a38Cases, 4 * STEPS],
  ['pool barrel 1.8 m, default', barrel(1.32) as Partial<SurfZoneConfig>, 'pool', a38Cases, 4 * STEPS],
);
const sample = createWaterSample();
for (const [name, extra, spot, bytes, steps] of swept) {
  const config = { stage: 2, compute: 'cpu', spinUpPeriods: 1, componentCount: 24, ...extra } as unknown as SurfZoneConfig;
  const library = libraryFromBytes(bytes, 'basilisk', spot);
  const sim = new SurfZoneSimulation(config, 'spun-up', library);
  const slope = BARREL_SLOPE[spot]!;
  const face = (sim as unknown as { tubeFace?: object }).tubeFace;
  const contact = new SweptContact(library, slope, face ? { face } as never : {});
  const water = PhysicalSurfWater.forSimulation(sim, contact, 1);
  const drawing = new SweptLoft(library, slope, { holdClearDrawing: true, ...(face ? { face } as never : {}) });
  const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
  const loftHashes: string[] = [];
  const contactHashes: string[] = [];
  const surfaces: number[] = [];
  const felt: number[] = [];
  let frontPoints = 0;
  for (let n = 1; n <= steps; n += 1) {
    sim.step(1 / 30);
    if (n % 15 !== 0) continue;
    const count = sim.writeTubeRecords(records);
    // Only the fields both trees write: a record's first nine.
    const nine = new Float64Array(9 * count);
    for (let k = 0; k < count; k += 1) for (let f = 0; f < 9; f += 1) nine[9 * k + f] = records[k * FRONT_STRIDE + f];
    frontPoints += count;
    water.withSurfaceNodeCache(() => contact.update(records, count, sim.solver.restLevel, (x, z) => water.plainSurfaceAt(x, z)));
    const c = contact.last;
    contactHashes.push(c ? hash([c.positions.subarray(0, 3 * c.vertexCount), c.indices.subarray(0, c.indexCount)]) : '-');
    const d = drawing.build(records, count, sim.solver.restLevel, (x, z) => water.plainSurfaceAt(x, z));
    loftHashes.push(hash([d.positions.subarray(0, 3 * d.vertexCount), d.sliceWeight.subarray(0, d.sliceCount), nine]));
    for (let z = -200; z <= -100; z += 5) surfaces.push(water.surfaceAt(0, z));
    // The water the bodies feel, through the waves (the Barrel only: the pool's lines).
    if (spot !== 'pool') continue;
    const rest = sim.solver.restLevel;
    for (const x of [-10, 0, 10]) for (let z = -200; z <= -100; z += 0.5) for (const up of [-0.5, 0, 0.3, 0.6, 0.9, 1.2, 1.5, 2]) {
      water.sampleAt(x, rest + up, z, sample);
      felt.push(sample.surfaceY, sample.normalX, sample.normalY, sample.normalZ, sample.slopeX, sample.slopeZ, sample.flowX, sample.flowY, sample.flowZ,
        sample.waterFloorY ?? Number.NaN, sample.ceilingY ?? Number.NaN, sample.covered ? 1 : 0);
    }
  }
  const s = sim.solver as unknown as { bed: Float64Array; h: Float64Array; qx: Float64Array; qz: Float64Array };
  const crash = sim.crash ? JSON.stringify({ ...sim.crash.counts, starvedVolume: undefined, asked: sim.crash.counts.asked.toFixed(6), thrown: sim.crash.counts.thrown.toFixed(6) }) : 'none';
  console.log(`${name}: ${steps} steps; sea ${hash([s.bed, s.h, s.qx, s.qz, sim.breaking.strength])}; front points ${frontPoints}; contact ${hash([contactHashes.map((h) => parseInt(h, 16) || 0)])}; drawing ${hash([loftHashes.map((h) => parseInt(h, 16) || 0)])}; surface ${hash([surfaces])}; felt ${felt.length ? hash([felt]) : '-'}; crash ${crash}`);
}
