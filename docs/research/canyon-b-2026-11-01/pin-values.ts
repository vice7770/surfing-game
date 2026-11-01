/**
 * canyon-b (2026-11-01): main's Canyon at 376d9cd4, value by value, for `?canyonBed=old`'s pin (`SurfZoneSimulation.test.ts`).
 * Bundle it against main's tree (no `canyonBed`) and the branch's (`--bed old`) and compare the JSON.
 *   rolldown docs/research/canyon-b-2026-11-01/pin-values.ts -o dist/scripts/pin-values.mjs --format esm --platform node && node dist/scripts/pin-values.mjs [--bed old]
 */
import { createSpot } from '../../../src/wave/Bathymetry';
import type { BoussinesqSolver } from '../../../src/wave/BoussinesqSolver';
import { SurfZoneSimulation, alongShoreOf, canyonTakeOffDepth, rideLineupOffset, takeOffPoint, tankLayout, tankRiderBounds, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const bed = process.argv.includes('--bed') ? { canyonBed: 'old' as const } : {};
const spot = createSpot('canyon', 1, bed);
const points: [number, number][] = [
  [-50, -150], [-30, -200], [-25, -180], [-17, -130], [-17, -120], [-9, -150], [-9, -100], [5, -120], [5, -60], [20, -95], [28, -40], [35, -60], [40, -30],
  [45, -80], [0, -40], [-70, -350], [70, -20], [5, -250], [15, -170], [30, -120], [-60, -200], [10, -120],
  [-112, -150], [-112, -100], [-80, -90], [-62, -70], [-57, -60], [-52, -55], [-45, -60], [-45, -48], [-37, -45], [-29, -40], [-20, -60], [-14, -80],
  [-150, -100], [-165, -120], [121, -120], [100, -100], [150, -90], [80, -60], [64, -70],
];
const out: Record<string, unknown> = { depths: points.map(([x, z]) => [x, z, spot.depthAt(x, z)]) };
for (const [significantHeight, peakPeriod] of [[0.9, 9], [1.4, 11], [2.4, 14], [1.9, 12]]) {
  const config = { spot: 'canyon', seed: 1, alongShore: undefined, dx: 1, fineSpacing: 1, coarseSpacing: 4, significantHeight, peakPeriod, directionDegrees: 0, spreading: 150, tide: 0, ...bed } as unknown as SurfZoneConfig;
  out[`size ${significantHeight}`] = {
    alongShore: alongShoreOf(config), tank: tankLayout(config), bounds: tankRiderBounds(config), takeOff: takeOffPoint(config), offset: rideLineupOffset(config),
    depth: canyonTakeOffDepth(significantHeight, (bed as { canyonBed?: 'old' }).canyonBed),
  };
}
const simulation = new SurfZoneSimulation({
  spot: 'canyon', seed: 1, significantHeight: 2.4, peakPeriod: 14, directionDegrees: 0, spreading: 150, tide: 0,
  componentCount: 8, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, ...bed,
} as SurfZoneConfig, 'warm');
const curl = simulation.curl!;
let sum = 0;
for (let column = 0; column < simulation.solver.nx; column += 1) sum += curl.size(column, 1).width;
const layout = (simulation.solver as BoussinesqSolver).deviceLayout();
out.sim = {
  grid: [simulation.solver.nx, simulation.solver.nz], breakPoint: simulation.breakPoint(), landingShare: curl.landingShare, ahead: curl.size(40, 2.5).ahead,
  widths: [40, 80, 120, 180, 250, 320].map((column) => curl.size(column, 1).width), sum, iribarren: simulation.iribarren(),
  diagonalJoin: layout.breaking?.diagonalJoin, onsetFactor: layout.breaking?.onsetFactor !== undefined, joinField: layout.breaking?.joinField !== undefined,
  peaks: simulation.readoutPeaks()?.map((p) => [p.from, p.to, p.breaker]), breakers: [-112, -9, 121, -45].map((x) => simulation.breakerNear(x)),
};
console.log(JSON.stringify(out));
