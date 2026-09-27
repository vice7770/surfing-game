import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RiderMotion } from './riderMotion';
import { createRiderVisualState, type RiderPhase } from './riderVisualState';

const STEP = 1 / 60;

/** Samples a board at `heading(t)` moving by `position(t)` for `seconds`, from `start` s; returns the state. */
function ride(motion: RiderMotion, seconds: number, heading: (t: number) => number, position: (t: number) => [number, number, number], start = 0, phase: RiderPhase = 'standing') {
  const state = createRiderVisualState();
  let last = start;
  for (let t = start; t <= start + seconds + 1e-9; t += STEP) {
    state.phase = phase;
    state.heading = heading(t);
    state.boardPosition.set(...position(t));
    motion.update(state, t);
    last = t;
  }
  return Object.assign(state, { last });
}

describe('rider motion', () => {
  it('reads the turn rate from the heading', () => {
    const state = ride(new RiderMotion(), 0.5, (t) => t, (t) => [0, 0, 5 * t]);
    expect(state.yawRate).toBeGreaterThan(0.95);
    expect(state.yawRate).toBeLessThan(1.05);
  });

  // Review Focus 5: a repeated sample, or one going back in time, changes nothing.
  it('changes nothing on a repeated or earlier sample', () => {
    const motion = new RiderMotion();
    const state = ride(motion, 0.5, (t) => t, (t) => [0, 0, 5 * t]);
    const before = { yawRate: state.yawRate, climb: state.climb, speed: state.speed, travel: state.travel.clone() };
    motion.update(state, state.last);
    state.heading += 3;
    motion.update(state, state.last - 0.1);
    expect(state.yawRate).toBe(before.yawRate);
    expect(state.climb).toBe(before.climb);
    expect(state.speed).toBe(before.speed);
    expect(state.travel.equals(before.travel)).toBe(true);
    expect(Number.isFinite(state.yawRate)).toBe(true);
  });

  // Review Focus 3.
  it('reads the same turn rate through the heading’s wrap at ±π', () => {
    const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
    const motion = new RiderMotion();
    let highest = 0;
    const state = createRiderVisualState();
    for (let t = 0; t <= 1 + 1e-9; t += STEP) {
      state.heading = wrap(Math.PI - 0.5 + t);
      state.boardPosition.set(0, 0, 5 * t);
      motion.update(state, t);
      if (t > 0.4) highest = Math.max(highest, Math.abs(state.yawRate));
    }
    expect(state.yawRate).toBeGreaterThan(0.95);
    expect(highest).toBeLessThan(1.05);
  });

  // Review Focus 2: a retry or a remote surfer's jump starts over, with no spike.
  it('starts over on a jump, and on climbing back on after a fall', () => {
    const motion = new RiderMotion();
    const state = ride(motion, 0.5, (t) => t, (t) => [0, 0, 5 * t]);
    state.boardPosition.x += 10;
    state.heading += 2;
    motion.update(state, 0.6);
    expect(state.yawRate).toBe(0);
    expect(state.climb).toBe(0);
    const fallen = new RiderMotion();
    ride(fallen, 0.5, (t) => t, (t) => [0, 0, 5 * t], 0, 'fallen');
    const back = createRiderVisualState();
    back.phase = 'prone';
    back.heading = 3;
    back.boardPosition.set(0, 0, 2.6);
    fallen.update(back, 0.6);
    expect(back.yawRate).toBe(0);
  });

  it('follows where the board travels, and its heading when slow', () => {
    const moving = ride(new RiderMotion(), 0.5, () => Math.PI / 2, (t) => [3 * t, 0, 0]);
    expect(moving.travel.x).toBeGreaterThan(0.99);
    expect(moving.speed).toBeGreaterThan(2.8);
    const slow = ride(new RiderMotion(), 0.5, () => Math.PI / 2, (t) => [0, 0, 0.2 * t]);
    expect(slow.travel.x).toBeCloseTo(1, 6);
    expect(slow.travel.y).toBe(0);
  });

  it('reads the board going down the face as a negative climb', () => {
    const state = ride(new RiderMotion(), 0.5, () => 0, (t) => [0, -2 * t, 5 * t]);
    expect(state.climb).toBeGreaterThan(-2.1);
    expect(state.climb).toBeLessThan(-1.9);
  });

  // The final review: the body's upright and standing cues ease in, so neither the push → landing nor the
  // landing → standing switch snaps the drawn body.
  it('eases the upright body in through the landing and the standing cues in once standing', () => {
    const motion = new RiderMotion();
    const state = createRiderVisualState();
    const sample = (phase: RiderPhase, from: number, seconds: number) => {
      let t = from;
      for (; t <= from + seconds + 1e-9; t += STEP) {
        state.phase = phase;
        state.boardPosition.set(0, 0, 5 * t);
        motion.update(state, t);
      }
      return t;
    };
    let t = sample('prone', 0, 0.3);
    expect(state.uprightBlend).toBe(0);
    expect(state.standingBlend).toBe(0);
    state.phase = 'landing';
    motion.update(state, t);
    expect(state.uprightBlend).toBeLessThan(0.05);
    t = sample('landing', t, 0.45);
    expect(state.uprightBlend).toBe(1);
    expect(state.standingBlend).toBe(0);
    state.phase = 'standing';
    motion.update(state, t);
    expect(state.standingBlend).toBeLessThan(0.05);
    expect(state.uprightBlend).toBe(1);
    t = sample('standing', t, 0.35);
    expect(state.standingBlend).toBe(1);
    sample('prone', t, 0.1);
    expect(state.uprightBlend).toBe(0);
    expect(state.standingBlend).toBe(0);
  });

  // The final review: a new session starts at an earlier sea time, often from the same lineup spot.
  it('starts over when the sea time goes back', () => {
    const motion = new RiderMotion();
    ride(motion, 1, (t) => -t, (t) => [0, 0, 5 * t]);
    // From within a metre of where the last session's rider was: no jump to start it over.
    const again = ride(motion, 0.5, (t) => 2 * t, (t) => [0, 0, 4 + 5 * t]);
    expect(again.yawRate).toBeGreaterThan(1.9);
  });

  // The final review: a stalled board sliding tail-first must not turn the travel around.
  it('keeps travelling where the board points when it slides back or crawls', () => {
    const back = ride(new RiderMotion(), 0.5, () => 0, (t) => [0, 0, -1.5 * t]);
    expect(back.travel.z).toBeGreaterThan(0.99);
    const motion = new RiderMotion();
    const state = createRiderVisualState();
    let previous: Vector3 | undefined;
    let widest = 0;
    let z = 0;
    for (let t = 0; t <= 2 + 1e-9; t += STEP) {
      z += Math.min(3, 0.2 + t) * STEP;
      state.heading = 0.6;
      state.boardPosition.set(0, 0, z);
      motion.update(state, t);
      if (previous) widest = Math.max(widest, state.travel.angleTo(previous));
      previous = state.travel.clone();
    }
    expect(widest).toBeLessThan(0.05);
  });
});
