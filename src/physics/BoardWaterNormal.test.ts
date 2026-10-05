import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import type { WaterSample } from './SurfWater';

const DT = 1 / 120;
type InertiaCaches = {
  surfaceNormal: Float64Array;
  surfaceSpeed: Float64Array;
  addedMass: Float64Array;
  radiation: Float64Array;
};

// A local fully wetted contact surrogate. Its raw normal and bounded slope are
// intentionally different, as the production contact contract permits in a fold.
// This does not claim that a particular shipped query selects this exact normal.
class LocalContactWater extends PlaneWater {
  constructor(private readonly raw: Readonly<Vector3>, slopeX: number, slopeZ: number) {
    super({ level: 2, depth: 20, slopeX, slopeZ });
  }

  override sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    super.sampleAt(x, y, z, out);
    out.normalX = this.raw.x;
    out.normalY = this.raw.y;
    out.normalZ = this.raw.z;
    return out;
  }
}

function placed(velocity: Vector3, bank = 0): BoardBody {
  const board = new BoardBody({ substeps: 1, fins: [] });
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0),
    new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), bank), velocity);
  return board;
}

function actualDirectionAndImpulse(board: BoardBody, raw: Readonly<Vector3>): void {
  const c = board as unknown as InertiaCaches;
  const count = board.shape.patches.length;
  expect(count).toBeGreaterThan(0);
  expect(board.substepsTaken).toBe(1);
  expect(c.surfaceNormal.length).toBe(3 * count);
  expect(c.surfaceSpeed.length).toBe(count);
  for (let k = 0; k < count; k++) {
    const direction = new Vector3().fromArray(c.surfaceNormal, 3 * k);
    expect(direction.distanceTo(raw)).toBeLessThan(1e-14);
    expect(Math.abs(c.surfaceSpeed[k])).toBeLessThan(1e-12);
  }
  expect(c.addedMass.some(value => value > 0)).toBe(true);
  expect(c.radiation.some(value => value > 0)).toBe(true);
  let participatingForce = 0;
  for (const force of [board.forces.addedMass, board.forces.radiation]) {
    expect(force.toArray().every(Number.isFinite)).toBe(true);
    participatingForce += force.length();
    // Actual solved impulses have no component tangent to a constant raw normal.
    expect(force.clone().cross(raw).length()).toBeLessThan(1e-11 * Math.max(1, force.length()));
  }
  expect(participatingForce).toBeGreaterThan(1e-8);
  for (const motion of [board.position, board.centerOfMass, board.orientation, board.velocity, board.angularVelocity]) {
    expect(motion.toArray().every(Number.isFinite)).toBe(true);
  }
}

const overhang = {
  raw: new Vector3(9 / 25, -4 / 5, 12 / 25),
  tangent: new Vector3(12 / 25, 3 / 5, 16 / 25),
  slopeX: -3 / 5 * Math.sqrt(3), slopeZ: -4 / 5 * Math.sqrt(3),
};

describe('raw sampled normal in hull water inertia', () => {
  for (const fixture of [
    { name: 'steep positive-Y face', raw: new Vector3(0, 1 / Math.sqrt(10), 3 / Math.sqrt(10)),
      tangent: new Vector3(0, 3 / Math.sqrt(10), -1 / Math.sqrt(10)), slopeX: 0, slopeZ: -Math.sqrt(3), bank: 0 },
    // Banking the fully wetted hull makes the solved normal force participate:
    // the vertical case must not pass collinearity with zero inertia forces.
    { name: 'vertical face with a 15-degree bank', raw: new Vector3(1, 0, 0),
      tangent: new Vector3(0, 1, 0), slopeX: -Math.sqrt(3), slopeZ: 0, bank: Math.PI / 12 },
    { name: 'negative-Y overhang with both horizontal components', ...overhang, bank: 0 },
    { name: 'exact downward normal', raw: new Vector3(0, -1, 0), tangent: new Vector3(1, 0, 0),
      slopeX: 0, slopeZ: 0, bank: 0 },
  ]) it(`keeps actual inertia and nonzero impulses on the ${fixture.name} normal`, () => {
    expect(fixture.raw.length()).toBeCloseTo(1, 14);
    expect(fixture.tangent.dot(fixture.raw)).toBeCloseTo(0, 14);
    const water = new LocalContactWater(fixture.raw, fixture.slopeX, fixture.slopeZ);
    const board = placed(fixture.tangent.clone(), fixture.bank);
    board.step(DT, water);
    actualDirectionAndImpulse(board, fixture.raw);
  });

  it('preserves physical motion and reaction under a global raw-normal sign flip', () => {
    // Both representations use identical wet geometry and bounded slopes;
    // the two signs are not two outward geometric conventions.
    const positive = new LocalContactWater(overhang.raw, overhang.slopeX, overhang.slopeZ);
    const negativeRaw = overhang.raw.clone().negate();
    const negative = new LocalContactWater(negativeRaw, overhang.slopeX, overhang.slopeZ);
    const a = placed(overhang.tangent.clone()), b = placed(overhang.tangent.clone());
    a.step(DT, positive); b.step(DT, negative);
    actualDirectionAndImpulse(a, overhang.raw); actualDirectionAndImpulse(b, negativeRaw);
    for (const field of ['position', 'centerOfMass', 'velocity', 'angularVelocity'] as const) {
      expect(a[field].distanceTo(b[field])).toBeLessThan(1e-12);
    }
    expect(a.orientation.angleTo(b.orientation)).toBeLessThan(1e-7);
    for (const name of Object.keys(a.forces) as (keyof typeof a.forces)[]) {
      expect(a.forces[name].distanceTo(b.forces[name])).toBeLessThan(1e-10 * Math.max(1, a.forces[name].length()));
    }
    expect(new Vector3(positive.reaction.x, positive.reaction.y, positive.reaction.z)
      .distanceTo(new Vector3(negative.reaction.x, negative.reaction.y, negative.reaction.z))).toBeLessThan(1e-11);
  });
});
