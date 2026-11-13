import { describe, expect, it } from 'vitest';
import { BALANCE_DELAY, CAPTURE_LOAD, DelayLine, HumanBalance, RIDER_YAW_ARMS_OUT, SWING_INERTIA_ARMS, SWING_INERTIA_SET, riderYawInertia, rotorImpulse, stanceRoom } from './humanBalance';
import { boardDerivatives, humanReferenceGain, humanRollKick, humanRollModes, humanTwistKick, humanTwistModes, humanYawModes, twistRows, type RollParams, type TwistGains, type YawPlant } from './rollModel';

// The new surfer's step 3.2 (`rider: 'new'`; docs/research/new-rider/3.2): the human balance's parts.

describe('stanceRoom (the design\'s table)', () => {
  it('gives each stance its knee travel, hip range and arms', () => {
    expect(stanceRoom(0)).toEqual({ kneeTravel: 0.3, hipRange: 1.2, arms: 1 });
    const crouch = stanceRoom(0.195);
    expect(crouch.kneeTravel).toBeCloseTo(0.15, 9);
    expect(crouch.hipRange).toBeCloseTo(0.8, 9);
    expect(crouch.arms).toBe(1);
    const compress = stanceRoom(0.3);
    expect(compress.kneeTravel).toBeCloseTo(0.05, 9);
    expect(compress.hipRange).toBeCloseTo(0.4, 9);
    expect(compress.arms).toBeCloseTo(0, 9);
    const tuck = stanceRoom(0.45);
    expect(tuck.kneeTravel).toBeCloseTo(0, 9);
    expect(tuck.hipRange).toBeCloseTo(0.3, 9);
  });

  it('leaves less room the lower the stance', () => {
    let last = stanceRoom(0);
    for (let d = 0.05; d <= 0.45 + 1e-9; d += 0.05) {
      const room = stanceRoom(d);
      expect(room.kneeTravel).toBeLessThanOrEqual(last.kneeTravel + 1e-12);
      expect(room.hipRange).toBeLessThanOrEqual(last.hipRange + 1e-12);
      last = room;
    }
  });
});

describe('DelayLine', () => {
  it('reads a channel as it was `delay` ago, interpolated, and the first sample before it began', () => {
    const line = new DelayLine(2, 0.2);
    for (let i = 1; i <= 100; i += 1) line.push(i * 0.01, i, -i);
    expect(line.at(1.0 - 0.1, 0)).toBeCloseTo(90, 9);
    expect(line.at(0.955, 1)).toBeCloseTo(-95.5, 9);
    const fresh = new DelayLine(1, 0.2);
    fresh.push(0.01, 7);
    expect(fresh.at(-1, 0)).toBe(7);
  });

  it('keeps no more than the span needs as it runs, growing only if it must', () => {
    const line = new DelayLine(1, 0.1, 4);
    for (let i = 1; i <= 2000; i += 1) line.push(i / 1000, i);
    expect(line.at(2 - 0.1, 0)).toBeCloseTo(1900, 6);
  });
});

describe('HumanBalance', () => {
  it('senses the body\'s bank and its rate, and hands them on BALANCE_DELAY late', () => {
    const balance = new HumanBalance();
    const h = 1 / 960;
    for (let i = 0; i < 960; i += 1) balance.sense(h, 0.5 * i * h);
    expect(balance.bankRate).toBeCloseTo(0.5, 9);
    expect(balance.sensedBank()).toBeCloseTo(0.5 * (1 - BALANCE_DELAY) - 0.5 * h, 6);
    expect(balance.sensedBankRate()).toBeCloseTo(0.5, 9);
  });

  it('reads the capture point against the feet, and a fall only when it is past the room and the weight past the edge', () => {
    const balance = new HumanBalance();
    const up = { x: 0, y: 9.81, z: 0 };
    // Upright and still: in the middle.
    let s = balance.capture({ x: 0, y: 0.8, z: 0 }, { x: 0, y: 0, z: 0 }, up, 0.13, 0.375, 0.375, 0.2, 0.2);
    expect(s.past).toBe(0);
    expect(s.margin).toBeCloseTo(1, 9);
    // Moving toward the toes at 0.5 m/s: ω₀ = √(9.81 / 0.8), so the capture point is 0.143 m out, past the 0.13 m edge.
    s = balance.capture({ x: 0, y: 0.8, z: 0 }, { x: 0.5, y: 0, z: 0 }, up, 0.13, 0.375, 0.375, 0.2, 0.2);
    expect(s.across).toBeCloseTo(0.5 / Math.sqrt(9.81 / 0.8), 6);
    expect(s.past).toBeGreaterThan(0);
    expect(balance.fallen).toBe(false);
    // The weight itself past the edge and the capture point past the room's reach: fallen.
    s = balance.capture({ x: 0.2, y: 0.78, z: 0 }, { x: 1.5, y: 0, z: 0 }, up, 0.13, 0.375, 0.375, 0.2, 0.2);
    expect(s.weightPast).toBe(true);
    expect(balance.fallen).toBe(true);
    expect(s.margin).toBe(0);
  });

  it('holds the capture point while the feet are light, and reads it again on the way back into load (step 3.2h)', () => {
    const balance = new HumanBalance();
    const up = { x: 0, y: 9.81, z: 0 };
    // Balanced and loaded: the point is in the middle and nothing is frozen.
    balance.capture({ x: 0, y: 0.8, z: 0 }, { x: 0, y: 0, z: 0 }, up, 0.13, 0.375, 0.375, 0.2, 0.2, 1, 0.001);
    expect(balance.frozen).toBe(false);
    expect(balance.state.past).toBe(0);
    // The board falls away: the felt gravity goes toward zero, ω₀ sits on its floor and a drift alone would put the
    // capture point far past the feet. Under CAPTURE_LOAD the state does not move and no fall is called.
    const light = { x: 0, y: 0.4, z: 0 };
    for (let i = 0; i < 100; i += 1) balance.capture({ x: 0, y: 0.8, z: 0 }, { x: 0.5, y: 0, z: 0 }, light, 0.13, 0.375, 0.375, 0.2, 0.2, CAPTURE_LOAD - 0.01, 0.001);
    expect(balance.frozen).toBe(true);
    expect(balance.state.past).toBe(0);
    expect(balance.state.margin).toBeCloseTo(1, 9);
    expect(balance.fallen).toBe(false);
    expect(balance.lightLongest).toBeCloseTo(0.1, 9);
    // The same reading with the feet loaded is a long way out: it is the condition, not the numbers, that differ.
    const loaded = balance.capture({ x: 0, y: 0.8, z: 0 }, { x: 0.5, y: 0, z: 0 }, light, 0.13, 0.375, 0.375, 0.2, 0.2, CAPTURE_LOAD + 0.01, 0.001);
    expect(balance.frozen).toBe(false);
    expect(loaded.past).toBeGreaterThan(0.3);
    // And a fall already called before the light window stands through it: the freeze never clears one.
    balance.capture({ x: 0.2, y: 0.78, z: 0 }, { x: 1.5, y: 0, z: 0 }, up, 0.13, 0.375, 0.375, 0.2, 0.2, 1, 0.001);
    expect(balance.fallen).toBe(true);
    balance.capture({ x: 0, y: 0.8, z: 0 }, { x: 0, y: 0, z: 0 }, up, 0.13, 0.375, 0.375, 0.2, 0.2, 0, 0.001);
    expect(balance.frozen).toBe(true);
    expect(balance.fallen).toBe(true);
  });

  it('lowers the knees and puts the arms out once the hip nears its range, in proportion, and comes back', () => {
    const balance = new HumanBalance();
    const room = stanceRoom(0);
    for (let i = 0; i < 200; i += 1) balance.strategies(1 / 960, 0.95 * room.hipRange, room);
    expect(balance.kneeCause).toBe('hip');
    expect(balance.knees).toBeGreaterThan(0.5);
    expect(balance.swingInertia).toBeGreaterThan(SWING_INERTIA_SET);
    expect(balance.swingInertia).toBeLessThanOrEqual(SWING_INERTIA_ARMS);
    for (let i = 0; i < 3000; i += 1) balance.strategies(1 / 960, 0, room);
    expect(balance.knees).toBeLessThan(0.1);
    expect(balance.kneeCause).toBe('none');
  });

  it('gives a rotor\'s angular impulse to its range', () => {
    expect(rotorImpulse(10, 200, 1.2)).toBeCloseTo(Math.sqrt(4800), 9);
    expect(rotorImpulse(10, 200, -1)).toBe(0);
  });
});

describe('the roll model with the human delay (rollModel)', () => {
  const plant: RollParams = { boardInertia: 0.1, hullStiffness: 860, hullDamping: 43, mass: 73, height: 0.79, ankleStiffness: 800, ankleDamping: 80, turnLag: 0.035 };
  const human = { delay: 0.1, motorLag: 0.05, turnGain: 1.3 };

  it('finds the free roll unstable with no balance: the turn\'s pull over-rights the body and the lean weaves', () => {
    expect(humanRollModes(plant, human, { bank: 0, bankRate: 0 })[0].damping).toBeLessThan(0);
  });

  it('damps it with the body\'s own bank rate through the delay, and rings once the angle is fed back too', () => {
    expect(humanRollModes(plant, human, { bank: 0, bankRate: 0.1 })[0].damping).toBeGreaterThan(0.1);
    expect(humanRollModes(plant, human, { bank: 1, bankRate: 0.2 })[0].damping).toBeLessThan(0);
  });

  it('settles a kicked board with the delay exact, and gives the steady rest for a lean asked', () => {
    expect(humanRollKick(plant, human, { bank: 0, bankRate: 0.1 }).peakBank).toBeLessThan(0.01);
    expect(humanReferenceGain(plant, human, { bank: 0, bankRate: 0.1 })).toBeGreaterThan(0);
  });
});

describe('the rider\'s yaw inertia (step 3.2b)', () => {
  it('turns with the stance\'s depth from de Leva\'s segments, and the arms out add to it', () => {
    expect(riderYawInertia(0)).toBeCloseTo(2.81, 2);
    expect(riderYawInertia(0.195)).toBeCloseTo(3.05, 2);
    expect(riderYawInertia(0.3)).toBeCloseTo(3.2, 2);
    expect(riderYawInertia(0.45)).toBeCloseTo(3.2, 2);
    expect(riderYawInertia(0.1)).toBeGreaterThan(2.81);
    expect(riderYawInertia(0.1)).toBeLessThan(3.05);
    expect(riderYawInertia(0, 1) - riderYawInertia(0)).toBeCloseTo(RIDER_YAW_ARMS_OUT, 6);
    expect(riderYawInertia(-0.1, 2)).toBeCloseTo(2.81 + RIDER_YAW_ARMS_OUT, 6);
  });
});

describe('the yaw model (rollModel humanYawLoop, step 3.2b)', () => {
  // The lab's captive derivatives at 7 m/s with the rigid point rider (roll-plant results), [N, Y, K] per roll, slip, yaw rate, roll rate.
  const lab = { roll: [-104.9, -412.5, -285.3], slip: [-296.2, 1398.0, -530.6], yaw: [-13.1, 63.0, -34.5], rate: [2.65, -19.5, -1.5] };
  const plant = (rider: number): YawPlant => ({
    speed: 7, boardRollInertia: 0.1, boardYawInertia: 0.449, riderYawInertia: rider, boardMass: 2.54, mass: 73, height: 0.84,
    ankleStiffness: 800, ankleDamping: 80, ...boardDerivatives(lab, 7, 0.236), feetForward: 150, feetStation: -0.244, deckHeight: 0.031,
  });

  it('moves the derivatives to the board\'s own centre of mass: the heel\'s yaw nearly cancels, the fins\' weathercock and damping grow', () => {
    const d = boardDerivatives(lab, 7, 0.236);
    expect(d.heelSide).toBeCloseTo(412.5, 6);
    expect(d.heelYaw).toBeCloseTo(104.9 - 0.236 * 412.5, 6);
    expect(d.slipSide).toBeCloseTo(-1398, 6);
    expect(d.slipYaw).toBeCloseTo(296.2 + 0.236 * 1398, 6);
    expect(d.yawDamping).toBeLessThan(-40);
    expect(d.heelRoll).toBeCloseTo(-285.3, 6);
  });

  it('grows the free roll near 1.1 Hz with 3.2\'s gains and no rider yaw inertia, and the inertia slows it without damping it', () => {
    const delay = { delay: 0.1, motorLag: 0.05 };
    const gains = { bank: 0, bankRate: 0.1 };
    const without = humanYawModes(plant(0), delay, gains)[0];
    expect(without.damping).toBeLessThan(0);
    expect(without.frequency).toBeGreaterThan(0.9);
    expect(without.frequency).toBeLessThan(1.3);
    const withInertia = humanYawModes(plant(2.81), delay, gains)[0];
    expect(withInertia.frequency).toBeLessThan(without.frequency);
    expect(withInertia.damping).toBeLessThan(0);
  });
});

describe('the twist model (rollModel humanTwistLoop, step 3.2c)', () => {
  const lab = { roll: [-104.9, -412.5, -285.3], slip: [-296.2, 1398.0, -530.6], yaw: [-13.1, 63.0, -34.5], rate: [2.65, -19.5, -1.5] };
  const plant = (rider: number): YawPlant => ({
    speed: 7, boardRollInertia: 0.1, boardYawInertia: 0.449, riderYawInertia: rider, boardMass: 2.54, mass: 73, height: 0.84,
    ankleStiffness: 800, ankleDamping: 80, ...boardDerivatives(lab, 7, 0.236), feetForward: 150, feetStation: -0.244, deckHeight: 0.031,
  });
  const delay = { delay: 0.1, motorLag: 0.05 };
  const gains = { bank: 0, bankRate: 0.1 };
  const none: TwistGains = { bank: 0, bankRate: 0, yawRate: 0, twist: 0, twistRate: 0 };

  it('is 3.2b\'s rigid coupling when the twist is stiff: the board\'s share and the upper body\'s add up', () => {
    const rigid = humanYawModes(plant(2.81), delay, gains)[0];
    const stiff = humanTwistModes(plant(1.37), { inertia: 1.44, stiffness: 1e4, damping: 300 }, delay, gains, none)[0];
    expect(stiff.damping).toBeCloseTo(rigid.damping, 2);
    expect(stiff.frequency).toBeCloseTo(rigid.frequency, 2);
  });

  it('turns the board and the upper body by opposite equal moments: the twist keeps the yaw momentum', () => {
    const rows = twistRows(plant(1.37), { inertia: 1.44, stiffness: 20, damping: 3 }, 1, 11);
    // The twist torque's column (10): the board's yaw (row 4) against the upper body's (row 9).
    expect((0.449 + 1.37) * rows[4][10] + 1.44 * rows[9][10]).toBeCloseTo(0, 9);
    // The twist's own spring and damper likewise (columns 8 and 9).
    expect((0.449 + 1.37) * rows[4][8] + 1.44 * rows[9][8]).toBeCloseTo(0, 9);
  });

  it('agrees in time, with the delay exact, with the modes on the delay\'s Padé', () => {
    const twist = { inertia: 1.44, stiffness: 10.3, damping: 5 };
    const law: TwistGains = { bank: 23.4, bankRate: 7.5, yawRate: -5, twist: 0, twistRate: 6.4 };
    const ankle = { bank: -0.023, bankRate: 0.019, yawRate: -0.016 };
    const m = humanTwistModes(plant(1.37), twist, delay, ankle, law)[0];
    const kick = humanTwistKick(plant(1.37), twist, delay, ankle, law);
    expect(m.damping).toBeGreaterThan(0);
    expect(kick.decay).toBeLessThan(1);
    const passive = humanTwistKick(plant(1.37), twist, delay, gains, none);
    expect(passive.peakBank).toBeGreaterThan(kick.peakBank);
  });
});
