import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { BreakingFront } from '../barrel/BreakingFront';
import { columnCrests, type CrestSample } from '../barrel/crestOnset';
import { advanceClocks, onsetTiming } from '../barrel/sliceClock';
import { SurfZoneSimulation, edgeHeight } from '../SurfZoneSimulation';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

/**
 * What the swept barrel's front costs on the CPU (Part B, PR 2, Task 7): Padang Padang's Small swell with the front off,
 * and the same work the simulation does for it (crests, fronts, clocks) timed beside each step. The front only reads the
 * water, so this is its cost in the game; the ratio holds on a loaded machine. Opt-in (PROBE=1); SECONDS, LOG.
 */
describe.runIf(process.env.PROBE)('Padang Padang front cost', () => {
  it('times the front against the step', () => {
    const log = process.env.LOG ?? 'padang-front-cost.txt';
    const swell = PADANG_SWELLS.small;
    const simulation = new SurfZoneSimulation({
      spot: 'padang', seed: 3, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24,
      alongShore: PADANG.alongShore, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, sweptBarrel: false,
    });
    const { solver } = simulation;
    const timing = onsetTiming(PADANG.baseDepth);
    const front = new BreakingFront(1, timing);
    const samples: CrestSample[] = [];
    const minHeight = 0.25 * edgeHeight(simulation.config, simulation.tank.edgeDepth);
    const fromRow = solver.rowBelow(simulation.tank.fineFrom);
    let stepMs = 0;
    let frontMs = 0;
    let points = 0;
    const frames = Number(process.env.SECONDS ?? 60) * 30;
    writeFileSync(log, `Padang Padang, Small swell, 1 m cells: ${solver.nx} × ${solver.nz} cells\n`);
    for (let frame = 0; frame < frames; frame += 1) {
      let start = performance.now();
      simulation.step(1 / 30);
      stepMs += performance.now() - start;
      start = performance.now();
      const count = columnCrests(solver, simulation.breaking, fromRow, minHeight, samples);
      front.update(samples, count, solver.time);
      advanceClocks(front.points, solver.time, timing);
      frontMs += performance.now() - start;
      points += front.points.length;
    }
    appendFileSync(log, `${frames} steps: the step ${(stepMs / frames).toFixed(2)} ms, the front ${(frontMs / frames).toFixed(3)} ms (${((100 * frontMs) / stepMs).toFixed(1)} %), ${(points / frames).toFixed(0)} points on average\n`);
  }, 3_600_000);
});
