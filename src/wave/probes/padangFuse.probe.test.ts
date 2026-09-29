// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): why does each reef cell start breaking at Padang Padang?
// A cell that starts breaking either would have broken on its own (its rise rate over Kennedy's onset, 0.65 √(g h)), or
// broke only because a breaking neighbour's inherited age lowered its threshold: along the crest (±x) or across it (±z).
// Breaking that runs along the crest by inheritance, faster than the crest's own phase along the reef, closes a wave out.
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { inheritOnlyFromUpstream } from './upstreamBreaking';
import { PADANG, padangReefAt } from '../Bathymetry';
import { SurfZoneSimulation } from '../SurfZoneSimulation';

it.skipIf(!process.env.PROBE)('classifies Padang Padang’s breaking onsets', () => {
  if (process.env.INHERIT === 'upstream') inheritOnlyFromUpstream();
  for (const pair of (process.env.PADANG ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');
    (PADANG as Record<string, number>)[key] = Number(value);
  }
  const simulation = new SurfZoneSimulation({
    spot: 'padang', seed: 1, significantHeight: Number(process.env.HS ?? 1.6), peakPeriod: 16, directionDegrees: Number(process.env.DIRECTION ?? 0),
    spreading: Number(process.env.SPREADING ?? 150), tide: 0, windSpeed: 0, componentCount: 24,
  });
  const solver = simulation.solver as unknown as {
    nx: number; nz: number; xCenters: Float64Array; zCenters: Float64Array; time: number; still: Float64Array; riseRate: Float64Array;
    breakingStrength: Float64Array; kennedy: { onset: number }; onsetScale: number; gravity: number; maxStableStep(): number;
  };
  const { nx, nz } = solver;
  const reef = Array.from(solver.xCenters, (x) => padangReefAt(x));
  const firstRow = solver.zCenters.findIndex((z) => z >= simulation.tank.fineFrom);
  const previous = new Float64Array(nx * nz);
  const classes = ['own', 'along', 'across', 'both'] as const;
  log(`PADANG ${JSON.stringify(PADANG)}; tank ${JSON.stringify(simulation.tank)}; onset ${solver.kennedy.onset} × ${solver.onsetScale}`);
  const from = Number(process.env.FROM ?? 144);
  for (let period = 0; period < Number(process.env.PERIODS ?? 14); period += 1) {
    const counts = { own: 0, along: 0, across: 0, both: 0 };
    // Per logged column: the class of its most seaward onset this period (the wave's first break there), and where.
    const seaward: { z: number; kind: string }[] = Array.from({ length: nx }, () => ({ z: Infinity, kind: '-' }));
    const end = solver.time + 16;
    while (solver.time < end) {
      previous.set(solver.breakingStrength);
      simulation.step(Math.min(1 / 60, 0.95 * solver.maxStableStep()));
      if (solver.time < from) continue;
      const strength = solver.breakingStrength;
      for (let iz = Math.max(1, firstRow); iz < nz - 1; iz += 1) {
        for (let ix = 1; ix < nx - 1; ix += 1) {
          if (!reef[ix]) continue;
          const i = iz * nx + ix;
          if (!(previous[i] === 0 && strength[i] > 0)) continue;
          const threshold = solver.kennedy.onset * solver.onsetScale * Math.sqrt(solver.gravity * Math.max(0.05, solver.still[i]));
          const along = previous[i - 1] > 0 || previous[i + 1] > 0;
          const across = previous[i - nx] > 0 || previous[i + nx] > 0;
          const kind = solver.riseRate[i] >= threshold ? 'own' : along && across ? 'both' : along ? 'along' : across ? 'across' : 'own';
          counts[kind] += 1;
          if (solver.zCenters[iz] < seaward[ix].z) seaward[ix] = { z: solver.zCenters[iz], kind };
        }
      }
    }
    if (solver.time < from) continue;
    const columns: string[] = [];
    for (let ix = 0; ix < nx; ix += 10) if (reef[ix]) columns.push(`${solver.xCenters[ix].toFixed(0)}:${seaward[ix].kind}@${Number.isFinite(seaward[ix].z) ? seaward[ix].z.toFixed(0) : '-'}`);
    const total = classes.reduce((sum, kind) => sum + counts[kind], 0);
    log(`t ${solver.time.toFixed(0)} s: onsets ${total}: ${classes.map((kind) => `${kind} ${counts[kind]} (${total ? ((100 * counts[kind]) / total).toFixed(0) : 0} %)`).join(', ')} | first break by column ${columns.join(' ')}`);
  }
}, 3_600_000);
