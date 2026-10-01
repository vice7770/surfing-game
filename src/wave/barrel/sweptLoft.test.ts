import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SHEET, SweptLoft, sheetAcross, tubeSkyView, type LoftResult } from './sweptLoft';
import { lipCase, toyCase, tubeCase } from './toyCase';

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
    // then a sixth of the way back 0.05 s (a sixth of the handover) later.
    expect(crestZ(loftOf(() => 0.5 * TOUCHDOWN, 21, -106))).toBeCloseTo(-99, 4);
    expect(crestZ(loftOf(() => 0.8 * TOUCHDOWN + LOFT.handover / 6, 21, -106))).toBeCloseTo(-99 - 1 / 6, 4);
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

  it('fades a slice into the water over its tube’s collapse after touchdown, drawing the touchdown frame (the advisor, 2026-09-30)', () => {
    // The toy tube at h0 7 m: its void 0.567 h0 tall, so it collapses over √(2 × 3.97 m / g) = 0.90 s. Halfway through,
    // its 5.6 m crest stands half as high over the 0.5 m water, where the touchdown frame put it.
    const times = tubes().profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 });
    expect(times.collapseSeconds).toBeCloseTo(Math.sqrt((2 * (0.6 - 0.2 / 6) * 7) / 9.81), 4);
    const loftAt = (tau: number) => new SweptLoft(tubes(), 0.05).build(records(21, () => tau, -100), 21, 0.5, flat);
    const touchdown = loftAt(times.touchdownSeconds);
    const halfway = loftAt(times.touchdownSeconds + times.collapseSeconds / 2);
    const middle = sliceAt(halfway, 10);
    const crest = middle * LOFT_SAMPLES + LOFT.extensionSamples + 32;
    expect(halfway.positions[3 * crest + 1]).toBeCloseTo(0.5 + 0.5 * 0.8 * 7, 4);
    expect(halfway.slicePhase[middle]).toBe(2);
    expect(halfway.sliceFade[middle]).toBeCloseTo(0.5, 5);
    expect(halfway.sliceCollapse[middle]).toBeCloseTo(times.collapseSeconds, 5);
    // The drawing keeps the touchdown frame: the vertices stand where they did at touchdown, only lowered.
    const at = (loft: LoftResult, s: number, k: number) => Array.from(loft.positions.subarray(3 * s * LOFT_SAMPLES, 3 * (s + 1) * LOFT_SAMPLES)).filter((_, i) => i % 3 === k);
    for (const k of [0, 2]) expect(at(halfway, middle, k)).toEqual(at(touchdown, sliceAt(touchdown, 10), k));
    // Gone once it has collapsed.
    expect(loftAt(times.touchdownSeconds + times.collapseSeconds + 0.01).vertexCount).toBe(0);
  });

  it('drops a slice once it has faded into the water, and never joins the slices either side of it (the advisor, 2026-09-30)', () => {
    // The toys have no void, so their slices go at touchdown.
    expect(loftOf(() => TOUCHDOWN + 0.01).vertexCount).toBe(0);
    // Points 0–9 open, 10–20 long faded: only the open part is lofted, as one run.
    const loft = loftOf((k) => (k < 10 ? 0.1 : 5));
    const whole = loftOf(() => 0.1);
    expect(loft.sliceCount).toBeGreaterThan(0);
    expect(loft.sliceCount).toBeLessThan(whole.sliceCount);
    expect(loft.vertexCount).toBe(loft.sliceCount * LOFT_SAMPLES);
    for (let s = 0; s < loft.sliceCount; s += 1) expect(loft.sliceTau[s]).toBeLessThanOrEqual(TOUCHDOWN);
    expect(loft.indexCount).toBe(6 * (LOFT_SAMPLES - 1) * (loft.sliceCount - 1));
  });

  it('refines where neighbouring clocks differ by more than three frames', () => {
    // A frame is 0.25 √(7/g) = 0.21 s, so three are 0.63 s; a clock jumping 1.4 s between two points differs by 0.7 s
    // across each of the two slices over the jump, so each gets a midpoint (0.4 s is before the toy's touchdown).
    const coarse = loftOf(() => 0);
    const steep = loftOf((k) => (k < 10 ? -1 : 0.4));
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
      collapseSeconds: lookup.collapseSeconds,
    });
  });
});

describe('the lip as a thin sheet (tube-colour-fix.md, step 1)', () => {
  /** The synthetic lip: 0.05 h0 thick, 0.35 m at the records' h0 of 7 m. */
  const THICKNESS = 0.05 * 7;
  const lips = () => new ProfileLibrary([lipCase(0.3, 0.05)]);
  const loftLip = (tau: number, options = {}) => new SweptLoft(lips(), 0.05, options).build(records(21, () => tau, -100), 21, 0.5, flat);
  const middleOf = (loft: LoftResult) => sliceAt(loft, 10) * LOFT_SAMPLES + LOFT.extensionSamples;

  it('measures a lip of known uniform thickness within 5 %, away from its tip', () => {
    const loft = loftLip(0.1);
    const base = middleOf(loft);
    // The two sides meet at the tip (64), so within a thickness of it they close in: 3 points either side.
    for (let i = 36; i <= 84; i += 1) {
      if (Math.abs(i - LANDMARK.lip) <= 3) continue;
      expect(Math.abs(loft.sheet[base + i] - THICKNESS) / THICKNESS, `point ${i}`).toBeLessThan(0.05);
    }
    expect(loft.sheet[base + LANDMARK.lip]).toBe(0);
    for (let i = LANDMARK.lip - 3; i < LANDMARK.lip; i += 1) expect(loft.sheet[base + i]).toBeLessThanOrEqual(THICKNESS * 1.05);
  });

  it('weighs the sheet 1 from point 36 to 84, ramped over 3 points next to the crest and the throat, and 0 on the face, the back and the extensions', () => {
    const loft = loftLip(0.1);
    const base = middleOf(loft);
    const slice = sliceAt(loft, 10) * LOFT_SAMPLES;
    for (let i = 36; i <= 84; i += 1) expect(loft.sheetWeight[base + i], `point ${i}`).toBe(1);
    expect([33, 34, 35].map((i) => loft.sheetWeight[base + i])).toEqual([0.25, 0.5, 0.75]);
    expect([85, 86, 87].map((i) => loft.sheetWeight[base + i])).toEqual([0.75, 0.5, 0.25]);
    for (let i = 0; i <= LANDMARK.crest; i += 1) expect(loft.sheetWeight[base + i], `back ${i}`).toBe(0);
    for (let i = LANDMARK.throat; i < PROFILE_POINTS; i += 1) expect(loft.sheetWeight[base + i], `face ${i}`).toBe(0);
    for (let j = 0; j < LOFT.extensionSamples; j += 1) {
      expect(loft.sheetWeight[slice + j]).toBe(0);
      expect(loft.sheetWeight[slice + LOFT_SAMPLES - 1 - j]).toBe(0);
    }
  });

  it('carries the lift, so the front’s blended ends and a fading slice fade the sheet too', () => {
    const loft = loftLip(0.1);
    for (let v = 0; v < loft.vertexCount; v += 1) expect(loft.sheetWeight[v]).toBeLessThanOrEqual(loft.lift[v] + 1e-6);
    const end = LOFT.extensionSamples + 50;
    // The first slice lies on the water, beyond the front's end: no lift, no sheet.
    expect(loft.lift[end]).toBe(0);
    expect(loft.sheetWeight[end]).toBe(0);
  });

  it('is no sheet before the underside forms, when its run is folded onto the tip', () => {
    const loft = loftLip(-0.3);
    for (let v = 0; v < loft.vertexCount; v += 1) expect(loft.sheetWeight[v]).toBe(0);
  });

  it('leaves the sheet out of the contact’s loft', () => {
    const loft = loftLip(0.1, { contact: true });
    for (let v = 0; v < loft.vertexCount; v += 1) expect(loft.sheetWeight[v]).toBe(0);
  });

  it('sees behind the lip the tube’s wall from its outer face, and the open sky from its underside (the advisor, 2026-10-01)', () => {
    const loft = loftLip(0.1);
    const base = middleOf(loft);
    // The synthetic lip's tip is its lowest point, so its underside never sees the opening: all wall behind the outer face.
    for (let i = 36; i < LANDMARK.lip; i += 1) expect(loft.sheetBack[base + i], `outer ${i}`).toBe(0);
    for (let i = LANDMARK.lip; i <= 84; i += 1) expect(loft.sheetBack[base + i], `underside ${i}`).toBe(1);
  });

  it('comes in with the underside’s length over 0.035 h0 (0.25 m at h0 7 m)', () => {
    // A 0.1 m underside at h0 7 m is 0.1 / 0.245 of the way in.
    const profile = new Float32Array(2 * PROFILE_POINTS);
    for (let i = LANDMARK.crest; i <= LANDMARK.lip; i += 1) profile[2 * i] = (i - LANDMARK.crest) * 0.1;
    for (let i = LANDMARK.lip + 1; i <= LANDMARK.throat; i += 1) profile[2 * i] = 3.2 - (0.1 * (i - LANDMARK.lip)) / (LANDMARK.throat - LANDMARK.lip);
    const out = new Float32Array(PROFILE_POINTS);
    expect(sheetAcross(profile, 7, out, new Float32Array(PROFILE_POINTS))).toBeCloseTo(0.1 / (SHEET.formed * 7), 5);
    expect(sheetAcross(profile, 70, out, new Float32Array(PROFILE_POINTS))).toBeCloseTo(0.1 / (SHEET.formed * 70), 5);
  });

  it('measures across to the other side’s segments, not just its points', () => {
    // Two parallel runs 0.2 m apart with points staggered: every distance is the gap, never a diagonal to a point.
    const profile = new Float32Array(2 * PROFILE_POINTS);
    for (let i = LANDMARK.crest; i <= LANDMARK.lip; i += 1) {
      profile[2 * i] = (i - LANDMARK.crest) * 0.1;
      profile[2 * i + 1] = 1;
    }
    for (let i = LANDMARK.lip + 1; i <= LANDMARK.throat; i += 1) {
      profile[2 * i] = (LANDMARK.throat - i) * 0.13 + 0.05;
      profile[2 * i + 1] = 0.8;
    }
    const out = new Float32Array(PROFILE_POINTS);
    expect(sheetAcross(profile, 7, out, new Float32Array(PROFILE_POINTS))).toBe(1);
    for (let i = 40; i <= 56; i += 1) expect(out[i]).toBeCloseTo(0.2, 6);
    for (let i = 70; i <= 84; i += 1) expect(out[i]).toBeCloseTo(0.2, 6);
  });
});

describe('where the profile stands off the water (the advisor, 2026-10-01)', () => {
  // The toy tube at h0 7 m: its crest 5.6 m up at x 0, its toe at 5.6 m ahead on still water, so H is 5.6 m; the back
  // rises from 14 m behind and the flat runs on to 14 m ahead.
  const H = 0.8 * 7;
  const loft = () => new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
  /** The middle slice's lift and mask at the profile point whose x (m from the crest) is nearest `x`, on one side. */
  const at = (result: LoftResult, x: number, behind: boolean) => {
    const base = sliceAt(result, 10) * LOFT_SAMPLES + LOFT.extensionSamples;
    const crestZ = result.positions[3 * (base + LANDMARK.crest) + 2];
    let best = -1;
    for (let i = 0; i < PROFILE_POINTS; i += 1) {
      if (behind ? i > LANDMARK.crest : i < LANDMARK.toe) continue;
      const dx = result.positions[3 * (base + i) + 2] - crestZ;
      if (best < 0 || Math.abs(dx - x) < Math.abs(result.positions[3 * (base + best) + 2] - crestZ - x)) best = i;
    }
    return { lift: result.lift[base + best], mask: result.mask[base + best] };
  };

  it('lifts the profile fully from 0.1 H behind its crest to its toe', () => {
    const result = loft();
    const base = sliceAt(result, 10) * LOFT_SAMPLES + LOFT.extensionSamples;
    for (const i of [LANDMARK.crest, LANDMARK.lip, LANDMARK.throat, LANDMARK.toe]) expect(result.lift[base + i]).toBe(1);
    expect(at(result, -0.05 * H, true).lift).toBe(1);
  });

  it('rests its back and the flat ahead on the water past 0.5 H ramps, eased, and lets the water draw a band beyond', () => {
    const result = loft();
    expect(at(result, -0.35 * H, true).lift).toBeGreaterThan(0.2);
    expect(at(result, -0.35 * H, true).lift).toBeLessThan(0.8);
    expect(at(result, -0.7 * H, true).lift).toBe(0);
    expect(at(result, 0.8 * 7 + 0.25 * H, false).lift).toBeGreaterThan(0.2);
    expect(at(result, 0.8 * 7 + 0.6 * H, false).lift).toBe(0);
    // The mask: whole over the ramps, gone a band (1 m) past them.
    expect(at(result, -0.6 * H + 0.1, true).mask).toBeCloseTo(1, 1);
    expect(at(result, -0.6 * H - 2, true).mask).toBe(0);
    expect(at(result, 2 * 7, false).mask).toBe(0);
    // Resting, a vertex takes the water's height and foam: its lift is 0.
    const base = sliceAt(result, 10) * LOFT_SAMPLES + LOFT.extensionSamples;
    expect(result.positions[3 * base + 1]).toBe(0.5);
    expect(result.positions[3 * (base + PROFILE_POINTS - 1) + 1]).toBe(0.5);
  });
});

describe('the sky seen through a tube’s opening (the advisor, 2026-10-01)', () => {
  it('is the 2D view factor ½(sin θ2 − sin θ1) of the window from the horizon up to the tip', () => {
    // A floor facing up, the tip 45° up ahead: from −90° to −45° off its normal.
    expect(tubeSkyView(0, 0, 0, 1, 1, 1)).toBeCloseTo((1 - Math.SQRT1_2) / 2, 6);
    // A wall facing ahead: from 0° to 45°.
    expect(tubeSkyView(0, 0, 1, 0, 1, 1)).toBeCloseTo(Math.SQRT1_2 / 2, 6);
    // The tip overhead and behind: the floor sees the whole sky ahead of it and up to the tip, 135° up.
    expect(tubeSkyView(0, 0, 0, 1, -1, 1)).toBeCloseTo((1 + Math.SQRT1_2) / 2, 6);
  });

  it('is nothing when the tip is not above the point, or the window lies behind the surface', () => {
    expect(tubeSkyView(0, 0, 0, 1, 1, -0.5)).toBe(0);
    expect(tubeSkyView(0, 0, 0, 1, 1, 0)).toBe(0);
    // An underside facing down and back: the window ahead and above lies behind it.
    expect(tubeSkyView(0, 0, -Math.SQRT1_2, -Math.SQRT1_2, 1, 1)).toBe(0);
  });

  it('counts only the part of the window in front of the surface', () => {
    // A wall facing back and up (normal at 135°): the window from 0° to 135° up is in front of it from 45° on.
    const n = Math.SQRT1_2;
    expect(tubeSkyView(0, 0, -n, n, -1, 1)).toBeCloseTo((0 + 1) / 2, 6);
    // A window entering from below: a floor tilted down-ahead (normal at 60° up, pointing ahead): the horizon is −60°.
    expect(tubeSkyView(0, 0, 0.5, Math.sqrt(3) / 2, 0, 1)).toBeCloseTo((Math.sin(Math.PI / 6) + Math.sin(Math.PI / 3)) / 2, 6);
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
    const counted = () => {
      calls += 1;
      return flat();
    };
    const loft = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, counted);
    let resting = 0;
    for (let v = 0; v < loft.vertexCount; v += 1) if (loft.lift[v] < 1) resting += 1;
    expect(calls).toBe(resting);
    expect(resting).toBeLessThan(loft.vertexCount);
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
