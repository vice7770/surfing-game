import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SHEET, SweptLoft, sheetAcross, tubeSkyView, type LoftResult } from './sweptLoft';
import { lipCase, toyCase, tubeCase } from './toyCase';

/** The y where the vertical line at (x, z) meets triangle (u, v, w) strictly inside it; undefined where it misses. */
function crossing(p: Float32Array, u: number, v: number, w: number, x: number, z: number): number | undefined {
  const [ax, az, bx, bz, cx, cz] = [p[3 * u], p[3 * u + 2], p[3 * v], p[3 * v + 2], p[3 * w], p[3 * w + 2]];
  const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  if (Math.abs(area) < 1e-12) return undefined;
  const wb = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / area;
  const wc = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / area;
  const wa = 1 - wb - wc;
  if (wa <= 1e-9 || wb <= 1e-9 || wc <= 1e-9) return undefined;
  return wa * p[3 * u + 1] + wb * p[3 * v + 1] + wc * p[3 * w + 1];
}

/**
 * Vertical lines through a loft's overturned strips, across each strip and along its tube from the throat to the tip,
 * meeting the profile's lower surface (from the throat on), the lip's underside (tip to throat) and its top (crest to
 * tip). Each line must meet them an odd number of times in all: parity holds, water at the bottom. Returns how many
 * lines met all three, how many met one more than once (a profile's own wiggle), and the most two layers swapped, m
 * (a lower one's highest over a higher one's lowest), in strips of one weight and in strips whose weight changes.
 */
function checkLayers(loft: LoftResult): { lines: number; multiple: number; uniformSwap: number; swap: number } {
  const p = loft.positions;
  const throat = LOFT.extensionSamples + LANDMARK.throat;
  const tip = LOFT.extensionSamples + LANDMARK.lip;
  let lines = 0;
  let multiple = 0;
  let uniformSwap = -Infinity;
  let swap = -Infinity;
  for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
    if (!loft.sliceJoined[s] || !loft.sliceOverturned[s] || !loft.sliceOverturned[s + 1]) continue;
    // Past a front's ends both slices lie wholly on the water: every layer is the water there.
    if (loft.sliceWeight[s] === 0 && loft.sliceWeight[s + 1] === 0) continue;
    const uniform = loft.sliceWeight[s] === loft.sliceWeight[s + 1];
    const a = s * LOFT_SAMPLES;
    const b = a + LOFT_SAMPLES;
    const on = (slice: number, t: number, k: number) => p[3 * (slice + throat) + k] + t * (p[3 * (slice + tip) + k] - p[3 * (slice + throat) + k]);
    // Each quad's range along slice s's ray: a line outside it cannot meet the quad.
    const along = (v: number) => (p[3 * v] - p[3 * a]) * loft.sliceRayX[s] + (p[3 * v + 2] - p[3 * a + 2]) * loft.sliceRayZ[s];
    const low = new Float64Array(LOFT_SAMPLES - 1);
    const high = new Float64Array(LOFT_SAMPLES - 1);
    for (let j = 0; j + 1 < LOFT_SAMPLES; j += 1) {
      const ends = [along(a + j), along(a + j + 1), along(b + j), along(b + j + 1)];
      low[j] = Math.min(...ends) - 1e-6;
      high[j] = Math.max(...ends) + 1e-6;
    }
    for (const across of [0.03, 0.21, 0.5, 0.79, 0.97]) {
      for (let t = 0.004; t < 1; t += 0.0247) {
        const x = on(a, t, 0) + across * (on(b, t, 0) - on(a, t, 0));
        const z = on(a, t, 2) + across * (on(b, t, 2) - on(a, t, 2));
        const q = (x - p[3 * a]) * loft.sliceRayX[s] + (z - p[3 * a + 2]) * loft.sliceRayZ[s];
        const layers: Record<'lower' | 'under' | 'top', number[]> = { lower: [], under: [], top: [] };
        for (let j = 0; j + 1 < LOFT_SAMPLES; j += 1) {
          if (q < low[j] || q > high[j]) continue;
          const i = j - LOFT.extensionSamples;
          const layer = i >= LANDMARK.throat ? layers.lower : i >= LANDMARK.lip ? layers.under : i >= LANDMARK.crest ? layers.top : undefined;
          if (!layer) continue;
          for (const [u, v, w] of [[a + j, b + j, a + j + 1], [a + j + 1, b + j, b + j + 1]]) {
            const y = crossing(p, u, v, w, x, z);
            if (y !== undefined) layer.push(y);
          }
        }
        const { lower, under, top } = layers;
        if (!lower.length || !under.length || !top.length) continue;
        expect((lower.length + under.length + top.length) % 2).toBe(1);
        if (lower.length + under.length + top.length > 3) multiple += 1;
        const swapped = Math.max(Math.max(...lower) - Math.min(...under), Math.max(...under) - Math.min(...top));
        if (uniform) uniformSwap = Math.max(uniformSwap, swapped);
        else swap = Math.max(swap, swapped);
        lines += 1;
      }
    }
  }
  return { lines, multiple, uniformSwap, swap };
}

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

  it('starts each point’s search from the last one’s nearest segment and finds what testing every segment finds, on every library frame', () => {
    const profile = new Float32Array(2 * PROFILE_POINTS);
    const [walked, whole, walkedBack, wholeBack] = [0, 0, 0, 0].map(() => new Float32Array(PROFILE_POINTS));
    /** The distance to the run [from, to], every segment tested. */
    const every = (i: number, from: number, to: number) => {
      let best = Infinity;
      for (let k = from; k < to; k += 1) {
        const [ax, ay] = [profile[2 * k], profile[2 * k + 1]];
        const [dx, dy] = [profile[2 * k + 2] - ax, profile[2 * k + 3] - ay];
        const l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.min(1, Math.max(0, ((profile[2 * i] - ax) * dx + (profile[2 * i + 1] - ay) * dy) / l2)) : 0;
        best = Math.min(best, Math.hypot(ax + t * dx - profile[2 * i], ay + t * dy - profile[2 * i + 1]));
      }
      return best;
    };
    let frames = 0;
    for (const c of readBarrelCases().map(decodeCase)) {
      const count = c.frames.length / (2 * PROFILE_POINTS);
      for (let f = 0; f < count; f += 1) {
        for (let k = 0; k < 2 * PROFILE_POINTS; k += 1) profile[k] = 7 * c.frames[f * 2 * PROFILE_POINTS + k];
        const formed = sheetAcross(profile, 7, walked, walkedBack);
        expect(sheetAcross(profile, 7, whole, wholeBack, false)).toBe(formed);
        if (!(formed > 0)) continue;
        frames += 1;
        for (let i = LANDMARK.crest + 1; i < LANDMARK.throat; i += 1) {
          if (i === LANDMARK.lip) continue;
          const reference = i < LANDMARK.lip ? every(i, LANDMARK.lip, LANDMARK.throat) : every(i, LANDMARK.crest, LANDMARK.lip);
          expect(walked[i], `${c.id} frame ${f} point ${i}`).toBeCloseTo(reference, 5);
          expect(whole[i], `${c.id} frame ${f} point ${i}`).toBeCloseTo(reference, 5);
          // The far side's view comes from the same segment either way: the first nearest along the run.
          expect(walkedBack[i], `${c.id} frame ${f} point ${i}`).toBe(wholeBack[i]);
        }
      }
    }
    expect(frames).toBeGreaterThan(100);
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

describe('ahead of the toe, the forward rest (the advisor, 2026-10-01)', () => {
  // The toy tube at h0 7 m: its crest at the throw point, its toe 5.6 m ahead on the still level (0.5 m), its flat on
  // to its front end 14 m ahead. H is 5.6 m, so the plain ease ends 2.8 m past the toe, and the profile's own samples
  // leave 14 + 1.5 − 1 − 5.6 = 8.9 m past the toe for the hold and the ease (under 3 H, 16.8 m).
  const H = 0.8 * 7;
  const middle = (result: LoftResult) => sliceAt(result, 10);
  const toeZ = (() => {
    const result = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    return result.positions[3 * (middle(result) * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.toe) + 2];
  })();
  /** The solver's broad front: its water `over` m above the trough until `until` m past the toe, then on it. */
  const front = (over: number, until = Infinity) => (_x: number, z: number) => (z - toeZ < until ? 0.5 + over : 0.5);
  const build = (heightAt: (x: number, z: number) => number, contact = false) =>
    new SweptLoft(tubes(), 0.05, { contact }).build(records(21, () => 0.1), 21, 0.5, heightAt);
  /** The middle slice's vertices ahead of its toe: how far past it, their lift, mask and height. */
  const ahead = (result: LoftResult) => {
    const base = middle(result) * LOFT_SAMPLES;
    const out: { past: number; lift: number; mask: number; y: number }[] = [];
    for (let j = LOFT.extensionSamples + LANDMARK.toe + 1; j < LOFT_SAMPLES; j += 1) {
      const v = base + j;
      out.push({ past: result.positions[3 * v + 2] - toeZ, lift: result.lift[v], mask: result.mask[v], y: result.positions[3 * v + 1] });
    }
    return out;
  };

  it('holds the trough at the profile’s front level until the solver’s water comes down to within 0.1 H, then eases onto it over 0.5 H', () => {
    const result = build(front(2, 3));
    const s = middle(result);
    // Read every 0.5 m: 2 m over at 2.5 m, on the trough at 3 m; the line between them is 0.1 H over at 2.86 m.
    const hold = 2.5 + (0.5 * (2 - 0.1 * H)) / 2;
    expect(result.sliceRestHold[s]).toBeCloseTo(hold, 5);
    expect(result.sliceRestEnd[s]).toBeCloseTo(hold + 0.5 * H, 5);
    expect(result.sliceRestClimb[s]).toBeCloseTo(0.1 * H, 5);
    expect(result.sliceToeClimb[s]).toBeCloseTo(2, 5);
    for (const { past, lift, mask, y } of ahead(result)) {
      if (past <= hold) {
        // Held on the profile's own flat, its front level, wholly drawn.
        expect(lift, `${past.toFixed(2)} m`).toBe(1);
        expect(y).toBeCloseTo(0.5, 5);
        expect(mask).toBe(1);
      } else if (past >= hold + 0.5 * H) {
        expect(lift, `${past.toFixed(2)} m`).toBe(0);
      }
      if (past > hold + 0.5 * H + LOFT.band) expect(mask, `${past.toFixed(2)} m`).toBe(0);
    }
    const easing = ahead(result).filter(({ past }) => past > hold + 0.2 * H && past < hold + 0.3 * H);
    expect(easing.length).toBeGreaterThan(0);
    for (const { lift } of easing) expect(lift).toBeGreaterThan(0.2);
  });

  it('eases over what is left of the profile’s samples where the water hasn’t come down by then', () => {
    const result = build(front(2));
    const s = middle(result);
    const room = 14 + LOFT.extension - LOFT.band - 0.8 * 7;
    expect(result.sliceRestEnd[s]).toBeCloseTo(room, 4);
    expect(result.sliceRestHold[s]).toBeCloseTo(room - 0.5 * H, 4);
    expect(result.sliceRestClimb[s]).toBeCloseTo(2, 5);
    // The ease ends within the samples: the last extension vertex rests on the water, unmasked.
    const last = ahead(result).at(-1)!;
    expect(last.lift).toBe(0);
    expect(last.y).toBe(2.5);
    expect(last.mask).toBe(0);
  });

  it('holds at most 3 H past the toe', () => {
    // The toy at h0 0.3 m: its H is 0.24 m, so 3 H (0.72 m) comes before the profile's room (0.36 + 0.5 m).
    const small = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1).map((v, k) => (k % FRONT_STRIDE === FRONT_FIELD.footDepth ? 0.3 : k % FRONT_STRIDE === FRONT_FIELD.footHeight ? 0.09 : v)), 21, 0.5, () => 10);
    const s = sliceAt(small, 10);
    expect(small.sliceRestEnd[s]).toBeCloseTo(3 * 0.24, 4);
    expect(small.sliceRestHold[s]).toBeCloseTo(2.5 * 0.24, 4);
  });

  it('stays the plain 0.5 H rest where the solver’s water ahead already sits at the drawn level', () => {
    const result = build(flat);
    const s = middle(result);
    expect(result.sliceRestHold[s]).toBe(0);
    expect(result.sliceRestEnd[s]).toBeCloseTo(0.5 * H, 5);
    expect(result.sliceToeClimb[s]).toBe(0);
    // Water below the trough too: it eases down onto it from the toe.
    expect(build(front(-1)).sliceRestHold[s]).toBe(0);
  });

  it('gives the contact the drawing’s forward rest, so the two surfaces stay one water', () => {
    const drawn = build(front(2, 3));
    const touched = build(front(2, 3), true);
    const s = middle(drawn);
    expect(touched.sliceRestHold[s]).toBe(drawn.sliceRestHold[s]);
    expect(touched.sliceRestEnd[s]).toBe(drawn.sliceRestEnd[s]);
    const [a, b] = [ahead(drawn), ahead(touched)];
    for (let k = 0; k < a.length; k += 1) {
      expect(b[k].lift).toBeCloseTo(a[k].lift, 5);
      expect(b[k].y).toBeCloseTo(a[k].y, 5);
    }
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
    // And the forward rest's readings ahead of each lifted slice's toe: one, where the water there is at the trough.
    let lifted = 0;
    for (let s = 0; s < loft.sliceCount; s += 1) if (loft.sliceWeight[s] > 0) lifted += 1;
    expect(loft.restSamples).toBe(lifted);
    expect(calls).toBe(resting + loft.restSamples);
    expect(resting).toBeLessThan(loft.vertexCount);
    const crest = sliceAt(loft, 10) * LOFT_SAMPLES + LOFT.extensionSamples + 32;
    expect(loft.positions[3 * crest + 1]).toBeCloseTo(0.5 + 0.8 * 7, 5);
  });

  it('in contact mode takes the drawing’s weights: a partly weighted lip is lerped as drawn, never cut (the advisor, 2026-09-30)', () => {
    // Open (the front's ends ramp its weight) and halfway through the collapse (every slice at half weight or less).
    const times = tubes().profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 });
    for (const tau of [0.1, times.touchdownSeconds + times.collapseSeconds / 2]) {
      const drawn = new SweptLoft(tubes(), 0.05).build(records(21, () => tau, -100), 21, 0.5, flat);
      const contact = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => tau, -100), 21, 0.5, flat);
      expect(contact.sliceCount).toBe(drawn.sliceCount);
      expect(Array.from(contact.sliceWeight.subarray(0, contact.sliceCount))).toEqual(Array.from(drawn.sliceWeight.subarray(0, drawn.sliceCount)));
      let partial = 0;
      for (let s = 0; s < contact.sliceCount; s += 1) if (contact.sliceOverturned[s] && contact.sliceWeight[s] < 1) partial += 1;
      expect(partial).toBeGreaterThan(0);
    }
  });

  it('keeps the face under the underside under the top along vertical lines through lerped slices (the advisor, 2026-09-30)', { timeout: 240_000 }, () => {
    // Over a gently sloping sea: the front's ends ramp the weight over 2.5 m, and the collapse lowers every slice.
    const sea = (x: number, z: number) => 0.5 + 0.02 * x - 0.01 * (z + 100);
    const times = tubes().profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 });
    let lines = 0;
    for (const tau of [0.1, times.touchdownSeconds + times.collapseSeconds / 3, times.touchdownSeconds + (2 * times.collapseSeconds) / 3]) {
      for (const heightAt of [flat, sea]) {
        const loft = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => tau, -100), 21, 0.5, heightAt);
        const layers = checkLayers(loft);
        lines += layers.lines;
        // One crossing a layer; in order where a strip's weight is one; the ends' strips, whose weight changes by
        // 0.1–0.3 from slice to slice, swap two layers by 3 mm at most at h0 7 m, at the throat or the tip.
        expect(layers.multiple).toBe(0);
        expect(layers.uniformSwap).toBeLessThan(0);
        expect(layers.swap).toBeLessThan(0.001 * 7);
      }
    }
    expect(lines).toBeGreaterThan(10_000);
  });

  describe('overlapping fronts: the first wins (the advisor, 2026-09-30)', () => {
    /**
     * Two straight fronts along +x, 21 points each: the first over x 0.5–20.5 at z = −100, the second from `start`, `ahead`
     * metres shoreward of it.
     */
    const two = (start: number, ahead = 0) => {
      const n = 21;
      const out = new Float32Array(2 * n * FRONT_STRIDE);
      for (let f = 0; f < 2; f += 1) {
        for (let k = 0; k < n; k += 1) {
          const o = (f * n + k) * FRONT_STRIDE;
          const z = f === 0 ? -100 : -100 + ahead;
          out[o + FRONT_FIELD.x] = (f === 0 ? 0.5 : start) + k; out[o + FRONT_FIELD.z] = z; out[o + FRONT_FIELD.front] = f + 1;
          out[o + FRONT_FIELD.sigma] = k; out[o + FRONT_FIELD.tau] = f === 0 ? 0.1 : 0.2; out[o + FRONT_FIELD.footHeight] = 2.1;
          out[o + FRONT_FIELD.footDepth] = 7; out[o + FRONT_FIELD.throwZ] = z;
        }
      }
      return out;
    };
    const resting = (loft: LoftResult, s: number) => loft.sliceWeight[s] === 0 && loft.sliceWeight[s + 1] === 0;
    const joinedStrips = (loft: LoftResult) => Array.from(loft.sliceJoined.subarray(0, loft.sliceCount));

    it('drops the later front’s strips over the earlier front’s, the same strips in the drawing and the contact', () => {
      // The second front from x 10: its lifted strips over the first's lifted footprint (x 0.5 to 20.5) go.
      const drawn = new SweptLoft(tubes(), 0.05).build(two(10), 42, 0.5, flat);
      const contact = new SweptLoft(tubes(), 0.05, { contact: true }).build(two(10), 42, 0.5, flat);
      expect(drawn.overlaps).toBe(21);
      expect(contact.overlaps).toBe(drawn.overlaps);
      expect(joinedStrips(contact)).toEqual(joinedStrips(drawn));
      for (let s = 0; s + 1 < drawn.sliceCount; s += 1) {
        const x = drawn.positions[3 * s * LOFT_SAMPLES];
        // The first front keeps every lifted strip, and its resting end gives way under the second's lifted strips; the
        // second drops everything over the first's lifted span (x 0.5 to 20.5), resting or not.
        if (drawn.sliceFront[s] === 1 && drawn.sliceFront[s + 1] === 1) expect(drawn.sliceJoined[s]).toBe(resting(drawn, s) && x >= 20.5 ? 0 : 1);
        if (drawn.sliceFront[s] === 2 && drawn.sliceFront[s + 1] === 2) expect(drawn.sliceJoined[s]).toBe(x < 20.5 ? 0 : 1);
      }
      // The drawing triangulates the kept strips only.
      expect(drawn.indexCount).toBe(6 * (LOFT_SAMPLES - 1) * joinedStrips(drawn).reduce((sum, j) => sum + j, 0));
      // These held open tubes: a hole in the second barrel (the advisor wants to hear of any).
      expect(drawn.overlapsOpen).toBeGreaterThan(0);
      expect(drawn.overlapOpenWeight).toBe(1);
    });

    it('leaves fronts apart alone, and where they meet end to end their resting ends drop nothing', () => {
      expect(new SweptLoft(tubes(), 0.05).build(two(40), 42, 0.5, flat).overlaps).toBe(0);
      // A metre apart: their extensions and blended ends overlap over x 20–22, where both rest on the water.
      expect(new SweptLoft(tubes(), 0.05).build(two(21.5), 42, 0.5, flat).overlaps).toBe(0);
    });

    it('judges fronts one behind the other on their lifted spans, not where they rest (the advisor, 2026-10-01)', () => {
      // The toy tube at h0 7 m stands off the water from 0.6 H (3.36 m) behind its crest to 0.5 H (2.8 m) past its toe,
      // 5.6 m ahead: 11.76 m in all, while its profile runs 14 m either way. 15 m apart, only their resting parts meet.
      for (const contact of [false, true]) {
        expect(new SweptLoft(tubes(), 0.05, { contact }).build(two(0.5, 15), 42, 0.5, flat).overlaps).toBe(0);
        expect(new SweptLoft(tubes(), 0.05, { contact }).build(two(0.5, 8), 42, 0.5, flat).overlaps).toBeGreaterThan(0);
      }
    });

    it('counts a held trough ahead of a toe in its front’s lifted span', () => {
      // Under a solver front 2 m over the trough everywhere, the first front's trough holds 8.9 m past its toe (its
      // profile's room), so its span reaches 14.5 m past its crest, over the back of a front 15 m ahead.
      const high = () => 2.5;
      for (const contact of [false, true]) {
        expect(new SweptLoft(tubes(), 0.05, { contact }).build(two(0.5, 15), 42, 0.5, high).overlaps).toBeGreaterThan(0);
      }
    });
  });

  describe('on the library’s cases', () => {
    const library = new ProfileLibrary(readBarrelCases().map(decodeCase));
    /** A 60 m front whose foot crests run from A0 0.13 to 0.47 at h0 7 m, every point at τ `seconds`: every blend. */
    const blends = (seconds: number) => {
      const n = 61;
      const out = new Float32Array(n * FRONT_STRIDE);
      for (let k = 0; k < n; k += 1) {
        const o = k * FRONT_STRIDE;
        out[o + FRONT_FIELD.x] = k; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
        out[o + FRONT_FIELD.tau] = seconds; out[o + FRONT_FIELD.footHeight] = (0.13 + (0.34 * k) / (n - 1)) * 7; out[o + FRONT_FIELD.footDepth] = 7;
        out[o + FRONT_FIELD.throwZ] = -100;
      }
      return new SweptLoft(library, 1 / 19, { contact: true }).build(out, n, 0.5, flat);
    };

    it('keeps the layers apart along vertical lines through blended held slices (the advisor, 2026-09-30)', { timeout: 240_000 }, () => {
      let lines = 0;
      let multiple = 0;
      // Through every case's hold and touchdown, and the collapses after.
      for (const seconds of [0.5, 0.7, 0.9, 1, 1.2]) {
        const layers = checkLayers(blends(seconds));
        lines += layers.lines;
        multiple += layers.multiple;
        // A hair at the fold where a strip's weight is one; at most 2 × 10⁻³ h0 at the tip where the front's ends ramp it.
        expect(layers.uniformSwap).toBeLessThan(1e-4);
        expect(layers.swap).toBeLessThan(0.002 * 7);
      }
      expect(lines).toBeGreaterThan(50_000);
      // Short S-wiggles in the cases' own nearly vertical undersides meet a line three times, about 1 % of lines.
      expect(multiple / lines).toBeLessThan(0.02);
    });

    describe('the lip’s stored velocity against the drawn tip’s motion (the advisor, 2026-09-30)', () => {
      /** A 20 m front at foot crest A0 × 7 m, its solver crest moving shoreward at `pace` from its throw at z −100. */
      const moving = (a0: number, pace: number, tau: number, throwZ = -100) => {
        const n = 21;
        const out = new Float32Array(n * FRONT_STRIDE);
        for (let k = 0; k < n; k += 1) {
          const o = k * FRONT_STRIDE;
          out[o + FRONT_FIELD.x] = k; out[o + FRONT_FIELD.z] = -100 + pace * tau; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
          out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = a0 * 7; out[o + FRONT_FIELD.footDepth] = 7;
          out[o + FRONT_FIELD.throwZ] = throwZ;
        }
        return out;
      };
      const middle = (loft: LoftResult) => sliceAt(loft, 10);

      it('agrees within 0.5 m/s over the tip’s smoothing, through the soft cap and the handover, until a case holds', { timeout: 240_000 }, () => {
        const unit = Math.sqrt(7 / 9.81);
        let checked = 0;
        // Each case alone; the solver's crest slower and faster than the library's (5.2 and 7.3–7.8 m/s at these A0).
        for (const [a0, held] of [[0.1414, 0.95], [0.3, 1.1338]] as const) {
          const times = library.profileTimes({ slope: 1 / 19, footHeight: a0 * 7, footDepth: 7 });
          const window = 4 * times.frameSeconds;
          for (const pace of [4, 11]) {
            const tipZ = (tau: number) => {
              const drawn = new SweptLoft(library, 1 / 19).build(moving(a0, pace, tau), 21, 0.5, flat);
              return drawn.positions[3 * (middle(drawn) * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip) + 2];
            };
            const stored = (tau: number) => {
              const contact = new SweptLoft(library, 1 / 19, { contact: true }).build(moving(a0, pace, tau), 21, 0.5, flat);
              const s = middle(contact);
              return contact.sliceTipAlong[s] * contact.sliceRayZ[s] + contact.sliceAnchorVZ[s];
            };
            // Until a window before the case's held frame: from there the tip decelerates into touchdown faster than its
            // ±4-frame line follows (up to 0.5 m/s), and past the hold the drawn tip goes on to touch down (up to 0.9).
            for (let tau = 0.45 * times.touchdownSeconds; tau + 2 * window <= held * unit; tau += 0.04) {
              let mean = 0;
              for (let k = -4; k <= 4; k += 1) mean += stored(tau + (k * window) / 4) / 9;
              expect(Math.abs((tipZ(tau + window) - tipZ(tau - window)) / (2 * window) - mean)).toBeLessThan(0.5);
              checked += 1;
            }
          }
        }
        expect(checked).toBeGreaterThan(30);
      });

      it('takes the solver crest’s pace only from 0.1 s after the throw, held near the long-wave speed', () => {
        // The solver's crest still at z −100, thrown 3 m behind or ahead of where the cap holds it equally: the cap's
        // pull is the same both ways, so only the crest's pace since the throw, (z − throwZ)/τ, tells them apart.
        const crestX = (tau: number) => {
          const out = new Float64Array(2);
          library.pointAt({ slope: 1 / 19, footHeight: 2.1, footDepth: 7, seconds: tau, hold: 'contact' }, LANDMARK.crest, out);
          return out[0];
        };
        const anchorVZ = (tau: number, side: number) => {
          const loft = new SweptLoft(library, 1 / 19, { contact: true }).build(moving(0.3, 0, tau, -100 - crestX(tau) + 3 * side), 21, 0.5, flat);
          return loft.sliceAnchorVZ[middle(loft)];
        };
        // At 0.05 s that pace is noise: none of it, so both read alike; at 0.5 s it is in.
        expect(anchorVZ(0.05, 1)).toBeCloseTo(anchorVZ(0.05, -1), 4);
        expect(Math.abs(anchorVZ(0.5, 1) - anchorVZ(0.5, -1))).toBeGreaterThan(1);
        // Handed over (u = 1), the anchor moves with the crest point, Ṡ − ċ. Pinned at h0 14 m, where pad19-a45-l12
        // hands over before touchdown: over 2 m of water a crest record leaping at 20 or 30 m/s reads as 1.5 × 4.43 m/s.
        const handed = (pace: number, depthAt?: (x: number, z: number) => number) => {
          const tau = 1.62;
          const out = new Float32Array(21 * FRONT_STRIDE);
          out.set(moving(0.45, pace, tau));
          for (let k = 0; k < 21; k += 1) {
            out[k * FRONT_STRIDE + FRONT_FIELD.footHeight] = 0.45 * 14;
            out[k * FRONT_STRIDE + FRONT_FIELD.footDepth] = 14;
          }
          const loft = new SweptLoft(library, 1 / 19, { contact: true }).build(out, 21, 0.5, flat, depthAt);
          return loft.sliceAnchorVZ[middle(loft)];
        };
        expect(handed(30) - handed(20)).toBeCloseTo(10, 4);
        const depth = () => 2;
        expect(handed(30, depth)).toBeCloseTo(handed(20, depth), 4);
        expect(handed(30) - handed(30, depth)).toBeCloseTo(30 - 1.5 * Math.sqrt(9.81 * 2), 4);
      });
    });

    it('keeps the contact’s held tip within two frames of the drawn one (the advisor, 2026-09-30)', () => {
      let gap = 0;
      for (let seconds = 0.3; seconds <= 1.4; seconds += 0.01) gap = Math.max(gap, blends(seconds).tipGap);
      // pad19-a30-l12's last two frames, closed onto the face, carry the drawn tip 0.047 h0 past its held one (0.33 m at
      // h0 7 m); periodic-padang19s-l12's last carries it 0.031 h0. pad19-a20-l12's and pad19-a45-l12's last frames are their held ones.
      expect(gap).toBeGreaterThan(0.3);
      expect(gap).toBeLessThan(0.34);
    });
  });

  it('in contact mode holds the geometry at the last clear frame after touchdown, lowered by the fade, and keeps the clock', () => {
    const late = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => 0.5 * TUBE_UNIT + 0.1, -100), 21, 0.5, flat);
    const held = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => 0.25 * TUBE_UNIT, -100), 21, 0.5, flat);
    const a = sliceAt(late, 10);
    const b = sliceAt(held, 10);
    expect(late.sliceTau[a]).toBeCloseTo(0.5 * TUBE_UNIT + 0.1, 5);
    expect(late.slicePhase[a]).toBe(2);
    const fade = late.sliceFade[a];
    expect(fade).toBeCloseTo(1 - 0.1 / late.sliceCollapse[a], 6);
    // Where each vertex stood at the clear frame, lowered toward the 0.5 m water by the fade (the drawing's lerp).
    for (let j = 0; j < LOFT_SAMPLES; j += 1) {
      const u = 3 * (a * LOFT_SAMPLES + j);
      const v = 3 * (b * LOFT_SAMPLES + j);
      expect(late.positions[u]).toBe(held.positions[v]);
      expect(late.positions[u + 2]).toBe(held.positions[v + 2]);
      expect(late.positions[u + 1]).toBeCloseTo(0.5 + fade * (held.positions[v + 1] - 0.5), 4);
    }
  });
});
