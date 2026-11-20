import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { PlaneWater } from '../../physics/PlaneWater';
import { RideSession, type RideInput } from '../../physics/RideSession';
import { RIDER_SNAPSHOT, SWIM_BITS, writeRiderSnapshot } from '../../wave/SurfZoneRunner';
import { HumanoidRig } from './HumanoidRig';
import { POINT, createRiderVisualState, readRiderSnapshot } from './riderVisualState';
import { createTestHumanoid } from './testHumanoid';

const STEP = 1 / 60;
const idle: RideInput = { paddle: false, popUp: false, steer: 0 };
const SIDES = ['left', 'right'] as const;

/**
 * A swimmer floating beside its board, grabbing it and climbing on (swim-back, 2026-10-29): each step's drawn state,
 * as the page reads it from the snapshot, solved by the rig. `visit` sees the state, the rig and the session.
 */
function climb(visit: (state: ReturnType<typeof createRiderVisualState>, rig: HumanoidRig, session: RideSession) => void, seconds = 2.5): void {
  const session = new RideSession();
  const water = new PlaneWater({ depth: 3 });
  session.reset(new Vector3(), 0, water);
  session.separate('balance');
  for (let i = 0; i < 180; i += 1) session.step(STEP, water, idle);
  const torso = session.surfer.getPartPosition('torso', new Vector3());
  session.board.place(new Vector3(torso.x + 0.5, session.board.shape.centerOfMass.y - 0.03, torso.z), new Quaternion());
  session.surfer.heading = 0;
  const { bones } = createTestHumanoid();
  const rig = new HumanoidRig(bones);
  const state = createRiderVisualState();
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  const board = new Float64Array(8);
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    session.step(STEP, water, { ...idle, popUp: i === 0 });
    writeRiderSnapshot(session, false, rider, new Vector3());
    session.board.position.toArray(board, 0);
    session.board.orientation.toArray(board, 3);
    readRiderSnapshot(rider, board, state);
    state.clock = (i + 1) * STEP;
    rig.solve(state);
    visit(state, rig, session);
  }
}

describe('the drawn climb back onto the board (swim-back)', () => {
  it('carries the snapshot\'s climbing bit while the physics climbs, and only then', () => {
    let climbing = 0;
    climb((state, _rig, session) => {
      expect(state.swim.climbing).toBe(session.rider.climbingOn);
      if (state.swim.climbing) climbing += 1;
    });
    expect(climbing).toBeGreaterThan(50);
    expect(SWIM_BITS.climbing).toBe(8);
  });

  it('draws the body coming on from the water as the physics carries it: the hips by their point, the hands on the rails', () => {
    let seen = 0;
    climb((state, rig, session) => {
      if (!session.rider.climbingOn) return;
      seen += 1;
      // The drawn hips stay with the physics' pelvis through the climb, from beside the board in the water up onto the
      // deck (no snap onto it as it begins; measured within 5 cm).
      const hips = rig.joints.hip.left.clone().lerp(rig.joints.hip.right, 0.5);
      expect(hips.distanceTo(state.points[POINT.pelvis]), `at ${state.clock.toFixed(2)} s`).toBeLessThan(0.12);
      // The wrists on the rails, where the physics puts the hands.
      for (const side of SIDES) {
        const hand = state.points[side === 'left' ? POINT.leftHand : POINT.rightHand];
        expect(rig.joints.wrist[side].distanceTo(hand), `${side} at ${state.clock.toFixed(2)} s`).toBeLessThan(0.1);
      }
    });
    expect(seen).toBeGreaterThan(50);
  });

  it('ends lying on the deck', () => {
    let last: Vector3 | undefined;
    let deck = 0;
    climb((_state, rig, session) => {
      if (session.rider.attached && !session.rider.climbingOn) {
        last = rig.joints.hip.left.clone().lerp(rig.joints.hip.right, 0.5);
        deck = session.board.position.y;
      }
    }, 3);
    expect(last).toBeDefined();
    expect(Math.abs(last!.y - deck)).toBeLessThan(0.35);
  });
});
