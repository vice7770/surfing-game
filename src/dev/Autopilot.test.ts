import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import { Autopilot, type AutopilotOptions, type AutopilotView } from './Autopilot';

const wave = (overrides: Partial<WaveFrame> = {}): WaveFrame => ({
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 3, crestSpeed: 5, faceHeight: 1.5, faceFraction: 0.5, crestBreaking: 0,
  curlDistance: Infinity, curlSide: 0, speedOverGround: 6, speedShoreward: 3, speedAlongCrest: 5, requiredSpeed: 7, ...overrides,
});

type RideView = AutopilotView['ride'];
const ride = (overrides: Partial<RideView> = {}): RideView => ({
  phase: 'prone', speed: 0, boardSpeed: 0, cue: false, popUp: { outcome: 'none', duration: 0, landingPeak: 0, frontShare: 0 }, resets: 0,
  balance: 1, wave: wave(), leash: { snapped: false, tension: 0, distance: 0, reeling: false }, duck: 0, boardInReach: false, knock: 0, breath: 1, rescues: 0, ...overrides,
});

const view = (overrides: Partial<AutopilotView> = {}): AutopilotView => ({
  ride: ride(), peelDirection: 1, board: { x: 0, z: -20, heading: 0 }, focusZ: 0, crestBehind: 0, ...overrides,
});

/** An autopilot taken to riding at `heading`: waiting, a crest behind, a cue, and standing. */
function riding(heading = 0, options: AutopilotOptions = {}): Autopilot {
  const autopilot = new Autopilot(options);
  autopilot.next(view({ board: { x: 0, z: -3, heading } }), 1 / 60);
  autopilot.next(view({ board: { x: 0, z: -3, heading }, crestBehind: 1 }), 1 / 60);
  autopilot.next(view({ board: { x: 0, z: -3, heading }, ride: ride({ phase: 'standing', speed: 6, popUp: { outcome: 'stood', duration: 1.2, landingPeak: 1.6, frontShare: 0.7 } }) }), 1 / 60);
  return autopilot;
}

describe('autopilot', () => {
  it('paddles toward the break line from the relaunch point and waits outside it', () => {
    const autopilot = new Autopilot({ waitOutside: 5 });
    expect(autopilot.next(view({ board: { x: 0, z: -10, heading: 0 } }), 1 / 60).paddle).toBe(true);
    expect(autopilot.state).toBe('position');
    expect(autopilot.next(view({ board: { x: 0, z: -4, heading: 0 } }), 1 / 60).paddle).toBe(false);
    expect(autopilot.state).toBe('wait');
  });

  it('goes when a crest rises behind, and pops up on the cue and not before', () => {
    const autopilot = new Autopilot({ waitOutside: 5, rise: 0.5 });
    autopilot.next(view({ board: { x: 0, z: -3, heading: 0 } }), 1 / 60);
    autopilot.next(view({ board: { x: 0, z: -3, heading: 0 }, crestBehind: 0.4 }), 1 / 60);
    expect(autopilot.state).toBe('wait');
    const go = autopilot.next(view({ board: { x: 0, z: -3, heading: 0 }, crestBehind: 0.6 }), 1 / 60);
    expect(autopilot.state).toBe('go');
    expect(go.paddle).toBe(true);
    expect(go.popUp).toBe(false);
    const cue = autopilot.next(view({ ride: ride({ cue: true }) }), 1 / 60);
    expect(cue.popUp).toBe(true);
    expect(cue.paddle).toBe(false);
  });

  it('standing, steers along the face toward the peel side', () => {
    const toPlus = riding().next(view({ ride: ride({ phase: 'standing', speed: 6 }), peelDirection: 1 }), 1 / 60);
    const toMinus = riding().next(view({ ride: ride({ phase: 'standing', speed: 6 }), peelDirection: -1 }), 1 / 60);
    expect(toPlus.steer).toBeGreaterThan(0.5);
    expect(toMinus.steer).toBeLessThan(-0.5);
  });

  it('turns up the face when too low, and down when too high', () => {
    const line = (60 * Math.PI) / 180;
    const board = { x: 0, z: -20, heading: line };
    const low = riding(line).next(view({ board, ride: ride({ phase: 'standing', speed: 6, wave: wave({ faceFraction: 0.2 }) }) }), 1 / 60);
    const high = riding(line).next(view({ board, ride: ride({ phase: 'standing', speed: 6, wave: wave({ faceFraction: 0.9 }) }) }), 1 / 60);
    const middle = riding(line).next(view({ board, ride: ride({ phase: 'standing', speed: 6, wave: wave({ faceFraction: 0.5 }) }) }), 1 / 60);
    expect(low.steer).toBeGreaterThan(0.2);
    expect(high.steer).toBeLessThan(-0.2);
    expect(Math.abs(middle.steer)).toBeLessThan(0.05);
  });

  it('rides a close-out straight in', () => {
    const input = riding().next(view({ ride: ride({ phase: 'standing', speed: 6 }), peelDirection: 0 }), 1 / 60);
    expect(Math.abs(input.steer)).toBeLessThan(0.05);
  });

  it('ends the attempt on a fall or when the wave leaves, and starts over on reset', () => {
    const fell = riding();
    fell.next(view({ ride: ride({ phase: 'fallen', separation: 'balance' }) }), 1 / 60);
    expect(fell.state).toBe('done');
    expect(fell.outcome).toBe('fell · balance');
    const left = riding();
    for (let i = 0; i < 70; i += 1) left.next(view({ ride: ride({ phase: 'standing', speed: 1 }) }), 1 / 60);
    expect(left.state).toBe('done');
    expect(left.outcome).toBe('the wave left');
    left.reset();
    expect(left.state).toBe('position');
  });

  // The ride report (riding-the-wave Task 3): a crawling board is not the end; the ride analyzer says when it is.
  it('can leave the ride\'s end to its caller', () => {
    const pilot = riding(0, { stall: false });
    for (let i = 0; i < 180; i += 1) pilot.next(view({ ride: ride({ phase: 'standing', speed: 0.5 }) }), 1 / 60);
    expect(pilot.state).toBe('ride');
    pilot.finish('wave died');
    expect(pilot.state).toBe('done');
    expect(pilot.outcome).toBe('wave died');
  });
});

describe('the take-off', () => {
  const DEG = Math.PI / 180;
  /** Paddling for a wave travelling +z with a crest behind, heading `heading`, the curl on `curlSide`. */
  const paddling = (heading: number, curlSide: number, peel = 0) => {
    const autopilot = new Autopilot();
    autopilot.next(view({ board: { x: 0, z: -3, heading } }), 1 / 60);
    return autopilot.next(view({
      board: { x: 0, z: -3, heading }, crestBehind: 1, peelDirection: peel,
      ride: ride({ phase: 'prone', wave: wave({ curlDistance: 8, curlSide }) }),
    }), 1 / 60);
  };

  // Riding-the-wave Task 7: a paddler turns only about 7°/s at full steer, too slowly to angle once the wave comes;
  // waiting, it points toward the open face its last ride saw (or the peel estimate's).
  it('waits pointed toward the open face its last ride saw', () => {
    const autopilot = riding(0, { style: 'turns' });
    autopilot.next(view({ board: { x: 0, z: -20, heading: 0 }, ride: ride({ phase: 'standing', speed: 6, wave: wave({ curlDistance: 6, curlSide: -1 }) }) }), 1 / 60);
    autopilot.reset();
    autopilot.next(view({ board: { x: 0, z: -3, heading: 0 } }), 1 / 60);
    expect(autopilot.state).toBe('wait');
    expect(autopilot.next(view({ board: { x: 0, z: -3, heading: 0 } }), 1 / 60).steer).toBeGreaterThan(0.5);
    const fresh = new Autopilot();
    fresh.next(view({ board: { x: 0, z: -3, heading: 0 }, peelDirection: 0 }), 1 / 60);
    expect(fresh.next(view({ board: { x: 0, z: -3, heading: 0 }, peelDirection: 0 }), 1 / 60).steer).toBe(0);
  });

  // Riding-the-wave Task 7: straight down a 1.3 m face the rider stood 8 m ahead of the crest on the flat.
  it('angles the take-off toward the open face', () => {
    const toPlusX = paddling(0, -1);
    expect(toPlusX.paddle).toBe(true);
    expect(toPlusX.steer).toBeGreaterThan(0.5);
    expect(paddling(0, 1).steer).toBeLessThan(-0.5);
    expect(paddling(0, 0, 1).steer).toBeGreaterThan(0.5);
    expect(paddling(35 * DEG, -1).steer).toBeCloseTo(0, 1);
    expect(paddling(0, 0, 0).steer).toBe(0);
  });
});

describe('autopilot turns', () => {
  const DEG = Math.PI / 180;
  /** Standing at `heading` on a wave travelling +z, the peel toward `peel`. */
  const standing = (heading: number, frame: Partial<WaveFrame>, peel = 1) => view({
    board: { x: 0, z: -20, heading }, peelDirection: peel, ride: ride({ phase: 'standing', speed: 6, wave: wave(frame) }),
  });
  const turning = (heading: number) => riding(heading, { style: 'turns' });

  it('bottom turns up the face toward the peel when low and heading down, and holds the turn', () => {
    const autopilot = turning(20 * DEG);
    const into = autopilot.next(standing(20 * DEG, { faceFraction: 0.2 }), 1 / 60);
    expect(into.steer).toBe(1);
    // The stances spec's sequence: Compress over the crouch at the base of the turn.
    expect(into.crouch).toBeCloseTo(0.6, 6);
    expect(into.compress).toBe(1);
    // Past the line and higher up the face it keeps turning, releasing Compress and extending out of the turn.
    const through = autopilot.next(standing(80 * DEG, { faceFraction: 0.45 }), 1 / 60);
    expect(through.steer).toBe(1);
    expect(through.crouch).toBe(0);
    expect(through.compress).toBe(0);
    const out = autopilot.next(standing(125 * DEG, { faceFraction: 0.5 }), 1 / 60);
    expect(out.steer).toBe(0);
    // The same turn for a peel toward -x leans the other way.
    const mirrored = turning(-20 * DEG).next(standing(-20 * DEG, { faceFraction: 0.2 }, -1), 1 / 60);
    expect(mirrored.steer).toBe(-1);
  });

  // Riding-the-wave Task 7: on the reference wave the peel estimate's direction was not a reliable guide; the gauge's
  // curl is. And on the flat far ahead of the crest a full bottom turn bled the speed and the rider fell.
  it('rides away from the curl the gauge sees, over the peel estimate', () => {
    expect(turning(20 * DEG).next(standing(20 * DEG, { faceFraction: 0.2, curlDistance: 6, curlSide: 1 }, 1), 1 / 60).steer).toBe(-1);
    expect(turning(-20 * DEG).next(standing(-20 * DEG, { faceFraction: 0.2, curlDistance: 6, curlSide: -1 }, -1), 1 / 60).steer).toBe(1);
  });

  // Traced: mid-turn the curl went out of the gauge's reach, the autopilot fell back on the peel estimate, which
  // pointed the other way, and reversed a full lean into the ground.
  it('keeps the open face it last saw while the curl is out of reach', () => {
    const autopilot = turning(20 * DEG);
    expect(autopilot.next(standing(20 * DEG, { faceFraction: 0.2, curlDistance: 6, curlSide: 1 }, 1), 1 / 60).steer).toBe(-1);
    expect(autopilot.next(standing(0, { faceFraction: 0.2, curlDistance: Infinity, curlSide: 0 }, 1), 1 / 60).steer).toBe(-1);
    // A new ride forgets it.
    autopilot.reset();
    expect(turning(20 * DEG).next(standing(20 * DEG, { faceFraction: 0.2 }, 1), 1 / 60).steer).toBe(1);
  });

  // Traced on the reference wave: the curl showed on the other side halfway through a bottom turn, and the turn
  // reversed at full lean. A turn keeps the direction it began with.
  it('finishes a turn the way it began, though the curl shows on the other side', () => {
    const autopilot = turning(20 * DEG);
    expect(autopilot.next(standing(20 * DEG, { faceFraction: 0.2, curlDistance: 6, curlSide: 1 }), 1 / 60).steer).toBe(-1);
    expect(autopilot.next(standing(0, { faceFraction: 0.2, curlDistance: 6, curlSide: -1 }), 1 / 60).steer).toBe(-1);
  });

  it('bottom turns only at the foot of the face, not on the flat far ahead of it', () => {
    expect(turning(10 * DEG).next(standing(10 * DEG, { faceFraction: 0.1, aheadOfCrest: 7 }), 1 / 60).steer).toBe(0);
    expect(turning(10 * DEG).next(standing(10 * DEG, { faceFraction: 0.1, aheadOfCrest: 5 }), 1 / 60).steer).toBe(1);
  });

  it('top turns back down the face when high, sitting back, and snaps in a breaking crest', () => {
    const autopilot = turning(110 * DEG);
    const into = autopilot.next(standing(110 * DEG, { faceFraction: 0.8 }), 1 / 60);
    expect(into.steer).toBe(-1);
    expect(into.trim).toBeCloseTo(-0.5, 6);
    expect(autopilot.next(standing(60 * DEG, { faceFraction: 0.6 }), 1 / 60).steer).toBe(-1);
    expect(autopilot.next(standing(25 * DEG, { faceFraction: 0.5 }), 1 / 60).steer).toBe(0);
    const snap = turning(110 * DEG).next(standing(110 * DEG, { faceFraction: 0.8, crestBreaking: 0.5 }), 1 / 60);
    expect(snap.steer).toBe(-1);
    expect(snap.trim).toBe(-1);
  });

  it('cuts back toward the peel from far out on the shoulder', () => {
    const autopilot = turning(70 * DEG);
    expect(autopilot.next(standing(70 * DEG, { aheadOfCrest: 10 }), 1 / 60).steer).toBe(-1);
    // Past the fall line, back toward where the wave breaks, it still turns.
    expect(autopilot.next(standing(-10 * DEG, { aheadOfCrest: 9 }), 1 / 60).steer).toBe(-1);
    expect(autopilot.next(standing(-35 * DEG, { aheadOfCrest: 9 }), 1 / 60).steer).toBe(0);
  });

  it('gives up a turn after 1.5 s', () => {
    const autopilot = turning(20 * DEG);
    for (let i = 0; i < 95; i += 1) autopilot.next(standing(20 * DEG, { faceFraction: 0.2 }), 1 / 60);
    expect(autopilot.next(standing(20 * DEG, { faceFraction: 0.45 }), 1 / 60).steer).toBe(0);
  });

  it('holds a turn longer when given a longer limit (the recorder\'s turnLimit)', () => {
    const autopilot = riding(20 * DEG, { style: 'turns', turnLimit: 2.5 });
    for (let i = 0; i < 95; i += 1) autopilot.next(standing(20 * DEG, { faceFraction: 0.2 }), 1 / 60);
    expect(autopilot.next(standing(20 * DEG, { faceFraction: 0.45 }), 1 / 60).steer).toBe(1);
    for (let i = 0; i < 60; i += 1) autopilot.next(standing(20 * DEG, { faceFraction: 0.2 }), 1 / 60);
    expect(autopilot.next(standing(20 * DEG, { faceFraction: 0.45 }), 1 / 60).steer).toBe(0);
  });

  // The recorder's overlay and log: what the rider is doing, and each turn's size, time and speed kept.
  it('names the phase it rides and records each turn: how far, how long, the speed kept, and whether it finished', () => {
    const autopilot = turning(20 * DEG);
    autopilot.next(standing(20 * DEG, { faceFraction: 0.2 }), 1 / 60);
    expect(autopilot.phase).toBe('BOTTOM TURN · COMPRESSED');
    autopilot.next(standing(80 * DEG, { faceFraction: 0.45 }), 1 / 60);
    expect(autopilot.phase).toBe('BOTTOM TURN · EXTENDING');
    autopilot.next({ ...standing(125 * DEG, { faceFraction: 0.5 }), ride: ride({ phase: 'standing', speed: 5.4, wave: wave({ faceFraction: 0.5 }) }) }, 1 / 60);
    expect(autopilot.phase).toBe('CLIMBING · EXTENDED');
    expect(autopilot.turnRecords).toHaveLength(1);
    const [turn] = autopilot.turnRecords;
    expect(turn).toMatchObject({ kind: 'bottom', completed: true, speedIn: 6, speedOut: 5.4 });
    expect(turn.degrees).toBeCloseTo(105, 6);
    expect(turn.seconds).toBeCloseTo(2 / 60, 9);
    // A turn given up at its limit is recorded unfinished; a fall mid-turn too; a new attempt starts a new list.
    const held = turning(20 * DEG);
    for (let i = 0; i < 95; i += 1) held.next(standing(20 * DEG, { faceFraction: 0.2 }), 1 / 60);
    expect(held.turnRecords[0]).toMatchObject({ kind: 'bottom', completed: false });
    const falling = turning(20 * DEG);
    falling.next(standing(20 * DEG, { faceFraction: 0.2 }), 1 / 60);
    falling.next(view({ board: { x: 0, z: -20, heading: 30 * DEG }, ride: ride({ phase: 'fallen', speed: 2 }) }), 1 / 60);
    expect(falling.turnRecords[0]).toMatchObject({ kind: 'bottom', completed: false, speedOut: 2 });
    falling.reset();
    expect(falling.turnRecords).toHaveLength(0);
    expect(falling.phase).toBe('');
  });

  // Task 8's rule: extend through the hollow (the bottom turn), crouch over the top and on the way down.
  it('pumps with the turns: crouched from the top down to the bottom turn, extended climbing', () => {
    expect(turning(20 * DEG).next(standing(20 * DEG, { faceFraction: 0.5 }), 1 / 60)).toMatchObject({ crouch: 0.6, compress: 0 });
    expect(turning(110 * DEG).next(standing(110 * DEG, { faceFraction: 0.5 }), 1 / 60).crouch).toBe(0);
    expect(turning(110 * DEG).next(standing(110 * DEG, { faceFraction: 0.8 }), 1 / 60).crouch).toBeCloseTo(0.6, 6);
  });
});
