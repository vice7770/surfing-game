import { describe, expect, it } from 'vitest';
import { describeSwell } from './SwellReadout';

describe('describeSwell', () => {
  it('reports Airy values and the depth-limited break for a 1.4 m, 8 s wave', () => {
    const readout = describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0.05 });
    expect(readout.deepWavelength).toBeCloseTo(99.9, 1);
    expect(readout.wavelength).toBeCloseTo(48.0, 1);
    expect(readout.phaseSpeed).toBeCloseTo(6.0, 2);
    expect(readout.groupSpeed).toBeCloseTo(5.52, 2);
    expect(readout.depthClass).toBe('transitional');
    expect(readout.breakerDepth).toBeCloseTo(1.28 * 1.4, 2);
    expect(readout.breakerSpeed).toBeCloseTo(4.2, 1);
    expect(readout.iribarren).toBeCloseTo(0.42, 2);
    expect(readout.breakerType).toBe('plunging');
  });

  it('classifies spilling, surging, and flat-bed conditions by the Iribarren number', () => {
    expect(describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0.02 }).breakerType).toBe('spilling');
    expect(describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0.3 }).breakerType).toBe('surging');
    const flat = describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0 });
    expect(flat.breakerType).toBe('none');
    expect(flat.iribarren).toBe(0);
  });

  it('reads a steep break over a submerged crest as plunging, not surging', () => {
    expect(describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0.3, submergedCrest: true }).breakerType).toBe('plunging');
    expect(describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0.02, submergedCrest: true }).breakerType).toBe('spilling');
  });
});
