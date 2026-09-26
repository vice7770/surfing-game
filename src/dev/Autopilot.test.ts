import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import { Autopilot, type AutopilotView } from './Autopilot';

const wave = (overrides: Partial<WaveFrame> = {}): WaveFrame => ({
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 3, crestSpeed: 5, faceHeight: 1.5, faceFraction: 0.5, crestBreaking: 0,
  speedOverGround: 6, speedShoreward: 3, speedAlongCrest: 5, requiredSpeed: 7, ...overrides,
});

type RideView = AutopilotView['ride'];
const ride = (overrides: Partial<RideView> = {}): RideView => ({
  phase: 'prone', speed: 0, boardSpeed: 0, cue: false, popUp: { outcome: 'none', duration: 0, landingPeak: 0, frontShare: 0 }, resets: 0,
  wave: wave(), ...overrides,
});

const view = (overrides: Partial<AutopilotView> = {}): AutopilotView => ({
  ride: ride(), peelDirection: 1, board: { x: 0, z: -20, heading: 0 }, focusZ: 0, crestBehind: 0, ...overrides,
});

/** An autopilot taken to riding at `heading`: waiting, a crest behind, a cue, and standing. */
function riding(heading = 0): Autopilot {
  const autopilot = new Autopilot();
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
