/**
 * Every other spot, and the Canyon's old layout, after 3 s (canyon-wave-r2, 2026-10-22, after canyon-long-wave's
 * other-spots check): seed 3, Hs 1.4 m, Tp 11 s, s 150, 12 components, 2 m cells; the window, tank, take-off, rider
 * bounds, peel and an FNV-1a hash of h, qx, qz and the foam. Run on this branch and on main built the same way, then diff.
 *   rolldown docs/research/canyon-wave-r2-2026-10-22/other-spots.ts -o dist/scripts/other-spots.mjs --format esm --platform node \
 *     && node dist/scripts/other-spots.mjs
 */
import { SurfZoneSimulation, alongShoreOf, takeOffPoint, tankLayout, tankRiderBounds, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

function fnv(arrays: ArrayLike<number>[]): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  const view = new DataView(new ArrayBuffer(8));
  for (const array of arrays) {
    for (let i = 0; i < array.length; i += 1) {
      view.setFloat64(0, array[i]);
      for (let b = 0; b < 8; b += 1) {
        const byte = view.getUint8(b);
        h1 = Math.imul(h1 ^ byte, 0x01000193) >>> 0;
        h2 = Math.imul(h2 ^ byte, 0x01000193) >>> 0;
      }
    }
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

const cases: [string, Record<string, unknown>][] = [['beach', {}], ['point', {}], ['reef', {}], ['padang', {}], ['pool', {}], ['canyon', {}], ['canyon', { canyonBed: 'old' }]];
for (const [spot, extra] of cases) {
  const config = {
    spot, seed: 3, significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0, stage: 2,
    componentCount: 12, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 0.2, compute: 'cpu', ...extra,
  } as unknown as SurfZoneConfig;
  const sim = new SurfZoneSimulation(config);
  for (let i = 0; i < 90; i += 1) sim.step(1 / 30);
  const { dense, residual } = sim.foam;
  console.log(`${spot}${extra.canyonBed ? ' (old)' : ''} ${alongShoreOf(config)} ${JSON.stringify(tankLayout(config))} ${JSON.stringify(takeOffPoint(config))} `
    + `${JSON.stringify(tankRiderBounds(config))} ${JSON.stringify(sim.peelEstimate() ?? null)} ${fnv([sim.solver.h, sim.solver.qx, sim.solver.qz, dense, residual])}`);
}
