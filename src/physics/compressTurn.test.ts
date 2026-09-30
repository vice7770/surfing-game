import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import type { SurfWater, WaterSample } from './SurfWater';

const STEP = 1 / 60;

/** A 15° face easing over 4 m into flat, still water at z = 0: the stances spec's trough (as in `AttachedRider.test.ts`). */
class FaceToFlat implements SurfWater {
  static readonly SLOPE = Math.tan((15 * Math.PI) / 180);
  static readonly EASE = 4;
  private readonly plane = new PlaneWater();

  surfaceAt(_x: number, z: number): number {
    const { SLOPE, EASE } = FaceToFlat;
    if (z >= 0) return 0;
    return z > -EASE ? (SLOPE * z * z) / (2 * EASE) : -SLOPE * z - (SLOPE * EASE) / 2;
  }

  private slopeAt(z: number): number {
    const { SLOPE, EASE } = FaceToFlat;
    return z >= 0 ? 0 : z > -EASE ? (SLOPE * z) / EASE : -SLOPE;
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    this.plane.sampleAt(x, y, z, out);
    const slopeZ = this.slopeAt(z);
    const norm = Math.hypot(1, slopeZ);
    return Object.assign(out, {
      surfaceY: this.surfaceAt(x, z), bedY: this.surfaceAt(x, z) - 3, slopeX: 0, slopeZ, normalX: 0, normalY: 1 / norm, normalZ: -slopeZ / norm,
    });
  }

  addReaction(): void {}
}

const headingOf = (board: BoardBody) => {
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  return Math.atan2(forward.x, forward.z);
};

/**
 * The stances spec's bottom turn: down the 15° face at 7 m/s crouched (`crouch`), then 1 m before the flat the lean
 * (`steer`, −1 onto Regular's toes) and `compress`. The yaw after 1 s, and when and how fast it reached 90°.
 */
function bottomTurn(steer: number, crouch: number, compress: number) {
  const water = new FaceToFlat();
  const angle = Math.atan(FaceToFlat.SLOPE);
  const normal = new Vector3(0, 1, FaceToFlat.SLOPE).normalize();
  const fall = new Vector3(0, -Math.sin(angle), Math.cos(angle));
  const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, fall), normal, fall));
  const board = new BoardBody();
  board.place(new Vector3(0, water.surfaceAt(0, -8), -8).addScaledVector(normal, board.shape.centerOfMass.y), orientation, fall.clone().multiplyScalar(7.3));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance: 'regular' });
  board.attach(rider);
  rider.crouch = crouch;
  for (let i = 0; i < 600 && board.position.z < -1; i += 1) board.step(STEP, water);
  const entry = board.velocity.length();
  rider.steer = steer;
  rider.compress = compress;
  let last = headingOf(board);
  let turned = 0;
  let atSecond = 0;
  let reached: { time: number; speed: number } | undefined;
  for (let i = 1; i <= Math.round(1.2 / STEP); i += 1) {
    board.step(STEP, water);
    const now = headingOf(board);
    turned += Math.atan2(Math.sin(now - last), Math.cos(now - last));
    last = now;
    if (i === Math.round(1 / STEP)) atSecond = (Math.abs(turned) * 180) / Math.PI;
    if (!reached && Math.abs(turned) >= Math.PI / 2) reached = { time: i * STEP, speed: board.velocity.length() / entry };
  }
  return { attached: rider.attached, atSecond, reached };
}

// The movement-flow spec (Q4, Q16): Compress is the sharp turn's stance. A real bottom turn comes round 99° in 0.96 s
// (Forsyth et al. 2024); every stance took about 1.45 s here, 0.36 of the speed kept compressed, until COMPRESS_PULL.
describe('the compressed turn (the movement-flow spec)', () => {
  it.each([['frontside', -1], ['backside', 1]])('comes round 90° in about a second, %s, and stays on', (_side, steer) => {
    const turn = bottomTurn(steer as number, 0.6, 1);
    expect(turn.attached).toBe(true);
    expect(turn.reached).toBeDefined();
    expect(turn.reached!.time).toBeLessThan(1.1);
    expect(turn.reached!.speed).toBeGreaterThan(0.55);
  });

  it('turns clearly sharper than the crouch alone', () => {
    expect(bottomTurn(-1, 0.6, 1).atSecond).toBeGreaterThan(bottomTurn(-1, 1, 0).atSecond + 20);
  });

  // Review Focus 4: Compress riding straight turns nothing.
  it('does not turn a board ridden straight', () => {
    expect(bottomTurn(0, 0.6, 1).atSecond).toBeLessThan(3);
  });
});
