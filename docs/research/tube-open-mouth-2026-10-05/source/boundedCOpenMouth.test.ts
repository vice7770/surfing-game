import { describe, expect, it } from 'vitest';
import { Box3, Triangle, Vector3 } from 'three';
import { boundedCCap, boundedCLifecycle, boundedCParameters, sampleBoundedC } from './boundedCProfile';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type ProfileQuery } from './ProfileLibrary';
import { createContactHit, SweptContact } from './sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';

const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const c = cases.find(value => value.id === 'pad19-a30-l12')!;
const STILL = 0.5;
type Query = Omit<ProfileQuery, 'seconds' | 'hold'>;

/** Scale an actual shipped carrier, rather than treating footHeight as its crest-to-toe height. */
function metricQuery(height: number): Query {
  const base = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 };
  const profile = new Float32Array(2 * PROFILE_POINTS);
  library.profileAt({ ...base, seconds: library.profileTimes(base).clearSeconds }, profile);
  const factor = height / (profile[2 * LANDMARK.crest + 1] - profile[2 * LANDMARK.toe + 1]);
  return { slope: c.slope, footHeight: base.footHeight * factor, footDepth: base.footDepth * factor };
}

function records(query: Query, tau: (k: number) => number): Float32Array {
  const data = new Float32Array(9 * FRONT_STRIDE);
  for (let k = 0; k < 9; k++) {
    const o = k * FRONT_STRIDE;
    data[o + FRONT_FIELD.x] = k + 0.5; data[o + FRONT_FIELD.z] = -100;
    data[o + FRONT_FIELD.front] = 1; data[o + FRONT_FIELD.sigma] = k;
    data[o + FRONT_FIELD.footHeight] = query.footHeight; data[o + FRONT_FIELD.footDepth] = query.footDepth;
    data[o + FRONT_FIELD.tau] = tau(k); data[o + FRONT_FIELD.throwZ] = -100;
    data[o + FRONT_FIELD.pace] = 0;
  }
  return data;
}

/** Proper intersections in the owned contour; shared endpoints and collapsed collinear connectors are allowed. */
function coreCrossings(profile: Float32Array): string[] {
  const result: string[] = [];
  for (let i = 32; i < 112; i++) for (let j = i + 2; j < 112; j++) {
    const ax = profile[2 * i], ay = profile[2 * i + 1];
    const dx = profile[2 * i + 2] - ax, dy = profile[2 * i + 3] - ay;
    const bx = profile[2 * j], by = profile[2 * j + 1];
    const ex = profile[2 * j + 2] - bx, ey = profile[2 * j + 3] - by;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const a = ((bx - ax) * ey - (by - ay) * ex) / den;
    const b = ((bx - ax) * dy - (by - ay) * dx) / den;
    if (a > 1e-9 && a < 1 - 1e-9 && b > 1e-9 && b < 1 - 1e-9) result.push(`${i}/${j}`);
  }
  return result;
}

/** Independent Three triangle/box intersection over the complete active water mesh. */
function touchingTriangles(loft: LoftResult, box: Box3): number[] {
  const result: number[] = [], triangle = new Triangle();
  for (let t = 0; t < loft.indexCount; t += 3) {
    triangle.a.fromArray(loft.positions, 3 * loft.indices[t]);
    triangle.b.fromArray(loft.positions, 3 * loft.indices[t + 1]);
    triangle.c.fromArray(loft.positions, 3 * loft.indices[t + 2]);
    if (box.intersectsTriangle(triangle)) result.push(t / 3);
  }
  return result;
}

describe('bounded-C exposed across-profile mouth', () => {
  it.each([1.5, 3, 4.5])('keeps a useful actual lip-to-floor clearance at %sm crest-to-toe height', height => {
    const query = metricQuery(height), profile = new Float32Array(2 * PROFILE_POINTS);
    const lookup = library.profileAt({ ...query, seconds: library.profileTimes(query).clearSeconds }, profile);
    expect(lookup.analytic!.formation).toBe(1); expect(lookup.analytic!.sheetExists).toBe(true);
    const measuredHeight = profile[2 * LANDMARK.crest + 1] - profile[2 * LANDMARK.toe + 1];
    expect(measuredHeight).toBeCloseTo(height, 5);
    // Cap64 is the lower edge of the lip; the actual floor plateau covers its X coordinate.
    expect(profile[2 * LANDMARK.lip]).toBeGreaterThan(profile[2 * 103]);
    expect(profile[2 * LANDMARK.lip]).toBeLessThan(profile[2 * 105]);
    expect(profile[2 * 103 + 1]).toBe(profile[2 * 105 + 1]);
    expect(profile[2 * LANDMARK.lip + 1] - profile[2 * 104 + 1]).toBeGreaterThan(height / 3);
  });

  it('connects interior air to the shoreward side through a 1m-high, finite-width envelope in the actual mesh/contact', () => {
    const query = metricQuery(3), times = library.profileTimes(query), data = records(query, () => times.clearSeconds);
    const before = data.slice(), contact = new SweptContact(library, query.slope);
    const draw = new SweptLoft(library, query.slope).build(data, 9, STILL, () => STILL);
    contact.update(data, 9, STILL, () => STILL);
    expect(data).toEqual(before);
    expect(contact.last!.positions.subarray(0, 3 * draw.vertexCount)).toEqual(draw.positions.subarray(0, 3 * draw.vertexCount));
    expect(contact.last!.indices.subarray(0, draw.indexCount)).toEqual(draw.indices.subarray(0, draw.indexCount));
    const row = Array.from(draw.sliceSigma.subarray(0, draw.sliceCount)).indexOf(4);
    expect(row).toBeGreaterThanOrEqual(0); expect(draw.sliceWeight[row]).toBe(1);
    const cap = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
    const x = 4.371, mouthZ = draw.positions[cap + 2], halfWidth = 0.2, halfDepth = 0.15;
    const first = mouthZ - 0.45, last = mouthZ + 0.45, spacing = 0.05;
    let interior = 0, exterior = 0, previousBottom = Number.NaN;
    for (let k = 0; k <= 18; k++) {
      const z = first + k * spacing;
      const floors = [z - halfDepth, z, z + halfDepth].map(pz => contact.floorAt(x, pz));
      expect(floors.every(Number.isFinite)).toBe(true);
      const bottom = Math.max(...floors) + 0.03;
      if (k) expect(Math.abs(bottom - previousBottom)).toBeLessThan(0.1);
      previousBottom = bottom;
      const box = new Box3(new Vector3(x - halfWidth, bottom, z - halfDepth), new Vector3(x + halfWidth, bottom + 1, z + halfDepth));
      expect(touchingTriangles(draw, box), `mouth route station ${k}`).toEqual([]);
      // Overlapping body boxes make this a connected corridor, not disjoint clear point samples.
      expect(spacing).toBeLessThan(2 * halfDepth);
      for (const y of [bottom + 0.001, bottom + 0.5, bottom + 0.999]) {
        const hit = createContactHit();
        expect(contact.query(x, y, z, hit), `owned mouth air at ${k}`).toBe(true);
        expect(hit.inWater).toBe(false);
        expect(hit.floorY).toBeLessThan(bottom);
        if (Number.isFinite(hit.ceilingY)) {
          expect(hit.ceilingY).toBeGreaterThan(bottom + 1);
          expect(hit.ceilingTopY).toBeGreaterThan(hit.ceilingY);
          interior++;
        } else exterior++;
      }
    }
    expect(last - first).toBeCloseTo(0.9, 10);
    expect(interior).toBeGreaterThan(0); expect(exterior).toBeGreaterThan(0);
  });

  it('keeps representative shipped cases and an adjacent-case blend finite, ordered and without core intersections across the lifecycle', () => {
    const representative = [cases[0], c, cases[cases.length - 1]];
    const group = cases.filter(value => value.slope === c.slope).sort((a, b) => a.nonlinearity - b.nonlinearity);
    const queries: Query[] = representative.map(value => ({ slope: value.slope, footHeight: value.nonlinearity * 7, footDepth: 7 }));
    queries.push({ slope: c.slope, footHeight: (group[0].nonlinearity + group[1].nonlinearity) * 7 / 2, footDepth: 7 });
    for (const query of queries) {
      const times = library.profileTimes(query), profile = new Float32Array(2 * PROFILE_POINTS);
      for (const seconds of [0, 0.2 * times.clearSeconds, 0.8 * times.clearSeconds, times.clearSeconds,
        times.touchdownSeconds - 1e-5, times.touchdownSeconds + 0.001 * times.collapseSeconds,
        times.touchdownSeconds + 0.5 * times.collapseSeconds, times.touchdownSeconds + 0.95 * times.collapseSeconds,
        times.touchdownSeconds + times.collapseSeconds]) {
        const lookup = library.profileAt({ ...query, seconds }, profile);
        expect(profile.every(Number.isFinite)).toBe(true); expect(coreCrossings(profile)).toEqual([]);
        const separations = Array.from({ length: 21 }, (_, k) => {
          const top = 38 + k, underside = 88 - k;
          expect(profile[2 * top]).toBe(profile[2 * underside]);
          return profile[2 * top + 1] - profile[2 * underside + 1];
        });
        expect(Math.min(...separations)).toBeGreaterThanOrEqual(0);
        if (lookup.analytic!.sheetExists) expect(Math.max(...separations)).toBeGreaterThan(0);
      }
    }
  });

  it('still reaches actual cap-floor contact and exact zero-loop retirement through the shared provider event', () => {
    for (const value of [cases[0], c, cases[cases.length - 1]]) {
      const raw = value.frames.slice(value.frames.length - 512, value.frames.length - 256);
      const parameters = boundedCParameters(raw, value.touchdown, value.touchdown), clock = boundedCLifecycle(parameters);
      expect(clock.impactTau).toBeGreaterThan(value.touchdown);
      expect(clock.impactTau).toBeLessThan(1.3 * value.touchdown);
      expect(clock.retiredTau - clock.impactTau).toBeCloseTo(0.3 * value.touchdown, 12);
      for (const tau of [clock.impactTau, clock.impactTau + 0.15 * value.touchdown]) {
        const profile = raw.slice(), meta = sampleBoundedC({ ...parameters, tau }, profile, false, clock.impactEvent, true);
        expect(meta.sheetExists).toBe(true);
        expect(profile[2 * LANDMARK.lip + 1]).toBe(parameters.toe[1]);
        expect(profile[2 * 104 + 1]).toBe(profile[2 * LANDMARK.lip + 1]);
        expect(boundedCCap({ ...parameters, tau }, clock.impactEvent)).toEqual([profile[128], profile[129]]);
      }
      const profile = raw.slice(), retired = sampleBoundedC({ ...parameters, tau: clock.retiredTau }, profile, false, clock.impactEvent, true);
      expect(retired.sheetExists).toBe(false); expect(retired.thickness).toBe(0);
      for (let i = 61; i <= 106; i++) {
        expect(profile[2 * i]).toBe(profile[120]); expect(profile[2 * i + 1]).toBe(profile[121]);
      }
    }
  });
});
