import { describe, expect, it } from 'vitest';
import { BreakingFront } from './BreakingFront';
import type { CrestSample } from './crestOnset';
import { tubeFaceOf } from './faceAnchor';
import { throwContourDistance, type OnsetTiming } from './sliceClock';

/**
 * Ruling 7's step 1 (`FrontOptions.crestLine`, `TubeFace.crestLine`, `?crestLine=sub` or `top`; the water-physics advisor's
 * ruling 7, docs/research/surface-rise-2026-11-11/ruling-7; notes in docs/research/crest-line-2026-11-11/README.md):
 * before its throw a front point stands where its crest stands within its cell, so the crest line doesn't hop rows.
 */
describe('the crest line (ruling 7, step 1)', () => {
  // A plane face 1:10 along +z from the 4.4 m foot (z 0); the throw contour at 2 m (z 24). Rows 1 m apart, centred on z = k.
  const still = (_x: number, z: number) => 4.4 - z / 10;
  const timing: OnsetTiming = { h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7 };
  const distance = (x: number, z: number, dx: number, dz: number, depth: number) => throwContourDistance(still, x, z, dx, dz, depth);
  /** A crest at `crest`, read as the solver reads it: its cell's centre and its place within the cell. */
  const sample = (crest: number): CrestSample => {
    const centre = Math.round(crest);
    return { column: 0, row: centre, x: 0, z: centre, sub: crest - centre, eta: 0.8, wave: 1.2, strength: 0, rise: 0, depth: still(0, crest), b: Number.NaN, speed: 4, dirX: 0, dirZ: 1 };
  };
  /** The point's z each step after it joins, the crest running 0.3 m a step. */
  const run = (options: { crestLine?: 'sub' | 'top'; subCrest?: boolean }, read: (crest: number) => CrestSample = sample) => {
    const front = new BreakingFront(1, timing, { distance, ...options });
    const places: { crest: number; z: number; sub: number | undefined }[] = [];
    let time = 0;
    for (let crest = 0.55; crest < 22; crest += 0.3) {
      time += 0.075;
      front.update([read(crest)], 1, time);
      if (front.points.length) places.push({ crest, z: front.points[0].z, sub: front.points[0].crestSub });
    }
    return places;
  };

  it('stands a point at its crest\'s place within its cell before its throw, so it moves as the crest does', () => {
    const line = run({ crestLine: 'sub' });
    expect(line.length).toBeGreaterThan(5);
    for (const p of line) expect(p.z).toBeCloseTo(p.crest, 9);
    for (let k = 1; k < line.length; k += 1) expect(line[k].z - line[k - 1].z).toBeCloseTo(0.3, 9);
    // Without it: on the cell's centre, a step of 0 or a whole row.
    const cells = run({});
    expect(cells.length).toBeGreaterThan(5);
    const steps = cells.slice(1).map((p, k) => p.z - cells[k].z);
    for (const p of cells) expect(p.z).toBe(Math.round(p.crest));
    expect(steps.some((s) => s === 0)).toBe(true);
    expect(steps.some((s) => s === 1)).toBe(true);
  });

  it('joins by the crest\'s own place, and leaves the C1 clock no second offset (crestSub 0)', () => {
    // |τ_e| C_p = 6.8 m short of the contour (z 24): the crest's place past 17.2, not its cell's centre.
    const line = run({ crestLine: 'sub' });
    expect(line[0].crest).toBeGreaterThanOrEqual(17.2);
    expect(line[0].crest).toBeLessThan(17.2 + 0.3);
    expect(line[0].sub).toBeUndefined();
    const both = run({ crestLine: 'sub', subCrest: true });
    expect(both[0].crest).toBe(line[0].crest);
    for (const p of both) {
      expect(p.sub).toBe(0);
      expect(p.z).toBeCloseTo(p.crest, 9);
    }
    // The C1 clock's sub-cell crest alone: the point on its cell's centre, the place carried beside it.
    const sub = run({ subCrest: true });
    for (const p of sub) expect(p.z + p.sub!).toBeCloseTo(p.crest, 9);
  });

  it('reads the crest\'s place by its top\'s centre under \'top\', and by the parabola under \'sub\'', () => {
    // A crest whose top's centre stands 0.2 m behind its parabola's top (a flat-backed crest).
    const skewed = (crest: number): CrestSample => ({ ...sample(crest), top: crest - 0.2 - Math.round(crest) });
    const top = run({ crestLine: 'top' }, skewed);
    expect(top.length).toBeGreaterThan(5);
    for (const p of top) expect(p.z).toBeCloseTo(p.crest - 0.2, 9);
    for (const p of run({ crestLine: 'sub' }, skewed)) expect(p.z).toBeCloseTo(p.crest, 9);
    // A sample without the top's centre (made elsewhere): the parabola's.
    for (const p of run({ crestLine: 'top' })) expect(p.z).toBeCloseTo(p.crest, 9);
  });

  it('is opt-in, with formation by distance alone', () => {
    expect(tubeFaceOf(true, {})).not.toHaveProperty('crestLine');
    expect(tubeFaceOf(true, { crestLine: 'sub' })).toMatchObject({ crestLine: 'sub', distance: true });
    expect(tubeFaceOf(true, { crestLine: 'top' })).toMatchObject({ crestLine: 'top', distance: true });
    expect(tubeFaceOf(true, { crestLine: 'sub', tubeForm: 'old' })).not.toHaveProperty('crestLine');
    expect(tubeFaceOf(true, { crestLine: 'sub', tubeFrom: 'piece' })).not.toHaveProperty('crestLine');
    expect(tubeFaceOf(false, { crestLine: 'sub' })).toBeUndefined();
  });
});
