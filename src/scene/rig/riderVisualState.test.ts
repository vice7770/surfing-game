import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { PlaneWater } from '../../physics/PlaneWater';
import { RideSession } from '../../physics/RideSession';
import { LEASH_BITS, RIDER_SNAPSHOT, SWIM_BITS, writeRiderSnapshot } from '../../wave/SurfZoneRunner';
import { BONES, REQUIRED_BONES } from './humanoidBones';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState, readRiderSnapshot } from './riderVisualState';
import { createTestHumanoid } from './testHumanoid';

describe('rider visual state', () => {
  it('decodes the snapshot’s seven points, phase and heading, and the board’s pose', () => {
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    for (let i = 0; i < 21; i += 1) rider[i] = i;
    rider[RIDER_SNAPSHOT.phase] = 3;
    rider[RIDER_SNAPSHOT.heading] = 0.4;
    const board = [1, 2, 3, 0, 0, 0.6, 0.8, 1];
    const state = readRiderSnapshot(rider, board, createRiderVisualState());
    expect(state.points[POINT.head].toArray()).toEqual([6, 7, 8]);
    expect(state.points[POINT.rightFoot].toArray()).toEqual([18, 19, 20]);
    expect(state.phase).toBe('standing');
    expect(state.heading).toBe(0.4);
    expect(state.boardPosition.toArray()).toEqual([1, 2, 3]);
    expect(state.boardQuaternion.toArray()).toEqual([0, 0, 0.6, 0.8]);
  });

  it('decodes the duck-dive, the leash and the swimmer (the wipeout spec)', () => {
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    rider[RIDER_SNAPSHOT.duck] = 0.7;
    rider.set([4, 5, 6], RIDER_SNAPSHOT.plug);
    rider[RIDER_SNAPSHOT.leash] = LEASH_BITS.worn | LEASH_BITS.reeling;
    rider[RIDER_SNAPSHOT.swim] = SWIM_BITS.stroking | SWIM_BITS.under;
    const state = readRiderSnapshot(rider, [0, 0, 0, 0, 0, 0, 1, 1], createRiderVisualState());
    expect(state.duck).toBe(0.7);
    expect(state.leash).toMatchObject({ worn: true, snapped: false, reeling: true });
    expect(state.leash.plug.toArray()).toEqual([4, 5, 6]);
    expect(state.swim).toEqual({ stroking: true, diving: false, under: true, holding: false, climbing: false });
    // On the board again, still climbing on (swim-back).
    rider[RIDER_SNAPSHOT.swim] = SWIM_BITS.climbing;
    expect(readRiderSnapshot(rider, [0, 0, 0, 0, 0, 0, 1, 1], createRiderVisualState()).swim.climbing).toBe(true);
  });

  it('leaves the hold, the fall\'s cause and the cord\'s drawn grip to whoever draws (none in the snapshot: the animation-realism plan\'s phase 4)', () => {
    const state = createRiderVisualState();
    state.swim.holding = true;
    state.separation = 'impact';
    state.leash.gripped = true;
    state.stance = 'goofy';
    readRiderSnapshot(new Float64Array(RIDER_SNAPSHOT.length), [0, 0, 0, 0, 0, 0, 1, 1], state);
    expect(state.swim.holding).toBe(false);
    expect(state.separation).toBeUndefined();
    expect(state.leash.gripped).toBe(false);
    // The stance is the player's setting: kept.
    expect(state.stance).toBe('goofy');
  });

  it('decodes the upper body\'s twist, and reads none from a snapshot made before it (the movement-flow spec)', () => {
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    rider[RIDER_SNAPSHOT.twist] = 0.5;
    expect(readRiderSnapshot(rider, [0, 0, 0, 0, 0, 0, 1, 1], createRiderVisualState()).twist).toBe(0.5);
    expect(readRiderSnapshot(new Float64Array(RIDER_SNAPSHOT.twist), [0, 0, 0, 0, 0, 0, 1, 1], createRiderVisualState()).twist).toBe(0);
  });

  it('decodes the weight the rider feels, and none from a snapshot made before it (the phase-5 physics plan\'s W1)', () => {
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    rider[RIDER_SNAPSHOT.weight] = 0.3;
    expect(readRiderSnapshot(rider, [0, 0, 0, 0, 0, 0, 1, 1], createRiderVisualState()).weight).toBe(0.3);
    expect(readRiderSnapshot(new Float64Array(RIDER_SNAPSHOT.weight), [0, 0, 0, 0, 0, 0, 1, 1], createRiderVisualState()).weight).toBeNaN();
    expect(createRiderVisualState().weight).toBeNaN();
  });

  it('carries the physics\' weight through the snapshot: standing, the feet\'s pressure smoothed; lying, none', () => {
    const water = new PlaneWater();
    const snapshot = new Float64Array(RIDER_SNAPSHOT.length);
    const read = (phase: 'standing' | 'prone') => {
      const session = new RideSession({ stance: 'regular' });
      session.place({ x: 0, z: 0, heading: 0, speed: phase === 'standing' ? 7 : 0, phase }, water);
      for (let i = 0; i < 30; i += 1) session.step(1 / 60, water, { paddle: false, popUp: false, steer: 0, trim: phase === 'standing' ? 1 : 0 });
      writeRiderSnapshot(session, false, snapshot, new Vector3());
      return { session, state: readRiderSnapshot(snapshot, [0, 0, 0, 0, 0, 0, 1, 1], createRiderVisualState()) };
    };
    const standing = read('standing');
    expect(standing.state.weight).toBe(standing.session.rider.contact.weight);
    // W held half a second: the smoothed pressure lags the instant's, on its way to the front foot.
    expect(standing.state.weight).toBeGreaterThan(0.5);
    expect(read('prone').state.weight).toBeNaN();
  });

  it('puts a standing regular rider’s left foot forward on the deck, and a goofy rider’s right', () => {
    const regular = posturePoints('standing', 'regular', new Vector3(), new Quaternion(), createRiderVisualState());
    expect(regular.points[POINT.leftFoot].z).toBeGreaterThan(regular.points[POINT.rightFoot].z);
    expect(regular.points[POINT.leftFoot].y).toBeLessThan(0.1);
    expect(regular.points[POINT.head].y).toBeGreaterThan(1.2);
    const goofy = posturePoints('standing', 'goofy', new Vector3(), new Quaternion(), createRiderVisualState());
    expect(goofy.points[POINT.rightFoot].z).toBeGreaterThan(goofy.points[POINT.leftFoot].z);
  });

  it('carries the posture with the board’s pose', () => {
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    const at = new Vector3(10, 0.2, -30);
    const level = posturePoints('prone', 'regular', new Vector3(), new Quaternion(), createRiderVisualState());
    const moved = posturePoints('prone', 'regular', at, turn, createRiderVisualState());
    const expected = level.points[POINT.head].clone().applyQuaternion(turn).add(at);
    expect(moved.points[POINT.head].distanceTo(expected)).toBeLessThan(1e-9);
  });

  it('builds a test skeleton with every bone the rig needs', () => {
    const { bones } = createTestHumanoid();
    for (const name of REQUIRED_BONES) expect(bones.has(name), name).toBe(true);
    expect(bones.get(BONES.hips)!.getWorldPosition(new Vector3()).y).toBeCloseTo(0.95, 9);
  });
});
