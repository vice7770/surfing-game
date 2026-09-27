import { describe, expect, it } from 'vitest';
import { sampleSurfaceFoam } from '../../scene/WaterSurface';
import { CrestTracker, FOAM_BREAKING, findCrest, type SurfaceField } from './crestTracker';

/** A swell running shoreward at c, its crest at z = c t (mod L), breaking where x < peel·t (a left peeling toward +x). */
function peelingSwell(time: () => number, c = 5, wavelength = 60, peel = 3): SurfaceField {
  const crestZ = () => ((c * time()) % wavelength) - wavelength / 2;
  return {
    height: (_x, z) => 1 + Math.cos((2 * Math.PI * (z - crestZ())) / wavelength),
    foam: (x, z) => (x < -20 + peel * time() && Math.abs(z - crestZ()) < 4 ? 0.9 : 0),
  };
}

describe('crest tracker', () => {
  it('finds the crest nearest a point along the waves’ travel', () => {
    const t = 0;
    const field = peelingSwell(() => t);
    const crest = findCrest(field, 0, -10);
    expect(crest?.z).toBeCloseTo(-30, 0);
    expect(crest?.y).toBeCloseTo(2, 3);
  });

  it('rides along with the crest shoreward and slides to the breaking edge', () => {
    let t = 0;
    const field = peelingSwell(() => t);
    const tracker = new CrestTracker();
    expect(tracker.start(field, 10, -28)).toBe(true);
    let moved = 0;
    for (let i = 0; i < 180; i += 1) {
      t += 1 / 60;
      moved += tracker.update(field, 1 / 60).dz;
    }
    expect(moved).toBeCloseTo(15, 0);
    const edge = -20 + 3 * t;
    expect(Math.abs(tracker.point!.x - edge)).toBeLessThan(2);
    expect(field.foam(tracker.point!.x - 1.5, tracker.point!.z)).toBeGreaterThanOrEqual(FOAM_BREAKING);
  });

  it('holds still when the crest is lost', () => {
    let flat = false;
    const field: SurfaceField = { height: (_x, z) => (flat ? 0 : Math.cos(z / 5)), foam: () => 0 };
    const tracker = new CrestTracker();
    tracker.start(field, 0, 0);
    flat = true;
    const delta = tracker.update(field, 1 / 60);
    expect(tracker.lost).toBe(true);
    expect([delta.dx, delta.dy, delta.dz]).toEqual([0, 0, 0]);
    expect(Number.isFinite(tracker.point!.x + tracker.point!.z)).toBe(true);
  });

  it('reads the foam channel of the surface pairs', () => {
    const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 2, nz: 2 };
    const data = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]);
    expect(sampleSurfaceFoam(data, grid, 0.5, 0.5)).toBeCloseTo(0.5, 6);
    expect(sampleSurfaceFoam(data, grid, -1, 0)).toBe(0);
  });
});
