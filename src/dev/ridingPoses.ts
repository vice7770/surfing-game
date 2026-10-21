import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider, type RiderPhase, type RiderSeparation } from '../physics/AttachedRider';
import { BoardBody } from '../physics/BoardBody';
import { PlaneWater } from '../physics/PlaneWater';
import { RideSession } from '../physics/RideSession';
import type { SurfWater } from '../physics/SurfWater';
import { CoveredWater } from '../physics/testing/CoveredWater';
import type { StanceName } from '../physics/riderPosture';
import { RiderMotion } from '../scene/rig/riderMotion';
import { createRiderVisualState, readRiderSnapshot, type RiderVisualState } from '../scene/rig/riderVisualState';
import type { StanceAngles, StanceMeasure } from '../scene/rig/stanceGauge';
import { RIDER_SNAPSHOT, writeRiderSnapshot } from '../wave/SurfZoneRunner';

/** Riding moments for the surfer sheet (Part B), each simulated by the real rider: stances of the map. */
export type RidingMoment = 'straight' | 'drop' | 'bottom turn' | 'backside turn' | 'top turn' | 'snap';
export const RIDING_MOMENTS: readonly RidingMoment[] = ['straight', 'drop', 'bottom turn', 'backside turn', 'top turn', 'snap'];
/** Each riding moment's stance of the map. */
export const MOMENT_STANCE: Record<RidingMoment, string> = {
  straight: 'trim', drop: 'drop', 'bottom turn': 'compress-frontside', 'backside turn': 'compress-backside', 'top turn': 'top-turn-frontside', snap: 'snap-frontside',
};

const STEP = 1 / 60;
const FACE = (15 * Math.PI) / 180;
/**
 * The face that holds trim's speed (a steady recipe's, W1): down along the travel by this slope (10°), a standing rider
 * with no input keeps 7.9 of 8 m/s over 2 s, and 6.8 of 7 across a 15° face (2026-10-22).
 */
export const STEADY_SLOPE = 0.18;
/** A recipe's `pitch` comes over this long before the separation, s. */
export const PITCH_TIME = 0.2;

/** From `at` s the rider holds these controls; steer and the hand count toward the toes' rail (+1), whichever the stance. */
interface Controls {
  at: number;
  steer?: number;
  trim?: number;
  crouch?: number;
  compress?: number;
  hand?: boolean;
  /** Lying, the paddle held (the arms stroke). */
  paddle?: boolean;
  /** A press for one step (the pop-up; standing, Enter lies the rider down). */
  popUp?: boolean;
  /** In the water, the pop-up key held: reel the leash in, and grab the board once it is in reach. */
  reel?: boolean;
  /** In the water, swim (the paddle key). */
  swim?: boolean;
}

/** How the real rider reaches a stance of the map (`stanceMap.ts`). */
export interface StanceRecipe {
  /** The phase the stance is read in. */
  phase: RiderPhase | 'fallen';
  /**
   * Flat water; down a 15° face along its fall line; across one, the face rising on the toes' side (frontside) or the
   * heels' (backside); or up one, the board climbing its fall line (`climb`: the kick-out over the back).
   */
  water: 'flat' | 'face' | 'across' | 'across-back' | 'climb';
  /** Under a tube's curl (`CoveredWater`): full manual crouch folds into the deep tuck (the tube stances). */
  covered?: boolean;
  /** Standing on a board already moving, or lying on it (the pop-up), m/s. */
  start: 'standing' | 'prone';
  speed: number;
  controls: Controls[];
  /** Read at this time, s; or, with `after`, this long after the phase is first reached (within `seconds`). */
  seconds: number;
  after?: number;
  /**
   * Read over the last `over` s (a stroke of each arm), not at one instant: the
   * measures of a cycle take their extreme over it (`CYCLE_MEASURES`), the rest
   * the last frame's.
   */
  over?: number;
  /** The rider lets go (a fall) at this time, s. */
  separate?: number;
  /** The fall's cause as the session names it (balance by default): impact is the lip's (going over the falls). */
  cause?: RiderSeparation;
  /**
   * The board's pitch turned by the separation, ° (nose up +), over the
   * `PITCH_TIME` before it: a pearl's nose digging in (−35°), a kick-out's tail
   * sinking (+25°), as flat water cannot make them. Only the board's pose: the
   * body leaves with the rider's own motion.
   */
  pitch?: number;
  /** The fall body thrown at its first step, m/s on top of the rider's own (the lip's lift going over the falls, which flat water lacks). */
  thrown?: readonly [number, number, number];
  /** Read this long after the swimmer first holds the board (the recovery's grab), s, within `seconds`; not reached without a hold. */
  hold?: number;
  /**
   * The weight (the feet's pressure) read at steady speed (the phase-5 physics plan's W1): from the same run on its
   * water tilted down along the travel by `STEADY_SLOPE`, the face that holds trim's speed, as a wave's face feeds a
   * board trimming across it. Flat water's own drag slows the board about 0.2 g, and the contact passes that on: the
   * pressure moves ahead of the centre of mass by its height times the deceleration, which reads as weight on the front
   * foot. Riding straight only (flat water or across a face): a carve sheds 0.1–0.6 g on flat water, more than a face
   * gives back. The recipe's other measures are read on its own water.
   */
  steady?: boolean;
}

const standing = (controls: Controls[], seconds: number, extra: Partial<StanceRecipe> = {}): StanceRecipe => ({
  phase: 'standing', water: 'flat', start: 'standing', speed: 8, controls, seconds, ...extra,
});

/** The map's stances as the game reaches them (each stance's `reach`). */
export const STANCE_RECIPES: Record<string, StanceRecipe> = {
  // Riding straight, the weight is read at steady speed (W1: `steady`).
  trim: standing([], 1, { steady: true }),
  // The animation-realism plan's trims across a 15° face (the stance sheet's water): frontside the face rises on the
  // toes' side, backside on the heels'.
  'trim-frontside': standing([], 1.2, { water: 'across', speed: 7, steady: true }),
  'trim-backside': standing([], 1.2, { water: 'across-back', speed: 7, steady: true }),
  'trim-forward': standing([{ at: 0.4, trim: 1 }], 1, { steady: true }),
  'trim-back': standing([{ at: 0.4, trim: -1 }], 1, { steady: true }),
  drop: standing([{ at: 0, crouch: 1 }], 1, { water: 'face', speed: 5 }),
  'compress-frontside': standing([{ at: 0, crouch: 0.6 }, { at: 0.4, steer: 1 }, { at: 0.7, compress: 1 }], 1.1),
  'compress-backside': standing([{ at: 0, crouch: 0.6 }, { at: 0.4, steer: -1 }, { at: 0.7, compress: 1 }], 1.1),
  // The bottom turn's release: the movement-flow spec's projection, Compress let go tall and centred, holding that
  // heading (no steer: the flow autopilot's projection; the owner's ruling of 2026-10-07). It eased the steer to 0.3
  // with the weight back (trim −0.5), the thesis's final phase, until then.
  'extension-frontside': standing([
    { at: 0, crouch: 0.6 }, { at: 0.4, steer: 1 }, { at: 0.7, compress: 1 }, { at: 1.1, compress: 0, crouch: 0, steer: 0, trim: 0 },
  ], 1.4),
  'extension-backside': standing([
    { at: 0, crouch: 0.6 }, { at: 0.4, steer: -1 }, { at: 0.7, compress: 1 }, { at: 1.1, compress: 0, crouch: 0, steer: 0, trim: 0 },
  ], 1.4),
  // The redirects read once the drawn body has come round (the animation-realism plan's phase 2: the head, then the
  // chest, then the hips, each behind the last; until then 1.0, 0.9 and 1.2 s, mid-way through it). The top turn at full
  // S, as the coaching describes it (the owner's decision 5 of 2026-10-22; half S, −0.5, until then).
  'top-turn-frontside': standing([{ at: 0.4, steer: -1, trim: -1 }], 1.5),
  'top-turn-backside': standing([{ at: 0.4, steer: 1, trim: -1 }], 1.5),
  'snap-frontside': standing([{ at: 0.4, steer: -1, trim: -1 }], 1.4),
  'snap-backside': standing([{ at: 0.4, steer: 1, trim: -1 }], 1.4),
  'cutback-frontside': standing([{ at: 0, crouch: 0.5 }, { at: 0.4, steer: -1, trim: -0.7 }], 1.5),
  'cutback-backside': standing([{ at: 0, crouch: 0.5 }, { at: 0.4, steer: 1, trim: -0.7 }], 1.5),
  'pump-compression': standing([{ at: 0.4, crouch: 1 }], 0.8, { speed: 7, steady: true }),
  'pump-extension': standing([{ at: 0.4, crouch: 1 }, { at: 0.8, crouch: 0 }], 1.1, { speed: 7, steady: true }),
  // Crouched to the depth it was recorded at: Shift's 0.6 before the movement-flow spec's ladder made the crouch 0.65 of the depth.
  'hand-in-face': standing([{ at: 0, crouch: 0.92 }, { at: 0.4, hand: true }], 1, { water: 'across', speed: 6 }),
  // The animation-realism plan's tube stances (§5.14): the full crouch under a test curl folds into the deep tuck,
  // past the pumping crouch's depth (the plan's §6); frontside with the hand in the face (E: the front palm on it).
  // Read once the tuck is past Compress's depth (about 1.2 s in) and the stage has come in.
  'tube-frontside': standing([{ at: 0, crouch: 1 }, { at: 0.4, hand: true }], 1.6, { water: 'across', speed: 6, covered: true }),
  'tube-backside': standing([{ at: 0, crouch: 1 }], 1.5, { water: 'across-back', speed: 6, covered: true }),
  // The kick-out over the back (§5.15, §6): climbing straight up a 15° face with the weight fully back (S), slowing.
  'kick-out': standing([{ at: 0, trim: -1 }], 1.1, { water: 'climb', speed: 6 }),
  // Lying on a board towed at 6 m/s, as the wave would carry it (the body film's pop-up).
  'pop-up': { phase: 'push', water: 'flat', start: 'prone', speed: 6, controls: [{ at: 0.5, popUp: true }], seconds: 3, after: 0.3 },
  // The hands as they are placed (the animation-realism plan's phase 3: beside the lower ribs; the chest then rises over them).
  'pop-up-hands': { phase: 'push', water: 'flat', start: 'prone', speed: 6, controls: [{ at: 0.5, popUp: true }], seconds: 3, after: 0.22 },
  // The animation-realism plan's phase 3: paddling from rest (read over its sixth second, a stroke of each arm); the
  // catch, paddling from rest down a 15° face (the cue, and the board nose-down past 5° faster than 2.5 m/s); the
  // lineup sit, lying still with no input until the drawn rider has sat up (2 s idle, 0.8 s in).
  paddling: { phase: 'prone', water: 'flat', start: 'prone', speed: 0, controls: [{ at: 0, paddle: true }], seconds: 6, over: 1 },
  catch: { phase: 'prone', water: 'face', start: 'prone', speed: 0, controls: [{ at: 0, paddle: true }], seconds: 2 },
  sit: { phase: 'prone', water: 'flat', start: 'prone', speed: 0, controls: [], seconds: 3.6 },
  // Read at the landing's end (it lasts 0.5 s): the drawn feet are still spreading to the stance until then.
  landing: { phase: 'landing', water: 'flat', start: 'prone', speed: 6, controls: [{ at: 0.5, popUp: true }], seconds: 3, after: 0.45 },
  'lying-down': standing([{ at: 0.5, popUp: true }], 3, { speed: 6, after: 0.2, phase: 'recover' }),
  'fall-start': standing([], 3, { speed: 7, separate: 0.5, after: 0.15, phase: 'fallen' }),
  // The animation-realism plan's phase 4: the falls by cause from riding at 7 m/s on flat water, the board's pose at the
  // separation standing in for a pearl's nose (−35°) and a kick-out's sinking tail (+25°), and a throw (2.5 m/s up, 1.5
  // forward) for the lip's lift over the falls, which flat water makes none of; each read at its reflex's moment: the
  // shield 0.5 s in, the tumble's curl 0.7 s in (in the water, turning over), the cause's own shape 0.45 s in, the ball 0.6 s
  // in. Then surfacing (rising under water 3 s after the fall), reeling the leash in, and holding the board to climb on,
  // a second after the grab (both hands at the rail's middle, the board rolling under the pull: Goofy's leash on the
  // other leg, its swimmer comes within reach at 19.3 s, Regular's at 3 s).
  'fall-side': standing([], 3, { speed: 7, separate: 0.5, after: 0.5, phase: 'fallen' }),
  'fall-tumble': standing([], 3, { speed: 7, separate: 0.5, after: 0.7, phase: 'fallen' }),
  'fall-pearl': standing([], 3, { speed: 7, separate: 0.5, pitch: -35, after: 0.45, phase: 'fallen' }),
  'fall-over': standing([], 3, { speed: 7, separate: 0.5, cause: 'impact', thrown: [0, 2.5, 1.5], after: 0.6, phase: 'fallen' }),
  'fall-back': standing([], 3, { speed: 7, separate: 0.5, pitch: 25, after: 0.45, phase: 'fallen' }),
  surfacing: standing([], 3.5, { speed: 7, separate: 0.5, phase: 'fallen' }),
  reel: standing([{ at: 5, reel: true }], 5.6, { speed: 7, separate: 0.5, phase: 'fallen' }),
  'climb-grab': standing([{ at: 1.5, reel: true }], 23, { speed: 7, separate: 0.5, hold: 2.2, phase: 'fallen' }),
};

/**
 * Crouched trim (Shift held) across the face, frontside: the owner's reference
 * photo of 2026-10-22 (the arms framing the knees), not a stance of the map.
 */
export const CROUCHED_TRIM: StanceRecipe = standing([{ at: 0, crouch: 1 }], 1.2, { water: 'across', speed: 7 });

/** Across a face, the slope along x: rising on the toes' side (−x Regular, +x Goofy), or the heels' (backside). */
function acrossSlope(kind: StanceRecipe['water'], stance: StanceName): number {
  return (stance === 'regular' ? -1 : 1) * (kind === 'across-back' ? -1 : 1) * Math.tan(FACE);
}

/** The recipe's water for a Regular or Goofy rider: across a face, it rises on the toes' side, or the heels' (`across-back`). */
function planeFor(kind: StanceRecipe['water'], stance: StanceName): PlaneWater {
  if (kind === 'face') return new PlaneWater({ slopeZ: -Math.tan(FACE) });
  if (kind === 'climb') return new PlaneWater({ slopeZ: Math.tan(FACE) });
  if (kind === 'across' || kind === 'across-back') return new PlaneWater({ slopeX: acrossSlope(kind, stance) });
  return new PlaneWater();
}

/** The recipe's water: its plane, under a test curl where the recipe asks (`covered`). */
function waterFor(recipe: Pick<StanceRecipe, 'water' | 'covered'>, stance: StanceName): SurfWater {
  const plane = planeFor(recipe.water, stance);
  return recipe.covered ? new CoveredWater(plane) : plane;
}

/** A steady recipe's water (W1): its flat water or face across, tilted down along the travel (+z) by `STEADY_SLOPE`. */
function steadySlopes(kind: StanceRecipe['water'], stance: StanceName): { slopeX: number; slopeZ: number } {
  if (kind !== 'flat' && kind !== 'across' && kind !== 'across-back') throw new Error(`No steady water for ${kind}.`);
  return { slopeX: kind === 'flat' ? 0 : acrossSlope(kind, stance), slopeZ: -STEADY_SLOPE };
}

/**
 * A standing rider on water: flat, down a 15° face along its fall line, up it, or across it lying on its slope; or, on
 * a steady recipe's water (`slopes`), along +z on its plane.
 */
function mount(speed: number, stance: StanceName, kind: StanceRecipe['water'], slopes?: { slopeX: number; slopeZ: number }) {
  const board = new BoardBody();
  if (slopes) {
    const normal = new Vector3(-slopes.slopeX, 1, -slopes.slopeZ).normalize();
    const forward = new Vector3(0, slopes.slopeZ, 1).normalize();
    const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, forward), normal, forward));
    board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), orientation, forward.multiplyScalar(speed));
  } else if (kind === 'across' || kind === 'across-back') {
    const slopeX = acrossSlope(kind, stance);
    const normal = new Vector3(-slopeX, 1, 0).normalize();
    const forward = new Vector3(0, 0, 1);
    const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, forward), normal, forward));
    board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), orientation, forward.multiplyScalar(speed));
  } else if (kind === 'face') {
    const normal = new Vector3(0, 1, Math.tan(FACE)).normalize();
    const fall = new Vector3(0, -Math.sin(FACE), Math.cos(FACE));
    const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, fall), normal, fall));
    board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), orientation, fall.multiplyScalar(speed));
  } else if (kind === 'climb') {
    const normal = new Vector3(0, 1, -Math.tan(FACE)).normalize();
    const rise = new Vector3(0, Math.sin(FACE), Math.cos(FACE));
    const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, rise), normal, rise));
    board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), orientation, rise.multiplyScalar(speed));
  } else {
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  }
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
  board.attach(rider);
  return { board, rider };
}

/** The controls held at `time`, s: each field as last set. */
function controlsAt(recipe: StanceRecipe, time: number): Omit<Controls, 'at'> {
  const held: Omit<Controls, 'at'> = {};
  for (const { at, popUp: _press, ...rest } of recipe.controls) if (at <= time + 1e-9) Object.assign(held, rest);
  held.popUp = recipe.controls.some((control) => control.popUp && Math.abs(time - control.at) < STEP / 2);
  return held;
}

interface Run {
  board: BoardBody;
  rider: AttachedRider;
  session?: RideSession;
  reached: boolean;
}

/**
 * Plays `recipe` with the real rider for a Regular or Goofy `stance`: standing
 * stances on the rider alone (the sheet's riding moments), the pop-up, lying
 * down and a fall through a ride session. `visit` sees the world's drawn state
 * after every step. `reached` is false when the rider ended in another phase
 * (it fell, or never got there).
 */
function play(recipe: StanceRecipe, stance: StanceName, visit?: (world: RiderVisualState, time: number) => void, steady = false): Run {
  const toes = stance === 'regular' ? -1 : 1;
  const slopes = steady ? steadySlopes(recipe.water, stance) : undefined;
  const water = slopes ? new PlaneWater(slopes) : waterFor(recipe, stance);
  const session = recipe.start === 'prone' || recipe.after !== undefined || recipe.separate !== undefined ? new RideSession({ stance }) : undefined;
  const mounted = session ? undefined : mount(recipe.speed, stance, recipe.water, slopes);
  if (session) session.place({ x: 0, z: 0, heading: 0, speed: recipe.start === 'prone' ? 0 : recipe.speed, phase: recipe.start }, water);
  const board = session?.board ?? mounted!.board;
  const rider = session?.rider ?? mounted!.rider;
  const run: Run = { board, rider, session, reached: false };
  const phase = () => (rider.attached ? rider.phase : 'fallen');
  const world = visit && createRiderVisualState();
  let reachedAt: number | undefined;
  let heldAt: number | undefined;
  let time = 0;
  let throwing = false;
  const end = Math.round(recipe.seconds / STEP);
  for (let i = 0; i < end; i += 1) {
    const controls = controlsAt(recipe, time);
    const steer = (controls.steer ?? 0) * toes;
    if (session) {
      // The board pitched over the 0.2 s before the separation (a nose digging in, a tail sinking), then the fall.
      if (recipe.separate !== undefined && recipe.pitch && rider.attached && time > recipe.separate - PITCH_TIME - STEP / 2 && time < recipe.separate + STEP / 2) {
        pitchBoardToward(board, recipe.pitch, STEP / Math.max(STEP, recipe.separate - time + STEP));
      }
      if (recipe.separate !== undefined && Math.abs(time - recipe.separate) < STEP / 2 && rider.attached) {
        session.separate(recipe.cause ?? 'balance');
        throwing = recipe.thrown !== undefined;
      }
      // Lying down, towed as the wave would carry the board (none from rest: the rider paddles, or floats).
      if (recipe.start === 'prone' && recipe.speed > 0 && rider.attached && rider.phase !== 'standing') {
        board.velocity.z = recipe.speed;
        rider.velocity.z = recipe.speed;
      }
      session.step(STEP, water, {
        paddle: controls.paddle === true || controls.swim === true, popUp: controls.popUp === true, steer, trim: controls.trim, crouch: controls.crouch,
        compress: controls.compress, hand: controls.hand, reel: controls.reel === true,
      });
      if (throwing && session.surfer.active) {
        throwing = false;
        const [x, y, z] = recipe.thrown!;
        for (const node of session.surfer.nodes) node.velocity.add(new Vector3(x, y, z));
      }
    } else {
      rider.steer = steer;
      rider.trim = controls.trim ?? 0;
      rider.crouch = controls.crouch ?? 0;
      rider.compress = controls.compress ?? 0;
      rider.hand = controls.hand ?? false;
      board.step(STEP, water);
    }
    time += STEP;
    if (visit && world) {
      worldState(run, world);
      // As the page does: the player's own stance is known.
      world.stance = stance;
      // As the page does (`PhysicalMode`): the hands pull while paddling lying down.
      world.stroking = controls.paddle === true && world.phase === 'prone' ? 1 : 0;
      visit(world, time);
    }
    if (recipe.after !== undefined) {
      if (reachedAt === undefined && phase() === recipe.phase) reachedAt = time;
      if (reachedAt !== undefined && time >= reachedAt + recipe.after - 1e-9) break;
    }
    if (recipe.hold !== undefined && session) {
      if (heldAt === undefined && session.recovery.state === 'holding') heldAt = time;
      if (heldAt !== undefined && time >= heldAt + recipe.hold - 1e-9) break;
    }
  }
  run.reached = phase() === recipe.phase && (recipe.after === undefined || reachedAt !== undefined) && (recipe.hold === undefined || heldAt !== undefined);
  return run;
}

/** The board turned nose up (+) or down by `degrees` about its left (a recipe's `pitch` at the separation). */
export function pitchBoard(board: BoardBody, degrees: number): void {
  const left = new Vector3(1, 0, 0).applyQuaternion(board.orientation);
  board.orientation.premultiply(new Quaternion().setFromAxisAngle(left, (-degrees * Math.PI) / 180)).normalize();
}

/**
 * The board turned `share` of the way from its pitch now to `degrees` (nose up +): a recipe's `pitch` over the
 * `PITCH_TIME` before the separation, each step the rest's share (the water turns it back between steps), so it
 * reaches it as the rider lets go.
 */
export function pitchBoardToward(board: BoardBody, degrees: number, share: number): void {
  const nose = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  const now = (Math.asin(Math.max(-1, Math.min(1, nose.y))) * 180) / Math.PI;
  pitchBoard(board, (degrees - now) * Math.min(1, share));
}

/**
 * What the page draws a ride session's fallen surfer from beyond its snapshot
 * (`PhysicalMode`: the status's separation, the hold it reads), here straight
 * from the session: why the rider fell, and whether the swimmer holds the board.
 */
export function sessionCues(session: RideSession, out: RiderVisualState): RiderVisualState {
  out.separation = session.separation;
  out.swim.holding = !session.rider.attached && session.recovery.state === 'holding';
  return out;
}

/** The run's drawn state in the world: the seven points, the phase, the heading and the board's pose. */
function worldState({ board, rider, session }: Run, out: RiderVisualState): RiderVisualState {
  const pose = new Float64Array(8);
  board.position.toArray(pose, 0);
  board.orientation.toArray(pose, 3);
  if (session) {
    const snapshot = new Float64Array(RIDER_SNAPSHOT.length);
    // The take-off cue as the page has it (the rider's own; the wave's take-off window needs a wave).
    writeRiderSnapshot(session, session.rider.attached && session.rider.popUpCue, snapshot, new Vector3());
    readRiderSnapshot(snapshot, pose, out);
    sessionCues(session, out);
  } else {
    for (let i = 0; i < 7; i += 1) rider.renderPoint(i, board, out.points[i]);
    out.phase = rider.attached ? rider.phase : 'fallen';
    out.weight = rider.attached ? rider.contact.weight : Number.NaN;
    const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    out.heading = Math.atan2(forward.x, forward.z);
    out.boardPosition.copy(board.position);
    out.boardQuaternion.copy(board.orientation);
  }
  out.stroking = 0;
  return out;
}

/** The move that sets the run's last board at `at` with its nose along +z (its roll and pitch kept). */
function frameAt(board: BoardBody, at: Vector3) {
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  const yaw = Math.atan2(forward.x, forward.z);
  return { from: board.position.clone(), at: at.clone(), yaw, unturn: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -yaw) };
}

/** Moves a drawn state rigidly by `frame`. */
function moveBy(state: RiderVisualState, frame: ReturnType<typeof frameAt>): RiderVisualState {
  const move = (point: Vector3) => point.sub(frame.from).applyQuaternion(frame.unturn).add(frame.at);
  for (const point of state.points) move(point);
  move(state.leash.plug);
  move(state.boardPosition);
  state.boardQuaternion.premultiply(frame.unturn);
  state.heading -= frame.yaw;
  return state;
}

/**
 * Runs `recipe` with the real rider for a Regular or Goofy `stance` (`play`)
 * and writes its last drawn state into `out`, moved so the board sits at `at`
 * with its nose along +z, with the board's motion as the rig reads it: the
 * physics' stance, as a held still.
 */
export function simulateStance(recipe: StanceRecipe, stance: StanceName, at: Vector3, out: RiderVisualState): { state: RiderVisualState; reached: boolean } {
  const run = play(recipe, stance);
  const frame = frameAt(run.board, at);
  moveBy(worldState(run, out), frame);
  out.heading = 0;
  const velocity = run.board.velocity.clone().applyQuaternion(frame.unturn);
  out.yawRate = run.board.angularVelocity.y;
  out.speed = Math.hypot(velocity.x, velocity.z);
  out.climb = velocity.y;
  out.travel.set(velocity.x, 0, velocity.z);
  if (out.travel.lengthSq() > 1e-12) out.travel.normalize();
  else out.travel.set(0, 0, 1);
  if (recipe.steady) out.weight = steadyWeight(recipe, stance);
  return { state: out, reached: run.reached };
}

/**
 * The weight a `steady` recipe reads (W1): the rider's at the read's end, the same run down the face that holds trim's
 * speed (`STEADY_SLOPE`). NaN when the rider is not standing then.
 */
export function steadyWeight(recipe: StanceRecipe, stance: StanceName): number {
  const run = play(recipe, stance, undefined, true);
  return run.reached ? run.rider.contact.weight : Number.NaN;
}

/**
 * The map's stance `id` as the game draws it: every step of the run, moved so
 * its last board sits at `at`, goes through the page's motion estimate
 * (`RiderMotion`) and its clock to `draw` (a posed body, a surfer), so the
 * smoothing layer's blends are those the player sees at that instant. Returns
 * the last state drawn.
 */
export function drawnStance(id: string, stance: StanceName, at: Vector3, draw: (state: RiderVisualState) => void): { state: RiderVisualState; reached: boolean } {
  const recipe = STANCE_RECIPES[id];
  if (!recipe) throw new Error(`No recipe for the stance ${id}.`);
  return drawnRecipe(recipe, stance, at, draw);
}

/** Any recipe as the game draws it (`drawnStance`): for a motion followed over time, not only a held stance. */
export function drawnRecipe(recipe: StanceRecipe, stance: StanceName, at: Vector3, draw: (state: RiderVisualState) => void): { state: RiderVisualState; reached: boolean } {
  // The physics is deterministic: a first run finds where the last board lies, the second draws the moved run.
  const frame = frameAt(play(recipe, stance).board, at);
  const motion = new RiderMotion();
  const last = createRiderVisualState();
  const run = play(recipe, stance, (world, time) => {
    moveBy(world, frame);
    motion.update(world, time);
    world.clock = time;
    draw(world);
    copyState(world, last);
  });
  if (recipe.steady) last.weight = steadyWeight(recipe, stance);
  return { state: last, reached: run.reached };
}

/** Copies what the rig reads from one drawn state into another. */
function copyState(from: RiderVisualState, to: RiderVisualState): void {
  from.points.forEach((point, i) => to.points[i].copy(point));
  Object.assign(to, {
    phase: from.phase, heading: from.heading, stroking: from.stroking, cue: from.cue, yawRate: from.yawRate, speed: from.speed, climb: from.climb,
    uprightBlend: from.uprightBlend, standingBlend: from.standingBlend, duck: from.duck, clock: from.clock, breath: from.breath,
    separation: from.separation, stance: from.stance, weight: from.weight,
  });
  to.boardPosition.copy(from.boardPosition);
  to.boardQuaternion.copy(from.boardQuaternion);
  to.travel.copy(from.travel);
  to.leash.plug.copy(from.leash.plug);
  Object.assign(to.leash, { worn: from.leash.worn, snapped: from.leash.snapped, reeling: from.leash.reeling, gripped: from.leash.gripped });
  to.leash.grip.copy(from.leash.grip);
  Object.assign(to.swim, from.swim);
}

/** The measures of a cycle (a recipe's `over`): read at their extreme over the window, the farthest the stroke goes. */
export const CYCLE_MEASURES: readonly StanceMeasure[] = ['handAhead', 'pullDepth'];

/**
 * The map's stance `id` as the game draws it (`drawnStance`), measured: at its
 * last frame, or, for a recipe read `over` a window, each measure of a cycle
 * (`CYCLE_MEASURES`) at its extreme over it. `measure` reads the body `draw`
 * posed.
 */
export function measureDrawnStance(
  id: string, stance: StanceName, at: Vector3, draw: (state: RiderVisualState) => void, measure: (state: RiderVisualState) => StanceAngles,
): { state: RiderVisualState; reached: boolean; angles: StanceAngles } {
  const recipe = STANCE_RECIPES[id];
  if (!recipe) throw new Error(`No recipe for the stance ${id}.`);
  const window: StanceAngles[] = [];
  const { over } = recipe;
  const drawn = drawnRecipe(recipe, stance, at, (step) => {
    draw(step);
    if (over !== undefined && step.clock >= recipe.seconds - over - 1e-9) window.push(measure(step));
  });
  const angles = measure(drawn.state);
  for (const key of CYCLE_MEASURES) {
    const values = window.map((reading) => reading[key]).filter(Number.isFinite);
    if (values.length) angles[key] = Math.max(...values);
  }
  return { ...drawn, angles };
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
