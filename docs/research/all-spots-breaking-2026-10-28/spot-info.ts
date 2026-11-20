/**
 * Each spot's window as the survey reads it (all-spots-breaking, 2026-10-28): the tank's rows, the window, the ridden part,
 * the take-off and the breaking onset, from the game's own Medium sea.
 *   rolldown docs/research/all-spots-breaking-2026-10-28/spot-info.ts -o dist/scripts/spot-info.mjs --format esm --platform node && node dist/scripts/spot-info.mjs
 */
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { type SpotName } from '../../../src/wave/Bathymetry';
import { BREAKING_ONSET, SurfZoneSimulation, takeOffPoint } from '../../../src/wave/SurfZoneSimulation';

for (const spot of ['pool', 'beach', 'point', 'reef', 'padang'] as SpotName[]) {
  for (const size of ['small', 'medium', 'big'] as const) {
    const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
    const config = { ...surfZoneConfigFor(settings, 1, false), compute: 'cpu' as const, spinUpPeriods: 0 };
    if (size !== 'medium') { console.log(`  ${spot} ${size}: Hs ${config.significantHeight.toFixed(2)} Tp ${config.peakPeriod} spreading ${config.spreading}`); continue; }
    const sim = new SurfZoneSimulation(config, 'warm');
    const { solver } = sim;
    const t = takeOffPoint(config);
    console.log(`${spot} ${size}: Hs ${config.significantHeight.toFixed(2)} Tp ${config.peakPeriod} spreading ${config.spreading}; onset ${BREAKING_ONSET[spot]}; grid ${solver.nx}×${solver.nz} dx ${solver.dx}; x ${solver.xCenters[0]}…${solver.xCenters[solver.nx - 1]}; z ${solver.zCenters[0].toFixed(0)}…${solver.zCenters[solver.nz - 1].toFixed(0)}; fine from ${sim.tank.fineFrom}; take-off (${t.x.toFixed(1)}, ${t.z.toFixed(1)}); sweptBarrel ${config.sweptBarrel ?? '-'}`);
  }
}
