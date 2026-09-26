import { describe, expect, it } from 'vitest';
import { REEF, createSpot } from './Bathymetry';
import { breakerDepthFor } from './Breaking';
import { FOAM_DECAY, OFFSHORE_DEPTH, SurfZoneSimulation, TANK, tankDepth, windOnsetScale, type SurfZoneConfig } from './SurfZoneSimulation';
import { JET_SPEED_RATIO, crestSpeedAt } from './CrestKinematics';

const small: Omit<SurfZoneConfig, 'spot'> = {
  seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 10, spreading: 12, tide: 0,
  componentCount: 12, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('SurfZoneSimulation', () => {
  it('builds a finite, wave-filled surf zone for every spot and hands over before the set', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      const simulation = new SurfZoneSimulation({ ...small, spot });
      const { solver } = simulation;
      let finite = true;
      let largest = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        finite &&= Number.isFinite(solver.h[i]) && solver.h[i] >= 0 && Number.isFinite(solver.qz[i]);
        const z = solver.zCenters[Math.floor(i / solver.nx)];
        if (z > TANK.zoneInner && z < TANK.blendEnd && solver.h[i] > 0) largest = Math.max(largest, Math.abs(solver.surfaceAt(i)));
      }
      expect(finite).toBe(true);
      expect(largest).toBeGreaterThan(0.25 * small.significantHeight);
      expect(simulation.timeToSet).toBeCloseTo(25, 6);
    }
  });

  it('drops a failing device and steps that frame on the CPU', async () => {
    const reference = new SurfZoneSimulation({ ...small, spot: 'point' });
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point' });
    let disposed = false;
    simulation.device = { step: () => Promise.reject(new Error('device lost')), dispose: () => { disposed = true; } };
    const warn = console.warn;
    console.warn = () => {};
    try {
      await simulation.stepAsync(1 / 60);
    } finally {
      console.warn = warn;
    }
    reference.step(1 / 60);
    expect(disposed).toBe(true);
    expect(simulation.device).toBeUndefined();
    expect(Array.from(simulation.solver.h)).toEqual(Array.from(reference.solver.h));
    expect(simulation.solver.time).toBe(reference.solver.time);
  });

  it('replays a seed exactly and changes with another', () => {
    const run = (seed: number) => {
      const simulation = new SurfZoneSimulation({ ...small, spot: 'beach', seed });
      for (let frame = 0; frame < 30; frame += 1) simulation.step(1 / 30);
      return Array.from(simulation.solver.h);
    };
    expect(run(3)).toEqual(run(3));
    expect(run(4)).not.toEqual(run(3));
  });

  it('renders the surface it samples, with dry land tucked under the bed', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(data, grid);
    let wetChecked = 0;
    let dryChecked = 0;
    for (let iz = 0; iz < grid.nz; iz += 7) {
      for (let ix = 0; ix < grid.nx; ix += 3) {
        const x = grid.xMin + ix * grid.spacing;
        const z = grid.zMin + iz * grid.spacing;
        const height = data[(iz * grid.nx + ix) * 2];
        if (simulation.solver.sampleCentered(simulation.solver.h, x, z) > 0.01) {
          expect(height).toBeCloseTo(simulation.heightAt(x, z), 5);
          wetChecked += 1;
        } else {
          expect(height).toBeLessThan(simulation.bedAt(x, z));
          dryChecked += 1;
        }
      }
    }
    expect(wetChecked).toBeGreaterThan(100);
    expect(dryChecked).toBeGreaterThan(5);
  });

  it('finds the break line at the shoaled breaker depth', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const point = simulation.breakPoint();
    const depth = breakerDepthFor(1.4, simulation.sea.depth);
    expect(simulation.breakerDepth()).toBeCloseTo(depth, 12);
    expect(tankDepth(simulation.spot, OFFSHORE_DEPTH.beach, point.x, point.z)).toBeCloseTo(depth, 1);
  });

  it('breaks waves in the surf zone, measures the peel and paints whitewater', () => {
    // Bores need the game's 1 m surf-zone cells; 2 m cells smear them below either breaking criterion.
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let broke = false;
    let estimate = simulation.peelEstimate();
    for (let frame = 0; frame < 20 * 30 && !(estimate && simulation.breakingFraction() > 0.02); frame += 1) {
      simulation.step(1 / 30);
      broke ||= simulation.breakingFraction() > 0;
      estimate = simulation.peelEstimate() ?? estimate;
    }
    expect(broke).toBe(true);
    expect(estimate).toBeDefined();
    expect(estimate!.angleDegrees).toBeGreaterThanOrEqual(0);
    expect(estimate!.angleDegrees).toBeLessThanOrEqual(90);
    for (const value of simulation.breaking.strength) expect(value).toBeLessThanOrEqual(1);
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(data, grid);
    let whitewater = 0;
    for (let k = 0; k < grid.nx * grid.nz; k += 1) if (data[k * 2 + 1] > 0.3) whitewater += 1;
    expect(whitewater).toBeGreaterThan(0);
    const iribarren = simulation.iribarren();
    expect(iribarren.value).toBeGreaterThan(0);
    expect(['spilling', 'plunging', 'surging']).toContain(iribarren.type);
  });

  it('keeps measuring peel while earlier bores are still crossing the surf zone', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let late = 0;
    for (let frame = 0; frame < 24 * 30; frame += 1) {
      simulation.step(1 / 30);
      if (frame > 12 * 30 && simulation.peelEstimate()) late += 1;
    }
    expect(late).toBeGreaterThan(30);
  }, 60_000);

  it('throws a lip from plunging point waves, once per wave, but not from a spilling beach', () => {
    const run = (config: SurfZoneConfig) => {
      const simulation = new SurfZoneSimulation(config);
      let broke = 0;
      for (let frame = 0; frame < 20 * 30; frame += 1) {
        simulation.step(1 / 30);
        if (simulation.breakingFraction() > 0) broke += 1;
      }
      return { simulation, broke };
    };
    const point = run({ ...small, spot: 'point', dx: 1, fineSpacing: 1, peakPeriod: 14, directionDegrees: 20, spreading: 24 });
    expect(point.simulation.iribarren().type).toBe('plunging');
    expect(point.simulation.lipLaunches).toBeGreaterThan(0);
    expect(point.simulation.lipLaunches).toBeLessThanOrEqual(point.simulation.solver.nx * Math.ceil(20 / (0.7 * 14)));
    expect(point.simulation.lip.landings).toBeGreaterThan(0);
    const beach = run({ ...small, spot: 'beach', dx: 1, fineSpacing: 1, peakPeriod: 6 });
    expect(beach.simulation.iribarren().type).toBe('spilling');
    expect(beach.broke).toBeGreaterThan(0);
    expect(beach.simulation.lipLaunches).toBe(0);
    expect(beach.simulation.lipJets).toBe(0);
    expect(beach.simulation.lipRollers).toBeGreaterThan(0);
  }, 60_000);

  it("throws each jet at the speed of the crest it leaves, measured from the crest's own motion (P7)", () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, peakPeriod: 14, directionDegrees: 20, spreading: 24 });
    const launches: { speed: number; crest: number }[] = [];
    const launch = simulation.lip.launch.bind(simulation.lip);
    simulation.lip.launch = (cell, velocity, height, volume, crestSpeed) => {
      launches.push({ speed: Math.hypot(velocity.x, velocity.z), crest: JET_SPEED_RATIO * crestSpeedAt(simulation.solver, cell)! });
      return launch(cell, velocity, height, volume, crestSpeed);
    };
    for (let frame = 0; frame < 20 * 30; frame += 1) simulation.step(1 / 30);
    expect(simulation.lipJets).toBeGreaterThan(0);
    expect(launches.length).toBeGreaterThan(0);
    for (const { speed, crest } of launches) expect(speed).toBeCloseTo(crest, 9);
  }, 60_000);

  // Stage 1 needs 1 m cells to see a wave break (P3a), so the whole reef edge must lie in the fine surf zone.
  it('keeps the whole reef edge in the fine surf zone across the 160 m window, with a flat shelf behind it', () => {
    const reef = createSpot('reef', 1);
    for (let x = -80; x <= 80; x += 4) {
      for (let z = TANK.zoneInner; z <= TANK.fineFrom; z += 1) {
        expect(tankDepth(reef, OFFSHORE_DEPTH.reef, x, z)).toBeCloseTo(REEF.channelDepth, 3);
      }
      let shelf = 0;
      for (let z = TANK.fineFrom; z < 0; z += 1) if (Math.abs(reef.depthAt(x, z) - REEF.shelfDepth) < 0.05) shelf += 1;
      expect(shelf).toBeGreaterThanOrEqual(15);
    }
  });

  it('finds the reef break on its steep edge inside the fine surf zone', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 2 });
    const point = simulation.breakPoint();
    const bed = (z: number) => tankDepth(simulation.spot, OFFSHORE_DEPTH.reef, point.x, z);
    expect(point.z).toBeGreaterThan(TANK.fineFrom);
    expect(bed(point.z)).toBeGreaterThan(REEF.shelfDepth + 0.25);
    expect(bed(point.z)).toBeLessThan(REEF.channelDepth - 0.25);
    expect((bed(point.z - 2) - bed(point.z + 2)) / 4).toBeGreaterThan(0.05);
    expect(simulation.iribarren().type).toBe('plunging');
  });

  it('throws lips from plunging waves on the reef edge', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    for (let frame = 0; frame < 20 * 30; frame += 1) simulation.step(1 / 30);
    expect(simulation.iribarren().type).toBe('plunging');
    expect(simulation.lipLaunches).toBeGreaterThan(0);
    expect(simulation.lip.landings).toBeGreaterThan(0);
  }, 60_000);

  it('does not read the spin-up bores as one simultaneous close-out', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1 });
    for (let frame = 0; frame < 3; frame += 1) simulation.step(1 / 30);
    expect(simulation.peelEstimate()).toBeUndefined();
  });

  it('holds waves up longer under offshore wind', () => {
    const onshore = new SurfZoneSimulation({ ...small, spot: 'beach', windSpeed: 10 });
    const offshore = new SurfZoneSimulation({ ...small, spot: 'beach', windSpeed: -10 });
    expect(offshore.breaking.onsetScale).toBeGreaterThan(1);
    expect(onshore.breaking.onsetScale).toBeLessThan(1);
    expect(onshore.breaking.onsetScale).toBeCloseTo(windOnsetScale(10, onshore.breakerDepth()), 12);
  });

  // Douglass 1990 and King & Baker 1996 via Zdyrski & Feddersen 2022: onshore wind lowers the
  // breaker index by up to ~40 % at U/√(g h_b) ≈ 4; offshore wind raises it by up to ~10 %.
  it('scales the wind effect on breaking by the breaker celerity, stronger onshore than offshore', () => {
    const celerity = Math.sqrt(9.81 * 2);
    expect(windOnsetScale(0, 2)).toBe(1);
    expect(windOnsetScale(10, 2)).toBeCloseTo(1 - (0.1 * 10) / celerity, 12);
    expect(windOnsetScale(-4, 2)).toBeCloseTo(1 + (0.05 * 4) / celerity, 12);
    expect(windOnsetScale(-10, 2)).toBe(1.1);
    expect(windOnsetScale(30, 1)).toBe(0.6);
    expect(windOnsetScale(6, 1)).toBeLessThan(windOnsetScale(6, 3));
  });

  it('leaves foam behind the breaking bores, fading into lace, and none offshore of the break', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    const { solver, foam } = simulation;
    let outermost = Infinity;
    for (let frame = 0; frame < 20 * 30; frame += 1) {
      simulation.step(1 / 30);
      for (let i = 0; i < solver.h.length; i += 1) {
        if (simulation.breaking.strength[i] > 0.3) outermost = Math.min(outermost, solver.zCenters[Math.floor(i / solver.nx)]);
      }
    }
    let foamy = 0;
    let lace = 0;
    for (let i = 0; i < solver.h.length; i += 1) {
      const z = solver.zCenters[Math.floor(i / solver.nx)];
      expect(foam.totalAt(i)).toBeLessThanOrEqual(1 + 1e-12);
      if (z < outermost - 10) expect(foam.totalAt(i)).toBeLessThan(1e-3);
      if (foam.totalAt(i) > 0.05) foamy += 1;
      if (foam.residual[i] > 0.02) lace += 1;
    }
    expect(outermost).toBeLessThan(0);
    expect(foamy).toBeGreaterThan(50);
    expect(lace).toBeGreaterThan(50);
  }, 60_000);

  it('keeps lace longest in the beach’s sandy surf and lets a spot override its decay', () => {
    expect(FOAM_DECAY.beach.residual).toBeGreaterThan(FOAM_DECAY.reef.residual);
    for (const decay of Object.values(FOAM_DECAY)) expect(decay.dense).toBe(3);
    expect(new SurfZoneSimulation({ ...small, spot: 'reef' }).foam.decay).toEqual(FOAM_DECAY.reef);
    expect(new SurfZoneSimulation({ ...small, spot: 'reef', foamDecay: { dense: 1, residual: 2 } }).foam.decay).toEqual({ dense: 1, residual: 2 });
  });

  it('splashes landing lip water into foam', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const { solver, foam, lip } = simulation;
    foam.dense.fill(0);
    foam.residual.fill(0);
    const crest = solver.cellIndex(0, -60);
    expect(lip.launch(crest, { x: 0, z: 4 }, solver.surfaceAt(crest) + 1, 0.2)).toBeGreaterThan(0);
    for (let step = 0; step < 60 && lip.landings === 0; step += 1) lip.step(1 / 60);
    expect(lip.landings).toBeGreaterThan(0);
    expect(foam.dense.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0.5);
  });

  it('renders the foam field and the current it rides on', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const { solver, foam } = simulation;
    for (let frame = 0; frame < 30; frame += 1) simulation.step(1 / 30);
    for (let i = 0; i < solver.h.length; i += 1) {
      foam.dense[i] = solver.h[i] > 0.01 ? 0.5 * (1 + Math.sin(i * 0.37)) * 0.6 : 0;
      foam.residual[i] = solver.h[i] > 0.01 ? 0.1 : 0;
    }
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const flow = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(surface, grid);
    simulation.writeUniformFlow(flow, grid);
    const total = Float64Array.from(foam.dense, (value, i) => value + foam.residual[i]);
    const u = Float64Array.from(solver.qx, (q, i) => (solver.h[i] > 0.01 ? q / solver.h[i] : 0));
    const w = Float64Array.from(solver.qz, (q, i) => (solver.h[i] > 0.01 ? q / solver.h[i] : 0));
    let wet = 0;
    for (let r = 0; r < grid.nz; r += 5) {
      for (let c = 0; c < grid.nx; c += 3) {
        const k = r * grid.nx + c;
        const x = grid.xMin + c * grid.spacing;
        const z = grid.zMin + r * grid.spacing;
        if (solver.sampleCentered(solver.h, x, z) <= 0.01) {
          expect(surface[k * 2 + 1]).toBe(0);
          expect(flow[k * 2]).toBe(0);
          continue;
        }
        wet += 1;
        expect(surface[k * 2 + 1]).toBeCloseTo(solver.sampleCentered(total, x, z), 5);
        expect(flow[k * 2]).toBeCloseTo(solver.sampleCentered(u, x, z), 5);
        expect(flow[k * 2 + 1]).toBeCloseTo(solver.sampleCentered(w, x, z), 5);
      }
    }
    expect(wet).toBeGreaterThan(200);
  });
});
