/**
 * pool-tube-face (2026-11-03): the pin check for the surfable tube. Every spot without a library, as
 * pool-barrel-straight's pin check (water only); and every swept barrel's whole path with its own library: the sea, the
 * front's points, the crash's ledger, the contact's loft and the drawing's loft (the clear-roof hold, over the solver's
 * surface), each hashed (FNV-1a over float64s) after STEPS steps of 1/30 s from a spun-up start. The Wave Pool's straight
 * Barrel runs with `?tubeFace=old&tubeFrom=piece` (on main the keys are unknown and ignored) on each case list named
 * (its own runs, `poolTubeCase` 'pool', and the a38), and as each tree's default for the record, twice (the branch's
 * default is the a38 under the face ruling since the owner's call of 2026-11-04; main's, its own runs as before). Bundle
 * against both trees and compare the lines:
 *   rolldown docs/research/pool-tube-face-2026-11-03/pin-face.ts -o dist/scripts/face-pin.mjs --format esm --platform node && node dist/scripts/face-pin.mjs [steps]
 */
import { SWELLS, physicalSettingsFor, type SurfConditions } from '../../../src/game/SurfConditions';
import { libraryFromBytes, POOL_TUBE_CASES, POOL_TUBE_STAND_IN } from '../../../src/wave/barrel/barrelLibrary';
import { BARREL_CASES } from '../../../src/wave/barrel/barrelLibraryIndex';
import { FRONT_CAPACITY, FRONT_STRIDE } from '../../../src/wave/barrel/frontRecords';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { SweptContact } from '../../../src/wave/barrel/sweptContact';
import { BARREL_SLOPE, SweptLoft } from '../../../src/wave/barrel/sweptLoft';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
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
const old = { tubeFace: 'old', tubeFrom: 'piece' };
// Water only, as pool-barrel-straight's pin check.
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
// Every swept barrel's whole path, with its own library; the pool's two case lists by name, as both trees list them.
const ownCases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_CASES.includes(entry.id)));
const a38Cases = readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id)));
const swept: [string, Partial<SurfZoneConfig>, SpotName, Uint8Array[], number][] = [
  ['padang swept', { ...shared, spot: 'padang' }, 'padang', readBarrelCases('padang'), STEPS],
  ['canyon swept (canyonTube on)', { ...shared, spot: 'canyon', sweptBarrel: true }, 'canyon', readBarrelCases('canyon'), STEPS],
  ['reef swept', { ...shared, spot: 'reef', sweptBarrel: true }, 'reef', readBarrelCases('reef'), STEPS],
  ['pool barrel 1.5 m, old switches', barrel(1.05, { ...old, poolTubeCase: 'pool' }) as Partial<SurfZoneConfig>, 'pool', ownCases, 4 * STEPS],
  ['pool barrel 1.8 m, old switches', barrel(1.32, { ...old, poolTubeCase: 'pool' }) as Partial<SurfZoneConfig>, 'pool', ownCases, 4 * STEPS],
  ['pool barrel 1.5 m a38, old switches', barrel(1.05, { ...old, poolTubeCase: 'a38' }) as Partial<SurfZoneConfig>, 'pool', a38Cases, 4 * STEPS],
  ['pool barrel 1.8 m a38, old switches', barrel(1.32, { ...old, poolTubeCase: 'a38' }) as Partial<SurfZoneConfig>, 'pool', a38Cases, 4 * STEPS],
  // Each tree's default, twice (two runs identical).
  ['pool barrel 1.5 m, default', barrel(1.05) as Partial<SurfZoneConfig>, 'pool', readBarrelCases('pool'), 4 * STEPS],
  ['pool barrel 1.5 m, default again', barrel(1.05) as Partial<SurfZoneConfig>, 'pool', readBarrelCases('pool'), 4 * STEPS],
  ['pool barrel 1.8 m, default', barrel(1.32) as Partial<SurfZoneConfig>, 'pool', readBarrelCases('pool'), 4 * STEPS],
];
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
  let frontPoints = 0;
  for (let n = 1; n <= steps; n += 1) {
    sim.step(1 / 30);
    if (n % 15 !== 0) continue;
    const count = sim.writeTubeRecords(records);
    // Only the fields both trees write: a record's first nine (the branch adds a tenth, its retirement, 0 off the face).
    const nine = new Float64Array(9 * count);
    for (let k = 0; k < count; k += 1) for (let f = 0; f < 9; f += 1) nine[9 * k + f] = records[k * FRONT_STRIDE + f];
    frontPoints += count;
    water.withSurfaceNodeCache(() => contact.update(records, count, sim.solver.restLevel, (x, z) => water.plainSurfaceAt(x, z)));
    const c = contact.last;
    contactHashes.push(c ? hash([c.positions.subarray(0, 3 * c.vertexCount), c.indices.subarray(0, c.indexCount)]) : '-');
    const d = drawing.build(records, count, sim.solver.restLevel, (x, z) => water.plainSurfaceAt(x, z));
    loftHashes.push(hash([d.positions.subarray(0, 3 * d.vertexCount), d.sliceWeight.subarray(0, d.sliceCount), nine]));
    // The water a board stands on, along the tank's middle column.
    for (let z = -200; z <= -100; z += 5) surfaces.push(water.surfaceAt(0, z));
  }
  const s = sim.solver as unknown as { bed: Float64Array; h: Float64Array; qx: Float64Array; qz: Float64Array };
  const crash = sim.crash ? JSON.stringify({ ...sim.crash.counts, starvedVolume: undefined, asked: sim.crash.counts.asked.toFixed(6), thrown: sim.crash.counts.thrown.toFixed(6) }) : 'none';
  console.log(`${name}: ${steps} steps; sea ${hash([s.bed, s.h, s.qx, s.qz, sim.breaking.strength])}; front points ${frontPoints}; contact ${hash([contactHashes.map((h) => parseInt(h, 16) || 0)])}; drawing ${hash([loftHashes.map((h) => parseInt(h, 16) || 0)])}; surface ${hash([surfaces])}; crash ${crash}`);
}
