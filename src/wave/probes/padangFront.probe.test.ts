import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import type { FrontPoint } from '../barrel/BreakingFront';
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
    // The reef's breaking crests: how many are on a front (joined, now or before), and how many rise at the fresh onset now.
    let breakingCrests = 0;
    let onFront = 0;
    let freshNow = 0;
    // Off a front: beside a joined point of the same wave (a flank), or on their own.
    let flank = 0;
    // How long each clock holds still (pauses rather than runs back), s; and the splits since the last line.
    const holding = new Map<number, number>();
    const lastTau = new Map<number, number>();
    const holds: number[] = [];
    // Seeds (joined with no front point beside them the step before) and the rest: the join table's depth against
    // where each crest's own fresh test fired, m.
    let previousPoints: FrontPoint[] = [];
    const knownIds = new Set<number>();
    let seedGaps: number[] = [];
    let otherGaps: number[] = [];
    // The join gaps across this second's split boundaries (neighbouring columns within the link reach, on two fronts).
    let gaps: number[] = [];

    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      const count = columnCrests(solver, simulation.breaking, solver.rowBelow(simulation.tank.fineFrom), minHeight, samples);
      for (let k = 0; k < count; k += 1) {
        const s = samples[k];
        // The reef, from the peak to the channel.
        if (s.x < PADANG.peakX - 30 || s.x > PADANG.channelX - PADANG.channelHalfWidth) continue;
        const i = s.row * solver.nx + s.column;
        if (simulation.breaking.strength[i] > 0.3) {
          breakingCrests += 1;
          if (s.rise >= 0.65) freshNow += 1;
          if (simulation.front!.points.some((p) => p.column === s.column && Math.abs(p.z - s.z) < 3 * dx)) onFront += 1;
          else if (simulation.front!.points.some((p) => Math.abs(p.column - s.column) <= 2 && Math.abs(p.z - s.z) < 3 * dx)) flank += 1;
        }
        if (!Number.isFinite(s.b)) continue;
        if (simulation.breaking.strength[i] > 0.3) {
          breakingB.push(s.b);
          breakingC.push(s.speed);
          breakingEtaH.push(s.eta / solver.h[i]);
        } else {
          calmB.push(s.b);
        }
      }
      for (const point of simulation.front!.points) {
        if (knownIds.has(point.id)) continue;
        knownIds.add(point.id);
        const seed = !previousPoints.some((p) => Math.abs(p.column - point.column) === 1 && Math.abs(p.z - point.z) < 3 * dx);
        if (point.fresh !== null) (seed ? seedGaps : otherGaps).push(point.fresh - point.depth);
      }
      previousPoints = simulation.front!.points.map((p) => ({ ...p }));
      const seenNow = new Set<number>();
      for (const point of simulation.front!.points) {
        seenNow.add(point.id);
        const held = lastTau.get(point.id) === point.tau && point.joined !== solver.time;
        if (held) holding.set(point.id, (holding.get(point.id) ?? 0) + 1);
        else if (holding.has(point.id)) {
          holds.push(holding.get(point.id)! / 30);
          holding.delete(point.id);
        }
        lastTau.set(point.id, point.tau);
      }
      for (const [id, steps] of holding) {
        if (seenNow.has(id)) continue;
        holds.push(steps / 30);
        holding.delete(id);
      }
      for (const id of [...lastTau.keys()]) if (!seenNow.has(id)) lastTau.delete(id);
      const byColumn = new Map<number, FrontPoint[]>();
      for (const point of simulation.front!.points) byColumn.set(point.column, [...(byColumn.get(point.column) ?? []), point]);
      for (const point of simulation.front!.points) {
        for (const other of byColumn.get(point.column + 1) ?? []) {
          if (other.front !== point.front && Math.abs(other.z - point.z) < 3 * dx) gaps.push(Math.abs(other.joined - point.joined));
        }
      }
      if (frame % 30 !== 29) continue;
      const points = simulation.front!.points;
      // The newest big front: its joins and clocks along x.
      const byFront = new Map<number, typeof points>();
      for (const point of points) byFront.set(point.front, [...(byFront.get(point.front) ?? []), point]);
      const newest = [...byFront.values()].filter((f) => f.length >= 10).sort((a, b) => Math.max(...b.map((p) => p.joined)) - Math.max(...a.map((p) => p.joined)))[0];
      if (newest) {
        // The barrel's peel along x: a line through the joins (dx/dt), against the solver's own (the waves probe).
        const n = newest.length;
        const mx = newest.reduce((sum, p) => sum + p.x, 0) / n;
        const mt = newest.reduce((sum, p) => sum + p.joined, 0) / n;
        const sxt = newest.reduce((sum, p) => sum + (p.x - mx) * (p.joined - mt), 0);
        const sxx = newest.reduce((sum, p) => sum + (p.x - mx) ** 2, 0);
        const stt = newest.reduce((sum, p) => sum + (p.joined - mt) ** 2, 0);
        const fit = sxt * sxt / (sxx * stt);
        appendFileSync(log, `  newest front: ${n} points, x ${newest[0].x.toFixed(0)}…${newest.at(-1)!.x.toFixed(0)}, joins peel at ${(sxx / sxt).toFixed(1)} m/s along x (r² ${fit.toFixed(2)})\n`);
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
      appendFileSync(log, `t ${solver.time.toFixed(0)} s | ${breakingCrests} breaking reef crests: ${breakingCrests ? ((100 * onFront) / breakingCrests).toFixed(0) : '-'} % on a front, ${breakingCrests ? ((100 * freshNow) / breakingCrests).toFixed(0) : '-'} % at the fresh onset now, off a front ${breakingCrests ? ((100 * flank) / breakingCrests).toFixed(0) : '-'} % flank and ${breakingCrests ? ((100 * (breakingCrests - onFront - flank)) / breakingCrests).toFixed(0) : '-'} % isolated; crests sized at the foot: joined ${simulation.front!.joins}, crossed unbroken ${simulation.front!.unbroken}, lost ${simulation.front!.lost} (unsized ${simulation.front!.unsized}); fresh − join depth: seeds ${seedGaps.length ? `${seedGaps.length}: ${[0.1, 0.5, 0.9].map((q) => [...seedGaps].sort((a, b) => a - b)[Math.floor(q * seedGaps.length)].toFixed(2)).join(' / ')} m` : '0'}, others ${otherGaps.length ? `${otherGaps.length}: ${[0.1, 0.5, 0.9].map((q) => [...otherGaps].sort((a, b) => a - b)[Math.floor(q * otherGaps.length)].toFixed(2)).join(' / ')} m` : '0'}; split gaps ${gaps.length ? `${gaps.length}: ${[0.1, 0.5, 0.9].map((q) => [...gaps].sort((a, b) => a - b)[Math.floor(q * gaps.length)].toFixed(1)).join(' / ')} s` : '0'} | reef crests breaking: B ${spread(breakingB)}; C ${spread(breakingC)} m/s; η/h ${spread(breakingEtaH)} | not breaking: B ${spread(calmB)} | ${points.length} points on ${fronts.size} fronts; pauses ${simulation.frontPauses} ${described.join(' ')}\n`);
      breakingB = [];
      breakingCrests = 0;
      onFront = 0;
      freshNow = 0;
      flank = 0;
      gaps = [];
      seedGaps = [];
      otherGaps = [];
      calmB = [];
      breakingC = [];
      breakingEtaH = [];
    }
    const sorted = [...holds].sort((a, b) => a - b);
    const at = (q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : NaN);
    appendFileSync(log, `holds: ${sorted.length}, median ${at(0.5).toFixed(3)} s, 95th percentile ${at(0.95).toFixed(3)} s, max ${(sorted.at(-1) ?? NaN).toFixed(3)} s; splits ${simulation.front!.splits}\n`);
  }, 3_600_000);
});
