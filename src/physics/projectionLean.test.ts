import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import type { SurfWater, WaterSample } from './SurfWater';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;

/** A 15° face easing over 4 m into flat, still water at z = 0: the stances spec's trough (as in `compressTurn.test.ts`). */
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

/**
 * The flow's bottom turn on the deep U (full lean `steer`, Compress, a little weight forward) from `speed` down the
 * face, let go (steer, weight and Compress released: the projection) once the body leans `lean` degrees. The share of
 * its speed the board keeps until the body is back within 12° of upright, and whether the rider stayed on 1.5 s.
 */
function letGo(lean: number, speed: number, steer: number, stance: 'regular' | 'goofy') {
  const water = new FaceToFlat();
  const angle = Math.atan(FaceToFlat.SLOPE);
  const normal = new Vector3(0, 1, FaceToFlat.SLOPE).normalize();
  const fall = new Vector3(0, -Math.sin(angle), Math.cos(angle));
  const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, fall), normal, fall));
  const board = new BoardBody();
  board.place(new Vector3(0, water.surfaceAt(0, -8), -8).addScaledVector(normal, board.shape.centerOfMass.y), orientation, fall.clone().multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
  board.attach(rider);
  const along = () => Math.hypot(board.velocity.x, board.velocity.z);
  for (let i = 0; i < 600 && board.position.z < -1; i += 1) board.step(STEP, water);
  Object.assign(rider, { steer, trim: 0.3, compress: 1 });
  for (let i = 0; i < 150 && Math.abs(rider.bank.angle) * DEG < lean; i += 1) board.step(STEP, water);
  const released = along();
  Object.assign(rider, { steer: 0, trim: 0, compress: 0 });
  let kept = Number.NaN;
  for (let i = 1; i <= 90 && rider.attached; i += 1) {
    board.step(STEP, water);
    if (Number.isNaN(kept) && i > 3 && Math.abs(rider.bank.angle) * DEG <= 12) kept = along() / released;
  }
  return { kept, attached: rider.attached };
}

// The projection rights the body by the board's turn under it: with the feet holding the board square under the body,
// the rail follows the lean, and the deeper the lean it is let go from, the longer and harder the board carves on
// before the body is back up. On the Wave Pool the projections that peaked at a 20–31° lean kept 0.57–0.78 of their
// speed and those that peaked at 14–17° kept 0.84–0.98 (the pool flow probe at 10ddd20).
describe('the projection\'s cost (the movement-flow spec)', () => {
  it.each([['regular', -1], ['goofy', 1]] as const)('let go at a 12° lean keeps over 0.83 of its speed back to upright, at 25° under 0.72 (%s)', (stance, steer) => {
    for (const speed of [7.3, 8.5]) {
      const early = letGo(12, speed, steer, stance);
      const late = letGo(25, speed, steer, stance);
      expect(early.attached).toBe(true);
      expect(early.kept).toBeGreaterThan(0.83);
      expect(late.kept).toBeLessThan(0.72);
    }
  });
});
