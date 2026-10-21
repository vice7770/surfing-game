import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { PlaneWater } from '../../physics/PlaneWater';
import { RideSession } from '../../physics/RideSession';
import { RIDER_SNAPSHOT, writeRiderSnapshot } from '../../wave/SurfZoneRunner';
import { FallenSides, fallenFrame } from './fallenSides';
import { POINT, createRiderVisualState, readRiderSnapshot } from './riderVisualState';

const STEP = 1 / 60;

/** A ride session's drawn states, step by step, from riding or lying on a still board to a fall at 0.5 s. */
function fall(phase: 'standing' | 'prone', visit: (state: ReturnType<typeof createRiderVisualState>) => void, seconds = 2): void {
  const session = new RideSession();
  const water = new PlaneWater();
  session.place({ x: 0, z: 0, heading: 0, speed: phase === 'standing' ? 7 : 0, phase }, water);
  const state = createRiderVisualState();
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  const board = new Float64Array(8);
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    if (i === 30) session.separate('balance');
    session.step(STEP, water, { paddle: false, popUp: false, steer: 0 });
    writeRiderSnapshot(session, false, rider, new Vector3());
    session.board.position.toArray(board, 0);
    session.board.orientation.toArray(board, 3);
    readRiderSnapshot(rider, board, state);
    state.clock = (i + 1) * STEP;
    visit(state);
  }
}

/** How far the left point lies to the drawn body's left of the right one, m (arms or legs). */
function spread(state: ReturnType<typeof createRiderVisualState>, left: number, right: number): number {
  const up = state.points[POINT.torso].clone().sub(state.points[POINT.pelvis]).normalize();
  const forward = fallenFrame(state, up, new Vector3());
  return state.points[left].clone().sub(state.points[right]).dot(new Vector3().crossVectors(up, forward));
}

describe('the fallen body\'s limbs by side (the animation-realism plan, phase 4)', () => {
  it('finds the fall body\'s arm and leg points the other way round across the drawn body', () => {
    // The fall body builds its left arm and leg at the rider's frame's −x: the drawn body's right, facing its heading.
    for (const phase of ['standing', 'prone'] as const) {
      let seen = false;
      fall(phase, (state) => {
        if (state.phase !== 'fallen' || seen) return;
        seen = true;
        expect(spread(state, POINT.leftHand, POINT.rightHand), phase).toBeLessThan(-0.3);
        expect(spread(state, POINT.leftFoot, POINT.rightFoot), phase).toBeLessThan(-0.2);
      });
      expect(seen).toBe(true);
    }
  });

  it('trades them by side before anything draws them, and leaves a body riding as it is', () => {
    for (const phase of ['standing', 'prone'] as const) {
      const sides = new FallenSides();
      let fallen = 0;
      fall(phase, (state) => {
        const before = state.points.map((point) => point.clone());
        sides.apply(state);
        if (state.phase !== 'fallen') {
          state.points.forEach((point, i) => expect(point.equals(before[i])).toBe(true));
          return;
        }
        fallen += 1;
        expect(spread(state, POINT.leftHand, POINT.rightHand), `${phase} at ${state.clock.toFixed(2)} s`).toBeGreaterThan(-0.1);
        expect(spread(state, POINT.leftFoot, POINT.rightFoot), `${phase} at ${state.clock.toFixed(2)} s`).toBeGreaterThan(-0.06);
        // Traded, not moved: the same points.
        expect(state.points[POINT.leftHand].equals(before[POINT.rightHand]) || state.points[POINT.leftHand].equals(before[POINT.leftHand])).toBe(true);
      });
      expect(fallen).toBeGreaterThan(60);
    }
  });

  it('keeps its sides with the body side on, within the margin', () => {
    const sides = new FallenSides();
    const state = createRiderVisualState();
    state.phase = 'fallen';
    state.heading = 0;
    const set = (armSpread: number) => {
      state.points[POINT.pelvis].set(0, 0, 0);
      state.points[POINT.torso].set(0, 0.35, 0);
      state.points[POINT.head].set(0, 0.7, 0);
      // Facing +z with its left at +x: the left arm point `armSpread`/2 to the left of the middle.
      state.points[POINT.leftHand].set(armSpread / 2, 0.3, 0);
      state.points[POINT.rightHand].set(-armSpread / 2, 0.3, 0);
      state.points[POINT.leftFoot].set(0.15, -0.5, 0);
      state.points[POINT.rightFoot].set(-0.15, -0.5, 0);
    };
    set(-0.7);
    sides.apply(state);
    expect(sides.arms).toBe(true);
    // Side on (within the margin), the trade holds; well past it the other way, it lets go.
    for (const armSpread of [-0.08, 0, 0.08]) {
      state.clock += STEP;
      set(armSpread);
      sides.apply(state);
      expect(sides.arms, `at ${armSpread} m`).toBe(true);
    }
    set(0.3);
    sides.apply(state);
    expect(sides.arms).toBe(false);
    expect(sides.legs).toBe(false);
  });
});
