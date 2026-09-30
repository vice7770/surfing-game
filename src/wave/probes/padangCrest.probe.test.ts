// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): follow Padang Padang's crests across its wedge: where each column's crest is, how high, over what depth.
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { PADANG, padangCrestZ } from '../Bathymetry';
import { SurfZoneSimulation } from '../SurfZoneSimulation';

it.skipIf(!process.env.PROBE)('follows Padang Padang’s crests', () => {
  for (const pair of (process.env.PADANG ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');
    (PADANG as Record<string, number>)[key] = Number(value);
  }
  const config = {
    spot: 'padang' as const, seed: Number(process.env.SEED ?? 1), significantHeight: Number(process.env.HS ?? 1.6), peakPeriod: Number(process.env.TP ?? 16),
    directionDegrees: Number(process.env.DIRECTION ?? 0), spreading: Number(process.env.SPREADING ?? 150), tide: 0, windSpeed: 0, componentCount: 24,
    ...(process.env.BANDWIDTH ? { bandwidth: Number(process.env.BANDWIDTH) } : {}),
  };
  const simulation = new SurfZoneSimulation(config);
  const { solver } = simulation;
  const xs = [-60, -40, -20, 0, 20, 40, 60];
  const columns = xs.map((x) => Math.round((x - solver.xCenters[0]) / solver.dx));
  const eta = (i: number) => solver.h[i] + solver.bed[i] - solver.restLevel;
  const depth = (i: number) => solver.restLevel - solver.bed[i];
  log(`${JSON.stringify(config)} ${JSON.stringify(PADANG)}; crest line z at ${xs.map((x) => `${x}:${padangCrestZ(x).toFixed(0)}`).join(' ')}`);
  const start = Number(process.env.START ?? 60);
  const end = Number(process.env.END ?? 100);
  while (solver.time < start) simulation.step(1 / 30);
  while (solver.time < end) {
    for (let k = 0; k < 15; k += 1) simulation.step(1 / 30);
    // Per column, the crests (local maxima of η over 0.4 m) seaward of the shore, from the fine zone in.
    const rows = columns.map((column, a) => {
      const crests: string[] = [];
      for (let iz = 2; iz < solver.nz - 2; iz += 1) {
        const z = solver.zCenters[iz];
        if (z < -400 || z > -5) continue;
        const i = iz * solver.nx + column;
        const e = eta(i);
        if (e > 0.4 && e >= eta(i - solver.nx) && e > eta(i + solver.nx) && e >= eta(i - 2 * solver.nx) && e > eta(i + 2 * solver.nx)) {
          const breaking = (simulation as unknown as { breaking: { strength: Float64Array } }).breaking.strength[i] > 0.3;
          crests.push(`z${z.toFixed(0)} η${e.toFixed(1)} d${depth(i).toFixed(1)}${breaking ? '*' : ''}`);
        }
      }
      return `${xs[a]}: ${crests.join(', ')}`;
    });
    log(`t ${solver.time.toFixed(1)} | ${rows.join(' | ')}`);
  }
}, 3_600_000);
