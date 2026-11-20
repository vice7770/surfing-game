/**
 * How much of the foam's and the air's per-cell work lands on empty water (canyon-perf, 2026-10-29): from a saved sea,
 * every 10th step for `--steps`, the wet cells in rows the fields do not skip as quiet, and how many of them have no foam
 * (dense or lace), no air, plume or turbulence and no breaking anywhere in their 3 × 5 neighbourhood (one column either
 * side; two rows seaward for the foam's drift, one shoreward).
 *   rolldown docs/research/canyon-perf-2026-10-29/empty-probe.ts -o dist/scripts/empty-probe.mjs --format esm --platform node \
 *     && node dist/scripts/empty-probe.mjs --state <sea> [--size medium] [--steps 300]
 */
import { readFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { SurfZoneRunner } from '../../../src/wave/SurfZoneRunner';
import { decodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const size = (option('size') ?? 'medium') as SwellSize;
const steps = Number(option('steps') ?? 300);
const settings = physicalSettingsFor('canyon', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
const runner = SurfZoneRunner.forWorker(surfZoneConfigFor(settings, 8761, true), { rider: true }, 'warm');
runner.simulation.importState(decodeSurfZoneState(new Uint8Array(readFileSync(option('state')!))));
await runner.spinUp();
const sim = runner.simulation as unknown as {
  solver: { nx: number; nz: number; h: Float64Array };
  foam: { dense: Float64Array; residual: Float64Array };
  aeration: { air: Float64Array; depth: Float64Array; turbulence: Float64Array };
  whitewaterStrength: Float64Array;
};
const { nx, nz } = sim.solver;
let wetAll = 0; let wetRows = 0; let emptyFoam = 0; let emptyAir = 0; let emptyBoth = 0; let samples = 0;
for (let step = 0; step < steps; step += 1) {
  runner.advance(1, { paddle: false, popUp: false, steer: 0, retry: false });
  if (step % 10 !== 0) continue;
  samples += 1;
  const { h } = sim.solver;
  const { dense, residual } = sim.foam;
  const { air, depth, turbulence } = sim.aeration;
  const b = sim.whitewaterStrength;
  const foamAt = (i: number) => dense[i] !== 0 || residual[i] !== 0 || b[i] > 0;
  const airAt = (i: number) => air[i] !== 0 || depth[i] !== 0 || turbulence[i] !== 0 || b[i] > 0;
  const rowHas = (iz: number, at: (i: number) => boolean) => { for (let ix = 0; ix < nx; ix += 1) if (at(iz * nx + ix)) return true; return false; };
  const foamRows = Array.from({ length: nz }, (_, iz) => rowHas(iz, foamAt));
  const airRows = Array.from({ length: nz }, (_, iz) => rowHas(iz, airAt));
  for (let iz = 0; iz < nz; iz += 1) {
    const near = (rows: boolean[]) => rows.slice(Math.max(0, iz - 2), Math.min(nz, iz + 2)).some(Boolean);
    const busyFoam = near(foamRows);
    const busyAir = near(airRows);
    for (let ix = 0; ix < nx; ix += 1) {
      const i = iz * nx + ix;
      if (h[i] <= 0.01) continue;
      wetAll += 1;
      if (!busyFoam && !busyAir) continue;
      wetRows += 1;
      let foam = false; let aired = false;
      for (let dz = -2; dz <= 1 && !(foam && aired); dz += 1) {
        const r = iz + dz;
        if (r < 0 || r >= nz) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const c = ix + dx;
          if (c < 0 || c >= nx) continue;
          const k = r * nx + c;
          if (foamAt(k)) foam = true;
          if (airAt(k)) aired = true;
        }
      }
      if (!foam) emptyFoam += 1;
      if (!aired) emptyAir += 1;
      if (!foam && !aired) emptyBoth += 1;
    }
  }
}
const pct = (n: number, of: number) => `${((100 * n) / of).toFixed(1)} %`;
console.log(`canyon ${size}, ${samples} samples: wet cells ${(wetAll / samples).toFixed(0)}, in rows near a field ${(wetRows / samples).toFixed(0)} (${pct(wetRows, wetAll)}); of those, no foam nearby ${pct(emptyFoam, wetRows)}, no air nearby ${pct(emptyAir, wetRows)}, neither ${pct(emptyBoth, wetRows)}`);
