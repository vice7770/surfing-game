import { describe, expect, it } from 'vitest';
import { THRUSTER } from '../../physics/finForces';
import { finOutline } from './finGeometry';

describe('fin outline', () => {
  it.each(THRUSTER.map((fin) => [fin.name, fin] as const))('draws the %s fin at the physics fin’s depth and area', (_, spec) => {
    const { points, area } = finOutline(spec);
    expect(Math.max(...points.map(([, down]) => down))).toBeCloseTo(spec.depth, 6);
    expect(Math.abs(area - spec.area) / spec.area).toBeLessThan(0.02);
  });

  it('rakes the fin back: its tip trails its base', () => {
    const { points } = finOutline(THRUSTER[2]);
    const tip = points.reduce((a, b) => (b[1] > a[1] ? b : a));
    const leading = points[0];
    expect(tip[0]).toBeLessThan(leading[0]);
  });
});
