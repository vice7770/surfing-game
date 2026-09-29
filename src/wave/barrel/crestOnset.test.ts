import { describe, expect, it } from 'vitest';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { crestMotion } from '../CrestKinematics';
import { uniformEdges } from '../ShallowWaterSolver';
import { GRAVITY } from '../dispersion';
import { columnCrests, type CrestSample } from './crestOnset';

const DEPTH = 3;

/** Flat 3 m water, 20 × 60 one-metre cells, carrying Gaussian bumps shoreward as long waves: q = c η, η_t = −c ∂η/∂z. */
function bumps(peaks: readonly number[], amplitude = 0.5, width = 4) {
  const solver = new BoussinesqSolver({ nx: 20, xMin: 0, dx: 1, zEdges: uniformEdges(0, 60, 60) }, () => DEPTH);
  const c = Math.sqrt(GRAVITY * DEPTH);
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
      solver.qz[i] = c * eta;
      rise[i] = -c * slope;
    }
  }
  return solver;
}

describe('each column’s crests and their U/C', () => {
  it('finds one crest per column at the bump’s peak', () => {
    const solver = bumps([30.5]);
    const out: CrestSample[] = [];
    const count = columnCrests(solver, 0, 0.1, out);
    expect(count).toBe(solver.nx);
    for (let k = 0; k < count; k += 1) {
      expect(out[k].column).toBe(k);
      expect(out[k].row).toBe(30);
      expect(out[k].z).toBeCloseTo(30.5, 9);
      expect(out[k].eta).toBeCloseTo(0.5, 9);
    }
  });

  it('takes B as the water’s speed along the crest’s travel over the crest’s own speed', () => {
    const solver = bumps([30.5]);
    const out: CrestSample[] = [];
    columnCrests(solver, 0, 0.1, out);
    const sample = out[5];
    const cell = sample.row * solver.nx + sample.column;
    const motion = crestMotion(solver, cell)!;
    const along = (solver.qx[cell] * motion.direction.x + solver.qz[cell] * motion.direction.z) / solver.h[cell];
    expect(sample.speed).toBeCloseTo(motion.speed, 12);
    expect(sample.b).toBeCloseTo(along / motion.speed, 12);
    expect(sample.dirZ).toBeGreaterThan(0.99);
  });

  // Review Focus 5: two crests in one column are two samples, never merged.
  it('gives two samples per column for two bumps 15 m apart', () => {
    const solver = bumps([20.5, 35.5]);
    const out: CrestSample[] = [];
    const count = columnCrests(solver, 0, 0.1, out);
    expect(count).toBe(2 * solver.nx);
    for (let ix = 0; ix < solver.nx; ix += 1) {
      expect(out.slice(0, count).filter((sample) => sample.column === ix).map((sample) => sample.row)).toEqual([20, 35]);
    }
  });

  it('skips crests below the height and rows before the first', () => {
    const solver = bumps([20.5, 35.5]);
    const out: CrestSample[] = [];
    expect(columnCrests(solver, 0, 0.6, out)).toBe(0);
    expect(columnCrests(solver, 28, 0.1, out)).toBe(solver.nx);
    expect(out[0].row).toBe(35);
  });
});
