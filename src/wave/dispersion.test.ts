import { describe, expect, it } from 'vitest';
import { GRAVITY, depthClass, exactWaveNumber, waveKinematics, waveNumber } from './dispersion';

describe('linear dispersion', () => {
  it('solves ω² = g k tanh(kh) exactly', () => {
    for (const period of [3, 8, 18]) {
      for (const depth of [0.4, 4, 40, 400]) {
        const omega = (2 * Math.PI) / period;
        const k = exactWaveNumber(omega, depth);
        expect(GRAVITY * k * Math.tanh(k * depth) / (omega * omega)).toBeCloseTo(1, 12);
      }
    }
  });

  it('keeps the explicit Guo wavenumber within 0.8 % of the exact root', () => {
    let worst = 0;
    for (let period = 2; period <= 25; period += 0.5) {
      for (const depth of [0.2, 0.5, 1, 2, 4, 8, 15, 30, 60, 200, 1000]) {
        const omega = (2 * Math.PI) / period;
        worst = Math.max(worst, Math.abs(waveNumber(omega, depth) / exactWaveNumber(omega, depth) - 1));
      }
    }
    expect(worst).toBeLessThan(0.008);
  });

  it('reduces to the deep- and shallow-water limits', () => {
    const deep = waveKinematics(8, Infinity);
    expect(deep.wavelength).toBeCloseTo((GRAVITY * 64) / (2 * Math.PI), 9);
    expect(deep.groupSpeed / deep.phaseSpeed).toBeCloseTo(0.5, 9);
    const shallow = waveKinematics(18, 0.5);
    expect(shallow.phaseSpeed / Math.sqrt(GRAVITY * 0.5)).toBeCloseTo(1, 2);
    expect(shallow.groupSpeed / shallow.phaseSpeed).toBeGreaterThan(0.99);
  });

  it('reproduces the plan reference values for an 8 s swell in 4 m of water', () => {
    const swell = waveKinematics(8, 4);
    expect(swell.wavelength).toBeCloseTo(48.0, 1);
    expect(swell.phaseSpeed).toBeCloseTo(6.0, 2);
    expect(swell.groupSpeed).toBeCloseTo(5.52, 2);
    expect(swell.kh).toBeCloseTo(0.52, 2);
  });

  it('classifies depth against half and one twentieth of a wavelength', () => {
    expect(depthClass(30, 50)).toBe('deep');
    expect(depthClass(4, 48)).toBe('transitional');
    expect(depthClass(1, 37.6)).toBe('shallow');
  });
});
