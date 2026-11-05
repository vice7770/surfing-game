import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

// The body's own yaw (snap-body-yaw, 2026-11-05, the owner's call (c); docs/research/snap-body-yaw-2026-11-05/README.md),
// opt-in with `bodyYaw: 'on'` (the `?bodyYaw=on` dev switch): the board's yaw carries the feet round, and the hips turn the
// leaning body after it within their range. By default the lean turns with the board, as before.

const STEP = 1 / 60;
const DEG = 180 / Math.PI;
const FACE_FLOW = 1.5;

/** A standing rider across the static 15° face (`AttachedRider.test.ts`'s `acrossFace`), `acrossDegrees` from its fall line. */
function acrossFace(acrossDegrees: number, speed: number, bodyYaw?: 'on', flow = 0) {
  const slope = (15 * Math.PI) / 180;
  const yaw = acrossDegrees / DEG;
  const normal = new Vector3(0, 1, Math.tan(slope)).normalize();
  const fall = new Vector3(0, -Math.sin(slope), Math.cos(slope));
  const side = new Vector3().crossVectors(normal, fall).normalize();
  const forward = fall.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(side, -Math.sin(yaw)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const up = fall.clone().multiplyScalar(-flow);
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed).add(up));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...(bodyYaw ? { bodyYaw } : {}) });
  board.attach(rider);
  return { board, rider, water: new PlaneWater({ slopeZ: -Math.tan(slope), flow: { x: up.x, y: up.y, z: up.z } }) };
}

const headingOf = (board: BoardBody) => { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** A bottom turn carved up from across to 120° from the fall line, then the steer reversed for 2 s (the pinned deep U). */
function bottomIntoTop(bodyYaw?: 'on', flow = 0) {
  const { board, rider, water } = acrossFace(90, 9, bodyYaw, flow);
  for (let i = 0; i < 12; i += 1) board.step(STEP, water);
  const fromFallLine = () => Math.abs(headingOf(board) * DEG);
  rider.steer = -1;
  let lag = 0;
  for (let i = 0; i < 180 && rider.attached && fromFallLine() < 120; i += 1) {
    board.step(STEP, water);
    lag = Math.max(lag, Math.abs(wrap(rider.bodyYaw.heading - headingOf(board))));
  }
  rider.steer = 1;
  let lowest = 180;
  for (let i = 0; i < 120; i += 1) {
    board.step(STEP, water);
    if (!rider.attached) break;
    lowest = Math.min(lowest, fromFallLine());
    lag = Math.max(lag, Math.abs(wrap(rider.bodyYaw.heading - headingOf(board))));
  }
  return { attached: rider.attached, lowest, lag: lag * DEG };
}

describe('the body\'s own yaw (opt-in)', () => {
  it('keeps the body on the board\'s heading by default (read as each substep begins)', () => {
    const { board, rider, water } = acrossFace(90, 9);
    rider.steer = -1;
    for (let i = 0; i < 60 && rider.attached; i += 1) {
      board.step(STEP, water);
      expect(Math.abs(wrap(rider.bodyYaw.heading - headingOf(board))) * DEG).toBeLessThan(0.5);
    }
  });

  it('starts on the board\'s heading, and lags a turning board within the hips\' range', () => {
    const { board, rider, water } = acrossFace(90, 9, 'on');
    board.step(STEP, water);
    expect(Math.abs(wrap(rider.bodyYaw.heading - headingOf(board))) * DEG).toBeLessThan(1);
    expect(bottomIntoTop('on').lag).toBeGreaterThan(2);
    expect(bottomIntoTop('on').lag).toBeLessThanOrEqual(45 + 1e-6);
  });

  // The deep U's root (`AttachedRider.test.ts`, pinned as `it.fails` without it): carried rigidly, the leaning body takes
  // the board on round to 160–180° and falls; turning on its own, the board comes back down past across, the rider on.
  it.each([['the still face', 0], ['the moving face', FACE_FLOW]] as const)('carries a bottom turn up %s into a top turn back down it', (_, flow) => {
    expect(bottomIntoTop(undefined, flow).attached).toBe(false);
    const turn = bottomIntoTop('on', flow);
    expect(turn.attached).toBe(true);
    expect(turn.lowest).toBeLessThan(90);
  });
});
