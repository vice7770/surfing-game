import { Quaternion, Vector3 } from 'three';
import { SnapshotTrack } from '../game/snapshotTrack';
import { PlaneWater } from '../physics/PlaneWater';
import { RideSession, type RideInput, type RiderPlacement } from '../physics/RideSession';
import type { SurfWater } from '../physics/SurfWater';
import { HumanoidRig } from '../scene/rig/HumanoidRig';
import { PosedBody, type PosedBodyOptions } from '../scene/rig/posedBody';
import { BONES, type Side } from '../scene/rig/humanoidBones';
import { RiderMotion } from '../scene/rig/riderMotion';
import { createRiderVisualState, readRiderSnapshot } from '../scene/rig/riderVisualState';
import { createTestHumanoid } from '../scene/rig/testHumanoid';
import { RIDER_SNAPSHOT, writeRiderSnapshot } from '../wave/SurfZoneRunner';

/**
 * The body film (the riding-body plan, step 1): the real ride session stepped
 * at the game's fixed 60 Hz, drawn through the page's pipeline at a display
 * rate, with every drawn frame's joints recorded, to measure how fluid the body
 * is: pops at its switches, frames drawn again, uneven travel, the board's
 * wobble in the chest, and the drawing's lag behind the physics.
 */

const STEP = 1 / 60;
const SIDES: readonly Side[] = ['left', 'right'];
/** The bones whose turn rates the film measures: the trunk, the head and the limbs' upper and lower segments. */
const MEASURED_BONES = [
  BONES.hips, BONES.spine[2], BONES.head,
  ...SIDES.flatMap((side) => [BONES.arm[side], BONES.foreArm[side], BONES.upLeg[side], BONES.leg[side]]),
];

export interface FilmFrame {
  /** Display time, s. */
  time: number;
  phase: string;
  /** The physics board moves faster than 0.5 m/s. */
  moving: boolean;
  /** Since the last frame: a phase change, or a drawn point jumping more than 0.1 m against the board in one step. */
  switched: boolean;
  fallen: boolean;
  /** The drawn joints relative to the drawn board, in its frame, m. */
  joints: Vector3[];
  /** The drawn joints relative to the drawn hips, in the world's axes, m. */
  limbs: Vector3[];
  /** The drawn hips and board in the world, m. */
  hips: Vector3;
  board: Vector3;
  /** The measured bones' world rotations relative to the drawn board, and in the world. */
  bones: Quaternion[];
  worldBones: Quaternion[];
  /** The drawn chest's roll across the board's heading, rad, and the physics' own (its torso point over its pelvis). */
  chestRoll: number;
  physicsRoll: number;
}

export interface BodyFilm {
  /** Display rate, Hz. */
  rate: number;
  frames: FilmFrame[];
}

export interface SwitchSpeed {
  time: number;
  phase: string;
  /** The fastest drawn joint within the switch's window, m/s: against the board, or against the hips when fallen. */
  jointSpeed: number;
  /** The fastest turning measured bone within the window, rad/s. */
  rotationSpeed: number;
}

const angleBetween = (a: Quaternion, b: Quaternion) => 2 * Math.acos(Math.min(1, Math.abs(a.dot(b))));

/**
 * At each switch, the fastest joint and bone within `window` s either side:
 * against the board while riding, about the hips once either frame is fallen.
 */
export function switchSpeeds(film: BodyFilm, window = 0.3): SwitchSpeed[] {
  const { frames, rate } = film;
  const reach = Math.round(window * rate);
  const speeds: SwitchSpeed[] = [];
  frames.forEach((frame, index) => {
    if (!frame.switched) return;
    let jointSpeed = 0;
    let rotationSpeed = 0;
    for (let t = Math.max(1, index - reach); t <= Math.min(frames.length - 1, index + reach); t += 1) {
      const before = frames[t - 1];
      const now = frames[t];
      const riding = !before.fallen && !now.fallen;
      const positions = riding ? [before.joints, now.joints] : [before.limbs, now.limbs];
      positions[1].forEach((joint, j) => { jointSpeed = Math.max(jointSpeed, joint.distanceTo(positions[0][j]) * rate); });
      const rotations = riding ? [before.bones, now.bones] : [before.worldBones, now.worldBones];
      rotations[1].forEach((bone, b) => { rotationSpeed = Math.max(rotationSpeed, angleBetween(bone, rotations[0][b]) * rate); });
    }
    speeds.push({ time: frame.time, phase: frame.phase, jointSpeed, rotationSpeed });
  });
  return speeds;
}

/**
 * At each switch, the largest one-frame spike within `window` s either side:
 * a joint's (or bone's) speed in a frame over the median of its speeds in the
 * three frames either side. A pop spikes; the physics' own transitions (a
 * lie-down moving the feet at 6 m/s over 0.6 s) do not.
 */
export function switchSpikes(film: BodyFilm, window = 0.3): SwitchSpeed[] {
  const { frames, rate } = film;
  const reach = Math.round(window * rate);
  // Every frame's speed of each joint and bone (against the board, or about the hips once fallen).
  const joints = frames.map((now, t) => {
    if (t === 0) return now.joints.map(() => 0);
    const before = frames[t - 1];
    const riding = !before.fallen && !now.fallen;
    const [a, b] = riding ? [before.joints, now.joints] : [before.limbs, now.limbs];
    return b.map((joint, j) => joint.distanceTo(a[j]) * rate);
  });
  const bones = frames.map((now, t) => {
    if (t === 0) return now.bones.map(() => 0);
    const before = frames[t - 1];
    const riding = !before.fallen && !now.fallen;
    const [a, b] = riding ? [before.bones, now.bones] : [before.worldBones, now.worldBones];
    return b.map((bone, j) => angleBetween(bone, a[j]) * rate);
  });
  const spike = (series: number[][], t: number, j: number) => {
    const around: number[] = [];
    for (let k = t - 3; k <= t + 3; k += 1) if (k !== t && k >= 1 && k < series.length) around.push(series[k][j]);
    around.sort((x, y) => x - y);
    const median = around.length ? around[Math.floor(around.length / 2)] : 0;
    return series[t][j] - median;
  };
  const spikes: SwitchSpeed[] = [];
  frames.forEach((frame, index) => {
    if (!frame.switched) return;
    let jointSpeed = 0;
    let rotationSpeed = 0;
    for (let t = Math.max(1, index - reach); t <= Math.min(frames.length - 1, index + reach); t += 1) {
      joints[t].forEach((_, j) => { jointSpeed = Math.max(jointSpeed, spike(joints, t, j)); });
      bones[t].forEach((_, j) => { rotationSpeed = Math.max(rotationSpeed, spike(bones, t, j)); });
    }
    spikes.push({ time: frame.time, phase: frame.phase, jointSpeed, rotationSpeed });
  });
  return spikes;
}

/** The share of frames, while the rider moves, drawn with the hips exactly where the frame before drew them. */
export function repeatedFrames(film: BodyFilm): number {
  let moving = 0;
  let repeated = 0;
  for (let t = 1; t < film.frames.length; t += 1) {
    if (!film.frames[t].moving) continue;
    moving += 1;
    if (film.frames[t].hips.distanceTo(film.frames[t - 1].hips) < 1e-9) repeated += 1;
  }
  return moving ? repeated / moving : 0;
}

/**
 * How unevenly the drawn board travels over the water from frame to frame while
 * it moves: each frame's level travel against the mean of its neighbours', RMS,
 * over the mean travel. A board speeding up or slowing down steadily reads 0.
 */
export function unevenness(film: BodyFilm): number {
  const travel: number[] = [];
  for (let t = 1; t < film.frames.length; t += 1) {
    const [now, before] = [film.frames[t].board, film.frames[t - 1].board];
    if (film.frames[t].moving) travel.push(Math.hypot(now.x - before.x, now.z - before.z));
  }
  if (travel.length < 3) return 0;
  const mean = travel.reduce((a, b) => a + b, 0) / travel.length;
  if (mean <= 0) return 0;
  let sum = 0;
  for (let i = 1; i < travel.length - 1; i += 1) sum += (travel[i] - (travel[i - 1] + travel[i + 1]) / 2) ** 2;
  return Math.sqrt(sum / (travel.length - 2)) / mean;
}

/**
 * The RMS, rad, of `values` (sampled at `rate`) between `low` and `high` Hz:
 * a DFT of the signal less its straight-line trend, under a Hann window (its
 * energy corrected), so a slow lean through the window leaks little into the band.
 */
export function bandRms(values: readonly number[], rate: number, low: number, high: number): number {
  const n = values.length;
  if (n < 4) return 0;
  // Least squares: a slow lean ramping through the window would otherwise leak into every band.
  const tMean = (n - 1) / 2;
  const vMean = values.reduce((a, b) => a + b, 0) / n;
  let covariance = 0;
  let spread = 0;
  for (let i = 0; i < n; i += 1) {
    covariance += (i - tMean) * (values[i] - vMean);
    spread += (i - tMean) ** 2;
  }
  const slope = covariance / spread;
  const hann = (i: number) => 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  const residual = values.map((value, i) => (value - vMean - slope * (i - tMean)) * hann(i));
  let energy = 0;
  for (let i = 0; i < n; i += 1) energy += hann(i) ** 2;
  let power = 0;
  for (let k = 1; k < n / 2; k += 1) {
    const frequency = (k * rate) / n;
    if (frequency < low || frequency > high) continue;
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i += 1) {
      const angle = (-2 * Math.PI * k * i) / n;
      re += residual[i] * Math.cos(angle);
      im += residual[i] * Math.sin(angle);
    }
    power += (2 * (re * re + im * im)) / (n * n);
  }
  return Math.sqrt(power / (energy / n));
}

/** The drawn chest's roll in the board's wobble band (1.5–4 Hz), RMS, rad. */
export function shake(film: BodyFilm, low = 1.5, high = 4): number {
  return bandRms(film.frames.map((frame) => frame.chestRoll), film.rate, low, high);
}

/**
 * How far the drawn chest's roll trails the physics' own, s: the shift, up to
 * `most` s, that brings them closest (least mean squared difference), refined
 * between frames by a parabola through the best and its neighbours.
 */
export function drawnLag(film: BodyFilm, most = 0.3): number {
  const physics = film.frames.map((frame) => frame.physicsRoll);
  const drawn = film.frames.map((frame) => frame.chestRoll);
  const shifts = Math.round(most * film.rate);
  const misfit: number[] = [];
  for (let lag = 0; lag <= shifts; lag += 1) {
    let sum = 0;
    let count = 0;
    for (let t = 0; t + lag < physics.length; t += 1) {
      sum += (drawn[t + lag] - physics[t]) ** 2;
      count += 1;
    }
    misfit.push(count ? sum / count : Infinity);
  }
  let best = 0;
  for (let lag = 1; lag < misfit.length; lag += 1) if (misfit[lag] < misfit[best]) best = lag;
  let shift = best;
  if (best > 0 && best < misfit.length - 1) {
    const [a, b, c] = [misfit[best - 1], misfit[best], misfit[best + 1]];
    const curve = a - 2 * b + c;
    if (curve > 0) shift += (0.5 * (a - c)) / curve;
  }
  return shift / film.rate;
}

export interface FilmScenario {
  name: string;
  water: 'flat' | 'face';
  placement: RiderPlacement;
  seconds: number;
  /** The input at `time` s; it may also act on the session (a tow, a separation). */
  input(time: number, session: RideSession): Partial<RideInput>;
}

const FACE = (15 * Math.PI) / 180;
/** True in the one step nearest `at` s: a key pressed for a step. */
const once = (time: number, at: number) => Math.abs(time - at) < STEP / 2;

/** The film's scenarios: every switch of the riding body, and its steady riding. */
export const FILM_SCENARIOS: readonly FilmScenario[] = [
  {
    name: 'pop-up and landing', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' },
    input(time, session) {
      // Towed at 6 m/s until standing, as the wave would carry it.
      if (session.rider.attached && session.rider.phase !== 'standing') {
        session.board.velocity.z = 6;
        session.rider.velocity.z = 6;
      }
      return { popUp: once(time, 0.5) };
    },
  },
  { name: 'straight', water: 'flat', seconds: 3, placement: { x: 0, z: 0, heading: 0, speed: 7, phase: 'standing' }, input: () => ({}) },
  {
    // Compress taken mid-turn at 10 m/s (the stances spec's wobble case): the inside hand reaches for the water.
    name: 'compress mid-turn, the hand reaching', water: 'flat', seconds: 2, placement: { x: 0, z: 0, heading: 0, speed: 10, phase: 'standing' },
    input: (time) => ({ steer: time >= 0.3 ? 1 : 0, compress: time >= 0.8 ? 1 : 0 }),
  },
  {
    name: 'rail change', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 8, phase: 'standing' },
    input: (time) => ({ steer: time < 0.3 ? 0 : time < 0.9 ? -1 : 1 }),
  },
  {
    name: 'weave', water: 'flat', seconds: 4, placement: { x: 0, z: 0, heading: 0, speed: 8, phase: 'standing' },
    input: (time) => ({ steer: Math.sin(2 * Math.PI * 0.6 * time) >= 0 ? 1 : -1 }),
  },
  {
    name: 'lying back down', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 6, phase: 'standing' },
    input: (time) => ({ popUp: once(time, 1) }),
  },
  {
    name: 'a fall', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 7, phase: 'standing' },
    input(time, session) {
      if (once(time, 1) && session.rider.attached) session.separate('balance');
      return {};
    },
  },
];

/** One delivered snapshot: the sea time and the page's arrays. */
export interface FilmSnapshot {
  seaTime: number;
  rider: Float64Array;
  board: Float64Array;
}

/** The page's drawing of the rider from delivered snapshots, one display frame at a time. */
export interface FilmDrawer {
  /** A snapshot arrives from the physics. */
  deliver(snapshot: FilmSnapshot): void;
  /** Draw a frame `dt` s after the last: the rider's arrays to draw and the time to draw them at, or undefined for none yet. */
  frame(dt: number): { rider: ArrayLike<number>; board: ArrayLike<number>; time: number } | undefined;
}

/** Today's page: the newest snapshot as it is. */
export function latestDrawer(): FilmDrawer {
  let latest: FilmSnapshot | undefined;
  return {
    deliver(snapshot) { latest = snapshot; },
    frame: () => latest && { rider: latest.rider, board: latest.board, time: latest.seaTime },
  };
}

/** The page's local rider since the smoothing layer: drawn between snapshots on the simulated clock (`SnapshotTrack`). */
export function trackDrawer(): FilmDrawer {
  const track = new SnapshotTrack();
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  const board = new Float64Array(8);
  return {
    deliver(snapshot) { track.push(snapshot.seaTime, snapshot.rider, snapshot.board); },
    frame(dt) {
      const time = track.sample(dt, rider, board);
      return time === undefined ? undefined : { rider, board, time };
    },
  };
}

/** Poses the skeleton from a state (the rig, and whatever the page runs around it). */
export type FilmPose = (bones: Map<string, import('three').Bone>) => (state: ReturnType<typeof createRiderVisualState>) => void;

/** Today's posing: the rig alone. */
export const rigAlone: FilmPose = (bones) => {
  const rig = new HumanoidRig(bones);
  return (state) => rig.solve(state);
};

/** The page's posing (`PosedBody`: the rig and the smoothing layer), with its options. */
export const posed = (options?: PosedBodyOptions): FilmPose => (bones) => {
  const body = new PosedBody(bones, options);
  const hips = bones.get(BONES.hips)!;
  return (state) => {
    body.update(state);
    hips.updateMatrixWorld(true);
  };
};

export interface FilmOptions {
  /** Display rate, Hz. */
  rate: number;
  /** Physics steps per delivered snapshot: 1, or 3 for a worker whose replies arrive late and batched. */
  delivery?: number;
  drawer?: () => FilmDrawer;
  pose?: FilmPose;
}

function boardPose(session: RideSession, out: Float64Array): Float64Array {
  session.board.position.toArray(out, 0);
  session.board.orientation.toArray(out, 3);
  out[7] = 1;
  return out;
}

/** Runs `scenario` and films its drawn body. */
export function filmBody(scenario: FilmScenario, options: FilmOptions): BodyFilm {
  const delivery = options.delivery ?? 1;
  const water: SurfWater = scenario.water === 'face' ? new PlaneWater({ slopeZ: -Math.tan(FACE) }) : new PlaneWater();
  const session = new RideSession();
  session.place(scenario.placement, water);
  const drawer = (options.drawer ?? latestDrawer)();
  const { bones } = createTestHumanoid();
  const pose = (options.pose ?? rigAlone)(bones);
  const rig = poseRig(bones);
  const motion = new RiderMotion();
  const state = createRiderVisualState();
  const point = new Vector3();
  const measured = MEASURED_BONES.map((name) => bones.get(name)!);
  const film: BodyFilm = { rate: options.rate, frames: [] };
  let simTime = 0;
  let steps = 0;
  let accumulator = 0;
  let pending = false;
  let last: { phase: number; points: Vector3[] } | undefined;
  const deliver = () => {
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    writeRiderSnapshot(session, false, rider, point);
    const board = boardPose(session, new Float64Array(8));
    // A switch: a phase change, or a drawn point jumping against the board (the pelvis once fallen) in one step.
    const phase = rider[RIDER_SNAPSHOT.phase];
    const inverse = new Quaternion(board[3], board[4], board[5], board[6]).invert();
    const fallen = !session.rider.attached;
    const origin = fallen ? new Vector3().fromArray(rider, RIDER_SNAPSHOT.points) : new Vector3().fromArray(board, 0);
    const points = Array.from({ length: 7 }, (_, i) => new Vector3().fromArray(rider, RIDER_SNAPSHOT.points + i * 3).sub(origin).applyQuaternion(inverse));
    if (last && (phase !== last.phase || points.some((p, i) => p.distanceTo(last!.points[i]) > 0.1 * delivery))) pending = true;
    last = { phase, points };
    drawer.deliver({ seaTime: simTime, rider, board });
  };
  deliver();
  const frames = Math.round(scenario.seconds * options.rate);
  for (let f = 0; f < frames; f += 1) {
    accumulator += 1 / options.rate;
    let taken = 0;
    while (accumulator >= STEP - 1e-12 && taken < 3) {
      accumulator -= STEP;
      taken += 1;
      session.step(STEP, water, { paddle: false, popUp: false, steer: 0, ...scenario.input(simTime, session) });
      simTime += STEP;
      steps += 1;
      if (steps % delivery === 0) deliver();
    }
    const drawn = drawer.frame(1 / options.rate);
    if (!drawn) continue;
    readRiderSnapshot(drawn.rider, drawn.board, state);
    motion.update(state, drawn.time);
    state.clock = drawn.time;
    state.stroking = 0;
    pose(state);
    film.frames.push(record(f / options.rate, state, session, rig, measured, pending));
    pending = false;
  }
  return film;
}

/** The rig's measured joints, read from the posed skeleton's bones. */
function poseRig(bones: Map<string, import('three').Bone>) {
  const at = (name: string) => bones.get(name)!;
  return {
    joints: [
      ...SIDES.flatMap((side) => [BONES.upLeg[side], BONES.leg[side], BONES.foot[side], BONES.arm[side], BONES.foreArm[side], BONES.hand[side]]),
      BONES.head,
    ].map(at),
    hips: at(BONES.hips),
    chest: at(BONES.spine[2]),
  };
}

const UP = new Vector3(0, 1, 0);

function record(
  time: number, state: ReturnType<typeof createRiderVisualState>, session: RideSession,
  rig: ReturnType<typeof poseRig>, measured: import('three').Bone[], switched: boolean,
): FilmFrame {
  const boardPosition = state.boardPosition;
  const boardInverse = state.boardQuaternion.clone().invert();
  const hips = rig.hips.getWorldPosition(new Vector3());
  const world = rig.joints.map((bone) => bone.getWorldPosition(new Vector3()));
  const worldBones = measured.map((bone) => bone.getWorldQuaternion(new Quaternion()));
  // Across the board's heading, level.
  const forward = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0);
  if (forward.lengthSq() < 1e-9) forward.set(0, 0, 1);
  const across = new Vector3().crossVectors(UP, forward.normalize());
  const roll = (v: Vector3) => Math.atan2(v.dot(across), v.y);
  const chestUp = UP.clone().applyQuaternion(rig.chest.getWorldQuaternion(new Quaternion()));
  const torso = session.renderPoint(1, new Vector3()).sub(session.renderPoint(0, new Vector3()));
  return {
    time,
    phase: state.phase,
    moving: session.board.velocity.length() > 0.5,
    switched,
    fallen: state.phase === 'fallen',
    joints: world.map((p) => p.clone().sub(boardPosition).applyQuaternion(boardInverse)),
    limbs: world.map((p) => p.clone().sub(hips)),
    hips,
    board: boardPosition.clone(),
    bones: worldBones.map((q) => boardInverse.clone().multiply(q)),
    worldBones,
    chestRoll: roll(chestUp),
    physicsRoll: roll(torso),
  };
}
