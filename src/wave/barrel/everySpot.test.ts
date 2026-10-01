import { describe, expect, it } from 'vitest';
import type { SpotName } from '../Bathymetry';
import { SWEPT_BARREL, SurfZoneSimulation, sweptBarrelOn, type SurfZoneConfig } from '../SurfZoneSimulation';
import { libraryFromBytes } from './barrelLibrary';
import { BARREL_CASES } from './barrelLibraryIndex';
import { BARREL_SPOTS } from './barrelSpots';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK } from './ProfileLibrary';
import { createContactHit, SweptContact } from './sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';

/**
 * Every spot with barrel cases (Padang Padang Part B, PR 7), switched on only inside these tests: its own cases load,
 * and the loft and the contact build from them on its slope, as the flip would run them. SWEPT_BARREL stays the
 * owner's: no spot changes here.
 */
const SPOTS = [...new Set(BARREL_CASES.map((entry) => entry.spot))];
const STILL = 0;
const flat = () => STILL;
const E = LOFT.extensionSamples;

/** A straight front along +x at z = −100, 1 m apart, thrown there, each point at τ `tau` s and the foot crest `footHeight` m. */
function records(n: number, tau: number, footHeight: number, footDepth: number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = footHeight; out[o + FRONT_FIELD.footDepth] = footDepth;
    out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
  }
  return out;
}

describe('the swept barrel’s spots (Part B, PR 7)', () => {
  it('leaves the owner’s switch alone: only Padang Padang is swept unless a test says so', () => {
    expect(SWEPT_BARREL).toEqual(['padang']);
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      expect(sweptBarrelOn({ spot })).toBe(false);
      // A test can switch a spot on only where it has a barrel transect.
      expect(sweptBarrelOn({ spot, sweptBarrel: true })).toBe(BARREL_SPOTS[spot] !== undefined);
    }
  });

  it('gives every spot with cases a transect, and every transect cases', () => {
    for (const spot of SPOTS) expect(BARREL_SPOTS[spot], spot).toBeDefined();
    for (const spot of Object.keys(BARREL_SPOTS) as SpotName[]) expect(SPOTS, spot).toContain(spot);
  });

  it('keeps Padang Padang’s front as it was: the crest jumps and the late join are the Reef’s alone', () => {
    expect(BARREL_SPOTS.padang!.front).toBeUndefined();
    expect(BARREL_SPOTS.reef!.front).toEqual({ jumpReach: 10, joinPast: 1.5 });
  });
});

describe.each(SPOTS)('the swept barrel at %s, switched on inside the test', (spot) => {
  const barrel = BARREL_SPOTS[spot]!;
  const bytes = readBarrelCases(spot);
  const cases = bytes.map(decodeCase);
  const library = libraryFromBytes(bytes);
  // A case in the middle of the spot's own slope's range, by its H0/h0.
  const own = cases.filter((c) => Math.abs(c.slope - barrel.slope) <= 1e-6 * barrel.slope).sort((a, b) => a.nonlinearity - b.nonlinearity);
  const middle = own[Math.floor(own.length / 2)];
  const footDepth = barrel.footDepth;
  const footHeight = middle.nonlinearity * footDepth;
  /** Mid-way through the middle case's open tube, s. */
  const openSeconds = 0.5 * middle.touchdown * Math.sqrt(footDepth / 9.81);

  it('loads its own cases, on its slope', () => {
    expect(bytes.length).toBeGreaterThan(0);
    expect(own.length).toBeGreaterThan(0);
    for (const c of cases) expect(c.frames.every(Number.isFinite), c.id).toBe(true);
  });

  it('lofts a thrown front from its cases, overturned mid-tube, every lookup on its slope', () => {
    const loft = new SweptLoft(library, barrel.slope).build(records(21, openSeconds, footHeight, footDepth), 21, STILL, flat);
    expect(loft.sliceCount).toBeGreaterThan(0);
    expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
    // Inside the cases where its slope has two or more to blend; a single case (the Reef's, until its second) flags
    // every other height, here a rounding error off its own.
    if (own.length > 1) expect(loft.clampedLookups).toBe(0);
    expect(library.profileTimes({ slope: barrel.slope, footHeight: middle.nonlinearity, footDepth: 1 }).clamped).toBe(false);
    const middleSlice = Math.floor(loft.sliceCount / 2);
    expect(loft.slicePhase[middleSlice]).toBe(1);
    expect(loft.sliceOverturned[middleSlice]).toBe(1);
  });

  it('rides the drawn tube: air over the face under the lip, water in the lip', () => {
    const front = records(21, openSeconds, footHeight, footDepth);
    const drawn = new SweptLoft(library, barrel.slope).build(front, 21, STILL, flat);
    const contact = new SweptContact(library, barrel.slope);
    contact.update(front, 21, STILL, flat);
    // Under the middle slice's lip, half-way from its throat to its tip along the ray, as drawn.
    const slice = Math.floor(drawn.sliceCount / 2);
    const vertex = (index: number) => {
      const v = slice * LOFT_SAMPLES + E + index;
      return { x: drawn.positions[3 * v], y: drawn.positions[3 * v + 1], z: drawn.positions[3 * v + 2] };
    };
    const tip = vertex(LANDMARK.lip);
    const throat = vertex(LANDMARK.throat);
    const x = (tip.x + throat.x) / 2;
    const z = (tip.z + throat.z) / 2;
    const face = contact.floorAt(x, z);
    expect(Number.isFinite(face)).toBe(true);
    const hit = createContactHit();
    expect(contact.query(x, face + 0.02, z, hit)).toBe(true);
    expect(hit.inWater).toBe(false);
    expect(hit.ceilingY).toBeGreaterThan(face);
    // In the lip itself: between its underside and its top.
    expect(contact.query(x, (hit.ceilingY + hit.ceilingTopY) / 2, z, hit)).toBe(true);
    expect(hit.inWater).toBe(true);
    expect(hit.lipShare).toBeGreaterThan(0);
  });

  it('builds the breaking front on its own transect when a test switches it on', () => {
    const config: SurfZoneConfig = {
      spot, seed: 1, significantHeight: 1, peakPeriod: 12, directionDegrees: 0, spreading: 24, tide: 0,
      componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
    };
    expect(new SurfZoneSimulation({ ...config, sweptBarrel: true }, 'warm').front).toBeDefined();
    expect(new SurfZoneSimulation({ ...config, sweptBarrel: false }, 'warm').front).toBeUndefined();
  });
});
