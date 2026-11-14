import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
const G = 9.81;

/** Standing on a still plane face (`slope`°, falling toward +z) heading down its fall line at `speed` (as leanOut.test). */
function onFace(slope: number, speed: number, legDrive?: 'on' | 'turn') {
  const tilt = (slope * Math.PI) / 180;
  const normal = new Vector3(0, 1, Math.tan(tilt)).normalize();
  const fall = new Vector3(0, -Math.sin(tilt), Math.cos(tilt));
  const left = new Vector3().crossVectors(normal, fall).normalize();
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, fall)), fall.clone().multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...(legDrive ? { legDrive } : {}) });
  board.attach(rider);
  const water = new PlaneWater({ slopeZ: -Math.tan(tilt) });
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  return { board, rider, water };
}

/** A turn one way for 0.6 s, then the steer the other way for `frames`; `each` after every step of the second. */
function railChange(compress: number, legDrive: 'on' | 'turn' | undefined, frames: number, each?: (rider: AttachedRider, board: BoardBody) => void) {
  const { board, rider, water } = onFace(5, 8, legDrive);
  Object.assign(rider, { steer: -1, compress });
  for (let i = 0; i < 36; i += 1) board.step(STEP, water);
  const leaning = rider.bank.angle;
  rider.steer = 1;
  for (let i = 0; i < frames && rider.attached; i += 1) {
    board.step(STEP, water);
    each?.(rider, board);
  }
  return { board, rider, leaning };
}

// leg-drive (2026-11-10, "no force without its reaction"; opt-in with `legDrive: 'on'`, the `?legDrive=on` dev switch):
// the rail change's righting push made by the legs, on the body toward the new rail with the opposite on the board at
// the back foot, in the lean-out pull's place. docs/research/leg-drive-2026-11-10/README.md.
describe('the leg drive (opt-in)', () => {
  it('leaves the default alone: no push, and the lean-out pull as before', () => {
    const today = railChange(1, undefined, 30);
    expect(today.rider.legPush.force.length()).toBe(0);
    expect(today.rider.work.legDrive).toBe(0);
    expect(today.rider.work.leanOut).not.toBe(0);
  });

  it('replaces the lean-out pull, never both, and pushes without Compress too', () => {
    const compressed = railChange(1, 'on', 30);
    expect(compressed.leaning).toBeLessThan(-0.2);
    expect(compressed.rider.work.leanOut).toBe(0);
    expect(compressed.rider.work.legDrive).not.toBe(0);
    const standing = railChange(0, 'on', 30);
    expect(standing.rider.work.leanOut).toBe(0);
    expect(standing.rider.work.legDrive).not.toBe(0);
  });

  it('pushes toward the new rail within the leg\'s strength and the back foot\'s grip, only while the body leans the old way', () => {
    let pushed = 0;
    railChange(1, 'on', 60, (rider, board) => {
      const { force } = rider.legPush;
      if (force.lengthSq() === 0) return;
      pushed += 1;
      // Level, toward the steer's side of the board's path (+x is the left of a path down +z), no more than 0.35 of the weight.
      expect(Math.abs(force.y)).toBe(0);
      expect(force.dot(new Vector3().crossVectors(new Vector3(0, 1, 0), board.velocity))).toBeGreaterThan(0);
      expect(force.length()).toBeLessThanOrEqual(0.35 * rider.mass * G + 1e-9);
      expect(rider.bank.angle).toBeLessThan(0);
    });
    expect(pushed).toBeGreaterThan(5);
    // Riding straight, or turning from upright, the legs push nothing.
    const { board, rider, water } = onFace(5, 8, 'on');
    Object.assign(rider, { steer: -1, compress: 1 });
    for (let i = 0; i < 72 && rider.attached; i += 1) board.step(STEP, water);
    expect(rider.work.legDrive).toBe(0);
  });

  // The pair in the board's solve: the push on the body and the opposite on the board at the back foot add nothing to
  // the two's momentum (rows 0–2), turn the two by the couple of their two lines (rows 3–5), and move the body alone
  // along its leg and across it (rows 6 and 7). Read as the difference the push makes to the solve's right-hand side.
  it('sums to nothing on rider plus board, and its moment is the two forces\' couple', () => {
    const { rider } = railChange(1, 'on', 6);
    const inner = rider as unknown as { external: Vector3; driveForce: Vector3; arm: Vector3; up: Vector3; across: Vector3 };
    const force = rider.legPush.force.clone();
    expect(force.length()).toBeGreaterThan(0.1 * rider.mass * G);
    const h = 1 / 240;
    const withPush = new Float64Array(8);
    rider.coupleStanding(new Float64Array(64), withPush, h);
    inner.external.sub(force);
    inner.driveForce.set(0, 0, 0);
    const without = new Float64Array(8);
    rider.coupleStanding(new Float64Array(64), without, h);
    const by = Array.from(withPush, (value, i) => value - without[i]);
    const scale = h * force.length();
    for (let i = 0; i < 3; i += 1) expect(Math.abs(by[i]) / scale).toBeLessThan(1e-9);
    const couple = new Vector3().subVectors(inner.arm, rider.legPush.foot).cross(force).multiplyScalar(h);
    expect(new Vector3(by[3], by[4], by[5]).distanceTo(couple) / scale).toBeLessThan(1e-9);
    expect(Math.abs(by[6] - h * inner.up.dot(force)) / scale).toBeLessThan(1e-9);
    expect(Math.abs(by[7] - h * inner.across.dot(force)) / scale).toBeLessThan(1e-9);
    // The back foot is behind the board's centre and under the body: the couple has a yaw part and a roll part.
    expect(couple.length()).toBeGreaterThan(0.3 * scale);
  });

  it('has more reach crouched than standing, and the push ends at the reach', () => {
    let standing = 0;
    let crouched = 0;
    railChange(0, 'on', 12, (rider) => { standing = rider.legPush.reach; });
    railChange(1, 'on', 40, (rider) => { crouched = Math.max(crouched, rider.legPush.reach); });
    // sqrt(0.88² − 0.78²) = 0.41 m standing; toward sqrt(0.88² − 0.48²) = 0.74 m in Compress's crouch.
    expect(standing).toBeGreaterThan(0.35);
    expect(standing).toBeLessThan(0.47);
    expect(crouched).toBeGreaterThan(standing + 0.15);
    // Never a push with the reach used up; and with the feet already that far out (set here), none at all.
    railChange(1, 'on', 60, (rider) => {
      if (rider.legPush.force.lengthSq() > 0) expect(rider.legPush.used).toBeLessThan(rider.legPush.reach);
    });
    const { board, rider } = railChange(1, 'on', 4);
    expect(rider.legPush.force.length()).toBeGreaterThan(0);
    (rider as unknown as { driveUsed: number }).driveUsed = rider.legPush.reach + 0.05;
    board.step(1 / 240, new PlaneWater({ slopeZ: -Math.tan((5 * Math.PI) / 180) }));
    expect(rider.bank.angle).toBeLessThan(-0.05);
    expect(rider.legPush.force.length()).toBe(0);
  });
});

// Step 3.2t, `legDrive: 'turn'` (the `?legDrive=turn` dev switch, opt-in): the same leg pair also leads the lean into a
// compressed turn, in COMPRESS_PULL's place, so the compressed turn's inward pull on the body is paired too. The owner's
// rule it exists for: no force without its reaction. `AttachedRider`'s `legTurn` note carries what it costs.
describe("the leg drive leading a compressed turn (`legDrive: 'turn'`, opt-in)", () => {
  /** A compressed turn one way, held: the movement COMPRESS_PULL leads the lean into. */
  function turnIn(legDrive: 'on' | 'turn' | undefined, frames = 60, each?: (rider: AttachedRider, board: BoardBody) => void) {
    const { board, rider, water } = onFace(5, 8, legDrive);
    Object.assign(rider, { steer: 1, compress: 1 });
    for (let i = 0; i < frames && rider.attached; i += 1) {
      board.step(STEP, water);
      each?.(rider, board);
    }
    return { board, rider };
  }

  it("leaves 'on' and the default alone: the compressed pull is still the body's own, and the legs lead nothing", () => {
    for (const drive of [undefined, 'on' as const]) {
      const { rider } = turnIn(drive);
      // COMPRESS_PULL's inward pull on the body, with no reaction on the board: unchanged by this step.
      expect((rider as unknown as { assistForce: Vector3 }).assistForce.length()).toBeGreaterThan(0);
      expect(rider.work.legDrive).toBe(0);
    }
  });

  it("replaces the compressed pull with the legs' own push, never both", () => {
    let pushed = 0;
    const { rider } = turnIn('turn', 60, (r) => { if (r.legPush.force.lengthSq() > 0) pushed += 1; });
    expect((rider as unknown as { assistForce: Vector3 }).assistForce.length()).toBe(0);
    expect(pushed).toBeGreaterThan(5);
    expect(rider.work.legDrive).not.toBe(0);
  });

  it('pushes the body toward the lean it is asked for, within the leg\'s strength, and only while the body is behind that lean', () => {
    let pushed = 0;
    turnIn('turn', 90, (rider, board) => {
      const { force } = rider.legPush;
      if (force.lengthSq() === 0) return;
      pushed += 1;
      // Level, toward the lean's side of the board's path, no more than LEG_SIDE_STRENGTH of the body's weight.
      expect(Math.abs(force.y)).toBe(0);
      const leanSide = Math.sign((rider as unknown as { bankReference: number }).bankReference);
      expect(leanSide * force.dot(new Vector3().crossVectors(new Vector3(0, 1, 0), board.velocity))).toBeGreaterThan(0);
      expect(force.length()).toBeLessThanOrEqual(0.35 * rider.mass * G + 1e-9);
      // Behind the lean asked for: the pair never carries the body past it (COMPRESS_PULL's own PULL_OVERLEAN rule).
      const inner = rider as unknown as { bankReference: number };
      expect(leanSide * (inner.bankReference - rider.bank.angle)).toBeGreaterThan(0);
    });
    expect(pushed).toBeGreaterThan(5);
  });

  it('pushes nothing riding straight, and nothing out of Compress', () => {
    const { board, rider, water } = onFace(5, 8, 'turn');
    rider.steer = 0;
    for (let i = 0; i < 60 && rider.attached; i += 1) board.step(STEP, water);
    expect(rider.work.legDrive).toBe(0);
    // Steering, but standing tall: Compress's gate never opens, so neither the pull nor the legs' lead-in fires.
    const tall = onFace(5, 8, 'turn');
    Object.assign(tall.rider, { steer: 1, compress: 0 });
    for (let i = 0; i < 60 && tall.rider.attached; i += 1) tall.board.step(STEP, tall.water);
    expect(tall.rider.work.legDrive).toBe(0);
    expect((tall.rider as unknown as { assistForce: Vector3 }).assistForce.length()).toBe(0);
  });

  it("sums to nothing on rider plus board: the lead-in is a pair like the rail change's", () => {
    const { rider } = turnIn('turn', 10);
    const inner = rider as unknown as { external: Vector3; driveForce: Vector3; arm: Vector3; up: Vector3; across: Vector3 };
    const force = rider.legPush.force.clone();
    expect(force.length()).toBeGreaterThan(0.1 * rider.mass * G);
    const h = 1 / 240;
    const withPush = new Float64Array(8);
    rider.coupleStanding(new Float64Array(64), withPush, h);
    inner.external.sub(force);
    inner.driveForce.set(0, 0, 0);
    const without = new Float64Array(8);
    rider.coupleStanding(new Float64Array(64), without, h);
    const by = Array.from(withPush, (value, i) => value - without[i]);
    const scale = h * force.length();
    for (let i = 0; i < 3; i += 1) expect(Math.abs(by[i]) / scale).toBeLessThan(1e-9);
    const couple = new Vector3().subVectors(inner.arm, rider.legPush.foot).cross(force).multiplyScalar(h);
    expect(new Vector3(by[3], by[4], by[5]).distanceTo(couple) / scale).toBeLessThan(1e-9);
  });
});
