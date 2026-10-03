import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { blendOverturn, overturnAt } from './heldOverturn';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { heldFrame } from './ProfileLibrary';
import { tubeCase } from './toyCase';

describe('a frame’s jet and void, as metrics.py measures them (the crash’s water and air, Part B, PR 5)', () => {
  it('measures the toy tube’s jet and void', () => {
    // From τ = 0 the toy's top runs (0, 0.8) → tip (1.2, 0.5), its underside back to the throat (0.6, 0.6), the face down
    // to the toe (0.8, 0) and on flat to (2, 0). The jet: the top's crossing of the throat's x, (0.6, 0.65), to the tip and
    // back to the throat. The void: the tip, under the jet to the throat, down the face and along the flat to its point
    // nearest the tip, (1.2, 0) straight below it, closed.
    const o = overturnAt(tubeCase(0.3).frames, 4);
    expect(o.jetArea).toBeCloseTo((0.6 * 0.05) / 2, 6);
    expect(o.voidArea).toBeCloseTo(0.27, 6);
    // Its long axis: the polygon's diameter, from the throat (0.6, 0.6) to the flat's (1.2, 0), forward and down.
    expect(o.voidLength).toBeCloseTo(Math.sqrt(0.36 + 0.36), 6);
    expect(o.axisX).toBeCloseTo(Math.SQRT1_2, 6);
    expect(o.axisY).toBeCloseTo(-Math.SQRT1_2, 6);
  });

  it('finds no jet and no void where the face has not overturned', () => {
    expect(overturnAt(tubeCase(0.3).frames, 0)).toEqual({ jetArea: 0, voidArea: 0, voidLength: 0, axisX: 1, axisY: 0 });
  });

  it('reads the shipped cases’ held frames within 12 % of their metrics frames (barrel-cases.md)', () => {
    // A_J and A_O at each run's metrics frame (the jet 3 cells off the face), in h0²: the solitary cases' from the
    // generated table's ratios over H_I², the periodic Padang Padang case's from its metrics file (metres at h0 = 7 m),
    // and the Reef's and the Point's periodic cases (PR 7) from the same table's ratios.
    const metrics: Record<string, { jet: number; air: number }> = {
      'pad19-a20-l12': { jet: 0.109 * 0.281 * 0.281, air: 0.052 * 0.281 * 0.281 },
      'pad19-a30-l12': { jet: 0.212 * 0.368 * 0.368, air: 0.191 * 0.368 * 0.368 },
      'pad19-a45-l12': { jet: 0.176 * 0.524 * 0.524, air: 0.23 * 0.524 * 0.524 },
      'periodic-padang19s-l12': { jet: 0.3857675 / 49, air: 0.1753303 / 49 },
      'periodic-reef42-l12': { jet: 0.526 * 0.297 * 0.297, air: 0.247 * 0.297 * 0.297 },
      'periodic-point21-a15-l12': { jet: 0.068 * 0.355 * 0.355, air: 0.043 * 0.355 * 0.355 },
      'periodic-point21-a23-l12': { jet: 0.043 * 0.476 * 0.476, air: 0.034 * 0.476 * 0.476 },
      'periodic-point21-a30-l12': { jet: 0.15 * 0.479 * 0.479, air: 0.145 * 0.479 * 0.479 },
    };
    for (const bytes of readBarrelCases()) {
      const c = decodeCase(bytes);
      const o = overturnAt(c.frames, Math.round((heldFrame(c).tau - c.tauStart) / c.tauStep));
      expect(o.jetArea / metrics[c.id].jet, c.id).toBeGreaterThan(0.88);
      expect(o.jetArea / metrics[c.id].jet, c.id).toBeLessThan(1.12);
      expect(o.voidArea / metrics[c.id].air, c.id).toBeGreaterThan(0.88);
      expect(o.voidArea / metrics[c.id].air, c.id).toBeLessThan(1.13);
    }
  });

  it('blends two overturns by weight, the axis kept a unit vector', () => {
    const a = { jetArea: 1, voidArea: 2, voidLength: 3, axisX: 1, axisY: 0 };
    const b = { jetArea: 3, voidArea: 4, voidLength: 5, axisX: 0, axisY: -1 };
    expect(blendOverturn(a, b, 0)).toEqual(a);
    expect(blendOverturn(a, b, 1)).toEqual(b);
    const half = blendOverturn(a, b, 0.5);
    expect(half.jetArea).toBe(2);
    expect(half.voidLength).toBe(4);
    expect(half.axisX).toBeCloseTo(Math.SQRT1_2, 12);
    expect(half.axisY).toBeCloseTo(-Math.SQRT1_2, 12);
  });

  it('uses only + − × ÷ and √ (online determinism)', () => {
    expect(readFileSync('src/wave/barrel/heldOverturn.ts', 'utf8')).not.toMatch(/Math\.(sin|cos|tan|exp|log|pow|hypot|atan|cbrt)/);
  });
});
