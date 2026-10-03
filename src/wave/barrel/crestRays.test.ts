import { describe, expect, it } from 'vitest';
import { authoredCrestReach, CrestRayPlan, minimumCrestRaySpacing, type FrontRayControl } from './crestRays';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { tubeCase } from './toyCase';

const library = () => new ProfileLibrary([tubeCase(0.2), tubeCase(0.4)]);
const controlsAt = (x: number[], z: number[], height = 2.1, depth = 7): FrontRayControl[] => {
  let sigma = 0;
  return x.map((v, k) => {
    if (k > 0) sigma += Math.sqrt((v - x[k - 1]) ** 2 + (z[k] - z[k - 1]) ** 2);
    return { x: v, z: z[k], sigma, footHeight: height, footDepth: depth };
  });
};
const captured = (controls: FrontRayControl[]) => controls.map(c => ({ x: Math.fround(c.x), z: Math.fround(c.z),
  sigma: Math.fround(c.sigma), footHeight: Math.fround(c.footHeight), footDepth: Math.fround(c.footDepth) }));
const recordsOf = (controls: FrontRayControl[]) => {
  const records = new Float32Array(controls.length * FRONT_STRIDE);
  controls.forEach((c, k) => {
    for (const key of ['x', 'z', 'sigma', 'footHeight', 'footDepth'] as const) records[k * FRONT_STRIDE + FRONT_FIELD[key]] = c[key];
  });
  return records;
};

/** Independent original polyline/extrapolation and ±2m ray computation. */
const pointAt = (controls: FrontRayControl[], sigma: number): [number, number] => {
  const last = controls.length - 1;
  if (sigma <= controls[0].sigma || sigma >= controls[last].sigma) {
    const k = sigma <= controls[0].sigma ? 0 : last;
    const other = k === 0 ? 1 : last - 1;
    const dx = controls[k].x - controls[other].x;
    const dz = controls[k].z - controls[other].z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const beyond = k === 0 ? controls[0].sigma - sigma : sigma - controls[last].sigma;
    return [controls[k].x + (beyond * dx) / length, controls[k].z + (beyond * dz) / length];
  }
  let k = 0;
  while (controls[k + 1].sigma < sigma) k += 1;
  const share = (sigma - controls[k].sigma) / (controls[k + 1].sigma - controls[k].sigma);
  return [controls[k].x + share * (controls[k + 1].x - controls[k].x), controls[k].z + share * (controls[k + 1].z - controls[k].z)];
};
const rawRay = (controls: FrontRayControl[], sigma: number) => {
  const a = pointAt(controls, sigma - 2);
  const b = pointAt(controls, sigma + 2);
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.sqrt(dx * dx + dz * dz);
  return [-dz / length, dx / length];
};
const samples = (controls: FrontRayControl[], spacing = 0.25) => {
  const first = Math.fround(controls[0].sigma) - 1.5;
  const last = Math.fround(controls.at(-1)!.sigma) + 1.5;
  const n = Math.ceil((last - first) / spacing);
  return Array.from({ length: n + 1 }, (_, k) => first + (last - first) * k / n);
};
/** Independent direct vertex test: varying offsets at both endpoints, including float32 upload rounding. */
const minimumStoredAdvance = (controls: FrontRayControl[], plan: CrestRayPlan, reach = 15.5) => {
  const c = captured(controls);
  const sigmas = samples(c);
  const rays = sigmas.map(sigma => Array.from(plan.rayAt(sigma, new Float64Array(2))));
  let minimum = Infinity;
  for (let s = 0; s + 1 < sigmas.length; s += 1) {
    const a = pointAt(c, sigmas[s]);
    const b = pointAt(c, sigmas[s + 1]);
    for (const u of [-reach, 0, reach]) for (const v of [-reach, 0, reach]) {
      const dx = Math.fround(b[0] + v * rays[s + 1][0]) - Math.fround(a[0] + u * rays[s][0]);
      const dz = Math.fround(b[1] + v * rays[s + 1][1]) - Math.fround(a[1] + u * rays[s][1]);
      minimum = Math.min(minimum, dx * Math.fround(rays[s][1]) - dz * Math.fround(rays[s][0]),
        dx * Math.fround(rays[s + 1][1]) - dz * Math.fround(rays[s + 1][0]));
    }
  }
  return minimum;
};

describe('the authoritative full-front crest ray plan', () => {
  it('bounds the refined spacing of every evenly divided shoulder span', () => {
    const minimum = minimumCrestRaySpacing(1.5, 0.5);
    for (const span of [3.0001, 3.49999, 3.5, 3.50001, 4.01, 10.3, 325.492]) {
      expect(0.5 * span / Math.ceil(span / 0.5)).toBeGreaterThan(minimum);
    }
  });
  it('keeps original straight and angled ray arithmetic exactly, including the shoulder extensions', () => {
    for (const slope of [0, 0.75]) {
      const x = Array.from({ length: 31 }, (_, k) => k * 0.5);
      const controls = controlsAt(x, x.map(v => slope * v));
      const plan = new CrestRayPlan(library(), 0.05);
      plan.prepare(controls);
      expect(plan.diagnostics.blend).toBe(0);
      for (const sigma of samples(controls)) expect(Array.from(plan.rayAt(sigma, new Float64Array(2)))).toEqual(rawRay(captured(controls), sigma));
      expect(minimumStoredAdvance(controls, plan)).toBeGreaterThan(0.24);
    }
  });

  it('retains a valid gentle curve instead of regularizing every front', () => {
    const x = Array.from({ length: 61 }, (_, k) => k * 0.5);
    const controls = controlsAt(x, x.map(v => 0.0002 * v * v));
    const plan = new CrestRayPlan(library(), 0.05);
    plan.prepare(controls);
    expect(plan.diagnostics.blend).toBe(0);
    for (const sigma of samples(controls)) expect(Array.from(plan.rayAt(sigma, new Float64Array(2)))).toEqual(rawRay(captured(controls), sigma));
    expect(minimumStoredAdvance(controls, plan)).toBeGreaterThan(0.23);
  });

  it('prevents both endpoint half-planes reversing over the complete reach of a captured Padang-style kink', () => {
    const x = Array.from({ length: 21 }, (_, k) => 130 + k);
    const z = x.map(() => -3.5);
    z[10] = -6.420957;
    const controls = controlsAt(x, z);
    const before = structuredClone(controls);
    const plan = new CrestRayPlan(library(), 0.05);
    plan.prepare(controls);
    expect(plan.diagnostics.blend).toBeGreaterThan(0);
    expect(plan.diagnostics.blend).toBeLessThan(1);
    expect(plan.diagnostics.invalidIntervals).toBe(0);
    expect(plan.diagnostics.minimumAdvancePerSigma).toBeGreaterThan(0);
    expect(minimumStoredAdvance(controls, plan)).toBeGreaterThan(0);
    expect(controls).toEqual(before);
    for (const sigma of samples(controls)) {
      const ray = plan.rayAt(sigma, new Float64Array(2));
      expect(ray[0] ** 2 + ray[1] ** 2).toBeCloseTo(1, 14);
    }
    const fixed = plan.diagnostics.blend;
    plan.diagnostics.blend = 0;
    expect(minimumStoredAdvance(controls, plan)).toBeLessThan(-1);
    plan.diagnostics.blend = fixed;
  });

  it('leaves rounding room at a translated world origin, with stale sigma speed and varying row offsets', () => {
    const x = Array.from({ length: 21 }, (_, k) => 10_000 + k * 0.5);
    const z = x.map(() => -10_000);
    z[10] -= 3;
    const controls = controlsAt(x, z, 9, 30);
    controls.forEach((c, k) => { c.sigma = k * 0.5; });
    const plan = new CrestRayPlan(library(), 0.05);
    plan.prepare(controls);
    expect(plan.diagnostics.invalidIntervals).toBe(0);
    expect(minimumStoredAdvance(controls, plan, 61.5)).toBeGreaterThan(0);
  });

  it('uses identical transport-quantized controls for objects and records, independently of clocks and phases', () => {
    const controls = controlsAt([0.1, 1.1, 2.1, 3.1, 4.1], [0, 0, -3, 0, 0]);
    const objectPlan = new CrestRayPlan(library(), 0.05);
    const recordPlan = new CrestRayPlan(library(), 0.05);
    objectPlan.prepare(controls);
    const records = recordsOf(controls);
    records.forEach((_, i) => { if (i % FRONT_STRIDE === FRONT_FIELD.tau) records[i] = i; });
    recordPlan.prepareRecords(records, 0, controls.length);
    expect(recordPlan.diagnostics).toEqual(objectPlan.diagnostics);
    for (const sigma of samples(controls, 0.137)) expect(recordPlan.rayAt(sigma, new Float64Array(2))).toEqual(objectPlan.rayAt(sigma, new Float64Array(2)));
    controls[2].z = -1;
    objectPlan.prepare(controls);
    expect(objectPlan.diagnostics).not.toEqual(recordPlan.diagnostics);
  });

  it('reports reversed/coincident anchors and non-finite data as input defects', () => {
    const plan = new CrestRayPlan(library(), 0.05);
    const controls = controlsAt([0, 1, 0], [0, 0, 0]);
    plan.prepare(controls);
    expect(plan.diagnostics.invalidIntervals).toBe(1);
    expect(plan.diagnostics.blend).toBe(0);
    controls[0].z = Number.NaN;
    expect(() => plan.prepare(controls)).toThrow('Non-finite front ray control');
  });

  it('diagnoses world coordinates whose float32 allowance exceeds their available advance', () => {
    const controls = controlsAt([10_000_000, 10_000_001, 10_000_002], [0, 0, 0]);
    const plan = new CrestRayPlan(library(), 0.05);
    plan.prepare(controls);
    expect(plan.diagnostics.invalidIntervals).toBe(1);
    expect(plan.diagnostics.blend).toBe(1);
    expect(plan.diagnostics.minimumAdvancePerSigma).toBe(0);
  });

  it('is repeatable and does not retain a prior front’s correction when preparing a new front', () => {
    const plan = new CrestRayPlan(library(), 0.05);
    const a = controlsAt([0, 1, 2, 3, 4], [0, 0, -3, 0, 0]);
    plan.prepare(a);
    const diagnostics = { ...plan.diagnostics };
    const ray = plan.rayAt(2, new Float64Array(2));
    plan.prepare(a);
    expect(plan.diagnostics).toEqual(diagnostics);
    expect(plan.rayAt(2, new Float64Array(2))).toEqual(ray);
    plan.prepare(controlsAt([0, 1, 2, 3, 4], [0, 0, 0, 0, 0]));
    expect(plan.diagnostics.blend).toBe(0);
  });

  it('remains continuous at the former mean-frame fallback boundary', () => {
    const a = controlsAt([0, 1, 2, 3], [0, -3, -2, 1 - 1e-5]);
    const b = controlsAt([0, 1, 2, 3], [0, -3, -2, 1 + 1e-5]);
    const pa = new CrestRayPlan(library(), 0.05);
    const pb = new CrestRayPlan(library(), 0.05);
    pa.prepare(a); pb.prepare(b);
    expect(minimumStoredAdvance(a, pa)).toBeGreaterThan(0);
    expect(minimumStoredAdvance(b, pb)).toBeGreaterThan(0);
    for (const sigma of samples(a)) {
      const ra = pa.rayAt(sigma, new Float64Array(2));
      const rb = pb.rayAt(sigma, new Float64Array(2));
      expect(Math.sqrt((ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2)).toBeLessThan(1e-4);
    }
  });

  it('does not pop when shifted source knots coincide and an interval appears or vanishes', () => {
    // The exact interval derivative maximum previously jumped by 0.014 in blend for a 10µm change in this fixture.
    const z = [0.22437254, -0.17998546, -0.18095241, -0.19335199, -0.10809441, -0.23022454, 0.11734867, -0.08078657, -0.14444753];
    const plans = [-1e-5, 0, 1e-5].map(epsilon => {
      const c = controlsAt(z.map((_, k) => k), z, 0.3, 1);
      c.forEach((v, k) => { v.sigma = k + (k === 4 ? epsilon : 0); });
      const plan = new CrestRayPlan(library(), 0.05);
      plan.prepare(c);
      return plan;
    });
    const weights = plans.map(p => p.diagnostics.blend);
    expect(Math.max(...weights) - Math.min(...weights)).toBeLessThan(2e-5);
    for (let sigma = -1.5; sigma <= 9.5; sigma += 0.137) {
      const a = plans[0].rayAt(sigma, new Float64Array(2));
      const b = plans[2].rayAt(sigma, new Float64Array(2));
      expect(15.5 * Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)).toBeLessThan(0.001);
    }
  });
});

describe('the phase-independent authored envelope', () => {
  it('bounds all nearest-slope frames relative to their own crest, retaining the first slope on a tie', () => {
    const frames = (values: number[]) => Float32Array.from(values.flatMap(value => [value, 0]));
    const cases = [{ slope: 0.5, frames: frames([-2, 1, 3, 2, 4, 9]) },
      { slope: 1.5, frames: frames([-100, 0, 100]) }, { slope: 0.5, frames: frames([-3, 0, 4]) }];
    expect(authoredCrestReach(cases, 1, 3, 1)).toEqual(Float64Array.from([-3, 5]));
    expect(authoredCrestReach(cases, 1.5, 3, 1)).toEqual(Float64Array.from([-100, 100]));
  });
});
