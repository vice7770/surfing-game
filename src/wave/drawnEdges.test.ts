import { describe, expect, it } from 'vitest';
import { DRAWN_EDGES, edgeNoise, frayBand, frayRow, frayToes, peelWeight } from './drawnEdges';
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
    const rows = Int32Array.from({ length: 11 }, (_, k) => 15 + k);
    frayToes(values, g.nx, rows, rows.length, g.xCenters, g.zCenters, 7.1);
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
    // Where the noise cuts nothing, the toe's last row is left whole: no row is lost to the fray itself.
    const thin = new Float64Array(g.nx * g.nz);
    for (let iz = 20; iz <= 21; iz += 1) for (let ix = 0; ix < g.nx; ix += 1) thin[iz * g.nx + ix] = 1;
    frayToes(thin, g.nx, Int32Array.of(20, 21), 2, g.xCenters, g.zCenters, 7.1);
    let kept = 0;
    for (let ix = 0; ix < g.nx; ix += 1) kept += thin[21 * g.nx + ix];
    expect(kept / g.nx).toBeGreaterThan(0.4);
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

describe('where the lip lands (the Canyon lip, round 5)', () => {
  /** A row's run of white from x = −30 to 30 (columns 10 … 70), every cell `age` s old. */
  const frayed = (z: number, time: number, age: number, direction: 1 | -1 = 1, peel = true) => {
    const g = grid();
    const row = new Float64Array(g.nx);
    for (let ix = 10; ix <= 70; ix += 1) row[ix] = 1;
    const ages = new Float64Array(g.nx).fill(age);
    frayRow(row, 0, g.nx, g.xCenters, 1, z, time, peel ? { direction, age: ages, young: 3 } : undefined);
    return row;
  };
  /** How far in from the run's edge (x = −30.5 low, 30.5 high) its white first reaches half. */
  const inset = (row: Float64Array, high: boolean) => {
    let k = high ? 70 : 10;
    while (row[k] < 0.5) k += high ? -1 : 1;
    return high ? 70 - k : k - 10;
  };

  it('is young until the look\'s span, frayed in full a peelBlend later, and with no lip', () => {
    expect(peelWeight(0.5, 3)).toBe(1);
    expect(peelWeight(3, 3)).toBe(1);
    expect(peelWeight(3 + 0.5 * DRAWN_EDGES.peelBlend, 3)).toBeCloseTo(0.5, 6);
    expect(peelWeight(3 + DRAWN_EDGES.peelBlend, 3)).toBe(0);
    expect(peelWeight(Number.NaN, 3)).toBe(0);
    expect(DRAWN_EDGES.peelCut).toBeLessThanOrEqual(0.45);
    expect(DRAWN_EDGES.peelFade).toBeLessThanOrEqual(1);
  });

  it('cuts a young run\'s peel-side end no more than the lip\'s fingers, and frays its upcoast end in full', () => {
    const { peelCut, peelFade, endCut, endFade } = DRAWN_EDGES;
    const upcoast = new Set<number>();
    for (let z = -20; z <= 20; z += 1) {
      for (const time of [0.4, 5.3, 12.7]) {
        const row = frayed(z, time, 1);
        // The peel-side end (+x): its last cell (0.5 m in) loses at most all of it; one cell in, none.
        expect(peelCut + peelFade).toBeLessThan(1.5);
        expect(row[69]).toBe(1);
        for (let ix = 30; ix < 70; ix += 1) expect(row[ix]).toBe(1);
        upcoast.add(inset(row, false));
        expect(inset(row, false)).toBeLessThanOrEqual(endCut + endFade);
        // Toward −x the same: the peel's direction decides which end is the lip's.
        const left = frayed(z, time, 1, -1);
        expect(left[11]).toBe(1);
      }
    }
    // The upcoast end still frays by metres from row to row.
    expect(Math.max(...upcoast)).toBeGreaterThan(1);
    expect(upcoast.size).toBeGreaterThan(2);
  });

  it('frays the peel-side end in full once its white is old, or with no lip, as without it', () => {
    for (let z = -20; z <= 20; z += 1) {
      const old = frayed(z, 7.7, 3 + DRAWN_EDGES.peelBlend);
      const square = frayed(z, 7.7, 0, 1, false);
      for (let ix = 0; ix < 81; ix += 1) expect(old[ix]).toBe(square[ix]);
      const none = frayed(z, 7.7, Number.NaN);
      for (let ix = 0; ix < 81; ix += 1) expect(none[ix]).toBe(square[ix]);
    }
  });

  it('fades the band\'s peel-side end over at most a column while young, its other end over 1 to bandFade', () => {
    const nx = 60;
    const stride = 8;
    for (const time of [0.3, 4.2, 9.9, 14.1]) {
      const table = new Float32Array(2 * nx * stride);
      for (let c = 10; c < 50; c += 1) table[(nx + c) * stride + 2] = 1;
      const ages = new Float64Array(2 * nx).fill(1);
      frayBand(table, 2, nx, stride, 2, time, { direction: 1, age: ages, young: 3 });
      const scale = (c: number) => table[(nx + c) * stride + 2];
      // The last column at half or more, the one before it whole.
      expect(scale(49)).toBeGreaterThanOrEqual(0.5);
      expect(scale(48)).toBe(1);
      expect(scale(10)).toBeLessThan(1);
      // Old, both ends as without it.
      const old = new Float32Array(2 * nx * stride);
      const square = new Float32Array(2 * nx * stride);
      for (let c = 10; c < 50; c += 1) old[(nx + c) * stride + 2] = square[(nx + c) * stride + 2] = 1;
      frayBand(old, 2, nx, stride, 2, time, { direction: 1, age: ages.fill(9), young: 3 });
      frayBand(square, 2, nx, stride, 2, time);
      expect(Array.from(old)).toEqual(Array.from(square));
    }
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

  it('with the lip\'s look, cut its young white\'s peel-side end only at its last column, the felt as without it', () => {
    const g = grid();
    const size = g.nx * g.nz;
    const strength = new Float64Array(size);
    for (let iz = 20; iz <= 24; iz += 1) for (let ix = 10; ix <= 70; ix += 1) strength[iz * g.nx + ix] = 1;
    // A look that draws all of it, young for 100 s; each front peels toward +x at 4 m/s from x = −40.
    const look = { span: 100, share: () => 1 };
    const arms = [
      { front: new SpillingFront(g, { peelAngleDegrees: 90, drawnEdges: true }), look },
      { front: new SpillingFront(g, { peelAngleDegrees: 90 }), look },
      { front: new SpillingFront(g, { peelAngleDegrees: 90, drawnEdges: true }), look: undefined },
      { front: new SpillingFront(g, { peelAngleDegrees: 90 }), look: undefined },
    ].map((arm) => ({ ...arm, out: new Float64Array(size), felt: new Float64Array(size), drawn: new Float64Array(size) }));
    for (const { front } of arms) for (let ix = 0; ix < g.nx; ix += 1) front.observeOnset(ix, 0, 0);
    const [lip, lipSquare, plain, square] = arms;
    const at = (values: Float64Array, column: number, z: number) => values[(z + 20) * g.nx + column];
    let checked = 0;
    let cutPlain = 0;
    let cutUpcoast = 0;
    for (let step = 1; step <= 40; step += 1) {
      for (const arm of arms) arm.front.update(step * 0.25, 0.25, 4, strength, arm.out, arm.felt, arm.drawn, arm.look);
      for (let i = 0; i < size; i += 1) {
        expect(Object.is(lip.out[i], square.out[i])).toBe(true);
        expect(Object.is(lip.felt[i], square.felt[i])).toBe(true);
      }
      // Rows the toe's fray leaves alone (z 0 … 2): behind the run's last column (its +x end, the front's), all of it.
      for (let z = 0; z <= 2; z += 1) {
        let end = g.nx - 1;
        while (end > 0 && !(at(lipSquare.drawn, end, z) > 0)) end -= 1;
        if (end < 20) continue;
        for (let column = end - 6; column < end; column += 1) expect(at(lip.drawn, column, z)).toBe(at(lipSquare.drawn, column, z));
        expect(at(lip.drawn, end, z)).toBeLessThanOrEqual(at(lipSquare.drawn, end, z));
        checked += 1;
        for (let column = end - 3; column < end; column += 1) if (at(plain.drawn, column, z) < at(square.drawn, column, z)) cutPlain += 1;
        if (at(lip.drawn, 11, z) < at(lipSquare.drawn, 11, z)) cutUpcoast += 1;
      }
    }
    expect(checked).toBeGreaterThan(40);
    expect(cutPlain).toBeGreaterThan(0);
    expect(cutUpcoast).toBeGreaterThan(0);
  });
});
