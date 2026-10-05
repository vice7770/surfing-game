import { describe, expect, it } from 'vitest';
import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';
import { sheetAcross, sheetExitNormals } from './lipSheet';

function tiltedSheet() {
  const profile = new Float64Array(2 * PROFILE_POINTS);
  const normals = new Float64Array(3 * PROFILE_POINTS);
  for (let i = 0; i < PROFILE_POINTS; i += 1) {
    profile[2 * i] = i;
    normals[3 * i + 1] = 1;
  }
  for (let i = LANDMARK.crest; i <= LANDMARK.lip; i += 1) {
    const t = (i - LANDMARK.crest) / (LANDMARK.lip - LANDMARK.crest);
    profile[2 * i] = 8 * t;
    profile[2 * i + 1] = 2 + 2 * t;
    normals.set([0.3, 0.4, Math.sqrt(0.75)], 3 * i);
  }
  for (let i = LANDMARK.lip + 1; i <= LANDMARK.throat; i += 1) {
    const t = (i - LANDMARK.lip) / (LANDMARK.throat - LANDMARK.lip);
    profile[2 * i] = 8 * (1 - t);
    profile[2 * i + 1] = 4 - 2.5 * t;
    normals.set([-0.3, -0.4, -Math.sqrt(0.75)], 3 * i);
  }
  return { profile, normals };
}

function curvedSheet() {
  const { profile, normals } = tiltedSheet();
  for (let i = LANDMARK.crest; i <= LANDMARK.lip; i += 1) {
    const x = (i - LANDMARK.crest) / 4;
    profile[2 * i] = x;
    profile[2 * i + 1] = Math.max(0, x - 4);
  }
  // The nearest outer foot is halfway along segment40->41, on the horizontal part.
  profile.set([2.125, -0.2], 2 * 72);
  normals.set([0, 1, 0], 3 * 40);
  normals.set([0, 0.6, 0.8], 3 * 41);
  normals.set([0, -1, 0], 3 * 72);
  return { profile, normals };
}

function expectNormal(out: Float32Array, point: number, expected: readonly number[]) {
  for (let c = 0; c < 3; c += 1) expect(out[3 * point + c]).toBeCloseTo(expected[c], 6);
}

describe('local opposite-side sheet exit normals', () => {
  it('pairs both sides of a tilted sheet and retains the full 3D normal', () => {
    const { profile, normals } = tiltedSheet();
    const out = new Float32Array(3 * PROFILE_POINTS);
    sheetExitNormals(profile, normals, out);
    expectNormal(out, 48, [-0.3, -0.4, -Math.sqrt(0.75)]);
    expectNormal(out, 76, [0.3, 0.4, Math.sqrt(0.75)]);
    expect(Math.hypot(...out.subarray(3 * 76, 3 * 77))).toBeCloseTo(1, 6);
  });

  it('interpolates normals at the local nearest foot of a curved sheet and clamps at its end', () => {
    const { profile, normals } = curvedSheet();
    profile.set([10, 4], 2 * 75);
    normals.set([0, 0, 2], 3 * LANDMARK.lip);
    const out = new Float32Array(3 * PROFILE_POINTS);
    sheetExitNormals(profile, normals, out);
    expectNormal(out, 72, [0, 2 / Math.sqrt(5), 1 / Math.sqrt(5)]);
    expectNormal(out, 75, [0, 0, 1]);
  });

  it('allows a curved-sheet exit ray that an unrelated mean chord incorrectly totally reflects', () => {
    const { profile, normals } = curvedSheet();
    const out = new Float32Array(3 * PROFILE_POINTS);
    sheetExitNormals(profile, normals, out);
    const opposite = Array.from(out.subarray(3 * 72, 3 * 73));
    const entryNormal = opposite.map(v => -v);
    const incident = [Math.cos(Math.PI / 12), Math.sin(Math.PI / 12), 0];
    const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
    // Independent Snell calculation: a negative discriminant is total internal reflection.
    const refract = (ray: readonly number[], normal: readonly number[], ratio: number) => {
      const cosine = dot(ray, normal);
      const k = 1 - ratio * ratio * (1 - cosine * cosine);
      return k < 0 ? null : ray.map((v, i) => ratio * v - (ratio * cosine + Math.sqrt(k)) * normal[i]);
    };
    const inside = refract(incident, entryNormal, 0.750188);
    expect(inside).not.toBeNull();
    const localExit = refract(inside!, entryNormal, 1.333);
    expect(localExit).not.toBeNull();
    expect(Math.hypot(...localExit!)).toBeGreaterThan(0.9);
    const dx = profile[2 * 60] - profile[2 * 40];
    const dy = profile[2 * 60 + 1] - profile[2 * 40 + 1];
    const chord = Math.hypot(dx, dy);
    const meanOuter = [-dy / chord, dx / chord, 0];
    const meanInward = dot(entryNormal, meanOuter) >= 0 ? meanOuter : meanOuter.map(v => -v);
    expect(dot(inside!, meanInward)).toBeLessThan(0);
    expect(refract(inside!, meanInward, 1.333)).toBeNull();
  });

  it('keeps own normalized normals at the crest, tip, throat and non-sheet points without changing inputs', () => {
    const { profile, normals } = curvedSheet();
    const points = [0, LANDMARK.crest, LANDMARK.lip, LANDMARK.throat, PROFILE_POINTS - 1];
    for (const i of points) normals.set([0, 3, 4], 3 * i);
    const beforeProfile = profile.slice();
    const beforeNormals = normals.slice();
    const out = new Float32Array(3 * PROFILE_POINTS);
    sheetExitNormals(profile, normals, out);
    for (const i of points) expectNormal(out, i, [0, 0.6, 0.8]);
    expect(profile).toEqual(beforeProfile);
    expect(normals).toEqual(beforeNormals);
  });

  it('uses finite own-normal fallbacks when the underside collapses or a normal is unusable', () => {
    const { profile, normals } = tiltedSheet();
    for (let i = LANDMARK.lip; i <= LANDMARK.throat; i += 1) profile.set([8, 4], 2 * i);
    normals.set([0, 3, 4], 3 * 48);
    normals.set([0, 0, 0], 3 * 49);
    normals.set([NaN, 0, 0], 3 * 50);
    const out = new Float32Array(3 * PROFILE_POINTS);
    sheetExitNormals(profile, normals, out);
    expectNormal(out, 48, [0, 0.6, 0.8]);
    expectNormal(out, 49, [0, 1, 0]);
    expectNormal(out, 50, [0, 1, 0]);
    expect(out.every(Number.isFinite)).toBe(true);
  });

  it('keeps the own normal when opposite segment normals cancel', () => {
    const { profile, normals } = curvedSheet();
    normals.set([0, 1, 0], 3 * 40);
    normals.set([0, -1, 0], 3 * 41);
    normals.set([0, -2, 0], 3 * 72);
    const out = new Float32Array(3 * PROFILE_POINTS);
    sheetExitNormals(profile, normals, out);
    expectNormal(out, 72, [0, -1, 0]);
    expect(out.every(Number.isFinite)).toBe(true);
  });

  it('preserves sheetAcross results when the accelerated scratch search is reused', () => {
    const { profile: drawn, normals } = curvedSheet();
    const profile = Float32Array.from(drawn);
    const across = new Float32Array(PROFILE_POINTS);
    const back = new Float32Array(PROFILE_POINTS);
    const formed = sheetAcross(profile, 1, across, back);
    const expectedAcross = across.slice();
    const expectedBack = back.slice();
    sheetExitNormals(drawn, normals, new Float32Array(3 * PROFILE_POINTS));
    across.fill(0);
    back.fill(0);
    expect(sheetAcross(profile, 1, across, back)).toBe(formed);
    expect(across).toEqual(expectedAcross);
    expect(back).toEqual(expectedBack);
  });
});
