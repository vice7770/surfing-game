import { describe, expect, it } from 'vitest';
import { sampleSurfaceNormal } from '../scene/WaterSurface';
import { waveNumber } from '../wave/dispersion';
import { ShallowWaterSolver, uniformEdges } from '../wave/ShallowWaterSolver';
import { SurfZoneSimulation, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { reefCrestZ } from '../wave/Bathymetry';
import { FRONT_FIELD, FRONT_STRIDE } from '../wave/barrel/frontRecords';
import { ProfileLibrary } from '../wave/barrel/ProfileLibrary';
import { SweptContact } from '../wave/barrel/sweptContact';
import { tubeCase } from '../wave/barrel/toyCase';
import { SEAWATER_DENSITY, PhysicalSurfWater, catmullRomWeights } from './PhysicalSurfWater';
import { createWaterSample } from './SurfWater';

const config: SurfZoneConfig = {
  spot: 'point', seed: 3, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 8, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};

/** A flat 3 m channel with a steady 1 m/s current and nothing breaking. */
function channel(depth = 3, current = 1) {
  const solver = new ShallowWaterSolver({ nx: 20, xMin: -10, dx: 1, zEdges: uniformEdges(-10, 10, 20), xBoundary: 'open' }, () => depth);
  for (let i = 0; i < solver.h.length; i += 1) solver.qx[i] = solver.h[i] * current;
  const breaking = new Float64Array(solver.h.length);
  return { solver, breaking, water: new PhysicalSurfWater(solver, { peakPeriod: 10, breaking }) };
}

describe('Catmull-Rom weights', () => {
  it('interpolate the nodes, sum to one and reproduce a straight line', () => {
    catmullRomWeights(0).forEach((weight, i) => expect(weight).toBeCloseTo([0, 1, 0, 0][i], 12));
    for (const t of [0.13, 0.5, 0.87]) {
      const w = catmullRomWeights(t);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      expect(w[0] * -1 + w[1] * 0 + w[2] * 1 + w[3] * 2).toBeCloseTo(t, 12);
    }
  });
});

describe('PhysicalSurfWater', () => {
  it('tallies its own pushes on the water for the network, but not remote ones (spec N1)', () => {
    const { water } = channel();
    water.addReaction(2, 0, 0, 0, 0);
    water.addReaction(4, 0, 6, 0, 0);
    water.addReaction(-2, 0, 0, 5, 2);
    water.applyRemoteReaction(3, 0, 100, 100);
    const out = new Float64Array(4);
    water.drainReaction(out);
    // Weighted by the horizontal impulse: 6 at x = 4 and 2 at x = −2.
    expect(out[0]).toBeCloseTo((6 * 4 + 2 * -2) / 8, 9);
    expect(out[1]).toBeCloseTo(0, 9);
    expect(out[2]).toBeCloseTo(6, 9);
    expect(out[3]).toBeCloseTo(2, 9);
    water.drainReaction(out);
    expect([...out]).toEqual([0, 0, 0, 0]);
  });

  it('pushes the water with a remote board\'s reaction, conserving momentum', () => {
    const { solver, water } = channel();
    const momentum = () => {
      let sum = 0;
      for (let i = 0; i < solver.qx.length; i += 1) sum += solver.qx[i] * solver.dx * solver.dz[Math.floor(i / solver.nx)];
      return sum * SEAWATER_DENSITY;
    };
    const before = momentum();
    water.applyRemoteReaction(3, 0, 50, 0);
    expect(momentum() - before).toBeCloseTo(-50, 6);
  });

  it('agrees with the rendered surface and its shading normal at every render node', () => {
    const simulation = new SurfZoneSimulation(config);
    for (let step = 0; step < 120; step += 1) simulation.step(1 / 60);
    const water = PhysicalSurfWater.forSimulation(simulation);
    const grid = simulation.renderGrid(1);
    const render = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(render, grid);
    const out = createWaterSample();
    let checked = 0;
    for (let r = 2; r < grid.nz - 2; r += 7) {
      for (let c = 2; c < grid.nx - 2; c += 5) {
        const x = grid.xMin + c * grid.spacing;
        const z = grid.zMin + r * grid.spacing;
        water.sampleAt(x, 0, z, out);
        expect(out.surfaceY).toBeCloseTo(render[(r * grid.nx + c) * 2], 5);
        const normal = sampleSurfaceNormal(render, grid, x, z);
        expect(out.normalX).toBeCloseTo(normal.x, 4);
        expect(out.normalZ).toBeCloseTo(normal.z, 4);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('keeps the surface slope continuous across node lines, so contact forces do not jump', () => {
    const simulation = new SurfZoneSimulation(config);
    for (let step = 0; step < 120; step += 1) simulation.step(1 / 60);
    const water = PhysicalSurfWater.forSimulation(simulation);
    const out = createWaterSample();
    for (const [x, z] of [[3, -70.4], [-6, -100.2], [11, -40.7]]) {
      const left = water.sampleAt(x - 1e-7, 0, z, out).slopeX;
      const right = water.sampleAt(x + 1e-7, 0, z, out).slopeX;
      expect(Math.abs(right - left)).toBeLessThan(1e-5);
    }
  });

  // Plan §1.10: u(z)/ū = kh cosh k(z + h) / sinh kh, whose depth average is 1.
  it('reshapes the depth-averaged current with the linear profile, keeping its mean', () => {
    const { water, solver } = channel();
    const out = createWaterSample();
    const bed = solver.bed[0];
    let sum = 0;
    const layers = 400;
    for (let k = 0; k < layers; k += 1) sum += water.sampleAt(0.2, bed + ((k + 0.5) / layers) * 3, 0.3, out).flowX;
    expect(sum / layers).toBeCloseTo(1, 4);
    const kh = waveNumber((2 * Math.PI) / 10, 3) * 3;
    water.sampleAt(0.2, 5, 0.3, out);
    expect(out.regime).toBe('profile');
    expect(out.flowX).toBeCloseTo(kh / Math.tanh(kh), 9);
    expect(water.sampleAt(0.2, bed - 2, 0.3, out).flowX).toBeCloseTo(kh / Math.sinh(kh), 9);
    expect(out.flowY).toBe(0);
    expect(out.wet).toBe(true);
    expect(out.stillDepth).toBeCloseTo(3, 12);
    expect(out.bedY).toBeCloseTo(bed, 12);
  });

  it('keeps the depth-averaged current in bores and very shallow water, and none on dry land', () => {
    const { water, breaking, solver } = channel();
    const out = createWaterSample();
    breaking.fill(0.5);
    water.sampleAt(0.2, 0, 0.3, out);
    expect(out.regime).toBe('bore');
    expect(out.flowX).toBeCloseTo(1, 12);
    const shallow = channel(0.004 * 9.81 * 100 / (2 * Math.PI) ** 2 * 0.5).water;
    expect(shallow.sampleAt(0.2, 0, 0.3, out).regime).toBe('shallow');
    solver.h.fill(0.001);
    water.sampleAt(0.2, 0, 0.3, out);
    expect(out.wet).toBe(false);
    expect(out.regime).toBe('dry');
    expect([out.flowX, out.flowY, out.flowZ]).toEqual([0, 0, 0]);
    expect(Number.isFinite(out.surfaceY)).toBe(true);
    expect(out.bedY).toBeCloseTo(solver.bed[0], 12);
  });

  // The riding-the-wave spec (Task 4): Svendsen's surface roller rides a bore's front at about the bore's speed,
  // so broken water carries a board; below the roller the flow stays the depth-averaged current.
  it('carries the surface of a bore at about its speed, and nothing below the roller', () => {
    const { water, breaking, solver } = channel();
    // A 0.6 m bore over 3 m of still water, moving 1 m/s toward the beach (+z) depth-averaged, breaking fully.
    for (let i = 0; i < solver.h.length; i += 1) {
      solver.h[i] = 3.6;
      solver.qx[i] = 0;
      solver.qz[i] = 3.6;
    }
    breaking.fill(1);
    const out = createWaterSample();
    const surface = water.sampleAt(0.2, 5, 0.3, out).surfaceY;
    water.sampleAt(0.2, surface, 0.3, out);
    expect(out.regime).toBe('bore');
    expect(out.flowZ).toBeCloseTo(Math.sqrt(9.81 * 3.6), 1);
    expect(out.flowX).toBeCloseTo(0, 9);
    expect(water.sampleAt(0.2, surface - 1, 0.3, out).flowZ).toBeCloseTo(1, 9);
    breaking.fill(0.5);
    expect(water.sampleAt(0.2, surface, 0.3, out).flowZ).toBeCloseTo(0.5 * Math.sqrt(9.81 * 3.6), 1);
  });

  // Final review: the roller rides the bore's front toward the shore. A current running seaward (a rip, backwash)
  // or along the shore under breaking water carries no roller: boosted, it threw a board out to sea at about √(g d).
  it('carries only a shoreward current with the roller', () => {
    const { water, breaking, solver } = channel();
    breaking.fill(1);
    const out = createWaterSample();
    for (const [qx, qz] of [[0, -3.6], [3.6, 0], [3.6, 0.9]]) {
      for (let i = 0; i < solver.h.length; i += 1) {
        solver.h[i] = 3.6;
        solver.qx[i] = qx;
        solver.qz[i] = qz;
      }
      const surface = water.sampleAt(0.2, 5, 0.3, out).surfaceY;
      water.sampleAt(0.2, surface, 0.3, out);
      expect(Math.hypot(out.flowX, out.flowZ)).toBeLessThan(1.1);
    }
  });

  it('pushes nothing where nothing breaks, however high the water stands', () => {
    const { water, solver } = channel();
    for (let i = 0; i < solver.h.length; i += 1) {
      solver.h[i] = 3.6;
      solver.qx[i] = 3.6;
    }
    const out = createWaterSample();
    const surface = water.sampleAt(0.2, 5, 0.3, out).surfaceY;
    water.sampleAt(0.2, surface, 0.3, out);
    expect(out.regime).not.toBe('bore');
    expect(out.flowX).toBeLessThan(2);
  });

  it('reconstructs rising water from the flow converging on a point', () => {
    const { water, solver } = channel();
    // qx falls along +x at 0.2 m²/s per metre, so water piles up at 0.2 m/s.
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) solver.qx[iz * solver.nx + ix] = 3 - 0.2 * solver.xCenters[ix];
    }
    const out = createWaterSample();
    const surface = water.sampleAt(0.1, 5, 0.3, out).flowY;
    expect(surface).toBeCloseTo(0.2, 6);
    expect(water.sampleAt(0.1, solver.bed[0], 0.3, out).flowY).toBeCloseTo(0, 9);
  });

  it('says when a point lies beyond the simulated window', () => {
    const { water } = channel();
    const out = createWaterSample();
    for (const [x, z] of [[-10.5, 0], [10.5, 0], [0, -10.5], [0, 10.5]]) {
      water.sampleAt(x, 0, z, out);
      expect(out.outsideDomain).toBe(true);
      expect(out.regime).toBe('outside');
      expect(out.bedY).toBe(-Infinity);
    }
    expect(water.sampleAt(0, 0, 0, out).outsideDomain).toBe(false);
  });

  it('gives the water the opposite of the body’s impulse, conserving momentum', () => {
    const { water, solver } = channel();
    const momentum = (values: Float64Array) => {
      let total = 0;
      for (let iz = 0; iz < solver.nz; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) total += values[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
      return total * SEAWATER_DENSITY;
    };
    const before = { x: momentum(solver.qx), z: momentum(solver.qz) };
    water.addReaction(0.3, -2.7, 150, 900, -60);
    expect(momentum(solver.qx) - before.x).toBeCloseTo(-150, 6);
    expect(momentum(solver.qz) - before.z).toBeCloseTo(60, 6);
    expect(water.unappliedVerticalImpulse).toBe(900);
  });
});

// The wipeout spec, Part B: bodies in broken water feel its air (G9's plume).
describe('PhysicalSurfWater in a whitewater plume', () => {
  it('reports the plume\'s void fraction within its depth under the surface, and none below it or without one', () => {
    const { solver, breaking } = channel();
    const depth = new Float64Array(solver.h.length).fill(0.5);
    const plume = { voidFraction: () => 0.15, depth };
    const water = new PhysicalSurfWater(solver, { peakPeriod: 10, breaking, aeration: plume });
    const out = createWaterSample();
    const surface = water.sampleAt(0.2, 5, 0.3, out).surfaceY;
    expect(water.sampleAt(0.2, surface - 0.2, 0.3, out).voidFraction).toBeCloseTo(0.15, 9);
    expect(water.sampleAt(0.2, surface - 1, 0.3, out).voidFraction).toBe(0);
    const clear = channel().water;
    expect(clear.sampleAt(0.2, surface - 0.2, 0.3, out).voidFraction ?? 0).toBe(0);
  });
});

describe('PhysicalSurfWater\'s turbulence', () => {
  it('reports the plume\'s turbulence in the water column, strongest near the surface, and leaves the flow alone', () => {
    const { solver, breaking } = channel();
    const turbulence = new Float64Array(solver.h.length).fill(0.5);
    const plume = { voidFraction: () => 0, depth: new Float64Array(solver.h.length), turbulence };
    const water = new PhysicalSurfWater(solver, { peakPeriod: 10, breaking, aeration: plume });
    const clear = channel().water;
    const out = createWaterSample();
    const surface = water.sampleAt(0.2, 5, 0.3, out).surfaceY;
    const top = water.sampleAt(0.2, surface - 0.1, 0.3, out).turbulence ?? 0;
    expect(top).toBeGreaterThan(0.4);
    expect(water.sampleAt(0.2, -2.8, 0.3, out).turbulence ?? 0).toBeLessThan(top);
    const flow = water.sampleAt(0.2, surface - 0.1, 0.3, out).flowX;
    expect(flow).toBeCloseTo(clear.sampleAt(0.2, surface - 0.1, 0.3, out).flowX, 12);
  });
  it('gives each sample its bed\'s normal and material: reef on the Reef\'s ledge, sand elsewhere', () => {
    const simulation = new SurfZoneSimulation({ ...config, spot: 'reef' });
    const water = PhysicalSurfWater.forSimulation(simulation);
    const x = -10;
    const z = reefCrestZ(x) - 4; // on the ledge, seaward of the crest
    const sample = water.sampleAt(x, -1, z, createWaterSample());
    const step = 0.5;
    const gx = (simulation.bedAt(x + step, z) - simulation.bedAt(x - step, z)) / (2 * step);
    const gz = (simulation.bedAt(x, z + step) - simulation.bedAt(x, z - step)) / (2 * step);
    const norm = Math.hypot(gx, 1, gz);
    expect(sample.bedNormalX).toBeCloseTo(-gx / norm, 2);
    expect(sample.bedNormalY).toBeCloseTo(1 / norm, 2);
    expect(sample.bedNormalZ).toBeCloseTo(-gz / norm, 2);
    expect(sample.bedMaterial).toBe('reef');
    const beach = PhysicalSurfWater.forSimulation(new SurfZoneSimulation({ ...config, spot: 'beach' }));
    expect(beach.sampleAt(0, -1, -60, createWaterSample()).bedMaterial).toBe('sand');
  }, 240_000);
});

/** The toy tube (h0 3 m: foot crest 0.9 m at A0 0.3) on a straight front along +x at z = 0, thrown there, at τ `tau`, s. */
function sweptChannel(tau = 0.05) {
  const { solver, breaking } = channel(3, 1);
  const library = new ProfileLibrary([tubeCase(0.3)]);
  const contact = new SweptContact(library, 0.05);
  const water = new PhysicalSurfWater(solver, { peakPeriod: 10, breaking, swept: contact });
  const n = 17;
  const records = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    records[o + FRONT_FIELD.x] = k - 8; records[o + FRONT_FIELD.z] = 0; records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
    records[o + FRONT_FIELD.tau] = tau; records[o + FRONT_FIELD.footHeight] = 0.9; records[o + FRONT_FIELD.footDepth] = 3;
    records[o + FRONT_FIELD.throwZ] = 0;
  }
  contact.update(records, n, solver.restLevel, (x, z) => water.plainSurfaceAt(x, z));
  return { water, solver, times: library.profileTimes({ slope: 0.05, footHeight: 0.9, footDepth: 3 }) };
}
// At x = 0.9 h0 = 2.7 m ahead (z 2.7): the flat below, the underside at 0.55 h0 and the top at 0.575 h0 over still
// water; the top crosses there at profile index 32 + 32 × 0.75, three quarters of the way to the tip.
const UNDER = 0.55 * 3;
const TOP = 0.575 * 3;

describe('the swept contact through the water (Padang Padang, Part B, PR 4)', () => {
  it('answers the tube’s air with the face below and the curl above, covered and open', () => {
    const { water, solver } = sweptChannel();
    const sample = water.sampleAt(0, solver.restLevel + 1, 2.7, createWaterSample());
    expect(sample.surfaceY).toBeCloseTo(water.plainSurfaceAt(0, 2.7), 2);
    expect(sample.ceilingY).toBeCloseTo(solver.restLevel + UNDER, 2);
    expect(sample.ceilingTopY).toBeCloseTo(solver.restLevel + TOP, 2);
    expect(sample.clearance).toBeCloseTo(sample.ceilingY! - (solver.restLevel + 1), 6);
    expect(sample.covered).toBe(true);
    expect(sample.tube).toBe('open');
    expect(sample.waterFloorY).toBeUndefined();
    expect(water.surfaceAt(0, 2.7)).toBeCloseTo(sample.surfaceY, 4);
  });

  it('gives the curl’s water the lip’s flow across the crest, keeping the solver’s along it', () => {
    const { water, solver } = sweptChannel();
    const y = solver.restLevel + (UNDER + TOP) / 2;
    const sample = water.sampleAt(0, y, 2.7, createWaterSample());
    expect(sample.surfaceY).toBeCloseTo(solver.restLevel + TOP, 2);
    expect(sample.waterFloorY).toBeCloseTo(solver.restLevel + UNDER, 2);
    expect(sample.covered).toBe(false);
    const plain = new PhysicalSurfWater(solver, { peakPeriod: 10 }).sampleAt(0, y, 2.7, createWaterSample());
    // Along the crest (x) the solver's flow is kept; across it, 3/4 of the way to the tip's 0.9 √(g h0) shoreward, and down.
    expect(sample.flowX).toBeCloseTo(plain.flowX, 6);
    expect(sample.flowZ).toBeCloseTo(0.25 * plain.flowZ + 0.75 * 0.9 * Math.sqrt(9.81 * 3), 1);
    expect(sample.flowY).toBeLessThan(0);
  });

  it('holds a steep face’s slope at tan 60° along its own direction, keeping its normal (the advisor, 2026-09-30)', () => {
    const { water, solver } = sweptChannel();
    // In the tube's air at 0.733 h0 ahead (2.2 m), over the toy's face from the throat to the toe: 3 in 1, n_y 0.32.
    const sample = water.sampleAt(0, solver.restLevel + 1, 2.2, createWaterSample());
    expect(sample.ceilingY).toBeDefined();
    expect(sample.surfaceY).toBeCloseTo(solver.restLevel + 0.2 * 3, 2);
    expect(sample.normalY).toBeCloseTo(1 / Math.sqrt(10), 3);
    expect(sample.normalZ).toBeCloseTo(3 / Math.sqrt(10), 3);
    // Its slope, 3 unclamped, held at √3: buoyancy at most twice the support.
    expect(sample.slopeX).toBeCloseTo(0, 6);
    expect(sample.slopeZ).toBeCloseTo(-Math.sqrt(3), 6);
    // A gentle surface keeps its own slope: the flat under the lip.
    const flat = water.sampleAt(0, solver.restLevel + 0.5, 2.7, createWaterSample());
    expect(Math.hypot(flat.slopeX, flat.slopeZ)).toBeLessThan(0.1);
  });

  it('weighs the lip’s flow by the slices’ weight, as their shape: halfway through the collapse, half of it (the advisor, 2026-09-30)', () => {
    const probe = sweptChannel();
    const { water, solver } = sweptChannel(probe.times.touchdownSeconds + probe.times.collapseSeconds / 2);
    // The held lip lowered halfway toward the still water: its underside and top at half their heights.
    const y = solver.restLevel + (UNDER + TOP) / 4;
    const sample = water.sampleAt(0, y, 2.7, createWaterSample());
    expect(sample.surfaceY).toBeCloseTo(solver.restLevel + TOP / 2, 2);
    expect(sample.waterFloorY).toBeCloseTo(solver.restLevel + UNDER / 2, 2);
    const plain = new PhysicalSurfWater(solver, { peakPeriod: 10 }).sampleAt(0, y, 2.7, createWaterSample());
    // 3/4 of the way to the tip, at half weight: 3/8 of the tip's flow across the crest.
    expect(sample.flowX).toBeCloseTo(plain.flowX, 6);
    expect(sample.flowZ).toBeCloseTo((1 - 0.375) * plain.flowZ + 0.375 * 0.9 * Math.sqrt(9.81 * 3), 1);
    expect(sample.tube).toBe('closed');
  });

  it('leaves every field out where the loft is not, and clears them from a reused sample', () => {
    const { water, solver } = sweptChannel();
    const sample = water.sampleAt(0, solver.restLevel + 1, 2.7, createWaterSample());
    water.sampleAt(0, 0, 9.5, sample);
    expect(sample.ceilingY).toBeUndefined();
    expect(sample.clearance).toBeUndefined();
    expect(sample.covered).toBeUndefined();
    expect(sample.tube).toBeUndefined();
    expect(sample.surfaceY).toBe(water.plainSurfaceAt(0, 9.5));
  });
});
