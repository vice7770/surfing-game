import { describe, expect, it } from 'vitest';
import { createSpot } from './Bathymetry';
import { ShallowWaterSolver, stretchedEdges, uniformEdges } from './ShallowWaterSolver';
import { longWaveTarget } from './shallowWaterTestSupport';

// Stoker's wet-bed dam break for 2.0 m → 0.5 m (computed by bisection on the Riemann invariants).
const STOKER = { left: 2, right: 0.5, middle: 1.1035, shockSpeed: 4.1663, tailSpeed: -1.0116 };

describe('ShallowWaterSolver', () => {
  it('keeps a lake at rest over every spot, including its dry shoreline', () => {
    for (const name of ['beach', 'point', 'reef', 'canyon'] as const) {
      const spot = createSpot(name, 1);
      const solver = new ShallowWaterSolver(
        { nx: 40, xMin: -80, dx: 4, zEdges: uniformEdges(-300, 30, 110) }, spot.depthAt, { waterLevel: 0.3 },
      );
      const initialDepth = Float64Array.from(solver.h);
      for (let frame = 0; frame < 120; frame += 1) solver.step(1 / 15);
      let largestFlow = 0;
      let depthChange = 0;
      let dryCells = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        largestFlow = Math.max(largestFlow, Math.abs(solver.qx[i]), Math.abs(solver.qz[i]));
        // Dry cells may pick up round-off films (~1e-24 m), so compare depths, not surfaces.
        depthChange = Math.max(depthChange, Math.abs(solver.h[i] - initialDepth[i]));
        if (initialDepth[i] === 0) dryCells += 1;
      }
      expect(dryCells).toBeGreaterThan(0);
      expect(largestFlow).toBeLessThan(1e-9);
      expect(depthChange).toBeLessThan(1e-9);
    }
  });

  it('conserves volume, stays positive and loses energy while a hump sloshes in a closed basin', () => {
    const solver = new ShallowWaterSolver({ nx: 40, xMin: -40, dx: 2, zEdges: uniformEdges(-40, 40, 40) }, () => 2);
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const r2 = solver.xCenters[ix] ** 2 + solver.zCenters[iz] ** 2;
        solver.h[iz * solver.nx + ix] = 2 + 0.4 * Math.exp(-r2 / 60);
      }
    }
    const volume = solver.totalVolume();
    const energy = solver.totalEnergy();
    let shallowest = Infinity;
    for (let frame = 0; frame < 300; frame += 1) {
      solver.step(1 / 30);
      for (const depth of solver.h) shallowest = Math.min(shallowest, depth);
    }
    expect(solver.totalVolume() / volume).toBeCloseTo(1, 12);
    expect(shallowest).toBeGreaterThan(0);
    expect(solver.totalEnergy()).toBeLessThan(energy);
  });

  it('matches the Stoker dam-break solution on a wet bed', () => {
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(-50, 50, 400), xBoundary: 'periodic' }, () => 1, { manning: 0 },
    );
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const depth = solver.zCenters[iz] < 0 ? STOKER.left : STOKER.right;
      for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] = depth;
    }
    const duration = 3;
    while (solver.time < duration - 1e-9) solver.step(Math.min(0.02, duration - solver.time));
    const plateauZ = 0.5 * (STOKER.tailSpeed + STOKER.shockSpeed) * duration;
    expect(solver.h[solver.cellIndex(0.5, plateauZ)] / STOKER.middle).toBeCloseTo(1, 1);
    let shockZ = -Infinity;
    for (let iz = solver.nz - 1; iz >= 0; iz -= 1) {
      if (solver.h[iz * solver.nx] > 0.5 * (STOKER.middle + STOKER.right)) {
        shockZ = solver.zCenters[iz];
        break;
      }
    }
    expect(Math.abs(shockZ - STOKER.shockSpeed * duration)).toBeLessThan(0.75);
  });

  it('repeats bit-identical states for identical runs', () => {
    const run = () => {
      const solver = new ShallowWaterSolver(
        { nx: 24, xMin: -48, dx: 4, zEdges: uniformEdges(-160, 20, 60), xBoundary: 'open' }, createSpot('reef', 1).depthAt,
      );
      solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(-120, -160), target: longWaveTarget(0.5, 9, 10) });
      for (let frame = 0; frame < 200; frame += 1) solver.step(1 / 30);
      return [Array.from(solver.h), Array.from(solver.qx), Array.from(solver.qz)];
    };
    expect(run()).toEqual(run());
  });

  it('lets waves leave through open along-shore boundaries', () => {
    const excessEnergy = (xBoundary: 'wall' | 'open') => {
      const grid = { nx: 80, xMin: -80, dx: 2, zEdges: uniformEdges(-20, 20, 20), xBoundary };
      const still = new ShallowWaterSolver(grid, () => 3, { manning: 0 }).totalEnergy();
      const solver = new ShallowWaterSolver(grid, () => 3, { manning: 0 });
      for (let iz = 0; iz < solver.nz; iz += 1) {
        for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] = 3 + 0.3 * Math.exp(-(solver.xCenters[ix] ** 2) / 40);
      }
      for (let frame = 0; frame < 400; frame += 1) solver.step(0.1);
      return solver.totalEnergy() - still;
    };
    expect(excessEnergy('open')).toBeLessThan(0.1 * excessEnergy('wall'));
  });

  it('stretches cross-shore cells smoothly from fine to coarse', () => {
    const edges = stretchedEdges(-300, 30, -150, 1, 4);
    expect(edges[0]).toBe(-300);
    expect(edges[edges.length - 1]).toBe(30);
    let largest = 0;
    let smallest = Infinity;
    let worstRatio = 1;
    for (let i = 1; i < edges.length; i += 1) {
      const spacing = edges[i] - edges[i - 1];
      largest = Math.max(largest, spacing);
      smallest = Math.min(smallest, spacing);
      if (i > 1) {
        const previous = edges[i - 1] - edges[i - 2];
        worstRatio = Math.max(worstRatio, spacing / previous, previous / spacing);
      }
    }
    expect(largest).toBeLessThanOrEqual(4 + 1e-9);
    expect(smallest).toBeGreaterThan(0.99);
    expect(worstRatio).toBeLessThan(1.081);
    expect(edges.length - 1).toBeLessThan(260);
  });

  it('slides the window along shore, keeping overlapping water and extending the edge', () => {
    const spot = createSpot('point', 1);
    const solver = new ShallowWaterSolver(
      { nx: 30, xMin: -60, dx: 4, zEdges: uniformEdges(-200, 20, 55), xBoundary: 'open' }, spot.depthAt, { waterLevel: 0.2 },
    );
    for (let i = 0; i < solver.h.length; i += 1) if (solver.h[i] > 0) solver.h[i] += 0.1 * Math.sin(i * 0.37);
    for (let frame = 0; frame < 30; frame += 1) solver.step(1 / 15);
    const before = Float64Array.from(solver.h);
    const edgeSurface = (iz: number) => before[iz * solver.nx + solver.nx - 1] + solver.bed[iz * solver.nx + solver.nx - 1];
    const edges = Array.from({ length: solver.nz }, (_, iz) => edgeSurface(iz));
    const edgeWet = Array.from({ length: solver.nz }, (_, iz) => before[iz * solver.nx + solver.nx - 1] > 1e-4);
    solver.shiftAlongShore(5);
    expect(solver.xCenters[0]).toBeCloseTo(-60 + 5 * 4 + 2, 12);
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx - 5; ix += 1) expect(solver.h[iz * solver.nx + ix]).toBe(before[iz * solver.nx + ix + 5]);
      for (let ix = solver.nx - 5; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        expect(solver.bed[i]).toBe(-spot.depthAt(solver.xCenters[ix], solver.zCenters[iz]));
        const surface = edgeWet[iz] ? edges[iz] : 0.2;
        expect(solver.h[i]).toBeCloseTo(Math.max(0, surface - solver.bed[i]), 12);
      }
    }
    expect(() => solver.shiftAlongShore(30)).toThrow(RangeError);
  });

  it('keeps a lake at rest while the window slides across the headland', () => {
    const spot = createSpot('point', 1);
    const solver = new ShallowWaterSolver(
      { nx: 30, xMin: -200, dx: 4, zEdges: uniformEdges(-200, 20, 55), xBoundary: 'open' }, spot.depthAt, { waterLevel: 0.2 },
    );
    for (let move = 0; move < 40; move += 1) {
      solver.step(1 / 15);
      solver.shiftAlongShore(move % 3 === 2 ? -1 : 3);
    }
    let largestFlow = 0;
    let depthError = 0;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        largestFlow = Math.max(largestFlow, Math.abs(solver.qx[i]), Math.abs(solver.qz[i]));
        depthError = Math.max(depthError, Math.abs(solver.h[i] - Math.max(0, 0.2 - solver.bed[i])));
      }
    }
    expect(solver.xCenters[0]).toBeGreaterThan(0);
    expect(largestFlow).toBeLessThan(1e-9);
    expect(depthError).toBeLessThan(1e-9);
  });
});
