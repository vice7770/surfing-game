import { describe, expect, it } from 'vitest';
import { PhysicalSurfaceSource, type RenderableSurfZone } from './PhysicalSurfaceSource';

/** A stand-in surf zone: one node breaks on the first frame only, and the sea clock runs 1 s per frame. */
function stubZone(): Omit<RenderableSurfZone, 'seaTime'> & { frames: number; seaTime: number } {
  return {
    frames: 0,
    windowXMin: -2,
    seaTime: 0,
    renderGrid: (spacing: number) => ({ xMin: -2, zMin: 0, spacing, nx: 3, nz: 3 }),
    writeUniformSurface(data: Float32Array) {
      data.fill(0);
      if (this.frames === 0) data[4 * 2 + 1] = 1;
      this.frames += 1;
      this.seaTime += 1;
    },
    writeUniformBed(data: Float32Array) {
      data.fill(-2);
    },
    writeUniformFlow(data: Float32Array) {
      for (let k = 0; k < data.length; k += 2) {
        data[k] = 0.25;
        data[k + 1] = -0.5;
      }
    },
  };
}

describe('PhysicalSurfaceSource', () => {
  // Foam memory now lives on the solver grid (FoamField), so the source passes the zone's foam straight through.
  it('passes the surf zone foam and flow through to the render grid', () => {
    const zone = stubZone();
    const source = new PhysicalSurfaceSource(zone, 1);
    const data = new Float32Array(3 * 3 * 2);
    source.write(data);
    expect(data[4 * 2 + 1]).toBe(1);
    source.write(data);
    expect(data[4 * 2 + 1]).toBe(0);
    const flow = new Float32Array(3 * 3 * 2);
    source.writeFlow(flow);
    expect(Array.from(flow)).toEqual(Array.from({ length: 18 }, (_, i) => (i % 2 ? -0.5 : 0.25)));
  });
});
