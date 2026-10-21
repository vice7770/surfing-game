import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { RiderSeparation } from '../../physics/AttachedRider';
import { FALL_READING, FallStages, fallLook } from './fallStages';
import { POINT, createRiderVisualState, type RiderVisualState } from './riderVisualState';

const STEP = 1 / 60;
const X = new Vector3(1, 0, 0);

/**
 * A fallen body at rest on a level board's left (its chest 1 m off), the head
 * `head` m over the board's centre (0 at the surface), the board pitched nose
 * up by `pitch`°.
 */
function body(state: RiderVisualState, head = 0.4, pitch = 0): RiderVisualState {
  state.phase = 'fallen';
  state.boardPosition.set(0, 0, 0);
  state.boardQuaternion.setFromAxisAngle(X, (-pitch * Math.PI) / 180);
  state.points[POINT.pelvis].set(1, head - 0.7, 0);
  state.points[POINT.torso].set(1, head - 0.35, 0);
  state.points[POINT.head].set(1, head, 0);
  state.points[POINT.leftHand].set(1.36, head - 0.4, 0);
  state.points[POINT.rightHand].set(0.64, head - 0.4, 0);
  state.points[POINT.leftFoot].set(1.15, head - 1.2, 0);
  state.points[POINT.rightFoot].set(0.85, head - 1.2, 0);
  return state;
}

/** Reads `seconds` of a fall from `start`, `step` changing the state before each read; the weights at the end. */
function read(seconds: number, setup: (state: RiderVisualState) => void, step?: (state: RiderVisualState, time: number) => void) {
  const stages = new FallStages();
  const state = createRiderVisualState();
  setup(state);
  let time = 0;
  stages.update(state);
  const trace: { time: number; guard: number; surfacing: number; surfaced: number; reel: number }[] = [];
  while (time < seconds - 1e-9) {
    time += STEP;
    state.clock = time;
    step?.(state, time);
    const w = stages.update(state);
    trace.push({ time, guard: w.guard, surfacing: w.surfacing, surfaced: w.surfaced, reel: w.reel });
  }
  return { stages, state, weights: stages.weights, trace };
}

describe('the fall\'s stages (the animation-realism plan, phase 4)', () => {
  describe('the shape, by cause', () => {
    const shapeOf = (cause: RiderSeparation | undefined, pitch = 0) => read(0.3, (state) => {
      body(state, 0.4, pitch);
      state.separation = cause;
    }).weights.shape;

    it('reads the session\'s cause where it names one: the lip\'s over the falls, the reef\'s flat', () => {
      expect(shapeOf('impact')).toBe('falls');
      expect(shapeOf('reef')).toBe('flat');
      // The reef's flat holds whatever the board's pitch.
      expect(shapeOf('reef', -40)).toBe('flat');
    });

    it('reads the board\'s pitch at the fall: a pearl nose down past 25°, off the back nose up past 20°, to the side else', () => {
      expect(shapeOf('balance', -30)).toBe('pearl');
      expect(shapeOf('foot slip', -24)).toBe('side');
      expect(shapeOf('balance', 22)).toBe('back');
      expect(shapeOf('balance', 18)).toBe('side');
      expect(shapeOf(undefined)).toBe('side');
    });

    it('reads a remote surfer\'s from the motion: slipping back off the board, or lifted with the lip', () => {
      // The body moving 2 m/s back against a board riding on at 3 m/s (the body's own 1 m/s), in the fall's first moments.
      const back = read(0.3, (state) => {
        body(state);
        state.travel.set(0, 0, 1);
        state.speed = 3;
      }, (state) => {
        for (const point of state.points) point.z += 1 * STEP;
      });
      expect(back.weights.shape).toBe('back');
      // The pelvis rising 1.5 m/s between 0.1 and 0.6 s: the lip's lift.
      const lifted = read(0.5, (state) => body(state), (state, time) => {
        if (time > 0.15 && time < 0.4) for (const point of state.points) point.y += 1.5 * STEP;
      });
      expect(lifted.weights.shape).toBe('falls');
    });
  });

  it('starts the reflexes 0.12 s in (a sudden fall\'s first muscle responses: Bisdorff et al. 1999), the knees by 0.25 s and the shield by 0.45 s', () => {
    const { trace } = read(0.6, (state) => body(state, 0.4), (state) => { state.swim.under = true; });
    const at = (time: number) => trace.find((entry) => entry.time >= time - 1e-9)!;
    expect(at(0.1).guard).toBe(0);
    expect(at(0.2).guard).toBeGreaterThan(0);
    expect(at(FALL_READING.shielded).guard).toBeCloseTo(1, 6);
    expect(trace.every((entry, i) => i === 0 || entry.guard >= trace[i - 1].guard - 1e-9)).toBe(true);
  });

  it('keeps the shield under water and while tumbling; surfaces once the head is out a while, and keeps it up bobbing at the surface', () => {
    // Under for 2 s, rising under water from 1.4 s, then out (the head bobbing in and out at the surface).
    const { trace, stages } = read(5, (state) => body(state, -0.8), (state, time) => {
      if (time > 1.4 && time < 2.2) for (const point of state.points) point.y += 1 * STEP;
      state.swim.under = time < 2.2 || (time > 3 && Math.floor(time * 4) % 2 === 0);
    });
    const at = (time: number) => trace.find((entry) => entry.time >= time - 1e-9)!;
    expect(at(1.2).guard).toBeCloseTo(1, 6);
    expect(at(1.2).surfacing).toBe(0);
    // Rising under water: the arms overhead.
    expect(at(2).surfacing).toBeGreaterThan(0.9);
    // Out, then up: the shield lets go and the swimmer treads water.
    expect(at(3).surfaced).toBeGreaterThan(0.9);
    expect(at(3).guard).toBeLessThan(0.1);
    // Bobbing (the head under a quarter second at a time) keeps it up.
    expect(Math.min(...trace.filter((entry) => entry.time > 3).map((entry) => entry.surfaced))).toBeGreaterThan(0.9);
    expect(stages.surfacedAt).toBeGreaterThan(2.2);
  });

  it('looks round once up: to the board, then away for the next wave (a fixed scan), then back', () => {
    expect(fallLook(0)).toBe(0);
    expect(fallLook(1.4)).toBe(0);
    expect(fallLook(2.7)).toBeCloseTo(-75, 6);
    expect(fallLook(5)).toBe(0);
  });

  it('reels with the snapshot\'s bit, in 0.3 s, held through its flicker at the leash\'s reach', () => {
    const { trace } = read(2, (state) => body(state), (state, time) => {
      state.leash.reeling = time > 0.5 && (time < 1.2 || Math.floor(time * 10) % 2 === 0);
    });
    const at = (time: number) => trace.find((entry) => entry.time >= time - 1e-9)!;
    expect(at(0.45).reel).toBe(0);
    expect(at(0.5 + FALL_READING.reelIn + 0.02).reel).toBeCloseTo(1, 6);
    expect(Math.min(...trace.filter((entry) => entry.time > 1 && entry.time < 1.9).map((entry) => entry.reel))).toBeGreaterThan(0.9);
  });

  it('holds the board with the hold, and pulls on only with the chest over a deck facing up', () => {
    const holding = (deckUp: boolean) => read(1, (state) => {
      body(state);
      state.swim.holding = true;
      // The chest over the deck's middle.
      state.points[POINT.torso].set(0, 0.25, 0);
      if (!deckUp) state.boardQuaternion.setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
    });
    const up = holding(true);
    expect(up.weights.climb).toBeCloseTo(1, 6);
    expect(up.weights.pull).toBeCloseTo(1, 6);
    // Upside down (the hands still turning it), no pull: the chest is under it.
    expect(holding(false).weights.pull).toBe(0);
  });

  it('keeps the rail it holds while the chest wanders under the board', () => {
    const { stages } = read(1, (state) => {
      body(state);
      state.swim.holding = true;
      state.points[POINT.torso].set(0.6, -0.2, 0);
    }, (state, time) => {
      // The chest passes under the middle to just past the other rail.
      state.points[POINT.torso].x = 0.6 - 0.8 * Math.min(1, time / 0.8);
    });
    expect(stages.nearRail).toBe(1);
  });

  it('reaches for the board only up, calm and near it', () => {
    const near = (distance: number, under: boolean) => read(3, (state) => {
      body(state, 0);
      state.points.forEach((point) => point.setX(point.x - 1 + distance));
      state.swim.under = under;
    }).weights.reach;
    expect(near(0.6, false)).toBeCloseTo(1, 6);
    expect(near(2.5, false)).toBe(0);
  });

  it('reads nothing from a state standing still, and starts over after a gap', () => {
    const stages = new FallStages();
    const state = body(createRiderVisualState());
    state.separation = 'impact';
    stages.update(state);
    expect(stages.weights.shape).toBe('falls');
    state.clock = 1;
    state.separation = undefined;
    state.boardQuaternion.copy(new Quaternion());
    stages.update(state);
    expect(stages.weights.since).toBe(0);
    expect(stages.weights.shape).toBe('side');
  });
});
