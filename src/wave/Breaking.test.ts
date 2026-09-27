import { describe, expect, it } from 'vitest';
import { BreakingModel, PeelTracker, boreStrength, breakerDepthFor, skillForPeel } from './Breaking';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';

function damBreak(): ShallowWaterSolver {
  const solver = new ShallowWaterSolver({ nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(-40, 60, 400), xBoundary: 'periodic' }, () => 1, { manning: 0 });
  for (let iz = 0; iz < solver.nz; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] = solver.zCenters[iz] < 0 ? 2 : 0.5;
  }
  return solver;
}

function breakingCells(model: BreakingModel): number {
  let count = 0;
  for (const value of model.strength) if (value > 0) count += 1;
  return count;
}

describe('BreakingModel', () => {
  it('stays quiet over a lake at rest', () => {
    const solver = new ShallowWaterSolver({ nx: 4, xMin: 0, dx: 1, zEdges: uniformEdges(0, 50, 50) }, (_x, z) => 3 - 0.05 * z);
    const model = new BreakingModel(solver, { onset: 0.65 });
    for (let frame = 0; frame < 60; frame += 1) {
      solver.step(1 / 30);
      model.update(1 / 30);
    }
    expect(breakingCells(model)).toBe(0);
  });

  it('flags the bore front and keeps it breaking as the bore travels', () => {
    const solver = damBreak();
    const model = new BreakingModel(solver, { onset: 0.65 });
    const fronts: number[] = [];
    for (let frame = 1; frame <= 90; frame += 1) {
      solver.step(1 / 30);
      model.update(1 / 30);
      if (frame % 30 !== 0) continue;
      let front = -Infinity;
      for (let iz = 0; iz < solver.nz; iz += 1) if (model.strength[iz * solver.nx] > 0) front = Math.max(front, solver.zCenters[iz]);
      fronts.push(front);
    }
    for (const value of model.strength) expect(value).toBeLessThanOrEqual(1);
    expect(fronts.every((front) => Number.isFinite(front))).toBe(true);
    expect(fronts[2]).toBeGreaterThan(fronts[0] + 6);
    expect(Math.max(...model.age)).toBeGreaterThan(1);
  });

  it('breaks less readily when offshore wind raises the onset threshold', () => {
    const count = (onsetScale: number) => {
      const solver = damBreak();
      const model = new BreakingModel(solver, { onset: 0.65 });
      model.onsetScale = onsetScale;
      let total = 0;
      for (let frame = 0; frame < 45; frame += 1) {
        solver.step(1 / 30);
        model.update(1 / 30);
        total += breakingCells(model);
      }
      return total;
    };
    expect(count(1.2)).toBeLessThan(count(0.8));
  });
});

describe('boreStrength', () => {
  it('needs both a steep front and a depth-limited height', () => {
    expect(boreStrength(0.4, 0.4)).toBe(1);
    expect(boreStrength(0.4, 0.1)).toBe(0);
    expect(boreStrength(0.05, 0.4)).toBe(0);
    expect(boreStrength(0.175, 0.225)).toBeCloseTo(0.25, 12);
    expect(boreStrength(0.4, 0.25, 1.2)).toBeLessThan(boreStrength(0.4, 0.25, 0.8));
  });
});

describe('breaker depth', () => {
  it("is where Green's-law shoaling from the tank depth reaches γ h", () => {
    const hs = 1.4;
    const tankDepth = 5;
    const depth = breakerDepthFor(hs, tankDepth);
    expect(hs * Math.pow(tankDepth / depth, 0.25)).toBeCloseTo(0.78 * depth, 9);
  });
});

describe('PeelTracker', () => {
  const xs = Array.from({ length: 120 }, (_, i) => i - 60 + 0.5);

  it('measures the peel angle from the along-shore progression of breaking onset', () => {
    const tracker = new PeelTracker(xs, 10);
    const peelSpeed = 8;
    const celerity = 4.2;
    for (let step = 0; step <= 300; step += 1) {
      const time = step / 30;
      tracker.record(time, (column) => time >= (xs[column] + 60) / peelSpeed && time < (xs[column] + 60) / peelSpeed + 1.5);
    }
    const estimate = tracker.estimate(10, celerity)!;
    expect(estimate.direction).toBe(1);
    expect(estimate.angleDegrees).toBeCloseTo((Math.asin(celerity / peelSpeed) * 180) / Math.PI, 0);
  });

  it('measures the peel along an oblique break line, not along the shore', () => {
    const tracker = new PeelTracker(xs, 10);
    const lineSlope = 0.8;
    const alongLine = 10;
    const celerity = 5;
    const secondsPerX = Math.hypot(1, lineSlope) / alongLine;
    xs.forEach((x, column) => tracker.markOnset(column, 1 + (x + 60) * secondsPerX, lineSlope * x));
    const estimate = tracker.estimate(1 + 120 * secondsPerX, celerity)!;
    expect(estimate.lineSlope).toBeCloseTo(lineSlope, 9);
    expect(estimate.peelSpeed).toBeCloseTo(alongLine, 9);
    expect(estimate.angleDegrees).toBeCloseTo((Math.asin(celerity / alongLine) * 180) / Math.PI, 9);
    expect(estimate.direction).toBe(1);
  });

  it('reads a shore-parallel break line exactly as before', () => {
    const tracker = new PeelTracker(xs, 10);
    xs.forEach((x, column) => tracker.markOnset(column, 1 + (x + 60) / 8));
    const estimate = tracker.estimate(16, 4.2)!;
    expect(estimate.lineSlope).toBe(0);
    expect(estimate.peelSpeed).toBeCloseTo(8, 9);
  });

  // A peel along a long ledge takes about a period, so the next wave starts at the peak while the last still breaks
  // inside: the window then holds two waves, and one fit across both reads neither (the Teahupo'o Reef's sweep).
  it('measures one wave’s front when the next wave starts before the last has finished peeling', () => {
    const tracker = new PeelTracker(xs, 10);
    const peelSpeed = 10;
    const celerity = 5;
    // The first wave peels the whole window from t = 0; the next starts 10 s later and has reached a third of it.
    xs.forEach((x, column) => tracker.markOnset(column, (x + 60) / peelSpeed));
    xs.forEach((x, column) => { if (x < -20) tracker.markOnset(column, 10 + (x + 60) / peelSpeed); });
    const estimate = tracker.estimate(14, celerity)!;
    expect(estimate.peelSpeed).toBeCloseTo(peelSpeed, 9);
    expect(estimate.direction).toBe(1);
    expect(estimate.fit).toBeCloseTo(1, 9);
  });

  it('measures only the columns it is told to', () => {
    const tracker = new PeelTracker(xs, 10, 0.8, (column) => xs[column] < 20);
    xs.forEach((x, column) => tracker.markOnset(column, x < 20 ? 1 + (x + 60) / 8 : 1 + (x - 20) / 2));
    const estimate = tracker.estimate(16, 4.2)!;
    expect(estimate.peelSpeed).toBeCloseTo(8, 9);
    expect(tracker.measures(xs.findIndex((x) => x > 30))).toBe(false);
  });

  it('reports a close-out when the whole crest breaks at once', () => {
    const tracker = new PeelTracker(xs, 10);
    for (let step = 0; step <= 60; step += 1) {
      const time = step / 30;
      tracker.record(time, (column) => time >= 1 + 0.001 * (column % 3));
    }
    expect(tracker.estimate(2, 4.2)!.angleDegrees).toBeLessThan(5);
  });

  it('rates peel angles with the Hutt, Black and Mead skill ladder', () => {
    expect(skillForPeel(65)).toBe('beginner');
    expect(skillForPeel(45)).toBe('intermediate');
    expect(skillForPeel(30)).toBe('advanced');
    expect(skillForPeel(28)).toBe('professional');
    expect(skillForPeel(14)).toBe('closeout');
  });
});
