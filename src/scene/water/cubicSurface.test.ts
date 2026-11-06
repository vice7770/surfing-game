import { describe, expect, it } from 'vitest';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { createWaterSample } from '../../physics/SurfWater';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../wave/SurfZoneSimulation';
import { sampleCubicHeight, sampleCubicSurface, waterCubicPars } from './cubicSurface';
import { richNormalFragment } from './richWaterGlsl';

const config: SurfZoneConfig = {
  spot: 'point', seed: 3, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 8, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('the drawn Catmull-Rom surface', () => {
  it('equals the board physics’ surface and slope between render nodes', () => {
    const simulation = new SurfZoneSimulation(config);
    for (let step = 0; step < 120; step += 1) simulation.step(1 / 60);
    const water = PhysicalSurfWater.forSimulation(simulation);
    const grid = simulation.renderGrid(1);
    const render = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(render, grid);
    const out = createWaterSample();
    let checked = 0;
    for (let r = 2; r < grid.nz - 3; r += 7) {
      for (let c = 2; c < grid.nx - 3; c += 5) {
        const x = grid.xMin + (c + 0.37) * grid.spacing;
        const z = grid.zMin + (r + 0.61) * grid.spacing;
        water.sampleAt(x, 0, z, out);
        const drawn = sampleCubicSurface(render, grid, x, z);
        expect(drawn.height).toBeCloseTo(out.surfaceY, 5);
        const n = Math.hypot(drawn.slopeX, 1, drawn.slopeZ);
        expect(-drawn.slopeX / n).toBeCloseTo(out.normalX, 4);
        expect(-drawn.slopeZ / n).toBeCloseTo(out.normalZ, 4);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(150);
  });

  it('mirrors nodes past the side edges, as the water is drawn there, and clamps them across shore', () => {
    const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 4, nz: 4 };
    const data = new Float32Array(32);
    for (let i = 0; i < 16; i += 1) data[i * 2] = i % 4; // height = column index
    // Nodes −1, 0, 1, 2 mirror to heights 1, 0, 1, 2: Catmull-Rom at t = ½ gives (9 − 1 − 2)/16.
    expect(sampleCubicSurface(data, grid, 0.5, 1).height).toBeCloseTo(0.375, 6);
    expect(sampleCubicSurface(data, grid, 1.5, 1).height).toBeCloseTo(1.5, 6);
    expect(sampleCubicSurface(data, grid, 1.5, 1).slopeX).toBeCloseTo(1, 6);
    // The surface past the −x edge is its mirror image, level across the edge itself.
    expect(sampleCubicSurface(data, grid, -0.5, 1).height).toBeCloseTo(0.375, 6);
    expect(sampleCubicSurface(data, grid, 0, 1).slopeX).toBeCloseTo(0, 6);
    expect(sampleCubicSurface(data, grid, -3, 1).height).toBeCloseTo(3, 6);
    expect(sampleCubicSurface(data, grid, 4.5, 1).height).toBeCloseTo(sampleCubicSurface(data, grid, 1.5, 1).height, 6);
    // Across shore the nodes clamp: rows past the edge repeat the edge row's heights.
    expect(sampleCubicSurface(data, grid, 1.5, -2).height).toBeCloseTo(1.5, 6);
  });

  it('reads the same height bit for bit without the slopes (`sampleCubicHeight`, pool-barrel-perf)', () => {
    // Scrambled heights over an odd grid, at points inside, between nodes, on them, past every edge and far past them.
    const grid = { xMin: -13.25, zMin: 40.5, spacing: 1, nx: 37, nz: 23 };
    const data = new Float32Array(2 * grid.nx * grid.nz);
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < data.length; i += 1) data[i] = i % 2 === 0 ? (next() - 0.4) * 3 : next();
    let checked = 0;
    for (const spacing of [1, 2, 0.5]) {
      const g = { ...grid, spacing };
      for (let k = 0; k < 4000; k += 1) {
        const x = g.xMin + (next() * 1.6 - 0.3) * g.nx * spacing;
        const z = g.zMin + (next() * 1.6 - 0.3) * g.nz * spacing;
        expect(Object.is(sampleCubicHeight(data, g, x, z), sampleCubicSurface(data, g, x, z).height)).toBe(true);
        checked += 1;
      }
      for (let r = -2; r < g.nz + 2; r += 1) for (let c = -2; c < g.nx + 2; c += 1) {
        const x = g.xMin + c * spacing;
        const z = g.zMin + r * spacing;
        expect(Object.is(sampleCubicHeight(data, g, x, z), sampleCubicSurface(data, g, x, z).height)).toBe(true);
      }
    }
    expect(checked).toBe(12000);
  });

  it('flips the per-pixel normal for the underside and writes it in view space', () => {
    const glsl = richNormalFragment({ ripples: false });
    expect(glsl).toContain('faceDirection');
    expect(glsl).toContain('viewMatrix');
    expect(glsl).toContain('waterSurfaceSlope =');
    expect(waterCubicPars).toContain('texelFetch');
  });
});
