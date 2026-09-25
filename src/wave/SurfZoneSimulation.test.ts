import { describe, expect, it } from 'vitest';
import { breakerDepthFor } from './Breaking';
import { OFFSHORE_DEPTH, SurfZoneSimulation, TANK, tankDepth, windOnsetScale, type SurfZoneConfig } from './SurfZoneSimulation';

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

  // The reef's shelf edge lies in the tank's boundary blend (plan P3b record), so the point is the plunging case.
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
  }, 60_000);

  it('finds the reef break on its steep edge rather than the flat shelf', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 2 });
    expect(simulation.breakPoint().z).toBeLessThan(TANK.blendEnd);
    expect(simulation.iribarren().type).not.toBe('none');
  });

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
});
