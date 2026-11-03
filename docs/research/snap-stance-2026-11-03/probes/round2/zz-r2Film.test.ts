import { writeFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
/** The sheet's snap film headless: flat water, 8 m/s; Snap at 0.3, the steer from 0.6, let go at `release` (the steer held on, or let go with it). */
it('film', () => {
  const out: string[] = [];
  for (const [name, release, keepSteer, speed] of [['film 8', 1.2, true, 8], ['film 8, both let go', 1.2, false, 8], ['film 8, let go at 1.0', 1.0, true, 8], ['film 6', 1.2, true, 6], ['film 10', 1.2, true, 10]] as const) {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
    const rider = new AttachedRider(board.shape, { phase: 'standing' });
    board.attach(rider);
    const water = new PlaneWater();
    let fell = NaN; let leg03 = NaN; let leg015 = NaN; let speedAtSteer = NaN; let speedAtRelease = NaN; let maxBank = 0; let last = 0; let turned = 0;
    for (let n = 0; n < 120; n += 1) {
      const t = n * STEP;
      rider.snap = t >= 0.3 && t < release ? 1 : 0;
      rider.steer = t >= 0.6 && (t < release || keepSteer) ? -1 : 0;
      if (Math.abs(t - 0.6) < 1e-9) speedAtSteer = board.velocity.length();
      if (Math.abs(t - release) < 1e-9) speedAtRelease = board.velocity.length();
      board.step(STEP, water);
      if (!rider.attached) { fell = t + STEP; break; }
      if (Math.abs(t + STEP - 0.45) < 1e-9) leg015 = rider.leg.rest;
      if (Math.abs(t + STEP - 0.6) < 1e-9) leg03 = rider.leg.rest;
      maxBank = Math.max(maxBank, Math.abs(rider.bank.angle));
      const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); const h = Math.atan2(f.x, f.z); turned += Math.atan2(Math.sin(h - last), Math.cos(h - last)); last = h;
    }
    out.push(`${name}: legs at 0.15 s ${leg015.toFixed(2)}, 0.3 s ${leg03.toFixed(2)}; speed at the steer ${speedAtSteer.toFixed(1)}, at the release ${speedAtRelease.toFixed(1)}; turned ${Math.round((turned * 180) / Math.PI)}°; bank max ${Math.round((maxBank * 180) / Math.PI)}°; fell ${fell.toFixed(2)}`);
  }
  writeFileSync(process.env.OUT ?? '/dev/null', out.join('\n'));
});
