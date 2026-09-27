import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { EDDIES, eddyVelocity } from './eddies';

describe('eddies', () => {
  const k = 0.5;
  const rms = Math.sqrt((2 * k) / 3);

  it('are a pure function of place, time and intensity', () => {
    const a = eddyVelocity(1.3, -0.4, 7.9, 12.5, k, new Vector3());
    const b = eddyVelocity(1.3, -0.4, 7.9, 12.5, k, new Vector3());
    expect(a.toArray()).toEqual(b.toArray());
    expect(eddyVelocity(1.3, -0.4, 7.9, 12.5, 0, new Vector3()).length()).toBe(0);
  });

  it('carry the turbulence\'s energy, √(2k/3) a component, about a descending mean', () => {
    const v = new Vector3();
    const mean = new Vector3();
    const square = new Vector3();
    const n = 20000;
    for (let i = 0; i < n; i += 1) {
      eddyVelocity(((i * 7.31) % 97) - 48, -((i * 0.137) % 2.5), ((i * 3.77) % 89) - 44, (i * 0.0917) % 60, k, v);
      mean.add(v);
      square.add(new Vector3(v.x * v.x, v.y * v.y, v.z * v.z));
    }
    mean.divideScalar(n);
    expect(Math.abs(mean.x)).toBeLessThan(0.1 * rms);
    expect(Math.abs(mean.z)).toBeLessThan(0.1 * rms);
    expect(mean.y).toBeCloseTo(-EDDIES.descend * rms, 1);
    for (const [axis, sq] of [['x', square.x], ['z', square.z]] as const) {
      expect(Math.sqrt(sq / n), axis).toBeGreaterThan(0.8 * rms);
      expect(Math.sqrt(sq / n), axis).toBeLessThan(1.2 * rms);
    }
  });

  it('are smooth: points 1 cm apart, or 20 ms apart, move almost alike', () => {
    const a = eddyVelocity(3, -0.5, 4, 20, k, new Vector3());
    expect(eddyVelocity(3.01, -0.5, 4, 20, k, new Vector3()).distanceTo(a)).toBeLessThan(0.25 * rms);
    expect(eddyVelocity(3, -0.5, 4, 20.02, k, new Vector3()).distanceTo(a)).toBeLessThan(0.25 * rms);
  });

  it('differ over a body\'s length, so they can turn it', () => {
    const head = eddyVelocity(3, -0.5, 4, 20, k, new Vector3());
    const feet = eddyVelocity(3, -0.5, 5.6, 20, k, new Vector3());
    expect(head.distanceTo(feet)).toBeGreaterThan(0.2 * rms);
  });
});
