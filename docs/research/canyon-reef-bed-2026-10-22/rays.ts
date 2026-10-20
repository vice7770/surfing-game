/**
 * Linear rays over the Canyon's arm (canyon-reef-bed, 2026-10-22): the ray concentration (`rayConcentration`, 20 m wide,
 * Medium's 11 s, square) where each column first reaches a depth, on the old bed and the reef bed. Above 1 the bed gathers
 * the swell there, below 1 it spreads it: the fan's deep face, at 55° to the shore, turns the rays toward the peak.
 *
 *   rolldown docs/research/canyon-reef-bed-2026-10-22/rays.ts -o dist/scripts/rays.mjs --format esm --platform node && node dist/scripts/rays.mjs
 */
import { CANYON, canyonHingeZ, createSpot } from '../../../src/wave/Bathymetry';
import { rayConcentration } from '../../../src/wave/Refraction';
import { tankDepth, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
const base = { ...CANYON };
for (const [name, mod] of [['today', { pathSlope: 1 / 30, hingeDepth: 2.8 }], ['reef bed', { pathSlope: 1 / 23, hingeDepth: 2.2 }]] as const) {
  Object.assign(CANYON, base, mod);
  const config = { spot: 'canyon', seed: 1, significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: 150, tide: 0 } as SurfZoneConfig;
  const tank = tankLayout(config);
  const spot = createSpot('canyon', 1);
  const bed = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank);
  for (const depth of [3.5, 2.6, 2.2, 1.8, 1.5]) {
    const row = [-30, -10, 10, 30, 50].map((x) => {
      let z = tank.blendEnd; while (bed(x, z) > depth) z += 0.5;
      const [c] = rayConcentration(bed, { period: 11, direction: 0 }, tank.blendEnd, z, [x], 20);
      return `x ${x}: ${c.toFixed(2)}`;
    });
    console.log(`${name.padEnd(8)} at ${depth} m deep: ${row.join(' | ')}`);
  }
}
