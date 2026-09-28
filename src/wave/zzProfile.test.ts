import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { SurfZoneSimulation, edgeHeight, type SurfZoneConfig } from './SurfZoneSimulation';
import { shoalingCoefficient } from './dispersion';

const spot = (process.env.PROBE_SPOT ?? 'beach') as SurfZoneConfig['spot'];
const Hs = Number(process.env.PROBE_HS ?? 3);
const Tp = Number(process.env.PROBE_TP ?? 14);
const seconds = Number(process.env.PROBE_SECONDS ?? 150);
const alongShore = Number(process.env.PROBE_WIDTH ?? 160);
const spreading = Number(process.env.PROBE_SPREADING ?? 12);
const direction = Number(process.env.PROBE_DIRECTION ?? 10);
const coarse = Number(process.env.PROBE_COARSE ?? 4);
const onset = process.env.PROBE_ONSET ? Number(process.env.PROBE_ONSET) : undefined;

/** Hm0 = 4σ of the surface, averaged along shore, at rows across the tank, against linear shoaling from the edge. */
it('profile', () => {
  const config: SurfZoneConfig = { spot, seed: 1, significantHeight: Hs, peakPeriod: Tp, directionDegrees: direction, spreading, tide: 0, windSpeed: 0, alongShore, coarseSpacing: coarse, breakingOnset: onset };
  const simulation = new SurfZoneSimulation(config);
  const { solver, tank } = simulation;
  const zs: number[] = [];
  for (let z = tank.zoneInner + 10; z < -60; z += 40) zs.push(z);
  const rows = zs.map((z) => solver.rowBelow(z));
  const sum = rows.map(() => new Float64Array(solver.nx));
  const sum2 = rows.map(() => new Float64Array(solver.nx));
  let n = 0;
  for (let step = 0; step < seconds * 30; step += 1) {
    simulation.step(1 / 30);
    if (step < 30 * 2 * Tp) continue;
    n += 1;
    rows.forEach((row, r) => {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = row * solver.nx + ix;
        const eta = solver.h[i] + solver.bed[i] - solver.restLevel;
        sum[r][ix] += eta;
        sum2[r][ix] += eta * eta;
      }
    });
  }
  const edge = edgeHeight(config, tank.edgeDepth);
  const lines = rows.map((row, r) => {
    let variance = 0;
    let columns = 0;
    for (let ix = 0; ix < solver.nx; ix += 1) {
      if (Math.abs(solver.xCenters[ix]) > 40) continue;
      variance += sum2[r][ix] / n - (sum[r][ix] / n) ** 2;
      columns += 1;
    }
    const hm0 = 4 * Math.sqrt(variance / columns);
    const depth = solver.restLevel - solver.bed[row * solver.nx + Math.floor(solver.nx / 2)];
    const linear = depth > 0.5 ? edge * shoalingCoefficient(Tp, depth) / shoalingCoefficient(Tp, tank.edgeDepth) : Number.NaN;
    return `z ${zs[r].toFixed(0)} h ${depth.toFixed(1)}: Hm0 ${hm0.toFixed(2)} (linear ${linear.toFixed(2)})`;
  });
  const report = `${spot} Hs ${Hs} Tp ${Tp} width ${alongShore} spreading ${spreading} dir ${direction} coarse ${coarse} m onset ${onset ?? 'default'} (middle 80 m): edge ${tank.edgeDepth.toFixed(1)} m, target ${edge.toFixed(2)} m\n${lines.join('\n')}`;
  console.log(report);
  if (process.env.PROBE_OUT) appendFileSync(process.env.PROBE_OUT, report + '\n');
}, 3_600_000);
