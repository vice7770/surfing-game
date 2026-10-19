import { describe, expect, it } from 'vitest';
import { DRAWN_EDGES, edgeNoise, frayBand, frayRow, frayToes } from './drawnEdges';
import { SPILLING_FRONT_DEFAULTS, SpillingFront, type SpillingGrid } from './SpillingFront';
import { SPILLING_FRONT } from './SurfZoneSimulation';

/** A 1 m grid, 81 columns (x −40…40) by 41 rows (z −20…20; +z toward the beach). */
function grid(): SpillingGrid {
  const nx = 81;
  const nz = 41;
  return {
    nx, nz,
    xCenters: Float64Array.from({ length: nx }, (_, i) => i - 40),
    zCenters: Float64Array.from({ length: nz }, (_, i) => i - 20),
  };
}

describe('the drawn whitewater\'s edges (the foam look, item 4a)', () => {
  it('is a smooth noise in [0, 1], the same for the same arguments', () => {
    let low = 1;
    let high = 0;
    let jump = 0;
    for (let a = -20; a < 20; a += 0.013) {
      const n = edgeNoise(a, 3.7, 5);
      low = Math.min(low, n);
      high = Math.max(high, n);
      jump = Math.max(jump, Math.abs(edgeNoise(a + 0.013, 3.7, 5) - n));
      expect(edgeNoise(a, 3.7, 5)).toBe(n);
    }
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
    expect(high - low).toBeGreaterThan(0.6);
    expect(jump).toBeLessThan(0.04);
  });

  it('frays a row\'s run at its ends by up to endCut m and leaves its middle, however short the run', () => {
    const g = grid();
    const ends = new Set<number>();
    for (let z = -20; z <= 20; z += 1) {
      const row = new Float64Array(g.nx);
      for (let ix = 10; ix <= 70; ix += 1) row[ix] = 1;
      frayRow(row, 0, g.nx, g.xCenters, 1, z, 12.3);
      // Nothing outside the run; the middle as it was.
      for (let ix = 0; ix < 10; ix += 1) expect(row[ix]).toBe(0);
      expect(row[40]).toBe(1);
      let first = 10;
      while (row[first] < 0.5) first += 1;
      expect(first - 10).toBeLessThanOrEqual(DRAWN_EDGES.endCut + DRAWN_EDGES.endFade);
      ends.add(first);
    }
    // The end frays: it lies at different places from row to row.
    expect(ends.size).toBeGreaterThan(3);
    // A short run gives up at most its share at either end: something of it is left.
    const short = new Float64Array(g.nx);
    for (let ix = 30; ix < 36; ix += 1) short[ix] = 1;
    frayRow(short, 0, g.nx, g.xCenters, 1, 4, 1);
    expect(Math.max(...short)).toBe(1);
  });

  it('counts runs through the breaking\'s small gaps as one', () => {
    const g = grid();
    const row = new Float64Array(g.nx);
    for (let ix = 10; ix <= 70; ix += 1) row[ix] = ix === 40 || ix === 41 ? 0 : 1;
    const whole = new Float64Array(g.nx);
    for (let ix = 10; ix <= 70; ix += 1) whole[ix] = 1;
    frayRow(row, 0, g.nx, g.xCenters, 1, 2, 3);
    frayRow(whole, 0, g.nx, g.xCenters, 1, 2, 3);
    // Beside the gap, nothing is cut: the run goes on past it.
    expect(row[39]).toBe(1);
    expect(row[42]).toBe(1);
    for (let ix = 0; ix < g.nx; ix += 1) if (ix !== 40 && ix !== 41) expect(row[ix]).toBe(whole[ix]);
  });

  it('frays each column\'s toe by up to its share of the run\'s depth, from the shoreward end', () => {
    const g = grid();
    const values = new Float64Array(g.nx * g.nz);
    for (let iz = 15; iz <= 25; iz += 1) for (let ix = 0; ix < g.nx; ix += 1) values[iz * g.nx + ix] = 1;
    frayToes(values, g.nx, 15, 25, g.xCenters, g.zCenters, 7.1);
    const toes = new Set<number>();
    for (let ix = 0; ix < g.nx; ix += 1) {
      // The seaward half as it was; nothing outside.
      for (let iz = 15; iz <= 19; iz += 1) expect(values[iz * g.nx + ix]).toBe(1);
      expect(values[14 * g.nx + ix]).toBe(0);
      let toe = 25;
      while (values[toe * g.nx + ix] < 0.5) toe -= 1;
      toes.add(toe);
    }
    expect(toes.size).toBeGreaterThan(2);
  });

  it('fades the band\'s drawn scale in from each end of a slot\'s run over 1 to bandFade columns', () => {
    const nx = 60;
    const stride = 8;
    const table = new Float32Array(2 * nx * stride);
    for (let c = 10; c < 50; c += 1) table[(nx + c) * stride + 2] = 1;
    frayBand(table, 2, nx, stride, 2, 4.2);
    const scale = (c: number) => table[(nx + c) * stride + 2];
    expect(scale(9)).toBe(0);
    expect(scale(10)).toBeGreaterThan(0);
    expect(scale(10)).toBeLessThan(1);
    expect(scale(30)).toBe(1);
    for (let c = 10; c < 50; c += 1) expect(scale(c)).toBeLessThanOrEqual(1);
    // The first slot, empty, stays so.
    for (let i = 0; i < nx * stride; i += 1) expect(table[i]).toBe(0);
  });
});

describe('the spilling front\'s drawn edges', () => {
  it('are off by default and on at the Canyon', () => {
    expect(SPILLING_FRONT_DEFAULTS.drawnEdges).toBe(false);
    expect(SPILLING_FRONT.canyon?.drawnEdges).toBe(true);
  });

  it('fray only the drawn copy: the front\'s whitewater and the breaking felt are as without them, bit for bit', () => {
    const g = grid();
    const size = g.nx * g.nz;
    const strength = new Float64Array(size);
    // A straight crest breaking from x = −30 to 30, 4 m down the face.
    for (let iz = 20; iz <= 24; iz += 1) for (let ix = 10; ix <= 70; ix += 1) strength[iz * g.nx + ix] = 1;
    const fields = () => ({ out: new Float64Array(size), felt: new Float64Array(size), drawn: new Float64Array(size) });
    const frayed = new SpillingFront(g, { peelAngleDegrees: 90, drawnEdges: true });
    const square = new SpillingFront(g, { peelAngleDegrees: 90 });
    for (const front of [frayed, square]) for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 0, 0);
    const a = fields();
    const b = fields();
    for (let step = 1; step <= 40; step += 1) {
      frayed.update(step * 0.25, 0.25, 4, strength, a.out, a.felt, a.drawn);
      square.update(step * 0.25, 0.25, 4, strength, b.out, b.felt, b.drawn);
      for (let i = 0; i < size; i += 1) {
        expect(Object.is(a.out[i], b.out[i])).toBe(true);
        expect(Object.is(a.felt[i], b.felt[i])).toBe(true);
        expect(a.drawn[i]).toBeLessThanOrEqual(b.drawn[i]);
      }
    }
    // Square, the drawn white is the whole band; frayed, its ends along the crest and its toe give some up, its middle
    // none.
    const at = (values: Float64Array, x: number, z: number) => values[(z + 20) * g.nx + x + 40];
    expect(at(b.drawn, -30, 2)).toBe(1);
    expect(at(a.drawn, -10, 0)).toBe(1);
    let frayedEnds = 0;
    let frayedToes = 0;
    for (let z = 0; z <= 4; z += 1) if (at(a.drawn, -30, z) < 1) frayedEnds += 1;
    for (let x = -20; x <= -5; x += 1) if (at(a.drawn, x, 4) < 1) frayedToes += 1;
    expect(frayedEnds).toBeGreaterThan(0);
    expect(frayedToes).toBeGreaterThan(5);
  });
});
