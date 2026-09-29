import { describe, expect, it } from 'vitest';
import { createSpot } from './Bathymetry';
import { ShallowWaterSolver, cflSubsteps, stretchedEdges, uniformEdges } from './ShallowWaterSolver';
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

  it('levels the bed across open along-shore edges as far as the stencils reach, wherever the window slides', () => {
    // An open edge copies its neighbours, so a bed sloping across it gives the copy the wrong bed: the Reef's Big
    // swell ran away where the window's edge cuts its ledge (Part B). Walls and wrap-around copy nothing.
    const depthAt = (x: number, z: number) => 6 - 0.3 * x - 0.02 * z;
    const grid = { nx: 12, xMin: -12, dx: 2, zEdges: uniformEdges(-40, 0, 10) };
    const level = (solver: ShallowWaterSolver) => {
      const { nx } = solver;
      for (let iz = 0; iz < solver.nz; iz += 1) {
        const row = iz * nx;
        for (const ix of [0, 1]) expect(solver.bed[row + ix]).toBe(solver.bed[row + 2]);
        for (const ix of [nx - 2, nx - 1]) expect(solver.bed[row + ix]).toBe(solver.bed[row + nx - 3]);
        for (let ix = 2; ix < nx - 2; ix += 1) expect(solver.bed[row + ix]).toBe(-depthAt(solver.xCenters[ix], solver.zCenters[iz]));
        for (let ix = 0; ix < nx; ix += 1) expect(solver.h[row + ix]).toBeCloseTo(Math.max(0, -solver.bed[row + ix]), 12);
      }
    };
    const open = new ShallowWaterSolver({ ...grid, xBoundary: 'open' }, depthAt);
    level(open);
    open.shiftAlongShore(3);
    level(open);
    open.shiftAlongShore(-5);
    level(open);
    const wall = new ShallowWaterSolver({ ...grid, xBoundary: 'wall' }, depthAt);
    expect(wall.bed[0]).toBe(-depthAt(wall.xCenters[0], wall.zCenters[0]));
  });

  it('eases the bed to uniform along shore over 20 m at the open edges of a window as wide as the game\'s', () => {
    // Levelling only the copied columns left a kink where the slope resumed: the Reef's biggest seas drained that
    // corner (its 45° ledge ends on the game window's −x edge) until a thin cell ran away there.
    const depthAt = (x: number, z: number) => 30 - 0.15 * x - 0.02 * z;
    const grid = { nx: 160, xMin: -80, dx: 1, zEdges: uniformEdges(-40, 0, 10), xBoundary: 'open' as const };
    const ramped = (solver: ShallowWaterSolver) => {
      const { nx } = solver;
      let sharpest = 0;
      for (let iz = 0; iz < solver.nz; iz += 1) {
        const row = iz * nx;
        // Uniform where the stencils copy the edge, the spot's own bed from 20 m in.
        for (const ix of [0, 1]) expect(solver.bed[row + ix]).toBeCloseTo(solver.bed[row + 2], 12);
        for (const ix of [nx - 2, nx - 1]) expect(solver.bed[row + ix]).toBeCloseTo(solver.bed[row + nx - 3], 12);
        for (let ix = 20; ix < nx - 20; ix += 1) expect(solver.bed[row + ix]).toBe(-depthAt(solver.xCenters[ix], solver.zCenters[iz]));
        for (let ix = 1; ix < nx - 1; ix += 1) {
          sharpest = Math.max(sharpest, Math.abs(solver.bed[row + ix + 1] - 2 * solver.bed[row + ix] + solver.bed[row + ix - 1]));
        }
        for (let ix = 0; ix < nx; ix += 1) expect(solver.h[row + ix]).toBeCloseTo(Math.max(0, -solver.bed[row + ix]), 12);
      }
      // No kink: levelling the copied columns bent this 0.15 slope by 0.15 in one cell.
      expect(sharpest).toBeLessThan(0.05);
    };
    const solver = new ShallowWaterSolver(grid, depthAt);
    ramped(solver);
    solver.shiftAlongShore(3);
    ramped(solver);
    solver.shiftAlongShore(-5);
    ramped(solver);
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
    const beforeSurface = Array.from(before, (depth, i) => depth + solver.bed[i]);
    const { nx } = solver;
    const edges = Array.from({ length: solver.nz }, (_, iz) => beforeSurface[iz * nx + nx - 1]);
    const edgeWet = Array.from({ length: solver.nz }, (_, iz) => before[iz * nx + nx - 1] > 1e-4);
    solver.shiftAlongShore(5);
    expect(solver.xCenters[0]).toBeCloseTo(-60 + 5 * 4 + 2, 12);
    // Columns within the stencils' reach of an edge stand on a level bed (their inner neighbour's): their surface stays.
    const seabed = (ix: number, iz: number) => -spot.depthAt(solver.xCenters[ix], solver.zCenters[Math.min(iz, solver.nz - 1)]);
    const bedAt = (ix: number, iz: number) => seabed(Math.min(Math.max(ix, 2), nx - 3), iz);
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) expect(solver.bed[iz * nx + ix]).toBe(bedAt(ix, iz));
      for (let ix = 0; ix < nx - 5; ix += 1) {
        const i = iz * nx + ix;
        const old = i + 5;
        if (ix >= 2 && ix + 5 < nx - 2) expect(solver.h[i]).toBe(before[old]);
        else if (before[old] > 1e-4) expect(solver.h[i]).toBeCloseTo(Math.max(0, beforeSurface[old] - solver.bed[i]), 12);
      }
      for (let ix = nx - 5; ix < nx; ix += 1) {
        const i = iz * nx + ix;
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

  it('samples cell-centred fields bilinearly on the stretched grid', () => {
    const solver = new ShallowWaterSolver({ nx: 6, xMin: 0, dx: 2, zEdges: stretchedEdges(-40, 10, -10, 1, 3) }, (x, z) => 5 + 0.1 * x - 0.05 * z);
    const ix = 2;
    const iz = 20;
    const i = iz * solver.nx + ix;
    expect(solver.sampleCentered(solver.bed, solver.xCenters[ix], solver.zCenters[iz])).toBe(solver.bed[i]);
    const x = 0.5 * (solver.xCenters[ix] + solver.xCenters[ix + 1]);
    const z = 0.5 * (solver.zCenters[iz] + solver.zCenters[iz + 1]);
    const expected = 0.25 * (solver.bed[i] + solver.bed[i + 1] + solver.bed[i + solver.nx] + solver.bed[i + solver.nx + 1]);
    expect(solver.sampleCentered(solver.bed, x, z)).toBeCloseTo(expected, 12);
    expect(solver.sampleCentered(solver.bed, -100, -100)).toBe(solver.bed[0]);
  });

  it('sizes substeps at the CFL limit, the GPU step as the CPU one, and refuses a collapsed stable step', () => {
    expect(cflSubsteps(1 / 60, 0.02)).toBe(1);
    expect(cflSubsteps(0.25, 0.021)).toBe(12);
    expect(() => cflSubsteps(1 / 60, 5.9e-16)).toThrow(/blew up/);
  });

  it('stops with an error once the water has blown up, instead of sub-stepping without end', () => {
    const solver = new ShallowWaterSolver({ nx: 20, xMin: -20, dx: 2, zEdges: uniformEdges(-20, 20, 20) }, () => 2);
    const cell = 10 * solver.nx + 10;
    // What a diverged cell looks like: a stable step near 1e-15 s, a hundred trillion substeps a frame.
    solver.qx[cell] = 1e20;
    expect(() => solver.step(1 / 60)).toThrow(/blew up/);
  });
});
