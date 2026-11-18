import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARM_HOLD_TIME, ARM_LEAD_TIME, ARM_OVER_FROM, ARM_OVER_REAR, ARM_REACH_FROM, ARM_REACH_FULL,
  ARM_REACH_LEAD, ARM_REACH_REAR, ARM_REST, ARM_SPREAD_DATUM, armCarriagePlace, createArmCarriage,
  resetArmCarriage, stepArmCarriage,
} from './armCarriage';

const STEP = 1 / 60;

/** Runs the carriage for `seconds` at a held stick and returns its state. */
function hold(steer: number, seconds: number, rest = false) {
  const state = createArmCarriage();
  for (let t = 0; t < seconds; t += STEP) stepArmCarriage(state, STEP, steer, true, rest);
  return state;
}

describe('the arm carriage (step 3.5g, engine-target rows 4, 5 and 15)', () => {
  // ROW 4's own metric: "the number of distinct arm carriages reachable at one leg depth, and the arm's height band",
  // target >= 4 carriages at one depth (V7's four inside the Tall band; V8's five with four inside it; V9's five).
  // Nothing in the carriage reads leg depth, so the count is the same at every depth BY CONSTRUCTION, and that is the
  // finding the footage asks for: "tall => arms spread" and "deep => arms spread" are BOTH refuted.
  it('reaches four distinct carriages, and reads no leg depth to do it', () => {
    const places = new Map<string, { out: number; lift: number; across: number }>();
    const note = (name: string, state: ReturnType<typeof createArmCarriage>, lead: boolean) => {
      const p = armCarriagePlace(state, lead);
      places.set(name, { ...p });
    };
    // rest: the stick inside the reach band.
    note('rest-lead', hold(0, 1), true);
    note('rest-rear', hold(0, 1), false);
    // reach: a steady half-stick, past ARM_REACH_FULL.
    note('reach-lead', hold(ARM_REACH_FULL, 2), true);
    note('reach-rear', hold(ARM_REACH_FULL, 2), false);
    // over: the stick hard over.
    note('over-rear', hold(1, 2), false);
    const distinct = new Set([...places.values()].map((p) => `${p.out.toFixed(3)}/${p.lift.toFixed(3)}/${p.across.toFixed(3)}`));
    // rest-lead and rest-rear are the same carriage (both hands low), so five readings give four distinct places.
    expect(distinct.size).toBe(4);
    // And the mirror: the same four on the other rail, which the `inside` sign gives.
    expect(hold(-1, 2).inside).toBe(-1);
    expect(hold(1, 2).inside).toBe(1);
    // The signature of row 4: NOTHING here is a function of leg depth. The module's whole input surface is
    // (state, h, steer, standing, rest) — five arguments (`length` counts the four before the default), none of them
    // a depth, a stance or a crouch.
    expect(stepArmCarriage.length).toBe(4);
    // And the module's CODE (its comments stripped) names no depth quantity at all — the claim the owner can check.
    const code = readFileSync(new URL('./armCarriage.ts', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/depth|crouch|Crouch|compress|Compress|stanceRoom|stanceAt|import/);
  });

  // ROW 15: "both hands carried low over the deck, inside the rails" — V8 5 windows (~15 frames, the clip's single
  // most common arm position), V9 carriage A 6 windows (its most common), V7 9 frames across 4 windows. Three clips.
  it('rests with BOTH hands low and drawn in, and `rest` holds it against any stick', () => {
    const rest = hold(0, 1);
    for (const lead of [true, false]) {
      const p = armCarriagePlace(rest, lead);
      // Low: below the arm part's own placed height, by enough to put the hand under the pelvis's 0.78 m.
      expect(p.lift).toBeLessThan(-0.3);
      expect(p.lift).toBe(ARM_REST.lift);
      // Drawn in: less spread than the shipped ARM_SPREAD, and on the stringer (inside the rails).
      expect(p.out).toBeLessThan(ARM_SPREAD_DATUM);
      expect(p.across).toBe(0);
    }
    // `armCarry: 'rest'` is row 15 alone: the stick hard over for two seconds still leaves the rest carriage.
    const held = hold(1, 2, true);
    expect(held.reach).toBe(0);
    expect(held.over).toBe(0);
    expect(armCarriagePlace(held, true)).toEqual({ ...ARM_REST });
  });

  // The pairing at a low's peak: "lead hand down at the rail, board or knee, rear arm up and back" — V5 (3 of 3
  // turns), V6 (2 frames), V7 (carriages A and D). THREE CLIPS, and none of the three times it against the board.
  it('pairs a lead hand DOWN and across with a rear arm UP and back', () => {
    const state = hold(1, 2);
    const lead = armCarriagePlace(state, true);
    const rear = armCarriagePlace(state, false);
    // The lead hand is below the rest carriage and out across toward the inside rail.
    expect(lead.lift).toBeLessThan(ARM_REST.lift);
    expect(lead.across).toBeGreaterThan(0.1);
    // The rear arm is above the arm part's own height and away from that rail — the opposite sign on both numbers.
    expect(rear.lift).toBeGreaterThan(0);
    expect(rear.across).toBeLessThan(0);
    expect(Math.sign(lead.across)).toBe(-Math.sign(rear.across));
    // And the rear hand ends up higher than the lead hand by more than a head's length.
    expect(rear.lift - lead.lift).toBeGreaterThan(0.6);
  });

  // ROW 5's exception, which the target calls informative: "the arm belongs to some turns and not others". V10's
  // bottom turn took the overhead arm and a top turn 0.5 s later did not; V9's 1.10 s roundhouse cutback went without
  // it. So the OVERHEAD arm answers the top of the stick's throw only, and a soft turn keeps the pairing.
  it('raises the rear arm overhead on a HARD ask only, and not on a soft one', () => {
    const soft = hold(ARM_REACH_FULL, 2);
    expect(soft.reach).toBeGreaterThan(0.9);
    expect(soft.over).toBe(0);
    expect(armCarriagePlace(soft, false).lift).toBeCloseTo(ARM_REACH_REAR.lift, 2);
    const hard = hold(1, 2);
    expect(hard.over).toBeGreaterThan(0.9);
    expect(armCarriagePlace(hard, false).lift).toBeCloseTo(ARM_OVER_REAR.lift, 2);
    // The LEAD arm never goes overhead: V9's overhead passage has the rear arm up and the lead arm reaching past the
    // rail, and its roundhouse is carried on the lead arm alone.
    expect(armCarriagePlace(hard, true).lift).toBeCloseTo(ARM_REACH_LEAD.lift, 2);
    // Half way between the two bands: the pairing is in, the overhead arm is not.
    const between = hold((ARM_REACH_FULL + ARM_OVER_FROM) / 2, 2);
    expect(between.reach).toBeGreaterThan(0.9);
    expect(between.over).toBe(0);
  });

  // ROW 5's two quantities, which are DIFFERENT and must not be merged: the LEAD (the arm arrives before the rail
  // bites, +0.07 to +0.30 s, 2 clips / 3 riders / 2 breaks) and the HOLD (~0.7 s overhead, V9, SINGLE). The engine's
  // one orderable pair runs backwards: MOTOR_LAG 0.05 s against ARMS_TIME 0.15 s up, and KNEE_RETURN_TIME 0.6 s
  // against ARMS_TIME 0.15 s back. Here the asymmetry is the right way round.
  it('rises fast and returns slowly, so the carriage LEADS and then HOLDS', () => {
    expect(ARM_LEAD_TIME).toBeLessThan(ARM_HOLD_TIME);
    // Up: within one lead time constant the carriage is most of the way there.
    const rising = createArmCarriage();
    for (let t = 0; t < ARM_LEAD_TIME; t += STEP) stepArmCarriage(rising, STEP, 1, true);
    expect(rising.reach).toBeGreaterThan(0.5);
    // Back: the stick released, the carriage is STILL most of the way up a fifth of a second later, and still part way
    // up at 0.7 s — which is the window V9 measured the overhead arm over.
    const falling = hold(1, 2);
    for (let t = 0; t < 0.2; t += STEP) stepArmCarriage(falling, STEP, 0, true);
    expect(falling.reach).toBeGreaterThan(0.7);
    for (let t = 0; t < 0.5; t += STEP) stepArmCarriage(falling, STEP, 0, true);
    expect(falling.reach).toBeGreaterThan(0.3);
    // The side is LATCHED through the hold, so the hand keeps the rail it was leaning over.
    expect(falling.inside).toBe(1);
    // And it is forgotten once the carriage has come back.
    for (let t = 0; t < 4; t += STEP) stepArmCarriage(falling, STEP, 0, true);
    expect(falling.reach).toBeLessThan(0.05);
    expect(falling.inside).toBe(0);
  });

  it('keeps the rest carriage inside the deadband, and answers nothing at all when not standing', () => {
    // A line held straight (the engine's own STEER_DEADBAND is 0.05, below ARM_REACH_FROM) keeps the rest carriage.
    expect(hold(0.05, 1).reach).toBe(0);
    expect(hold(ARM_REACH_FROM, 1).reach).toBe(0);
    expect(hold(ARM_REACH_FROM + 0.1, 1).reach).toBeGreaterThan(0);
    // Not standing: cleared, not held.
    const state = hold(1, 2);
    expect(state.reach).toBeGreaterThan(0.9);
    stepArmCarriage(state, STEP, 1, false);
    expect(state).toEqual({ reach: 0, over: 0, inside: 0 });
    resetArmCarriage(state);
    expect(state).toEqual({ reach: 0, over: 0, inside: 0 });
  });

});
