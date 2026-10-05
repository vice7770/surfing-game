import { describe, expect, it } from 'vitest';
import { CrestRayPlan, type FrontRayControl } from './crestRays';
import { ProfileLibrary } from './ProfileLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';

const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const slope = 1 / 19;
function controls(zAt: (x: number) => number): FrontRayControl[] {
  let sigma = 0;
  return [-10, -6, 0, 3, 7, 11, 15, 17, 21].map((x, i, xs) => {
    const z = Math.fround(zAt(x));
    if (i) sigma += Math.hypot(x - xs[i - 1], z - Math.fround(zAt(xs[i - 1])));
    return { x, z, sigma: Math.fround(sigma), footHeight: 2, footDepth: 7 };
  });
}
function recordsOf(rows: FrontRayControl[]) {
  const records = new Float32Array(rows.length * FRONT_STRIDE);
  rows.forEach((row, i) => { for (const key of ['x', 'z', 'sigma', 'footHeight', 'footDepth'] as const)
    records[i * FRONT_STRIDE + FRONT_FIELD[key]] = row[key]; });
  return records;
}

function anchorAt(rows: FrontRayControl[], sigma: number): number[] {
  const last = rows.length - 1;
  if (sigma <= rows[0].sigma || sigma >= rows[last].sigma) {
    const k = sigma <= rows[0].sigma ? 0 : last, n = k === 0 ? 1 : last - 1;
    const dx = rows[k].x - rows[n].x, dz = rows[k].z - rows[n].z, length = Math.hypot(dx, dz);
    const beyond = k === 0 ? rows[0].sigma - sigma : sigma - rows[last].sigma;
    return [rows[k].x + beyond * dx / length, rows[k].z + beyond * dz / length];
  }
  let k = 0;
  while (rows[k + 1].sigma < sigma) k += 1;
  const t = (sigma - rows[k].sigma) / (rows[k + 1].sigma - rows[k].sigma);
  return [rows[k].x + t * (rows[k + 1].x - rows[k].x), rows[k].z + t * (rows[k + 1].z - rows[k].z)];
}
function intervals(rows: FrontRayControl[]) {
  const first = rows[0].sigma - 1.5, span = rows.at(-1)!.sigma - rows[0].sigma + 3;
  const n = Math.ceil(span / 0.5), step = span / n;
  return Array.from({ length: 2 * n + 1 }, (_, k) => first + 0.5 * k * step);
}
function storedAdvance(rows: FrontRayControl[], plan: CrestRayPlan) {
  const samples = intervals(rows); let minimum = Infinity;
  for (let i = 0; i + 1 < samples.length; i += 1) {
    const a = anchorAt(rows, samples[i]), b = anchorAt(rows, samples[i + 1]);
    const ra = plan.rayAt(samples[i], new Float64Array(2)), rb = plan.rayAt(samples[i + 1], new Float64Array(2));
    for (const u of [-100, 0, 100]) for (const v of [-100, 0, 100]) {
      const dx = Math.fround(b[0] + v * rb[0]) - Math.fround(a[0] + u * ra[0]);
      const dz = Math.fround(b[1] + v * rb[1]) - Math.fround(a[1] + u * ra[1]);
      minimum = Math.min(minimum, dx * ra[1] - dz * ra[0], dx * rb[1] - dz * rb[0]);
      expect(dx).toBeGreaterThanOrEqual(plan.diagnostics.minimumAdvancePerSigma * (samples[i + 1] - samples[i]));
    }
  }
  return minimum;
}
describe('bounded-C shoreward parallel rays', () => {
  it('keeps local rays fixed through remote end removal, translation and sigma rebase', () => {
    const full = controls(x => 0.02 * x * x - 100), local = full.filter(r => r.x >= 7);
    const rebased = local.map(r => ({ ...r, sigma: r.sigma - local[0].sigma }));
    const moved = rebased.map(r => ({ ...r, x: r.x + 4096, z: r.z - 8192, sigma: r.sigma + 32 }));
    for (const rows of [full, local, rebased, moved]) {
      const before = structuredClone(rows), plan = new CrestRayPlan(library, slope);
      const recordPlan = new CrestRayPlan(library, slope);
      plan.prepare(rows); recordPlan.prepareRecords(recordsOf(rows), 0, rows.length);
      expect(plan.diagnostics.invalidIntervals).toBe(0);
      expect(recordPlan.diagnostics).toEqual(plan.diagnostics);
      for (const at of intervals(rows)) {
        expect(Array.from(plan.rayAt(at, new Float64Array(2)))).toEqual([0, 1]);
        expect(recordPlan.rayAt(at, new Float64Array(2))).toEqual(plan.rayAt(at, new Float64Array(2)));
      }
      expect(rows).toEqual(before);
    }
  });

  it('keeps positive stored endpoint halfplanes on straight, oblique and kinked fronts including shoulders', () => {
    const fixtures = [controls(() => -100), controls(x => -100 + 0.6 * x),
      controls(x => -100 + (x < 7 ? 0.3 * x : 2.1 - 0.4 * (x - 7)))];
    for (const rows of fixtures) {
      const plan = new CrestRayPlan(library, slope); plan.prepare(rows);
      expect(plan.diagnostics.invalidIntervals).toBe(0);
      expect(storedAdvance(rows, plan)).toBeGreaterThan(0);
    }
  });

  it('diagnoses collapsed/reversed controls and unresolved upload spacing without moving a vertex', () => {
    const valid = [{ x: 0, z: 0, sigma: 0, footHeight: 2, footDepth: 7 }, { x: 1, z: 1, sigma: 1, footHeight: 2, footDepth: 7 }];
    const plan = new CrestRayPlan(library, slope); plan.prepare(valid);
    expect(plan.diagnostics.minimumAdvancePerSigma).toBeGreaterThan(0.7);
    for (const xs of [[0, 0], [1, 0], [10_000_000, 10_000_001]]) {
      const c = valid.map((r, k) => ({ ...r, x: xs[k] })), before = structuredClone(c);
      plan.prepare(c); expect(plan.diagnostics.invalidIntervals).toBeGreaterThan(0); expect(c).toEqual(before);
    }
    expect(() => plan.prepare([{ ...valid[0], z: NaN }, valid[1]])).toThrow('Non-finite');
  });

  it('retains the crest normal in RAW mode on a straight 3-4-5 front', () => {
    const rows = [0, 1, 2].map(k => ({ x: 3 * k, z: 4 * k, sigma: 5 * k, footHeight: 2, footDepth: 7 }));
    const before = structuredClone(rows), plan = new CrestRayPlan(new ProfileLibrary(cases), slope);
    plan.prepare(rows); expect(plan.diagnostics.invalidIntervals).toBe(0);
    for (const at of intervals(rows)) {
      const ray = plan.rayAt(at, new Float64Array(2));
      expect(ray[0]).toBeCloseTo(-0.8, 12); expect(ray[1]).toBeCloseTo(0.6, 12);
      expect(Math.hypot(ray[0], ray[1])).toBeCloseTo(1, 12);
    }
    expect(rows).toEqual(before);
  });
});
