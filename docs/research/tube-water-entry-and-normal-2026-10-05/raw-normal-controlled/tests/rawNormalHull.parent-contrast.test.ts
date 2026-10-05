import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardBody } from '../../tube-board-rhs-components-native-20261005/source/src/physics/BoardBody';
import { PlaneWater } from '../source/src/physics/PlaneWater';
import type { WaterSample } from '../source/src/physics/SurfWater';
import { BoardBody as ParentBoardBody } from '../../tube-board-rhs-components-native-20261005/source/src/physics/BoardBody';

const DT = 1 / 120;
type AnyBoard = BoardBody | ParentBoardBody;
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

function placed(Ctor: typeof BoardBody | typeof ParentBoardBody, velocity: Vector3, angle = 0, bank = 0): AnyBoard {
  const board = new Ctor({ substeps: 1, fins: [] });
  board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0),
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle)
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), bank)), velocity);
  return board;
}

function caches(board: AnyBoard): InertiaCaches {
  return board as unknown as InertiaCaches;
}

function state(board: AnyBoard, water: PlaneWater) {
  const c = caches(board);
  return {
    position: board.position.toArray(), center: board.centerOfMass.toArray(), orientation: board.orientation.toArray(),
    velocity: board.velocity.toArray(), angularVelocity: board.angularVelocity.toArray(),
    forces: Object.fromEntries(Object.entries(board.forces).map(([name, force]) => [name, force.toArray()])),
    work: { ...board.work }, submergedVolume: board.submergedVolume, wettedArea: board.wettedArea,
    substepsTaken: board.substepsTaken, surfaceNormal: Array.from(c.surfaceNormal), surfaceSpeed: Array.from(c.surfaceSpeed),
    addedMass: Array.from(c.addedMass), radiation: Array.from(c.radiation),
    waterReaction: { ...water.reaction }, waterReactions: water.reactions,
  };
}

function actualDirectionAndImpulse(board: AnyBoard, raw: Readonly<Vector3>) {
  const c = caches(board), count = board.shape.patches.length;
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
}

const overhang = {
  raw: new Vector3(9 / 25, -4 / 5, 12 / 25),
  tangent: new Vector3(12 / 25, 3 / 5, 16 / 25),
  slopeX: -3 / 5 * Math.sqrt(3), slopeZ: -4 / 5 * Math.sqrt(3),
};

describe('raw sampled normal in hull water inertia', () => {
  for (const fixture of [
    { name: 'steep positive-Y face', raw: new Vector3(0, 1 / Math.sqrt(10), 3 / Math.sqrt(10)),
      tangent: new Vector3(0, 3 / Math.sqrt(10), -1 / Math.sqrt(10)), slopeX: 0, slopeZ: -Math.sqrt(3) },
    { name: 'vertical face', raw: new Vector3(1, 0, 0), tangent: new Vector3(0, 1, 0), slopeX: -Math.sqrt(3), slopeZ: 0 },
    { name: 'negative-Y overhang with both horizontal components', ...overhang },
    { name: 'exact downward normal', raw: new Vector3(0, -1, 0), tangent: new Vector3(1, 0, 0), slopeX: 0, slopeZ: 0 },
  ]) it(`keeps actual inertia and nonzero impulses on the ${fixture.name} normal`, () => {
    expect(fixture.raw.length()).toBeCloseTo(1, 14);
    expect(fixture.tangent.dot(fixture.raw)).toBeCloseTo(0, 14);
    const water = new LocalContactWater(fixture.raw, fixture.slopeX, fixture.slopeZ);
    const bank = fixture.name === 'vertical face' ? Math.PI / 12 : 0;
    const board = placed(BoardBody, fixture.tangent.clone(), 0, bank);
    board.step(DT, water);
    actualDirectionAndImpulse(board, fixture.raw);
  });

  it('preserves physical motion and reaction under a global raw-normal sign flip', () => {
    // An algebraic operator test: both representations use identical wet geometry
    // and bounded slopes; the two signs are not two outward geometric conventions.
    const positive = new LocalContactWater(overhang.raw, overhang.slopeX, overhang.slopeZ);
    const negativeRaw = overhang.raw.clone().negate();
    const negative = new LocalContactWater(negativeRaw, overhang.slopeX, overhang.slopeZ);
    const a = placed(BoardBody, overhang.tangent.clone()), b = placed(BoardBody, overhang.tangent.clone());
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

  for (const angle of [0, Math.PI / 12]) it(`retains the frozen parent ordinary ${angle === 0 ? 'flat' : '15-degree'} hull behavior`, () => {
    const velocity = new Vector3(0, -Math.sin(angle), Math.cos(angle)).multiplyScalar(6);
    const candidate = placed(BoardBody, velocity.clone(), angle), parent = placed(ParentBoardBody, velocity.clone(), angle);
    const a = new PlaneWater({ slopeZ: -Math.tan(angle) }), b = new PlaneWater({ slopeZ: -Math.tan(angle) });
    for (let step = 1; step <= 60; step++) {
      candidate.step(1 / 60, a); parent.step(1 / 60, b);
      expect(state(candidate, a), `ordinary hull witness at frame ${step}`).toEqual(state(parent, b));
    }
  });
});
