import { describe, expect, it } from 'vitest';
import { formatHeight } from '../../ui/units';
import { waveInfo } from './waveInfo';

const base = { face: 1.46, period: 12, breaker: 'plunging' as const, breakingFraction: 0.18, timeToSet: 42.4, steady: false };

describe('wave info', () => {
  it('leads with the measured surf, in the player\'s words (wave sizes)', () => {
    const info = waveInfo({ ...base, surf: { typical: 2.4, sets: 3.1, waves: 12 } }, 'metric', { scale: 'face', surferHeight: 1.75 });
    expect(info.rows[0]).toEqual({ label: 'Surf', value: '2.4–3.1 m · overhead' });
    expect(waveInfo({ ...base, surf: undefined }, 'imperial').rows[0].value).toBe('measuring…');
  });

  it('sums up a peeling wave in surfers’ words', () => {
    const info = waveInfo({ ...base, peel: { angleDegrees: 52, direction: 1, peelSpeed: 6, columns: 40, fit: 0.9, lineSlope: 0 } }, 'metric');
    expect(info.summary).toBe('Plunging · a left at 52° · good for surfing');
    expect(info.rows.map((row) => row.value)).toEqual(['measuring…', '1.5 m', '12 s', 'Plunging', 'a left at 52°', '18 %', 'in 42 s']);
  });

  it('calls a right a right, and a close-out a close-out', () => {
    expect(waveInfo({ ...base, peel: { angleDegrees: 40, direction: -1, peelSpeed: 6, columns: 40, fit: 0.9, lineSlope: 0 } }, 'metric').summary).toContain('a right at 40°');
    expect(waveInfo({ ...base, peel: { angleDegrees: 8, direction: 1, peelSpeed: 30, columns: 40, fit: 0.9, lineSlope: 0 } }, 'metric').summary).toContain('closes out');
  });

  // canyon-beach-break (2026-10-23): a beach peak's two arms read as one peak, the owner's "spilling peak, left and right".
  it('calls a peak peeling both ways a peak, left and right, with its breaker', () => {
    const peel = { angleDegrees: 47, direction: -1, peelSpeed: 6.5, columns: 40, fit: 0.9, lineSlope: 0, peak: { left: 52, right: 47 } };
    const info = waveInfo({ ...base, breaker: 'spilling', peel }, 'metric');
    expect(info.summary).toBe('Spilling peak, left 52° and right 47° · good for surfing');
    expect(info.rows.find((row) => row.label === 'Peel')!.value).toBe('peak, left 52° and right 47°');
  });

  // canyon-b (2026-11-01): the Canyon's up-coast peak runs into its reef bowl, "spilling peak into a plunging reef bowl".
  it('names the reef bowl a peak runs into, with the bowl\'s breaker', () => {
    const peel = { angleDegrees: 35, direction: 1, peelSpeed: 8, columns: 40, fit: 0.9, lineSlope: 0, peak: { left: 35, right: 52 }, bowl: 'plunging' as const };
    const info = waveInfo({ ...base, breaker: 'spilling', peel }, 'metric');
    expect(info.summary).toBe('Spilling peak into a plunging reef bowl, left 35° and right 52° · fast, for good surfers');
    expect(info.rows.find((row) => row.label === 'Peel')!.value).toBe('peak into a plunging reef bowl, left 35° and right 52°');
  });

  it('says so when there is no face, no break yet, or a steady swell', () => {
    const info = waveInfo({ ...base, face: undefined, breaker: 'none', steady: true }, 'imperial');
    expect(info.rows[1].value).toBe('Flat here');
    expect(info.summary).toBe('Not breaking · Waiting for a break');
    expect(info.rows.at(-1)!.value).toBe('steady swell');
  });

  it('shows heights in feet for imperial units', () => {
    expect(formatHeight(1.46, 'imperial')).toBe('4.8 ft');
  });
});
