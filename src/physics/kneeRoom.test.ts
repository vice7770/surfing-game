import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider, CROUCH_DEPTH, type AttachedRiderOptions } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { createWaterSample } from './SurfWater';
import { stanceRoom } from './humanBalance';
import { FaceWater } from './testing/FaceWater';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;
const ACHIEVED = { rider: 'new', kneeRoom: 'achieved' } as const;
const NEW = { rider: 'new' } as const;

interface Inputs { steer?: number; compress?: number; crouch?: number; snap?: number }
interface Frame { t: number; rest: number; knees: number; y: number; roll: number }

/** Standing on flat water at `speed` down +z, settled for 0.3 s, then `seconds` with the inputs `at(t)` gives. */
function flat(options: AttachedRiderOptions, seconds: number, at: (t: number) => Inputs, speed = 8.5): { frames: Frame[]; rider: AttachedRider; board: BoardBody } {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...options });
  board.attach(rider);
  const water = new PlaneWater();
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  const frames: Frame[] = [];
  for (let n = 0; n < Math.round(seconds / STEP) && rider.attached; n += 1) {
    const t = n * STEP;
    Object.assign(rider, { steer: 0, compress: 0, crouch: 0, snap: 0, ...at(t) });
    board.step(STEP, water);
    const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    frames.push({ t: t + STEP, rest: rider.leg.rest, knees: rider.human.knees, y: rider.position.y, roll: Math.atan2(up.x, up.y) * DEG });
  }
  return { frames, rider, board };
}

/**
 * The Canyon-matched face of PR #223 (1.4 m, 16°, 5.7 m/s over 2.6 m), the rider placed 45° off the fall line at the
 * face's own speed, steering `steer` from the first frame: the cell step 3.3f measures the stances on, where the
 * balance's own knee drop does fire. Returns every frame until the rider comes off the board.
 */
function face(options: AttachedRiderOptions, seconds: number, at: (t: number) => Inputs, steer: number): { frames: Frame[]; rider: AttachedRider } {
  const water = new FaceWater({ depth: 2.6, height: 1.4, slope: 16, speed: 5.7 });
  const sample = createWaterSample();
  const pz = water.crestZ() + 0.75 * water.front;
  const here = water.sampleAt(0, 50, pz, sample);
  const entry = (5.7 - here.flowZ) / Math.cos(45 / DEG);
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const level = new Vector3(Math.sin(-45 / DEG), 0, Math.cos(-45 / DEG));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(0, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...options });
  board.attach(rider);
  const frames: Frame[] = [];
  for (let n = 0; n < Math.round(seconds / STEP) && rider.attached; n += 1) {
    const t = n * STEP;
    Object.assign(rider, { steer, compress: 0, crouch: 0, snap: 0, ...at(t) });
    water.advance(STEP);
    board.step(STEP, water);
    const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    frames.push({ t: t + STEP, rest: rider.leg.rest, knees: rider.human.knees, y: rider.position.y, roll: Math.atan2(up.x, up.y) * DEG });
  }
  return { frames, rider };
}

const deepest = (frames: Frame[], from = 0.5) => Math.min(...frames.filter((f) => f.t > from).map((f) => f.rest));
const held = (frames: Frame[], from = 0.5) => {
  const rest = frames.filter((f) => f.t > from).map((f) => f.rest).sort((a, b) => a - b);
  return rest.length ? rest[Math.floor(rest.length / 2)] : Number.NaN;
};

/**
 * `kneeRoom: 'achieved'` (step 3.3f, the `?kneeRoom=achieved` dev switch, opt-in and off by default): the new surfer's
 * balance reads the knees' travel left (`stanceRoom`) at the depth its leg has actually reached rather than at the
 * depth the player commands. docs/research/new-rider/3.3/README.md Part 29.
 */
describe('the knees\' travel read where the leg is (opt-in)', () => {
  // The arithmetic the round turns on, asserted so it cannot drift: the riding stance's knee travel IS Compress's own
  // depth, so a balance correction at full knees reaches exactly what the button commands and the button has 0.05 m left.
  it('states the defect in the design table: the riding stance leaves the knees the whole of Compress\'s depth', () => {
    expect(stanceRoom(0).kneeTravel).toBeCloseTo(CROUCH_DEPTH, 12);
    expect(stanceRoom(CROUCH_DEPTH).kneeTravel).toBeCloseTo(0.05, 12);
    // Read at the depth reached, the drop has a fixed point: d = kneeTravel(d), about 0.17 m, so a saturated
    // correction settles well short of the button's own 0.30 m and the button keeps most of its travel.
    let d = 0;
    for (let i = 0; i < 200; i += 1) d = stanceRoom(d).kneeTravel;
    expect(d).toBeGreaterThan(0.16);
    expect(d).toBeLessThan(0.18);
    expect(d).toBeLessThan(CROUCH_DEPTH);
  });

  it('leaves the default rider alone: it has no `HumanBalance`, so the switch cannot reach it', () => {
    for (const inputs of [{}, { steer: 1, compress: 1 }, { steer: -1 }, { compress: 1 }] as Inputs[]) {
      const off = flat({}, 1.2, () => inputs);
      const on = flat({ kneeRoom: 'achieved' }, 1.2, () => inputs);
      expect(on.frames).toEqual(off.frames);
      expect(on.board.position.toArray()).toEqual(off.board.position.toArray());
      expect(on.board.orientation.toArray()).toEqual(off.board.orientation.toArray());
    }
  });

  it('changes nothing on the new surfer while the balance\'s knees are down at nothing, and only then', () => {
    for (const inputs of [{}, { compress: 1 }, { crouch: 1 }] as Inputs[]) {
      const off = flat(NEW, 1.2, () => inputs);
      const on = flat(ACHIEVED, 1.2, () => inputs);
      const fired = Math.max(...off.frames.map((f) => f.knees));
      if (fired === 0) {
        expect(on.frames, JSON.stringify(inputs)).toEqual(off.frames);
        expect(on.board.orientation.toArray()).toEqual(off.board.orientation.toArray());
      } else {
        // Where the correction is firing the switch is doing its job, so identity would be the failure: the drop is
        // read at the depth the leg has, and on flat water that is a few millimetres of difference, not a stance.
        expect(on.frames, JSON.stringify(inputs)).not.toEqual(off.frames);
        expect(Math.abs(deepest(on.frames) - deepest(off.frames))).toBeLessThan(0.02);
      }
    }
  });

  it('reaches the balance only through `rider: \'new\'`: the switch alone is not a rider', () => {
    const plain = flat({}, 1.0, () => ({}));
    const switched = flat({ kneeRoom: 'achieved' }, 1.0, () => ({}));
    expect(switched.frames).toEqual(plain.frames);
  });

  it('holds a standing stance higher where the balance\'s knees are down, and Compress still reaches its own depth', () => {
    // On the Canyon-matched face with the stick over, the balance's knee drop does fire; with the switch off, a
    // STANDING stance is taken to CROUCH_DEPTH itself by the correction alone.
    const tallOff = face(NEW, 2.5, () => ({}), 1);
    const tallOn = face(ACHIEVED, 2.5, () => ({}), 1);
    expect(Math.max(...tallOff.frames.map((f) => f.knees))).toBeGreaterThan(0.5);
    expect(deepest(tallOff.frames)).toBeLessThan(-0.2);
    // Read where the leg is, the same correction settles shallower — the drop is kept, not deleted.
    expect(deepest(tallOn.frames)).toBeGreaterThan(deepest(tallOff.frames));
    expect(deepest(tallOn.frames)).toBeLessThan(-0.05);
    // And Compress still commands its full depth with the switch on: its 0.30 m is unchanged, so the CONTRAST grows.
    const compressOn = face(ACHIEVED, 2.5, () => ({ compress: 1, crouch: 0.6 }), 1);
    expect(held(compressOn.frames)).toBeLessThan(-CROUCH_DEPTH + 0.01);
    const compressOff = face(NEW, 2.5, () => ({ compress: 1, crouch: 0.6 }), 1);
    expect(held(compressOff.frames)).toBeLessThan(-CROUCH_DEPTH + 0.01);
    expect(held(compressOn.frames) - held(tallOn.frames)).toBeLessThan(held(compressOff.frames) - held(tallOff.frames));
  });
});
