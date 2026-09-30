import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';
import { toyCase } from './toyCase';

const flat = () => 0.5;
/** A straight front along +x at z = −100, 1 m apart, every point at τ `tau(k)`, thrown at z −100.2 once τ ≥ 0. */
function records(n: number, tau: (k: number) => number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau(k); out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7;
    out[o + FRONT_FIELD.throwZ] = tau(k) >= 0 ? -100.2 : Number.NaN;
  }
  return out;
}
const library = () => new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);
const loftOf = (tau: (k: number) => number, n = 21) => new SweptLoft(library(), 0.05).build(records(n, tau), n, 0.5, flat);

describe('the swept loft', () => {
  it('lofts a front every half metre, 1.5 m past each end, 134 vertices a slice', () => {
    const loft = loftOf(() => 0);
    expect(loft.sliceCount).toBe(Math.round((20 + 2 * LOFT.extension) / LOFT.spacing) + 1);
    expect(loft.vertexCount).toBe(loft.sliceCount * LOFT_SAMPLES);
    expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
  });

  it('stands each profile on the front’s shoreward normal, pinned to the water at both ends', () => {
    const loft = loftOf(() => 0);
    const middle = Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES;
    const at = (j: number) => ({ x: loft.positions[3 * (middle + j)], y: loft.positions[3 * (middle + j) + 1], z: loft.positions[3 * (middle + j) + 2] });
    // Along one slice x stays put and z runs shoreward; the pinned ends sit on the water, the crest above it.
    expect(at(0).x).toBeCloseTo(at(LOFT_SAMPLES - 1).x, 6);
    expect(at(LOFT_SAMPLES - 1).z).toBeGreaterThan(at(0).z);
    expect(at(0).y).toBe(0.5);
    expect(at(LOFT.extensionSamples).y).toBe(0.5);
    expect(at(LOFT.extensionSamples + 32).y).toBeGreaterThan(0.5);
    // A flat stretch's normal points up.
    expect(loft.normals[3 * (middle + 1) + 1]).toBeCloseTo(1, 6);
  });

  it('lifts the profile off the water but not its pinned ends, so the curl takes none of the water’s foam', () => {
    const loft = loftOf(() => 0);
    const middle = Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES;
    expect(loft.lift[middle]).toBe(0);
    expect(loft.lift[middle + LOFT.extensionSamples]).toBe(0);
    expect(loft.lift[middle + LOFT.extensionSamples + 32]).toBe(1);
    // A front's blended end lies on the water.
    expect(loft.lift[LOFT.extensionSamples + 32]).toBe(0);
  });

  it('anchors the τ = 0 crest at the throw point, and before the throw on the solver’s crest', () => {
    const thrown = loftOf(() => 0.1);
    const early = loftOf(() => -0.1);
    const crestZ = (loft: ReturnType<typeof loftOf>) => loft.positions[3 * (Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES + LOFT.extensionSamples + 32) + 2];
    // The toy's crest sits at x = 1 h0 at every τ; thrown, its τ = 0 origin is the throw point, before, the crest is the solver's.
    expect(crestZ(thrown)).toBeCloseTo(-100.2 + 7 * 1, 4);
    expect(crestZ(early)).toBeCloseTo(-100, 4);
    const middle = Math.floor(thrown.sliceCount / 2);
    expect(thrown.sliceCrestOffset[middle]).toBeCloseTo(6.8, 4);
    expect(early.sliceCrestOffset[middle]).toBeNaN();
  });

  it('blends into the water over 2.5 m at each end, and masks 1 m past them', () => {
    const loft = loftOf(() => 0);
    const first = LOFT.extensionSamples + 32;
    // The extended end slice is the water, unmasked; the middle slice is masked.
    expect(loft.positions[3 * first + 1]).toBe(0.5);
    expect(loft.mask[first]).toBe(0);
    expect(loft.mask[Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES + first]).toBe(1);
  });

  it('fades a slice into the water after touchdown and drops its mask', () => {
    // The toy's touchdown is 0.5 √(7/g) ≈ 0.42 s; just past the 0.3 s handover it is gone.
    const loft = loftOf(() => 0.5 * Math.sqrt(7 / 9.81) + LOFT.handover + 0.01);
    const middle = Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES;
    expect(loft.positions[3 * (middle + LOFT.extensionSamples + 32) + 1]).toBe(0.5);
    expect(loft.mask[middle + LOFT.extensionSamples + 32]).toBe(0);
    expect(loft.slicePhase[Math.floor(loft.sliceCount / 2)]).toBe(2);
  });

  it('refines where neighbouring clocks differ by more than three frames', () => {
    // A frame is 0.25 √(7/g) = 0.21 s, so three are 0.63 s; a clock stepping 1.5 s per metre differs by 0.75 s a slice.
    const coarse = loftOf(() => 0);
    const steep = loftOf((k) => k * 1.5);
    expect(steep.sliceCount).toBeGreaterThan(coarse.sliceCount);
  });

  // Review Focus 1.
  it('draws nothing for a front of one point, or of points bunched at one σ, and stays finite', () => {
    const one = loftOf(() => 0, 1);
    expect(one.vertexCount).toBe(0);
    expect(one.indexCount).toBe(0);
    const bunched = records(3, () => 0);
    for (let k = 0; k < 3; k += 1) bunched[k * FRONT_STRIDE + FRONT_FIELD.sigma] = 4;
    expect(new SweptLoft(library(), 0.05).build(bunched, 3, 0.5, flat).vertexCount).toBe(0);
  });

  // Review Focus 2.
  it('counts a foot crest outside the library as clamped, and still draws it', () => {
    const recs = records(5, () => 0);
    for (let k = 0; k < 5; k += 1) recs[k * FRONT_STRIDE + FRONT_FIELD.footHeight] = 0.35; // A0 0.05
    const loft = new SweptLoft(library(), 0.05).build(recs, 5, 0.5, flat);
    expect(loft.clampedLookups).toBe(loft.sliceCount);
    expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
  });

  it('keeps to its budget on a long front, clamping the clock steps it must', () => {
    const loft = loftOf((k) => (k % 2) * 2, 400);
    expect(loft.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    expect(loft.clamps).toBeGreaterThan(0);
  });

  it('knows a slice’s times without building its profile', () => {
    const out = new Float32Array(2 * PROFILE_POINTS);
    const query = { slope: 0.05, footHeight: 2.1, footDepth: 7 };
    const lookup = library().profileAt({ ...query, seconds: 0.2 }, out);
    const times = library().profileTimes(query);
    expect(times).toEqual({ scale: lookup.scale, clamped: lookup.clamped, touchdownSeconds: lookup.touchdownSeconds, frameSeconds: lookup.frameSeconds });
  });
});
