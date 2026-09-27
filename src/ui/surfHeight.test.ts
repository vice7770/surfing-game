import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFER_HEIGHT, describeSurf, formatSurfRange, surfName } from './surfHeight';

describe('surf in surfers\' words', () => {
  it('names the typical face by the surfer\'s height', () => {
    expect(surfName(0.3)).toBe('ankle high');
    expect(surfName(0.5)).toBe('knee high');
    expect(surfName(1.0)).toBe('waist high');
    expect(surfName(1.75)).toBe('head high');
    expect(surfName(2.4)).toBe('overhead');
    expect(surfName(3.6)).toBe('double overhead');
    expect(surfName(5.5)).toBe('triple overhead');
    expect(surfName(7)).toBe('bigger than triple overhead');
    // A shorter surfer finds the same wave bigger.
    expect(surfName(1.9, 1.65)).toBe('overhead');
    expect(surfName(1.9, DEFAULT_SURFER_HEIGHT)).toBe('head high');
  });

  it('gives the range in metres, feet, or the Hawaiian scale (half the face in feet)', () => {
    expect(formatSurfRange(2.14, 2.71, 'metric', 'face')).toBe('2.1–2.7 m');
    expect(formatSurfRange(2.14, 2.71, 'imperial', 'face')).toBe('7–9 ft');
    expect(formatSurfRange(3.05, 3.9, 'metric', 'hawaiian')).toBe('5–6 ft Hawaiian');
  });

  it('never reads small surf as negative, NaN or backwards', () => {
    expect(formatSurfRange(0.1, 0.3, 'imperial', 'hawaiian')).toBe('0–0 ft Hawaiian');
    expect(formatSurfRange(0.3, 0.3, 'imperial', 'face')).toBe('1–1 ft');
    expect(formatSurfRange(0.04, 0.3, 'metric', 'face')).toBe('0.0–0.3 m');
    expect(formatSurfRange(0.5, 0.4, 'metric', 'face')).toBe('0.4–0.5 m');
  });

  it('describes a reading in one line, or says it is still measuring', () => {
    const words = { units: 'metric' as const, scale: 'face' as const, surferHeight: 1.75 };
    expect(describeSurf({ typical: 2.4, sets: 3.1 }, words)).toBe('2.4–3.1 m · overhead');
    expect(describeSurf(undefined, words)).toBe('measuring…');
  });
});
