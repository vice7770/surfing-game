import { describe, expect, it } from 'vitest';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { crestMotion } from '../CrestKinematics';
import { uniformEdges } from '../ShallowWaterSolver';
import { GRAVITY } from '../dispersion';
import { columnCrests, type CrestSample } from './crestOnset';

const DEPTH = 3;

/** Flat 3 m water, 20 × 60 one-metre cells, carrying Gaussian bumps shoreward as long waves: q = c η, η_t = −c ∂η/∂z. */
function bumps(peaks: readonly number[], amplitude = 0.5, width = 4, speed = Math.sqrt(GRAVITY * DEPTH)) {
  const solver = new BoussinesqSolver({ nx: 20, xMin: 0, dx: 1, zEdges: uniformEdges(0, 60, 60) }, () => DEPTH);
  const rise = solver.surfaceRiseRate;
  for (let iz = 0; iz < solver.nz; iz += 1) {
    const z = solver.zCenters[iz];
    let eta = 0;
    let slope = 0;
    for (const peak of peaks) {
      const g = amplitude * Math.exp(-(((z - peak) / width) ** 2));
      eta += g;
      slope += (-2 * (z - peak) / (width * width)) * g;
    }
    for (let ix = 0; ix < solver.nx; ix += 1) {
      const i = iz * solver.nx + ix;
      solver.h[i] = DEPTH + eta;
      solver.qx[i] = 0;
      solver.qz[i] = speed * eta;
      rise[i] = -speed * slope;
    }
  }
  const size = solver.nx * solver.nz;
  return { solver, breaking: { strength: new Float64Array(size) } };
}

describe('each column’s crests, their breaking and their U/C', () => {
  it('finds one crest per column at the bump’s peak', () => {
    const { solver, breaking } = bumps([30.5]);
    const out: CrestSample[] = [];
    const count = columnCrests(solver, breaking, 0, 0.1, out);
    expect(count).toBe(solver.nx);
    for (let k = 0; k < count; k += 1) {
      expect(out[k]).toMatchObject({ column: k, row: 30, strength: 0, depth: DEPTH });
      expect(out[k].z).toBeCloseTo(30.5, 9);
      expect(out[k].eta).toBeCloseTo(0.5, 9);
    }
  });

  it('reads the breaking over the crest’s segment: its strongest', () => {
    const { solver, breaking } = bumps([30.5]);
    const column = 4;
    // Breaking on the face, 3 and 6 m shoreward of the crest; behind it and past the face's reach it does not count.
    for (const [row, strength] of [[33, 0.6], [36, 0.4], [29, 0.9], [45, 0.9]]) breaking.strength[row * solver.nx + column] = strength;
    const out: CrestSample[] = [];
    columnCrests(solver, breaking, 0, 0.1, out);
    expect(out[column].strength).toBe(0.6);
    expect(out[column + 1].strength).toBe(0);
  });

  it('reads the segment’s steepest rise over √(g d), Kennedy’s fresh test', () => {
    const { solver, breaking } = bumps([30.5]);
    const out: CrestSample[] = [];
    columnCrests(solver, breaking, 0, 0.1, out);
    let steepest = 0;
    for (let row = 30; row <= 40; row += 1) steepest = Math.max(steepest, solver.surfaceRiseRate[row * solver.nx + 3] / Math.sqrt(GRAVITY * DEPTH));
    expect(out[3].rise).toBeCloseTo(steepest, 12);
    // The bump's face, √2 A e^(−½)/w steep, rising at c times that: 0.107 √(g d).
    expect(out[3].rise).toBeCloseTo((Math.SQRT2 * 0.5 * Math.exp(-0.5)) / 4, 2);
  });

  it('logs U/C: the water’s speed along the crest’s travel over the crest’s own', () => {
    const { solver, breaking } = bumps([30.5]);
    const out: CrestSample[] = [];
    columnCrests(solver, breaking, 0, 0.1, out);
    const sample = out[5];
    const cell = sample.row * solver.nx + sample.column;
    const motion = crestMotion(solver, cell)!;
    const along = (solver.qx[cell] * motion.direction.x + solver.qz[cell] * motion.direction.z) / solver.h[cell];
    expect(sample.speed).toBeCloseTo(motion.speed, 12);
    expect(sample.b).toBeCloseTo(along / motion.speed, 12);
  });

  it('leaves U/C unmeasured under the crest-speed floor, half √(gh)', () => {
    const { solver, breaking } = bumps([30.5], 0.5, 4, 0.4 * Math.sqrt(GRAVITY * DEPTH));
    const out: CrestSample[] = [];
    expect(columnCrests(solver, breaking, 0, 0.1, out)).toBe(solver.nx);
    expect(out[0].b).toBeNaN();
    expect(out[0].speed).toBe(0);
  });

  // Review Focus 5: two crests in one column are two samples, never merged.
  it('gives two samples per column for two bumps 15 m apart', () => {
    const { solver, breaking } = bumps([20.5, 35.5]);
    const out: CrestSample[] = [];
    const count = columnCrests(solver, breaking, 0, 0.1, out);
    expect(count).toBe(2 * solver.nx);
    for (let ix = 0; ix < solver.nx; ix += 1) {
      expect(out.slice(0, count).filter((sample) => sample.column === ix).map((sample) => sample.row)).toEqual([20, 35]);
    }
  });

  it('skips crests below the height and rows before the first', () => {
    const { solver, breaking } = bumps([20.5, 35.5]);
    const out: CrestSample[] = [];
    expect(columnCrests(solver, breaking, 0, 0.6, out)).toBe(0);
    expect(columnCrests(solver, breaking, 28, 0.1, out)).toBe(solver.nx);
    expect(out[0].row).toBe(35);
  });
});

describe('each column\'s crests, found row by row (the M1 CPU study, 2026-10-19)', () => {
  /** The column-by-column scan as it was: the order and every value `columnCrests` must keep. */
  function scanned(solver: BoussinesqSolver, strength: Float64Array, fromRow: number, minHeight: number): CrestSample[] {
    const { nx, nz, h, bed, qx, qz, xCenters, zCenters, restLevel } = solver;
    const rate = solver.surfaceRiseRate;
    const out: CrestSample[] = [];
    for (let ix = 0; ix < nx; ix += 1) {
      for (let iz = Math.max(1, fromRow); iz < nz - 1; iz += 1) {
        const i = iz * nx + ix;
        if (!(h[i] > 0.05)) continue;
        const eta = h[i] + bed[i];
        if (!(eta - restLevel > minHeight) || !(eta > h[i - nx] + bed[i - nx]) || !(eta > h[i + nx] + bed[i + nx])) continue;
        let peak = 0;
        let rise = 0;
        let trough = eta;
        for (let row = iz; row < nz && zCenters[row] - zCenters[iz] <= 10; row += 1) {
          const cell = row * nx + ix;
          if (!(h[cell] > 0.05)) continue;
          if (strength[cell] > peak) peak = strength[cell];
          if (h[cell] + bed[cell] < trough) trough = h[cell] + bed[cell];
          const fresh = rate[cell] / Math.sqrt(GRAVITY * Math.max(0.05, restLevel - bed[cell]));
          if (fresh > rise) rise = fresh;
        }
        const found = crestMotion(solver, i);
        const motion = found && found.speed >= 0.5 * Math.sqrt(GRAVITY * h[i]) ? found : undefined;
        out.push({
          column: ix, row: iz, x: xCenters[ix], z: zCenters[iz], eta: eta - restLevel, wave: eta - trough, strength: peak, rise,
          depth: restLevel - bed[i], b: motion ? (qx[i] * motion.direction.x + qz[i] * motion.direction.z) / h[i] / motion.speed : NaN,
          speed: motion ? motion.speed : 0,
        });
      }
    }
    return out;
  }

  it('gives the column scan\'s samples, in its order, on rough seas with dry and NaN cells', () => {
    let seed = 3;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const out: CrestSample[] = [];
    let crests = 0;
    for (let trial = 0; trial < 20; trial += 1) {
      const { solver, breaking } = bumps([12 + 3 * random(), 31 + 5 * random(), 48]);
      for (let i = 0; i < solver.h.length; i += 1) {
        solver.h[i] += 0.3 * (random() - 0.5);
        solver.qx[i] = 2 * (random() - 0.5);
        solver.surfaceRiseRate[i] += random() - 0.5;
        breaking.strength[i] = random() > 0.7 ? random() : 0;
        if (random() > 0.97) solver.h[i] = 0.01;
        if (random() > 0.995) solver.h[i] = Number.NaN;
      }
      const fromRow = trial % 4;
      const expected = scanned(solver, breaking.strength, fromRow, 0.05);
      const count = columnCrests(solver, breaking, fromRow, 0.05, out);
      expect(count).toBe(expected.length);
      for (let n = 0; n < count; n += 1) {
        for (const key of Object.keys(expected[n]) as (keyof CrestSample)[]) {
          expect(Object.is(out[n][key], expected[n][key])).toBe(true);
        }
      }
      crests += count;
    }
    expect(crests).toBeGreaterThan(1000);
  });
});
