import { describe, expect, it } from 'vitest';
import { RIDER_PHASES, SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import { POSE_BYTES, createPose, encodeBundle, encodePose, type SurferPose } from './poseCodec';
import { RemoteSurfers, VANISH_SECONDS, createRemoteState } from './RemoteSurfers';

const look = { body: 'surfer1', outfit: 'fullsuit', color: 'teal', board: 'classic' };
const PUSH = RIDER_PHASES.indexOf('push');
const LANDING = RIDER_PHASES.indexOf('landing');
const STANDING = RIDER_PHASES.indexOf('standing');
const FALLEN = RIDER_PHASES.indexOf('fallen');

/** A pose whose rider's points all sit at `point` from the board. */
function riderAt(step: number, x: number, phase: number, point: number): Uint8Array {
  const pose = createPose();
  Object.assign(pose, { step, x, z: -100, lift: 0.1, qx: 0, qy: 0, qz: 0, qw: 1, phase, present: true, boardPresent: true, heading: 0.5 });
  pose.points.fill(point);
  const bytes = new Uint8Array(POSE_BYTES);
  encodePose(pose, new DataView(bytes.buffer), 0);
  return bytes;
}

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

  it('never blends the rider across a fall: the nearer pose\'s points, on the board as it glides on', () => {
    // Across the fall the points change meaning (the hands' and feet's tips, then the limbs' centres), as locally.
    const remote = setup();
    remote.receiveBundle(bundle({ id: 1, pose: riderAt(600, 10, STANDING, 0.4) }), 0, []);
    remote.receiveBundle(bundle({ id: 1, pose: riderAt(603, 13, FALLEN, -0.2) }), 50, []);
    const state = createRemoteState();
    remote.sample(1, 601 * SURF_ZONE_STEP, state);
    expect(state.x).toBeCloseTo(11, 2);
    expect(state.phase).toBe(STANDING);
    expect(state.points[4]).toBeCloseTo(0.4, 3);
    remote.sample(1, 602 * SURF_ZONE_STEP, state);
    expect(state.x).toBeCloseTo(12, 2);
    expect(state.phase).toBe(FALLEN);
    expect(state.points[4]).toBeCloseTo(-0.2, 3);
    // The pop-up's landing: the feet jump from where the legs lay to the stance, in one step, as the phase switches.
    const up = setup();
    up.receiveBundle(bundle({ id: 1, pose: riderAt(600, 10, PUSH, -0.77) }), 0, []);
    up.receiveBundle(bundle({ id: 1, pose: riderAt(603, 10, LANDING, 0.1) }), 50, []);
    up.sample(1, 601 * SURF_ZONE_STEP, state);
    expect(state.points[4]).toBeCloseTo(-0.77, 3);
    up.sample(1, 602 * SURF_ZONE_STEP, state);
    expect(state.points[4]).toBeCloseTo(0.1, 3);
  });

  it('draws the newer pose whole across a teleport (a retry), never sweeping across the sea', () => {
    const remote = setup();
    remote.receiveBundle(bundle({ id: 1, pose: riderAt(600, 10, STANDING, 0.4) }), 0, []);
    remote.receiveBundle(bundle({ id: 1, pose: riderAt(603, 90, STANDING, 0.1) }), 50, []);
    const state = createRemoteState();
    remote.sample(1, 601 * SURF_ZONE_STEP, state);
    expect(state.x).toBeCloseTo(90, 2);
    expect(state.points[4]).toBeCloseTo(0.1, 3);
    // Past the newest pose, held where it is: not carried on at the teleport's 80 m in 50 ms.
    remote.sample(1, 606 * SURF_ZONE_STEP, state);
    expect(state.x).toBeCloseTo(90, 2);
  });

  it('curves the points through the neighbouring poses, so their speed carries on across each pose', () => {
    // A point accelerating evenly (a quadratic in time) is drawn on its curve between poses, not on the chords.
    const remote = setup();
    const at = (step: number) => ((step - 600) / 3) ** 2 * 0.01;
    for (const step of [600, 603, 606, 609]) remote.receiveBundle(bundle({ id: 1, pose: riderAt(step, 10, STANDING, at(step)) }), step, []);
    const state = createRemoteState();
    remote.sample(1, 604.5 * SURF_ZONE_STEP, state);
    expect(state.points[4]).toBeCloseTo(at(604.5), 5);
    // At the ends, with no neighbour beyond, the slope is the chord's: between the curve and the chord.
    remote.sample(1, 601.5 * SURF_ZONE_STEP, state);
    expect(state.points[4]).toBeGreaterThan(at(601.5));
    expect(state.points[4]).toBeLessThan((at(600) + at(603)) / 2);
    // Past a neighbour across a phase switch, the same: with a steady point, the chord.
    const fell = setup();
    fell.receiveBundle(bundle({ id: 1, pose: riderAt(600, 10, FALLEN, 5) }), 0, []);
    fell.receiveBundle(bundle({ id: 1, pose: riderAt(603, 10, STANDING, 0.1) }), 50, []);
    fell.receiveBundle(bundle({ id: 1, pose: riderAt(606, 10, STANDING, 0.2) }), 100, []);
    fell.sample(1, 604.5 * SURF_ZONE_STEP, state);
    expect(state.points[4]).toBeCloseTo(0.15, 5);
  });

  it('never overshoots a quick move: the point rests before it and after it', () => {
    // 5 cm in 50 ms along each axis, 1.7 m/s: motion, drawn on the curve, held within the poses.
    const remote = setup();
    for (const [step, point] of [[600, 0], [603, 0], [606, 0.05], [609, 0.05]]) {
      remote.receiveBundle(bundle({ id: 1, pose: riderAt(step, 10, STANDING, point) }), step, []);
    }
    const state = createRemoteState();
    for (let step = 600.25; step < 609; step += 0.25) {
      remote.sample(1, step * SURF_ZONE_STEP, state);
      if (step <= 603) expect(state.points[4], `${step}`).toBeCloseTo(0, 6);
      else if (step >= 606) expect(state.points[4], `${step}`).toBeCloseTo(0.05, 6);
      else {
        expect(state.points[4], `${step}`).toBeGreaterThan(0);
        expect(state.points[4], `${step}`).toBeLessThan(0.05);
      }
    }
  });

  it('draws a point\'s jump at once, mid-way between the poses, as the local track draws it within a step', () => {
    // The hand's reach to the water: 0.7 m within a step (14 m/s over the 50 ms between poses), the other points still.
    // Spread over the poses' 50 ms, the drawn body's smoothing would take it for motion and snap the arm down.
    const remote = setup();
    const poses: [number, number][] = [[597, 0], [600, 0], [603, 0], [606, 0.7], [609, 0.7], [612, 0.7]];
    for (const [step, hand] of poses) {
      const pose = createPose();
      Object.assign(pose, { step, x: 10, z: -100, lift: 0.1, qx: 0, qy: 0, qz: 0, qw: 1, phase: STANDING, present: true, boardPresent: true, heading: 0.5 });
      pose.points[9] = hand;
      pose.points[4] = (step - 600) * 0.01;
      const bytes = new Uint8Array(POSE_BYTES);
      encodePose(pose, new DataView(bytes.buffer), 0);
      remote.receiveBundle(bundle({ id: 1, pose: bytes }), step, []);
    }
    const state = createRemoteState();
    remote.sample(1, 604.25 * SURF_ZONE_STEP, state);
    expect(state.points[9]).toBeCloseTo(0, 6);
    expect(state.points[4]).toBeCloseTo(0.0425, 5);
    remote.sample(1, 604.75 * SURF_ZONE_STEP, state);
    expect(state.points[9]).toBeCloseTo(0.7, 6);
    // Either side, the hand rests: the jump bends neither neighbour's curve.
    for (const step of [601, 602, 607, 608]) {
      remote.sample(1, step * SURF_ZONE_STEP, state);
      expect(state.points[9], `${step}`).toBeCloseTo(step < 604 ? 0 : 0.7, 6);
    }
    // Fallen, the points are measured from a board tumbling away: no jump is read from them, they are blended.
    const fell = setup();
    for (const [step, point] of [[600, 0], [603, 0], [606, 0.7], [609, 0.7]]) {
      fell.receiveBundle(bundle({ id: 1, pose: riderAt(step, 10, FALLEN, point) }), step, []);
    }
    fell.sample(1, 604.25 * SURF_ZONE_STEP, state);
    expect(state.points[9]).toBeGreaterThan(0.01);
    expect(state.points[9]).toBeLessThan(0.35);
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
