// The new surfer, step 3.1: one run frame by frame, the pitch ankle's state (RIDER=new). CASE picks it: glide5, tilt25,
// cross45, down20. Prints the face's, the felt force's, the reference's and the deck's pitch, the ankle's angle, rest and
// torque, the feet's pressure along the board, the leg's load and the board's trim.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { Rising, STEP, Slope, Tilting, emit, place, r, state } from '../../board-in-water/lab';
import type { SurfWater } from '../../../../src/physics/SurfWater';

const DEG = 180 / Math.PI;
const CASE = process.env.CASE ?? 'glide5';

it('trace', () => {
  const cases: Record<string, () => { water: SurfWater; heading: number; speed: number; seconds: number }> = {
    glide5: () => ({ water: new Slope(0), heading: 0, speed: 5.8, seconds: 3 }),
    glide7: () => ({ water: new Slope(0), heading: 0, speed: 7.8, seconds: 2 }),
    glide12: () => ({ water: new Slope(0), heading: 0, speed: 12.8, seconds: 1.5 }),
    tilt25: () => ({ water: new Tilting(25, 1.5), heading: 0, speed: 6, seconds: 2 }),
    cross45: () => ({ water: new Slope(25), heading: 45, speed: 6, seconds: 1 }),
    down20: () => ({ water: new Slope(20), heading: 0, speed: 4, seconds: 1.5 }),
    rise1: () => ({ water: new Rising(0.5, 1, 0.2), heading: 0, speed: 7.4, seconds: 1.2 }),
    rise2: () => ({ water: new Rising(0.5, 2, 0.2), heading: 0, speed: 7.4, seconds: 1.2 }),
    rise4: () => ({ water: new Rising(0.5, 4, 0.2), heading: 0, speed: 7.4, seconds: 1.2 }),
    tilt40: () => ({ water: new Tilting(40, 1.5), heading: 0, speed: 6, seconds: 2.5 }),
    carve: () => ({ water: new Slope(0), heading: 0, speed: 7.7, seconds: 3 }),
  };
  const { water, heading, speed, seconds } = cases[CASE]();
  const rig = place(water, 0, heading, speed, 'standing');
  const rider = rig.rider!;
  const body = (rider as unknown as { standingBody: { pitch: { angle: number; rate: number }; deckPitch: number; framePitch: number; reference: number; rest: number; torque: number; felt: number; active: number; stiffness: number } }).standingBody;
  const inner = rider as unknown as { legLoad: number; specificForce: Vector3; waterUp: Vector3; feasible: boolean; limit: string; copTarget: { z: number }; feet: { rear: number; front: number }; ankleRest: number; ankleTorque: number; swingTorque: number; bankReference: number; standingHold: number; bankSpeed: number };
  const middle = (inner.feet.rear + inner.feet.front) / 2;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    if (CASE === 'carve' && (i + 1) * STEP > 0.2) rider.steer = 1;
    (water as { advance?: (dt: number) => void }).advance?.(STEP);
    rig.board.step(STEP, water);
    const s = state(rig, water, (i + 1) * STEP);
    emit({
      t: r(s.t, 3), v: r(s.speed, 2), trim: r(s.pitch, 1), roll: r(s.roll, 1), bank: r(s.bank, 1), slip: r(s.slip, 1), sep: (rider as unknown as { limit: string }).limit, deck: r(body.deckPitch * DEG, 1), frame: r(body.framePitch * DEG, 1), ankle: r(body.pitch.angle * DEG, 1), rate: r(body.pitch.rate * DEG, 0),
      felt: r(body.felt * DEG, 1), ref: r(body.reference * DEG, 1), rest: r(body.rest * DEG, 1), active: r(body.active * DEG, 1), k: r(body.stiffness, 0), torque: r(body.torque, 0),
      sfPitch: r(Math.atan2(inner.specificForce.z, inner.specificForce.y) * DEG, 1), copZ: r(rider.contact.centreOfPressure.z - middle, 3), load: r(s.load, 2), draft: r(s.draft * 100, 1), ext: r(rider.leg.extension * 100, 1), legRest: r(rider.leg.rest * 100, 1), legLoad: r(inner.legLoad / (rider.mass * 9.81), 2), legForce: r(rider.leg.force / (rider.mass * 9.81), 2), legRate: r(rider.leg.rate, 3), kLeg: r((rider as unknown as { legStiffness: number }).legStiffness, 0), flight: r((rider as unknown as { flightTime: number }).flightTime, 3), feasible: rider.contact.feasible, copX: r(rider.contact.centreOfPressure.x, 3), bankRef: r(inner.bankReference * DEG, 1), bankRate: r(rider.bank.rate * DEG, 0), aRest: r(inner.ankleRest * DEG, 1), aTorque: r(inner.ankleTorque, 0), swing: r(rider.swing.angle * DEG, 1), sTorque: r(inner.swingTorque, 0), hold: r(inner.standingHold, 2), fell: s.fell ?? '',
    });
    if (s.fell) break;
  }
});
