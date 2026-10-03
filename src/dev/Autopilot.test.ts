import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import type { RideInput } from '../physics/RideSession';
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

// The movement-flow spec: the user's sequence (bottom turn, projection, cutback, rebound), ridden on the pool's wave
// by the poolFlow probe.
describe('autopilot flow', () => {
  const DEG = Math.PI / 180;
  const STEP = 1 / 60;
  /** Standing at `heading` on a wave travelling +z, the open face toward +x unless `peel` says otherwise. */
  const standing = (heading: number, frame: Partial<WaveFrame>, peel = 1, speed = 6) => view({
    board: { x: 0, z: -20, heading }, peelDirection: peel, ride: ride({ phase: 'standing', speed, wave: wave(frame) }),
  });
  /** Riding the flow, taken through the drop and the bottom turn into the projection. */
  const projecting = (options: AutopilotOptions = {}) => {
    const autopilot = riding(10 * DEG, { style: 'flow', ...options });
    autopilot.next(standing(10 * DEG, { faceFraction: 0.3 }), STEP);
    autopilot.next(standing(10 * DEG, { faceFraction: 0.3 }), STEP);
    autopilot.next(standing(115 * DEG, { faceFraction: 0.4 }), STEP);
    return autopilot;
  };

  it('drops crouched, bottom turns compressed toward the open face with a little front foot, and projects tall', () => {
    const autopilot = riding(10 * DEG, { style: 'flow' });
    expect(autopilot.next(standing(10 * DEG, { faceFraction: 0.7 }), STEP)).toMatchObject({ steer: 0, crouch: 1, compress: 0 });
    expect(autopilot.phase).toBe('FLOW · DROP');
    const bottom = autopilot.next(standing(10 * DEG, { faceFraction: 0.3 }), STEP);
    expect(bottom).toMatchObject({ steer: 1, crouch: 0, compress: 1 });
    expect(bottom.trim).toBeGreaterThan(0);
    expect(bottom.trim).toBeLessThan(0.5);
    expect(autopilot.next(standing(20 * DEG, { faceFraction: 0.35 }), STEP).steer).toBe(1);
    // Heading past 25°, Compress released (the body's lean carries the turn on): the projection, tall and centred.
    expect(autopilot.next(standing(30 * DEG, { faceFraction: 0.4 }), STEP)).toMatchObject({ steer: 0, trim: 0, crouch: 0, compress: 0 });
    expect(autopilot.phase).toBe('FLOW · PROJECTION');
    // Mirrored for an open face toward −x.
    const mirrored = riding(-10 * DEG, { style: 'flow' });
    mirrored.next(standing(-10 * DEG, { faceFraction: 0.3 }, -1), STEP);
    expect(mirrored.next(standing(-10 * DEG, { faceFraction: 0.3 }, -1), STEP)).toMatchObject({ steer: -1, compress: 1 });
  });

  it('cuts back out on the shoulder: compressed, weight back, leaning and looking toward the curl until back down the face past the fall line, then rebounds', () => {
    const autopilot = projecting();
    // High on the face near the curl: along the line.
    autopilot.next(standing(90 * DEG, { faceFraction: 0.7, curlDistance: 5, curlSide: -1 }), STEP);
    expect(autopilot.phase).toMatch(/^FLOW · PUMP/);
    // CUTBACK_REACH (10 m) ahead of it: the cutback, with the coaching's 65/35 onto the back foot.
    const cutback = autopilot.next(standing(90 * DEG, { faceFraction: 0.7, curlDistance: 11, curlSide: -1 }), STEP);
    expect(cutback).toMatchObject({ steer: -1, trim: -0.5, crouch: 0, compress: 1, rotate: -1 });
    for (const degrees of [60, 20, -20, -28]) {
      expect(autopilot.next(standing(degrees * DEG, { faceFraction: 0.5, curlDistance: 8, curlSide: -1 }), STEP).steer).toBe(-1);
    }
    // 30° past the fall line toward the curl, back down the face: the rebound, the bottom turn again, the rotation
    // left to the body.
    const rebound = autopilot.next(standing(-32 * DEG, { faceFraction: 0.4, curlDistance: 3, curlSide: -1 }), STEP);
    expect(rebound).toMatchObject({ steer: 1, compress: 1 });
    expect(rebound.rotate).toBeUndefined();
    expect(autopilot.phase).toBe('FLOW · REBOUND');
    // Begun up the face, the cutback still ends round 160°, before the heading is that far past the fall line.
    const steep = projecting();
    steep.next(standing(140 * DEG, { faceFraction: 0.7, curlDistance: 11, curlSide: -1 }), STEP);
    expect(steep.phase).toBe('FLOW · CUTBACK');
    for (const degrees of [100, 60, 20, -15]) steep.next(standing(degrees * DEG, { faceFraction: 0.5, curlDistance: 8, curlSide: -1 }), STEP);
    expect(steep.phase).toBe('FLOW · CUTBACK');
    steep.next(standing(-22 * DEG, { faceFraction: 0.5, curlDistance: 8, curlSide: -1 }), STEP);
    expect(steep.phase).toBe('FLOW · REBOUND');
    // A longer cutback reach: the same shoulder is not far enough out.
    const later = projecting({ cutbackReach: 15 });
    later.next(standing(90 * DEG, { faceFraction: 0.7, curlDistance: 11, curlSide: -1 }), STEP);
    expect(later.phase).toMatch(/^FLOW · PUMP/);
  });

  it('ends the projection once the body is back near upright, or at the top of the face', () => {
    const banked = (degrees: number, at: AutopilotView) => ({ ...at, ride: { ...at.ride, bank: degrees * DEG } });
    const top = (frames: [number, number][]) => {
      const autopilot = riding(30 * DEG, { style: 'flow' });
      autopilot.next(standing(30 * DEG, { faceFraction: 0.3 }), STEP);
      autopilot.next(standing(30 * DEG, { faceFraction: 0.3 }), STEP);
      autopilot.next(banked(25, standing(50 * DEG, { faceFraction: 0.3 })), STEP);
      return frames.map(([bank, fraction]) => {
        autopilot.next(banked(bank, standing(80 * DEG, { faceFraction: fraction, curlDistance: 11, curlSide: -1 })), STEP);
        return autopilot.phase;
      });
    };
    // Still banked 20° into the bottom turn it projects on; within 12° of upright, the cutback.
    expect(top([[20, 0.4], [-18, 0.45], [10, 0.5]])).toEqual(['FLOW · PROJECTION', 'FLOW · PROJECTION', 'FLOW · CUTBACK']);
    // At the top of the face, though still banked.
    expect(top([[25, 0.5], [25, 0.7]])).toEqual(['FLOW · PROJECTION', 'FLOW · CUTBACK']);
  });

  it('starts in the phase asked for (the probe\'s isolated cutback)', () => {
    const autopilot = riding(90 * DEG, { style: 'flow', flowFrom: 'cutback' });
    expect(autopilot.next(standing(90 * DEG, { faceFraction: 0.6 }), STEP)).toMatchObject({ steer: -1, trim: -0.5, compress: 1, rotate: -1 });
    expect(autopilot.flowRecords[0].phase).toBe('cutback');
  });

  // The movement-flow spec's pumping, as `pumping.test.ts` times it on still water: S-turns about the riding line, the
  // lean swept rail to rail once every 2 s, the crouch deepest 3/16 of that after the stick crosses the middle (the
  // body passing upright, unweighted) and tallest 3/16 after its peak (the new rail set, weighted); never Compress.
  it('pumps through rail changes: the lean swept from rail to rail about the line, crouched between the rails, tall on them', () => {
    // On the riding line (60° from the fall line, in the face's band) the line asks for no lean: the sweep alone.
    const pump = (fraction: number, peel = 1) => {
      // Through the drop and the bottom turn into the projection, as `projecting`, toward the open face `peel`.
      const autopilot = riding(peel * 10 * DEG, { style: 'flow' });
      for (const [degrees, faceFraction] of [[10, 0.3], [10, 0.3], [115, 0.4]]) autopilot.next(standing(peel * degrees * DEG, { faceFraction }, peel), STEP);
      const inputs: RideInput[] = [];
      const phases: string[] = [];
      for (let i = 0; i <= 120; i += 1) {
        inputs.push(autopilot.next(standing(peel * 60 * DEG, { faceFraction: fraction, curlDistance: 5, curlSide: -peel }, peel), STEP));
        phases.push(autopilot.phase);
      }
      return { inputs, phases };
    };
    const high = pump(0.7);
    // The projection ends at once (no bank: the body upright); from the face's upper half the first turn leans down it.
    const at = (seconds: number) => high.inputs[Math.round(seconds / STEP)];
    expect(at(0.5).steer).toBeCloseTo(-1, 2);
    expect(high.phases[Math.round(0.5 / STEP)]).toBe('FLOW · PUMP · DOWN');
    expect(at(1.5).steer).toBeCloseTo(1, 2);
    expect(high.phases[Math.round(1.5 / STEP)]).toBe('FLOW · PUMP · UP');
    expect(Math.abs(at(1).steer)).toBeLessThan(0.02);
    // Twice a period the crouch: deepest 0.375 s after the stick crosses the middle, tallest 0.375 s after its peak.
    for (const seconds of [0.375, 1.375]) expect(at(seconds).crouch).toBeCloseTo(1, 2);
    for (const seconds of [0.875, 1.875]) expect(at(seconds).crouch).toBeCloseTo(0, 2);
    expect(high.inputs.every((input) => input.compress === 0 && input.trim === 0)).toBe(true);
    // From the lower half (above the bottom turn's 0.4) the first turn leans up the face; mirrored for an open face toward −x.
    const low = pump(0.45);
    expect(low.inputs[Math.round(0.5 / STEP)].steer).toBeCloseTo(1, 2);
    const mirrored = pump(0.45, -1);
    expect(mirrored.inputs[Math.round(0.5 / STEP)].steer).toBeCloseTo(-1, 2);
  });

  it('pumps about the riding line: off it, the line holds a part of its lean beside the sweep, and the stick is never passed', () => {
    const pump = (peel: number) => {
      const autopilot = riding(peel * 10 * DEG, { style: 'flow' });
      for (const [degrees, faceFraction] of [[10, 0.3], [10, 0.3], [115, 0.4]]) autopilot.next(standing(peel * degrees * DEG, { faceFraction }, peel), STEP);
      // 40° short of the 60° line, in the face's band and its lower half: the line asks for the full lean toward the open face.
      return Array.from({ length: 121 }, () => autopilot.next(standing(peel * 20 * DEG, { faceFraction: 0.45, curlDistance: 5, curlSide: -peel }, peel), STEP).steer);
    };
    const steers = pump(1);
    const at = (seconds: number) => steers[Math.round(seconds / STEP)];
    // Where the sweep crosses the middle, the line's own lean is left: a part of it, neither none nor all.
    expect(at(1)).toBeGreaterThan(0.1);
    expect(at(1)).toBeLessThan(0.5);
    // The sweep swings about that lean; at its peak toward the open face the sum is held to the stick.
    expect(at(1.5)).toBeCloseTo(at(1) - 1, 2);
    expect(at(0.5)).toBeCloseTo(1, 6);
    expect(Math.max(...steers.map(Math.abs))).toBeLessThanOrEqual(1);
    // Mirrored for an open face toward −x.
    expect(pump(-1)[Math.round(1 / STEP)]).toBeCloseTo(-at(1), 6);
  });

  it('keeps pumping when asked to: no bottom turn low on the face, no cutback far ahead of the curl', () => {
    const autopilot = projecting({ pumpOnly: true });
    autopilot.next(standing(60 * DEG, { faceFraction: 0.7, curlDistance: 5, curlSide: -1 }), STEP);
    expect(autopilot.phase).toMatch(/^FLOW · PUMP/);
    for (const frame of [{ faceFraction: 0.2, curlDistance: 5 }, { faceFraction: 0.6, curlDistance: 30 }, { faceFraction: 0.5, curlDistance: Infinity }]) {
      expect(autopilot.next(standing(40 * DEG, { ...frame, curlSide: -1 }), STEP).compress).toBe(0);
      expect(autopilot.phase).toMatch(/^FLOW · PUMP/);
    }
    // Without it, the same frames turn at the bottom of the face as before.
    const flow = projecting();
    flow.next(standing(60 * DEG, { faceFraction: 0.7, curlDistance: 5, curlSide: -1 }), STEP);
    flow.next(standing(40 * DEG, { faceFraction: 0.2, curlDistance: 5, curlSide: -1 }), STEP);
    expect(flow.phase).toBe('FLOW · BOTTOM TURN');
  });

  it('records each phase: how long, how far it turned toward the open face, the speed, face and curl in and out, and whether it finished', () => {
    const autopilot = riding(10 * DEG, { style: 'flow' });
    autopilot.next(standing(10 * DEG, { faceFraction: 0.7, curlDistance: 4, curlSide: -1 }), STEP);
    autopilot.next(standing(10 * DEG, { faceFraction: 0.3, curlDistance: 5, curlSide: -1 }, 1, 7), STEP);
    autopilot.next(standing(20 * DEG, { faceFraction: 0.35, curlDistance: 6, curlSide: -1 }, 1, 6.5), STEP);
    autopilot.next(standing(95 * DEG, { faceFraction: 0.4, curlDistance: 7, curlSide: -1 }, 1, 6), STEP);
    autopilot.next({ ...standing(100 * DEG, { faceFraction: 0.5 }), ride: ride({ phase: 'fallen', speed: 3 }) }, STEP);
    expect(autopilot.flowRecords.map((record) => record.phase)).toEqual(['drop', 'bottom', 'project']);
    const [drop, bottom, project] = autopilot.flowRecords;
    expect(drop.completed).toBe(true);
    expect(bottom).toMatchObject({ completed: true, speedIn: 7, speedOut: 6, faceIn: 0.3, faceOut: 0.4, curlIn: 5, curlOut: 7 });
    expect(bottom.degrees).toBeCloseTo(85, 6);
    expect(bottom.seconds).toBeCloseTo(2 * STEP, 9);
    expect(project).toMatchObject({ completed: false, speedOut: 3 });
    expect(project.degrees).toBeCloseTo(5, 6);
    autopilot.reset();
    expect(autopilot.flowRecords).toHaveLength(0);
  });
});
