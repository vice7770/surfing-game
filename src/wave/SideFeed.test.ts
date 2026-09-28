import { describe, expect, it } from 'vitest';
import { BoussinesqSolver } from './BoussinesqSolver';
import { SIDE_FEED, SideFeed } from './SideFeed';
import { SeaStateBoundary } from './SeaStateBoundary';
import { calmTarget } from './shallowWaterTestSupport';
import { uniformEdges, type WaterTarget } from './ShallowWaterSolver';
import { surfZoneSea, type SurfZoneConfig } from './SurfZoneSimulation';
import { transformedSea, warmStart } from './warmStart';

/** The game's directional sea: Hs 3 m at the edge, 14 s, spread 12, 10° (the wave-sizes spec's Part B debugging). */
const config: SurfZoneConfig = {
  spot: 'beach', seed: 1, significantHeight: 3, peakPeriod: 14, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0, heightAt: 'edge',
};
const sea = surfZoneSea(config);
const zoneInner = -400;

/** A 160 m window over a flat bed at the sea's depth, then 1:100 up to `shallowest` m. */
function tank(shallowest = 4, width = 160) {
  const depthAt = (_x: number, z: number) => (z < zoneInner ? sea.depth : Math.max(shallowest, sea.depth - (z - zoneInner) / 100));
  const solver = new BoussinesqSolver(
    { nx: width / 2, xMin: -width / 2, dx: 2, zEdges: uniformEdges(-460, -60, 200), xBoundary: 'open' }, depthAt, { manning: 0, breaking: false },
  );
  return solver;
}

describe('the side feed (wave sizes)', () => {
  it('weights only the outer strips, from the offshore zone to where the sets break, strongest at the edge', () => {
    // A bed reaching 1 m, so the shoaled sea passes the breaking share before the shore.
    const solver = new BoussinesqSolver(
      { nx: 80, xMin: -80, dx: 2, zEdges: uniformEdges(-460, 400, 430), xBoundary: 'open' },
      (_x, z) => (z < zoneInner ? sea.depth : Math.max(1, sea.depth - (z - zoneInner) / 80)), { manning: 0, breaking: false },
    );
    const feed = new SideFeed(solver, sea, { referenceZ: zoneInner, timeOffset: 0 });
    const { nx, nz } = solver;
    const at = (ix: number, z: number) => feed.weights[solver.rowBelow(z) * nx + ix];
    expect(at(nx / 2, -300)).toBe(0);
    expect(at(0, -300)).toBeGreaterThan(0);
    expect(at(nx - 1, -300)).toBeGreaterThan(0);
    expect(at(0, -300)).toBeGreaterThan(at(5, -300));
    expect(at(Math.ceil(SIDE_FEED.width / solver.dx) + 1, -300)).toBe(0);
    expect(at(0, zoneInner - 10)).toBe(0);
    // Where the shoaled Hs passes the breaking share of the depth, the feed has stopped.
    for (let iz = 0; iz < nz; iz += 1) {
      const depth = solver.restLevel - solver.bed[iz * nx];
      if (depth < (4 * 3) / (4 * SIDE_FEED.breakingShare) - 1) expect(feed.weights[iz * nx]).toBe(0);
    }
  });

  it('feeds a big day\'s outer surf zone, until the shoaled Hs reaches the warm start\'s 0.78 h cap (the user\'s decision, 2026-09-28)', () => {
    const solver = new BoussinesqSolver(
      { nx: 80, xMin: -80, dx: 2, zEdges: uniformEdges(-460, 400, 430), xBoundary: 'open' },
      (_x, z) => (z < zoneInner ? sea.depth : Math.max(1, sea.depth - (z - zoneInner) / 80)), { manning: 0, breaking: false },
    );
    const feed = new SideFeed(solver, sea, { referenceZ: zoneInner, timeOffset: 0 });
    const shares: { iz: number; share: number }[] = [];
    transformedSea(solver, sea, zoneInner, 0, 0.78, (iz, row) => {
      if (solver.zCenters[iz] > zoneInner && row.depth > 0) shares.push({ iz, share: row.hs / row.depth });
    });
    // Past the old 0.45 h stop, where a big day's biggest sets are already breaking, the edge column is still fed …
    const outer = shares.find(({ share }) => share >= 0.6)!;
    expect(feed.weights[outer.iz * solver.nx]).toBeGreaterThan(0);
    // … and from the cap inward it is not.
    const capped = shares.find(({ share }) => share >= 0.78)!;
    for (const { iz } of shares.filter(({ iz }) => iz >= capped.iz)) expect(feed.weights[iz * solver.nx]).toBe(0);
  });

  it('feeds a window only with full 30 m strips, keeping the game\'s 160 m window\'s middle 100 m free', () => {
    // Narrower strips blend too sharply beside free water: the Reef's 160 m window, clean with 30 m strips, blew up with
    // 2-, 5-, 10- and 15-cell strips (an along-shore current at the strip's inner edge). A window too narrow for four
    // strips (the tests' 8–60 m windows) is not fed, as before the side feed.
    const wide = tank(4, 160);
    const feed = new SideFeed(wide, sea, { referenceZ: zoneInner, timeOffset: 0 });
    const row = wide.rowBelow(-300) * wide.nx;
    for (let ix = 0; ix < wide.nx; ix += 1) {
      const fromEdge = Math.min(ix + 0.5, wide.nx - ix - 0.5) * wide.dx;
      if (fromEdge > SIDE_FEED.width) expect(feed.weights[row + ix]).toBe(0);
      else expect(feed.weights[row + ix]).toBeGreaterThan(0);
    }
    for (const width of [40, 100]) {
      const narrow = new SideFeed(tank(4, width), sea, { referenceZ: zoneInner, timeOffset: 0 });
      expect(narrow.weights.every((weight) => weight === 0)).toBe(true);
      expect(narrow.deviceShape().slots).toBe(0);
    }
  });

  it('feeds the warm start\'s sea: the incoming waves shoaled and refracted over the column', () => {
    const solver = tank();
    const feed = new SideFeed(solver, sea, { referenceZ: zoneInner, timeOffset: 40 });
    const reference = tank();
    warmStart(reference, sea, { referenceZ: zoneInner, seaTime: 40 + 3.5 });
    const out: WaterTarget = { eta: 0, qx: 0, qz: 0 };
    for (const [ix, z] of [[0, -350], [3, -250], [solver.nx - 1, -150]] as const) {
      const i = solver.rowBelow(z) * solver.nx + ix;
      expect(feed.weights[i]).toBeGreaterThan(0);
      feed.target(solver.xCenters[ix], solver.zCenters[solver.rowBelow(z)], 3.5, out, i);
      expect(out.eta).toBeCloseTo(reference.h[i] + reference.bed[i] - reference.restLevel, 9);
      expect(out.qx).toBeCloseTo(reference.qx[i], 9);
      expect(out.qz).toBeCloseTo(reference.qz[i], 9);
    }
  });

  it('keeps its strips at the window\'s edges when the window slides', () => {
    const solver = tank();
    const feed = new SideFeed(solver, sea, { referenceZ: zoneInner, timeOffset: 0 });
    solver.addRelaxationZone(feed);
    solver.shiftAlongShore(10);
    const fresh = new SideFeed(solver, sea, { referenceZ: zoneInner, timeOffset: 0 });
    expect(Array.from(feed.weights)).toEqual(Array.from(fresh.weights));
    const i = solver.rowBelow(-300) * solver.nx + solver.nx - 1;
    const a: WaterTarget = { eta: 0, qx: 0, qz: 0 };
    const b: WaterTarget = { eta: 0, qx: 0, qz: 0 };
    feed.target(0, 0, 7, a, i);
    fresh.target(0, 0, 7, b, i);
    expect(a).toEqual(b);
  });

  // Measured against the same sea with periodic sides (right for a straight coast) over the same record: a
  // short record's height swings ±30 % with the wave groups, so the input sea's Hs is no fair yardstick.
  it('keeps a directional sea\'s height as periodic sides do, where open sides lose a quarter of it', () => {
    const run = (tested: SurfZoneConfig, sides: 'open' | 'periodic', fed: boolean) => {
      const directional = surfZoneSea(tested);
      const inner = -700;
      const depthAt = (_x: number, z: number) => (z < inner ? directional.depth : Math.max(4, directional.depth - (z - inner) / 100));
      const solver = new BoussinesqSolver(
        { nx: 40, xMin: -80, dx: 4, zEdges: uniformEdges(-800, -100, 175), xBoundary: sides }, depthAt, { manning: 0, breaking: false },
      );
      warmStart(solver, directional, { referenceZ: inner, seaTime: 0 });
      solver.addRelaxationZone(new SeaStateBoundary(solver, directional, solver.zoneWeightsAlongZ(inner, -800), 0));
      if (fed) solver.addRelaxationZone(new SideFeed(solver, directional, { referenceZ: inner, timeOffset: 0 }));
      solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(-200, -100), target: calmTarget });
      const rows = [100, 150, 200, 250, 300].map((d) => solver.rowBelow(inner + d));
      const middle = [...solver.xCenters.keys()].filter((ix) => Math.abs(solver.xCenters[ix]) <= 40);
      let sum2 = 0;
      while (solver.time < 300) {
        solver.step(0.1);
        if (solver.time < 28) continue;
        for (const row of rows) for (const ix of middle) sum2 += solver.surfaceAt(row * solver.nx + ix) ** 2;
      }
      return Math.sqrt(sum2);
    };
    for (const tested of [config, { ...config, seed: 3, directionDegrees: 25 }]) {
      const periodic = run(tested, 'periodic', false);
      expect(run(tested, 'open', false) / periodic).toBeLessThan(0.8);
      expect(run(tested, 'open', true) / periodic).toBeGreaterThan(0.9);
    }
  }, 900_000);
});
