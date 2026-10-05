import { describe, expect, it } from 'vitest';
import type { TubeApproachCue } from '../wave/barrel/tubeApproach';
import { Autopilot, type AutopilotView } from './Autopilot';
import { TubePilot } from './TubePilot';

function cue(time: number, overrides: Partial<TubeApproachCue> = {}): TubeApproachCue {
  return { seaTime: time, geometryStep: Math.round(time * 60), frontId: 4, sigma: 10, sigmaMin: 0, sigmaMax: 20,
    rayX: 0, rayZ: 1, tangentX: 1, tangentZ: 0, mouth: { x: 0, z: 2, floorY: 0, roofY: 1.5 },
    inside: { x: 0, z: 0, floorY: 0, roofY: 2 }, minimumClearance: 1.5, usableHalfWidth: 1,
    bodyFitsMouth: true, bodyInCavity: false, ...overrides };
}
function view(time: number, approach: TubeApproachCue | undefined = cue(time)): AutopilotView {
  return { seaTime: time, board: { x: 0, z: 3, heading: 0 }, focusZ: 0, crestBehind: 2, peelDirection: 1,
    ride: { phase: 'standing', cue: false, speed: 6, boardSpeed: 6, resets: 0, balance: 1, bank: 0,
      popUp: { outcome: 'none', duration: 0, landingPeak: 0, frontShare: 0 },
      wave: { valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 2, crestSpeed: 5, faceHeight: 3,
        faceFraction: 0.5, crestBreaking: 1, curlDistance: 5, curlSide: -1, speedOverGround: 6,
        speedShoreward: 3, speedAlongCrest: 5, requiredSpeed: 7 },
      leash: { snapped: false, tension: 0, distance: 0, reeling: false }, duck: 0, boardInReach: false,
      knock: 0, breath: 1, rescues: 0, tubeApproach: approach } };
}
function seeking(time: number, heading: number, bank: number): AutopilotView {
  const snapshot = view(time);
  snapshot.ride.tubeApproach = undefined;
  snapshot.board.heading = heading;
  snapshot.ride.bank = bank;
  return snapshot;
}

describe('ordinary tube controls', () => {
  it('keeps controls finite while no usable wave frame or tube cue is available', () => {
    const snapshot = view(1); snapshot.ride.tubeApproach = undefined;
    snapshot.ride.wave = { ...snapshot.ride.wave, valid: false, faceFraction: NaN, curlSide: NaN, directionX: NaN, directionZ: NaN };
    const input = new TubePilot().next(snapshot, 1 / 60);
    expect(Number.isFinite(input.steer)).toBe(true);
    expect(input.crouch).toBe(1);
  });

  it.each([
    { motion: 'yaw', previousHeading: 0.2, previousBank: 0.1 },
    { motion: 'bank rate', previousHeading: 0.6, previousBank: -0.2 },
  ])('damps actual $motion across consecutive no-guide seek snapshots', ({ previousHeading, previousBank }) => {
    const moving = new TubePilot(), steady = new TubePilot();
    moving.next(seeking(1, previousHeading, previousBank), 1 / 60);
    steady.next(seeking(1, 0.6, 0.1), 1 / 60);
    const damped = moving.next(seeking(1.2, 0.6, 0.1), 1 / 60);
    const staticPose = steady.next(seeking(1.2, 0.6, 0.1), 1 / 60);
    // The same face target lies to the positive side of this pose. Actual turn/bank motion requires release instead.
    expect(staticPose.steer).toBeGreaterThan(0);
    expect(damped.steer).toBeLessThan(0);
    expect(moving.phase).toBe('seek');
    expect(damped).toMatchObject({ paddle: false, popUp: false, crouch: 1, compress: 0, trim: 0 });
  });

  it('keeps seek pose history unchanged on duplicate clocks and clears it on reset', () => {
    const pilot = new TubePilot();
    const first = pilot.next(seeking(1, 0.2, -0.2), 1 / 60);
    const duplicate = view(1, cue(1, { bodyInCavity: true }));
    duplicate.board.heading = 1.5; duplicate.ride.bank = 0.8;
    expect(pilot.next(duplicate, 1 / 60)).toEqual(first);
    expect(pilot.phase).toBe('seek');
    expect(pilot.next(seeking(1.2, 0.6, 0.1), 1 / 60).steer).toBeLessThan(0);
    pilot.reset();
    expect(pilot.next(seeking(1.2, 0.6, 0.1), 1 / 60).steer).toBeGreaterThan(0);
    expect(pilot.phase).toBe('seek');
  });

  it('does not divide pose changes by a zero fallback interval', () => {
    const pilot = new TubePilot(), snapshot = seeking(1, 0.6, 0.1);
    snapshot.seaTime = undefined;
    const first = pilot.next(snapshot, 0);
    snapshot.board.heading = 1; snapshot.ride.bank = 0.2;
    expect(pilot.next(snapshot, 0)).toEqual(first);
    expect(Number.isFinite(first.steer)).toBe(true);
    expect(pilot.phase).toBe('seek');
  });
  it('crouches before the current body fits, bounds steering and never places or assists the actor', () => {
    const pilot = new TubePilot();
    const input = pilot.next(view(1, cue(1, { bodyFitsMouth: false })), 1 / 60);
    expect(pilot.phase).toBe('prepare');
    expect(input).toMatchObject({ crouch: 1, compress: 0, trim: 0, paddle: false, popUp: false });
    expect(Math.abs(input.steer)).toBeLessThanOrEqual(0.025 + 1e-10);
    expect('place' in input).toBe(false); expect('retry' in input).toBe(false);
    for (let i = 1; i <= 60; i++) expect(Math.abs(pilot.next(view(1 + i / 60), 1 / 60).steer)).toBeLessThanOrEqual(0.5);
  });

  it('does not integrate steering or travel again on an unchanged worker snapshot', () => {
    const pilot = new TubePilot(), snapshot = view(1, cue(1, { bodyInCavity: true }));
    const first = pilot.next(snapshot, 1 / 60);
    for (let i = 0; i < 100; i++) expect(pilot.next(snapshot, 1 / 60)).toEqual(first);
    expect(pilot.phase).toBe('travel');
  });

  it('requires fit and stable bank to enter and discards stale or different-front guidance', () => {
    const pilot = new TubePilot(), unstable = view(1);
    unstable.ride.bank = 0.7;
    expect(pilot.next(unstable, 1 / 60).steer).toBeLessThan(0); expect(pilot.phase).toBe('prepare');
    pilot.next(view(1.1), 1 / 60); expect(pilot.phase).toBe('enter');
    pilot.next(view(1.2, cue(1.1)), 1 / 60); expect(pilot.phase).toBe('seek');
    pilot.next(view(1.3), 1 / 60); expect(pilot.phase).toBe('enter');
    pilot.next(view(1.4, cue(1.4, { frontId: 5, bodyInCavity: true })), 1 / 60);
    expect(pilot.phase).toBe('seek');
  });

  it('tracks net progress relative to the mouth, then requests an exit through its existing opening', () => {
    const pilot = new TubePilot();
    pilot.next(view(1, cue(1, { bodyInCavity: true })), 1 / 60);
    const moving = view(1.6, cue(1.6, { bodyInCavity: true, mouth: { x: 4, z: 2, floorY: 0, roofY: 1.5 } }));
    moving.board.x = 4; pilot.next(moving, 1 / 60); expect(pilot.phase).toBe('travel');
    const progressed = view(2.1, cue(2.1, { bodyInCavity: true }));
    progressed.board.x = 3.1; pilot.next(progressed, 1 / 60); expect(pilot.phase).toBe('exit');
    const outside = view(2.6); outside.board.x = 3.2;
    expect(pilot.next(outside, 1 / 60).crouch).toBeCloseTo(0.5);
    // Retired/lost geometry cannot be scored as an intentional exit.
    const lost = view(2.7); lost.ride.tubeApproach = undefined;
    pilot.next(lost, 1 / 60); expect(pilot.phase).toBe('seek');
    const reappeared = view(2.8, cue(2.8, { bodyInCavity: true }));
    reappeared.board.x = 10;
    expect(pilot.next(reappeared, 1 / 60).crouch).toBe(1);
    expect(pilot.phase).toBe('travel'); // Previous travel/exit intent was cleared when guidance disappeared.
  });

  it('requests opt-in geometry through the public autopilot and preserves its normal pop-up cue', () => {
    const pilot = new Autopilot({ style: 'tube', stall: false });
    pilot.go();
    const prone = view(1); prone.ride.phase = 'prone'; prone.ride.cue = true;
    expect(pilot.next(prone, 1 / 60)).toMatchObject({ tubeGuide: true, popUp: true });
    pilot.next(view(1.1), 1 / 60);
    const entered = pilot.next(view(1.2), 1 / 60);
    expect(entered).toMatchObject({ tubeGuide: true, crouch: 1, compress: 0 });
    expect(pilot.phase).toBe('enter');
    const before = pilot.rideTime;
    pilot.next(view(1.2), 1 / 60); expect(pilot.rideTime).toBe(before);
  });
});
