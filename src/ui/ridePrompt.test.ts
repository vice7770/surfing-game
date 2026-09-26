import { describe, expect, it } from 'vitest';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import { ridePrompt } from './ridePrompt';

type Ride = NonNullable<SurfZoneStatus['ride']>;
const keys = { paddle: 'Space', popUp: 'Enter', retry: 'R' };
const ride = (phase: Ride['phase'], cue = false): Ride => ({
  phase, cue, speed: 2, resets: 0, balance: 1,
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

  it('explains the way back after a fall', () => {
    expect(ridePrompt(ride('fallen'), keys)).toBe('Wiped out — swim back and press Enter by the board, or R to paddle out');
  });
});
