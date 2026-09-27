import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../physics/AttachedRider';
import { BoardBody } from '../physics/BoardBody';
import { PlaneWater } from '../physics/PlaneWater';
import type { StanceName } from '../physics/riderPosture';
import type { RiderVisualState } from '../scene/rig/riderVisualState';

/** Riding moments for the surfer sheet (Part B), each simulated by the real rider. */
export type RidingMoment = 'straight' | 'drop' | 'bottom turn' | 'backside turn' | 'top turn';
export const RIDING_MOMENTS: readonly RidingMoment[] = ['straight', 'drop', 'bottom turn', 'backside turn', 'top turn'];

const STEP = 1 / 60;
const FACE = (15 * Math.PI) / 180;

/** A standing rider on water: flat, or down a 15° face heading down its fall line. */
function mount(speed: number, stance: StanceName, face: boolean) {
  const board = new BoardBody();
  const water = face ? new PlaneWater({ slopeZ: -Math.tan(FACE) }) : new PlaneWater();
  if (face) {
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

/**
 * The drawn state of `moment` for `stance`, moved so the board sits at `at`
 * pointing +z (its roll and pitch kept), with the board's motion as the rig reads it.
 */
export function ridingState(moment: RidingMoment, stance: StanceName, at: Vector3, out: RiderVisualState): RiderVisualState {
  // Regular faces the board's −x rail: leaning that way is toward the toes (frontside).
  const toes = stance === 'regular' ? -1 : 1;
  const { board, rider, water } = mount(moment === 'drop' ? 5 : 8, stance, moment === 'drop');
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i += 1) board.step(STEP, water);
  };
  // The bottom turn's sequence: crouched first, then the lean, then Compress at the turn's base.
  if (moment !== 'straight' && moment !== 'top turn') rider.crouch = 0.6;
  run(0.4);
  if (moment === 'drop') {
    run(0.6);
  } else if (moment === 'bottom turn' || moment === 'backside turn') {
    rider.steer = moment === 'bottom turn' ? toes : -toes;
    run(0.3);
    rider.compress = 1;
    run(0.4);
  } else if (moment === 'top turn') {
    rider.steer = -toes;
    rider.trim = -0.5;
    run(0.6);
  } else {
    run(0.6);
  }
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  const heading = Math.atan2(forward.x, forward.z);
  const unturn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -heading);
  for (let i = 0; i < 7; i += 1) rider.renderPoint(i, board, out.points[i]).sub(board.position).applyQuaternion(unturn).add(at);
  out.phase = rider.attached ? rider.phase : 'fallen';
  out.heading = 0;
  out.boardPosition.copy(at);
  out.boardQuaternion.copy(unturn).multiply(board.orientation);
  out.stroking = 0;
  const velocity = board.velocity.clone().applyQuaternion(unturn);
  out.yawRate = board.angularVelocity.y;
  out.speed = Math.hypot(velocity.x, velocity.z);
  out.climb = velocity.y;
  out.travel.set(velocity.x, 0, velocity.z).normalize();
  return out;
}
