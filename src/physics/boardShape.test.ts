import { describe, expect, it } from 'vitest';
import { REFERENCE_BOARD } from './boardReference';
import { buildBoardShape, monotoneCurve } from './boardShape';

describe('monotone curve', () => {
  it('passes through its points without overshooting them', () => {
    const curve = monotoneCurve([[0, 0.26], [0.5, 0.464], [1, 0]]);
    expect(curve(0)).toBe(0.26);
    expect(curve(0.5)).toBeCloseTo(0.464, 12);
    expect(curve(1)).toBe(0);
    for (let s = 0; s <= 1; s += 0.01) expect(curve(s)).toBeLessThanOrEqual(0.464 + 1e-12);
  });
});

describe('reference shortboard hull', () => {
  const shape = buildBoardShape();

  it('holds exactly the reference volume within the reference dimensions', () => {
    expect(shape.volume).toBeCloseTo(REFERENCE_BOARD.volume, 6);
    expect(shape.length).toBe(REFERENCE_BOARD.length);
    expect(shape.maxWidth).toBeCloseTo(REFERENCE_BOARD.width, 3);
    expect(Math.max(...shape.patches.map((patch) => patch.thickness))).toBeLessThanOrEqual(REFERENCE_BOARD.thickness + 1e-12);
    expect(shape.planformArea).toBeGreaterThan(0.55);
    expect(shape.planformArea).toBeLessThan(0.65);
  });

  it('carries the board’s mass near mid-length on the centreline, with a long body’s inertia', () => {
    expect(shape.mass).toBe(REFERENCE_BOARD.mass);
    expect(Math.abs(shape.centerOfMass.x)).toBeLessThan(1e-12);
    expect(Math.abs(shape.centerOfMass.z)).toBeLessThan(0.15);
    const [roll, pitch, yaw] = [shape.inertia[8], shape.inertia[0], shape.inertia[4]];
    expect(shape.inertia[1]).toBeCloseTo(shape.inertia[3], 12);
    expect(pitch).toBeGreaterThan(5 * roll);
    expect(yaw).toBeGreaterThan(5 * roll);
    expect(Math.abs(pitch - yaw) / yaw).toBeLessThan(0.1);
    expect(roll).toBeGreaterThan(0);
  });

  it('points every bottom patch down, tilted forward where the nose rocker rises', () => {
    for (const patch of shape.patches) {
      expect(patch.normal.y).toBeLessThan(-0.9);
      expect(Math.hypot(patch.normal.x, patch.normal.y, patch.normal.z)).toBeCloseTo(1, 12);
    }
    const nose = shape.patches.reduce((best, patch) => (patch.position.z > best.position.z ? patch : best));
    const tail = shape.patches.reduce((best, patch) => (patch.position.z < best.position.z ? patch : best));
    expect(nose.normal.z).toBeGreaterThan(0.05);
    expect(tail.normal.z).toBeLessThan(0);
    expect(nose.position.y).toBeGreaterThan(tail.position.y);
  });

  it('exposes the curves it is built from, so a renderer can draw the same hull', () => {
    for (const patch of shape.patches) {
      const s = patch.position.z / shape.length + 0.5;
      const u = patch.position.x / (shape.curves.width(s) / 2);
      expect(patch.position.y).toBeCloseTo(shape.curves.rocker(s), 12);
      expect(patch.thickness).toBeCloseTo(shape.curves.thickness(s) * (1 - shape.taper * u * u), 12);
    }
    expect(shape.taper).toBeGreaterThan(0);
    expect(shape.taper).toBeLessThan(1);
  });
});
