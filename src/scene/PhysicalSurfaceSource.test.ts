import { describe, expect, it } from 'vitest';
import { PhysicalSurfaceSource, type RenderableSurfZone } from './PhysicalSurfaceSource';

/** A stand-in surf zone: one node breaks on the first frame only, and the sea clock runs 1 s per frame. */
function stubZone(): Omit<RenderableSurfZone, 'seaTime'> & { frames: number; seaTime: number } {
  return {
    frames: 0,
    windowXMin: -2,
    seaTime: 0,
    config: { significantHeight: 1 },
    renderGrid: (spacing: number) => ({ xMin: -2, zMin: 0, spacing, nx: 3, nz: 3 }),
    writeUniformSurface(data: Float32Array) {
      data.fill(0);
      if (this.frames === 0) data[4 * 2 + 1] = 1;
      this.frames += 1;
      this.seaTime += 1;
    },
  };
}

describe('PhysicalSurfaceSource', () => {
  it('keeps whitewater after the break passes and lets it fade', () => {
    const zone = stubZone();
    const source = new PhysicalSurfaceSource(zone, 1);
    const data = new Float32Array(3 * 3 * 2);
    source.write(data);
    expect(data[4 * 2 + 1]).toBe(1);
    source.write(data);
    const afterOne = data[4 * 2 + 1];
    source.write(data);
    const afterTwo = data[4 * 2 + 1];
    expect(afterOne).toBeGreaterThan(0.4);
    expect(afterOne).toBeLessThan(0.85);
    expect(afterTwo).toBeLessThan(afterOne);
    expect(afterTwo / afterOne).toBeCloseTo(Math.exp(-1 / 3), 5);
    expect(data[0 * 2 + 1]).toBe(0);
  });
});
