import { describe, expect, it } from 'vitest';
import { measureFace, waterUnderView } from './viewProbe';

const flat = () => 0;
const swell = (_x: number, z: number) => 0.8 * Math.cos((2 * Math.PI * z) / 50);

describe('view probe', () => {
  it('meets the water where the view ray crosses it', () => {
    const hit = waterUnderView({ x: 0, y: 10, z: 0 }, { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 }, flat);
    expect(hit.z).toBeCloseTo(-10, 1);
  });

  it('probe from below and toward the sky still lands on the water ahead', () => {
    const up = waterUnderView({ x: 0, y: 5, z: 0 }, { x: 0, y: 1, z: 0 }, flat);
    expect(Number.isFinite(up.x + up.z)).toBe(true);
    const sky = waterUnderView({ x: 0, y: 5, z: 0 }, { x: 0, y: 0.6, z: -0.8 }, flat);
    expect(sky.z).toBeLessThan(-10);
    const below = waterUnderView({ x: 0, y: -2, z: 0 }, { x: 0, y: Math.SQRT1_2, z: -Math.SQRT1_2 }, flat);
    expect(below.z).toBeCloseTo(-2, 1);
  });

  it('measures a face from crest to trough', () => {
    expect(measureFace(swell, 0, 3)).toBeCloseTo(1.6, 1);
    expect(measureFace(flat, 0, 0)).toBeUndefined();
  });
});
