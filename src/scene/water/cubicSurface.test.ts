import { describe, expect, it } from 'vitest';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { createWaterSample } from '../../physics/SurfWater';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../wave/SurfZoneSimulation';
import { sampleCubicSurface, waterCubicPars } from './cubicSurface';
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

  it('clamps nodes at the grid’s edges as the physics does', () => {
    const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 4, nz: 4 };
    const data = new Float32Array(32);
    for (let i = 0; i < 16; i += 1) data[i * 2] = i % 4; // height = column index
    // Nodes −1, 0, 1, 2 clamp to heights 0, 0, 1, 2: Catmull-Rom at t = ½ gives 9/16 − 2/16.
    expect(sampleCubicSurface(data, grid, 0.5, 1).height).toBeCloseTo(0.4375, 6);
    expect(sampleCubicSurface(data, grid, 1.5, 1).height).toBeCloseTo(1.5, 6);
    expect(sampleCubicSurface(data, grid, 1.5, 1).slopeX).toBeCloseTo(1, 6);
    expect(sampleCubicSurface(data, grid, -3, 1).height).toBeCloseTo(0, 6);
  });

  it('flips the per-pixel normal for the underside and writes it in view space', () => {
    const glsl = richNormalFragment({ ripples: false });
    expect(glsl).toContain('faceDirection');
    expect(glsl).toContain('viewMatrix');
    expect(glsl).toContain('waterSurfaceSlope =');
    expect(waterCubicPars).toContain('texelFetch');
  });
});
