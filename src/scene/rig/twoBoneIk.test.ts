import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { solveTwoBone } from './twoBoneIk';

const root = new Vector3(0, 1, 0);
const mid = new Vector3();
const end = new Vector3();

describe('two-bone IK', () => {
  it('reaches a target in range, keeping both lengths', () => {
    const target = new Vector3(0.1, 0.3, 0.2);
    expect(solveTwoBone(root, 0.45, 0.42, target, new Vector3(0, 0, 1), mid, end)).toBe(true);
    expect(end.distanceTo(target)).toBeLessThan(1e-9);
    expect(mid.distanceTo(root)).toBeCloseTo(0.45, 9);
    expect(mid.distanceTo(end)).toBeCloseTo(0.42, 9);
  });

  it('bends the middle joint toward the pole', () => {
    solveTwoBone(root, 0.45, 0.42, new Vector3(0, 0.3, 0), new Vector3(0, 0, 1), mid, end);
    expect(mid.z).toBeGreaterThan(0.1);
    solveTwoBone(root, 0.45, 0.42, new Vector3(0, 0.3, 0), new Vector3(0, 0, -1), mid, end);
    expect(mid.z).toBeLessThan(-0.1);
  });

  it('stops short of an unreachable target without stretching', () => {
    expect(solveTwoBone(root, 0.45, 0.42, new Vector3(0, -2, 0), new Vector3(0, 0, 1), mid, end)).toBe(false);
    expect(mid.distanceTo(root)).toBeCloseTo(0.45, 9);
    expect(mid.distanceTo(end)).toBeCloseTo(0.42, 9);
    expect(end.y).toBeLessThan(root.y - 0.86);
  });

  it('stays finite for a target on the root and for a pole along the reach', () => {
    solveTwoBone(root, 0.45, 0.42, root.clone(), new Vector3(0, 0, 1), mid, end);
    expect(Number.isFinite(mid.x + mid.y + mid.z + end.x + end.y + end.z)).toBe(true);
    expect(mid.distanceTo(root)).toBeCloseTo(0.45, 9);
    solveTwoBone(root, 0.45, 0.42, new Vector3(0, 0.5, 0), new Vector3(0, -1, 0), mid, end);
    expect(Number.isFinite(mid.x + mid.y + mid.z)).toBe(true);
    expect(mid.distanceTo(root)).toBeCloseTo(0.45, 9);
    expect(mid.distanceTo(end)).toBeCloseTo(0.42, 9);
  });
});
