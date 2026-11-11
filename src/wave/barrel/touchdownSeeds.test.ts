import { describe, expect, it } from 'vitest';
import { AFTER_TUBE, TouchdownSeeds, type SeedPoint } from './touchdownSeeds';

const point = (over: Partial<SeedPoint>): SeedPoint => ({ front: 1, column: 3, z: -150, tau: 0, footHeight: 1, footDepth: 2, ...over });

describe('TouchdownSeeds (after-tube, ruling 11)', () => {
  const TOUCHDOWN = 1;
  const seeds = () => new TouchdownSeeds(8, () => TOUCHDOWN);

  it('seeds a column from the lead before its slice\'s touchdown, never under an open tube before that', () => {
    const s = seeds();
    expect(s.read([point({ tau: TOUCHDOWN - AFTER_TUBE.lead - 0.01 })]).waves).toHaveLength(0);
    s.read([point({ tau: TOUCHDOWN - AFTER_TUBE.lead + 0.01, z: -151 })]);
    expect(s.waves).toEqual([{ id: 1 }]);
    expect(s.crestAt(0, 3)).toBe(-151);
    expect(s.crestAt(0, 2)).toBeNaN();
  });

  it('keeps seeding a crashed point on its own crest place, whatever its clock reads', () => {
    const s = seeds().read([point({ tau: 0, crashedAt: 12, z: -140 })]);
    expect(s.crestAt(0, 3)).toBe(-140);
  });

  it('seeds nothing from a point whose jet went back to its crest, from one off the grid, or from one with no place', () => {
    const s = seeds().read([
      point({ crashedAt: 1, jetReturned: true }), point({ crashedAt: 1, column: 8 }), point({ crashedAt: 1, column: -1 }),
      point({ crashedAt: 1, z: Number.NaN }),
    ]);
    expect(s.waves).toHaveLength(0);
    expect(s.crestAt(0, 3)).toBeNaN();
  });

  it('makes a wave of each front, and keeps nothing between reads', () => {
    const s = seeds();
    s.read([point({ front: 4, column: 1, crashedAt: 1, z: -1 }), point({ front: 9, column: 1, crashedAt: 1, z: -2 }), point({ front: 4, column: 2, crashedAt: 1, z: -3 })]);
    expect(s.waves).toEqual([{ id: 4 }, { id: 9 }]);
    expect([s.crestAt(0, 1), s.crestAt(0, 2), s.crestAt(1, 1), s.crestAt(1, 2)]).toEqual([-1, -3, -2, Number.NaN]);
    s.read([point({ front: 9, column: 5, crashedAt: 1, z: -7 })]);
    expect(s.waves).toEqual([{ id: 9 }]);
    expect(s.crestAt(0, 1)).toBeNaN();
    expect(s.crestAt(0, 5)).toBe(-7);
    expect(s.crestAt(1, 5)).toBeNaN();
  });
});
