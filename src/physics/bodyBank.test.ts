import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;

/**
 * Step 3.5i, `?bodyBank=hip`: `AttachedRider.project` constrains the contact force to a line through the body's
 * centre of mass, which is the moment balance of a body with **no angular momentum of its own**. The identity for a
 * body with a trunk is `p_x = com_x − height·F_x/N − (dH/dt)_roll / N`, and the third term was missing, so the rider
 * paid for his own hip strategy at the sole. The switch adds that term and nothing else: no force, no torque, no
 * gain, no drive, no constant. docs/research/new-rider/3.5/body-banks.md.
 *
 * Measured there on 90 Canyon riders turning on the owner's own address: `limit = 'tip'` goes from **90 of 90** to
 * **66 of 90** and the share of live frames in which the centre of pressure is pinned from **52.0 % to 32.3 %**; the
 * demanded centre of pressure moves **inward on 2 330 of the 3 061 frames** in which the term fires, with its median
 * distance from the stance's middle **0.0800 → 0.0355 m**. The default is byte-identical over 280 476 values.
 */

/** A new-rider pair standing on flat water at `speed` down +z, stepped `seconds` with the stick hard over. */
function carve(seconds: number, bodyBank?: 'hip', speed = 8): { torques: number[]; moments: number[]; reliefs: number[]; rider: AttachedRider } {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, {
    phase: 'standing', rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on',
    ...(bodyBank ? { bodyBank } : {}),
  });
  board.attach(rider);
  const water = new PlaneWater();
  const torques: number[] = [];
  const moments: number[] = [];
  const reliefs: number[] = [];
  for (let n = 0; n < Math.round(seconds / STEP) && rider.attached; n += 1) {
    rider.steer = n > 12 ? 1 : 0;
    board.step(STEP, water);
    torques.push((rider as unknown as { swingTorque: number }).swingTorque);
    moments.push(rider.copMoment);
    reliefs.push(rider.copRelief);
  }
  return { torques, moments, reliefs, rider };
}

describe('the body banks with the deck: the trunk rotor\'s moment in the contact\'s bound (opt-in)', () => {
  it('is off by default, so the contact\'s bound never sees the rotor at all', () => {
    const { torques, moments, reliefs } = carve(2);
    expect(moments.length).toBeGreaterThan(60);
    // The rotor really is turning on the shipped rider - this is the point of the round, so the test asserts it
    // rather than relying on it: step 3.5d's "0.1-0.4 % of the traffic" is about the ankle's REST command it takes
    // over, not about its torque, and `humanSwingStep` adds the rotor's own return and damping term outside its
    // +/-SWING_TORQUE clamp. On the Canyon bench the shipped rider reaches a per-rider median peak of 165 N.m.
    expect(Math.max(...torques.map(Math.abs))).toBeGreaterThan(1);
    // And every newton-metre of it is discarded by the bound.
    for (const m of moments) expect(m).toBe(0);
    for (const r of reliefs) expect(r).toBe(0);
  });

  it('counts it with `bodyBank: \'hip\'`, within the rotor\'s own torque and never beyond it', () => {
    const { torques, moments, reliefs } = carve(2, 'hip');
    expect(moments.length).toBeGreaterThan(60);
    const firing = moments.filter((m) => m !== 0).length;
    expect(firing).toBeGreaterThan(0);
    // The term's one hard bound, and the one a control can check without the substep's normal: it is `swingTorque`
    // resolved onto a unit axis, so it can never exceed it. It is NOT bounded by SWING_TORQUE - the rotor's return
    // term sits outside that clamp and reaches 303 N.m on the shipped rider.
    for (let i = 0; i < moments.length; i += 1) {
      expect(Math.abs(moments[i])).toBeLessThanOrEqual(Math.abs(torques[i]) + 1e-6);
      // Zero exactly when the rotor's torque is zero: the gate is the torque, not a threshold.
      if (torques[i] === 0) expect(moments[i]).toBe(0);
    }
    // The length and the moment are the same quantity over the substep's own normal impulse, so their signs agree.
    for (let i = 0; i < moments.length; i += 1) {
      if (moments[i] !== 0 && reliefs[i] !== 0) expect(Math.sign(reliefs[i])).toBe(Math.sign(moments[i]));
    }
  });

  it('is reached by the one option value and nothing else', () => {
    const board = new BoardBody();
    const made = (bodyBank?: unknown) => new AttachedRider(board.shape, { phase: 'standing', rider: 'new', ...(bodyBank === undefined ? {} : { bodyBank }) } as ConstructorParameters<typeof AttachedRider>[1]);
    // `Number(null) === 0`, so the value is matched as a string and never parsed; anything but 'hip' is the default.
    for (const v of [undefined, 'on', 'lean', '', 'HIP']) expect((made(v) as unknown as { banksBody: boolean }).banksBody, String(v)).toBe(false);
    expect((made('hip') as unknown as { banksBody: boolean }).banksBody).toBe(true);
  });
});
