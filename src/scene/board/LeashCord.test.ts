import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { LEASH } from '../../physics/Leash';
import { LeashCord } from './LeashCord';

const middle = (cord: LeashCord) => cord.points[Math.floor(cord.points.length / 2)];

describe('leash cord', () => {
  it('sags between its ends when slack, about as deep as a cord of its length can', () => {
    const cord = new LeashCord();
    cord.update(new Vector3(0, 0, 0), new Vector3(1, 0, 0), { snapped: false });
    const expected = Math.sqrt(LEASH.length ** 2 - 1) / 2;
    expect(middle(cord).y).toBeCloseTo(-expected, 1);
    expect(cord.points[0].distanceTo(new Vector3(0, 0, 0))).toBeLessThan(1e-9);
    expect(cord.points[cord.points.length - 1].distanceTo(new Vector3(1, 0, 0))).toBeLessThan(1e-9);
  });

  it('runs straight when stretched taut', () => {
    const cord = new LeashCord();
    cord.update(new Vector3(0, 0, 0), new Vector3(2.2, 0, 0), { snapped: false });
    for (const point of cord.points) expect(Math.abs(point.y)).toBeLessThan(1e-9);
  });

  it('runs from the hand while the leash is reeled in', () => {
    const cord = new LeashCord();
    const hand = new Vector3(0.3, 0.2, 0.1);
    cord.update(new Vector3(0, 0, 0), new Vector3(1, 0, 0), { snapped: false, hand });
    expect(cord.points[0].distanceTo(hand)).toBeLessThan(1e-9);
  });

  it('hangs a short stub from the plug once snapped', () => {
    const cord = new LeashCord();
    const plug = new Vector3(5, 0, 5);
    cord.update(new Vector3(0, 0, 0), plug, { snapped: true });
    for (const point of cord.points) expect(point.distanceTo(plug)).toBeLessThan(0.35);
  });

  it('keeps its geometry finite whatever the ends', () => {
    const cord = new LeashCord();
    cord.update(new Vector3(1, 1, 1), new Vector3(1, 1, 1), { snapped: false });
    const positions = cord.object.geometry.getAttribute('position').array as Float32Array;
    expect(positions.every(Number.isFinite)).toBe(true);
  });
});
