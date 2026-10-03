import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../src/wave/barrel/frontRecords';
import { ProfileLibrary } from '../src/wave/barrel/ProfileLibrary';
import { LOFT_SAMPLES, SweptLoft } from '../src/wave/barrel/sweptLoft';
import { SweptContact } from '../src/wave/barrel/sweptContact';
import { tubeCase } from '../src/wave/barrel/toyCase';
import { assessContact, assessLoft, rowProgress, triangleCrossing } from './tube-geometry-regression-report';

function straightRecords() {
  const n = 9, records = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k++) {
    const o = k * FRONT_STRIDE;
    records[o + FRONT_FIELD.x] = k;
    records[o + FRONT_FIELD.z] = -100;
    records[o + FRONT_FIELD.front] = 1;
    records[o + FRONT_FIELD.sigma] = k;
    records[o + FRONT_FIELD.tau] = .1;
    records[o + FRONT_FIELD.footHeight] = 2.1;
    records[o + FRONT_FIELD.footDepth] = 7;
    records[o + FRONT_FIELD.throwZ] = -100;
    records[o + FRONT_FIELD.pace] = Number.NaN;
  }
  return records;
}

function straightTube() {
  return new SweptLoft(new ProfileLibrary([tubeCase(.3)]), .05).build(straightRecords(), 9, .5, () => .5);
}

describe('the frozen tube geometry regression metrics', () => {
  it('allows intentional along-ray overhang while requiring both across-front widths to remain positive', () => {
    const loft = straightTube();
    const metrics = assessLoft(loft);
    expect(metrics.alongRay.reverseSegments).toBeGreaterThan(0);
    expect(metrics.acrossFront.negativeRows).toBe(0);
    expect(metrics.acrossFront.zeroRows).toBe(0);
    expect(metrics.pass).toBe(true);
  });

  it('fails an actual across-front fold even with entirely finite coordinates', () => {
    const loft = straightTube();
    const strip = Array.from(loft.sliceJoined).findIndex((v) => v === 1);
    const a = 3 * (strip * LOFT_SAMPLES + 50), b = a + 3 * LOFT_SAMPLES;
    loft.positions[b] = loft.positions[a] - .25;
    expect(rowProgress(loft, strip, 50)).toEqual([-.25, -.25]);
    const metrics = assessLoft(loft);
    expect(metrics.finite.invalidFields).toEqual([]);
    expect(metrics.acrossFront.negativeRows).toBeGreaterThan(0);
    expect(metrics.pass).toBe(false);
  });

  it('fails nonfinite active geometry but ignores reusable inactive array padding', () => {
    const loft = straightTube();
    loft.positions[3 * loft.vertexCount] = Number.NaN;
    expect(assessLoft(loft).finite.invalidFields).toEqual([]);
    loft.positions[3 * (4 * LOFT_SAMPLES + 55)] = Number.NaN;
    const metrics = assessLoft(loft);
    expect(metrics.finite.invalidFields).toContainEqual({ field: 'positions', count: 1, first: 3 * (4 * LOFT_SAMPLES + 55) });
    expect(metrics.pass).toBe(false);
  });

  it('reports a collapsed profile-edge triangle without mistaking an unborn underside for an across-front hole', () => {
    const loft = straightTube();
    const a = 3 * (8 * LOFT_SAMPLES + 75), b = a + 3;
    loft.positions.set(loft.positions.slice(a, a + 3), b);
    const metrics = assessLoft(loft);
    expect(metrics.triangles.zeroArea3D).toBeGreaterThan(0);
    expect(metrics.triangles.collapsedProfileTriangles).toBe(metrics.triangles.zeroArea3D);
    expect(metrics.triangles.zeroAreaLiftedRoofFace).toBe(0);
    expect(metrics.pass).toBe(true);
  });

  it('rejects a finite missing patch whose indices repeat a different valid vertex', () => {
    const loft = straightTube();
    loft.indices.fill(0, 6 * 50, 6 * 51);
    const metrics = assessLoft(loft);
    expect(metrics.finite.invalidFields).toEqual([]);
    expect(metrics.triangles.topologyFaults).toBe(1);
    expect(metrics.pass).toBe(false);
  });

  it('counts a shared triangle edge once and treats a vertical face as zero projected area', () => {
    const p = Float32Array.from([0, 2, 0, 1, 2, 0, 0, 2, 1, 1, 2, 1]);
    const crossings = [triangleCrossing(p, 0, 1, 2, .5, .5), triangleCrossing(p, 2, 1, 3, .5, .5)];
    expect(crossings.filter((v) => v !== undefined)).toEqual([2]);
    const vertical = Float32Array.from([0, 0, 0, 0, 2, 0, 0, 0, 1]);
    expect(triangleCrossing(vertical, 0, 1, 2, 0, .5)).toBeUndefined();
  });

  it('checks exact ray/row ties and vertical y ties against full-scan geometric parity', () => {
    const library = new ProfileLibrary([tubeCase(.3)]);
    const contact = new SweptContact(library, .05);
    const scanned = new SweptContact(library, .05, { bucket: Infinity });
    for (const c of [contact, scanned]) c.update(straightRecords(), 9, .5, () => .5);
    const metrics = assessContact(contact, scanned);
    expect(metrics.exactRayAndRowTies).toBeGreaterThan(0);
    expect(metrics.columns).toBeGreaterThan(0);
    expect(metrics.mismatches).toBe(0);
    expect(metrics.nondeterministic).toBe(0);
    expect(metrics.evenInteriorColumns).toBe(0);
    expect(metrics.pass).toBe(true);
  });
});
