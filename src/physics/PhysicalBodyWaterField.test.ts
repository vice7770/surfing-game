import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DetachedSurfer, type BodyWaterSample } from './DetachedSurfer';
import { horizontalProfileGain, PhysicalBodyWaterField } from './PhysicalBodyWaterField';
import { SurfZoneSimulation, TANK } from '../wave/SurfZoneSimulation';

function fixture() {
  const simulation = new SurfZoneSimulation({
    spot: 'beach', seed: 3, significantHeight: 1.4, peakPeriod: 9,
    directionDegrees: 10, spreading: 12, tide: 0, componentCount: 4,
    alongShore: 20, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 0,
  });
  const sample: BodyWaterSample = {
    surfaceY: 0, bedY: 0, flow: new Vector3(), wet: false,
    outsideDomain: false, breaking: 0,
  };
  return { simulation, field: new PhysicalBodyWaterField(simulation), sample };
}

describe('PhysicalBodyWaterField', () => {
  it('uses the solver surface and depth-averaged momentum at real world positions', () => {
    const { simulation, field, sample } = fixture();
    const { solver } = simulation;
    solver.h.fill(3);
    solver.qx.fill(3);
    solver.qz.fill(6);
    simulation.breaking.strength.fill(0.4);
    const x = solver.xCenters[4];
    const z = solver.zCenters[20];
    const bed = simulation.bedAt(x, z);
    field.sampleAt(new Vector3(x, bed + 1.5, z), sample);
    expect(sample.surfaceY).toBeCloseTo(simulation.heightAt(x, z), 10);
    expect(sample.bedY).toBeCloseTo(bed, 10);
    expect(sample.wet).toBe(true);
    expect(sample.breaking).toBeCloseTo(0.4);
    expect(sample.flowModel).toBe('reconstructed');
    expect(sample.flow.x).toBeGreaterThan(0);
    expect(sample.flow.z / sample.flow.x).toBeCloseTo(2);
    expect(Number.isFinite(sample.flow.y)).toBe(true);
    expect(Math.abs(sample.flow.y)).toBeLessThanOrEqual(3);
  });

  it('has lower horizontal flow near the bed than near the surface, and flattens the profile in a bore', () => {
    const { simulation, field, sample } = fixture();
    const { solver } = simulation;
    solver.h.fill(3);
    solver.qx.fill(0);
    solver.qz.fill(6);
    const x = solver.xCenters[4];
    const z = solver.zCenters[20];
    const bed = simulation.bedAt(x, z);
    field.sampleAt(new Vector3(x, bed, z), sample);
    const bottom = sample.flow.z;
    field.sampleAt(new Vector3(x, bed + 3, z), sample);
    const top = sample.flow.z;
    expect(top).toBeGreaterThan(2);
    expect(bottom).toBeLessThan(2);
    simulation.breaking.strength.fill(1);
    field.sampleAt(new Vector3(x, bed, z), sample);
    expect(sample.flow.z).toBeCloseTo(2);
    expect(horizontalProfileGain(0.5, 3, 3, 1)).toBe(1);
  });

  it('rejects the moving window exterior instead of using clamped edge cells', () => {
    const { simulation, field, sample } = fixture();
    const xMin = simulation.windowXMin;
    const xMax = xMin + simulation.solver.nx * simulation.solver.dx;
    for (const point of [
      new Vector3(xMin - 0.001, 0, -200), new Vector3(xMax + 0.001, 0, -200),
      new Vector3(0, 0, TANK.offshore - 0.001), new Vector3(0, 0, TANK.shore + 0.001),
    ]) {
      field.sampleAt(point, sample);
      expect(sample.outsideDomain).toBe(true);
      expect(sample.wet).toBe(false);
      expect(sample.flow.length()).toBe(0);
      expect(sample.flowModel).toBe('outside');
    }
  });

  it('returns no water force from dry cells even if stale momentum remains', () => {
    const { simulation, field, sample } = fixture();
    const { solver } = simulation;
    solver.h.fill(0);
    solver.qz.fill(40);
    field.sampleAt(new Vector3(solver.xCenters[4], 0, solver.zCenters[20]), sample);
    expect(sample.wet).toBe(false);
    expect(sample.flow.length()).toBe(0);
    expect(sample.flowModel).toBe('dry');
    expect(sample.surfaceY).toBeCloseTo(sample.bedY);
  });

  it('bounds momentum-driven flow close to a wet edge', () => {
    const { simulation, field, sample } = fixture();
    const { solver } = simulation;
    solver.h.fill(0.011);
    solver.qz.fill(10);
    field.sampleAt(new Vector3(solver.xCenters[4], 0, solver.zCenters[20]), sample);
    expect(Math.hypot(sample.flow.x, sample.flow.z)).toBeCloseTo(12);
    expect(Number.isFinite(sample.flow.z)).toBe(true);
  });

  it('reconstructs upward motion over a rising bed and caps vertical flow', () => {
    const { simulation, field, sample } = fixture();
    const { solver } = simulation;
    solver.h.fill(3);
    solver.qz.fill(6);
    // Use a local ramp in the sampled bed while the mean horizontal flow is uniform.
    for (let row = 0; row < solver.nz; row += 1) {
      for (let column = 0; column < solver.nx; column += 1) {
        solver.bed[row * solver.nx + column] = 0.2 * solver.zCenters[row];
      }
    }
    const x = solver.xCenters[4];
    const z = solver.zCenters[20];
    const bed = simulation.bedAt(x, z);
    field.sampleAt(new Vector3(x, bed + 1.5, z), sample);
    expect(sample.flow.y).toBeGreaterThan(0);
    expect(sample.flow.y).toBeLessThan(3);
    solver.qz.fill(600);
    field.sampleAt(new Vector3(x, bed + 1.5, z), sample);
    expect(sample.flow.y).toBeLessThanOrEqual(3);
    expect(Number.isFinite(sample.flow.y)).toBe(true);
  });

  it('transports a detached body with the physical solver flow', () => {
    const still = fixture();
    const moving = fixture();
    for (const run of [still, moving]) run.simulation.solver.h.fill(4);
    moving.simulation.solver.qz.fill(8);
    const x = moving.simulation.solver.xCenters[4];
    const z = moving.simulation.solver.zCenters[20];
    const center = new Vector3(x, moving.simulation.bedAt(x, z) + 2, z);
    const bodies = [new DetachedSurfer(), new DetachedSurfer()];
    for (const body of bodies) body.start({
      center, orientation: new Quaternion(), velocity: new Vector3(), angularVelocity: new Vector3(),
    });
    for (let step = 0; step < 60; step += 1) {
      bodies[0].step(1 / 60, still.field);
      bodies[1].step(1 / 60, moving.field);
    }
    expect(bodies[1].centerOfMass().z).toBeGreaterThan(bodies[0].centerOfMass().z + 0.5);
    expect(bodies[0].outsideDomain).toBe(false);
    expect(bodies[1].outsideDomain).toBe(false);
  });
});
