import { describe, expect, it } from 'vitest';
import { CrestRayPlan, minimumCrestRaySpacing } from './crestRays';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SHEET, SweptLoft, THROAT, sheetAcross, throatViews, tubeSkyView, type LoftResult } from './sweptLoft';
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
/**
 * A straight front along +x at z = −100, 1 m apart, every point at τ `tau(k)`, thrown at z `throwZ` once τ ≥ 0 (NaN: no
 * throw point), and on pace `pace(k)` m/s from then (NaN: none, as without the crash).
 */
function records(n: number, tau: (k: number) => number, throwZ = -100.2, pace: (k: number) => number = () => Number.NaN): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau(k); out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7;
    out[o + FRONT_FIELD.throwZ] = tau(k) >= 0 ? throwZ : Number.NaN;
    out[o + FRONT_FIELD.pace] = tau(k) >= 0 ? pace(k) : Number.NaN;
  }
  return out;
}
const library = () => new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);
const loftOf = (tau: (k: number) => number, n = 21, throwZ = -100.2) => new SweptLoft(library(), 0.05).build(records(n, tau, throwZ), n, 0.5, flat);
/** The toy's touchdown, s: 0.5 √(7/g). */
const TOUCHDOWN = 0.5 * Math.sqrt(7 / 9.81);

describe('the swept loft', () => {
  it('keeps the strict sorted-sigma bracket at equal and repeated records, using logarithmic lookups', () => {
    type Sample = { x: number; z: number; tau: number; footHeight: number; footDepth: number; pace: number };
    type Front = { id: number; start: number; end: number; first: number; last: number };
    const loft = new SweptLoft(library(), 0.05) as unknown as {
      at(records: Float32Array, front: Front, sigma: number, into: Sample): Sample;
    };
    const data = records(9, k => k * k);
    const sigmas = [-2, 0, 1, 1, 2, 4, 5, 7, 9];
    sigmas.forEach((sigma, k) => { data[k * FRONT_STRIDE + FRONT_FIELD.sigma] = sigma; });
    const front = { id: 1, start: 1, end: 8, first: 0, last: 7 };
    const sample = (): Sample => ({ x: 0, z: 0, tau: 0, footHeight: 0, footDepth: 0, pace: 0 });
    for (const [sigma, tau] of [[0, 1], [0.5, 2.5], [1, 4], [1.5, 12.5], [2, 16], [3, 20.5], [7, 49]]) {
      expect(loft.at(data, front, sigma, sample()).tau).toBe(tau);
    }
    expect(loft.at(data, front, -3, sample()).tau).toBe(1);
    expect(loft.at(data, front, 20, sample()).tau).toBe(49);
    const many = records(512, k => k * k);
    let sigmaReads = 0;
    const counted = new Proxy(many, {
      get(target, key) {
        if (typeof key === 'string' && /^\d+$/.test(key) && Number(key) % FRONT_STRIDE === FRONT_FIELD.sigma) sigmaReads += 1;
        return Reflect.get(target, key, target);
      },
    });
    expect(loft.at(counted, { id: 1, start: 0, end: 512, first: 0, last: 511 }, 400.5, sample()).tau).toBe(160400.5);
    expect(sigmaReads).toBeLessThanOrEqual(12);
  });

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

  /** The middle slice's crest vertex (x, z): σ 10, the point at x 10.5 on z −100. */
  const crestOf = (loft: ReturnType<typeof loftOf>) => {
    const v = 3 * (Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
    return [loft.positions[v], loft.positions[v + 2]];
  };

  it('anchors every slice on its crest point K = S − c n, before the throw and from it, with or without a throw point (the advisor, 2026-10-03: u = 1 from the throw)', () => {
    // The toy's crest sits at x = 1 h0 = 7 m at every τ: the anchor 7 m behind the point, its crest vertex on the point
    // itself, wherever its crest crossed its throw depth (1 m behind, 0.2 m, 13.8 m) and with no throw point.
    for (const tau of [-0.1, 0, 0.1, 0.4 * TOUCHDOWN, 0.8 * TOUCHDOWN, 0.95 * TOUCHDOWN]) {
      for (const throwZ of [-106, -100.2, -113.8, Number.NaN]) {
        const [x, z] = crestOf(loftOf(() => tau, 21, throwZ));
        expect(x).toBeCloseTo(10.5, 4);
        expect(z).toBeCloseTo(-100, 4);
      }
    }
    // Its tube's life runs from the throw, with or without a throw point.
    const middle = Math.floor(loftOf(() => 0.1).sliceCount / 2);
    expect(loftOf(() => 0.1, 21, -106).sliceLife[middle]).toBeCloseTo(0.1 / TOUCHDOWN, 4);
    expect(loftOf(() => 0.1, 21, Number.NaN).sliceLife[middle]).toBeCloseTo(0.1 / TOUCHDOWN, 4);
    expect(loftOf(() => -0.1).sliceLife[middle]).toBeNaN();
  });

  it('stands the drawn crest on its point on a front at an angle to the columns, nothing along its ray or across it, from the throw (the advisor, 2026-10-03)', () => {
    // A front at 36.9° to the columns (its ray (−0.6, 0.8)), its crest crossing its throw depth 1 m behind each point along
    // its column, or with no throw point: the crest vertex at σ 12.5 stands on its point, (10, −100), all the same.
    const slope = 0.75;
    const at = (tau: number, throwZ: (k: number) => number) => {
      const n = 21;
      const out = new Float32Array(n * FRONT_STRIDE);
      for (let k = 0; k < n; k += 1) {
        const o = k * FRONT_STRIDE;
        out[o + FRONT_FIELD.x] = k; out[o + FRONT_FIELD.z] = -100 + slope * (k - 10); out[o + FRONT_FIELD.front] = 1;
        out[o + FRONT_FIELD.sigma] = 1.25 * k; out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1;
        out[o + FRONT_FIELD.footDepth] = 7; out[o + FRONT_FIELD.throwZ] = throwZ(k); out[o + FRONT_FIELD.pace] = 6;
      }
      return new SweptLoft(library(), 0.05).build(out, n, 0.5, flat);
    };
    for (const tau of [0, 0.2 * TOUCHDOWN, 0.5 * TOUCHDOWN, 0.8 * TOUCHDOWN, 0.95 * TOUCHDOWN]) {
      for (const throwZ of [(k: number) => -101 + slope * (k - 10), () => Number.NaN]) {
        const loft = at(tau, throwZ);
        const s = sliceAt(loft, 12.5);
        expect(loft.sliceRayX[s]).toBeCloseTo(-0.6, 5);
        expect(loft.sliceRayZ[s]).toBeCloseTo(0.8, 5);
        const v = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
        const dx = loft.positions[v] - 10;
        const dz = loft.positions[v + 2] + 100;
        expect(-0.6 * dx + 0.8 * dz).toBeCloseTo(0, 4);
        expect(0.8 * dx + 0.6 * dz).toBeCloseTo(0, 4);
      }
    }
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

  it('keeps a late live section finite when its mostly faded front exceeds the scratch buffer', () => {
    const loft = loftOf((k) => k < 280 ? 5 : 0.1, 321);
    expect(loft.sliceCount).toBeGreaterThan(0);
    expect(loft.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
    expect(loft.sliceTau.subarray(0, loft.sliceCount).every(Number.isFinite)).toBe(true);
    expect(loft.sliceSigma[loft.sliceCount - 1]).toBeCloseTo(321.5, 5);
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

describe('the tube’s inside as its inner face sees it (the Rich look’s dark throat; the advisor, 2026-10-01)', () => {
  /** The toy tube's open frame (h0 units; the views are scale-free): tip (1.2, 0.5), throat (0.6, 0.6), toe (0.8, 0). */
  const openTube = () => tubeCase(0.3).frames.slice(2 * 2 * PROFILE_POINTS, 3 * 2 * PROFILE_POINTS);

  it('sees from the wall the sky through the opening and the lip’s underside by their 2D view factors, the water ahead for the rest', () => {
    const out = new Float32Array(4 * PROFILE_POINTS);
    throatViews(openTube(), out);
    // Point 100, halfway down the wall at (0.7, 0.3), faces 18.4° up: the window runs from the horizon up to the tip,
    // 21.8° up, and the lip from the tip round to the throat, which lies along the wall itself (90° off its normal).
    const normal = Math.atan2(0.2, 0.6);
    const tip = Math.atan2(0.2, 0.5) - normal;
    expect(out[4 * 100]).toBeCloseTo((Math.sin(tip) + Math.sin(normal)) / 2, 5);
    expect(out[4 * 100 + 1]).toBeCloseTo((1 - Math.sin(tip)) / 2, 5);
    expect(out[4 * 100 + 2]).toBe(1);
  });

  it('sees from the lip’s underside neither the opening (the tip lies below it) nor the lip, and outside the tube the open sky', () => {
    const out = new Float32Array(4 * PROFILE_POINTS);
    throatViews(openTube(), out);
    for (let i = LANDMARK.lip + 1; i < LANDMARK.throat; i += 1) expect([out[4 * i], out[4 * i + 1], out[4 * i + 2]], `underside ${i}`).toEqual([0, 0, 1]);
    for (const i of [0, LANDMARK.crest, LANDMARK.lip - 1, LANDMARK.toe + 1, PROFILE_POINTS - 1]) {
      expect([out[4 * i], out[4 * i + 1], out[4 * i + 2]], `point ${i}`).toEqual([1, 0, 0]);
    }
  });

  it('never sees more than its half of the plane, on any library frame', () => {
    const out = new Float32Array(4 * PROFILE_POINTS);
    const floats = 2 * PROFILE_POINTS;
    let checked = 0;
    const wrong: string[] = [];
    for (const c of readBarrelCases().map(decodeCase)) {
      for (let f = 0; (f + 1) * floats <= c.frames.length; f += 1) {
        throatViews(c.frames.subarray(f * floats, (f + 1) * floats), out);
        for (let i = LANDMARK.lip; i <= LANDMARK.toe; i += 1) {
          const [sky, lip] = [out[4 * i], out[4 * i + 1]];
          if (!(sky >= 0 && lip >= 0 && sky + lip <= 1 + 1e-6)) wrong.push(`${c.id} frame ${f} point ${i}: sky ${sky}, lip ${lip}`);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(10_000);
    expect(wrong).toEqual([]);
  });

  it('carries the views per vertex in the loft, with the lip’s mean thickness and the inner face’s weight × its lift', () => {
    const loft = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    const base = sliceAt(loft, 10) * LOFT_SAMPLES + LOFT.extensionSamples;
    // The drawn profile is the toy's open frame at h0 7 m.
    const profile = openTube().map((v) => 7 * v);
    const views = new Float32Array(4 * PROFILE_POINTS);
    throatViews(profile, views);
    const across = new Float32Array(PROFILE_POINTS);
    sheetAcross(profile, 7, across, new Float32Array(PROFILE_POINTS));
    let mean = 0;
    for (let i = THROAT.thicknessFrom; i <= THROAT.thicknessTo; i += 1) mean += across[i];
    mean /= THROAT.thicknessTo - THROAT.thicknessFrom + 1;
    expect(mean).toBeGreaterThan(0.5);
    for (let i = 0; i < PROFILE_POINTS; i += 1) {
      const v = base + i;
      expect(loft.throat[4 * v], `sky ${i}`).toBeCloseTo(views[4 * i], 5);
      expect(loft.throat[4 * v + 1], `lip ${i}`).toBeCloseTo(views[4 * i + 1], 5);
      expect(loft.throat[4 * v + 2], `thickness ${i}`).toBeCloseTo(mean, 4);
      expect(loft.throat[4 * v + 3], `weight ${i}`).toBe(i >= LANDMARK.lip && i <= LANDMARK.toe ? loft.lift[v] : 0);
    }
    expect(loft.lift[base + 100]).toBe(1);
  });

  /** The synthetic lip, whose underside is folded onto its tip before τ = 0 as the library's are (the toy tube's tent isn't). */
  const lips = () => new ProfileLibrary([lipCase(0.3, 0.05)]);

  it('has no inside before the underside forms', () => {
    const loft = new SweptLoft(lips(), 0.05).build(records(21, () => -0.3, -100), 21, 0.5, flat);
    for (let v = 0; v < loft.vertexCount; v += 1) expect(loft.throat[4 * v + 3]).toBe(0);
  });

  it('measures each slice’s distance along its front to its tube’s mouth: the nearest slice without an underside, or its run’s end', () => {
    for (const tau of [() => 0.1, (k: number) => (k < 8 ? -0.3 : 0.1)]) {
      const loft = new SweptLoft(lips(), 0.05).build(records(21, tau, -100), 21, 0.5, flat);
      let first = 0;
      let formed = 0;
      for (let s = 0; s < loft.sliceCount; s += 1) {
        if (loft.sliceJoined[s]) continue;
        // The run first..s: the tube opens at its ends and at its slices without an underside.
        const openings = [loft.sliceSigma[first], loft.sliceSigma[s]];
        for (let k = first; k <= s; k += 1) if (!(loft.sliceFormed[k] > 0)) openings.push(loft.sliceSigma[k]);
        for (let k = first; k <= s; k += 1) {
          const nearest = Math.min(...openings.map((o) => Math.abs(loft.sliceSigma[k] - o)));
          expect(loft.sliceMouth[k], `slice ${k}`).toBeCloseTo(loft.sliceFormed[k] > 0 ? nearest : 0, 4);
          if (loft.sliceFormed[k] > 0) formed += 1;
        }
        first = s + 1;
      }
      expect(formed).toBeGreaterThan(20);
      const middle = sliceAt(loft, 12);
      // All open, the middle's mouth is where the front's nearer end blends into the water; half open, the last slice
      // before the throw.
      expect(loft.sliceMouth[middle]).toBeGreaterThan(tau(0) > 0 ? 7 : 3);
      expect(loft.sliceMouth[middle]).toBeLessThan(tau(0) > 0 ? 11 : 6);
    }
  });
});

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

  it('carries the tip’s velocity, and in contact mode its crest point’s from the throw, K̇ = Ṡ − ċ n, Ṡ its point’s pace (the advisor, 2026-10-03)', () => {
    const open = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    const middle = sliceAt(open, 10);
    expect(open.sliceTipAlong[middle]).toBeCloseTo(0.9 * Math.sqrt(9.81 * 7), 3);
    expect(open.sliceTipUp[middle]).toBeCloseTo(-0.3 * Math.sqrt(9.81 * 7), 3);
    // The toy tube's crest stands still (ċ = 0), so a thrown slice's crest point runs at its point's pace along its column,
    // 6.5 m/s per second of the clock, at the throw and on through the collapse, with or without a throw point.
    const anchorV = (sigma: number, tau: number, throwZ: number, pace: (k: number) => number, contact = true) => {
      const loft = new SweptLoft(tubes(), 0.05, { contact }).build(records(21, () => tau, throwZ, pace), 21, 0.5, flat);
      const s = sliceAt(loft, sigma);
      return [loft.sliceAnchorVX[s], loft.sliceAnchorVZ[s]];
    };
    const collapse = tubes().profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 }).collapseSeconds;
    for (const tau of [0, 0.1, 0.4 * TUBE_UNIT, 0.5 * TUBE_UNIT + 0.5 * collapse]) {
      for (const throwZ of [-103, Number.NaN]) {
        const [vx, vz] = anchorV(10, tau, throwZ, () => 6.5);
        expect(vx).toBeCloseTo(0, 9);
        expect(vz).toBeCloseTo(6.5, 5);
      }
    }
    // Before the throw, in the drawing, and without a pace (no crash): none.
    expect(anchorV(10, -0.1, -103, () => 6.5)).toEqual([0, 0]);
    expect(anchorV(10, 0.1, -103, () => 6.5, false)).toEqual([0, 0]);
    expect(anchorV(10, 0.1, -103, () => Number.NaN)[1]).toBeCloseTo(0, 9);
    // Between two points' paces it is linear; between a paced point and one without, the paced one's.
    expect(anchorV(9.5, 0.1, -103, (k) => (k <= 9 ? 6 : 8))[1]).toBeCloseTo(7, 5);
    expect(anchorV(9.5, 0.1, -103, (k) => (k <= 9 ? 6 : Number.NaN))[1]).toBeCloseTo(6, 5);
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

    it('seals an exposed overlap cut onto the water with a supported mask in both drawing and contact', () => {
      const water = (x: number, z: number) => 0.5 + 0.002 * x - 0.003 * z;
      const results = [false, true].map((contact) => new SweptLoft(tubes(), 0.05, { contact }).build(two(10), 42, 0.5, water));
      for (const loft of results) {
        const first = Array.from(loft.sliceJoined.subarray(0, loft.sliceCount)).findIndex((joined, s) =>
          joined === 1 && loft.sliceFront[s] === 2);
        expect(first).toBeGreaterThan(0);
        expect(loft.sliceJoined[first - 1]).toBe(0);
        expect(loft.sliceWeight[first]).toBe(0);
        expect(loft.sliceWeight[first + 1]).toBeGreaterThan(0);
        for (let j = 0; j < LOFT_SAMPLES; j += 1) {
          const v = first * LOFT_SAMPLES + j;
          expect(loft.positions[3 * v + 1]).toBeCloseTo(water(loft.positions[3 * v], loft.positions[3 * v + 2]), 5);
          expect(loft.lift[v]).toBe(0);
          expect(loft.mask[v]).toBe(0);
          expect(loft.sheetWeight[v]).toBe(0);
          expect(loft.throat[4 * v + 3]).toBe(0);
        }
      }
      expect(Array.from(results[0].sliceWeight.subarray(0, results[0].sliceCount)))
        .toEqual(Array.from(results[1].sliceWeight.subarray(0, results[1].sliceCount)));
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

    describe('the lip’s stored velocity against the drawn tip’s motion (the advisor, 2026-09-30 and 2026-10-03)', () => {
      /**
       * A 20 m front at foot crest A0 × 7 m, tilted `slope` (dz/dx) to the columns, σ its arc length; its point's crest
       * moving shoreward at `pace` along its column from its throw at z −100 (at k 10), the records carrying that pace from
       * the throw, as `SweptCrash` sets it, and a throw point there or none.
       */
      const moving = (a0: number, pace: number, tau: number, slope = 0, anchored = true) => {
        const n = 21;
        const out = new Float32Array(n * FRONT_STRIDE);
        for (let k = 0; k < n; k += 1) {
          const o = k * FRONT_STRIDE;
          const base = -100 + slope * (k - 10);
          out[o + FRONT_FIELD.x] = k; out[o + FRONT_FIELD.z] = base + pace * tau; out[o + FRONT_FIELD.front] = 1;
          out[o + FRONT_FIELD.sigma] = k * Math.sqrt(1 + slope * slope); out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = a0 * 7;
          out[o + FRONT_FIELD.footDepth] = 7; out[o + FRONT_FIELD.throwZ] = anchored && tau >= 0 ? base : Number.NaN;
          out[o + FRONT_FIELD.pace] = tau >= 0 ? pace : Number.NaN;
        }
        return out;
      };
      const middle = (loft: LoftResult) => sliceAt(loft, 10);

      it('keeps a moving pre-overturn landmark separate from a material lip jet, and stops geometric transport when held', () => {
        const before = new SweptLoft(library, 1 / 19, { contact: true }).build(moving(0.1414, 4, 0.08), 21, 0.5, flat);
        const s = middle(before);
        expect(before.sliceTipAlong[s]).toBe(0);
        expect(before.sliceTipUp[s]).toBe(0);
        expect(Math.abs(before.sliceTipTransportAlong[s])).toBeGreaterThan(1);

        const times = library.profileTimes({ slope: 1 / 19, footHeight: 0.1414 * 7, footDepth: 7 });
        const held = new SweptLoft(library, 1 / 19, { contact: true })
          .build(moving(0.1414, 4, times.touchdownSeconds + times.collapseSeconds / 2), 21, 0.5, flat);
        const h = middle(held);
        expect(held.sliceTipTransportAlong[h]).toBe(0);
        expect(held.sliceTipTransportUp[h]).toBe(0);
        expect(Math.abs(held.sliceTipAlong[h])).toBeGreaterThan(1);
      });

      it('agrees within 0.5 m/s from the throw until a case holds, along and across the columns, on straight and slanted fronts, with and without a throw point (the advisor, 2026-10-03)', { timeout: 240_000 }, () => {
        // Fronts along the columns and at 36.9° to them (rays (0, 1) and (−0.6, 0.8)); each case alone, the point's crest
        // slower and faster than the library's (5.2 and 7.3–7.8 m/s at these A0). The contact builds as the game does,
        // with no depth (the loft reads none since the pace's clamp went: it is held at the throw). From the throw, the
        // first window wholly after it, until a window before the case's held frame: from there the tip decelerates into
        // touchdown faster than its ±4-frame line follows (up to 0.5 m/s), and past the hold the drawn tip goes on to touch
        // down (up to 0.9). This is geometric landmark transport, not the material jet flow: before sustained overturn
        // the landmark still moves along the steep face although the measured material jet is correctly zero.
        const unit = Math.sqrt(7 / 9.81);
        let checked = 0;
        for (const slope of [0, 0.75]) {
          const sigma = 10 * Math.sqrt(1 + slope * slope);
          for (const [a0, held] of [[0.1414, 0.95], [0.3, 1.1338]] as const) {
            const times = library.profileTimes({ slope: 1 / 19, footHeight: a0 * 7, footDepth: 7 });
            const window = 4 * times.frameSeconds;
            for (const pace of [4, 11]) {
              for (const anchored of [true, false]) {
                const tip = (tau: number) => {
                  const drawn = new SweptLoft(library, 1 / 19).build(moving(a0, pace, tau, slope, anchored), 21, 0.5, flat);
                  const v = 3 * (sliceAt(drawn, sigma) * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
                  return [drawn.positions[v], drawn.positions[v + 2]];
                };
                const stored = (tau: number) => {
                  const contact = new SweptLoft(library, 1 / 19, { contact: true }).build(moving(a0, pace, tau, slope, anchored), 21, 0.5, flat);
                  const s = sliceAt(contact, sigma);
                  return [contact.sliceTipTransportAlong[s] * contact.sliceRayX[s] + contact.sliceAnchorVX[s], contact.sliceTipTransportAlong[s] * contact.sliceRayZ[s] + contact.sliceAnchorVZ[s]];
                };
                for (let tau = window; tau + 2 * window <= held * unit; tau += 0.04) {
                  const mean = [0, 0];
                  for (let k = -4; k <= 4; k += 1) {
                    const v = stored(tau + (k * window) / 4);
                    mean[0] += v[0] / 9;
                    mean[1] += v[1] / 9;
                  }
                  const ahead = tip(tau + window);
                  const behind = tip(tau - window);
                  const residual = [0, 1].map((axis) => (ahead[axis] - behind[axis]) / (2 * window) - mean[axis]);
                  expect(Math.sqrt(residual[0] * residual[0] + residual[1] * residual[1]),
                    `A0=${a0}, slope=${slope}, pace=${pace}, anchored=${anchored}, tau=${tau}, window=${window}`,
                  ).toBeLessThan(0.5);
                  checked += 1;
                }
              }
            }
          }
        }
        expect(checked).toBeGreaterThan(100);
      });

      it('takes Ṡ from its point’s pace in the records, whole from the throw, neither blended in nor clamped (the advisor, 2026-10-03)', () => {
        // The point's z still at −100, its pace 20 or 30 m/s in the records (a crest leaping that fast, which the dropped
        // 1.5 √(g h) clamp would have held to 6.6 m/s over 2 m of water): the crest point's velocity moves by exactly the
        // paces' difference from just after the throw on, with or without a throw point. Without a pace (no crash) Ṡ is 0.
        const anchorVZ = (tau: number, pace: number, anchored = true) => {
          const records = moving(0.3, 0, tau, 0, anchored);
          for (let k = 0; k < 21; k += 1) records[k * FRONT_STRIDE + FRONT_FIELD.pace] = tau >= 0 ? pace : Number.NaN;
          const loft = new SweptLoft(library, 1 / 19, { contact: true }).build(records, 21, 0.5, flat);
          return loft.sliceAnchorVZ[middle(loft)];
        };
        for (const tau of [0.01, 0.05, 0.5, 1]) {
          expect(anchorVZ(tau, 30) - anchorVZ(tau, 20)).toBeCloseTo(10, 4);
          expect(anchorVZ(tau, 30, false)).toBeCloseTo(anchorVZ(tau, 30), 6);
          expect(anchorVZ(tau, 30) - anchorVZ(tau, Number.NaN)).toBeCloseTo(30, 4);
        }
        // Before the throw the anchor carries no motion of its own.
        expect(anchorVZ(-0.05, 30)).toBe(0);
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


describe('a kinked front’s stable full-front ray field', () => {
  const padang = new ProfileLibrary(readBarrelCases('padang').map(decodeCase));
  const source = () => {
    const data = records(21, k => k === 10 ? 0.46829 : 0.48942, Number.NaN, k => k === 10 ? 5.2612 : Number.NaN);
    let sigma = 0;
    for (let k = 0; k < 21; k += 1) {
      const z = k === 10 ? -6.420957 : -3.5;
      if (k > 0) {
        const dz = z - data[(k - 1) * FRONT_STRIDE + FRONT_FIELD.z];
        sigma += Math.sqrt(1 + dz * dz);
      }
      const o = k * FRONT_STRIDE;
      data[o + FRONT_FIELD.x] = 130.5 + k;
      data[o + FRONT_FIELD.z] = z;
      data[o + FRONT_FIELD.sigma] = sigma;
      data[o + FRONT_FIELD.footHeight] = 1.3;
    }
    return data;
  };

  it('keeps every uploaded row’s two endpoint advances positive while retaining the crest anchors', () => {
    const data = source();
    for (const contact of [false, true]) {
      const builder = new SweptLoft(padang, 1 / 19, { contact });
      const loft = builder.build(data, 21, 0.5, flat);
      const plannedSigmas = (builder as unknown as { sigmas: Float64Array }).sigmas;
      expect(loft.rayCorrections).toBeGreaterThan(0);
      expect(loft.rayInvalidIntervals).toBe(0);
      expect(loft.rayMinAdvance).toBeGreaterThan(0);
      expect(loft.sliceCount).toBeGreaterThan(40);
      let rows = 0;
      for (let s = 0; s < loft.sliceCount; s += 1) {
        // Use the original query sigma; its float32 output metadata is rounded separately.
        const sigma = plannedSigmas[s];
        let k = 0;
        while (k + 1 < 20 && data[(k + 1) * FRONT_STRIDE + FRONT_FIELD.sigma] < sigma) k += 1;
        const a = k * FRONT_STRIDE;
        const b = (k + 1) * FRONT_STRIDE;
        // Anchors inside the controls interpolate the original transport points. Shoulder anchors extrapolate.
        if (sigma >= 0 && sigma <= data[20 * FRONT_STRIDE + FRONT_FIELD.sigma]) {
          const share = (sigma - data[a + FRONT_FIELD.sigma]) / (data[b + FRONT_FIELD.sigma] - data[a + FRONT_FIELD.sigma]);
          const v = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
          expect(loft.positions[v]).toBe(Math.fround(data[a + FRONT_FIELD.x] + share * (data[b + FRONT_FIELD.x] - data[a + FRONT_FIELD.x])));
          expect(loft.positions[v + 2]).toBe(Math.fround(data[a + FRONT_FIELD.z] + share * (data[b + FRONT_FIELD.z] - data[a + FRONT_FIELD.z])));
        }
        if (!loft.sliceJoined[s]) continue;
        for (let j = 0; j < LOFT_SAMPLES; j += 1) {
          const a = 3 * (s * LOFT_SAMPLES + j);
          const b = a + 3 * LOFT_SAMPLES;
          const dx = loft.positions[b] - loft.positions[a];
          const dz = loft.positions[b + 2] - loft.positions[a + 2];
          expect(dx * loft.sliceRayZ[s] - dz * loft.sliceRayX[s]).toBeGreaterThan(0);
          expect(dx * loft.sliceRayZ[s + 1] - dz * loft.sliceRayX[s + 1]).toBeGreaterThan(0);
          rows += 1;
        }
      }
      expect(rows).toBeGreaterThan(5_000);
      expect(Array.from(loft.positions.subarray(0, 3 * loft.vertexCount)).every(Number.isFinite)).toBe(true);
    }
  });

  it('covers both shoulders and queries the same field despite phase, hold and refinement differences', () => {
    const data = source();
    const phase = data.slice();
    for (let k = 0; k < 21; k += 1) phase[k * FRONT_STRIDE + FRONT_FIELD.tau] += k % 2 === 0 ? 0.12 : -0.12;
    const plan = new CrestRayPlan(padang, 1 / 19, LOFT.extension, minimumCrestRaySpacing(LOFT.extension, LOFT.spacing));
    plan.prepareRecords(data, 0, 21);
    const from = data[FRONT_FIELD.sigma] - LOFT.extension;
    const to = data[20 * FRONT_STRIDE + FRONT_FIELD.sigma] + LOFT.extension;
    const ray = new Float64Array(2);
    for (const contact of [false, true]) for (const front of [data, phase]) {
      const loft = new SweptLoft(padang, 1 / 19, { contact }).build(front, 21, 0.5, flat);
      expect(loft.sliceCount).toBeGreaterThan(40);
      expect(loft.sliceSigma[0]).toBeCloseTo(from, 6);
      expect(loft.sliceSigma[loft.sliceCount - 1]).toBeCloseTo(to, 6);
      for (let s = 0; s < loft.sliceCount; s += 1) {
        expect(loft.sliceSigma[s]).toBeGreaterThanOrEqual(from);
        expect(loft.sliceSigma[s]).toBeLessThanOrEqual(to);
        // sliceSigma is stored in float32 while the original query is a planned double sigma.
        plan.rayAt(loft.sliceSigma[s], ray);
        expect(loft.sliceRayX[s]).toBeCloseTo(ray[0], 6);
        expect(loft.sliceRayZ[s]).toBeCloseTo(ray[1], 6);
      }
    }
  });
});
