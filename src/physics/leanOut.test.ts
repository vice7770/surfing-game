import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;

/** Standing on a still plane face (`slope`°, falling toward +z) heading down its fall line at `speed`. */
function onFace(slope: number, speed: number, stance: 'regular' | 'goofy') {
  const tilt = slope / DEG;
  const normal = new Vector3(0, 1, Math.tan(tilt)).normalize();
  const fall = new Vector3(0, -Math.sin(tilt), Math.cos(tilt));
  const left = new Vector3().crossVectors(normal, fall).normalize();
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, fall)), fall.clone().multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
  board.attach(rider);
  const water = new PlaneWater({ slopeZ: -Math.tan(tilt) });
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  return { board, rider, water };
}

/**
 * The flow's compressed rail change, without the projection between: from straight down the face, the flow's
 * compressed bottom turn (steer −`side`, Compress, a little weight forward) until the board heads 25° off the fall
 * line, then at once its cutback the other way (steer `side`, Compress, the back foot, the rotation stick) until the
 * board heads 30° past the fall line or for 1.2 s, then its rebound (the bottom turn's inputs) for 1 s. How far the old
 * turn ran on after the steer changed sides, degrees; whether the rider stayed on to the rebound's end; the lean-out
 * pull's work, J.
 */
function railChange(slope: number, speed: number, stance: 'regular' | 'goofy', side: number) {
  const { board, rider, water } = onFace(slope, speed, stance);
  const toward = () => {
    const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    return -side * Math.atan2(forward.x, forward.z) * DEG;
  };
  Object.assign(rider, { steer: -side, trim: 0.3, compress: 1, crouch: 0 });
  for (let i = 0; i < 180 && rider.attached && toward() < 25; i += 1) board.step(STEP, water);
  const changed = toward();
  let furthest = changed;
  Object.assign(rider, { steer: side, trim: -0.5, compress: 1, crouch: 0, rotate: side });
  for (let i = 0; i < 72 && rider.attached && toward() > -30; i += 1) {
    board.step(STEP, water);
    furthest = Math.max(furthest, toward());
  }
  Object.assign(rider, { steer: -side, trim: 0.3, compress: 1, crouch: 0, rotate: Number.NaN });
  for (let i = 0; i < 60 && rider.attached; i += 1) board.step(STEP, water);
  return { attached: rider.attached, runOn: furthest - changed, leanOut: rider.work.leanOut };
}

// The movement-flow spec's cutback changes rails out of a lean the other way. The rail follows the body, so the old
// turn runs on until the body is upright: from this full compressed carve (31° of lean) at 9 m/s it ran on 29–31°
// before LEAN_OUT_PULL, and on one rail of each stance (4 of these 8 runs) the rider fell into the new lean or in the
// rebound; with it the old turn runs on 15–17° and every rider stays on.
describe('the rail change (the movement-flow spec)', () => {
  it.each([
    [3, 'regular', 1], [3, 'regular', -1], [3, 'goofy', 1], [3, 'goofy', -1],
    [5, 'regular', 1], [5, 'regular', -1], [5, 'goofy', 1], [5, 'goofy', -1],
  ] as const)(
    'comes off a compressed carve on a %i° face at 9 m/s with the old turn running on under 22° (%s, side %i)',
    (slope, stance, side) => {
      const change = railChange(slope, 9, stance, side);
      expect(change.attached).toBe(true);
      expect(change.runOn).toBeLessThan(22);
      expect(change.leanOut).not.toBe(0);
    },
  );

  // The pull acts only on a body leaning the other way to the steer: never in a turn begun upright, never unsteered.
  it('does no work in a compressed turn begun upright, or riding straight', () => {
    const { board, rider, water } = onFace(5, 8, 'regular');
    Object.assign(rider, { steer: -1, compress: 1 });
    for (let i = 0; i < 72 && rider.attached; i += 1) board.step(STEP, water);
    expect(rider.work.assist).not.toBe(0);
    expect(rider.work.leanOut).toBe(0);
    const straight = onFace(5, 8, 'regular');
    Object.assign(straight.rider, { steer: 0, compress: 1 });
    for (let i = 0; i < 72; i += 1) straight.board.step(STEP, straight.water);
    expect(straight.rider.work.leanOut).toBe(0);
  });

  // Mirroring COMPRESS_PULL's gate: a rail change without Compress is left to the feet and the upper body.
  it('does no work in a rail change without Compress', () => {
    const { board, rider, water } = onFace(5, 8, 'regular');
    rider.steer = -1;
    for (let i = 0; i < 36; i += 1) board.step(STEP, water);
    expect(rider.bank.angle).toBeLessThan(-0.2);
    rider.steer = 1;
    for (let i = 0; i < 60 && rider.attached; i += 1) board.step(STEP, water);
    expect(rider.work.leanOut).toBe(0);
  });
});
