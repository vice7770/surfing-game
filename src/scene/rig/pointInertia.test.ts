import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { POINT_INERTIA_TRAVEL, PointInertia } from './pointInertia';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from './riderVisualState';

const STEP = 1 / 60;

/** A standing rider on a board at `z` along +z, turned `heading` about the vertical, at `clock`. */
const riding = (z: number, clock: number, heading = 0) => {
  const state = posturePoints('standing', 'regular', new Vector3(0, 0, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading), createRiderVisualState());
  state.clock = clock;
  return state;
};

/** The points' speeds against the board, m/s, from one state to the next. */
const speeds = (before: Vector3[], after: RiderVisualState, board: { position: Vector3; inverse: Quaternion }, dt: number) =>
  after.points.map((point, i) => point.clone().sub(board.position).applyQuaternion(board.inverse).distanceTo(before[i]) / dt);
const local = (state: RiderVisualState) => {
  const inverse = state.boardQuaternion.clone().invert();
  return state.points.map((point) => point.clone().sub(state.boardPosition).applyQuaternion(inverse));
};

describe('the point inertia', () => {
  it('carries a drawn foot that jumps on the board, as a limb would move it', () => {
    const inertia = new PointInertia();
    let clock = 0;
    let z = 0;
    for (let i = 0; i < 10; i += 1) inertia.apply(riding((z += 0.1), (clock += STEP)));
    let before = local(riding(z, clock));
    let fastest = 0;
    for (let i = 0; i < 40; i += 1) {
      const state = riding((z += 0.1), (clock += STEP));
      // The drawn rear foot jumps 5 cm along the deck and stays there.
      state.points[POINT.rightFoot].add(new Vector3(0, 0, -0.05).applyQuaternion(state.boardQuaternion));
      inertia.apply(state);
      const now = local(state);
      fastest = Math.max(fastest, ...speeds(before, state, { position: state.boardPosition, inverse: state.boardQuaternion.clone().invert() }, STEP));
      before = now;
      if (i === 39) {
        const settled = riding(z, clock);
        settled.points[POINT.rightFoot].add(new Vector3(0, 0, -0.05));
        expect(state.points[POINT.rightFoot].distanceTo(settled.points[POINT.rightFoot])).toBeLessThan(0.002);
      }
    }
    expect(fastest).toBeLessThan(1.5 * POINT_INERTIA_TRAVEL);
  });

  it('leaves the points moving with the board as they are', () => {
    const inertia = new PointInertia();
    for (let i = 0; i < 60; i += 1) {
      // Gliding at 6 m/s and turning at 1 rad/s.
      const state = riding(i * 0.1, i * STEP, i * STEP);
      const expected = riding(i * 0.1, i * STEP, i * STEP);
      inertia.apply(state);
      state.points.forEach((point, j) => expect(point.distanceTo(expected.points[j])).toBeLessThan(1e-9));
    }
  });

  it('draws a teleport at once', () => {
    const inertia = new PointInertia();
    for (let i = 0; i < 10; i += 1) inertia.apply(riding(i * 0.1, i * STEP));
    const far = riding(40, 10 * STEP);
    const expected = riding(40, 10 * STEP);
    inertia.apply(far);
    far.points.forEach((point, j) => expect(point.distanceTo(expected.points[j])).toBeLessThan(1e-9));
  });

  it('follows a hand swinging between online poses as closely as the poses do', () => {
    // Another player's poses arrive at 20 Hz and are joined by straight lines: the hand turns every 50 ms.
    const inertia = new PointInertia();
    const hand = (t: number) => 0.3 * Math.sin(2 * Math.PI * 1.5 * t);
    const posed = (t: number) => {
      const k = Math.floor(t * 20 + 1e-9);
      return hand(k / 20) + (hand((k + 1) / 20) - hand(k / 20)) * (t * 20 - k);
    };
    let drawn = 0;
    let raw = 0;
    for (let i = 0; i < 240; i += 1) {
      const t = i * STEP;
      const state = riding(0, t);
      const base = state.points[POINT.leftHand].x;
      state.points[POINT.leftHand].x += posed(t);
      inertia.apply(state);
      if (i < 30) continue;
      drawn = Math.max(drawn, Math.abs(state.points[POINT.leftHand].x - base - hand(t)));
      raw = Math.max(raw, Math.abs(posed(t) - hand(t)));
    }
    expect(drawn).toBeLessThan(raw + 0.005);
  });

  it('carries a fall that begins the frame after a start', () => {
    const inertia = new PointInertia();
    const at = (clock: number, phase: 'standing' | 'fallen') => {
      const state = posturePoints('standing', 'regular', new Vector3(200, 0, 50), new Quaternion(), createRiderVisualState());
      state.phase = phase;
      state.clock = clock;
      return state;
    };
    inertia.apply(at(0, 'standing'));
    for (let i = 1; i < 40; i += 1) {
      const state = at(i * STEP, 'fallen');
      const expected = at(i * STEP, 'fallen');
      inertia.apply(state);
      state.points.forEach((point, j) => expect(point.distanceTo(expected.points[j])).toBeLessThan(0.05));
    }
  });

  it('starts over where a switch would carry the body across the sea (a retry from the water)', () => {
    const inertia = new PointInertia();
    let clock = 0;
    for (let i = 0; i < 10; i += 1) {
      const swimming = riding(0, (clock += STEP));
      swimming.phase = 'fallen';
      inertia.apply(swimming);
    }
    // R: back on the board 2 m away, lying down.
    const back = posturePoints('prone', 'regular', new Vector3(2, 0, 0), new Quaternion(), createRiderVisualState());
    back.clock = clock + STEP;
    const expected = back.points.map((point) => point.clone());
    inertia.apply(back);
    back.points.forEach((point, j) => expect(point.distanceTo(expected[j])).toBeLessThan(1e-9));
  });
});
