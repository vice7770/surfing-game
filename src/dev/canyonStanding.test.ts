import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PhysicalMode } from '../game/PhysicalMode';
import type { SurfZoneHost } from '../game/SurfZoneHost';
import type { RideInput } from '../physics/RideSession';
import { replayCanyonApproach } from '../wave/canyonStandingApproach';
import type { SurfZoneRunner } from '../wave/SurfZoneRunner';
import { runStandingTurn, type CanyonTurnReading } from './canyonStanding';

afterEach(() => vi.unstubAllGlobals());

describe('Canyon standing debug', () => {
  it('places only on the first step and hands over the first standing frame inside an input segment', () => {
    let ticks = 0;
    const advance = vi.fn(() => { ticks++; });
    const runner = { advance, get session() { return { phase: ticks < 3 ? 'prone' : 'standing' }; } } as unknown as SurfZoneRunner;
    const approachPlacement = { phase: 'prone' as const, x: 0, z: -10, heading: 0, speed: 0 };
    replayCanyonApproach(runner, { approachPlacement, approachInputs: [
      { steps: 1, paddle: true, sprint: false, popUp: false },
      { steps: 1, paddle: false, sprint: false, popUp: true },
      { steps: 4, paddle: false, sprint: false, popUp: false },
    ] });
    expect(advance.mock.calls).toEqual([
      [1, { paddle: true, sprint: false, popUp: false, steer: 0, retry: false, place: approachPlacement }],
      [1, { paddle: false, sprint: false, popUp: true, steer: 0, retry: false, place: undefined }],
      [1, { paddle: false, sprint: false, popUp: false, steer: 0, retry: false, place: undefined }],
    ]);
  });

  it.each(['left', 'right'] as const)('sends the complete %s input pulse, releases, and reports the actual last sample', async side => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queueMicrotask(() => cb(0)));
    const turn = side === 'left' ? 1 : -1;
    const wave = { speedOverGround: 5, directionX: 0, directionZ: 1, speedShoreward: 5, speedAlongCrest: 0 };
    const ride = { phase: 'standing', wave, bank: turn * Math.PI / 6, separation: undefined as string | undefined };
    const host = { outstandingSteps: 0, snapshot: { status: { ride } } } as SurfZoneHost;
    const requests: RideInput[] = [];
    const mode: Pick<PhysicalMode, 'host' | 'advance'> = { host, advance(steps, input) {
      expect(steps).toBe(1);
      requests.push(input!);
      // World heading crosses +/-180 degrees during a turn, while the wave gauge rotates independently.
      const course = (178 + turn * Math.min(54, Math.max(0, requests.length - 18)) * 0.6) * Math.PI / 180;
      const waveDirection = requests.length * 0.04;
      wave.directionX = Math.sin(waveDirection);
      wave.directionZ = Math.cos(waveDirection);
      wave.speedShoreward = 5 * Math.cos(course - waveDirection);
      wave.speedAlongCrest = 5 * Math.sin(course - waveDirection);
      if (side === 'right' && requests.length === 90) {
        ride.phase = 'fallen';
        ride.separation = 'balance';
      }
    } };
    let last: CanyonTurnReading | undefined;
    await runStandingTurn(mode, side, new AbortController().signal, reading => { last = reading; });
    expect(requests.filter(input => input.compress === 1)).toHaveLength(54);
    expect(requests.slice(18, 72).every(input => input.compress === 1 && input.steer === turn)).toBe(true);
    expect([...requests.slice(0, 18), ...requests.slice(72)].every(input => input.compress === 0 && input.steer === 0)).toBe(true);
    expect(last).toMatchObject({ elapsed: side === 'left' ? 3 : 1.5, phase: ride.phase, separation: ride.separation, input: 'Released' });
    expect(last!.peakBank).toBeCloseTo(turn * 30);
    expect(last!.peakCourseChange).toBeCloseTo(turn * 32.4);
    expect(last!.courseChangeAtRelease).toBeCloseTo(turn * 32.4);
  });
});
