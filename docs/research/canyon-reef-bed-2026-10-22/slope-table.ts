/**
 * The Canyon's arm, read off the bed itself (no simulation): for each candidate bed, the slope along the waves' path
 * (+z) at a size's breaking depths, along the arm, and the Iribarren number it gives a wave of that size. The water-physics
 * advisor's `canyon_slope.py` and `canyon_cands2.py` (2026-10-22) did this on a copy of the bed in Python; this reads
 * `canyonTerraceDepth` and the tank (`tankDepth`) themselves, so it cannot drift from them.
 *
 *   rolldown docs/research/canyon-reef-bed-2026-10-22/slope-table.ts -o dist/scripts/slope-table.mjs --format esm --platform node \
 *     && node dist/scripts/slope-table.mjs ['pathSlope=0.0417,hingeDepth=2.1' ...]
 *
 * Each argument is one candidate (`--canyon`'s syntax); none: today's bed and the advisor's range.
 */
import { CANYON, canyonArmEndX, canyonFootZ, canyonHingeZ, canyonBreakLineZ, createSpot } from '../../../src/wave/Bathymetry';
import { tankDepth, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const TODAY = { ...CANYON };
const candidates = process.argv.slice(2).length ? process.argv.slice(2) : [
  '', 'pathSlope=0.04348,hingeDepth=2.0', 'pathSlope=0.04348,hingeDepth=2.2', 'pathSlope=0.04167,hingeDepth=2.1',
  'pathSlope=0.04,hingeDepth=2.0', 'pathSlope=0.04,hingeDepth=2.2',
];
/** The sizes' breaking depths on today's bed (the advisor's cands2: median and sets), m, their Hs and Tp. */
const SIZES = [
  { name: 'Small', hs: 0.9, tp: 9, depths: [1.5, 2.25] },
  { name: 'Medium', hs: 1.4, tp: 11, depths: [1.9, 2.65] },
  { name: 'Big', hs: 2.4, tp: 14, depths: [2.6, 4.0] },
];
const XS = [-30, -10, 10, 30, 50];

for (const spec of candidates) {
  Object.assign(CANYON, TODAY);
  applyCanyonShape(spec || undefined);
  const config = { spot: 'canyon', seed: 1, significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: 150, tide: 0 } as SurfZoneConfig;
  const tank = tankLayout(config);
  const spot = createSpot('canyon', 1);
  const depth = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank);
  /** The first z, marching shoreward from the zone, where the bed is h deep. */
  const zAt = (x: number, h: number) => {
    for (let z = tank.zoneInner; z < 0; z += 0.05) if (depth(x, z) <= h) return z;
    return Number.NaN;
  };
  /** The slope along +z across h ± dh. */
  const slopeAt = (x: number, h: number, dh: number) => (2 * dh) / (zAt(x, h - dh) - zAt(x, h + dh));
  console.log(`\n${spec || 'today'}: pathSlope 1:${(1 / CANYON.pathSlope).toFixed(1)}, hinge ${CANYON.hingeDepth} m, fan ${CANYON.fan}°; `
    + `hinge at the peak ${(CANYON.peakZ - canyonHingeZ(CANYON.peakX)).toFixed(0)} m seaward of the line, foot z ${canyonFootZ().toFixed(0)} `
    + `(blend ends ${tank.blendEnd}), arm ends x ${canyonArmEndX().toFixed(0)}`);
  console.log(`  hinge seaward of the line at x ${XS.join(', ')}: ${XS.map((x) => (canyonBreakLineZ(x) - canyonHingeZ(x)).toFixed(0)).join(', ')} m`);
  for (const size of SIZES) {
    const deepWavelength = (9.81 * size.tp ** 2) / (2 * Math.PI);
    for (const h of size.depths) {
      const dh = size.name === 'Big' ? 0.5 : size.name === 'Medium' ? 0.4 : 0.3;
      const row = XS.map((x) => {
        const s = slopeAt(x, h, dh);
        // Hb = 0.78 h, the advisor's rough breaker at the onset depth.
        const xi = s / Math.sqrt((0.78 * h) / deepWavelength);
        return `1:${(1 / s).toFixed(0).padStart(3)} ξ ${xi.toFixed(2)}`;
      });
      console.log(`  ${size.name.padEnd(6)} h ${h.toFixed(2)} m: ${row.join(' | ')}`);
    }
  }
}
