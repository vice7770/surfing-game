import { describe, expect, it } from 'vitest';
import { SurfZoneSimulation, type RenderGrid, type SurfZoneConfig } from './SurfZoneSimulation';

/** The simulation's insides the snapshot reads. */
type Insides = {
  solver: { h: Float64Array; bed: Float64Array; qx: Float64Array; qz: Float64Array; nx: number; nz: number };
  foam: { dense: Float64Array; residual: Float64Array };
  aeration: { air: Float64Array; depth: Float64Array; voidFraction(cell: number): number };
  curl?: { age: Float64Array; shoulderAir: Float32Array; airShare(cell: number, foam: number): number };
  mappingFor(grid: RenderGrid): { columns: Int32Array; columnWeights: Float64Array; rows: Int32Array; rowWeights: Float64Array };
  writeLensTops(surface: Float32Array, grid: RenderGrid): void;
};

const WET = 0.01;

/**
 * `writeUniformSnapshot` as main wrote it until canyon-perf (2026-10-29), line for line: the reference the faster pass
 * must match byte for byte.
 */
function referenceSnapshot(simulation: SurfZoneSimulation, surface: Float32Array, flow: Float32Array, aeration: Float32Array, grid: RenderGrid): void {
  const sim = simulation as unknown as Insides;
  const { columns, columnWeights, rows, rowWeights } = sim.mappingFor(grid);
  const { h, bed, qx, qz, nx } = sim.solver;
  const { dense, residual } = sim.foam;
  const plume = sim.aeration.depth;
  const u = new Float64Array(h.length);
  const w = new Float64Array(h.length);
  const fraction = new Float64Array(h.length);
  for (let i = 0; i < h.length; i += 1) {
    const wet = h[i] > WET;
    u[i] = wet ? qx[i] / h[i] : 0;
    w[i] = wet ? qz[i] / h[i] : 0;
    fraction[i] = sim.aeration.voidFraction(i);
    if (sim.curl) fraction[i] *= sim.curl.airShare(i, dense[i] + residual[i]);
  }
  const nodes = grid.nx;
  for (let r = 0; r < grid.nz; r += 1) {
    const row = rows[r] * nx;
    const tz = rowWeights[r];
    const line = r * nodes;
    for (let c = 0; c < nodes; c += 1) {
      const i = row + columns[c];
      const tx = columnWeights[c];
      const w00 = (1 - tx) * (1 - tz);
      const w10 = tx * (1 - tz);
      const w01 = (1 - tx) * tz;
      const w11 = tx * tz;
      const o = (line + c) * 2;
      const depth = h[i] * w00 + h[i + 1] * w10 + h[i + nx] * w01 + h[i + nx + 1] * w11;
      const bottom = bed[i] * w00 + bed[i + 1] * w10 + bed[i + nx] * w01 + bed[i + nx + 1] * w11;
      surface[o] = depth > WET ? depth + bottom : bottom - 0.05;
      surface[o + 1] = depth > WET ? (dense[i] + residual[i]) * w00 + (dense[i + 1] + residual[i + 1]) * w10
        + (dense[i + nx] + residual[i + nx]) * w01 + (dense[i + nx + 1] + residual[i + nx + 1]) * w11 : 0;
      flow[o] = depth > WET ? u[i] * w00 + u[i + 1] * w10 + u[i + nx] * w01 + u[i + nx + 1] * w11 : 0;
      flow[o + 1] = depth > WET ? w[i] * w00 + w[i + 1] * w10 + w[i + nx] * w01 + w[i + nx + 1] * w11 : 0;
      aeration[o] = w00 * fraction[i] + w10 * fraction[i + 1] + w01 * fraction[i + nx] + w11 * fraction[i + nx + 1];
      aeration[o + 1] = w00 * plume[i] + w10 * plume[i + 1] + w01 * plume[i + nx] + w11 * plume[i + nx + 1];
    }
  }
  sim.writeLensTops(surface, grid);
}

/** A small deterministic generator, so a failure repeats. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const bytes = (values: Float32Array) => new Uint8Array(values.buffer, values.byteOffset, values.byteLength);

// canyon-perf (2026-10-29): the worker's snapshot fields come from one row-wise pass over the cells and one over the nodes
// that skips the foam's and the air's sums where their rows hold none. The drawing must not move by a bit: the fields
// are compared byte for byte with main's algorithm, over seas stepped a little and then scrambled with wet and dry
// cells, rows with and without foam or air, ±0 and the curl's air share (the Canyon) or none (the Beach).
describe('the worker snapshot\'s fields', () => {
  const tiny = { seed: 1, significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: 150, tide: 0, componentCount: 4, dx: 4, fineSpacing: 4, coarseSpacing: 8, spinUpPeriods: 0.1 };
  for (const spot of ['canyon', 'beach'] as const) {
    it(`match main's bytes at the ${spot === 'canyon' ? 'Canyon (with its curl)' : 'Beach'}`, () => {
      const simulation = new SurfZoneSimulation({ ...tiny, spot } as SurfZoneConfig, 'warm');
      for (let k = 0; k < 20; k += 1) simulation.step(1 / 60);
      const sim = simulation as unknown as Insides;
      const { h, qx, qz, nx, nz } = sim.solver;
      const { dense, residual } = sim.foam;
      const { air, depth } = sim.aeration;
      if (spot === 'canyon') expect(sim.curl).toBeDefined();
      const next = random(spot === 'canyon' ? 7 : 11);
      for (let round = 0; round < 4; round += 1) {
        for (let iz = 0; iz < nz; iz += 1) {
          // Some rows hold no foam, some no air, some neither; the rest a sprinkle of each.
          const foamRow = (iz + round) % 3 !== 0;
          const airRow = (iz + round) % 4 !== 1;
          for (let ix = 0; ix < nx; ix += 1) {
            const i = iz * nx + ix;
            const roll = next();
            if (roll < 0.08) h[i] = 0;
            else if (roll < 0.12) h[i] = WET * next();
            if (round > 0) {
              qx[i] = roll < 0.2 ? -0 : (next() - 0.5) * 4;
              qz[i] = (next() - 0.5) * 4;
            }
            dense[i] = foamRow && next() < 0.3 ? next() : 0;
            residual[i] = foamRow && next() < 0.3 ? next() * 0.5 : 0;
            air[i] = airRow && next() < 0.3 ? next() * 0.2 : 0;
            depth[i] = airRow && next() < 0.35 ? next() * 2 : 0;
          }
        }
        if (sim.curl) {
          for (let ix = 0; ix < nx; ix += 1) sim.curl.age[ix] = next() < 0.5 ? Number.NaN : next() * 3;
          for (let i = 0; i < sim.curl.shoulderAir.length; i += 1) sim.curl.shoulderAir[i] = next() < 0.7 ? 1 : next();
        }
        for (const spacing of [1, 2, 3.5]) {
          const grid = simulation.renderGrid(spacing);
          const nodes = grid.nx * grid.nz * 2;
          const fast = [new Float32Array(nodes), new Float32Array(nodes), new Float32Array(nodes)] as const;
          const reference = [new Float32Array(nodes), new Float32Array(nodes), new Float32Array(nodes)] as const;
          simulation.writeUniformSnapshot(fast[0], fast[1], fast[2], grid);
          referenceSnapshot(simulation, reference[0], reference[1], reference[2], grid);
          for (let k = 0; k < 3; k += 1) expect(bytes(fast[k])).toEqual(bytes(reference[k]));
        }
      }
    }, 180_000); // A Canyon warm start: about 20 s alone, it timed out at 60 s under other agents' load (2026-10-29, 10-31).
  }
});
