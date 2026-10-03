import { beforeAll, describe, expect, it } from 'vitest';
import {
  FOAM_BAKE, FOAM_RANGE, SurfaceFlow, bakeFoamCycle, blur, cellDensity, depthField, flowHistory, gaussianRanks, inverseNormal, mulberry32, traceBack,
  type FoamBake, type FoamBakeParameters,
} from './foamBake';

const parameters = (overrides: Partial<FoamBakeParameters> = {}): FoamBakeParameters => ({ ...FOAM_BAKE, ...overrides });
const dt = 1 / FOAM_BAKE.stepsPerTurnover;

/** The same bake as the page makes, once for the file (about half a second). */
let bake: FoamBake;
beforeAll(() => {
  bake = bakeFoamCycle();
});

/** The normal CDF, by the series of erf (Abramowitz & Stegun 7.1.26, error under 1.5e-7). */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

describe('the foam bake’s tools', () => {
  it('inverts the normal CDF', () => {
    expect(inverseNormal(0.5)).toBeCloseTo(0, 9);
    expect(inverseNormal(0.975)).toBeCloseTo(1.959964, 5);
    expect(inverseNormal(1e-6)).toBeCloseTo(-4.753424, 4);
    for (const p of [0.001, 0.02, 0.2, 0.5, 0.8, 0.98, 0.999]) expect(normalCdf(inverseNormal(p))).toBeCloseTo(p, 5);
    expect(inverseNormal(0)).toBe(-Infinity);
    expect(inverseNormal(1)).toBe(Infinity);
  });

  it('gives a seed the same stream in every engine, and different seeds different ones', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const c = mulberry32(8);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('blurs without losing mass, round the tile', () => {
    const field = new Float32Array(64 * 64);
    field[0] = 100;
    blur(field, 64, 2);
    let sum = 0;
    for (const value of field) sum += value;
    expect(sum).toBeCloseTo(100, 3);
    // The corner’s mass crossed the seam.
    expect(field[63]).toBeGreaterThan(0);
    expect(field[63 * 64]).toBeGreaterThan(0);
  });

  it('ranks texels as a unit Gaussian whatever their values, with ties broken by the order they arrive in the table', () => {
    const key = new Float32Array(100000);
    const random = mulberry32(3);
    for (let k = 0; k < key.length; k += 1) key[k] = Math.exp(4 * random() * random());
    const ranks = gaussianRanks(key);
    let mean = 0;
    let square = 0;
    for (const byte of ranks) {
      const g = (byte / 127.5 - 1) * FOAM_RANGE;
      mean += g;
      square += g * g;
    }
    expect(mean / ranks.length).toBeCloseTo(0, 1);
    expect(Math.sqrt(square / ranks.length)).toBeCloseTo(1, 1);
    // Rank is monotone in the value.
    let low = 0;
    let high = 0;
    for (let k = 1; k < key.length; k += 1) if (key[k] < key[low]) low = k; else if (key[k] > key[high]) high = k;
    expect(ranks[low]).toBeLessThan(ranks[high]);
  });

  it('ranks a hole’s empty middle by its depth: deeper is lower', () => {
    const size = 64;
    const density = new Float32Array(size * size);
    // A ring of foam, empty inside and outside.
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) density[y * size + x] = Math.abs(Math.hypot(x - 32, y - 32) - 20) < 2 ? 5 : 0;
    const depth = depthField(density, size, 16, 2);
    expect(depth[32 * size + 32]).toBeLessThan(depth[32 * size + 12]);
    expect(depth[32 * size + 12]).toBeGreaterThan(depth[0]);
  });
});

describe('the surface flow', () => {
  it('has the compressibility of a stirred tank’s surface: 0.49, Larkin et al. 2009', () => {
    const flow = new SurfaceFlow(parameters(), dt);
    expect(Math.abs(flow.compressibility - 0.49)).toBeLessThan(0.05);
    // Measured on the grid it synthesises, from central differences: the compressive share of the gradient’s energy.
    const n = flow.n;
    const stride = n + 1;
    let divergence = 0;
    let curl = 0;
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const dudx = (flow.ux[j * stride + i + 1] - flow.ux[j * stride + ((i + n - 1) % n)]) / 2;
        const dvdy = (flow.uy[(j + 1) * stride + i] - flow.uy[((j + n - 1) % n) * stride + i]) / 2;
        const dvdx = (flow.uy[j * stride + i + 1] - flow.uy[j * stride + ((i + n - 1) % n)]) / 2;
        const dudy = (flow.ux[(j + 1) * stride + i] - flow.ux[((j + n - 1) % n) * stride + i]) / 2;
        divergence += (dudx + dvdy) ** 2;
        curl += (dvdx - dudy) ** 2;
      }
    }
    expect(Math.abs(divergence / (divergence + curl) - 0.49)).toBeLessThan(0.08);
  });

  it('has a root-mean-square velocity of one integral length a turnover, and is periodic', () => {
    const flow = new SurfaceFlow(parameters(), dt);
    const n = flow.n;
    const stride = n + 1;
    let square = 0;
    for (let j = 0; j < n; j += 1) for (let i = 0; i < n; i += 1) square += flow.ux[j * stride + i] ** 2 + flow.uy[j * stride + i] ** 2;
    const lint = 1.7 / (2 * Math.PI * FOAM_BAKE.peak);
    // One component’s rms is L_int; a single draw of the modes is within a fifth of it.
    expect(Math.sqrt(square / (2 * n * n)) / lint).toBeGreaterThan(0.75);
    expect(Math.sqrt(square / (2 * n * n)) / lint).toBeLessThan(1.25);
    for (let k = 0; k <= n; k += 1) {
      expect(flow.ux[k * stride + n]).toBe(flow.ux[k * stride]);
      expect(flow.uy[n * stride + k]).toBe(flow.uy[k]);
    }
  });

  it('is the same flow for the same seed and a different one for another', () => {
    const a = new SurfaceFlow(parameters(), dt);
    const b = new SurfaceFlow(parameters(), dt);
    const c = new SurfaceFlow(parameters({ seed: 1 }), dt);
    a.step();
    b.step();
    c.step();
    expect(Array.from(a.ux.subarray(0, 50))).toEqual(Array.from(b.ux.subarray(0, 50)));
    expect(Array.from(a.ux.subarray(0, 50))).not.toEqual(Array.from(c.ux.subarray(0, 50)));
  });
});

/** Spearman’s rank correlation of two fields. */
function spearman(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const rank = (values: ArrayLike<number>) => {
    const order = Array.from({ length: values.length }, (_, k) => k).sort((i, j) => values[i] - values[j]);
    const ranks = new Float64Array(values.length);
    order.forEach((k, position) => { ranks[k] = position / values.length; });
    return ranks;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = ra.length;
  let sa = 0;
  let sb = 0;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let k = 0; k < n; k += 1) {
    sa += ra[k];
    sb += rb[k];
    sab += ra[k] * rb[k];
    saa += ra[k] ** 2;
    sbb += rb[k] ** 2;
  }
  return (sab / n - (sa / n) * (sb / n)) / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2));
}

describe('the traced density', () => {
  it('is 1 everywhere where nothing moves, and conserves the foam while the map does not fold', () => {
    const quiet = { ux: [new Float32Array(129 * 129)], uy: [new Float32Array(129 * 129)] };
    const { dx: still, dy: stillY } = traceBack(quiet, 128, 64, 1);
    for (const value of cellDensity(still, stillY, 128, 64)) expect(value).toBeCloseTo(1, 6);
    const flow = new SurfaceFlow(parameters(), dt);
    const history = flowHistory(flow, 6);
    const { dx, dy } = traceBack(history, 128, 128, 6);
    const density = cellDensity(dx, dy, 128, 128);
    let sum = 0;
    for (const value of density) sum += value;
    // Six steps in, no cell has folded: the densities average the uniform start’s 1, and the flow has gathered some foam.
    expect(sum / density.length).toBeCloseTo(1, 3);
    expect(Math.max(...density)).toBeGreaterThan(1.1);
  });

  it('puts the foam where floating particles carried by the same flow gather (Spearman rank correlation, smoothed over two cells)', () => {
    const flow = new SurfaceFlow(parameters(), dt);
    const history = flowHistory(flow, 48);
    const g = 128;
    const stride = g + 1;
    const grid = 256;
    const particles = 512;
    const random = mulberry32(17);
    const px = new Float64Array(particles * particles);
    const py = new Float64Array(particles * particles);
    for (let j = 0; j < particles; j += 1) {
      for (let i = 0; i < particles; i += 1) {
        px[j * particles + i] = (i + random()) / particles;
        py[j * particles + i] = (j + random()) / particles;
      }
    }
    const velocity = new Float64Array(2);
    const look = (ux: Float32Array, uy: Float32Array, x: number, y: number) => {
      const fx = (x - Math.floor(x)) * g;
      const fy = (y - Math.floor(y)) * g;
      const i = fx | 0;
      const j = fy | 0;
      const tx = fx - i;
      const ty = fy - j;
      const m = j * stride + i;
      velocity[0] = (1 - tx) * (1 - ty) * ux[m] + tx * (1 - ty) * ux[m + 1] + (1 - tx) * ty * ux[m + stride] + tx * ty * ux[m + stride + 1];
      velocity[1] = (1 - tx) * (1 - ty) * uy[m] + tx * (1 - ty) * uy[m + 1] + (1 - tx) * ty * uy[m + stride] + tx * ty * uy[m + stride + 1];
    };
    const histogram = (): Float32Array => {
      const counts = new Float32Array(grid * grid);
      for (let k = 0; k < px.length; k += 1) {
        const x = ((px[k] % 1) + 1) % 1;
        const y = ((py[k] % 1) + 1) % 1;
        counts[Math.floor(y * grid) * grid + Math.floor(x * grid)] += 1;
      }
      return counts;
    };
    const checks: [number, number][] = [[24, 0.8], [48, 0.7]];
    let step = 0;
    for (const [steps, least] of checks) {
      for (; step < steps; step += 1) {
        for (let k = 0; k < px.length; k += 1) {
          look(history.ux[step], history.uy[step], px[k], py[k]);
          look(history.ux[step], history.uy[step], px[k] + 0.5 * velocity[0] / g, py[k] + 0.5 * velocity[1] / g);
          px[k] += velocity[0] / g;
          py[k] += velocity[1] / g;
        }
      }
      const gathered = histogram();
      const { dx, dy } = traceBack(history, g, grid, steps);
      const traced = cellDensity(dx, dy, g, grid);
      blur(gathered, grid, 2);
      blur(traced, grid, 2);
      expect(spearman(gathered, traced)).toBeGreaterThan(least);
    }
  });
});

describe('the baked life cycle', () => {
  it('stores each stage as a unit Gaussian of ranks, so any covered share of it is exact', () => {
    expect(bake.size).toBe(FOAM_BAKE.size);
    expect(bake.early.length).toBe(bake.size * bake.size);
    for (const stage of [bake.early, bake.late]) {
      let mean = 0;
      let square = 0;
      for (const byte of stage) {
        const g = (byte / 127.5 - 1) * FOAM_RANGE;
        mean += g;
        square += g * g;
      }
      expect(mean / stage.length).toBeCloseTo(0, 1);
      expect(Math.sqrt(square / stage.length)).toBeCloseTo(1, 1);
      for (const share of [0.05, 0.2, 0.5, 0.8, 0.95]) {
        const threshold = 127.5 * (1 + inverseNormal(1 - share) / FOAM_RANGE);
        let covered = 0;
        for (const byte of stage) if (byte >= threshold) covered += 1;
        expect(Math.abs(covered / stage.length - share)).toBeLessThan(0.01);
      }
    }
  });

  it('draws the flow’s compressibility, 0.49', () => {
    expect(Math.abs(bake.compressibility - 0.49)).toBeLessThan(0.05);
  });

  it('tiles: the seam between a texel row and the next tile’s is no sharper than any other', () => {
    const size = bake.size;
    for (const stage of [bake.early, bake.late]) {
      let across = 0;
      let inside = 0;
      for (let k = 0; k < size; k += 1) {
        across += Math.abs(stage[k * size + size - 1] - stage[k * size]) + Math.abs(stage[(size - 1) * size + k] - stage[k]);
        inside += Math.abs(stage[k * size + 500] - stage[k * size + 501]) + Math.abs(stage[500 * size + k] - stage[501 * size + k]);
      }
      expect(across / inside).toBeLessThan(1.5);
    }
  });

  it('opens holes into lace and threads: the late stage is the same fluid aged, related to the early one but not the same field', () => {
    // The stages are a turnover and a half apart, and the flow has stirred the foam since: a weak, positive likeness.
    expect(bake.correlation).toBeGreaterThan(0.05);
    expect(bake.correlation).toBeLessThan(0.5);
    let differ = 0;
    for (let k = 0; k < bake.early.length; k += 1) if (Math.abs(bake.early[k] - bake.late[k]) > 20) differ += 1;
    expect(differ / bake.early.length).toBeGreaterThan(0.3);
  });

  it('is the same for the same parameters, and a different foam for another seed (a small bake)', () => {
    const small = { size: 128, trace: 64 };
    const a = bakeFoamCycle(small);
    const b = bakeFoamCycle(small);
    const c = bakeFoamCycle({ ...small, seed: 99 });
    expect(Array.from(a.early.subarray(0, 200))).toEqual(Array.from(b.early.subarray(0, 200)));
    expect(Array.from(a.late.subarray(0, 200))).toEqual(Array.from(b.late.subarray(0, 200)));
    expect(Array.from(a.late.subarray(0, 200))).not.toEqual(Array.from(c.late.subarray(0, 200)));
  });
});
