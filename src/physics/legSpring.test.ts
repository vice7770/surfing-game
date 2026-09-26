import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RIDER_LEG, addLeg, legForce, legTensors, solveLinear } from './legSpring';

const MASS = 73;

/**
 * A board (6 DOF, mass M, isotropic inertia I) and a rider point (3 DOF) joined
 * by the leg, stepped by semi-implicit Euler with the leg implicit, as BoardBody will.
 */
function simulate(options: { boardMass: number; inertia: number; seconds: number; h: number; stretch0: number; zeta?: number; gravity?: boolean }) {
  const spec = { ...RIDER_LEG, axialDamping: options.zeta ?? RIDER_LEG.axialDamping };
  const K = new Float64Array(9);
  const C = new Float64Array(9);
  const axis = new Vector3(0, 1, 0);
  legTensors(spec, axis, MASS, K, C);
  const v = new Vector3();
  const w = new Vector3();
  const u = new Vector3();
  const board = new Vector3();
  const rider = new Vector3(0, 0.85 + options.stretch0, 0);
  const rest = 0.85;
  const system = new Float64Array(81);
  const rhs = new Float64Array(9);
  const force = new Vector3();
  const trace: number[] = [];
  for (let s = 0; s < Math.round(options.seconds / options.h); s += 1) {
    system.fill(0);
    for (let i = 0; i < 3; i += 1) {
      system[i * 9 + i] = options.boardMass;
      system[(3 + i) * 9 + 3 + i] = options.inertia;
      system[(6 + i) * 9 + 6 + i] = MASS;
    }
    const arm = rider.clone().sub(board);
    const stretch = arm.clone().sub(axis.clone().multiplyScalar(rest));
    const relative = u.clone().sub(v).sub(new Vector3().crossVectors(w, arm));
    legForce(K, C, stretch, relative, force);
    addLeg(system, K, C, arm, options.h);
    const g = options.gravity ? -9.81 : 0;
    const f = force.clone().multiplyScalar(options.h);
    const torque = new Vector3().crossVectors(arm, f).negate();
    rhs.set([-f.x, -f.y + options.h * options.boardMass * g, -f.z, torque.x, torque.y, torque.z, f.x, f.y + options.h * MASS * g, f.z]);
    solveLinear(system, rhs, 9);
    v.x += rhs[0]; v.y += rhs[1]; v.z += rhs[2];
    w.x += rhs[3]; w.y += rhs[4]; w.z += rhs[5];
    u.x += rhs[6]; u.y += rhs[7]; u.z += rhs[8];
    board.addScaledVector(v, options.h);
    rider.addScaledVector(u, options.h);
    trace.push(rider.y - board.y - rest);
  }
  return { trace, v, u, boardMass: options.boardMass };
}

describe('leg spring', () => {
  it('solves a 9 × 9 system', () => {
    const n = 9;
    const a = new Float64Array(n * n);
    const x = Array.from({ length: n }, (_, i) => Math.sin(i + 1));
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) a[i * n + j] = (i === j ? 10 : 0) + Math.cos(i * 3 + j);
    const b = new Float64Array(n);
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) b[i] += a[i * n + j] * x[j];
    solveLinear(a.slice(), b, n);
    for (let i = 0; i < n; i += 1) expect(b[i]).toBeCloseTo(x[i], 9);
  });

  it('adds a symmetric, positive semi-definite block', () => {
    const K = new Float64Array(9);
    const C = new Float64Array(9);
    legTensors(RIDER_LEG, new Vector3(0.2, 0.95, 0.1).normalize(), MASS, K, C);
    const system = new Float64Array(81);
    addLeg(system, K, C, { x: 0.1, y: 0.9, z: -0.2 }, 1 / 240);
    for (let i = 0; i < 9; i += 1) for (let j = 0; j < 9; j += 1) expect(system[i * 9 + j]).toBeCloseTo(system[j * 9 + i], 9);
    for (let trial = 0; trial < 20; trial += 1) {
      const x = Array.from({ length: 9 }, (_, i) => Math.sin(trial * 7 + i * 1.3));
      let quadratic = 0;
      for (let i = 0; i < 9; i += 1) for (let j = 0; j < 9; j += 1) quadratic += x[i] * system[i * 9 + j] * x[j];
      expect(quadratic).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('bounces a rider on a fixed support at the legs-bent frequency, 2.75 Hz', () => {
    const { trace } = simulate({ boardMass: 1e9, inertia: 1e9, seconds: 3, h: 1 / 960, stretch0: 0.02, zeta: 0 });
    const crossings: number[] = [];
    for (let i = 1; i < trace.length; i += 1) if (trace[i - 1] > 0 && trace[i] <= 0) crossings.push(i / 960);
    const period = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
    expect(1 / period).toBeGreaterThan(2.6);
    expect(1 / period).toBeLessThan(2.9);
  });

  it('damps a bounce at about the stated ratio', () => {
    const { trace } = simulate({ boardMass: 1e9, inertia: 1e9, seconds: 2, h: 1 / 960, stretch0: 0.02, zeta: 0.35 });
    const peaks = trace.filter((value, i) => i > 0 && i < trace.length - 1 && value > trace[i - 1] && value >= trace[i + 1] && value > 0);
    const decrement = Math.log(0.02 / peaks[0]);
    const expected = (2 * Math.PI * 0.35) / Math.sqrt(1 - 0.35 * 0.35);
    expect(decrement).toBeGreaterThan(0.8 * expected);
    expect(decrement).toBeLessThan(1.25 * expected);
  });

  it('stays stable with a light board at the game step', () => {
    const { trace } = simulate({ boardMass: 2.54, inertia: 0.5, seconds: 10, h: 1 / 60, stretch0: 0.05 });
    expect(Math.max(...trace.slice(-60).map(Math.abs))).toBeLessThan(0.05);
  });

  it('conserves the pair’s momentum with no outside force', () => {
    const { v, u, boardMass } = simulate({ boardMass: 2.54, inertia: 0.5, seconds: 2, h: 1 / 240, stretch0: 0.05 });
    const momentum = v.clone().multiplyScalar(boardMass).addScaledVector(u, MASS);
    expect(momentum.length()).toBeLessThan(1e-9);
  });
});
