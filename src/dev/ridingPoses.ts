import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider, type RiderPhase } from '../physics/AttachedRider';
import { BoardBody } from '../physics/BoardBody';
import { PlaneWater } from '../physics/PlaneWater';
import { RideSession } from '../physics/RideSession';
import type { StanceName } from '../physics/riderPosture';
import { readRiderSnapshot, type RiderVisualState } from '../scene/rig/riderVisualState';
import { RIDER_SNAPSHOT, writeRiderSnapshot } from '../wave/SurfZoneRunner';

/** Riding moments for the surfer sheet (Part B), each simulated by the real rider: stances of the map. */
export type RidingMoment = 'straight' | 'drop' | 'bottom turn' | 'backside turn' | 'top turn' | 'snap';
export const RIDING_MOMENTS: readonly RidingMoment[] = ['straight', 'drop', 'bottom turn', 'backside turn', 'top turn', 'snap'];
const MOMENT_STANCE: Record<RidingMoment, string> = {
  straight: 'trim', drop: 'drop', 'bottom turn': 'compress-frontside', 'backside turn': 'compress-backside', 'top turn': 'extension-frontside', snap: 'snap-frontside',
};

const STEP = 1 / 60;
const FACE = (15 * Math.PI) / 180;

/** From `at` s the rider holds these controls; steer and the hand count toward the toes' rail (+1), whichever the stance. */
interface Controls {
  at: number;
  steer?: number;
  trim?: number;
  crouch?: number;
  compress?: number;
  hand?: boolean;
  /** A press for one step (the pop-up; standing, Enter lies the rider down). */
  popUp?: boolean;
}

/** How the real rider reaches a stance of the map (`stanceMap.ts`). */
export interface StanceRecipe {
  /** The phase the stance is read in. */
  phase: RiderPhase | 'fallen';
  /** Flat water; down a 15° face along its fall line; or across one, the face rising on the toes' side (frontside). */
  water: 'flat' | 'face' | 'across';
  /** Standing on a board already moving, or lying on it (the pop-up), m/s. */
  start: 'standing' | 'prone';
  speed: number;
  controls: Controls[];
  /** Read at this time, s; or, with `after`, this long after the phase is first reached (within `seconds`). */
  seconds: number;
  after?: number;
  /** The rider lets go (a fall) at this time, s. */
  separate?: number;
}

const standing = (controls: Controls[], seconds: number, extra: Partial<StanceRecipe> = {}): StanceRecipe => ({
  phase: 'standing', water: 'flat', start: 'standing', speed: 8, controls, seconds, ...extra,
});

/** The map's stances as the game reaches them (each stance's `reach`). */
export const STANCE_RECIPES: Record<string, StanceRecipe> = {
  trim: standing([], 1),
  'trim-forward': standing([{ at: 0.4, trim: 1 }], 1),
  'trim-back': standing([{ at: 0.4, trim: -1 }], 1),
  drop: standing([{ at: 0, crouch: 0.6 }], 1, { water: 'face', speed: 5 }),
  'compress-frontside': standing([{ at: 0, crouch: 0.6 }, { at: 0.4, steer: 1 }, { at: 0.7, compress: 1 }], 1.1),
  'compress-backside': standing([{ at: 0, crouch: 0.6 }, { at: 0.4, steer: -1 }, { at: 0.7, compress: 1 }], 1.1),
  'extension-frontside': standing([{ at: 0.4, steer: -1, trim: -0.5 }], 1),
  'extension-backside': standing([{ at: 0.4, steer: 1, trim: -0.5 }], 1),
  'snap-frontside': standing([{ at: 0.4, steer: -1, trim: -1 }], 0.9),
  'snap-backside': standing([{ at: 0.4, steer: 1, trim: -1 }], 0.9),
  'cutback-frontside': standing([{ at: 0, crouch: 0.5 }, { at: 0.4, steer: -1, trim: -0.7 }], 1.2),
  'pump-compression': standing([{ at: 0.4, crouch: 1 }], 0.8, { speed: 7 }),
  'pump-extension': standing([{ at: 0.4, crouch: 1 }, { at: 0.8, crouch: 0 }], 1.1, { speed: 7 }),
  'hand-in-face': standing([{ at: 0, crouch: 0.6 }, { at: 0.4, hand: true }], 1, { water: 'across', speed: 6 }),
  // Lying on a board towed at 6 m/s, as the wave would carry it (the body film's pop-up).
  'pop-up': { phase: 'push', water: 'flat', start: 'prone', speed: 6, controls: [{ at: 0.5, popUp: true }], seconds: 3, after: 0.3 },
  landing: { phase: 'landing', water: 'flat', start: 'prone', speed: 6, controls: [{ at: 0.5, popUp: true }], seconds: 3, after: 0.05 },
  'lying-down': standing([{ at: 0.5, popUp: true }], 3, { speed: 6, after: 0.2, phase: 'recover' }),
  'fall-start': standing([], 3, { speed: 7, separate: 0.5, after: 0.15, phase: 'fallen' }),
};

/** The recipe's water for a Regular or Goofy rider: across a face, it rises on the toes' side (−x Regular, +x Goofy). */
function waterFor(kind: StanceRecipe['water'], stance: StanceName): PlaneWater {
  if (kind === 'face') return new PlaneWater({ slopeZ: -Math.tan(FACE) });
  if (kind === 'across') return new PlaneWater({ slopeX: (stance === 'regular' ? -1 : 1) * Math.tan(FACE) });
  return new PlaneWater();
}

/** A standing rider on water: flat, down a 15° face along its fall line, or across it lying on its slope. */
function mount(speed: number, stance: StanceName, kind: StanceRecipe['water']) {
  const board = new BoardBody();
  const water = waterFor(kind, stance);
  if (kind === 'across') {
    const slopeX = (stance === 'regular' ? -1 : 1) * Math.tan(FACE);
    const normal = new Vector3(-slopeX, 1, 0).normalize();
    const forward = new Vector3(0, 0, 1);
    const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, forward), normal, forward));
    board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), orientation, forward.multiplyScalar(speed));
  } else if (kind === 'face') {
    const normal = new Vector3(0, 1, Math.tan(FACE)).normalize();
    const fall = new Vector3(0, -Math.sin(FACE), Math.cos(FACE));
    const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, fall), normal, fall));
    board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), orientation, fall.multiplyScalar(speed));
  } else {
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  }
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
  board.attach(rider);
  return { board, rider, water };
}

/** The controls held at `time`, s: each field as last set. */
function controlsAt(recipe: StanceRecipe, time: number): Omit<Controls, 'at'> {
  const held: Omit<Controls, 'at'> = {};
  for (const { at, popUp: _press, ...rest } of recipe.controls) if (at <= time + 1e-9) Object.assign(held, rest);
  held.popUp = recipe.controls.some((control) => control.popUp && Math.abs(time - control.at) < STEP / 2);
  return held;
}

/**
 * Runs `recipe` with the real rider for a Regular or Goofy `stance`: standing
 * stances on the rider alone (the sheet's riding moments), the pop-up, lying
 * down and a fall through a ride session. Writes the drawn state into `out`,
 * moved so the board sits at `at` with its nose along +z (its roll and pitch
 * kept), with the board's motion as the rig reads it. `reached` is false when
 * the rider ended in another phase (it fell, or never got there).
 */
export function simulateStance(recipe: StanceRecipe, stance: StanceName, at: Vector3, out: RiderVisualState): { state: RiderVisualState; reached: boolean } {
  const toes = stance === 'regular' ? -1 : 1;
  const water = waterFor(recipe.water, stance);
  const session = recipe.start === 'prone' || recipe.after !== undefined || recipe.separate !== undefined ? new RideSession({ stance }) : undefined;
  const mounted = session ? undefined : mount(recipe.speed, stance, recipe.water);
  if (session) session.place({ x: 0, z: 0, heading: 0, speed: recipe.start === 'prone' ? 0 : recipe.speed, phase: recipe.start }, water);
  const board = session?.board ?? mounted!.board;
  const rider = session?.rider ?? mounted!.rider;
  const phase = () => (rider.attached ? rider.phase : 'fallen');
  let reachedAt: number | undefined;
  let time = 0;
  const end = Math.round(recipe.seconds / STEP);
  for (let i = 0; i < end; i += 1) {
    const controls = controlsAt(recipe, time);
    const steer = (controls.steer ?? 0) * toes;
    if (session) {
      if (recipe.separate !== undefined && Math.abs(time - recipe.separate) < STEP / 2 && rider.attached) session.separate('balance');
      // Lying down, towed as the wave would carry the board.
      if (recipe.start === 'prone' && rider.attached && rider.phase !== 'standing') {
        board.velocity.z = recipe.speed;
        rider.velocity.z = recipe.speed;
      }
      session.step(STEP, water, {
        paddle: false, popUp: controls.popUp === true, steer, trim: controls.trim, crouch: controls.crouch, compress: controls.compress, hand: controls.hand,
      });
    } else {
      rider.steer = steer;
      rider.trim = controls.trim ?? 0;
      rider.crouch = controls.crouch ?? 0;
      rider.compress = controls.compress ?? 0;
      rider.hand = controls.hand ?? false;
      board.step(STEP, water);
    }
    time += STEP;
    if (recipe.after !== undefined) {
      if (reachedAt === undefined && phase() === recipe.phase) reachedAt = time;
      if (reachedAt !== undefined && time >= reachedAt + recipe.after - 1e-9) break;
    }
  }
  // The drawn state, the board moved to `at` with its heading turned to +z.
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  const unturn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.atan2(forward.x, forward.z));
  if (session) {
    const snapshot = new Float64Array(RIDER_SNAPSHOT.length);
    writeRiderSnapshot(session, false, snapshot, new Vector3());
    const pose = new Float64Array(8);
    board.position.toArray(pose, 0);
    board.orientation.toArray(pose, 3);
    readRiderSnapshot(snapshot, pose, out);
    for (const point of out.points) point.sub(board.position).applyQuaternion(unturn).add(at);
  } else {
    for (let i = 0; i < 7; i += 1) rider.renderPoint(i, board, out.points[i]).sub(board.position).applyQuaternion(unturn).add(at);
    out.phase = phase();
  }
  out.heading = 0;
  out.boardPosition.copy(at);
  out.boardQuaternion.copy(unturn).multiply(board.orientation);
  out.stroking = 0;
  const velocity = board.velocity.clone().applyQuaternion(unturn);
  out.yawRate = board.angularVelocity.y;
  out.speed = Math.hypot(velocity.x, velocity.z);
  out.climb = velocity.y;
  out.travel.set(velocity.x, 0, velocity.z);
  if (out.travel.lengthSq() > 1e-12) out.travel.normalize();
  else out.travel.set(0, 0, 1);
  const reached = phase() === recipe.phase && (recipe.after === undefined || reachedAt !== undefined);
  return { state: out, reached };
}

/** The map's stance `id` for a Regular or Goofy `stance` (`simulateStance`). */
export function stanceState(id: string, stance: StanceName, at: Vector3, out: RiderVisualState): { state: RiderVisualState; reached: boolean } {
  const recipe = STANCE_RECIPES[id];
  if (!recipe) throw new Error(`No recipe for the stance ${id}.`);
  return simulateStance(recipe, stance, at, out);
}

/** The drawn state of a riding moment (the sheet's `?riding`), its stance of the map. */
export function ridingState(moment: RidingMoment, stance: StanceName, at: Vector3, out: RiderVisualState): RiderVisualState {
  return stanceState(MOMENT_STANCE[moment], stance, at, out).state;
}
