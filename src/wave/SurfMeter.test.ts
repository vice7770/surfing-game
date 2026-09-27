import { describe, expect, it } from 'vitest';
import { MIN_SURF_WAVES, SurfMeter, highestMean } from './SurfMeter';

describe('highestMean', () => {
  it('averages the highest share of the values, at least one', () => {
    expect(highestMean([1, 2, 3, 4, 5, 6], 1 / 3)).toBeCloseTo(5.5, 12);
    expect(highestMean([1, 2, 3, 4, 5, 6], 1 / 10)).toBe(6);
    expect(highestMean([2], 1 / 3)).toBe(2);
    expect(highestMean([], 1 / 3)).toBeNaN();
  });
});

describe('SurfMeter', () => {
  const band = [{ xMin: -10, xMax: 10 }];

  it('reads one wave from the onsets within half a period of its first, keeping the largest face', () => {
    const meter = new SurfMeter(band, 12);
    meter.add({ time: 0, x: -5, z: -100, face: 1.5 });
    meter.add({ time: 3, x: 0, z: -104, face: 2.2 });
    meter.add({ time: 5.9, x: 5, z: -98, face: 1.8 });
    meter.add({ time: 6.1, x: 0, z: -101, face: 1.0 });
    const waves = meter.waves();
    expect(waves).toHaveLength(2);
    expect(waves[0]).toEqual({ time: 0, x: 0, z: -104, face: 2.2 });
    expect(waves[1].face).toBe(1.0);
  });

  it('ignores onsets outside its bands', () => {
    const meter = new SurfMeter(band, 12);
    meter.add({ time: 0, x: 30, z: -100, face: 3 });
    expect(meter.waves()).toHaveLength(0);
  });

  it('reads nothing until enough waves have broken, then H1/3 and H1/10 over the window', () => {
    const meter = new SurfMeter(band, 10);
    const faces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    faces.forEach((face, i) => {
      if (i === MIN_SURF_WAVES - 1) expect(meter.reading(i * 10)).toBeUndefined();
      meter.add({ time: i * 10, x: 0, z: -100, face });
    });
    const reading = meter.reading(95)!;
    expect(reading.waves).toBe(10);
    expect(reading.typical).toBeCloseTo((10 + 9 + 8 + 7) / 4, 12);
    expect(reading.sets).toBe(10);
    // A 30 s window holds the last waves only (times 70, 80, 90).
    expect(meter.reading(95, 30)!.waves).toBe(3);
  });

  it('starts afresh when its clock goes back (a restored sea), and when cleared', () => {
    const meter = new SurfMeter(band, 12);
    for (const time of [60, 72, 84, 96]) meter.add({ time, x: 0, z: -100, face: 2 });
    meter.add({ time: 25, x: 0, z: -100, face: 1 });
    expect(meter.waves().map((wave) => wave.time)).toEqual([25]);
    meter.clear();
    expect(meter.waves()).toHaveLength(0);
    expect(meter.reading(30)).toBeUndefined();
  });

  it('forgets waves older than it keeps', () => {
    const meter = new SurfMeter(band, 10, 60);
    for (let i = 0; i < 20; i += 1) meter.add({ time: i * 10, x: 0, z: -100, face: 1 });
    expect(meter.waves().length).toBeLessThanOrEqual(7);
  });
});
