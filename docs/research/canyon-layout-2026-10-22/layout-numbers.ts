/**
 * The Canyon's layout numbers, static (canyon-layout, 2026-10-22; after the advisor's `static.ts`): for today's layout and
 * the one before it (`?canyonBed=old`), each size's window, tank, take-off, start, the start's depth, its distance to the
 * waterline (z = tide / beach slope … at mid tide z = 0) and to the window's centre and edges, the rider bounds, the arm's
 * extent, and the solver's cells.
 *
 *   rolldown docs/research/canyon-layout-2026-10-22/layout-numbers.ts -o dist/scripts/layout-numbers.mjs --format esm --platform node \
 *     && node dist/scripts/layout-numbers.mjs
 */
import { SWELLS } from '../../../src/game/SurfConditions';
import {
  canyonArmEndX, canyonBreakLineZ, canyonFootZ, canyonHingeZ, canyonShape, createSpot, type CanyonBed,
} from '../../../src/wave/Bathymetry';
import { stretchedEdges } from '../../../src/wave/ShallowWaterSolver';
import {
  alongShoreOf, rideLineupOffset, takeOffPoint, tankDepth, tankLayout, tankRiderBounds, type SurfZoneConfig,
} from '../../../src/wave/SurfZoneSimulation';

for (const bed of ['reef', 'old'] as CanyonBed[]) {
  const c = canyonShape(bed);
  const spot = createSpot('canyon', 1, { canyonBed: bed });
  const upcoastEnd = c.peakX - (c.shelfDepth - c.crestDepth) / c.endSlope;
  const armEnd = canyonArmEndX(c);
  console.log(`\n=== ${bed === 'reef' ? 'today (canyon-layout)' : 'old (?canyonBed=old)'}: peak (${c.peakX}, ${c.peakZ}), ${c.angle}°, beach 1:${(1 / c.shoreSlope).toFixed(0)}, window ${c.alongShore} m`);
  console.log(`arm: upcoast end x ${upcoastEnd.toFixed(1)}, peak x ${c.peakX}, end on the beach face x ${armEnd.toFixed(1)} (z ${canyonBreakLineZ(armEnd, c).toFixed(1)}), taper to x ${(armEnd + c.endTaper).toFixed(1)}; `
    + `along shore ${(armEnd - c.peakX).toFixed(1)} m from the peak (${(armEnd - upcoastEnd).toFixed(1)} m with the end), along the line ${Math.hypot(armEnd - c.peakX, canyonBreakLineZ(armEnd, c) - c.peakZ).toFixed(1)} m; `
    + `footprint centre x ${((upcoastEnd + armEnd + c.endTaper) / 2).toFixed(1)}; foot z ${canyonFootZ(c).toFixed(1)}; hinge at the peak z ${canyonHingeZ(c.peakX, c).toFixed(1)}`);
  for (const size of ['small', 'medium', 'big'] as const) {
    const swell = SWELLS[size];
    const config = { spot: 'canyon', seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0, spreading: 150, tide: 0, canyonBed: bed } as SurfZoneConfig;
    const tank = tankLayout(config);
    const window = alongShoreOf(config);
    const takeOff = takeOffPoint(config);
    const out = rideLineupOffset(config);
    const start = { x: takeOff.x, z: takeOff.z - out };
    const bounds = tankRiderBounds(config);
    const depth = (z: number) => tankDepth(spot, tank.edgeDepth, takeOff.x, z, tank);
    const nz = stretchedEdges(tank.offshore, tank.shore, tank.fineFrom, 1, 4).length - 1;
    console.log(`${size} (Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s): take-off (${takeOff.x}, ${takeOff.z.toFixed(1)}) ${depth(takeOff.z).toFixed(2)} m deep; `
      + `start ${out.toFixed(1)} m out at z ${start.z.toFixed(1)}, ${depth(start.z).toFixed(2)} m deep; to the waterline (z 0 at mid tide) ${(-start.z).toFixed(0)} m, `
      + `the peak ${(-c.peakZ).toFixed(0)} m; to the window's centre ${Math.abs(start.x).toFixed(0)} m, to its −x / +x edges ${(start.x + window / 2).toFixed(0)} / ${(window / 2 - start.x).toFixed(0)} m, `
      + `to the rider's −x / +x bounds ${(start.x - bounds.xMin).toFixed(0)} / ${(bounds.xMax - start.x).toFixed(0)} m, to the offshore bound ${(start.z - bounds.zMin).toFixed(0)} m; `
      + `tank ${JSON.stringify(tank)}; cells ${window} × ${nz} = ${window * nz}`);
  }
  for (const x of [-60, -30, -2, 10, 20, 30, 50]) {
    const row: string[] = [];
    for (let z = -300; z <= 0; z += 20) row.push(spot.depthAt(x, z).toFixed(1));
    console.log(`  depth x ${String(x).padStart(3)}, z −300…0 by 20: ${row.join(' ')}`);
  }
}
