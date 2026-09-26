import { describe, expect, it } from 'vitest';
import { GRAVITY } from './dispersion';
import { LH82_AREA, PSI_RANGE, jetRelativeSpeed, overturn, overturnParameter, overturnSize } from './Overturn';

describe('the overturn of a plunging wave (Pick & Feddersen 2026)', () => {
  it('reproduces the published fits at the ends of their range', () => {
    const steep = overturn(0.0889);
    expect(steep.area).toBeCloseTo(0.43, 2);
    expect(steep.jetArea).toBeCloseTo(0.26, 2);
    expect(steep.aspect).toBeCloseTo(0.446, 3);
    expect((steep.tilt * 180) / Math.PI).toBeCloseTo(23, 0);
    const gentle = overturn(0.0156);
    expect(gentle.area).toBeCloseTo(0.04, 2);
    expect(gentle.aspect).toBeCloseTo(0.324, 3);
    expect((gentle.tilt * 180) / Math.PI).toBeCloseTo(50.5, 0);
  });

  it('draws bigger, rounder and flatter overturns on steeper slopes', () => {
    const gentle = overturn(overturnParameter(1 / 50, 0.3));
    const steep = overturn(overturnParameter(1 / 15, 0.3));
    expect(steep.area).toBeGreaterThan(gentle.area);
    expect(steep.jetArea).toBeGreaterThan(gentle.jetArea);
    expect(steep.aspect).toBeGreaterThan(gentle.aspect);
    expect(steep.tilt).toBeLessThan(gentle.tilt);
  });

  it('keeps to the fitted range rather than extrapolating', () => {
    expect(overturn(0.5)).toEqual(overturn(PSI_RANGE.max));
    expect(overturn(0)).toEqual(overturn(PSI_RANGE.min));
  });

  it("sizes the void on Longuet-Higgins's curve: area = LH82_AREA · width · length", () => {
    const shape = overturn(0.05);
    const { length, width } = overturnSize(shape, 2);
    expect(width / length).toBeCloseTo(shape.aspect, 12);
    expect(LH82_AREA * width * length).toBeCloseTo(shape.area * 4, 12);
  });

  it('launches a ballistic jet, in the crest frame, that lands at the far end of the void', () => {
    const shape = overturn(0.05);
    const height = 1.5;
    const { length } = overturnSize(shape, height);
    const speed = jetRelativeSpeed(shape, height);
    let x = 0;
    let y = 0;
    let vy = 0;
    const h = 1e-5;
    while (y > -length * Math.sin(shape.tilt)) {
      x += speed * h;
      vy -= GRAVITY * h;
      y += vy * h;
    }
    expect(x).toBeCloseTo(length * Math.cos(shape.tilt), 3);
  });

  it('implies jet speeds within the measured 1.15-1.73 times the crest speed', () => {
    // Depth-limited: H = 0.78 h, and the crest runs at √(g(h + H)).
    for (let psi = PSI_RANGE.min; psi <= PSI_RANGE.max; psi += 0.005) {
      const height = 1.5;
      const crest = Math.sqrt(GRAVITY * (height / 0.78 + height));
      const ratio = 1 + jetRelativeSpeed(overturn(psi), height) / crest;
      expect(ratio).toBeGreaterThan(1.15);
      expect(ratio).toBeLessThan(1.8);
    }
  });
});
