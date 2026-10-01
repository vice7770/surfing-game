import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { CONTACT, createContactHit, SweptContact, tubeState } from './sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';
import { tubeCase } from './toyCase';

const STILL = 0.5;
const flat = () => STILL;
const H0 = 7;
const UNIT = Math.sqrt(H0 / 9.81);
/** A straight front along +x at z = −100, thrown there (so the tube stands on z = −100 + along). */
function records(n: number, tau: number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7;
    out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
  }
  return out;
}
const library = () => new ProfileLibrary([tubeCase(0.3)]);
const contactAt = (tau: number) => {
  const contact = new SweptContact(library(), 0.05);
  contact.update(records(21, tau), 21, STILL, flat);
  return contact;
};
// The toy at x = 1 h0 (along 7 m, z = −93): the flat, the underside and the top.
const UNDER = STILL + (0.7 - 1 / 6) * H0;
const TOP = STILL + 0.55 * H0;

describe('the swept contact', () => {
  it('reads the tube’s air as air, over the face, under the lip', () => {
    const hit = createContactHit();
    expect(contactAt(0.1).query(10.3, 2.5, -93, hit)).toBe(true);
    expect(hit.inWater).toBe(false);
    expect(hit.surfaceY).toBeCloseTo(STILL, 4);
    expect(hit.ceilingY).toBeCloseTo(UNDER, 3);
    expect(hit.ceilingTopY).toBeCloseTo(TOP, 3);
    expect(hit.floorY).toBeCloseTo(STILL, 4);
    expect(hit.normalY).toBeCloseTo(1, 4);
  });

  it('reads the lip as water with air beneath it, ramped toward the tip’s flow', () => {
    const hit = createContactHit();
    contactAt(0.1).query(10.3, (UNDER + TOP) / 2, -93, hit);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(TOP, 3);
    expect(hit.waterFloorY).toBeCloseTo(UNDER, 3);
    // The top crosses x = 1 h0 at profile index 32 + 32 / 1.2: 5/6 of the way from the crest to the tip.
    expect(hit.lipShare).toBeCloseTo(5 / 6, 2);
    expect(hit.lipVZ).toBeCloseTo(0.9 * Math.sqrt(9.81 * H0), 2);
    expect(hit.lipVY).toBeCloseTo(-0.3 * Math.sqrt(9.81 * H0), 2);
    expect(hit.tangentX).toBeCloseTo(1, 6);
  });

  it('lowers the held lip by the fade through the collapse, and weighs its flow by the same (the advisor, 2026-09-30)', () => {
    const times = library().profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 });
    const contact = contactAt(times.touchdownSeconds + times.collapseSeconds / 2);
    const hit = createContactHit();
    // Halfway through: the underside and the top at half their heights over the still water.
    const under = STILL + (UNDER - STILL) / 2;
    const top = STILL + (TOP - STILL) / 2;
    expect(contact.query(10.3, (under + top) / 2, -93, hit)).toBe(true);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(top, 3);
    expect(hit.waterFloorY).toBeCloseTo(under, 3);
    expect(hit.lipShare).toBeCloseTo(5 / 6, 2);
    expect(hit.lipWeight).toBeCloseTo(0.5, 5);
    // The held frame's jet keeps its velocity: the water is still coming down.
    expect(hit.lipVZ).toBeCloseTo(0.9 * Math.sqrt(9.81 * H0), 2);
    expect(tubeState(hit.life)).toBe('closed');
    // Under the lowered lip, the tube's air over the face.
    contact.query(10.3, (STILL + under) / 2, -93, hit);
    expect(hit.inWater).toBe(false);
    expect(hit.ceilingY).toBeCloseTo(under, 3);
  });

  it('reads under the face as water, and over the lip as air resting on its top', () => {
    const contact = contactAt(0.1);
    const hit = createContactHit();
    contact.query(10.3, 0, -93, hit);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(STILL, 4);
    expect(hit.waterFloorY).toBeNaN();
    contact.query(10.3, 9, -93, hit);
    expect(hit.inWater).toBe(false);
    expect(hit.surfaceY).toBeCloseTo(TOP, 3);
    expect(hit.ceilingY).toBeNaN();
    expect(contact.floorAt(10.3, -93)).toBeCloseTo(STILL, 4);
  });

  it('leaves the water alone beyond the loft', () => {
    const contact = contactAt(0.1);
    const hit = createContactHit();
    expect(contact.query(10.3, 0, -150, hit)).toBe(false);
    expect(contact.query(60, 0, -93, hit)).toBe(false);
    expect(contact.floorAt(60, -93)).toBeNaN();
  });

  it('agrees with the drawing: just above and below each drawn triangle, parity flips there', () => {
    const drawn = new SweptLoft(library(), 0.05).build(records(21, 0.1), 21, STILL, flat);
    const contact = contactAt(0.1);
    const hit = createContactHit();
    const p = drawn.positions;
    let checked = 0;
    for (let t = 0; t < drawn.indexCount; t += 3) {
      const [a, b, c] = [drawn.indices[t], drawn.indices[t + 1], drawn.indices[t + 2]];
      const slice = Math.floor(a / LOFT_SAMPLES);
      if (drawn.sliceWeight[slice] !== 1 || drawn.sliceWeight[slice + 1] !== 1) continue;
      // The tip's fold, where the lip is thinner than the probe's step, is left out.
      const j = (a % LOFT_SAMPLES) - LOFT.extensionSamples;
      if (Math.abs(j - 64) <= 1) continue;
      const area = (p[3 * b] - p[3 * a]) * (p[3 * c + 2] - p[3 * a + 2]) - (p[3 * b + 2] - p[3 * a + 2]) * (p[3 * c] - p[3 * a]);
      if (Math.abs(area) < 1e-6) continue;
      const x = (p[3 * a] + p[3 * b] + p[3 * c]) / 3;
      const y = (p[3 * a + 1] + p[3 * b + 1] + p[3 * c + 1]) / 3;
      const z = (p[3 * a + 2] + p[3 * b + 2] + p[3 * c + 2]) / 3;
      expect(contact.query(x, y + 1e-4, z, hit)).toBe(true);
      const above = hit.inWater;
      expect(contact.query(x, y - 1e-4, z, hit)).toBe(true);
      expect(hit.inWater).toBe(!above);
      const nearest = hit.inWater ? hit.surfaceY : hit.ceilingY;
      expect(nearest).toBeCloseTo(y, 3);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('counts a point on an edge two triangles share once, and keeps parity on the fold', () => {
    const contact = contactAt(0.1);
    const loft = contact.last!;
    const hit = createContactHit();
    // The shared diagonal of a face quad (v00 + 1 → v10) under the lip, at its midpoint: below it the face's water,
    // under three crossings (counted once, the face is one of them); just above it the tube's air.
    const slice = Math.floor(loft.sliceCount / 2);
    const v00 = slice * LOFT_SAMPLES + LOFT.extensionSamples + 100;
    const v10 = v00 + LOFT_SAMPLES;
    const x = (loft.positions[3 * (v00 + 1)] + loft.positions[3 * v10]) / 2;
    const z = (loft.positions[3 * (v00 + 1) + 2] + loft.positions[3 * v10 + 2]) / 2;
    const y = (loft.positions[3 * (v00 + 1) + 1] + loft.positions[3 * v10 + 1]) / 2;
    contact.query(x, y - 1, z, hit);
    expect(hit.inWater).toBe(true);
    contact.query(x, y + 0.01, z, hit);
    expect(hit.inWater).toBe(false);
    // On the fold: the tip's edge between two slices, shared by the lip's top and underside. Below it the tube's air
    // (the fold counts both or neither), above it air over the lip.
    const tip = slice * LOFT_SAMPLES + LOFT.extensionSamples + 64;
    const next = tip + LOFT_SAMPLES;
    const mid = (k: number) => (loft.positions[3 * tip + k] + loft.positions[3 * next + k]) / 2;
    contact.query(mid(0), mid(1) - 0.5, mid(2), hit);
    expect(hit.inWater).toBe(false);
    contact.query(mid(0), mid(1) + 0.5, mid(2), hit);
    expect(hit.inWater).toBe(false);
  });

  it('finds every layer over a point on a vertex row, though the quads’ ranges are stored rounded', () => {
    // The toy at h0 3 m: its face's samples every 2.5 cm along the ray, so z 2.1 and 2.2 lie on rows (as 32-bit floats
    // they round a hair away from the point, and a range check on them missed the face).
    const n = 17;
    const recs = new Float32Array(n * FRONT_STRIDE);
    for (let k = 0; k < n; k += 1) {
      const o = k * FRONT_STRIDE;
      recs[o + FRONT_FIELD.x] = k - 8; recs[o + FRONT_FIELD.z] = 0; recs[o + FRONT_FIELD.front] = 1; recs[o + FRONT_FIELD.sigma] = k;
      recs[o + FRONT_FIELD.tau] = 0.05; recs[o + FRONT_FIELD.footHeight] = 0.9; recs[o + FRONT_FIELD.footDepth] = 3;
      recs[o + FRONT_FIELD.throwZ] = 0;
    }
    const contact = new SweptContact(library(), 0.05);
    contact.update(recs, n, 0, () => 0);
    const hit = createContactHit();
    for (const x of [0, 0.25]) {
      for (const [z, face, under] of [[2.1, 0.9, 1.75], [2.2, 0.6, 1.7333]]) {
        // In the tube's air over the face, under the lip.
        expect(contact.query(x, 1.0, z, hit)).toBe(true);
        expect(hit.inWater).toBe(false);
        expect(hit.surfaceY).toBeCloseTo(face, 3);
        expect(hit.ceilingY).toBeCloseTo(under, 3);
      }
    }
    expect(contact.stats.anomalies).toBe(0);
  });

  it('reads a point exactly on a slice’s ray as the strip it opens (the ray’s own edges included)', () => {
    const contact = contactAt(0.1);
    const on = createContactHit();
    const beside = createContactHit();
    // Slices every half metre from σ −1.5: x = σ + 0.5, so x = 10 is slice σ 9.5's ray.
    for (const y of [0, 2.5, (UNDER + TOP) / 2, 9]) {
      expect(contact.query(10, y, -93, on)).toBe(true);
      contact.query(10.001, y, -93, beside);
      expect(on.inWater).toBe(beside.inWater);
      expect(on.surfaceY).toBeCloseTo(beside.surfaceY, 3);
    }
  });

  it('gives the tube’s state from its clock, and none before the throw', () => {
    expect(tubeState(Number.NaN)).toBeUndefined();
    expect(tubeState(0.2)).toBe('open');
    expect(tubeState(CONTACT.closing)).toBe('closing');
    expect(tubeState(1)).toBe('closed');
    const hit = createContactHit();
    contactAt(0.1).query(10.3, 2.5, -93, hit);
    expect(hit.life).toBeCloseTo(0.1 / (0.5 * UNIT), 3);
    // τ −0.3 s is −0.36 in the toy's units: between its two tent frames.
    contactAt(-0.3).query(10.3, 0, -100, hit);
    expect(hit.life).toBeNaN();
  });

  describe('the quads’ buckets along each strip’s ray (the advisor, 2026-09-30)', () => {
    /** A fixed sequence (a linear congruential generator), so reruns draw the same points. */
    const sequence = (seed: number) => () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    it('answers exactly as a scan of every quad, through the tube, its lip, its edges and folds', () => {
      const bucketed = contactAt(0.1);
      const scanned = new SweptContact(library(), 0.05, { bucket: Infinity });
      scanned.update(records(21, 0.1), 21, STILL, flat);
      const loft = bucketed.last!;
      const random = sequence(99);
      const points: number[][] = [];
      for (let k = 0; k < 4000; k += 1) points.push([-2 + 25 * random(), -1 + 8 * random(), -118 + 36 * random()]);
      // On the loft's own vertices (the rays, the shared edges, the tip's fold), just above and below them.
      for (let v = 0; v < loft.vertexCount; v += 7) {
        for (const dy of [-0.01, 0, 0.01]) points.push([loft.positions[3 * v], loft.positions[3 * v + 1] + dy, loft.positions[3 * v + 2]]);
      }
      const a = createContactHit();
      const b = createContactHit();
      let answered = 0;
      for (const [x, y, z] of points) {
        const hit = bucketed.query(x, y, z, a);
        expect(hit).toBe(scanned.query(x, y, z, b));
        if (hit) {
          expect(a).toEqual(b);
          answered += 1;
        }
      }
      expect(answered).toBeGreaterThan(3000);
      expect(bucketed.stats).toMatchObject({ queries: scanned.stats.queries, hits: scanned.stats.hits, anomalies: scanned.stats.anomalies });
      // The scan tests all 133 quads of every strip it looks in; the buckets a handful.
      expect(10 * bucketed.stats.quads).toBeLessThan(scanned.stats.quads);
    });

    it('tests a few quads a layer through the tube, and none for a point outside every front’s footprint', () => {
      const contact = contactAt(0.1);
      const hit = createContactHit();
      expect(contact.query(10.3, 0, -150, hit)).toBe(false);
      expect(contact.query(60, 0, -93, hit)).toBe(false);
      expect(contact.stats.quads).toBe(0);
      // Three layers over x = 1 h0 (the face, the underside, the top); the quads run about 0.2–0.3 m along the ray there.
      for (const y of [0, 2.5, (UNDER + TOP) / 2, 9]) expect(contact.query(10.3, y, -93, hit)).toBe(true);
      expect(contact.stats.quads / 4).toBeLessThanOrEqual(12);
    });
  });

  it('answers from the first of two overlapping fronts, as drawn, with nothing left for the backstop (the advisor, 2026-09-30)', () => {
    // The first front over x 0.5–20.5 at τ 0.1 s, the second from x 10 at τ 0.2 s: its strips over the first's are dropped.
    const n = 21;
    const both = new Float32Array(2 * n * FRONT_STRIDE);
    for (let f = 0; f < 2; f += 1) {
      both.set(records(n, f === 0 ? 0.1 : 0.2), f * n * FRONT_STRIDE);
      for (let k = 0; k < n; k += 1) {
        both[(f * n + k) * FRONT_STRIDE + FRONT_FIELD.front] = f + 1;
        both[(f * n + k) * FRONT_STRIDE + FRONT_FIELD.x] = (f === 0 ? 0.5 : 10) + k;
      }
    }
    const contact = new SweptContact(library(), 0.05);
    contact.update(both, 2 * n, STILL, flat);
    expect(contact.last!.overlaps).toBeGreaterThan(0);
    const hit = createContactHit();
    // In the overlap the first front's tube, at its clock; past it the second's.
    expect(contact.query(15.3, 2.5, -93, hit)).toBe(true);
    expect(hit.life).toBeCloseTo(0.1 / (0.5 * UNIT), 3);
    expect(contact.query(26.3, 2.5, -93, hit)).toBe(true);
    expect(hit.life).toBeCloseTo(0.2 / (0.5 * UNIT), 3);
    for (let x = 8; x < 24; x += 0.37) for (let y = -0.5; y < 7; y += 0.41) contact.query(x, y, -93, hit);
    expect(contact.stats.overlaps).toBe(0);
  });

  it('holds no state of its own: the same records answer the same in a fresh contact', () => {
    const a = contactAt(0.3);
    const b = contactAt(0.1);
    b.update(records(21, 0.3), 21, STILL, flat);
    const ha = createContactHit();
    const hb = createContactHit();
    for (const [x, y, z] of [[10.3, 2.5, -93], [5.2, 4.1, -92.5], [12.7, 0.1, -95]]) {
      expect(a.query(x, y, z, ha)).toBe(b.query(x, y, z, hb));
      expect(hb).toEqual(ha);
    }
  });
});
