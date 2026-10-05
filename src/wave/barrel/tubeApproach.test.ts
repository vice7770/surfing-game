import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
import { routeForStrip, validTubeApproachRequest, type TubeApproachRequest } from './tubeApproach';

const cases = readBarrelCases().map(decodeCase);
const c = cases.find(value => value.id === 'pad19-a30-l12')!;
const STILL = 0.5;

function fixture(closed = false) {
  const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
  const base = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 };
  const profile = new Float32Array(2 * PROFILE_POINTS);
  library.profileAt({ ...base, seconds: library.profileTimes(base).clearSeconds }, profile);
  const factor = 3 / (profile[2 * LANDMARK.crest + 1] - profile[2 * LANDMARK.toe + 1]);
  const query = { slope: c.slope, footHeight: base.footHeight * factor, footDepth: base.footDepth * factor };
  const times = library.profileTimes(query), data = new Float32Array(9 * FRONT_STRIDE);
  for (let k = 0; k < 9; k++) {
    const o = k * FRONT_STRIDE;
    data[o + FRONT_FIELD.x] = k + 0.5; data[o + FRONT_FIELD.z] = -100;
    data[o + FRONT_FIELD.front] = 7; data[o + FRONT_FIELD.sigma] = k;
    data[o + FRONT_FIELD.footHeight] = query.footHeight; data[o + FRONT_FIELD.footDepth] = query.footDepth;
    data[o + FRONT_FIELD.tau] = closed ? times.touchdownSeconds + 0.1 * times.collapseSeconds : times.clearSeconds;
    data[o + FRONT_FIELD.throwZ] = -100; data[o + FRONT_FIELD.pace] = 0;
  }
  const loft = new SweptLoft(library, query.slope).build(data, 9, STILL, () => STILL);
  const strip = Array.from(loft.sliceSigma.subarray(0, loft.sliceCount)).indexOf(4);
  const cap = 3 * (strip * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
  const next = cap + 3 * LOFT_SAMPLES;
  const x = (loft.positions[cap] + loft.positions[next]) / 2;
  const z = (loft.positions[cap + 2] + loft.positions[next + 2]) / 2;
  const request: TubeApproachRequest = { x, z: z + 0.6, seaTime: 12, bodyHeight: 1, halfWidth: 0.2, halfDepth: 0.15, body: [], reach: 3 };
  return { loft, strip, request, x, z };
}

function rotate(loft: LoftResult, angle: number): LoftResult {
  const result = { ...loft, positions: loft.positions.slice(), sliceRayX: loft.sliceRayX.slice(), sliceRayZ: loft.sliceRayZ.slice() };
  const co = Math.cos(angle), si = Math.sin(angle);
  for (let v = 0; v < loft.vertexCount; v++) {
    const x = loft.positions[3 * v], z = loft.positions[3 * v + 2];
    result.positions[3 * v] = co * x - si * z; result.positions[3 * v + 2] = si * x + co * z;
  }
  for (let s = 0; s < loft.sliceCount; s++) {
    const x = loft.sliceRayX[s], z = loft.sliceRayZ[s];
    result.sliceRayX[s] = co * x - si * z; result.sliceRayZ[s] = si * x + co * z;
  }
  return result;
}

/** An actual indexed wall away from the centre column, intersecting the finite-width mouth envelope. */
function obstruct(loft: LoftResult, x: number, z: number, floor: number): LoftResult {
  const count = loft.vertexCount;
  const positions = new Float32Array(3 * (count + 4));
  positions.set(loft.positions.subarray(0, 3 * count));
  positions.set([x + 0.15, floor + 0.01, z + 0.1, x + 0.25, floor + 0.01, z + 0.1,
    x + 0.25, floor + 2, z + 0.1, x + 0.15, floor + 2, z + 0.1], 3 * count);
  const indices = new Uint32Array(loft.indexCount + 6);
  indices.set(loft.indices.subarray(0, loft.indexCount));
  indices.set([count, count + 1, count + 2, count, count + 2, count + 3], loft.indexCount);
  return { ...loft, positions, indices, vertexCount: count + 4, indexCount: loft.indexCount + 6 };
}

describe('actual indexed tube approach route', () => {
  it('observes a finite open mouth from a shipped metric profile without mutating its geometry', () => {
    const f = fixture(), positions = f.loft.positions.slice(), indices = f.loft.indices.slice();
    const cue = routeForStrip(f.loft, f.strip, 0.5, f.request, 42);
    expect(cue).toBeDefined();
    expect(cue!.frontId).toBe(7); expect(cue!.geometryStep).toBe(42); expect(cue!.seaTime).toBe(12);
    expect(cue!.sigma).toBeGreaterThanOrEqual(cue!.sigmaMin); expect(cue!.sigma).toBeLessThanOrEqual(cue!.sigmaMax);
    expect(cue!.bodyFitsMouth).toBe(true); expect(cue!.bodyInCavity).toBe(false);
    expect(cue!.minimumClearance).toBeGreaterThan(f.request.bodyHeight);
    expect(cue!.mouth.roofY).toBeGreaterThan(cue!.mouth.floorY);
    expect(cue!.inside.roofY).toBeGreaterThan(cue!.inside.floorY);
    expect(cue!.inside.z).toBeLessThan(cue!.mouth.z);
    expect(f.loft.positions).toEqual(positions); expect(f.loft.indices).toEqual(indices);
  });

  it('keeps a real geometric cue for a body too tall, instead of hiding the target before crouch', () => {
    const f = fixture();
    const cue = routeForStrip(f.loft, f.strip, 0.5, { ...f.request, bodyHeight: 5 });
    expect(cue).toBeDefined(); expect(cue!.bodyFitsMouth).toBe(false);
    expect(cue!.minimumClearance).toBeLessThan(5);
  });

  it('tests actual point/sphere containment separately from translated mouth fit', () => {
    const f = fixture(), cue = routeForStrip(f.loft, f.strip, 0.5, f.request)!;
    const point = { x: cue.inside.x, y: cue.inside.floorY + 0.6, z: cue.inside.z, radius: 0.1 };
    const request = { ...f.request, x: point.x, z: point.z, body: [point] };
    const contained = routeForStrip(f.loft, f.strip, 0.5, request);
    expect(contained!.bodyInCavity).toBe(true);
    const roofStrike = routeForStrip(f.loft, f.strip, 0.5, { ...request, body: [{ ...point, y: cue.inside.roofY - 0.05 }] });
    expect(roofStrike!.bodyInCavity).toBe(false);
    const exteriorPoint = { ...point, z: f.z + 0.6 };
    const exterior = routeForStrip(f.loft, f.strip, 0.5, { ...request, z: exteriorPoint.z, body: [exteriorPoint] });
    expect(exterior!.bodyInCavity).toBe(false);
  });

  it('rotates a measured footprint into the candidate frame and expands it to the actual posture', () => {
    const f = fixture();
    const measured = { ...f.request, halfWidth: 0.15, halfDepth: 0.2, envelopeRayX: 1, envelopeRayZ: 0 };
    const rotated = routeForStrip(f.loft, f.strip, 0.5, measured);
    const explicit = routeForStrip(f.loft, f.strip, 0.5, f.request);
    expect(rotated).toEqual(explicit);
    const body = [{ x: f.request.x + 0.3, y: 1, z: f.request.z, radius: 0.1 }];
    const expanded = routeForStrip(f.loft, f.strip, 0.5, { ...measured, body });
    expect(expanded).toBeDefined(); expect(expanded!.usableHalfWidth).toBeCloseTo(0.4, 8);
    const actualWidth = Math.abs(body[0].x - f.request.x) + body[0].radius;
    expect(expanded).toEqual(routeForStrip(f.loft, f.strip, 0.5, { ...f.request, halfWidth: actualWidth, body }));
    expect(validTubeApproachRequest({ ...f.request, envelopeRayX: 1 })).toBe(false);
    expect(validTubeApproachRequest({ ...f.request, envelopeRayX: 0, envelopeRayZ: 0 })).toBe(false);
  });

  it('preserves answers when an actual-index selection replaces the full active triangle scan', () => {
    const f = fixture();
    const offsets = Array.from({ length: f.loft.indexCount / 3 }, (_, k) => 3 * k).filter(offset => {
      const indices = [f.loft.indices[offset], f.loft.indices[offset + 1], f.loft.indices[offset + 2]];
      const xs = indices.map(index => f.loft.positions[3 * index]);
      return Math.min(...xs) <= f.x + 0.5 && Math.max(...xs) >= f.x - 0.5;
    });
    expect(offsets.length).toBeLessThan(f.loft.indexCount / 3);
    const expected = routeForStrip(f.loft, f.strip, 0.5, f.request);
    expect(routeForStrip(f.loft, f.strip, 0.5, f.request, 0, undefined, offsets)).toEqual(expected);
    const clear = expected!, blocked = obstruct(f.loft, f.x, f.z, clear.mouth.floorY);
    const blockedOffsets = Array.from({ length: blocked.indexCount / 3 }, (_, k) => 3 * k);
    expect(routeForStrip(blocked, f.strip, 0.5, f.request, 0, undefined, blockedOffsets)).toBeUndefined();
  });

  it('rejects a finite-width indexed obstruction even when the centre mouth gap remains clear', () => {
    const f = fixture(), clear = routeForStrip(f.loft, f.strip, 0.5, f.request)!;
    const blocked = obstruct(f.loft, f.x, f.z, clear.mouth.floorY);
    expect(routeForStrip(blocked, f.strip, 0.5, f.request)).toBeUndefined();
    expect(routeForStrip(f.loft, f.strip, 0.5, f.request)).toBeDefined();
  });

  it('rejects post-impact, unjoined, zero-weight and geometrically unreachable candidates', () => {
    const closed = fixture(true);
    expect(routeForStrip(closed.loft, closed.strip, 0.5, closed.request)).toBeUndefined();
    const f = fixture();
    const unjoined = { ...f.loft, sliceJoined: f.loft.sliceJoined.slice() }; unjoined.sliceJoined[f.strip] = 0;
    expect(routeForStrip(unjoined, f.strip, 0.5, f.request)).toBeUndefined();
    const dead = { ...f.loft, sliceWeight: f.loft.sliceWeight.slice() }; dead.sliceWeight[f.strip] = 0;
    expect(routeForStrip(dead, f.strip, 0.5, f.request)).toBeUndefined();
    expect(routeForStrip(f.loft, f.strip, 0.5, { ...f.request, x: 1000 })).toBeUndefined();
  });

  it.each([Math.PI, Math.PI / 2, -Math.PI / 2])('handles both ray and along-front directions after rotation by %s', angle => {
    const f = fixture(), original = routeForStrip(f.loft, f.strip, 0.5, f.request)!;
    const co = Math.cos(angle), si = Math.sin(angle);
    const request = { ...f.request, x: co * f.request.x - si * f.request.z, z: si * f.request.x + co * f.request.z };
    const cue = routeForStrip(rotate(f.loft, angle), f.strip, 0.5, request);
    expect(cue).toBeDefined(); expect(cue!.bodyFitsMouth).toBe(original.bodyFitsMouth);
    expect(cue!.rayX).toBeCloseTo(co * original.rayX - si * original.rayZ, 6);
    expect(cue!.rayZ).toBeCloseTo(si * original.rayX + co * original.rayZ, 6);
    expect(cue!.tangentX).toBeCloseTo(co * original.tangentX - si * original.tangentZ, 6);
    expect(cue!.tangentZ).toBeCloseTo(si * original.tangentX + co * original.tangentZ, 6);
    expect(cue!.minimumClearance).toBeCloseTo(original.minimumClearance, 4);
  });
});
