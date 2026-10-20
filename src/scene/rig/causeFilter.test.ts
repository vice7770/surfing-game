import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAUSE_FILTER, CauseFilter, Follower } from './causeFilter';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from './riderVisualState';

/** A follower driven by `input(t)` at `rate` Hz for `seconds`, its values from `from` s. */
function followed(omega: number, damping: number, rate: number, seconds: number, input: (t: number) => number, from = 0): number[] {
  const follower = new Follower(omega, damping);
  const out: number[] = [];
  for (let i = 0; i <= Math.round(seconds * rate); i += 1) {
    const t = i / rate;
    const value = follower.follow(input(t), t);
    if (t >= from) out.push(value);
  }
  return out;
}

/** The RMS of a sine's steady response over whole cycles, against its input's. */
function gain(omega: number, damping: number, hz: number, rate = 240): number {
  const values = followed(omega, damping, rate, 4, (t) => Math.sin(2 * Math.PI * hz * t), 2);
  return Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length) * Math.SQRT2;
}

describe('the follower (the motion filter\'s second order)', () => {
  it('passes what the plan asks at 1 Hz and 4 Hz, critically damped at 16 rad/s', () => {
    // |ω² / (ω + iw)²|: 0.87 at 1 Hz, 0.29 at 4 Hz (the plan's §4: 0.86× and 0.29×).
    expect(gain(16, 1, 1)).toBeCloseTo(256 / (256 + (2 * Math.PI) ** 2), 2);
    expect(gain(16, 1, 4)).toBeCloseTo(256 / (256 + (8 * Math.PI) ** 2), 2);
  });

  it('follows a ramp 2ζ/ω behind, without overshooting a step when critically damped', () => {
    const ramp = followed(12, 1, 60, 3, (t) => t);
    expect(3 - ramp.at(-1)!).toBeCloseTo(2 / 12, 3);
    const step = followed(16, 1, 60, 2, (t) => (t > 0 ? 1 : 0));
    expect(Math.max(...step)).toBeLessThanOrEqual(1 + 1e-9);
    expect(step.at(-1)!).toBeCloseTo(1, 4);
  });

  it('follows the same input alike at any display rate (stepped exactly for a straight line between frames)', () => {
    // A piecewise-linear input with its corners on every 30 Hz frame: the same at 30, 60 and 120 Hz where they meet.
    const corners = (t: number) => 0.3 * Math.sin(2 * Math.PI * 0.7 * Math.round(t * 30) / 30);
    const between = (t: number) => {
      const a = Math.floor(t * 30) / 30;
      const b = a + 1 / 30;
      return corners(a) + (corners(b) - corners(a)) * (t - a) * 30;
    };
    for (const damping of [1, 0.7]) {
      const slow = followed(12, damping, 30, 2, between);
      const fast = followed(12, damping, 120, 2, between).filter((_, i) => i % 4 === 0);
      slow.forEach((value, i) => expect(fast[i], `${damping}: ${i}`).toBeCloseTo(value, 9));
    }
  });

  it('keeps its value on a clock standing still, and starts over after a gap', () => {
    const follower = new Follower(12);
    follower.follow(0, 0);
    const moved = follower.follow(1, 0.1);
    expect(follower.follow(5, 0.1)).toBe(moved);
    expect(follower.follow(5, 1)).toBe(5);
  });
});

/** A standing state on a board rolled by `roll`, its trunk leaning `lean` rad across the board, at `clock`. */
function standing(roll: number, lean: number, clock: number, out = createRiderVisualState()): RiderVisualState {
  const board = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), roll);
  posturePoints('standing', 'regular', new Vector3(0, 0.1, 0), board, out);
  const pelvis = out.points[POINT.pelvis];
  const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), lean - roll);
  for (const index of [POINT.torso, POINT.head]) out.points[index].sub(pelvis).applyQuaternion(turn).add(pelvis);
  out.clock = clock;
  return out;
}

const across = (state: RiderVisualState) => {
  const trunk = state.points[POINT.torso].clone().sub(state.points[POINT.pelvis]);
  return Math.atan2(-trunk.x, trunk.y);
};

describe('the cause filter (the animation-realism plan, §4)', () => {
  it('keeps the board\'s 4 Hz roll wobble out of the drawn trunk, leaving the feet and hands on their points', () => {
    const filter = new CauseFilter();
    let raw = 0;
    let drawn = 0;
    let count = 0;
    for (let i = 0; i <= 240; i += 1) {
      const t = i / 120;
      // The board and the physics' trunk rolling ±2° at 4 Hz together.
      const wobble = (2 * Math.PI) / 180 * Math.sin(2 * Math.PI * 4 * t);
      const state = standing(wobble, wobble, t);
      state.phase = 'standing';
      const feet = [POINT.leftFoot, POINT.rightFoot, POINT.leftHand, POINT.rightHand].map((index) => state.points[index].clone());
      const given = across(state);
      filter.apply(state);
      [POINT.leftFoot, POINT.rightFoot, POINT.leftHand, POINT.rightHand].forEach((index, k) => expect(state.points[index].distanceTo(feet[k])).toBe(0));
      if (t >= 1) {
        raw += given ** 2;
        drawn += across(state) ** 2;
        count += 1;
      }
    }
    // The lean's own stage at 18 rad/s, damped 0.7: 0.43× at 4 Hz.
    expect(Math.sqrt(drawn / count) / Math.sqrt(raw / count)).toBeLessThan(0.5);
  });

  it('passes a slow lean, a little behind', () => {
    const filter = new CauseFilter();
    let state = standing(0, 0, 0);
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 60;
      state = standing(0, 0.4 * Math.min(1, t), t, state);
      state.phase = 'standing';
      filter.apply(state);
    }
    expect(across(state)).toBeCloseTo(0.4, 2);
  });

  it('passes every phase but standing as it is, and starts over at each switch', () => {
    const filter = new CauseFilter();
    const state = standing(0.1, 0.3, 0);
    state.phase = 'landing';
    const before = state.points.map((point) => point.clone());
    filter.apply(state);
    state.points.forEach((point, i) => expect(point.distanceTo(before[i])).toBe(0));
    // The first standing frame is drawn as given (the filter seeded on it).
    const next = standing(0.1, 0.3, 1 / 60);
    next.phase = 'standing';
    const given = next.points.map((point) => point.clone());
    filter.apply(next);
    next.points.forEach((point, i) => expect(point.distanceTo(given[i])).toBeLessThan(1e-9));
  });

  it('never lets the drawn pelvis trail the physics\' by more than its leash', () => {
    const filter = new CauseFilter();
    for (let i = 0; i <= 30; i += 1) {
      const state = standing(0, 0, i / 60);
      state.phase = 'standing';
      // The physics' body thrown 3 m/s across the board.
      for (const point of state.points.slice(0, 3)) point.x += 3 * (i / 60);
      filter.apply(state);
      const raw = 3 * (i / 60);
      const offset = state.points[POINT.pelvis].x - posturePoints('standing', 'regular', new Vector3(0, 0.1, 0), new Quaternion(), createRiderVisualState()).points[POINT.pelvis].x;
      expect(raw - offset).toBeLessThanOrEqual(CAUSE_FILTER.leash + 1e-9);
    }
  });

  it('reads the physics\' alarm from its own points, before it moves them', () => {
    const filter = new CauseFilter();
    const state = standing(0, 0, 0);
    state.phase = 'standing';
    const torso = state.points[POINT.torso];
    for (const hand of [POINT.leftHand, POINT.rightHand]) state.points[hand].sub(torso).multiplyScalar(2.5 / 1.7).add(torso);
    expect(filter.apply(state).alarm).toBeCloseTo(1, 1);
  });
});
