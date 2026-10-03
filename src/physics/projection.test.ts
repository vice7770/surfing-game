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

const headingOf = (board: BoardBody) => {
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  return Math.atan2(forward.x, forward.z);
};

/** The board's roll about its heading, positive with the +x rail down (as the rider's bank). */
const rollOf = (board: BoardBody) => -Math.asin(Math.max(-1, Math.min(1, new Vector3(1, 0, 0).applyQuaternion(board.orientation).y)));

/**
 * The flow's bottom turn on the deep U (the autopilot's: full lean, Compress, a little weight forward), let go at
 * `release` degrees from the fall line: the steer, the weight and Compress all released at once, so the legs extend
 * (the projection). With `steering`, the lean is held through the extension instead. For the second after: the most
 * the rail ran past the body's bank from 0.15 to 0.35 s, when (and how fast) the body came within 12° of upright, and
 * whether the rider stayed on.
 */
function projection(steer: number, release: number, options: { stance?: 'regular' | 'goofy'; steering?: boolean } = {}) {
  const water = new FaceToFlat();
  const angle = Math.atan(FaceToFlat.SLOPE);
  const normal = new Vector3(0, 1, FaceToFlat.SLOPE).normalize();
  const fall = new Vector3(0, -Math.sin(angle), Math.cos(angle));
  const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, fall), normal, fall));
  const board = new BoardBody();
  board.place(new Vector3(0, water.surfaceAt(0, -8), -8).addScaledVector(normal, board.shape.centerOfMass.y), orientation, fall.clone().multiplyScalar(7.3));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance: options.stance ?? 'regular' });
  board.attach(rider);
  for (let i = 0; i < 600 && board.position.z < -1; i += 1) board.step(STEP, water);
  rider.steer = steer;
  rider.trim = 0.3;
  rider.compress = 1;
  for (let i = 0; i < 120 && Math.abs(headingOf(board)) * DEG < release; i += 1) board.step(STEP, water);
  rider.steer = options.steering ? steer : 0;
  rider.trim = 0;
  rider.compress = 0;
  let past = 0;
  let upright: { time: number; speed: number } | undefined;
  for (let i = 1; i <= 60 && rider.attached; i += 1) {
    board.step(STEP, water);
    const time = i * STEP;
    // How far the rail runs on past the body's bank, toward the turn (the bank's sign).
    const beyond = Math.sign(rider.bank.angle) * (rollOf(board) - rider.bank.angle) * DEG;
    if (time >= 0.15 && time <= 0.35) past = Math.max(past, beyond);
    if (!upright && Math.abs(rider.bank.angle) * DEG <= 12) upright = { time, speed: Math.hypot(board.velocity.x, board.velocity.z) };
  }
  return { attached: rider.attached, past, upright };
}

// The movement-flow spec's projection: Compress released, the legs extend and the rail is neutral. The balance used to
// roll the board on past the body to bring it upright, the rail stayed 14–16° past it at its bite, and the extension's
// load closed the old turn into a bog: the rider fell within 1 s of letting go at 25–40° (the pool flow probe: the
// projections lost about 40% of their speed, and 4 riders in 21 reached a cutback).
describe('the projection (the movement-flow spec)', () => {
  it.each([['frontside', -1], ['backside', 1]])('holds the board square under the body as the legs extend, %s', (_side, steer) => {
    for (const release of [30, 45]) {
      const { attached, past } = projection(steer as number, release);
      expect(attached).toBe(true);
      expect(past).toBeLessThan(7);
    }
  });

  it.each([25, 30, 35, 40])('stays on for a second after letting go of a compressed turn at %i° from the fall line', (release) => {
    expect(projection(-1, release).attached).toBe(true);
    expect(projection(1, release, { stance: 'goofy' }).attached).toBe(true);
  });

  it('comes within 12° of upright out of a turn let go at 30°, still on the plane', () => {
    const { upright } = projection(-1, 30);
    expect(upright).toBeDefined();
    expect(upright!.time).toBeLessThan(0.8);
    expect(upright!.speed).toBeGreaterThan(3.3);
  });

  // Steering through the extension is not a projection: the feet still roll the board on past a body they bring up.
  it('leaves the feet to the balance while the rider steers', () => {
    expect(projection(-1, 30, { steering: true }).past).toBeGreaterThan(8);
  });
});
