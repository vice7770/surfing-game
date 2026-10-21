import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
const DEG = Math.PI / 180;
const wrap = (angle: number) => angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));

/**
 * The flow's cutback: standing across a plane face (`slope`°, falling toward +z) 85° from its fall line toward `side`
 * at `speed` through its water, then the autopilot's cutback inputs, turning back down through the fall line: the
 * lean toward it, Compress, the rotation stick and the weight `trim`, held until the board has come round `turn`°
 * (or 2.5 s). The face's water is still, or runs up it at `flow`, m/s (a wave's face moving under the turn). The least
 * speed through the water over the turn, m/s, and whether the rider stayed on.
 */
function cutback(slope: number, speed: number, trim: number, turn: number, stance: 'regular' | 'goofy' = 'regular', side = 1, flow = 0) {
  const tilt = slope * DEG;
  const normal = new Vector3(0, 1, Math.tan(tilt)).normalize();
  const fall = new Vector3(0, -Math.sin(tilt), Math.cos(tilt));
  const across = new Vector3().crossVectors(normal, fall).normalize();
  const forward = fall.clone().multiplyScalar(Math.cos(85 * DEG)).addScaledVector(across, -side * Math.sin(85 * DEG)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const up = fall.clone().multiplyScalar(-flow);
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed).add(up));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
  board.attach(rider);
  const water = new PlaneWater({ slopeZ: -Math.tan(tilt), flow: { x: up.x, y: up.y, z: up.z } });
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  Object.assign(rider, { steer: side, trim, compress: 1, crouch: 0, rotate: side });
  const headingOf = () => { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); };
  let last = headingOf();
  let turned = 0;
  let least = Infinity;
  for (let i = 0; i < 150 && rider.attached && Math.abs(turned) < turn * DEG; i += 1) {
    board.step(STEP, water);
    const heading = headingOf();
    turned += wrap(heading - last);
    last = heading;
    least = Math.min(least, Math.hypot(board.velocity.x - up.x, board.velocity.z - up.z));
  }
  return { attached: rider.attached, least };
}

// The movement-flow spec's cutback (Compress, the back foot, the rail toward the curl, looking back), as the flow
// rides it on the Wave Pool: at 4.5–6 m/s through the water, low on a 5–12° face. A board that slow planes on its tail
// only at a steep trim (Savitsky's lift), so how far back the weight goes, and how far round the turn is carried,
// decide whether it is still planing (4 m/s on, 3 off) when the rebound begins.
describe('the cutback (the movement-flow spec)', () => {
  it.each([['regular', 1], ['regular', -1], ['goofy', 1], ['goofy', -1]] as const)(
    'keeps planing round 160° across a 10° face from 5.5 m/s with the coaching\'s 65/35 on the back foot, not full back (%s, side %i)',
    (stance, side) => {
      const coached = cutback(10, 5.5, -0.5, 160, stance, side);
      expect(coached.attached).toBe(true);
      expect(coached.least).toBeGreaterThan(4.5);
      expect(cutback(10, 5.5, -1, 160, stance, side).least).toBeLessThan(2.5);
    },
  );

  it.each([['regular', 1], ['goofy', 1]] as const)('across a 5° face from 5.5 m/s planes 120° round, and is off the plane before 160° (%s, side %i)', (stance, side) => {
    expect(cutback(5, 5.5, -0.5, 120, stance, side).least).toBeGreaterThan(3.2);
    expect(cutback(5, 5.5, -0.5, 160, stance, side).least).toBeLessThan(2);
  });

  // The phase-5 follow-up (2026-10-22): the compressed turn's rules (COMPRESS_PULL, CARVE_CARRY and the lean TURN_RADIUS
  // allows) read the board's motion through the water, as planing does. Read over the ground, the same cutback on water
  // running 1.1–1.5 m/s up the face (a wave's face under a turn) bogged to 1.0–1.3 m/s through the water against
  // 3.5–3.7 on still water: the pull and the carry acted off the board's path through the water, and the lean read a
  // slower board. Now any uniformly moving face carves as the still one.
  it.each([['regular', 1], ['goofy', 1]] as const)('carves the same cutback on a face whose water runs up it as on still water (%s, side %i)', (stance, side) => {
    const still = cutback(5, 5.5, -0.5, 120, stance, side);
    for (const flow of [1.1, 1.5]) {
      const moving = cutback(5, 5.5, -0.5, 120, stance, side, flow);
      expect(moving.attached).toBe(still.attached);
      expect(moving.least).toBeCloseTo(still.least, 2);
    }
  });
});
