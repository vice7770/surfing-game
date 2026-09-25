import { describe, expect, it } from 'vitest';
import { describeSwell, formatSwellReadout } from './SwellReadout';

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
});

describe('formatSwellReadout', () => {
  it('labels the theory and shows the legacy simulation speed beside it', () => {
    const rows = formatSwellReadout(describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0 }), { depth: 4, simSpeed: 3 });
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('WAVE SPEED · AIRY')).toBe('6.0 m/s');
    expect(value('WAVE SPEED · SIM')).toBe('3.0 m/s');
    expect(value('WAVELENGTH AT 4.0 M')).toBe('48.0 m');
    expect(value('BREAKS IN DEPTH')).toBe('1.79 m');
    expect(value('IRIBARREN ξ')).toBe('FLAT BED');
  });
});
