// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): where and when does Padang Padang's water first go bad under an oblique Big swell?
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { PADANG_SWELLS } from '../../game/SurfConditions';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { SurfZoneSimulation } from '../SurfZoneSimulation';

it.skipIf(!process.env.PROBE)('finds where Padang Padang’s oblique Big swell goes bad', () => {
  const direction = Number(process.env.DIRECTION ?? 45);
  const simulation = new SurfZoneSimulation({
    spot: 'padang', seed: 3, significantHeight: PADANG_SWELLS.big.significantHeight, peakPeriod: PADANG_SWELLS.big.peakPeriod, directionDegrees: direction,
    spreading: PADANG_SPREADING, tide: 0, componentCount: 12, alongShore: 160, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
  });
  const { solver } = simulation;
  log(`direction ${direction}°: tank ${JSON.stringify(simulation.tank)}, grid ${solver.nx} × ${solver.nz}`);
  let fastest = 0;
  for (let frame = 0; frame < 45 * 30; frame += 1) {
    simulation.step(1 / 30);
    let bad = -1;
    let top = 0;
    let at = -1;
    for (let i = 0; i < solver.h.length; i += 1) {
      if (!(Number.isFinite(solver.h[i]) && solver.h[i] >= 0)) { bad = i; break; }
      if (solver.h[i] > 0.05) {
        const speed = Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i];
        if (speed > top) { top = speed; at = i; }
      }
    }
    const where = (i: number) => `x ${solver.xCenters[i % solver.nx].toFixed(1)}, z ${solver.zCenters[Math.floor(i / solver.nx)].toFixed(1)}, still depth ${(solver.restLevel - solver.bed[i]).toFixed(2)}`;
    if (top > fastest + 2 || frame % 150 === 0 || bad >= 0) log(`t ${solver.time.toFixed(2)} s: fastest ${top.toFixed(1)} m/s at ${at >= 0 ? where(at) : '-'}; stable step ${solver.maxStableStep().toExponential(2)}`);
    fastest = Math.max(fastest, top);
    if (bad >= 0) {
      log(`BAD at t ${solver.time.toFixed(2)} s: ${where(bad)}, h ${solver.h[bad]}, qx ${solver.qx[bad]}, qz ${solver.qz[bad]}`);
      return;
    }
  }
  log(`finite to the end; fastest ${fastest.toFixed(1)} m/s`);
}, 3_600_000);
