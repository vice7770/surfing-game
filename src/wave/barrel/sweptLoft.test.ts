import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
import { toyCase, tubeCase } from './toyCase';

const flat = () => 0.5;
/** A straight front along +x at z = −100, 1 m apart, every point at τ `tau(k)`, thrown at z `throwZ` once τ ≥ 0. */
function records(n: number, tau: (k: number) => number, throwZ = -100.2): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau(k); out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7;
    out[o + FRONT_FIELD.throwZ] = tau(k) >= 0 ? throwZ : Number.NaN;
  }
  return out;
}
const library = () => new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);
const loftOf = (tau: (k: number) => number, n = 21, throwZ = -100.2) => new SweptLoft(library(), 0.05).build(records(n, tau, throwZ), n, 0.5, flat);
/** The toy's touchdown, s: 0.5 √(7/g). */
const TOUCHDOWN = 0.5 * Math.sqrt(7 / 9.81);

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

  const crestZ = (loft: ReturnType<typeof loftOf>) => loft.positions[3 * (Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES + LOFT.extensionSamples + 32) + 2];

  it('anchors the τ = 0 crest at the throw point, and before the throw on the solver’s crest', () => {
    // The toy's crest sits at x = 1 h0 = 7 m at every τ; thrown at z −106, it stands at −99, 1 m ahead of the solver's.
    const thrown = loftOf(() => 0.1, 21, -106);
    const early = loftOf(() => -0.1);
    expect(crestZ(thrown)).toBeCloseTo(-99, 4);
    expect(crestZ(early)).toBeCloseTo(-100, 4);
    const middle = Math.floor(thrown.sliceCount / 2);
    expect(thrown.sliceCrestOffset[middle]).toBeCloseTo(1, 4);
    expect(thrown.sliceLife[middle]).toBeCloseTo(0.1 / TOUCHDOWN, 4);
    expect(early.sliceCrestOffset[middle]).toBeNaN();
    expect(thrown.caps).toBe(0);
  });

  it('hands the anchor back to the solver’s crest from 80 % of the open time, where the capped slices cluster (the advisor, 2026-09-30)', () => {
    // Thrown at z −106 the drawn crest stands at −99, the solver's at −100: held until 0.8 of the touchdown time,
    // then halfway back 0.15 s (half the handover) later.
    expect(crestZ(loftOf(() => 0.5 * TOUCHDOWN, 21, -106))).toBeCloseTo(-99, 4);
    expect(crestZ(loftOf(() => 0.8 * TOUCHDOWN + LOFT.handover / 2, 21, -106))).toBeCloseTo(-99.5, 4);
  });

  it('soft-caps the drawn crest’s distance from the solver’s at 2.5 m, and counts the caps (the advisor, 2026-09-30)', () => {
    // Thrown at z −100.2, the crest would stand 6.8 m ahead: drawn at 1.5 + 5.3 / (1 + 5.3) m.
    const loft = loftOf(() => 0.1);
    const middle = Math.floor(loft.sliceCount / 2);
    expect(crestZ(loft)).toBeCloseTo(-100 + 1.5 + 5.3 / 6.3, 4);
    expect(loft.sliceCrestOffset[middle]).toBeCloseTo(6.8, 4);
    expect(loft.caps).toBe(loft.sliceCount);
  });

  it('blends into the water over 2.5 m at each end, and masks 1 m past them', () => {
    const loft = loftOf(() => 0);
    const first = LOFT.extensionSamples + 32;
    // The extended end slice is the water, unmasked; the middle slice is masked.
    expect(loft.positions[3 * first + 1]).toBe(0.5);
    expect(loft.mask[first]).toBe(0);
    expect(loft.mask[Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES + first]).toBe(1);
  });

  it('fades a slice into the water over the handover after touchdown', () => {
    // Halfway through the 0.3 s handover the toy's 3.5 m crest stands half as high over the 0.5 m water.
    const loft = loftOf(() => TOUCHDOWN + LOFT.handover / 2);
    const middle = Math.floor(loft.sliceCount / 2);
    expect(loft.positions[3 * (middle * LOFT_SAMPLES + LOFT.extensionSamples + 32) + 1]).toBeCloseTo(0.5 + 0.5 * 3.5, 4);
    expect(loft.slicePhase[middle]).toBe(2);
  });

  it('drops a slice once it has faded into the water, and never joins the slices either side of it (the advisor, 2026-09-30)', () => {
    expect(loftOf(() => TOUCHDOWN + LOFT.handover + 0.01).vertexCount).toBe(0);
    // Points 0–9 open, 10–20 long faded: only the open part is lofted, as one run.
    const loft = loftOf((k) => (k < 10 ? 0.1 : 5));
    const whole = loftOf(() => 0.1);
    expect(loft.sliceCount).toBeGreaterThan(0);
    expect(loft.sliceCount).toBeLessThan(whole.sliceCount);
    expect(loft.vertexCount).toBe(loft.sliceCount * LOFT_SAMPLES);
    for (let s = 0; s < loft.sliceCount; s += 1) expect(loft.sliceTau[s]).toBeLessThan(TOUCHDOWN + LOFT.handover);
    expect(loft.indexCount).toBe(6 * (LOFT_SAMPLES - 1) * (loft.sliceCount - 1));
  });

  it('refines where neighbouring clocks differ by more than three frames', () => {
    // A frame is 0.25 √(7/g) = 0.21 s, so three are 0.63 s; a clock jumping 1.5 s between two points differs by 0.75 s
    // across each of the two slices over the jump, so each gets a midpoint.
    const coarse = loftOf(() => 0);
    const steep = loftOf((k) => (k < 10 ? -1 : 0.5));
    expect(steep.sliceCount).toBe(coarse.sliceCount + 2);
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
    const loft = loftOf((k) => (k % 2) * 0.6, 400);
    expect(loft.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    expect(loft.clamps).toBeGreaterThan(0);
  });

  it('knows a slice’s times without building its profile', () => {
    const out = new Float32Array(2 * PROFILE_POINTS);
    const query = { slope: 0.05, footHeight: 2.1, footDepth: 7 };
    const lookup = library().profileAt({ ...query, seconds: 0.2 }, out);
    const times = library().profileTimes(query);
    expect(times).toEqual({
      scale: lookup.scale, clamped: lookup.clamped, touchdownSeconds: lookup.touchdownSeconds, frameSeconds: lookup.frameSeconds, clearSeconds: lookup.clearSeconds,
    });
  });
});

const tubes = () => new ProfileLibrary([tubeCase(0.3)]);
/** The toy tube's τ unit at h0 = 7 m, s: its touchdown is 0.5 of it, its last clear frame 0.25. */
const TUBE_UNIT = Math.sqrt(7 / 9.81);
/** The slice at σ in a loft. */
const sliceAt = (loft: LoftResult, sigma: number) => {
  for (let s = 0; s < loft.sliceCount; s += 1) if (Math.abs(loft.sliceSigma[s] - sigma) < 1e-4) return s;
  throw new Error(`no slice at σ ${sigma}`);
};

describe('the loft’s slices, for the contact', () => {
  it('records each slice’s ray, weight, joins and whether it overhangs', () => {
    const loft = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    const middle = sliceAt(loft, 10);
    expect(loft.sliceRayX[middle]).toBeCloseTo(0, 6);
    expect(loft.sliceRayZ[middle]).toBeCloseTo(1, 6);
    expect(loft.sliceWeight[middle]).toBe(1);
    expect(loft.sliceOverturned[middle]).toBe(1);
    expect(loft.sliceJoined[middle]).toBe(1);
    expect(loft.sliceJoined[loft.sliceCount - 1]).toBe(0);
    const tent = new SweptLoft(tubes(), 0.05).build(records(21, () => -0.3), 21, 0.5, flat);
    expect(tent.sliceOverturned[sliceAt(tent, 10)]).toBe(0);
  });

  it('carries the tip’s velocity, and the anchor’s while it hands over', () => {
    const open = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    const middle = sliceAt(open, 10);
    expect(open.sliceTipAlong[middle]).toBeCloseTo(0.9 * Math.sqrt(9.81 * 7), 3);
    expect(open.sliceTipUp[middle]).toBeCloseTo(-0.3 * Math.sqrt(9.81 * 7), 3);
    expect(open.sliceAnchorVZ[middle]).toBe(0);
    // Thrown 3 m behind the solver's crest (soft-capped to 2.1 m), handing over: the anchor runs to the crest over 0.3 s.
    const handing = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.85 * 0.5 * TUBE_UNIT, -103), 21, 0.5, flat);
    expect(handing.sliceAnchorVZ[sliceAt(handing, 10)]).toBeCloseTo(2.1 / LOFT.handover, 3);
  });

  it('asks the water’s height only where a vertex rests on it', () => {
    let calls = 0;
    const counted = (x: number, z: number) => {
      calls += 1;
      return flat(x, z);
    };
    const loft = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, counted);
    expect(calls).toBeLessThan(loft.vertexCount / 2);
    const crest = sliceAt(loft, 10) * LOFT_SAMPLES + LOFT.extensionSamples + 32;
    expect(loft.positions[3 * crest + 1]).toBeCloseTo(0.5 + 0.8 * 7, 5);
  });

  it('in contact mode cuts overturned slices under full weight at 0.5, and counts them', () => {
    const drawn = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    const contact = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => 0.1), 21, 0.5, flat);
    expect(contact.cuts).toBeGreaterThan(0);
    expect(contact.sliceCount).toBeLessThan(drawn.sliceCount);
    for (let s = 0; s < contact.sliceCount; s += 1) if (contact.sliceOverturned[s]) expect(contact.sliceWeight[s]).toBe(1);
    expect(drawn.cuts).toBe(0);
  });

  it('in contact mode holds the geometry at the last clear frame after touchdown, but keeps the clock', () => {
    const late = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => 0.5 * TUBE_UNIT + 0.1, -100), 21, 0.5, flat);
    const held = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => 0.25 * TUBE_UNIT, -100), 21, 0.5, flat);
    const a = sliceAt(late, 10);
    const b = sliceAt(held, 10);
    expect(late.sliceTau[a]).toBeCloseTo(0.5 * TUBE_UNIT + 0.1, 5);
    expect(late.slicePhase[a]).toBe(2);
    const at = (loft: LoftResult, s: number) => Array.from(loft.positions.subarray(3 * s * LOFT_SAMPLES, 3 * (s + 1) * LOFT_SAMPLES));
    expect(at(late, a)).toEqual(at(held, b));
  });
});
