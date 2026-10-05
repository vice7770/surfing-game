import { describe, expect, it } from 'vitest';
import { GRAVITY } from '../dispersion';
import { boundedCParameters, blendBoundedCParameters, boundedCLifecycle, boundedLeafWidthDelta, boundedCCap, sampleBoundedC } from './boundedCProfile';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { carrierWidthDelta, LANDMARK, PROFILE_POINTS, ProfileLibrary, type BarrelCase, type ProfileQuery } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';

const FLOATS = 2 * PROFILE_POINTS;
const cases = readBarrelCases().map(decodeCase);
const STEP = 0.125;

/** A generic moving carrier, with a caller-authored width curve and valid crest/toe endpoint tangents. */
function widthCase(widthAt: (tau: number) => number, tauStart = 0): BarrelCase {
  const frames = new Float32Array(9 * FLOATS);
  for (let f = 0; f < 9; f++) {
    const width = widthAt(f * STEP);
    for (let i = 0; i < PROFILE_POINTS; i++) {
      let x: number, y: number;
      if (i <= LANDMARK.crest) { x = (i - LANDMARK.crest) / 32; y = 1 + x / 8; }
      else if (i <= LANDMARK.toe) {
        const t = (i - LANDMARK.crest) / (LANDMARK.toe - LANDMARK.crest);
        x = width * t; y = 1 - t;
      } else { x = width + (i - LANDMARK.toe) / 16; y = (i - LANDMARK.toe) / 128; }
      frames[f * FLOATS + 2 * i] = x;
      frames[f * FLOATS + 2 * i + 1] = y;
    }
  }
  return { id: 'generic-width', slope: 1 / 19, nonlinearity: 0.3, flatDepth: 0.2, breakerHeight: 1,
    tauStep: STEP, tauStart, touchdown: tauStart + 1, frames };
}

/** Existing raw frame semantics, independent of the new mean/correction rule. */
function rawFrame(c: BarrelCase, tau: number): Float32Array {
  const position = Math.max(0, Math.min(c.frames.length / FLOATS - 1, (tau - c.tauStart) / c.tauStep));
  const frame = Math.floor(position), next = Math.min(frame + 1, c.frames.length / FLOATS - 1), share = position - frame;
  const out = new Float32Array(FLOATS);
  for (let i = 0; i < FLOATS; i++) out[i] = c.frames[frame * FLOATS + i]
    + share * (c.frames[next * FLOATS + i] - c.frames[frame * FLOATS + i]);
  return out;
}

/** Prior uncorrected final carrier/event, not a second implementation of the width correction. */
function originalClock(query: Omit<ProfileQuery, 'seconds'>) {
  const slopes = [...new Set(cases.map(c => c.slope))];
  const slope = slopes.reduce((best, value) => Math.abs(value - query.slope) < Math.abs(best - query.slope) ? value : best);
  const group = cases.filter(c => c.slope === slope).sort((a, b) => a.nonlinearity - b.nonlinearity);
  const ratio = query.footHeight / query.footDepth;
  let lower = group[0], upper = group[group.length - 1], weight = 0;
  if (ratio <= lower.nonlinearity) upper = lower;
  else if (ratio >= upper.nonlinearity) lower = upper;
  else for (let i = 0; i + 1 < group.length; i++) if (ratio >= group[i].nonlinearity && ratio <= group[i + 1].nonlinearity) {
    lower = group[i]; upper = group[i + 1];
    weight = (ratio - lower.nonlinearity) / (upper.nonlinearity - lower.nonlinearity);
    break;
  }
  const authored = lower.touchdown + weight * (upper.touchdown - lower.touchdown);
  const scale = lower === upper ? query.footHeight / lower.nonlinearity : query.footDepth;
  const unit = Math.sqrt(scale / GRAVITY), tau = authored * unit / unit, carrier = Math.min(tau, authored);
  let parameters = boundedCParameters(rawFrame(lower, carrier), lower.touchdown, tau);
  if (upper !== lower) parameters = blendBoundedCParameters(parameters,
    boundedCParameters(rawFrame(upper, carrier), upper.touchdown, tau), weight);
  return { ...boundedCLifecycle(parameters), authored, unit };
}

const frameBlend = (c: BarrelCase) => ({ lower: c, upper: c, weight: 0, scale: 1,
  lowerFrame: 0, lowerNext: 0, lowerShare: 0, upperFrame: 0, upperNext: 0, upperShare: 0 });
const vertex = (row: number, point: number) => row * LOFT_SAMPLES + LOFT.extensionSamples + point;
const xAt = (loft: LoftResult, row: number) => loft.positions[3 * vertex(row, LANDMARK.crest)];

describe('shared bounded-C leaf reach', () => {
  it('leaves constant and linear widths unchanged inside, at boundaries and under clamping', () => {
    for (const width of [() => 2, (tau: number) => 2 + tau / 2]) {
      const c = widthCase(width), before = c.frames.slice();
      for (const tau of [-1, 0, 0.03125, STEP, 0.1875, 0.25, 0.4375, 0.5, 0.8125, 0.875, 0.96875, 1, 2]) {
        expect(Math.abs(carrierWidthDelta(c, tau))).toBeLessThan(1e-12);
      }
      expect(c.frames).toEqual(before);
    }
  });

  it('removes an interior isolated width peak continuously, without depending on an absolute clock origin', () => {
    const width = (tau: number) => 2 + 0.25 * Math.max(0, 1 - Math.abs(tau - 0.5) / STEP);
    const c = widthCase(width), shifted = widthCase(width, 4096);
    const coherent = (tau: number) => width(tau) + carrierWidthDelta(c, tau);
    // The triangular excess has half the area of a constant peak over this full centered support.
    expect(coherent(0.5)).toBeCloseTo(2.125, 12);
    const epsilon = 1e-6;
    for (const tau of [0.375, 0.5, 0.625]) {
      expect(Math.abs(coherent(tau + epsilon) - coherent(tau - epsilon))).toBeLessThan(1e-5);
      const before = (coherent(tau) - coherent(tau - epsilon)) / epsilon;
      const after = (coherent(tau + epsilon) - coherent(tau)) / epsilon;
      expect(Math.abs(before - after)).toBeLessThan(2e-4);
    }
    for (const tau of [0, STEP, 0.1875, 0.5, 0.8125, 0.875, 1]) {
      expect(carrierWidthDelta(shifted, 4096 + tau)).toBe(carrierWidthDelta(c, tau));
    }
  });

  it('keeps unsupported endpoint windows raw and starts/ends the correction with zero slope', () => {
    const width = (tau: number) => 2 + 0.25 * (Math.max(0, 1 - Math.abs(tau - 0.25) / STEP)
      + Math.max(0, 1 - Math.abs(tau - 0.75) / STEP));
    const c = widthCase(width), epsilon = 1e-6;
    for (const tau of [0, 0.0625, STEP, 0.875, 0.9375, 1]) expect(carrierWidthDelta(c, tau)).toBe(0);
    for (const tau of [STEP, 0.875]) {
      expect(Math.abs(carrierWidthDelta(c, tau - epsilon) / epsilon)).toBeLessThan(1e-4);
      expect(Math.abs(carrierWidthDelta(c, tau + epsilon) / epsilon)).toBeLessThan(1e-4);
    }
    expect(Math.abs(carrierWidthDelta(c, 0.1875))).toBeGreaterThan(0);
  });

  it('preserves feasible mean corrections exactly throughout the identity core', () => {
    // These ratios include small and near-shoulder corrections; they are not expected values
    // computed by a second implementation of the bound.
    for (const budget of [1e-200, 0.005, 0.03125, 10, 1e200]) {
      for (const ratio of [-0.6, -0.5229, -0.3809, -0.0204, 0, 0.0204, 0.3809, 0.5229, 0.6]) {
        const requested = ratio * budget;
        expect(boundedLeafWidthDelta(requested, budget)).toBe(requested);
      }
    }
    expect(Object.is(boundedLeafWidthDelta(-0, 1), -0)).toBe(true);
  });

  it('is odd, monotonic and joins both shoulders with unit first derivative', () => {
    const budget = 0.03125, epsilon = budget * 1e-6;
    let previous = -budget;
    for (const ratio of [-100, -5, -1, -0.75, -0.6, -0.5229, -0.3809, -0.0204,
      0, 0.0204, 0.3809, 0.5229, 0.6, 0.75, 1, 5, 100]) {
      const requested = ratio * budget, value = boundedLeafWidthDelta(requested, budget);
      expect(Number.isFinite(value)).toBe(true);
      expect(Math.abs(value)).toBeLessThan(budget);
      expect(value).toBeGreaterThan(previous);
      expect(boundedLeafWidthDelta(-requested, budget)).toBe(-value);
      previous = value;
    }
    for (const requested of [-0.6 * budget, 0, 0.6 * budget]) {
      const value = boundedLeafWidthDelta(requested, budget);
      const left = (value - boundedLeafWidthDelta(requested - epsilon, budget)) / epsilon;
      const right = (boundedLeafWidthDelta(requested + epsilon, budget) - value) / epsilon;
      expect(Math.abs(left - right)).toBeLessThan(5e-6);
      expect(Math.abs(left - 1)).toBeLessThan(5e-6);
      expect(Math.abs(right - 1)).toBeLessThan(5e-6);
    }
  });

  it('keeps huge finite requests finite and bounded without a ratio overflow', () => {
    // The non-round budget catches upward ULP rounding of complementary shoulder terms.
    for (const budget of [1e-200, 0.03125, 1, 1.7500000000000011, 1e200, Number.MAX_VALUE]) {
      for (const magnitude of [1e-200, 1, 1e200, Number.MAX_VALUE]) {
        const positive = boundedLeafWidthDelta(magnitude, budget);
        expect(Number.isFinite(positive)).toBe(true);
        expect(positive).toBeGreaterThan(0);
        // Extreme floating-point ratios may round the asymptote to its exact budget.
        expect(positive).toBeLessThanOrEqual(budget);
        expect(positive).toBeLessThanOrEqual(magnitude);
        expect(boundedLeafWidthDelta(-magnitude, budget)).toBe(-positive);
      }
    }
  });

  it('keeps the original leaf domain under extreme reach corrections', () => {
    const carrier = rawFrame(widthCase(() => 2), 0.625);
    // This steep, valid carrier approaches the width-based thickness limit.
    for (let i = 0; i < PROFILE_POINTS; i++) {
      carrier[2 * i] *= 0.5;
      carrier[2 * i + 1] *= 1.6;
    }
    const controls = boundedCParameters(carrier, 1, 0.625);
    const width = controls.toe[0] - controls.crest[0];
    for (const requested of [-Number.MAX_VALUE, -1e9, 0, 1e9, Number.MAX_VALUE]) {
      const final = carrier.slice();
      sampleBoundedC({ ...controls, leafWidthDelta: requested }, final, false, undefined, true);
      // The existing thickness/curvature bound assumes this minimum outer-leaf reach.
      expect(final[2 * 60] - controls.crest[0]).toBeGreaterThanOrEqual(0.85 * width - 2e-7);
      expect(final[2 * 60]).toBeLessThan(controls.toe[0]);
      expect(final.every(Number.isFinite)).toBe(true);
      expect(final[2 * 104 + 1]).toBe(final[2 * LANDMARK.toe + 1]);
    }
  });

  it.each([{ amplitude: 0.015625, maximumResidual: 1 }, { amplitude: 0.0078125, maximumResidual: 0.35 }])(
    'reduces the actual generic cap bend for amplitude $amplitude while keeping true anchors', ({ amplitude, maximumResidual }) => {
    const width = (tau: number) => 2 + amplitude * Math.max(0, 1 - Math.abs(tau - 0.625) / STEP);
    const c = widthCase(width), raw = new ProfileLibrary([c]), corrected = new ProfileLibrary([c], { geometry: 'bounded-C' });
    const query = { slope: c.slope, footHeight: c.nonlinearity, footDepth: 1 };
    const unit = Math.sqrt(1 / GRAVITY), expected = rawFrame(c, c.touchdown);
    const originalEvent = boundedCLifecycle(boundedCParameters(expected, c.touchdown, c.touchdown));
    const before: number[] = [], after: number[] = [];
    for (const tau of [0.5, 0.625, 0.75]) {
      const carrier = new Float32Array(FLOATS), final = new Float32Array(FLOATS);
      raw.profileAt({ ...query, seconds: tau * unit }, carrier);
      const controls = boundedCParameters(carrier, c.touchdown, tau);
      // The direct sampler is the old contour at these same physical carrier controls and event.
      const baseline = carrier.slice();
      sampleBoundedC(controls, baseline, false, originalEvent.impactEvent, true);
      corrected.profileAt({ ...query, seconds: tau * unit }, final);
      before.push(baseline[2 * LANDMARK.lip]); after.push(final[2 * LANDMARK.lip]);
      for (const i of [0, 31, 32, 112, 113, 127]) expect(final.subarray(2 * i, 2 * i + 2)).toEqual(carrier.subarray(2 * i, 2 * i + 2));
      expect(final.every(Number.isFinite)).toBe(true);
      expect(final[2 * 104 + 1]).toBe(final[2 * LANDMARK.toe + 1]);
      expect(final[2 * LANDMARK.lip + 1]).toBeGreaterThan(final[2 * 104 + 1]);
    }
    // Inspect the actual F32 cap response of a generic small width knot. The old bound
    // attenuated even this feasible correction; no old bound formula is reproduced here.
    const rawBend = Math.abs(before[0] - 2 * before[1] + before[2]);
    expect(rawBend).toBeGreaterThan(1e-4);
    expect(Math.abs(after[0] - 2 * after[1] + after[2])).toBeLessThan(maximumResidual * rawBend);
  });

  it('rejoins the authored hold with exact zero added reach and no added one-sided cap velocity', () => {
    const width = (tau: number) => 2 + 0.015625 * Math.max(0, 1 - Math.abs(tau - 0.5) / STEP);
    const c = { ...widthCase(width), touchdown: 0.5 };
    // Frames continue beyond TD: an endpoint fallback cannot make this final-hold test vacuous.
    expect(Math.abs(carrierWidthDelta(c, c.touchdown))).toBeGreaterThan(0);
    const library = new ProfileLibrary([c], { geometry: 'bounded-C' }), unit = Math.sqrt(1 / GRAVITY);
    const query = { slope: c.slope, footHeight: c.nonlinearity, footDepth: 1 };
    const event = boundedCLifecycle(boundedCParameters(rawFrame(c, c.touchdown), c.touchdown, c.touchdown)).impactEvent;
    const point = new Float64Array(2);
    const extraReach = (tau: number) => {
      const carrier = rawFrame(c, Math.min(tau, c.touchdown));
      const baseline = boundedCCap(boundedCParameters(carrier, c.touchdown, tau), event);
      library.pointAt({ ...query, seconds: tau * unit }, LANDMARK.lip, point);
      return point[0] - baseline[0];
    };
    expect(Math.abs(extraReach(c.touchdown - STEP / 4))).toBeGreaterThan(1e-5);
    expect(extraReach(c.touchdown)).toBe(0);
    const epsilon = 1e-3;
    expect(extraReach(c.touchdown + epsilon)).toBe(0);
    // A linear fade would retain a nonzero extra velocity here; inspect actual F32 cap displacement instead.
    expect(Math.abs(extraReach(c.touchdown - epsilon) / epsilon)).toBeLessThan(0.01);
  });

  it('retains exact original lifecycle clocks and shares full/cap/table geometry through the final-hold taper', () => {
    const library = new ProfileLibrary(cases, { geometry: 'bounded-C' }), raw = new ProfileLibrary(cases);
    const snapshots = cases.map(c => c.frames.slice());
    const queries = cases.map(c => ({ slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 }));
    const padang = cases.filter(c => c.slope === cases.find(c => c.id === 'pad19-a30-l12')!.slope)
      .sort((a, b) => a.nonlinearity - b.nonlinearity);
    queries.push({ slope: padang[0].slope, footHeight: (padang[0].nonlinearity + padang[1].nonlinearity) * 7 / 2, footDepth: 7 });
    const final = new Float32Array(FLOATS), carrier = new Float32Array(FLOATS), contact = new Float32Array(FLOATS), point = new Float64Array(2);
    for (const query of queries) {
      const prior = originalClock(query), times = library.profileTimes(query), authoredSeconds = prior.authored * prior.unit;
      expect(times.touchdownSeconds).toBe(prior.impactTau * prior.unit);
      expect(times.clearSeconds).toBe(prior.fullyFormedTau * prior.unit);
      expect(times.collapseSeconds).toBe((prior.retiredTau - prior.impactTau) * prior.unit);
      for (const seconds of [0, times.clearSeconds / 2, times.clearSeconds,
        authoredSeconds - 0.75 * times.frameSeconds, authoredSeconds - 0.25 * times.frameSeconds,
        authoredSeconds, times.touchdownSeconds, times.touchdownSeconds + times.collapseSeconds / 2,
        times.touchdownSeconds + times.collapseSeconds]) {
        const q = { ...query, seconds, hold: 'drawing' as const };
        const lookup = library.profileAt(q, final);
        library.profileAt({ ...q, hold: 'contact' }, contact);
        raw.profileAt(q, carrier);
        expect(contact).toEqual(final);
        expect(final.every(Number.isFinite)).toBe(true);
        expect(lookup.touchdownSeconds).toBe(times.touchdownSeconds);
        for (const i of [0, 31, 32, 112, 113, 127]) expect(final.subarray(2 * i, 2 * i + 2)).toEqual(carrier.subarray(2 * i, 2 * i + 2));
        for (const i of [32, 64, 88, 112]) {
          library.pointAt(q, i, point);
          expect(Array.from(point)).toEqual(Array.from(final.subarray(2 * i, 2 * i + 2)));
        }
        expect(library.frameBlend(q, frameBlend(cases[0])).analyticProfile).toEqual(final);
        if (seconds >= times.touchdownSeconds && lookup.analytic!.sheetExists) {
          expect(final[2 * LANDMARK.lip + 1]).toBe(final[2 * 104 + 1]);
        }
        if (seconds === times.touchdownSeconds + times.collapseSeconds) {
          expect(lookup.analytic!.sheetExists).toBe(false);
          expect(lookup.analytic!.thickness).toBe(0);
        }
      }
    }
    cases.forEach((c, i) => expect(c.frames).toEqual(snapshots[i]));
  });

  it('shares actual draw/eager/deferred contact without moving raw knots or the zero-origin lattice', () => {
    const c = cases.find(c => c.id === 'pad19-a30-l12')!, library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
    const query = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 }, times = library.profileTimes(query);
    const authored = times.clearSeconds / 0.4, records = new Float32Array(9 * FRONT_STRIDE);
    for (let k = 0; k < 9; k++) {
      const x = k + 0.125;
      records.set([x, -100 + x / 32, 1, k, authored - 3 * times.frameSeconds + (k - 4) * times.frameSeconds / 4,
        query.footHeight, query.footDepth, -100, 0], k * FRONT_STRIDE);
    }
    const original = records.slice(), water = (x: number, z: number) => 0.5 + 0.02 * x + 0.08 * Math.sin(z + 100);
    const draw = new SweptLoft(library, c.slope, { sheet: false }).build(records, 9, 0.5, water);
    const eager = new SweptLoft(library, c.slope, { contact: true }).build(records, 9, 0.5, water);
    const owner = SweptLoft.forContactQueries(library, c.slope), deferred = owner.build(records, 9, 0.5, water);
    for (let row = 0; row < deferred.sliceCount; row++) owner.prepareRow(row);
    for (let v = 0; v < deferred.vertexCount; v++) owner.prepareNormal(v);
    expect(records).toEqual(original);
    for (const key of ['positions', 'indices', 'normals', 'sliceTau', 'sliceSigma', 'sliceWeight', 'slicePhase', 'sliceJoined'] as const) {
      expect(eager[key]).toEqual(draw[key]); expect(deferred[key]).toEqual(draw[key]);
    }
    const xs = Array.from({ length: draw.sliceCount }, (_, row) => xAt(draw, row));
    for (let k = 0; k < 9; k++) {
      const row = xs.indexOf(records[k * FRONT_STRIDE + FRONT_FIELD.x]);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(draw.sliceTau[row]).toBe(records[k * FRONT_STRIDE + FRONT_FIELD.tau]);
      expect(draw.sliceSigma[row]).toBe(records[k * FRONT_STRIDE + FRONT_FIELD.sigma]);
    }
    for (let x = 0.5; x <= 8; x += 0.5) expect(xs).toContain(x);
    expect(draw.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    expect(draw.rayInvalidIntervals).toBe(0); expect(draw.rayMinAdvance).toBeGreaterThan(0);
  });
});
