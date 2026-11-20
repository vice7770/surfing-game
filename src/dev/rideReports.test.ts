import { describe, expect, it } from 'vitest';
import { DEFAULT_PHYSICAL_SETTINGS, surfZoneConfigFor, type PhysicalSettings } from '../game/PhysicalMode';
import { LocalSurfZone } from '../game/SurfZoneHost';
import type { RideRequest } from '../wave/SurfZoneRunner';
import type { AutopilotInput } from './Autopilot';
import { advance, type SteppedHooks } from './devStepping';
import { rideReportsWanted } from './rideReports';

/**
 * The switch only. **A passing test here is not evidence the switch reached a session**: three switches in this
 * project parsed zero times in a real page while their fixture tests passed. The run itself is verified by driving
 * the page and reading `globalThis.breaklineRideReports`, which is what the branch's report cites.
 */
describe('rideReportsWanted', () => {
  it('is off unless the flag is present', () => {
    expect(rideReportsWanted('')).toBeUndefined();
    expect(rideReportsWanted('?record&spot=canyon')).toBeUndefined();
  });

  it('takes the count asked for', () => {
    expect(rideReportsWanted('?rideReports=5')).toBe(5);
    expect(rideReportsWanted('?spot=canyon&rideReports=30&canyonWaves=true')).toBe(30);
  });

  it('falls back to 20 on a bare flag or a value that is not a count', () => {
    expect(rideReportsWanted('?rideReports')).toBe(20);
    expect(rideReportsWanted('?rideReports=')).toBe(20);
    expect(rideReportsWanted('?rideReports=0')).toBe(20);
    expect(rideReportsWanted('?rideReports=-3')).toBe(20);
    expect(rideReportsWanted('?rideReports=2.5')).toBe(20);
    expect(rideReportsWanted('?rideReports=lots')).toBe(20);
  });
});

/**
 * **The rider's whole input has to reach the physics, and this is the guard that actually holds.**
 *
 * This tool's first run forwarded `{ paddle: input.paddle, popUp: input.popUp, steer: input.steer }` — type-correct,
 * and it threw away `trim`, `crouch`, `compress`, `rotate` and `tubeGuide`. The autopilot's bottom turn asks for
 * `crouch` and `compress` at the base of the turn and its cutback adds `rotate` (`Autopilot.next`), so a whole
 * population of rides was measured on a rider that was steered and never crouched.
 *
 * `rideReports.ts` also carries a compile-time key-coverage check, but **that check is not the guard**: it only
 * proves the forwarded *type* declares every field, and a future caller hand-writing a three-field literal would
 * satisfy it exactly as the original line did. So these tests assert the **behaviour**, with a non-default value in
 * every field that was dropped, read back off the session the host actually built. They catch a regression however
 * the call is written, and they need no ride.
 */
describe("the autopilot's whole input reaches the physics", () => {
  /** Non-default in every field the first run dropped, plus the stick, so nothing can silently read as "unset". */
  const LOADED: AutopilotInput = {
    paddle: false, popUp: false, steer: 0.8, trim: -0.6, crouch: 0.55, compress: 1, rotate: -0.4, tubeGuide: true,
  };

  function standingHost(): LocalSurfZone {
    const settings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point', source: 'practice', compute: 'cpu' };
    const host = new LocalSurfZone(surfZoneConfigFor(settings, 1, false), { rider: true });
    const { focus } = host.init;
    // Placed standing: this check is about the input reaching the rider, not about a ride the analyzer would read
    // (a placed rider is never analyzed at all — `RideAnalyzer.push` starts a ride only on a stand).
    host.advance(1, {
      paddle: false, popUp: false, steer: 0, retry: false,
      place: { x: focus.x, z: focus.z + 2, heading: Math.PI / 2, speed: 6, phase: 'standing', followSurface: true },
    });
    return host;
  }

  /** The hook shape `main.ts` hands the dev tools, so the real `advance` is the thing under test. */
  function hooksFor(host: LocalSurfZone): SteppedHooks {
    return {
      step: (input: Omit<RideRequest, 'retry'>) => host.advance(1, { ...input, retry: false }),
      mode: { host } as unknown as SteppedHooks['mode'],
    };
  }

  it('hands every field to the rider, not just the stick', async () => {
    const host = standingHost();
    await advance(hooksFor(host), 1, LOADED);
    const { rider } = host.runner.session!;
    expect(rider.phase).toBe('standing');
    // Read back off the rider the host built, field by field: the stick arriving alone is the bug.
    expect(rider.steer).toBeCloseTo(LOADED.steer, 6);
    expect(rider.trim).toBeCloseTo(LOADED.trim!, 6);
    expect(rider.crouch).toBeCloseTo(LOADED.crouch!, 6);
    expect(rider.compress).toBeCloseTo(LOADED.compress!, 6);
    expect(rider.rotate).toBeCloseTo(LOADED.rotate!, 6);
  });

  it('rides differently for the crouch and Compress than for the stick alone', () => {
    // The behavioural half: were the dropped fields reaching nothing, these two rides would be identical.
    const board = (extra: Partial<RideRequest>) => {
      const host = standingHost();
      for (let step = 0; step < 60; step += 1) {
        host.advance(1, { paddle: false, popUp: false, steer: 0.8, retry: false, ...extra });
      }
      const hull = host.runner.session!.board;
      return { x: hull.centerOfMass.x, z: hull.centerOfMass.z, vx: hull.velocity.x, vz: hull.velocity.z };
    };
    const steerOnly = board({});
    const whole = board({ trim: -0.6, crouch: 0.55, compress: 1 });
    const apart = Math.abs(steerOnly.x - whole.x) + Math.abs(steerOnly.z - whole.z)
      + Math.abs(steerOnly.vx - whole.vx) + Math.abs(steerOnly.vz - whole.vz);
    expect(apart).toBeGreaterThan(1e-6);
  });
});
