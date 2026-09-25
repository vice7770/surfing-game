import { describe, expect, it } from 'vitest';
import { exactWaveNumber, groupSpeed, shallowWaterWaveNumber } from './dispersion';
import { FarFieldProfile, type FarFieldOptions } from './FarFieldProfile';
import { SeaState } from './SeaState';

const reference = -330;
const tankDepth = 5;
const options: FarFieldOptions = {
  referenceZ: reference,
  shoreZ: 30,
  offshoreZ: -1500,
  shoreSamples: 181,
  offshoreSamples: 391,
  offshoreDepth: (z) => tankDepth + (60 - tankDepth) * Math.min(1, (reference - z) / 870),
  leftDepth: (z) => tankDepth - 0.02 * (z - reference),
  rightDepth: (z) => tankDepth - 0.02 * (z - reference),
};

describe('FarFieldProfile', () => {
  it("matches the tank's analytic sea on its offshore boundary on both sides", () => {
    const sea = SeaState.fromSpectrum(
      { significantHeight: 1.2, peakPeriod: 10, direction: 0.2, spreading: 12, componentCount: 16, depth: tankDepth }, 9, shallowWaterWaveNumber,
    );
    const profile = new FarFieldProfile(sea, options);
    for (const x of [-420, -35, 0, 64, 510]) {
      for (const t of [0, 7.3, 431.5]) {
        expect(profile.elevation(x, reference, t, 0)).toBeCloseTo(sea.elevation(x, reference, t), 4);
        expect(profile.elevation(x, reference, t, 1)).toBeCloseTo(sea.elevation(x, reference, t), 4);
      }
    }
  });

  it("shoals by Green's law beside the tank and caps the height at the breaker index", () => {
    const amplitude = 0.2;
    const sea = new SeaState([{ amplitude, omega: (2 * Math.PI) / 12, direction: 0, phase: 0 }], tankDepth, shallowWaterWaveNumber);
    const profile = new FarFieldProfile(sea, options);
    const zAtTwoMetres = reference + (tankDepth - 2) / 0.02;
    expect(profile.amplitudeAt(0, zAtTwoMetres, 0) / (amplitude * Math.pow(tankDepth / 2, 0.25))).toBeCloseTo(1, 2);
    const zAtFortyCentimetres = reference + (tankDepth - 0.4) / 0.02;
    expect(profile.amplitudeAt(0, zAtFortyCentimetres, 1)).toBeLessThanOrEqual((0.78 * 0.4 * Math.SQRT2) / 4 + 1e-6);
    expect(profile.depthAt(1, 29)).toBeLessThan(0);
    expect(profile.amplitudeAt(0, 29, 1)).toBe(0);
  });

  it('lengthens waves offshore with Airy dispersion while conserving energy flux', () => {
    const amplitude = 0.2;
    const omega = (2 * Math.PI) / 12;
    const sea = new SeaState([{ amplitude, omega, direction: 0, phase: 0.4 }], tankDepth, shallowWaterWaveNumber);
    const profile = new FarFieldProfile(sea, options);
    const z = -1400;
    const step = 1;
    // Phase integrates kz along +z (dΦ/dz = kz).
    const kz = (profile.phaseAt(0, z + step, 0) - profile.phaseAt(0, z - step, 0)) / (2 * step);
    expect(kz / exactWaveNumber(omega, 60)).toBeCloseTo(1, 2);
    const expected = amplitude * Math.sqrt(groupSpeed(exactWaveNumber, omega, tankDepth) / groupSpeed(exactWaveNumber, omega, 60));
    expect(profile.amplitudeAt(0, z, 0) / expected).toBeCloseTo(1, 3);
  });
});
