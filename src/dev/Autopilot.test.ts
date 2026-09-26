import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import { Autopilot, type AutopilotOptions, type AutopilotView } from './Autopilot';

const wave = (overrides: Partial<WaveFrame> = {}): WaveFrame => ({
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 3, crestSpeed: 5, faceHeight: 1.5, faceFraction: 0.5, crestBreaking: 0,
  speedOverGround: 6, speedShoreward: 3, speedAlongCrest: 5, requiredSpeed: 7, ...overrides,
});

type RideView = AutopilotView['ride'];
const ride = (overrides: Partial<RideView> = {}): RideView => ({
  phase: 'prone', speed: 0, boardSpeed: 0, cue: false, popUp: { outcome: 'none', duration: 0, landingPeak: 0, frontShare: 0 }, resets: 0,
  balance: 1, wave: wave(), ...overrides,
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
    expect(into.crouch).toBeCloseTo(0.6, 6);
    // Past the line and higher up the face it keeps turning, extending out of the turn.
    const through = autopilot.next(standing(80 * DEG, { faceFraction: 0.45 }), 1 / 60);
    expect(through.steer).toBe(1);
    expect(through.crouch).toBe(0);
    const out = autopilot.next(standing(125 * DEG, { faceFraction: 0.5 }), 1 / 60);
    expect(out.steer).toBe(0);
    // The same turn for a peel toward -x leans the other way.
    const mirrored = turning(-20 * DEG).next(standing(-20 * DEG, { faceFraction: 0.2 }, -1), 1 / 60);
    expect(mirrored.steer).toBe(-1);
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

  // Task 8's rule: extend through the hollow (the bottom turn), crouch over the top and on the way down.
  it('pumps with the turns: crouched from the top down to the bottom turn, extended climbing', () => {
    expect(turning(20 * DEG).next(standing(20 * DEG, { faceFraction: 0.5 }), 1 / 60).crouch).toBeCloseTo(0.6, 6);
    expect(turning(110 * DEG).next(standing(110 * DEG, { faceFraction: 0.5 }), 1 / 60).crouch).toBe(0);
    expect(turning(110 * DEG).next(standing(110 * DEG, { faceFraction: 0.8 }), 1 / 60).crouch).toBeCloseTo(0.6, 6);
  });
});
