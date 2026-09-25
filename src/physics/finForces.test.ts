import { describe, expect, it } from 'vitest';
import { FIN_STALL, THRUSTER, createFinForce, finForce } from './finForces';

const fin = THRUSTER[2]; // the centre fin: no toe
const at = (degrees: number, speed = 5) => {
  const a = (degrees * Math.PI) / 180;
  return { x: speed * Math.sin(a), y: 0, z: speed * Math.cos(a) };
};

describe('fin forces', () => {
  it('pushes back against sideslip either way', () => {
    const out = createFinForce();
    finForce(fin, at(5), 1, out);
    const right = out.force.x;
    finForce(fin, at(-5), 1, out);
    expect(right).toBeLessThan(0);
    expect(out.force.x).toBeCloseTo(-right, 9);
  });

  it('lifts in proportion to the attack at first, peaks near the stall and loses lift beyond it', () => {
    const out = createFinForce();
    const lift = (degrees: number) => (finForce(fin, at(degrees), 1, out), out.lift);
    expect(lift(4) / lift(2)).toBeCloseTo(2, 1);
    const peak = (FIN_STALL * 180) / Math.PI;
    expect(lift(peak - 2)).toBeGreaterThan(lift(peak - 8));
    expect(lift(peak + 12)).toBeLessThan(0.8 * lift(peak - 2));
    const drag = (degrees: number) => (finForce(fin, at(degrees), 1, out), out.drag);
    expect(drag(10)).toBeGreaterThan(drag(2));
    expect(drag(35)).toBeGreaterThan(drag(10));
  });

  it('grips only as much as it is in the water', () => {
    const out = createFinForce();
    finForce(fin, at(6), 1, out);
    const wet = out.force.x;
    finForce(fin, at(6), 0.5, out);
    expect(out.force.x / wet).toBeCloseTo(0.5, 9);
    finForce(fin, at(6), 0, out);
    expect([out.force.x, out.force.z]).toEqual([0, 0]);
  });

  // The board treats the sideways part implicitly; its coefficient must be the true derivative.
  it('reports the derivative of its sideways force', () => {
    const out = createFinForce();
    const sideways = (u: number) => (finForce(fin, { x: u, y: 0, z: 5 }, 1, out), out.force.x);
    const step = 1e-5;
    const derivative = -(sideways(0.2 + step) - sideways(0.2 - step)) / (2 * step);
    finForce(fin, { x: 0.2, y: 0, z: 5 }, 1, out);
    expect(out.damping).toBeCloseTo(derivative, 0);
    expect(out.damping).toBeGreaterThan(0);
  });
});
