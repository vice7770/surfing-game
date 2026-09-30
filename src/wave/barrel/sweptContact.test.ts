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
