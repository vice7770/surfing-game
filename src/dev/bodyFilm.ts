import { Quaternion, Vector3 } from 'three';
import { SnapshotTrack } from '../game/snapshotTrack';
import { INTERPOLATION_DELAY, RemoteSurfers, createRemoteState } from '../net/RemoteSurfers';
import { OwnPoseTracker } from '../net/ownPose';
import { POSE_BYTES, createPose, encodeBundle, encodePose } from '../net/poseCodec';
import { POSE_HZ } from '../net/protocol';
import { PlaneWater } from '../physics/PlaneWater';
import type { WaterSample } from '../physics/SurfWater';
import { RideSession, type RideInput, type RiderPlacement } from '../physics/RideSession';
import type { SurfWater } from '../physics/SurfWater';
import { HumanoidRig } from '../scene/rig/HumanoidRig';
import { remoteBoardPose, remoteRiderState } from '../scene/RemoteSurferViews';
import { PosedBody, type PosedBodyOptions } from '../scene/rig/posedBody';
import { BONES, type Side } from '../scene/rig/humanoidBones';
import { RiderMotion } from '../scene/rig/riderMotion';
import { POINT, createRiderVisualState, readRiderSnapshot } from '../scene/rig/riderVisualState';
import { createTestHumanoid } from '../scene/rig/testHumanoid';
import { RIDER_SNAPSHOT, writeRiderSnapshot } from '../wave/SurfZoneRunner';
import { PITCH_TIME, pitchBoardToward, sessionCues } from './ridingPoses';

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
  /** The drawn balls of the feet (the toes' bases), left and right, relative to the drawn board, in its frame, m. */
  toes: Vector3[];
  /** The drawn hips and board in the world, m, and the drawn board's orientation. */
  hips: Vector3;
  board: Vector3;
  boardTurn: Quaternion;
  /** The measured bones' world rotations relative to the drawn board, and in the world. */
  bones: Quaternion[];
  worldBones: Quaternion[];
  /** The drawn chest's roll across the board's heading, rad, and the physics' own (its torso point over its pelvis). */
  chestRoll: number;
  physicsRoll: number;
  /**
   * Where the drawn chest and head face in the world, rad about the up (the
   * animation-realism plan's motion table: their yaw in the wobble band).
   */
  chestYaw: number;
  headYaw: number;
  /** The drawn knees' flexion, rad (0 straight), left and right: the legs take the board's wobble. */
  kneeFlexion: [number, number];
  /** The drawn trunk's lean across the board's heading, rad: its torso point over its pelvis point as the rig takes them (after the motion filter), and as the drawn state gave them (before it). */
  drawnRoll: number;
  givenRoll: number;
  /** The drawn hips and the physics' pelvis point, in the board's frame, m. */
  hipsOnBoard: Vector3;
  physicsPelvis: Vector3;
  /** The physics' balance reserve (the balance meter's: 1 at ease, 0 letting go; NaN once detached), and its hand points about its torso point on the board, m (step 5). */
  balance: number;
  physicsHands: Vector3[];
}

/** Where the film's joints (`FilmFrame.joints`, `limbs`) keep the shoulders, the hands and the head; `worldBones` the chest (1) and the head (2). */
export const FILM_JOINT = { shoulder: { left: 3, right: 9 }, hand: { left: 5, right: 11 }, head: 12, ankle: { left: 2, right: 8 } } as const;
const WORLD_BONE = { chest: 1, head: 2 } as const;

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
  water: 'flat' | 'face' | 'chop';
  placement: RiderPlacement;
  seconds: number;
  /** The input at `time` s; it may also act on the session (a tow, a separation). */
  input(time: number, session: RideSession): Partial<RideInput>;
}

const FACE = (15 * Math.PI) / 180;
/** True in the one step nearest `at` s: a key pressed for a step. */
const once = (time: number, at: number) => Math.abs(time - at) < STEP / 2;
/** The sessions whose fall body has had its throw (a scenario's stand-in for the lip). */
const thrown = new WeakSet<RideSession>();

/**
 * Lets the rider go at `at` s for `cause`, the board turned nose up (+) or down by `pitch`° by the separation, and the
 * fall body thrown at `throwing` m/s at its first step (the stance recipes' stand-ins for a pearl's nose, a kick-out's tail
 * and the lip's lift, which flat water makes none of).
 */
function fallAt(time: number, at: number, session: RideSession, cause: 'balance' | 'impact' = 'balance', pitch = 0, throwing?: Vector3): void {
  // The board pitched over the 0.2 s before (a nose digging in, a tail sinking), then the fall.
  if (pitch && session.rider.attached && time > at - PITCH_TIME - STEP / 2 && time < at + STEP / 2) pitchBoardToward(session.board, pitch, STEP / Math.max(STEP, at - time + STEP));
  if (once(time, at) && session.rider.attached) session.separate(cause);
  if (throwing && session.surfer.active && !thrown.has(session)) {
    thrown.add(session);
    for (const node of session.surfer.nodes) node.velocity.add(throwing);
  }
}

/** The frames riding (not fallen, not at a switch). */
const riding = (film: BodyFilm) => film.frames.filter((frame) => !frame.fallen && !frame.switched);

/**
 * The RMS of a measured bone's tilting speed in the world, rad/s, between riding
 * frames: how fast its long axis (its local y) turns, leaving out its turn about
 * that axis (a head turning to look).
 */
function tiltingRms(film: BodyFilm, bone: number): number {
  const axis = (q: Quaternion) => new Vector3(0, 1, 0).applyQuaternion(q);
  let sum = 0;
  let count = 0;
  for (let i = 1; i < film.frames.length; i += 1) {
    const [a, b] = [film.frames[i - 1], film.frames[i]];
    if (a.fallen || b.fallen || b.switched) continue;
    sum += (axis(a.worldBones[bone]).angleTo(axis(b.worldBones[bone])) * film.rate) ** 2;
    count += 1;
  }
  return count ? Math.sqrt(sum / count) : 0;
}

/**
 * How much of the chest's tilting reaches the head (step 4): the RMS of the
 * head's tilting speed in the world over the chest's; 1 when the head rides
 * with the chest, under 1 when it holds steadier (Pozzo et al. 1990: the head's
 * pitch held near the horizontal while the body moves). Looking about (yaw) is
 * left out.
 */
export function headSteadiness(film: BodyFilm): number {
  const chest = tiltingRms(film, WORLD_BONE.chest);
  return chest > 1e-12 ? tiltingRms(film, WORLD_BONE.head) / chest : 0;
}

/** A cycle's rate, per second: the rising crossings of `values` over their mean, from the first to the last (between frames). */
function cycleRate(values: readonly number[], rate: number): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const crossings: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] < mean && values[i] >= mean) crossings.push(i - 1 + (mean - values[i - 1]) / (values[i] - values[i - 1]));
  }
  return crossings.length < 2 ? 0 : ((crossings.length - 1) * rate) / (crossings[crossings.length - 1] - crossings[0]);
}

/**
 * The paddler's stroke (step 8): the drawn hand's path on the board (its
 * extent along it, across it and up and down, m) and its strokes a minute,
 * lying down. Nessler et al. 2015 measure the hand's path; Nessler et al. 2019
 * the strokes a minute per arm.
 */
export function paddleStroke(film: BodyFilm, side: Side): { along: number; across: number; vertical: number; perMinute: number } {
  const hands = film.frames.filter((frame) => frame.phase === 'prone').map((frame) => frame.joints[FILM_JOINT.hand[side]]);
  const extent = (axis: 'x' | 'y' | 'z') => (hands.length ? Math.max(...hands.map((h) => h[axis])) - Math.min(...hands.map((h) => h[axis])) : 0);
  return { along: extent('z'), across: extent('x'), vertical: extent('y'), perMinute: 60 * cycleRate(hands.map((h) => h.z), film.rate) };
}

/**
 * The drawn board's motion under a paddler (step 8), degrees: its mean pitch
 * (nose up) and its mean roll range over each `cycle` s (one arm's stroke).
 * Nessler et al. 2019 measure both on a short board in a flume.
 */
export function boardMotion(film: BodyFilm, cycle: number): { pitch: number; roll: number } {
  const forward = new Vector3();
  const side = new Vector3();
  const pitch: number[] = [];
  const roll: number[] = [];
  for (const frame of film.frames) {
    forward.set(0, 0, 1).applyQuaternion(frame.boardTurn);
    side.set(1, 0, 0).applyQuaternion(frame.boardTurn);
    pitch.push((Math.asin(Math.max(-1, Math.min(1, forward.y))) * 180) / Math.PI);
    roll.push((Math.asin(Math.max(-1, Math.min(1, side.y))) * 180) / Math.PI);
  }
  const span = Math.max(1, Math.round(cycle * film.rate));
  const ranges: number[] = [];
  for (let from = 0; from + span <= roll.length; from += span) {
    const window = roll.slice(from, from + span);
    ranges.push(Math.max(...window) - Math.min(...window));
  }
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  return { pitch: mean(pitch), roll: mean(ranges) };
}

/**
 * The swimmer's roll (step 8), degrees, per frame: how far the drawn chest
 * faces away from straight down about the body's long axis (its pitch left
 * out), positive with the left shoulder up. The chest faces the shoulders' line
 * (right to left) crossed with the spine (hips to head).
 */
export function swimRolls(film: BodyFilm): number[] {
  const across = new Vector3();
  const spine = new Vector3();
  const facing = new Vector3();
  const down = new Vector3();
  const turn = new Vector3();
  return film.frames.map((frame) => {
    across.subVectors(frame.limbs[FILM_JOINT.shoulder.left], frame.limbs[FILM_JOINT.shoulder.right]);
    spine.copy(frame.limbs[FILM_JOINT.head]).normalize();
    facing.crossVectors(across, spine);
    facing.addScaledVector(spine, -facing.dot(spine));
    down.set(0, -1, 0).addScaledVector(spine, spine.y);
    // Signed about the spine, from down to the facing: turning the chest toward the right, the left shoulder up, is positive.
    return (Math.atan2(turn.crossVectors(down, facing).dot(spine), down.dot(facing)) * 180) / Math.PI;
  });
}

/** The swimmer's roll (step 8): its peak each way (positive, the left shoulder up) and its mean, degrees. */
export function swimRoll(film: BodyFilm): { left: number; right: number; mean: number } {
  const rolls = swimRolls(film);
  return {
    left: rolls.length ? Math.max(...rolls) : 0,
    right: rolls.length ? -Math.min(...rolls) : 0,
    mean: rolls.length ? rolls.reduce((a, b) => a + b, 0) / rolls.length : 0,
  };
}

/** The swimmer's arm cycles a second (step 8): the drawn hand's height about its shoulder. */
export function crawlRate(film: BodyFilm, side: Side): number {
  return cycleRate(film.frames.map((frame) => frame.limbs[FILM_JOINT.hand[side]].y - frame.limbs[FILM_JOINT.shoulder[side]].y), film.rate);
}

/**
 * How far a hand swings about its shoulder (step 4), m: the RMS of its place
 * relative to the shoulder, on the board, less its running mean over `window` s:
 * 0 for an arm held to its cue, however the cue moves slowly.
 */
export function handSwing(film: BodyFilm, side: Side, window = 1): number {
  const offsets = riding(film).map((frame) => frame.joints[FILM_JOINT.hand[side]].clone().sub(frame.joints[FILM_JOINT.shoulder[side]]));
  const half = Math.round((window * film.rate) / 2);
  let sum = 0;
  offsets.forEach((offset, i) => {
    const mean = new Vector3();
    const from = Math.max(0, i - half);
    const to = Math.min(offsets.length - 1, i + half);
    for (let j = from; j <= to; j += 1) mean.add(offsets[j]);
    sum += offset.clone().sub(mean.divideScalar(to - from + 1)).lengthSq();
  });
  return offsets.length ? Math.sqrt(sum / offsets.length) : 0;
}

/**
 * How the drawn hips follow the physics' leg (step 4): the correlation of their
 * heights on the deck while standing from `from` s (past the stance's blend-in),
 * 1 following it, 0 when the drawn hips hold still.
 */
export function kneeGive(film: BodyFilm, from = 0): number {
  const standing = riding(film).filter((frame) => frame.phase === 'standing' && frame.time >= from);
  const drawn = standing.map((frame) => frame.hipsOnBoard.y);
  const physics = standing.map((frame) => frame.physicsPelvis.y);
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const [dm, pm] = [mean(drawn), mean(physics)];
  let covariance = 0;
  let dv = 0;
  let pv = 0;
  drawn.forEach((d, i) => {
    covariance += (d - dm) * (physics[i] - pm);
    dv += (d - dm) ** 2;
    pv += (physics[i] - pm) ** 2;
  });
  return dv > 1e-12 && pv > 1e-12 ? covariance / Math.sqrt(dv * pv) : 0;
}

/** The head's rise and fall about the hips on the board between `low` and `high` Hz (breathing's band, step 4), RMS, m. */
export function breathing(film: BodyFilm, low = 0.15, high = 1): number {
  const frames = riding(film);
  const head = frames.map((frame) => frame.joints[FILM_JOINT.head].clone().sub(frame.hipsOnBoard));
  const band = (axis: 'x' | 'y' | 'z') => bandRms(head.map((v) => v[axis]), film.rate, low, high);
  return Math.hypot(band('x'), band('y'), band('z'));
}

/**
 * The balance cue (step 5): how the drawn hands' height about their shoulders
 * (in the world, the mean of the two) follows the physics' alarm (1 − its
 * balance reserve) over the standing frames: the regression's slope, m per full
 * alarm, and its correlation. The cue raises the arms toward outstretched; their
 * height follows the elevation, where their span flattens near horizontal.
 */
export function balanceCue(film: BodyFilm): { slope: number; correlation: number } {
  const frames = riding(film).filter((frame) => frame.phase === 'standing' && Number.isFinite(frame.balance));
  const alarm = frames.map((frame) => 1 - frame.balance);
  const spread = frames.map((frame) => (['left', 'right'] as const).reduce(
    (sum, side) => sum + frame.limbs[FILM_JOINT.hand[side]].y - frame.limbs[FILM_JOINT.shoulder[side]].y, 0,
  ) / 2);
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const [am, sm] = [mean(alarm), mean(spread)];
  let covariance = 0;
  let av = 0;
  let sv = 0;
  alarm.forEach((a, i) => {
    covariance += (a - am) * (spread[i] - sm);
    av += (a - am) ** 2;
    sv += (spread[i] - sm) ** 2;
  });
  return { slope: av > 1e-12 ? covariance / av : 0, correlation: av > 1e-12 && sv > 1e-12 ? covariance / Math.sqrt(av * sv) : 0 };
}

/**
 * The stretch the animation-realism plan's motion table reads: the frames
 * standing from `from` s (past the stance's blend-in) until the rider first
 * leaves standing (a fall, a lie-down).
 */
export function standingStretch(film: BodyFilm, from = 0.8): FilmFrame[] {
  const frames: FilmFrame[] = [];
  for (const frame of film.frames) {
    if (frame.time < from - 1e-9) continue;
    if (frame.phase !== 'standing') {
      if (frames.length) break;
      continue;
    }
    frames.push(frame);
  }
  return frames;
}

/** Angles followed through the film without their ±π wraps. */
function unwrapped(values: readonly number[]): number[] {
  const out: number[] = [];
  let offset = 0;
  values.forEach((value, i) => {
    if (i > 0) {
      const step = value + offset - out[i - 1];
      offset -= 2 * Math.PI * Math.round(step / (2 * Math.PI));
    }
    out.push(value + offset);
  });
  return out;
}

/**
 * The animation-realism plan's motion table (§2, §4), over the standing stretch:
 * what reaches each drawn part in the board's wobble band (3–5 Hz), RMS. The
 * chest's roll across the heading (`chestRoll`), rad; the chest's and head's
 * yaw against the board's heading, rad, and the head's in the world; the hips'
 * rise and fall on the board, m, and the knees' flexion (the legs taking it),
 * rad; and the hands' height about their shoulders on the board in the arms'
 * slow band (0.5–2 Hz: a bob with no intent) and above it (2–8 Hz), m, the
 * hand that moves more. The plan's table of 2026-10-22 is these, on the lead
 * (left) hand, which moved more in every scenario.
 */
export interface MotionReading {
  chestRoll: number;
  chestYaw: number;
  headYaw: number;
  headWorldYaw: number;
  hips: number;
  knees: number;
  handSlow: number;
  handFast: number;
  /** Standing frames read. */
  frames: number;
}

export function motionReading(film: BodyFilm, from = 0.8): MotionReading {
  const frames = standingStretch(film, from);
  const band = (values: number[], low = 3, high = 5) => bandRms(values, film.rate, low, high);
  const boardYaw = frames.map((frame) => {
    const nose = new Vector3(0, 0, 1).applyQuaternion(frame.boardTurn);
    return Math.atan2(nose.x, nose.z);
  });
  const against = (yaws: number[]) => unwrapped(yaws.map((yaw, i) => Math.atan2(Math.sin(yaw - boardYaw[i]), Math.cos(yaw - boardYaw[i]))));
  const hand = (side: Side) => frames.map((frame) => frame.joints[FILM_JOINT.hand[side]].y - frame.joints[FILM_JOINT.shoulder[side]].y);
  const hands = SIDES.map(hand);
  return {
    chestRoll: band(frames.map((frame) => frame.chestRoll)),
    chestYaw: band(against(frames.map((frame) => frame.chestYaw))),
    headYaw: band(against(frames.map((frame) => frame.headYaw))),
    headWorldYaw: band(unwrapped(frames.map((frame) => frame.headYaw))),
    hips: band(frames.map((frame) => frame.hipsOnBoard.y)),
    knees: Math.hypot(band(frames.map((frame) => frame.kneeFlexion[0])), band(frames.map((frame) => frame.kneeFlexion[1]))) / Math.SQRT2,
    handSlow: Math.max(...hands.map((values) => band(values, 0.5, 2))),
    handFast: Math.max(...hands.map((values) => band(values, 2, 8))),
    frames: frames.length,
  };
}

/**
 * The alarm the drawn arms show, frame by frame (the animation-realism plan's
 * §4, `RIG_DETAIL.arms`): the physics' (1 − its balance reserve), none under
 * `deadband` and the rest rescaled, rising within `rise` s and falling within
 * `fall` s (one pole each way at a third of that). NaN once detached.
 */
export function drawnAlarm(film: BodyFilm, arms: { alarmDeadband: number; alarmRise: number; alarmFall: number }): number[] {
  let alarm = Number.NaN;
  let last = Number.NaN;
  return film.frames.map((frame) => {
    if (!Number.isFinite(frame.balance)) {
      alarm = Number.NaN;
      return Number.NaN;
    }
    const wanted = Math.max(0, (1 - frame.balance - arms.alarmDeadband) / (1 - arms.alarmDeadband));
    const dt = frame.time - last;
    last = frame.time;
    if (!Number.isFinite(alarm) || !(dt > 0)) alarm = wanted;
    else alarm += (wanted - alarm) * (1 - Math.exp(-dt / ((wanted > alarm ? arms.alarmRise : arms.alarmFall) / 3)));
    return alarm;
  });
}

/**
 * The balance cue against a given alarm, frame by frame (`balanceCue`'s, with
 * `alarm` in place of the physics' own): the regression's slope, m per full
 * alarm, and its correlation.
 */
export function cueAgainst(film: BodyFilm, alarm: readonly number[]): { slope: number; correlation: number } {
  const pairs = film.frames.flatMap((frame, i) => (frame.phase === 'standing' && !frame.fallen && !frame.switched && Number.isFinite(alarm[i]) ? [{ frame, alarm: alarm[i] }] : []));
  const spread = pairs.map(({ frame }) => (['left', 'right'] as const).reduce(
    (sum, side) => sum + frame.limbs[FILM_JOINT.hand[side]].y - frame.limbs[FILM_JOINT.shoulder[side]].y, 0,
  ) / 2);
  const a = pairs.map((pair) => pair.alarm);
  const mean = (values: number[]) => values.reduce((x, y) => x + y, 0) / values.length;
  const [am, sm] = [mean(a), mean(spread)];
  let covariance = 0;
  let av = 0;
  let sv = 0;
  a.forEach((value, i) => {
    covariance += (value - am) * (spread[i] - sm);
    av += (value - am) ** 2;
    sv += (spread[i] - sm) ** 2;
  });
  return { slope: av > 1e-12 ? covariance / av : 0, correlation: av > 1e-12 && sv > 1e-12 ? covariance / Math.sqrt(av * sv) : 0 };
}

/** `values` averaged over a centred window of `window` s (a zero-phase low-pass: it passes below about 0.6/`window` Hz). */
function centredMean(values: readonly number[], rate: number, window: number): number[] {
  const half = Math.round((window * rate) / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length - 1, i + half);
    let sum = 0;
    for (let j = from; j <= to; j += 1) sum += values[j];
    return sum / (to - from + 1);
  });
}

/**
 * How the drawn trunk's lean follows the physics' bank below 1 Hz (the plan's
 * §4): the trunk as the rig takes it against the drawn state's own (the
 * physics' points as the page draws them, before the posing: the track's
 * delay left out), both averaged over 0.5 s (centred); the shift that brings
 * them closest (`drawnLag`), s, and their RMS difference at that shift, rad,
 * over the standing stretch.
 */
export function leanFollow(film: BodyFilm, from = 0.8): { lag: number; rms: number } {
  const frames = standingStretch(film, from);
  const drawn = centredMean(frames.map((frame) => frame.drawnRoll), film.rate, 0.5);
  const physics = centredMean(frames.map((frame) => frame.givenRoll), film.rate, 0.5);
  const lag = drawnLag({ rate: film.rate, frames: frames.map((frame, i) => ({ ...frame, chestRoll: drawn[i], physicsRoll: physics[i] })) });
  const shift = Math.round(lag * film.rate);
  let sum = 0;
  let count = 0;
  for (let t = 0; t + shift < drawn.length; t += 1) {
    sum += (drawn[t + shift] - physics[t]) ** 2;
    count += 1;
  }
  return { lag, rms: count ? Math.sqrt(sum / count) : 0 };
}

/**
 * How far the drawn feet slide on the deck while standing (the plan's §4: the
 * feet stay on their points), m: each foot's ball (its toes' base, which stays
 * on the deck as the heel lifts) farthest from its own median place on the
 * board, across the deck, over the standing stretch; the larger.
 */
export function footSlide(film: BodyFilm, from = 0.8): number {
  const frames = standingStretch(film, from).filter((frame) => !frame.switched);
  let most = 0;
  for (const side of [0, 1]) {
    const ankles = frames.map((frame) => frame.toes[side]);
    const median = (axis: 'x' | 'z') => {
      const sorted = ankles.map((ankle) => ankle[axis]).sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)] ?? 0;
    };
    const [mx, mz] = [median('x'), median('z')];
    for (const ankle of ankles) most = Math.max(most, Math.hypot(ankle.x - mx, ankle.z - mz));
  }
  return most;
}

/** The film's chop (step 4): bumps CHOP.height high every CHOP.length m along z, with their slope. A test surface, not a sea state. */
const CHOP = { height: 0.05, length: 4 };
export class ChopWater extends PlaneWater {
  surfaceAt(_x: number, z: number): number {
    return CHOP.height * Math.sin((2 * Math.PI * z) / CHOP.length);
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    super.sampleAt(x, y, z, out);
    const k = (2 * Math.PI) / CHOP.length;
    const slopeZ = CHOP.height * k * Math.cos(k * z);
    const norm = Math.hypot(1, slopeZ);
    Object.assign(out, { slopeX: 0, slopeZ, normalX: 0, normalY: 1 / norm, normalZ: -slopeZ / norm });
    return out;
  }
}

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
  {
    // The pop-up with the crouch held (a steep take-off): the body lands crouched (step 3's final review: the heel's
    // lift switched on at once as the landing became standing).
    name: 'pop-up crouched', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' },
    input(time, session) {
      if (session.rider.attached && session.rider.phase !== 'standing') {
        session.board.velocity.z = 6;
        session.rider.velocity.z = 6;
      }
      return { popUp: once(time, 0.5), crouch: 1 };
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
  // Step 4's secondary motion: three pump pulses; straight over chop; paddling for 20 s, then gliding still.
  {
    name: 'pumping', water: 'flat', seconds: 3, placement: { x: 0, z: 0, heading: 0, speed: 8, phase: 'standing' },
    input: (time) => ({ crouch: time >= 0.4 && time < 2.8 && Math.floor(time / 0.4) % 2 === 1 ? 1 : 0 }),
  },
  {
    name: 'pumping into a fall', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 8, phase: 'standing' },
    input(time, session) {
      if (once(time, 1.3) && session.rider.attached) session.separate('balance');
      return { crouch: time >= 0.4 && Math.floor(time / 0.4) % 2 === 1 ? 1 : 0 };
    },
  },
  { name: 'chop', water: 'chop', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 8, phase: 'standing' }, input: () => ({}) },
  {
    name: 'paddle then glide', water: 'flat', seconds: 30, placement: { x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' },
    input: (time) => ({ paddle: time < 20 }),
  },
  // The animation-realism plan's phase 4: a fall by each cause, a fall from lying down, rising to the surface, reeling
  // the leash in, and holding the board to climb back on after a slow fall (it comes on at 17.2 s).
  { name: 'a pearl', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 7, phase: 'standing' }, input(time, session) { fallAt(time, 1, session, 'balance', -35); return {}; } },
  {
    name: 'over the falls', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 7, phase: 'standing' },
    input(time, session) { fallAt(time, 1, session, 'impact', 0, new Vector3(0, 2.5, 1.5)); return {}; },
  },
  { name: 'off the back', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 7, phase: 'standing' }, input(time, session) { fallAt(time, 1, session, 'balance', 25); return {}; } },
  { name: 'a fall from lying down', water: 'flat', seconds: 2.5, placement: { x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' }, input(time, session) { fallAt(time, 1, session); return {}; } },
  { name: 'surfacing', water: 'flat', seconds: 6.5, placement: { x: 0, z: 0, heading: 0, speed: 7, phase: 'standing' }, input(time, session) { fallAt(time, 0.5, session); return {}; } },
  {
    // Reeled from 3 s (5 s before the phase 5 physics plan's fall from the rider's own pose, item 2.10: the board now
    // drifts near enough that the swimmer had it 0.5 s after a reel from 5 s); the grab comes about 4.6 s in.
    name: 'reeling the leash in', water: 'flat', seconds: 4.4, placement: { x: 0, z: 0, heading: 0, speed: 7, phase: 'standing' },
    input(time, session) { fallAt(time, 0.5, session); return { reel: time > 3 }; },
  },
  {
    name: 'climbing back on', water: 'flat', seconds: 18.5, placement: { x: 0, z: 0, heading: 0, speed: 2, phase: 'standing' },
    input(time, session) { fallAt(time, 0.5, session); return { reel: time > 3 }; },
  },
  // Step 8: off the board lying down, then swimming in calm water.
  {
    name: 'swimming', water: 'flat', seconds: 12, placement: { x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' },
    input(time, session) {
      if (once(time, 0.5) && session.rider.attached) session.separate('balance');
      return { paddle: time > 1 };
    },
  },
];

/** One delivered snapshot: the sea time and the page's arrays. */
export interface FilmSnapshot {
  seaTime: number;
  rider: Float64Array;
  board: Float64Array;
}

/**
 * What a drawer may read of the film: the water's surface (another player's board is floated on it), whether the
 * rider paddles, and whether the fallen surfer holds the board (as the page reads it: sent as wire flag 128).
 */
export interface FilmContext {
  surfaceAt(x: number, z: number): number;
  paddling(): boolean;
  holding(): boolean;
}

/** The page's drawing of the rider from delivered snapshots, one display frame at a time. */
export interface FilmDrawer {
  /**
   * Another player's surfer, drawn from what the wire sends: the session's own cues (the fall's cause, the hold) are not
   * read; the frame says the hold where the pose's recovering flag gives one.
   */
  remote?: boolean;
  /** A snapshot arrives from the physics. */
  deliver(snapshot: FilmSnapshot): void;
  /**
   * Draw a frame `dt` s after the last: the rider's arrays to draw and the time to draw them at (and, another player's,
   * the hold its pose says), or undefined for none yet.
   */
  frame(dt: number): { rider: ArrayLike<number>; board: ArrayLike<number>; time: number; holding?: boolean } | undefined;
}

/** Today's page: the newest snapshot as it is. */
export function latestDrawer(): FilmDrawer {
  let latest: FilmSnapshot | undefined;
  return {
    deliver(snapshot) { latest = snapshot; },
    frame: () => latest && { rider: latest.rider, board: latest.board, time: latest.seaTime },
  };
}

/**
 * Another player's surfer (step 7): the snapshots sent as the game sends its own
 * pose (`OwnPoseTracker`, every 1/`POSE_HZ` s of sea time), through the pose
 * codec (the points in millimetres) and the real `RemoteSurfers`, sampled
 * `INTERPOLATION_DELAY` in the past on the room's clock, and rebuilt by
 * `RemoteSurferViews`' own code on the same water.
 */
export function remoteDrawer(context: FilmContext): FilmDrawer {
  const id = 1;
  const remotes = new RemoteSurfers();
  remotes.join({ id, name: 'film', look: { body: 'surfer1', outfit: 'fullsuit', color: 'blue', board: 'classic' } });
  const tracker = new OwnPoseTracker();
  const pose = createPose();
  const bytes = new Uint8Array(POSE_BYTES);
  const remote = createRemoteState();
  const drawn = createRiderVisualState();
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  const board = new Float64Array(8);
  let nextSend = Number.NEGATIVE_INFINITY;
  let clock = Number.NaN;
  return {
    remote: true,
    deliver(snapshot) {
      if (Number.isNaN(clock)) clock = snapshot.seaTime;
      if (snapshot.seaTime + 1e-9 < nextSend) return;
      nextSend = snapshot.seaTime + 1 / POSE_HZ;
      tracker.write(snapshot, context.surfaceAt, snapshot.seaTime, context.paddling(), pose, context.holding());
      encodePose(pose, new DataView(bytes.buffer), 0);
      const bundle = encodeBundle([{ id, pose: bytes }]);
      remotes.receiveBundle(bundle.buffer.slice(bundle.byteOffset, bundle.byteOffset + bundle.byteLength) as ArrayBuffer, 0, []);
    },
    frame(dt) {
      if (Number.isNaN(clock)) return undefined;
      clock += dt;
      const time = clock - INTERPOLATION_DELAY;
      if (!remotes.sample(id, time, remote) || !remote.present) return undefined;
      remoteBoardPose(remote, context.surfaceAt, board);
      remoteRiderState(remote, board, rider, drawn, context.surfaceAt);
      return { rider, board, time, holding: drawn.swim.holding };
    },
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
  drawer?: (context: FilmContext) => FilmDrawer;
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
  const water: SurfWater = scenario.water === 'face' ? new PlaneWater({ slopeZ: -Math.tan(FACE) }) : scenario.water === 'chop' ? new ChopWater() : new PlaneWater();
  const session = new RideSession();
  session.place(scenario.placement, water);
  let paddling = false;
  const drawer = (options.drawer ?? latestDrawer)({
    surfaceAt: (x, z) => water.surfaceAt(x, z), paddling: () => paddling, holding: () => !session.rider.attached && session.recovery.state === 'holding',
  });
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
      const input: RideInput = { paddle: false, popUp: false, steer: 0, ...scenario.input(simTime, session) };
      paddling = input.paddle;
      session.step(STEP, water, input);
      simTime += STEP;
      steps += 1;
      if (steps % delivery === 0) deliver();
    }
    const drawn = drawer.frame(1 / options.rate);
    if (!drawn) continue;
    readRiderSnapshot(drawn.rider, drawn.board, state);
    // As the page does (`PhysicalMode`): the fall's cause and the hold, beyond the snapshot, for the player's own surfer.
    if (!drawer.remote) {
      sessionCues(session, state);
      state.stance = session.rider.stance;
    } else state.swim.holding = drawn.holding ?? false;
    motion.update(state, drawn.time);
    state.clock = drawn.time;
    // As the page does (`PhysicalMode`): the hands pull while paddling lying down.
    state.stroking = paddling && state.phase === 'prone' ? 1 : 0;
    // The drawn state's own lean before the posing moves its points (the motion filter's input).
    const given = rollAcross(state, state.points[POINT.torso].clone().sub(state.points[POINT.pelvis]));
    pose(state);
    film.frames.push(record(f / options.rate, state, session, rig, measured, pending, given));
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
    toes: [BONES.toe.left, BONES.toe.right].map(at),
    hips: at(BONES.hips),
    chest: at(BONES.spine[2]),
  };
}

const UP = new Vector3(0, 1, 0);

/** A vector's roll across the drawn board's heading, level, rad. */
function rollAcross(state: ReturnType<typeof createRiderVisualState>, v: Vector3): number {
  const forward = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0);
  if (forward.lengthSq() < 1e-9) forward.set(0, 0, 1);
  const across = new Vector3().crossVectors(UP, forward.normalize());
  return Math.atan2(v.dot(across), v.y);
}

function record(
  time: number, state: ReturnType<typeof createRiderVisualState>, session: RideSession,
  rig: ReturnType<typeof poseRig>, measured: import('three').Bone[], switched: boolean, givenRoll: number,
): FilmFrame {
  const boardPosition = state.boardPosition;
  const boardInverse = state.boardQuaternion.clone().invert();
  const hips = rig.hips.getWorldPosition(new Vector3());
  const world = rig.joints.map((bone) => bone.getWorldPosition(new Vector3()));
  const toes = rig.toes.map((bone) => bone.getWorldPosition(new Vector3()).sub(boardPosition).applyQuaternion(boardInverse));
  const worldBones = measured.map((bone) => bone.getWorldQuaternion(new Quaternion()));
  // Across the board's heading, level.
  const forward = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0);
  if (forward.lengthSq() < 1e-9) forward.set(0, 0, 1);
  const across = new Vector3().crossVectors(UP, forward.normalize());
  const roll = (v: Vector3) => Math.atan2(v.dot(across), v.y);
  const chestUp = UP.clone().applyQuaternion(rig.chest.getWorldQuaternion(new Quaternion()));
  const torso = session.renderPoint(1, new Vector3()).sub(session.renderPoint(0, new Vector3()));
  // The test humanoid's bones rest unturned, facing +z: a bone's world turn carries that facing.
  const yawOf = (bone: number) => {
    const facing = new Vector3(0, 0, 1).applyQuaternion(worldBones[bone]);
    return Math.atan2(facing.x, facing.z);
  };
  const knee = (side: number) => {
    const [hip, kneeJoint, ankle] = [world[side * 6], world[side * 6 + 1], world[side * 6 + 2]];
    return Math.PI - hip.clone().sub(kneeJoint).angleTo(ankle.clone().sub(kneeJoint));
  };
  return {
    time,
    phase: state.phase,
    moving: session.board.velocity.length() > 0.5,
    switched,
    fallen: state.phase === 'fallen',
    joints: world.map((p) => p.clone().sub(boardPosition).applyQuaternion(boardInverse)),
    limbs: world.map((p) => p.clone().sub(hips)),
    toes,
    hips,
    board: boardPosition.clone(),
    boardTurn: state.boardQuaternion.clone(),
    bones: worldBones.map((q) => boardInverse.clone().multiply(q)),
    worldBones,
    chestRoll: roll(chestUp),
    physicsRoll: roll(torso),
    chestYaw: yawOf(WORLD_BONE.chest),
    headYaw: yawOf(WORLD_BONE.head),
    kneeFlexion: [knee(0), knee(1)],
    drawnRoll: roll(state.points[POINT.torso].clone().sub(state.points[POINT.pelvis])),
    givenRoll,
    hipsOnBoard: hips.clone().sub(boardPosition).applyQuaternion(boardInverse),
    physicsPelvis: state.points[POINT.pelvis].clone().sub(boardPosition).applyQuaternion(boardInverse),
    balance: session.rider.attached ? session.rider.balanceReserve : Number.NaN,
    physicsHands: [POINT.leftHand, POINT.rightHand].map((i) => state.points[i].clone().sub(state.points[POINT.torso]).applyQuaternion(boardInverse)),
  };
}
