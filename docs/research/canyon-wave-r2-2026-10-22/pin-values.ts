/**
 * The values the `?canyonBed=old` pin test holds (canyon-wave-r2, 2026-10-22): read off a build's Canyon, today's layout
 * (no `canyonBed`) or the old one (`--bed old`), so the branch's 'old' can be checked against main's own build exactly.
 *   rolldown docs/research/canyon-wave-r2-2026-10-22/pin-values.ts -o dist/scripts/pin-values.mjs --format esm --platform node \
 *     && node dist/scripts/pin-values.mjs [--bed old]
 */
import { createSpot, type CanyonBed } from '../../../src/wave/Bathymetry';
import {
  SurfZoneSimulation, alongShoreOf, canyonTakeOffDepth, rideLineupOffset, takeOffPoint, tankLayout, tankRiderBounds, type SurfZoneConfig,
} from '../../../src/wave/SurfZoneSimulation';

const bed: CanyonBed | undefined = process.argv.includes('--bed') ? 'old' : undefined;
const spot = createSpot('canyon', 1, bed ? { canyonBed: bed } : {});
const points: [number, number][] = [
  [-50, -150], [-30, -200], [-25, -180], [-17, -130], [-17, -120], [-9, -150], [-9, -100], [5, -120], [5, -60], [20, -95], [28, -40],
  [35, -60], [40, -30], [45, -80], [0, -40], [-70, -350], [70, -20], [5, -250], [15, -170], [30, -120], [-60, -200], [10, -120],
];
console.log('depths', JSON.stringify(points.map(([x, z]) => [x, z, spot.depthAt(x, z)])));
const small = { seed: 1, spreading: 150, windSpeed: 0, stage: 2 };
for (const [significantHeight, peakPeriod] of [[0.9, 9], [1.4, 11], [2.4, 14], [1.9, 12]]) {
  const config = {
    ...small, spot: 'canyon', dx: 1, fineSpacing: 1, coarseSpacing: 4, significantHeight, peakPeriod, directionDegrees: 0, tide: 0,
    ...(bed ? { canyonBed: bed } : {}),
  } as unknown as SurfZoneConfig;
  console.log('size', significantHeight, peakPeriod, JSON.stringify({
    alongShore: alongShoreOf(config), tank: tankLayout(config), bounds: tankRiderBounds(config), takeOff: takeOffPoint(config),
    offset: rideLineupOffset(config), depth: canyonTakeOffDepth(significantHeight, bed),
  }));
}
const simulation = new SurfZoneSimulation({
  spot: 'canyon', seed: 1, significantHeight: 2.4, peakPeriod: 14, directionDegrees: 0, spreading: 150, tide: 0,
  componentCount: 8, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, ...(bed ? { canyonBed: bed } : {}),
} as SurfZoneConfig, 'warm');
const curl = simulation.curl;
let sum = 0;
if (curl) for (let column = 0; column < simulation.solver.nx; column += 1) sum += curl.size(column, 1).width;
console.log('sim', JSON.stringify({
  grid: [simulation.solver.nx, simulation.solver.nz], breakPoint: simulation.breakPoint(), landingShare: curl?.landingShare,
  ahead: curl?.size(40, 2.5).ahead, widths: curl ? [40, 80, 120].map((column) => curl.size(column, 1).width) : undefined, sum,
  iribarren: simulation.iribarren(),
}));
