import { describe, expect, it } from 'vitest';
import { focusX, rayConcentration } from './Refraction';

const swell = { period: 10, direction: 0 };
/** A 1:50 plane beach, 1 m deep at z = 0. */
const plane = (_x: number, z: number) => 1 - z / 50;
/** The same beach cut by a 12 m-deep canyon on x = 0, running from 250 m out to 60 m out. */
const canyon = (x: number, z: number) => {
  const along = Math.min(1, Math.max(0, (-z - 60) / 100));
  return plane(x, z) + 12 * Math.exp(-((x / 30) ** 2)) * along;
};

describe('linear ray refraction', () => {
  it('keeps an oblique swell evenly spread over straight, parallel contours', () => {
    const xs = [-40, -20, 0, 20, 40];
    const gain = rayConcentration(plane, { period: 10, direction: (20 * Math.PI) / 180 }, -250, -80, xs, 10);
    for (const value of gain) expect(value).toBeCloseTo(1, 1);
  });

  it('starves a canyon axis and gathers the swell onto its flanks', () => {
    const [axis, ...flanks] = rayConcentration(canyon, swell, -250, -80, [0, -80, -60, -40, 40, 60, 80], 10);
    expect(axis).toBeLessThan(0.5);
    expect(Math.max(...flanks)).toBeGreaterThan(1.3);
  });

  it('finds the focus beside the canyon, not over it', () => {
    const x = focusX(canyon, swell, -250, -80, 0, 150);
    expect(x).toBeGreaterThan(30);
    expect(rayConcentration(canyon, swell, -250, -80, [x], 10)[0]).toBeGreaterThan(1.3);
  });
});
