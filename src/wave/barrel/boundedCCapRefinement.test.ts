import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type ProfileQuery } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';

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

describe('bounded local C cap refinement', () => {
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
