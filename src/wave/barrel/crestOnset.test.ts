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
