// Probe (opt-in: PROBE=1 LOG=<file> H=<m,m,…> npx vitest run <this file>): the Wave Pool's faces as the game's surf
// meter reads them at the take-off (each wave's biggest breaking face within its band), for each machine height, so the
// pool's three sizes can be set to faces of 1.0, 1.25 and 1.5 m.
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { POOL, regularSignificantHeight } from '../pool';
import { SurfZoneSimulation } from '../SurfZoneSimulation';

it.skipIf(!process.env.PROBE)('reads the Wave Pool’s faces at its take-off', () => {
  const height = Number(process.env.H ?? 1);
  const simulation = new SurfZoneSimulation({
    spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0,
  });
  const faces: string[] = [];
  simulation.onBreak = (wave) => {
    if (wave.time >= Number(process.env.SETTLED ?? 70) && Math.abs(wave.x - POOL.takeOffX) <= 10) faces.push(`${wave.time.toFixed(1)}:${wave.face.toFixed(2)}@${wave.x.toFixed(0)},${wave.z.toFixed(0)}`);
  };
  const end = Number(process.env.END ?? 120);
  while (simulation.solver.time < end) simulation.step(1 / 30);
  const reading = (simulation.surf as unknown as { reading(time: number): { typical: number; sets: number; waves: number } | undefined }).reading?.(simulation.solver.time);
  log(`H ${height}: surf meter ${JSON.stringify(reading)}; breaks near the take-off: ${faces.join(' ')}`);
}, 3_600_000);
