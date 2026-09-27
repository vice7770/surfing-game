import { describe, expect, it } from 'vitest';
import { SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import { POSE_BYTES, createPose, encodeBundle, encodePose, type SurferPose } from './poseCodec';
import { RemoteSurfers, VANISH_SECONDS, createRemoteState } from './RemoteSurfers';

const look = { body: 'surfer1', outfit: 'fullsuit', color: 'teal', board: 'classic' };

function poseAt(step: number, x: number, extra: Partial<SurferPose> = {}): Uint8Array {
  const pose = createPose();
  Object.assign(pose, { step, x, z: -100, lift: 0.1, qx: 0, qy: 0, qz: 0, qw: 1, phase: 0, present: true, boardPresent: true, heading: 0.5 }, extra);
  pose.points[0] = x / 10;
  const bytes = new Uint8Array(POSE_BYTES);
  encodePose(pose, new DataView(bytes.buffer), 0);
  return bytes;
}

function bundle(...entries: { id: number; pose: Uint8Array }[]): ArrayBuffer {
  return encodeBundle(entries).buffer as ArrayBuffer;
}

function setup() {
  const remote = new RemoteSurfers();
  remote.join({ id: 1, name: 'Ana', look });
  remote.join({ id: 2, name: 'Bea', look });
  return remote;
}

describe('RemoteSurfers', () => {
  it('has nothing to draw before a player\'s first pose', () => {
    const remote = setup();
    expect(remote.sample(1, 10, createRemoteState())).toBe(false);
    expect(remote.ids()).toEqual([1, 2]);
  });

  it('interpolates between the two poses around the time asked', () => {
    const remote = setup();
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(600, 10) }), 0, []);
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(606, 20, { qy: 1, qw: 1, heading: 0.7 }) }), 50, []);
    const state = createRemoteState();
    expect(remote.sample(1, 603 * SURF_ZONE_STEP, state)).toBe(true);
    expect(state.x).toBeCloseTo(15, 2);
    expect(state.points[0]).toBeCloseTo(1.5, 2);
    expect(state.lift).toBeCloseTo(0.1, 3);
    expect(state.heading).toBeCloseTo(0.6, 3);
    // Halfway from no turn to a quarter turn about y: an eighth turn, normalised.
    expect(state.quaternion[1]).toBeCloseTo(Math.sin(Math.PI / 8), 2);
    expect(Math.hypot(...state.quaternion)).toBeCloseTo(1, 6);
  });

  it('holds the first pose before it, and extrapolates past the last for 0.25 s at most', () => {
    const remote = setup();
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(600, 10) }), 0, []);
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(606, 16) }), 50, []);
    const state = createRemoteState();
    remote.sample(1, 500 * SURF_ZONE_STEP, state);
    expect(state.x).toBeCloseTo(10, 2);
    // 1 m per step: 6 steps (0.1 s) past the last pose.
    remote.sample(1, 612 * SURF_ZONE_STEP, state);
    expect(state.x).toBeCloseTo(22, 1);
    remote.sample(1, 700 * SURF_ZONE_STEP, state);
    expect(state.x).toBeCloseTo(16 + 15, 1);
  });

  it('drops a pose older than the newest, and poses from strangers', () => {
    const remote = setup();
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(606, 20) }), 0, []);
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(600, 10) }, { id: 9, pose: poseAt(600, 10) }), 10, []);
    const state = createRemoteState();
    remote.sample(1, 600 * SURF_ZONE_STEP, state);
    expect(state.x).toBeCloseTo(20, 2);
    expect(remote.sample(9, 600 * SURF_ZONE_STEP, state)).toBe(false);
  });

  it('hides a player not heard from in 5 s, and shows them again when they are', () => {
    const remote = setup();
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(600, 10) }, { id: 2, pose: poseAt(600, 5) }), 0, []);
    remote.receiveBundle(bundle({ id: 2, pose: poseAt(900, 5) }), 4000, []);
    expect(remote.prune(VANISH_SECONDS * 1000 - 1)).toEqual([]);
    expect(remote.prune(VANISH_SECONDS * 1000 + 1)).toEqual([1]);
    expect(remote.sample(1, 600 * SURF_ZONE_STEP, createRemoteState())).toBe(false);
    expect(remote.sample(2, 900 * SURF_ZONE_STEP, createRemoteState())).toBe(true);
    expect(remote.latestPositions()).toEqual([{ x: 5, z: -100 }]);
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(1200, 30) }), 6000, []);
    expect(remote.sample(1, 1200 * SURF_ZONE_STEP, createRemoteState())).toBe(true);
  });

  it('collects each new pose\'s push on the water once', () => {
    const remote = setup();
    const reactions: number[] = [];
    const push = { reaction: { x: 3, z: -90, jx: 12, jz: -4 } };
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(600, 10, push) }), 0, reactions);
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(600, 10, push) }), 10, reactions);
    remote.receiveBundle(bundle({ id: 2, pose: poseAt(600, 10) }), 10, reactions);
    expect(reactions).toEqual([3, -90, 12, -4]);
  });

  it('forgets a player who leaves', () => {
    const remote = setup();
    remote.receiveBundle(bundle({ id: 1, pose: poseAt(600, 10) }), 0, []);
    remote.leave(1);
    expect(remote.ids()).toEqual([2]);
    expect(remote.sample(1, 600 * SURF_ZONE_STEP, createRemoteState())).toBe(false);
    expect(remote.info(2)?.name).toBe('Bea');
  });
});
