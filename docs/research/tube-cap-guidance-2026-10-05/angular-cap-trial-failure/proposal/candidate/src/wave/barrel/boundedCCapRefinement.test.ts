import { describe, expect, it, vi } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type ProfileQuery } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, sampledCapQuarterTurn, SweptLoft, type LoftResult } from './sweptLoft';

const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const c = cases.find(value => value.id === 'pad19-a30-l12')!;
type Query = Omit<ProfileQuery, 'seconds' | 'hold'>;
const STILL = 0.5;

function metricQuery(): Query {
  const query = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 };
  const profile = new Float32Array(2 * PROFILE_POINTS);
  library.profileAt({ ...query, seconds: library.profileTimes(query).clearSeconds }, profile);
  const scale = 3 / (profile[2 * LANDMARK.crest + 1] - profile[2 * LANDMARK.toe + 1]);
  return { slope: query.slope, footHeight: query.footHeight * scale, footDepth: query.footDepth * scale };
}

function packet(query: Query, age: (x: number) => number): Float32Array {
  const records = new Float32Array(9 * FRONT_STRIDE);
  for (let k = 0; k < 9; k++) {
    const x = k + 0.5;
    records.set([x, -100, 1, k, age(x), query.footHeight, query.footDepth, -100, 0], k * FRONT_STRIDE);
  }
  return records;
}

const vertex = (row: number, point: number) => row * LOFT_SAMPLES + LOFT.extensionSamples + point;
const xAt = (loft: LoftResult, row: number) => loft.positions[3 * vertex(row, LANDMARK.crest)];
const roster = (loft: LoftResult) => Array.from({ length: loft.sliceCount }, (_, row) => xAt(loft, row));

/** Independent full-profile oracle at the actual packet's interpolated clock and metric controls. */
function fullCapAt(records: Float32Array, query: Query, x: number): number[] {
  let k = 0;
  while (k + 1 < 8 && records[(k + 1) * FRONT_STRIDE] < x) k++;
  const left = k * FRONT_STRIDE, right = (k + 1) * FRONT_STRIDE;
  const share = (x - records[left]) / (records[right] - records[left]);
  const field = (offset: number) => records[left + offset] + share * (records[right + offset] - records[left + offset]);
  const profile = new Float32Array(2 * PROFILE_POINTS);
  library.profileAt({ ...query, footHeight: field(FRONT_FIELD.footHeight), footDepth: field(FRONT_FIELD.footDepth),
    seconds: field(FRONT_FIELD.tau) }, profile);
  return [x, STILL + profile[2 * LANDMARK.lip + 1],
    field(FRONT_FIELD.z) - profile[2 * LANDMARK.crest] + profile[2 * LANDMARK.lip]];
}

/** Independent retained-polyline angle; no assumption that the local quarter criterion certifies every corner. */
function maximumPolylineTurn(points: number[][]): number {
  let maximum = 0;
  for (let k = 1; k + 1 < points.length; k++) {
    const a = points[k].map((v, axis) => v - points[k - 1][axis]);
    const b = points[k + 1].map((v, axis) => v - points[k][axis]);
    const norm = Math.hypot(...a) * Math.hypot(...b);
    if (!(norm > 0)) throw Error('test polyline has no resolvable direction');
    maximum = Math.max(maximum, Math.acos(Math.max(-1, Math.min(1,
      a.reduce((sum, v, axis) => sum + v * b[axis], 0) / norm))) * 180 / Math.PI);
  }
  return maximum;
}

type RefinementHarness = {
  cCapPoints: Float64Array; cX: Float64Array;
  cCapAt(records: Float32Array, front: unknown, x: number, offset: number): boolean;
  cRefineCap(records: Float32Array, front: unknown, left: number, right: number,
    clockMidpoint: boolean, level: number, count: number): number;
};

describe('bounded local C cap refinement', () => {
  it('adds bounded stations for a steep C1 curve whose quarter chord error passes but its polyline corner is sharp', () => {
    // This is an explicit generic cap oracle UNIT fixture, not a fabricated wave/body or saved native profile.
    // At t=0 the linear incoming derivative equals the exponential return's derivative; the curve is C1 there.
    const left = 4.25, right = 4.5, amplitude = 0.014, width = 0.0035, slowSlope = 0.1;
    const y = (x: number) => {
      const t = x - left;
      return t < 0 ? (slowSlope + amplitude / width) * t : slowSlope * t + amplitude * (1 - Math.exp(-t / width));
    };
    const probes = new Float64Array(10);
    probes.set([0, y(left), 0, y(right)]);
    for (const quarter of [1, 2, 3]) {
      const x = left + (right - left) * quarter / 4;
      probes.set([0, y(x)], 2 * (quarter + 1));
      const chord = y(left) + quarter / 4 * (y(right) - y(left));
      expect(Math.abs(y(x) - chord)).toBeLessThan(0.015);
    }
    expect(sampledCapQuarterTurn(left, right, probes)).toBeGreaterThan(8);
    const query = metricQuery(), records = packet(query, () => library.profileTimes(query).clearSeconds);
    const loft = new SweptLoft(library, query.slope, { sheet: false });
    // Initialize ordinary diagnostics, then exercise only the real bounded refinement routine with the named oracle.
    const diagnostics = loft.build(records, 9, STILL, () => STILL).cSampling!.capRefinement;
    const state = loft as unknown as RefinementHarness;
    const cap = vi.spyOn(state, 'cCapAt').mockImplementation((_records, _front, x, offset) => {
      state.cCapPoints[offset] = 0; state.cCapPoints[offset + 1] = y(x); return true;
    });
    try {
      const front = { id: 1, start: 0, end: 9, first: 0, last: 8, fromX: -1, toX: 10 };
      const count = state.cRefineCap(records, front, left, right, false, 0, 0);
      const xs = [left, ...state.cX.subarray(0, count), right];
      expect(count).toBeGreaterThan(0);
      expect(xs.every(x => x * 16 === Math.round(x * 16))).toBe(true);
      for (let k = 1; k < xs.length; k++) expect(xs[k] - xs[k - 1]).toBeGreaterThanOrEqual(0.0625);
      const point = (x: number) => [x, y(x), 0];
      const oldCorner = maximumPolylineTurn([point(left - 0.125), point(left), point(right)]);
      const refinedCorner = maximumPolylineTurn([point(left - 0.125), ...xs.map(point)]);
      expect(oldCorner).toBeGreaterThan(20); expect(refinedCorner).toBeLessThan(oldCorner);
      // One tested interval still uses endpoints + the original three interior probes. No extra angular queries.
      expect(cap.mock.calls.length % 5).toBe(0); expect(cap.mock.calls.length).toBeLessThanOrEqual(35);
      expect(diagnostics.angularSplitRequests).toBeGreaterThan(0);
      expect(diagnostics.unverifiedSmallSpanLeaves + diagnostics.unverifiedDepthLeaves).toBeGreaterThan(0);
      // This deliberately sharp C1 fixture remains limited by the unchanged spacing/depth: no universal8deg promise.
      expect(refinedCorner).toBeGreaterThan(8);
    } finally { cap.mockRestore(); }
  });

  it('treats zero, nearly-zero and repeated F32 probe directions as indeterminate rather than a fabricated zero turn', () => {
    const flat = new Float64Array(10);
    expect(sampledCapQuarterTurn(0, 0, flat)).toBeNull();
    expect(sampledCapQuarterTurn(0, 1e-18, flat)).toBeNull();
    expect(sampledCapQuarterTurn(2 ** 27, 2 ** 27 + 32, flat)).toBeNull();
    expect(sampledCapQuarterTurn(0, 0.25, flat)).toBe(0);
    const invalid = flat.slice(); invalid[5] = NaN;
    expect(sampledCapQuarterTurn(0, 0.25, invalid)).toBeNull();
  });

  it('reuses exactly five eligible cap probes on a straight mature interval and preserves an original clock midpoint', () => {
    const query = metricQuery(), seconds = library.profileTimes(query).clearSeconds, records = packet(query, () => seconds);
    const loft = new SweptLoft(library, query.slope, { sheet: false });
    loft.build(records, 9, STILL, () => STILL);
    const state = loft as unknown as RefinementHarness, front = { id: 1, start: 0, end: 9, first: 0, last: 8, fromX: -1, toX: 10 };
    const probes = vi.spyOn(state, 'cCapAt'), points = vi.spyOn(library, 'pointAt');
    try {
      expect(state.cRefineCap(records, front, 4, 4.5, false, 0, 0)).toBe(0);
      expect(probes).toHaveBeenCalledTimes(5); expect(points).toHaveBeenCalledTimes(10);
      probes.mockClear(); points.mockClear();
      const count = state.cRefineCap(records, front, 4, 4.5, true, 0, 0);
      expect(Array.from(state.cX.subarray(0, count))).toEqual([4.25]);
      expect(probes).toHaveBeenCalledTimes(15); expect(points).toHaveBeenCalledTimes(30);
    } finally { probes.mockRestore(); points.mockRestore(); }
  });

  it('reduces the actual provider cap bend against its mandatory lattice/clock plan without a saved seed or camera', () => {
    const query = metricQuery(), times = library.profileTimes(query), authored = times.clearSeconds / 0.4;
    const records = packet(query, x => authored + (4.9 - x) * (0.3 * authored / 1.5));
    const draw = new SweptLoft(library, query.slope, { sheet: false }).build(records, 9, STILL, () => STILL);
    const xs = roster(draw);
    const eligible = (x: number) => {
      const seconds = records[FRONT_FIELD.tau] + (x - records[FRONT_FIELD.x])
        * (records[FRONT_STRIDE + FRONT_FIELD.tau] - records[FRONT_FIELD.tau]);
      return seconds >= times.clearSeconds && seconds <= times.touchdownSeconds;
    };
    // Existing fixture's mandatory quarter lattice; this is not a duplicate implementation of cap refinement.
    const mandatory = Array.from({ length: 9 }, (_, k) => 3.5 + k / 4).filter(eligible);
    const refined = xs.flatMap((x, row) => x >= 3.5 && x <= 5.5 && draw.sliceWeight[row] === 1
      && draw.slicePhase[row] === 1 && eligible(x) ? [Array.from(draw.positions.subarray(
        3 * vertex(row, LANDMARK.lip), 3 * vertex(row, LANDMARK.lip) + 3))] : []);
    expect(mandatory.length).toBeGreaterThanOrEqual(3); expect(refined.length).toBeGreaterThan(mandatory.length);
    expect(maximumPolylineTurn(refined)).toBeLessThan(maximumPolylineTurn(mandatory.map(x => fullCapAt(records, query, x))));
    expect(draw.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    // Requested probing/refinement limits remain diagnostic; a measured parent angle is not a final-mesh certificate.
    expect(draw.cSampling!.capRefinement.maximumTurnDegrees).toBe(8);
  });

  it('keeps cap-only point words identical to the complete contour through formation, impact and retirement', () => {
    const group = cases.filter(value => value.slope === c.slope).sort((a, b) => a.nonlinearity - b.nonlinearity);
    const queries = [cases[0], c, cases[cases.length - 1]].map(value => ({
      slope: value.slope, footHeight: value.nonlinearity * 7, footDepth: 7,
    }));
    queries.push({ slope: c.slope, footHeight: (group[0].nonlinearity + group[1].nonlinearity) * 7 / 2, footDepth: 7 });
    const profile = new Float32Array(2 * PROFILE_POINTS), cap = new Float64Array(2);
    for (const query of queries) {
      const times = library.profileTimes(query);
      for (const seconds of [0, 0.1 * times.clearSeconds, 0.7 * times.clearSeconds, times.clearSeconds,
        times.touchdownSeconds - 1e-5, times.touchdownSeconds,
        times.touchdownSeconds + 0.5 * times.collapseSeconds,
        times.touchdownSeconds + times.collapseSeconds]) {
        for (const hold of ['drawing', 'contact'] as const) {
          const sample = { ...query, seconds, hold };
          library.pointAt(sample, LANDMARK.lip, cap);
          library.profileAt(sample, profile);
          expect(Array.from(cap)).toEqual(Array.from(profile.subarray(2 * LANDMARK.lip, 2 * LANDMARK.lip + 2)));
        }
      }
    }
  });

  it('resolves the actual curved falling cap between rows without changing mandatory raw clocks or the open profile', () => {
    const query = metricQuery(), times = library.profileTimes(query), authored = times.clearSeconds / 0.4;
    // A short fall along the crest resembles the captured sharp lip bend, while its sampled mouth remains open.
    const records = packet(query, x => authored + (4.9 - x) * (0.3 * authored / 1.5)), before = records.slice();
    const draw = new SweptLoft(library, query.slope, { sheet: false }).build(records, 9, STILL, () => STILL);
    const xs = roster(draw);
    expect(records).toEqual(before);
    expect(xs.some(x => x >= 3.5 && x <= 5.5 && x * 4 !== Math.round(x * 4))).toBe(true);
    expect(draw.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    // This packet's raw knots lie on the original half-metre lattice: even its bent cap can only add eighth
    // stations within each interval, never an unbounded adaptive mesh.
    expect(xs.every(x => x * 16 === Math.round(x * 16))).toBe(true);
    for (let row = 0; row + 1 < xs.length; row++) expect(xs[row + 1] - xs[row]).toBeGreaterThanOrEqual(0.0625);
    for (let left = 2; left < 10; left += 0.5) expect(xs.filter(x => x >= left && x <= left + 0.5).length).toBeLessThanOrEqual(9);
    const actualTimes = library.profileTimes({ slope: query.slope,
      footHeight: records[FRONT_FIELD.footHeight], footDepth: records[FRONT_FIELD.footDepth] });
    const retirement = actualTimes.touchdownSeconds + actualTimes.collapseSeconds;
    let liveRaw = 0, omittedDeadRaw = 0;
    for (let k = 0; k < 9; k++) {
      const row = xs.indexOf(records[k * FRONT_STRIDE]);
      const tau = records[k * FRONT_STRIDE + FRONT_FIELD.tau];
      if (tau < retirement) {
        expect(row, `live raw knot ${k}`).toBeGreaterThanOrEqual(0);
        liveRaw++;
      } else if (row < 0) {
        // The fixture's upstream 0.5/1.5m knots have intrinsically retired, beyond the one dead closure neighbor.
        expect(tau).toBeGreaterThanOrEqual(retirement);
        omittedDeadRaw++;
      }
      if (row >= 0) {
        expect(draw.sliceTau[row]).toBe(tau);
        expect(draw.sliceSigma[row]).toBe(records[k * FRONT_STRIDE + FRONT_FIELD.sigma]);
      }
    }
    expect(liveRaw).toBeGreaterThan(0); expect(omittedDeadRaw).toBeGreaterThan(0);

    // Independent fixture roster from the preceding 0.5m lattice + its original clock midpoints. The 1m raw
    // intervals exceed the old 3-frame threshold at every half interval; shoulder clocks remain constant.
    const tauAt = (x: number) => {
      const k = Math.max(0, Math.min(7, Math.floor(x - 0.5))), share = Math.max(0, Math.min(1, x - k - 0.5));
      return records[k * FRONT_STRIDE + FRONT_FIELD.tau]
        + share * (records[(k + 1) * FRONT_STRIDE + FRONT_FIELD.tau] - records[k * FRONT_STRIDE + FRONT_FIELD.tau]);
    };
    expect(Math.abs(tauAt(1) - tauAt(0.5))).toBeGreaterThan(LOFT.frames * actualTimes.frameSeconds);
    const previousPlanned = [-1, -0.5, 0, 0.5,
      ...Array.from({ length: 32 }, (_, k) => 0.75 + 0.25 * k), 9, 9.5, 10];
    const previousLive = previousPlanned.map(x => tauAt(x) < retirement);
    for (let k = 0; k < previousPlanned.length; k++) {
      if (!previousLive[k] && !previousLive[k - 1] && !previousLive[k + 1]) continue;
      const x = previousPlanned[k], row = xs.indexOf(x);
      expect(row, `previously retained lattice/clock station ${x}`).toBeGreaterThanOrEqual(0);
      expect(draw.sliceTau[row]).toBe(Math.fround(tauAt(x)));
      expect(draw.sliceSigma[row]).toBe(Math.fround(x - 0.5));
    }
    expect(draw.sliceFade[0]).toBe(0); expect(draw.sliceWeight[0]).toBe(0);
    expect(draw.sliceJoined[0]).toBe(1); expect(draw.sliceFade[1]).toBeGreaterThan(0);
    let measured = 0;
    for (let row = 0; row + 1 < draw.sliceCount; row++) {
      if (!draw.sliceJoined[row] || draw.sliceWeight[row] !== 1 || draw.sliceWeight[row + 1] !== 1
        || draw.slicePhase[row] !== 1 || draw.slicePhase[row + 1] !== 1) continue;
      const left = xAt(draw, row), right = xAt(draw, row + 1);
      if (left < 3.5 || right > 5.5) continue;
      const a = 3 * vertex(row, LANDMARK.lip), b = 3 * vertex(row + 1, LANDMARK.lip);
      for (const share of [0.25, 0.5, 0.75]) {
        const exact = fullCapAt(records, query, left + share * (right - left));
        const error = Math.hypot(...exact.map((v, axis) =>
          v - (draw.positions[a + axis] + share * (draw.positions[b + axis] - draw.positions[a + axis]))));
        expect(error, `actual cap error at ${left}..${right} fraction ${share}`).toBeLessThan(0.0151);
        measured++;
      }
      // At every retained full-weight station the cap/floor gap remains the provider's physical gap.
      const gap = draw.positions[a + 1] - draw.positions[3 * vertex(row, 104) + 1];
      const profile = new Float32Array(2 * PROFILE_POINTS);
      library.profileAt({ ...query, seconds: draw.sliceTau[row] }, profile);
      expect(gap).toBeCloseTo(profile[2 * LANDMARK.lip + 1] - profile[2 * 104 + 1], 5);
    }
    expect(measured).toBeGreaterThan(12);
  });

  it('adds no stations to a straight cap, exact prethrow or constant post-impact rows', () => {
    const query = metricQuery(), times = library.profileTimes(query);
    const counts: number[] = [];
    for (const seconds of [0, times.clearSeconds, times.touchdownSeconds + 0.5 * times.collapseSeconds]) {
      const records = packet(query, () => seconds);
      const draw = new SweptLoft(library, query.slope, { sheet: false }).build(records, 9, STILL, () => STILL);
      expect(roster(draw).every(x => x * 2 === Math.round(x * 2))).toBe(true);
      counts.push(draw.sliceCount);
    }
    expect(new Set(counts).size).toBe(1);
  });

  it('shares the refined station plan and exact stored geometry/normals with eager and deferred contact', () => {
    const query = metricQuery(), times = library.profileTimes(query), authored = times.clearSeconds / 0.4;
    const records = packet(query, x => authored + (4.9 - x) * (0.3 * authored / 1.5));
    const water = (x: number, z: number) => STILL + 0.02 * x + 0.08 * Math.sin(z + 100);
    const draw = new SweptLoft(library, query.slope, { sheet: false }).build(records, 9, STILL, water);
    const eager = new SweptLoft(library, query.slope, { contact: true }).build(records, 9, STILL, water);
    const queries = SweptLoft.forContactQueries(library, query.slope), lazy = queries.build(records, 9, STILL, water);
    expect(roster(eager)).toEqual(roster(draw)); expect(roster(lazy)).toEqual(roster(draw));
    for (const key of ['sliceSigma', 'sliceTau', 'sliceWeight', 'slicePhase', 'sliceJoined', 'sliceRayX', 'sliceRayZ'] as const) {
      expect(eager[key]).toEqual(draw[key]); expect(lazy[key]).toEqual(draw[key]);
    }
    for (let row = 0; row < lazy.sliceCount; row++) queries.prepareRow(row);
    for (let v = 0; v < lazy.vertexCount; v++) queries.prepareNormal(v);
    for (const key of ['positions', 'indices', 'normals'] as const) {
      expect(eager[key]).toEqual(draw[key]); expect(lazy[key]).toEqual(draw[key]);
    }
    expect(draw.rayInvalidIntervals).toBe(0); expect(draw.rayMinAdvance).toBeGreaterThan(0);
  });
});
