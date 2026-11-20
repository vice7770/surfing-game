/**
 * **Step 3.5k's byte check: with `?twistGrip=feet` OFF, not one float moves.**
 *
 * This file imports **only** `AttachedRider`, `BoardBody` and `FaceWater` — nothing that step 3.5k added — so the
 * *same source file* compiles and runs on the base branch as on the branch under test, and the two traces can be
 * diffed byte for byte. It prints every live column of the DEFAULT rider (no `twistGrip`) to twelve decimals.
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/twist-grip-bytes.ts -o <s>/b.mjs --format esm --platform node
 *   node <s>/b.mjs > <s>/branch.txt        # and the same two lines in the base checkout
 *   diff <s>/base.txt <s>/branch.txt
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const SECONDS = Number(process.env.SECONDS ?? 6);
const SIDE = Number(process.env.SIDE ?? -45);
const SINK = Number(process.env.SINK ?? 0.06);
const FACE = { depth: 6, height: 1.4, slope: 16, crestZ: 0, vertical: 'surface' as const };
const STANCES = ['tall', 'crouch', 'compress'] as const;
const STEERS = [0, 1, -1];
const SPEED = 5.7;
const scratch = createWaterSample();
const out: string[] = [];

for (const stance of STANCES) for (const steer of STEERS) {
  const water = new FaceWater(FACE);
  const sy = water.surfaceAt(0, water.front * 0.5);
  const here = water.sampleAt(0, sy, water.front * 0.5, scratch);
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const fall = new Vector3(here.slopeX, 0, here.slopeZ);
  if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
  fall.normalize();
  const heading = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  const forward = level.clone().addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(0, sy, water.front * 0.5).addScaledVector(normal, board.shape.centerOfMass.y - SINK),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(SPEED).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing', rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on',
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  rider.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rider.compress = stance === 'compress' ? 1 : 0;
  rider.steer = steer;
  const w: SurfWater = water;
  let fell = '';
  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    board.step(STEP, w);
    water.advance(STEP);
    const t = (i + 1) * STEP;
    if (!rider.attached) { fell = t.toFixed(6); break; }
    const tb = rider.twistBody;
    const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const side = new Vector3(fwd.z, 0, -fwd.x);
    const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    out.push([stance, steer, t.toFixed(6), tb.angle.toFixed(12), tb.rate.toFixed(12), tb.active.toFixed(12),
      tb.spring.toFixed(12), tb.torque.toFixed(12), tb.alpha.toFixed(12), tb.beta.toFixed(12),
      rider.drawnTwist.toFixed(12), rider.bank.angle.toFixed(12),
      Math.atan2(up.dot(side), up.y).toFixed(12), board.velocity.length().toFixed(12),
      board.position.x.toFixed(12), board.position.y.toFixed(12), board.position.z.toFixed(12),
      Math.atan2(fwd.x, fwd.z).toFixed(12)].join(' '));
  }
  out.push([stance, steer, 'END', fell || 'live', rider.separation ?? ''].join(' '));
}
process.stdout.write(`${out.join('\n')}\n`);
