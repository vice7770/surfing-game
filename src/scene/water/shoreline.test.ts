import { describe, expect, it } from 'vitest';
import {
  DRY_DEPTH, DRY_DROP, DRY_MARGIN, FULL_SCAN_EVERY, ShorelineFill, WET_SAND_DRYING, WET_SAND_STEP, WET_SAND_SUBMERGED, WetSandMemory, innerDepth,
} from './shoreline';

/** The surf zone's render convention (`writeUniformSurface`): wet over 1 cm deep, else 5 cm under the bed. */
const WET = 0.01;

/** Still water at level 0 over a planar beach rising at `slope` toward +z, its shore oblique to the grid. */
function stillBeach(nx: number, nz: number, slope: number, skew: number, level = 0) {
  const bed = new Float32Array(nx * nz);
  const data = new Float32Array(nx * nz * 2);
  for (let r = 0; r < nz; r += 1) {
    for (let c = 0; c < nx; c += 1) {
      const k = r * nx + c;
      bed[k] = slope * (r - 10 + skew * c);
      const depth = level - bed[k];
      data[2 * k] = depth > WET ? level : bed[k] - DRY_DROP;
      data[2 * k + 1] = depth > WET ? 0.25 : 0;
    }
  }
  return { bed, data };
}

/** Where each column's drawn water meets its bed, from the linear run of (height − bed) between its nodes, rows. */
function crossings(data: Float32Array, bed: Float32Array, nx: number, nz: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < nx; c += 1) {
    for (let r = 0; r + 1 < nz; r += 1) {
      const a = data[2 * (r * nx + c)] - bed[r * nx + c];
      const b = data[2 * ((r + 1) * nx + c)] - bed[(r + 1) * nx + c];
      if (a > 0 && b <= 0) {
        out.push(r + a / (a - b));
        break;
      }
    }
  }
  return out;
}

describe('the waterline (ShorelineFill)', () => {
  it('draws a straight shore along its true line, where the nodes stepped it a metre at a time', () => {
    const nx = 24;
    const nz = 24;
    const slope = 0.06;
    const skew = 0.37;
    const { bed, data } = stillBeach(nx, nz, slope, skew);
    // The true shore: bed = 0, at row 10 − skew·c.
    const error = (rows: number[]) => Math.max(...rows.map((row, c) => Math.abs(row - (10 - skew * c))));
    const before = error(crossings(data, bed, nx, nz));
    new ShorelineFill().fill(data, bed, nx, nz);
    const after = error(crossings(data, bed, nx, nz));
    expect(before).toBeGreaterThan(0.4);
    // On the true line, every column, to float precision.
    expect(after).toBeLessThan(1e-3);
  });

  it('moves only the two rings of dry nodes beside the water, the outer one under its bed, and leaves the foam', () => {
    const nx = 16;
    const nz = 20;
    const { bed, data } = stillBeach(nx, nz, 0.08, 0.25);
    const original = data.slice();
    const moved = new ShorelineFill().fill(data, bed, nx, nz);
    expect(moved).toBeGreaterThan(2 * nx - 2);
    const wet = (k: number) => original[2 * k] > bed[k];
    /** How many nodes node k lies from the nearest wet node (8-neighbour steps), up to 3. */
    const reach = (k: number) => {
      const c = k % nx;
      const r = (k - c) / nx;
      let best = 3;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < nz && cc >= 0 && cc < nx && wet(rr * nx + cc)) best = Math.min(best, Math.max(Math.abs(dr), Math.abs(dc)));
        }
      }
      return best;
    };
    // Every dry node within two of the water, and none further.
    let within = 0;
    for (let k = 0; k < nx * nz; k += 1) if (!wet(k) && reach(k) <= 2) within += 1;
    expect(moved).toBe(within);
    let changed = 0;
    for (let k = 0; k < nx * nz; k += 1) {
      expect(data[2 * k + 1]).toBe(original[2 * k + 1]);
      if (data[2 * k] === original[2 * k]) continue;
      changed += 1;
      expect(original[2 * k]).toBeCloseTo(bed[k] - DRY_DROP, 6);
      const ring = reach(k);
      expect(ring).toBeLessThanOrEqual(2);
      // The first ring no deeper than the dry threshold over its bed, the second under it by the margin.
      expect(data[2 * k] - bed[k]).toBeLessThanOrEqual((ring === 1 ? DRY_DEPTH : -DRY_MARGIN) + 1e-6);
    }
    expect(changed).toBe(moved);
  });

  it('folds an extrapolation past the dry threshold back under the bed, continuously', () => {
    expect(innerDepth(-0.2)).toBe(-0.2);
    expect(innerDepth(DRY_DEPTH)).toBeCloseTo(DRY_DEPTH, 9);
    expect(innerDepth(DRY_DEPTH + 1e-6)).toBeCloseTo(DRY_DEPTH, 5);
    // A reef's step: the depth below it extrapolated onto its dry top.
    expect(innerDepth(0.8)).toBe(-DRY_MARGIN);
  });

  it('keeps a bore’s tip in its own cell as it runs up the dry beach', () => {
    // One column: a 30 cm bore whose face falls 15 cm a node onto a 1:20 beach, dry beyond row 12.
    const nx = 1;
    const nz = 20;
    const bed = new Float32Array(nz);
    const data = new Float32Array(nz * 2);
    for (let r = 0; r < nz; r += 1) {
      bed[r] = 0.05 * (r - 10);
      const depth = r <= 10 ? 0.3 : r === 11 ? 0.15 : r === 12 ? 0.02 : 0;
      data[2 * r] = depth > WET ? bed[r] + depth : bed[r] - DRY_DROP;
    }
    new ShorelineFill().fill(data, bed, nx, nz);
    const [tip] = crossings(data, bed, nx, nz);
    // The run of depth 0.15 → 0.02 reaches zero 0.15 of a node past row 12; the level would have carried it on.
    expect(tip).toBeGreaterThan(12);
    expect(tip).toBeLessThan(12.2);
  });

  it('scans the beach’s band between full scans and draws exactly what a full scan would, finding new dry ground in time', () => {
    const nx = 30;
    const nz = 120;
    const bed = new Float32Array(nx * nz);
    for (let r = 0; r < nz; r += 1) for (let c = 0; c < nx; c += 1) bed[r * nx + c] = 0.06 * (r - 100 + 0.3 * c);
    const frame = (t: number, reefTop: boolean) => {
      const data = new Float32Array(nx * nz * 2);
      for (let r = 0; r < nz; r += 1) {
        for (let c = 0; c < nx; c += 1) {
          const k = r * nx + c;
          // A swash running up and down the beach, and from frame 20 a reef top drying far offshore (rows 20–22).
          const level = 0.4 * Math.sin(t / 6 + c / 9);
          const ground = reefTop && r >= 20 && r <= 22 && c >= 10 && c <= 14 ? level + 0.5 : bed[k];
          bed[k] = ground === bed[k] ? bed[k] : ground;
          data[2 * k] = level - bed[k] > 0.01 ? level : bed[k] - DRY_DROP;
        }
      }
      return data;
    };
    const banded = new ShorelineFill();
    let caught = -1;
    for (let t = 0; t < 60; t += 1) {
      const reef = t >= 20;
      const data = frame(t, reef);
      const oracle = data.slice();
      new ShorelineFill().fill(oracle, bed, nx, nz);
      banded.fill(data, bed, nx, nz);
      const reefMissed = data[2 * (21 * nx + 9)] !== oracle[2 * (21 * nx + 9)] || data[2 * (21 * nx + 12)] !== oracle[2 * (21 * nx + 12)];
      if (reef && caught < 0 && !reefMissed) caught = t;
      // Away from a reef the band has not found yet, the same heights a full scan gives.
      for (let k = 0; k < nx * nz; k += 1) if (Math.floor(k / nx) > 30) expect(data[2 * k]).toBe(oracle[2 * k]);
      if (caught >= 0) expect(Array.from(data)).toEqual(Array.from(oracle));
    }
    expect(caught).toBeGreaterThanOrEqual(20);
    expect(caught).toBeLessThan(20 + FULL_SCAN_EVERY);
  });

  it('looks for a shore in a sea without one only every FULL_SCAN_EVERY snapshots', () => {
    const nx = 8;
    const nz = 8;
    const bed = new Float32Array(nx * nz).fill(-2);
    const sea = new Float32Array(nx * nz * 2).fill(0.3);
    const fill = new ShorelineFill();
    expect(fill.fill(sea, bed, nx, nz)).toBe(0);
    // The tide drops off a sandbar at node 27; the next full scan finds it, no later.
    bed[27] = 1;
    sea[54] = 1 - DRY_DROP;
    let found = -1;
    for (let n = 1; n <= FULL_SCAN_EVERY && found < 0; n += 1) if (fill.fill(sea.slice(), bed, nx, nz) > 0) found = n;
    expect(found).toBe(FULL_SCAN_EVERY);
    fill.reset();
    expect(fill.fill(sea.slice(), bed, nx, nz)).toBeGreaterThan(0);
  });

  it('leaves water with no shore, and a grid with no water, as they were', () => {
    const fill = new ShorelineFill();
    const bed = new Float32Array(9).fill(-3);
    const sea = new Float32Array(18).fill(0.4);
    expect(fill.fill(sea, bed, 3, 3)).toBe(0);
    expect(Array.from(sea)).toEqual(new Array(18).fill(0.4).map((v) => Math.fround(v)));
    const land = new Float32Array(18);
    for (let k = 0; k < 9; k += 1) land[2 * k] = 2 - DRY_DROP;
    const sand = new Float32Array(9).fill(2);
    expect(fill.fill(land, sand, 3, 3)).toBe(0);
    for (let k = 0; k < 9; k += 1) expect(land[2 * k]).toBeCloseTo(2 - DRY_DROP, 6);
  });
});

describe('the wet sand (WetSandMemory)', () => {
  /** One row of four nodes on a beach at bed 0: a 5 cm swash over the first `wet` of them. */
  const row = (wet: number) => {
    const data = new Float32Array(8);
    for (let k = 0; k < 4; k += 1) data[2 * k] = k < wet ? 0.05 : -DRY_DROP;
    return data;
  };
  const bed = new Float32Array(4);

  it('holds the sand the water covers fully wet, and dries the sand it left over WET_SAND_DRYING', () => {
    const sand = new WetSandMemory();
    expect(sand.update(row(3), bed, 10)).toBe(true);
    expect(Array.from(sand.bytes)).toEqual([255, 255, 255, 0]);
    // Within a step, nothing moves.
    expect(sand.update(row(1), bed, 10 + WET_SAND_STEP / 2)).toBe(false);
    // The swash runs back to the first node; a second at a time (as the water sheet draws), for a quarter of the drying.
    for (let t = 11; t <= 10 + WET_SAND_DRYING / 4; t += 1) expect(sand.update(row(1), bed, t)).toBe(true);
    expect(sand.bytes[0]).toBe(255);
    expect(sand.memory[1]).toBeCloseTo(Math.exp(-0.25), 5);
    expect(sand.memory[2]).toBeCloseTo(Math.exp(-0.25), 5);
    expect(sand.bytes[3]).toBe(0);
    for (let t = 11 + WET_SAND_DRYING / 4; t <= 10 + WET_SAND_DRYING; t += 1) sand.update(row(1), bed, t);
    expect(sand.memory[1]).toBeCloseTo(Math.exp(-1), 4);
  });

  it('leaves the sea’s bed alone: nothing under more than WET_SAND_SUBMERGED of water', () => {
    const sand = new WetSandMemory();
    const data = new Float32Array([0.5, 0, WET_SAND_SUBMERGED / 2, 0, -DRY_DROP, 0, -DRY_DROP, 0]);
    sand.update(data, bed, 0);
    expect(Array.from(sand.memory)).toEqual([1, 1, 0, 0]);
    expect(Array.from(sand.bytes)).toEqual([0, 255, 0, 0]);
  });

  it('moves the sand’s memory with the window as it slides along the shore', () => {
    const sand = new WetSandMemory();
    // Two rows of four nodes; the swash wetted the second node of each.
    const data = new Float32Array(16).fill(-DRY_DROP);
    data[2] = 0.05;
    data[10] = 0.05;
    sand.update(data, new Float32Array(8), 0);
    expect(Array.from(sand.bytes)).toEqual([0, 255, 0, 0, 0, 255, 0, 0]);
    // The window slides a node toward +x: that sand is now its first node.
    sand.shift(1, 4);
    expect(Array.from(sand.bytes)).toEqual([255, 0, 0, 0, 255, 0, 0, 0]);
    expect(Array.from(sand.memory)).toEqual([1, 0, 0, 0, 1, 0, 0, 0]);
    // And back two: it is the third, and the columns coming in start dry.
    sand.shift(-2, 4);
    expect(Array.from(sand.bytes)).toEqual([0, 0, 255, 0, 0, 0, 255, 0]);
    sand.shift(5, 4);
    expect(Array.from(sand.bytes)).toEqual(new Array(8).fill(0));
  });

  it('starts afresh on a new sea: a jump in sea time, or back', () => {
    const sand = new WetSandMemory();
    sand.update(row(4), bed, 100);
    sand.update(row(1), bed, 100 + 60);
    expect(Array.from(sand.bytes)).toEqual([255, 0, 0, 0]);
    sand.update(row(4), bed, 200);
    sand.update(row(2), bed, 3);
    expect(Array.from(sand.bytes)).toEqual([255, 255, 0, 0]);
  });
});
