import { describe, expect, it } from 'vitest';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import { ridePrompt } from './ridePrompt';

type Ride = NonNullable<SurfZoneStatus['ride']>;
const keys = { paddle: 'Space', popUp: 'Enter', retry: 'R' };
const ride = (phase: Ride['phase'], cue = false, extra: Partial<Ride> = {}): Ride => ({
  phase, cue, speed: 2, boardSpeed: 2, resets: 0, balance: 1, duck: 0, boardInReach: false, knock: 0,
  leash: { snapped: false, tension: 0, distance: 1, reeling: false }, ...extra,
  wave: {
    valid: false, directionX: 0, directionZ: 1, aheadOfCrest: 0, crestSpeed: 0, faceHeight: 0, faceFraction: 0, crestBreaking: 0,
    curlDistance: Infinity, curlSide: 0, speedOverGround: 2, speedShoreward: 0, speedAlongCrest: 0, requiredSpeed: Infinity,
  },
  popUp: { outcome: 'none', duration: 0, landingPeak: 0, frontShare: 0 } as Ride['popUp'],
});

describe('ridePrompt', () => {
  it('tells the paddler to paddle, then to pop up when the wave allows', () => {
    expect(ridePrompt(ride('prone'), keys)).toBe('Hold Space to paddle into a wave');
    expect(ridePrompt(ride('prone', true), keys)).toBe('Pop up now — Enter');
  });

  it('stays out of the way while getting up and riding', () => {
    expect(ridePrompt(ride('push'), keys)).toBe('Getting up…');
    expect(ridePrompt(ride('landing'), keys)).toBe('Getting up…');
    expect(ridePrompt(ride('standing'), keys)).toBe('');
    expect(ridePrompt(ride('recover'), keys)).toBe('');
    expect(ridePrompt(undefined, keys)).toBe('');
  });

  it('explains the way back after a fall: pull the leash, climb on in reach, or swim after a snapped one', () => {
    expect(ridePrompt(ride('fallen'), keys)).toBe('Wiped out — hold Enter to pull the leash and climb back on, or R to paddle out');
    expect(ridePrompt(ride('fallen', false, { boardInReach: true }), keys)).toBe('Press Enter to climb on');
    expect(ridePrompt(ride('fallen', false, { leash: { snapped: true, tension: 0, distance: 6, reeling: false } }), keys))
      .toBe('Leash snapped — swim to the board and press Enter, or R for a new one');
  });
});
