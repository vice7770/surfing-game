import { Quaternion, Vector3 } from 'three';
import { drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import { BoardBody } from '../../physics/BoardBody';
import type { StanceName } from '../../physics/riderPosture';
import { PosedBody } from './posedBody';
import { POINT } from './riderVisualState';
import { RIG_SWITCHES, type RigSwitches } from './stanceBlend';
import { StanceGauge } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;

/** One drawn frame of a turn's film (`turnFilm`): angles in °, lengths in m, speeds in m/s. */
export interface TurnFrame {
  t: number;
  /** The stick as the drawing has it: +1 turns the board toward its left (the heading growing). */
  steer: number;
  /** The board's heading, unwrapped from the film's first frame, and its roll (+ its left rail down). */
  heading: number;
  roll: number;
  /** The trunk's line across the board, + toward the board's left: the physics' (pelvis to chest) and the drawn (waist to neck). */
  physicsLine: number;
  drawnLine: number;
  /** The drawn trunk from upright, and its part along the board (the hinge toward the nose or the tail). */
  tilt: number;
  /** The head, the chest and the hips: where each faces off the board's heading, + toward its left. */
  head: number;
  chest: number;
  hips: number;
  /** The front and the back hand over the water, and each wrist's speed against the board. */
  frontHand: number;
  backHand: number;
  frontHandSpeed: number;
  backHandSpeed: number;
  /** The front hand's heading off the board's nose, + toward its left. */
  frontHandOff: number;
  /** The knees (180 straight), the hips' place between the feet (0 the back foot, 1 the front), each ankle's slide over the deck since the last frame. */
  kneeFront: number;
  kneeRear: number;
  hipsOver: number;
  footSlide: number;
  /** The hips off the middle of the feet across the board, + toward its left. */
  hipsAcross: number;
}

/**
 * A turn's film as the page draws it (`drawnRecipe`, every 1/60 s step of the physics), drawn every `every` steps (2: a
 * 30 Hz page) with the drawn `switches` on, read by the stance gauge; `remote`: as another player's rider is drawn, with no
 * stick (the snapshot carries none). For the turning body's tests and its tables
 * (`docs/research/turn-body-2026-11-10/drawn-fixes.md`).
 */
export function turnFilm(recipe: StanceRecipe, stance: StanceName, switches: RigSwitches = {}, every = 1, remote = false): TurnFrame[] {
  const before = { ...RIG_SWITCHES };
  Object.assign(RIG_SWITCHES, { turnTrunk: undefined, turnLead: undefined, cutbackHand: undefined }, switches);
  const { bones } = createTestHumanoid();
  const body = new PosedBody(bones);
  const gauge = new StanceGauge(bones);
  const frames: TurnFrame[] = [];
  const front = stance === 'regular' ? 'left' : 'right';
  const rear = front === 'left' ? 'right' : 'left';
  const floats = new BoardBody().shape.centerOfMass.y;
  const inverse = new Quaternion();
  const last = { ankle: { left: new Vector3(), right: new Vector3() }, wrist: { left: new Vector3(), right: new Vector3() }, heading: 0, t: 0 };
  let water = Number.NaN;
  let step = 0;
  let heading = 0;
  try {
    drawnRecipe(recipe, stance, new Vector3(0, 0.03, 0), (state) => {
      if (Number.isNaN(water)) water = state.boardPosition.y - floats;
      const steer = state.steer;
      if (remote) state.steer = 0;
      step += 1;
      if (step % every !== 0) return;
      // The physics' line first: the drawing filters the points it is handed.
      const fh = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0).normalize();
      const lh = new Vector3().crossVectors(new Vector3(0, 1, 0), fh).normalize();
      const line = (v: Vector3) => Math.atan2(v.dot(lh), v.y) * DEG;
      const physicsLine = line(state.points[POINT.torso].clone().sub(state.points[POINT.pelvis]));
      body.update(state);
      if (state.phase !== 'standing') return;
      const j = gauge.joints();
      const m = gauge.measure(state, stance);
      const yaw = (v: Vector3) => Math.atan2(new Vector3().crossVectors(fh, v).y, fh.dot(v)) * DEG;
      const trunk = j.neck.clone().sub(j.spine);
      inverse.copy(state.boardQuaternion).invert();
      const onDeck = (p: Vector3) => p.clone().sub(state.boardPosition).applyQuaternion(inverse);
      const first = frames.length === 0;
      const dt = first ? every * STEP : state.clock - last.t;
      const moved = (now: Vector3, was: Vector3) => (first ? 0 : now.distanceTo(was));
      const ankle = { left: onDeck(j.ankle.left), right: onDeck(j.ankle.right) };
      const wrist = { left: onDeck(j.wrist.left), right: onDeck(j.wrist.right) };
      const turned = Math.atan2(fh.x, fh.z) * DEG;
      heading = first ? 0 : heading + ((((turned - last.heading) % 360) + 540) % 360) - 180;
      const feet = j.ankle.left.clone().add(j.ankle.right).multiplyScalar(0.5);
      const across = new Vector3(1, 0, 0).applyQuaternion(state.boardQuaternion);
      frames.push({
        t: state.clock, steer, heading, roll: -Math.asin(Math.max(-1, Math.min(1, across.y))) * DEG,
        physicsLine, drawnLine: line(trunk), tilt: Math.acos(Math.max(-1, Math.min(1, trunk.y / trunk.length()))) * DEG,
        head: yaw(j.headFacing), chest: yaw(j.chestFacing), hips: yaw(j.pelvisFacing),
        frontHand: j.wrist[front].y - water, backHand: j.wrist[rear].y - water,
        frontHandSpeed: moved(wrist[front], last.wrist[front]) / dt, backHandSpeed: moved(wrist[rear], last.wrist[rear]) / dt,
        frontHandOff: yaw(j.wrist[front].clone().sub(j.shoulder[front])),
        kneeFront: m.kneeFront, kneeRear: m.kneeRear, hipsOver: m.hipsOver,
        footSlide: Math.max(moved(ankle.left, last.ankle.left), moved(ankle.right, last.ankle.right)),
        hipsAcross: j.hips.clone().sub(feet).dot(lh),
      });
      for (const side of ['left', 'right'] as const) {
        last.ankle[side].copy(ankle[side]);
        last.wrist[side].copy(wrist[side]);
      }
      last.heading = turned;
      last.t = state.clock;
    });
  } finally {
    Object.assign(RIG_SWITCHES, { turnTrunk: undefined, turnLead: undefined, cutbackHand: undefined }, before);
  }
  return frames;
}
