import { describe, expect, it } from 'vitest';
import { GRAVITY } from './dispersion';
import { ShallowWaterSolver, stretchedEdges, uniformEdges } from './ShallowWaterSolver';
import { calmTarget, longWaveTarget, meanLag, upCrossings } from './shallowWaterTestSupport';

describe('shallow-water validation', () => {
  it('carries a small long wave at √(gh) and absorbs it with little reflection', () => {
    const depth = 4;
    const amplitude = 0.02;
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, 600, 600), xBoundary: 'periodic' }, () => depth, { manning: 0 },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(100, 0), target: longWaveTarget(amplitude, 20, depth) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(450, 600), target: calmTarget });
    const gaugeA = solver.cellIndex(0.5, 200.5);
    const gaugeB = solver.cellIndex(0.5, 300.5);
    const times: number[] = [];
    const seriesA: number[] = [];
    const seriesB: number[] = [];
    const envelope = new Float64Array(solver.nz);
    while (solver.time < 150) {
      solver.step(0.1);
      if (solver.time < 100) continue;
      times.push(solver.time);
      seriesA.push(solver.surfaceAt(gaugeA));
      seriesB.push(solver.surfaceAt(gaugeB));
      for (let iz = 0; iz < solver.nz; iz += 1) envelope[iz] = Math.max(envelope[iz], Math.abs(solver.surfaceAt(iz * solver.nx)));
    }
    const speed = 100 / meanLag(upCrossings(times, seriesA), upCrossings(times, seriesB));
    expect(Math.abs(speed / Math.sqrt(GRAVITY * depth) - 1)).toBeLessThan(0.02);
    let largest = 0;
    let smallest = Infinity;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      if (solver.zCenters[iz] < 150 || solver.zCenters[iz] > 420) continue;
      largest = Math.max(largest, envelope[iz]);
      smallest = Math.min(smallest, envelope[iz]);
    }
    expect((largest - smallest) / (largest + smallest)).toBeLessThan(0.1);
    expect(Math.abs(0.5 * (largest + smallest) / amplitude - 1)).toBeLessThan(0.1);
  });

  it("shoals a long wave by Green's law on a gentle slope", () => {
    const depthAt = (_x: number, z: number) => (z < 200 ? 6 : z > 1100 ? 1.5 : 6 - (4.5 * (z - 200)) / 900);
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 2, zEdges: uniformEdges(0, 1400, 700), xBoundary: 'periodic' }, depthAt, { manning: 0 },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(150, 0), target: longWaveTarget(0.015, 30, 6) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(1200, 1400), target: calmTarget });
    const deepGauge = solver.cellIndex(1, 251);
    const shallowGauge = solver.cellIndex(1, 1051);
    let deepEnvelope = 0;
    let shallowEnvelope = 0;
    while (solver.time < 330) {
      solver.step(0.1);
      if (solver.time < 270) continue;
      deepEnvelope = Math.max(deepEnvelope, Math.abs(solver.surfaceAt(deepGauge)));
      shallowEnvelope = Math.max(shallowEnvelope, Math.abs(solver.surfaceAt(shallowGauge)));
    }
    const expected = Math.pow(depthAt(0, 251) / depthAt(0, 1051), 0.25);
    expect(Math.abs(shallowEnvelope / deepEnvelope / expected - 1)).toBeLessThan(0.1);
  }, 60_000);

  it("refracts an oblique long wave by Snell's law over a sloping bed", () => {
    const nx = 89;
    const dx = 4;
    const period = 20;
    const omega = (2 * Math.PI) / period;
    const deep = 8;
    const shallow = 2;
    const depthAt = (_x: number, z: number) => (z < 150 ? deep : z > 350 ? shallow : deep + ((shallow - deep) * (z - 150)) / 200);
    const kx = (2 * Math.PI) / (nx * dx);
    const incident = Math.asin(kx / (omega / Math.sqrt(GRAVITY * deep)));
    const solver = new ShallowWaterSolver(
      { nx, xMin: 0, dx, zEdges: uniformEdges(0, 500, 125), xBoundary: 'periodic' }, depthAt, { manning: 0 },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(100, 0), target: longWaveTarget(0.02, period, deep, incident) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(430, 500), target: calmTarget });
    const gaugeA = solver.cellIndex(solver.xCenters[0], 370);
    const gaugeB = solver.cellIndex(solver.xCenters[0], 410);
    const times: number[] = [];
    const seriesA: number[] = [];
    const seriesB: number[] = [];
    while (solver.time < 160) {
      solver.step(0.1);
      if (solver.time < 110) continue;
      times.push(solver.time);
      seriesA.push(solver.surfaceAt(gaugeA));
      seriesB.push(solver.surfaceAt(gaugeB));
    }
    const kz = (omega * meanLag(upCrossings(times, seriesA), upCrossings(times, seriesB))) / 40;
    const measured = (Math.atan2(kx, kz) * 180) / Math.PI;
    const expected = (Math.asin(kx / (omega / Math.sqrt(GRAVITY * shallow))) * 180) / Math.PI;
    expect(Math.abs(measured - expected)).toBeLessThan(2);
  }, 60_000);

  it('runs a wave up a dry beach without negative depth or non-finite state', () => {
    const depthAt = (_x: number, z: number) => (z < 0 ? 4 : 4 - 0.05 * z);
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(-60, 120, 180), xBoundary: 'periodic' }, depthAt,
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(-20, -60), target: longWaveTarget(0.3, 10, 4) });
    let shallowest = Infinity;
    let highestWetZ = -Infinity;
    let finite = true;
    while (solver.time < 60) {
      solver.step(1 / 30);
      for (let i = 0; i < solver.h.length; i += 1) {
        finite &&= Number.isFinite(solver.h[i]) && Number.isFinite(solver.qz[i]);
        shallowest = Math.min(shallowest, solver.h[i]);
        if (solver.h[i] > 0.01) highestWetZ = Math.max(highestWetZ, solver.zCenters[Math.floor(i / solver.nx)]);
      }
    }
    expect(finite).toBe(true);
    expect(shallowest).toBeGreaterThanOrEqual(0);
    expect(highestWetZ).toBeGreaterThan(80);
  });

  it('passes a long wave from coarse to fine cells without reflection or speed error', () => {
    const depth = 4;
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: stretchedEdges(0, 600, 300, 1, 4), xBoundary: 'periodic' }, () => depth, { manning: 0 },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(100, 0), target: longWaveTarget(0.02, 20, depth) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(450, 600), target: calmTarget });
    const gaugeA = solver.cellIndex(0.5, 320.5);
    const gaugeB = solver.cellIndex(0.5, 420.5);
    const times: number[] = [];
    const seriesA: number[] = [];
    const seriesB: number[] = [];
    const envelope = new Float64Array(solver.nz);
    while (solver.time < 150) {
      solver.step(0.1);
      if (solver.time < 100) continue;
      times.push(solver.time);
      seriesA.push(solver.surfaceAt(gaugeA));
      seriesB.push(solver.surfaceAt(gaugeB));
      for (let iz = 0; iz < solver.nz; iz += 1) envelope[iz] = Math.max(envelope[iz], Math.abs(solver.surfaceAt(iz * solver.nx)));
    }
    const speed = 100 / meanLag(upCrossings(times, seriesA), upCrossings(times, seriesB));
    expect(Math.abs(speed / Math.sqrt(GRAVITY * depth) - 1)).toBeLessThan(0.02);
    let largest = 0;
    let smallest = Infinity;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      if (solver.zCenters[iz] < 120 || solver.zCenters[iz] > 280) continue;
      largest = Math.max(largest, envelope[iz]);
      smallest = Math.min(smallest, envelope[iz]);
    }
    expect((largest - smallest) / (largest + smallest)).toBeLessThan(0.05);
  });
});
