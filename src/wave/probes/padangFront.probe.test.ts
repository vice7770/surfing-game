import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { columnCrests, type CrestSample } from '../barrel/crestOnset';
import { SurfZoneSimulation, edgeHeight } from '../SurfZoneSimulation';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

const quantile = (values: number[], q: number) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const spread = (values: number[]) =>
  values.length ? `${values.length}: ${[0.1, 0.5, 0.9].map((q) => quantile(values, q).toFixed(2)).join(' / ')} (max ${Math.max(...values).toFixed(2)})` : '0';

/**
 * Padang Padang's breaking front on its Small swell (Part B, PR 2): U/C at the reef's crests (breaking or not, by
 * the solver's Kennedy strength), their speeds, and how the fronts and slice clocks behave. Opt-in (PROBE=1); DX
 * sets the grid (1 m by default), SECONDS the run, LOG the output file.
 */
describe.runIf(process.env.PROBE)('Padang Padang front probe', () => {
  it('logs the front', () => {
    const log = process.env.LOG ?? 'padang-front.txt';
    const dx = Number(process.env.DX ?? 1);
    const swell = PADANG_SWELLS[(process.env.SWELL ?? 'small') as keyof typeof PADANG_SWELLS];
    writeFileSync(log, '');
    const simulation = new SurfZoneSimulation({
      spot: 'padang', seed: 3, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24,
      alongShore: PADANG.alongShore, dx, fineSpacing: dx, coarseSpacing: 4, spinUpPeriods: 1,
    });
    const { solver } = simulation;
    const minHeight = 0.25 * edgeHeight(simulation.config, simulation.tank.edgeDepth);
    appendFileSync(log, `edge height ${edgeHeight(simulation.config, simulation.tank.edgeDepth).toFixed(2)} m; crests over ${minHeight.toFixed(2)} m; fine zone from z ${simulation.tank.fineFrom}\n`);
    const samples: CrestSample[] = [];
    const seconds = Number(process.env.SECONDS ?? 90);
    let breakingB: number[] = [];
    let calmB: number[] = [];
    let breakingC: number[] = [];
    let breakingEtaH: number[] = [];

    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      const count = columnCrests(solver, simulation.breaking, solver.rowBelow(simulation.tank.fineFrom), minHeight, samples);
      for (let k = 0; k < count; k += 1) {
        const s = samples[k];
        // The reef, from the peak to the channel.
        if (s.x < PADANG.peakX - 30 || s.x > PADANG.channelX - PADANG.channelHalfWidth) continue;
        const i = s.row * solver.nx + s.column;
        if (!Number.isFinite(s.b)) continue;
        if (simulation.breaking.strength[i] > 0.3) {
          breakingB.push(s.b);
          breakingC.push(s.speed);
          breakingEtaH.push(s.eta / solver.h[i]);
        } else {
          calmB.push(s.b);
        }
      }
      if (frame % 30 !== 29) continue;
      const points = simulation.front!.points;
      // The newest big front: its joins and clocks along x.
      const byFront = new Map<number, typeof points>();
      for (const point of points) byFront.set(point.front, [...(byFront.get(point.front) ?? []), point]);
      const newest = [...byFront.values()].filter((f) => f.length >= 10).sort((a, b) => Math.max(...b.map((p) => p.joined)) - Math.max(...a.map((p) => p.joined)))[0];
      if (newest) {
        const every = Math.max(1, Math.floor(newest.length / 8));
        appendFileSync(log, `  newest front (x, joined, τ): ${newest.filter((_, k) => k % every === 0).map((p) => `(${p.x.toFixed(0)}, ${p.joined.toFixed(2)}, ${p.tau.toFixed(2)})`).join(' ')}\n`);
      }
      const fronts = new Map<number, typeof points>();
      for (const point of points) fronts.set(point.front, [...(fronts.get(point.front) ?? []), point]);
      const described = [...fronts.values()].filter((f) => f.length >= 5).map((f) => {
        const taus = f.map((p) => p.tau);
        let step = 0;
        for (let k = 1; k < f.length; k += 1) step = Math.max(step, Math.abs(f[k].tau - f[k - 1].tau));
        return `[${f.length} pts x ${f[0].x.toFixed(0)}…${f.at(-1)!.x.toFixed(0)} z ${f[0].z.toFixed(0)}…${f.at(-1)!.z.toFixed(0)}, ` +
          `τ ${Math.min(...taus).toFixed(2)}…${Math.max(...taus).toFixed(2)} s, neighbour step ≤ ${step.toFixed(2)}]`;
      });
      appendFileSync(log, `t ${solver.time.toFixed(0)} s | reef crests breaking: B ${spread(breakingB)}; C ${spread(breakingC)} m/s; η/h ${spread(breakingEtaH)} | not breaking: B ${spread(calmB)} | ${points.length} points on ${fronts.size} fronts; pauses ${simulation.frontPauses} ${described.join(' ')}\n`);
      breakingB = [];
      calmB = [];
      breakingC = [];
      breakingEtaH = [];
    }
  }, 3_600_000);
});
