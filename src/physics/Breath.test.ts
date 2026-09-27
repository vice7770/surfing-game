import { describe, expect, it } from 'vitest';
import { BREATH, Breath } from './Breath';

/** Seconds until the breath runs out held under at `effort` % of peak. */
function lasts(effort: number): number {
  const breath = new Breath();
  let t = 0;
  while (!breath.empty && t < 200) {
    breath.step(0.1, true, effort);
    t += 0.1;
  }
  return t;
}

describe('breath (Guimard et al. 2021)', () => {
  it('lasts about 65 s held under at rest', () => {
    expect(lasts(0)).toBeCloseTo(BREATH.rest, 0);
  });

  it('runs out sooner working hard: about 65·e^(−1.25) ≈ 19 s at half effort', () => {
    expect(lasts(50)).toBeCloseTo(BREATH.rest * Math.exp(-BREATH.effortFall * 50), 0);
    expect(lasts(50)).toBeLessThan(lasts(10));
  });

  it('refills at the surface in about 8 s, and never past full', () => {
    const breath = new Breath();
    for (let i = 0; i < 300; i += 1) breath.step(0.1, true, 10);
    expect(breath.level).toBeLessThan(0.7);
    for (let i = 0; i < 80; i += 1) breath.step(0.1, false, 10);
    expect(breath.level).toBe(1);
  });

  it('starts full again on a reset', () => {
    const breath = new Breath();
    for (let i = 0; i < 100; i += 1) breath.step(0.1, true, 50);
    breath.reset();
    expect(breath.level).toBe(1);
    expect(breath.empty).toBe(false);
  });
});
