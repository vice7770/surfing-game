import { describe, expect, it } from 'vitest';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { createWaterSample } from '../../physics/SurfWater';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { tubeFaceOf, type TubeFace } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { LANDMARK, ProfileLibrary } from './ProfileLibrary';
import { createContactHit, SweptContact } from './sweptContact';
import { LOFT, LOFT_SAMPLES, REST, SweptLoft } from './sweptLoft';
import { lipCase } from './toyCase';
import { TUBE_SEAM } from './tubeSeam';
import { DUG_CAP, DUG_CREST, REST_DUG, dugAlong, dugCap, dugCrestRamp, dugPlace, dugShare } from './wallFoot';

/**
 * Ruling 21's dug foot (`TubeFace.dug`, `?wallFoot=dug`; docs/research/pool-look-reference-2026-11-11/ruling-21.md):
 * past the crest the drawn face is the case's own also where it lies under the solver's sea; the return to the sea is
 * made ahead of the toe, over lengths in wave heights; the contact and a body's water follow. Opt-in; off, as before.
 */
const E = LOFT.extensionSamples;
const { crest, toe } = LANDMARK;

describe('ruling 21: the dug foot\'s pure pieces', () => {
  it('has the ruling\'s lengths in wave heights, and leaves the old rest\'s alone', () => {
    expect(REST_DUG).toEqual({ ramp: 2, near: 0.05, ahead: 5 });
    expect(REST).toEqual({ behind: 0.1, ramp: 0.5, near: 0.1, ahead: 3, step: 0.5 });
    expect(DUG_CREST).toBe(8);
  });

  it('eases the height share out over the first points past the crest, with no step at the crest', () => {
    for (const i of [0, crest - 1, crest]) expect(dugCrestRamp(i, crest)).toBe(-1);
    expect(dugCrestRamp(crest + 4, crest)).toBeCloseTo(0.5, 12);
    for (const i of [crest + DUG_CREST, crest + 20, toe, 127, 130]) expect(dugCrestRamp(i, crest)).toBe(1);
    let last = 0;
    for (let i = crest + 1; i <= crest + DUG_CREST; i += 1) {
      const ramp = dugCrestRamp(i, crest);
      expect(ramp).toBeGreaterThan(last);
      last = ramp;
    }
    // The first point past the crest is nearly on today's rule: 4 % of the way to the clock's share alone.
    expect(dugCrestRamp(crest + 1, crest)).toBeLessThan(0.05);
    // The share: today's α_τ α_h where the ramp is 0, the clock's alone where it is 1, between in between.
    expect(dugShare(0.6, 0.25, 0)).toBeCloseTo(0.15, 12);
    expect(dugShare(0.6, 0.25, 1)).toBe(0.6);
    expect(dugShare(0.6, 0, 1)).toBe(0.6);
    expect(dugShare(0.6, 0, 0.5)).toBeCloseTo(0.3, 12);
    expect(dugShare(1, 1, 0.3)).toBe(1);
    expect(dugShare(0, 1, 1)).toBe(0);
  });

  it('stands the forward vertices evenly from the toe to 5 H and the band, on the profile\'s own line', () => {
    expect(dugAlong(0, 18, 3, 1.7, 1)).toBe(3);
    expect(dugAlong(18, 18, 3, 1.7, 1)).toBeCloseTo(3 + 5 * 1.7 + 1, 12);
    expect(dugAlong(9, 18, 3, 1.7, 1)).toBeCloseTo(3 + (5 * 1.7 + 1) / 2, 12);
    // Points (x, y): 0 (0, 1), 1 (1, 0), 2 (3, −0.2), 3 (4, 0).
    const profile = [0, 1, 1, 0, 3, -0.2, 4, 0];
    const out = new Float64Array(2);
    dugPlace(profile, 1, 3, 2, out);
    expect([out[0], out[1]]).toEqual([1, 0.5]);
    dugPlace(profile, 1, 3, 3.25, out);
    expect([out[0], out[1]]).toEqual([2, 0.25]);
    dugPlace(profile, 1, 3, 1, out);
    expect([out[0], out[1]]).toEqual([1, 0]);
    // At and past the last point: its level.
    for (const along of [4, 9]) {
      dugPlace(profile, 1, 3, along, out);
      expect([out[0], out[1]]).toEqual([2, 1]);
    }
  });
});

describe('ruling 21: the switch', () => {
  it('is read only with the seam blend, and off the face is the same', () => {
    expect(tubeFaceOf(true, {})).not.toHaveProperty('dug');
    expect(tubeFaceOf(true, { wallFoot: 'dug' })).not.toHaveProperty('dug');
    expect(tubeFaceOf(true, { wallFoot: 'dug' })).toEqual(tubeFaceOf(true, {}));
    expect(tubeFaceOf(true, { tubeSeam: 'blend', wallFoot: 'dug' })).toMatchObject({ dug: true });
    expect(tubeFaceOf(true, { tubeSeam: 'blend', wallFoot: 'dug', wallFlow: 'old' })).not.toHaveProperty('dug');
    expect(tubeFaceOf(true, { tubeSeam: 'blend', wallFoot: 'dug', tubeFrom: 'piece' })).not.toHaveProperty('dug');
    expect(tubeFaceOf(false, { tubeSeam: 'blend', wallFoot: 'dug' })).toBeUndefined();
    const { dug: _on, ...rest } = tubeFaceOf(true, { tubeForm: 'early', tubeSeam: 'blend', crestLine: 'top', loftMesh: 'arc', wallFoot: 'dug' })!;
    expect(rest).toEqual(tubeFaceOf(true, { tubeForm: 'early', tubeSeam: 'blend', crestLine: 'top', loftMesh: 'arc' }));
  });
});

describe('ruling 21: the dug foot in the loft, the contact and a body\'s water', () => {
  const STILL = 0.5;
  /** The sea stands this far over the case's still level: the case's trough and toe lie under it. */
  const OVER = 0.3;
  const SEA = STILL + OVER;
  const H0 = 7;
  const N = 21;
  const seam = { tau: TUBE_SEAM.tau, band: TUBE_SEAM.band };
  const face = (over: Partial<TubeFace>): TubeFace => ({
    anchor: false, union: true, lag: false, clockRate: 2, thrownEnds: false, continuity: false, distance: false, contour: false, wallFlow: true,
    contact: true, cap: false, merge: false, guard: false, track: false, inertia: false, retire: false, buoy: false, drop: false, seam, ...over,
  });
  function records(tau: number): Float32Array {
    const out = new Float32Array(N * FRONT_STRIDE);
    for (let k = 0; k < N; k += 1) {
      const o = k * FRONT_STRIDE;
      out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
      out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = H0;
      out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
      for (const f of [FRONT_FIELD.pace, FRONT_FIELD.anchor, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
    }
    return out;
  }
  const loftOf = (tau: number, over: Partial<TubeFace>) =>
    new SweptLoft(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05, { contact: true, face: face(over) }).build(records(tau), N, STILL, () => SEA);
  const slice = 10;
  const at = (loft: ReturnType<typeof loftOf>, j: number): [number, number, number] => {
    const o = 3 * (slice * LOFT_SAMPLES + j);
    return [loft.positions[o], loft.positions[o + 1], loft.positions[o + 2]];
  };
  const past = (loft: ReturnType<typeof loftOf>, j: number) => {
    const [x0, , z0] = at(loft, E + toe);
    const [x, , z] = at(loft, j);
    return Math.hypot(x - x0, z - z0);
  };

  it('off, the build is as before: every floor vertex on or over the sea, no marks', () => {
    for (const tau of [-0.25, 0.2]) {
      const off = loftOf(tau, {});
      expect(off.wall!.dug).toBeUndefined();
      for (let j = E + toe; j < LOFT_SAMPLES; j += 1) expect(at(off, j)[1]).toBeGreaterThanOrEqual(SEA - 1e-6);
      // The switch off and the switch absent are one build.
      const absent = new SweptLoft(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05, { contact: true, face: { ...face({}) } }).build(records(tau), N, STILL, () => SEA);
      expect(Array.from(absent.positions)).toEqual(Array.from(off.positions));
    }
  });

  it('leaves the back slope, the crest and the thrown lip as they are', () => {
    for (const tau of [-0.25, 0.2]) {
      const off = loftOf(tau, {});
      const on = loftOf(tau, { dug: true });
      // Behind and at the crest: today's rule. On the thrown slice also the lip, crest to throat (never a floor).
      const same = tau >= 0 ? E + LANDMARK.throat - 1 : E + crest;
      for (let j = 0; j <= same; j += 1) {
        for (let c = 0; c < 3; c += 1) expect(at(on, j)[c], `${tau} ${j} ${c}`).toBe(at(off, j)[c]);
        expect(on.wall!.seam![slice * LOFT_SAMPLES + j]).toBe(off.wall!.seam![slice * LOFT_SAMPLES + j]);
      }
      for (let j = 0; j <= E + crest; j += 1) expect(on.wall!.dug![slice * LOFT_SAMPLES + j]).toBe(0);
      // Where the case stands a band and more over the sea, the face is today's too.
      for (let j = E + crest + 1; j < E + toe; j += 1) {
        if (at(off, j)[1] > SEA + 2) expect(at(on, j)[1]).toBeCloseTo(at(off, j)[1], 5);
      }
    }
  });

  it('draws the case\'s own foot under the sea at the throw, and returns to the sea at the mesh\'s end', () => {
    const off = loftOf(0.2, {});
    const on = loftOf(0.2, { dug: true });
    const mark = (j: number) => on.wall!.dug![slice * LOFT_SAMPLES + j];
    const share = (j: number) => on.wall!.seam![slice * LOFT_SAMPLES + j];
    // The face from the throat on is a floor: marked whole, the case's whole.
    for (let j = E + LANDMARK.throat; j < LOFT_SAMPLES; j += 1) expect(mark(j)).toBe(1);
    // The toy's trough is its still level, `OVER` under the sea: the first third of the forward vertices are on it.
    for (let j = E + toe + 1; j <= E + toe + 6; j += 1) {
      expect(at(on, j)[1]).toBeCloseTo(STILL, 5);
      expect(share(j)).toBe(1);
    }
    // Never under the case's own level, never over the sea, rising to the sea all the way from the trough.
    let last = STILL - 1e-6;
    for (let j = E + toe + 1; j < LOFT_SAMPLES; j += 1) {
      const y = at(on, j)[1];
      expect(y).toBeGreaterThanOrEqual(last - 1e-6);
      expect(y).toBeLessThanOrEqual(SEA + 1e-6);
      last = y;
    }
    // The mesh's end: on the sea, and the flow's share the sea's.
    expect(at(on, LOFT_SAMPLES - 1)[1]).toBeCloseTo(SEA, 5);
    expect(share(LOFT_SAMPLES - 1)).toBe(0);
    // The forward vertices stand evenly, out to 5 H and the mask's band; the old ones reached the profile's front + 1.5 m.
    const count = LOFT_SAMPLES - 1 - E - toe;
    const step = past(on, LOFT_SAMPLES - 1) / count;
    for (let j = E + toe; j < LOFT_SAMPLES - 1; j += 1) expect(past(on, j + 1) - past(on, j)).toBeCloseTo(step, 3);
    const height = (past(on, LOFT_SAMPLES - 1) - LOFT.band) / REST_DUG.ahead;
    const crestY = Math.max(...Array.from({ length: LOFT_SAMPLES }, (_, j) => at(on, j)[1]));
    expect(height).toBeGreaterThan(0.8 * (crestY - STILL));
    expect(height).toBeLessThan(1.2 * (crestY - STILL));
    expect(past(on, LOFT_SAMPLES - 1)).toBeGreaterThan(past(off, LOFT_SAMPLES - 1));
    // The ease: held until the last 2 H, so the vertex 2.5 H short of 5 H is still on the trough.
    for (let j = E + toe + 1; j < LOFT_SAMPLES; j += 1) {
      if (past(on, j) < (REST_DUG.ahead - REST_DUG.ramp) * height - 0.01) expect(at(on, j)[1]).toBeCloseTo(STILL, 5);
    }
  });

  it('before the throw digs by the clock\'s share alone, eased in from the crest', () => {
    const off = loftOf(-0.25, {});
    const on = loftOf(-0.25, { dug: true });
    // α_τ is a half here: the foot stands between the sea and the case's own, under the sea (the toy's lip is
    // overturned from the start, so its floor past the crest starts at the throat).
    let under = 0;
    for (let j = E + LANDMARK.throat; j < LOFT_SAMPLES - 1; j += 1) {
      const v = slice * LOFT_SAMPLES + j;
      expect(on.wall!.dug![v]).toBeGreaterThan(0);
      expect(on.wall!.dug![v]).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(at(on, j)[1]).toBeGreaterThan(STILL + 0.5 * OVER - 1e-6);
      if (at(on, j)[1] < SEA - 0.02) under += 1;
    }
    expect(under).toBeGreaterThan(12);
    // The first point past the crest is within a few millimetres of today's.
    expect(Math.abs(at(on, E + crest + 1)[1] - at(off, E + crest + 1)[1])).toBeLessThan(0.02);
    // Long before the throw the case is out: the sea's own surface, switch or no switch.
    const early = loftOf(-0.6, { dug: true });
    const plain = loftOf(-0.6, {});
    for (let j = 0; j <= E + toe; j += 1) expect(at(early, j)[1]).toBe(at(plain, j)[1]);
    for (let j = E + toe + 1; j < LOFT_SAMPLES; j += 1) expect(at(early, j)[1]).toBeCloseTo(SEA, 6);
  });

  it('gives a body the dug face as its water\'s surface, and the sea\'s without the switch', () => {
    const build = (dug: boolean) => {
      const solver = new ShallowWaterSolver({ nx: 48, xMin: -12, dx: 1, zEdges: uniformEdges(-130, -60, 70) }, () => H0, { waterLevel: SEA });
      const contact = new SweptContact(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05, { face: face(dug ? { dug: true } : {}) });
      contact.update(records(0.2), N, STILL, () => SEA);
      const options = { peakPeriod: 18, nodeSpacing: 2, swept: contact, sweptUnion: true, sweptWall: true, sweptNearest: true, sweptSeam: true };
      return { contact, water: new PhysicalSurfWater(solver, { ...options, ...(dug ? { sweptDug: true } : {}) }) };
    };
    const off = build(false);
    const on = build(true);
    const hit = createContactHit();
    const offHit = createContactHit();
    const sample = createWaterSample();
    let dugPoints = 0;
    for (let z = -98; z <= -74; z += 0.5) {
      const x = 10.25;
      const plain = on.water.plainSurfaceAt(x, z);
      expect(plain).toBeCloseTo(SEA, 6);
      // Off: the contact's floor is on the sea, and so is the body's water.
      const was = off.contact.floorAt(x, z);
      if (was === was) expect(was).toBeGreaterThanOrEqual(SEA - 1e-6);
      expect(off.water.surfaceAt(x, z)).toBeCloseTo(SEA, 5);
      expect(off.contact.query(x, SEA, z, offHit) ? offHit.dug : undefined).toBeUndefined();
      // On: the contact's floor is the dug face, marked, and the body's water surface is that floor.
      const floor = on.contact.floorAt(x, z);
      expect(floor).toBe(floor);
      expect(on.contact.query(x, floor - 0.01, z, hit)).toBe(true);
      expect(hit.dug).toBeGreaterThan(0.99);
      expect(on.water.surfaceAt(x, z)).toBeCloseTo(floor, 6);
      if (floor < SEA - 0.05) {
        dugPoints += 1;
        // Under the face: in the water, the surface the face's. Between the face and the sea: air.
        // (On the sloping ease the body's surface is read at the face's nearest point: within a tenth of a millimetre.)
        on.water.sampleAt(x, floor - 0.01, z, sample);
        expect(Math.abs(sample.surfaceY - floor)).toBeLessThan(1e-4);
        on.water.sampleAt(x, floor + 0.03, z, sample);
        expect(Math.abs(sample.surfaceY - floor)).toBeLessThan(1e-4);
        expect(sample.surfaceY).toBeLessThan(floor + 0.03);
      }
    }
    expect(dugPoints).toBeGreaterThan(20);
  });
});

/**
 * Ruling 22's soft cap on the dig (docs/research/pool-look-reference-2026-11-11/ruling-22.md, point 3), under the same
 * switch: untouched up to 0.35 H, eased so it never passes 0.5 H, never more than half the sea's depth; the contact follows.
 */
describe('ruling 22: the cap on the dig', () => {
  it('leaves a dig up to 0.35 H its own number, and eases above it under 0.5 H with no step and no kink', () => {
    expect(DUG_CAP).toEqual({ free: 0.35, most: 0.5, bed: 0.5 });
    const H = 1.7;
    const a = DUG_CAP.free * H;
    const b = DUG_CAP.most * H;
    for (const dig of [0, 0.011, 0.2, 0.41, 0.5949, a]) expect(dugCap(dig, H, Infinity)).toBe(dig);
    // The ruling's formula above a.
    for (const dig of [0.6, 0.7, 0.85, 1.15, 3, 50]) {
      const x = (dig - a) / (b - a);
      expect(dugCap(dig, H, Infinity)).toBeCloseTo(a + ((b - a) * x) / (1 + x), 12);
      expect(dugCap(dig, H, Infinity)).toBeLessThan(b);
      expect(dugCap(dig, H, Infinity)).toBeLessThan(dig);
    }
    // Step 9's deepest, 1.15 m at H 1.7 m: 0.77 m.
    expect(dugCap(1.15, H, Infinity)).toBeCloseTo(0.7697, 3);
    // Value and slope continuous at a (slope 1 either side), rising all the way.
    const d = 1e-6;
    expect(dugCap(a + d, H, Infinity) - a).toBeCloseTo(d, 9);
    expect((dugCap(a + 2 * d, H, Infinity) - dugCap(a + d, H, Infinity)) / d).toBeCloseTo(1, 4);
    let last = 0;
    for (let dig = 0; dig < 4; dig += 0.01) {
      const capped = dugCap(dig, H, Infinity);
      expect(capped).toBeGreaterThanOrEqual(last);
      last = capped;
    }
  });

  it('holds the dig to half the sea\'s depth, and leaves a shallower dig its own number', () => {
    const H = 1.7;
    expect(dugCap(0.4, H, 0.6)).toBe(0.3);
    expect(dugCap(0.4, H, 0.8)).toBe(0.4);
    expect(dugCap(0.4, H, 2)).toBe(0.4);
    expect(dugCap(1.15, H, 1)).toBe(0.5);
    expect(dugCap(1.15, H, 9)).toBe(dugCap(1.15, H, Infinity));
    // A dry place digs nothing.
    expect(dugCap(0.2, H, 0)).toBe(0);
    expect(dugCap(0.2, H, -0.1)).toBe(0);
  });

  const STILL = 0.5;
  const N = 21;
  const seam = { tau: TUBE_SEAM.tau, band: TUBE_SEAM.band };
  const face: TubeFace = {
    anchor: false, union: true, lag: false, clockRate: 2, thrownEnds: false, continuity: false, distance: false, contour: false, wallFlow: true,
    contact: true, cap: false, merge: false, guard: false, track: false, inertia: false, retire: false, buoy: false, drop: false, seam, dug: true,
  };
  function records(tau: number): Float32Array {
    const out = new Float32Array(N * FRONT_STRIDE);
    for (let k = 0; k < N; k += 1) {
      const o = k * FRONT_STRIDE;
      out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
      out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7;
      out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
      for (const f of [FRONT_FIELD.pace, FRONT_FIELD.anchor, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
    }
    return out;
  }
  const loftOf = (tau: number, sea: number, bed?: number) =>
    new SweptLoft(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05, { contact: true, face })
      .build(records(tau), N, STILL, () => sea, bed === undefined ? undefined : () => bed);
  const slice = 10;
  const yAt = (loft: ReturnType<typeof loftOf>, j: number) => loft.positions[3 * (slice * LOFT_SAMPLES + j) + 1];
  /** The slice's drawn height H, from the forward mesh's reach (5 H and the mask's band past the toe). */
  const heightOf = (loft: ReturnType<typeof loftOf>) => {
    const a = 3 * (slice * LOFT_SAMPLES + E + toe);
    const b = 3 * (slice * LOFT_SAMPLES + LOFT_SAMPLES - 1);
    return (Math.hypot(loft.positions[b] - loft.positions[a], loft.positions[b + 2] - loft.positions[a + 2]) - LOFT.band) / REST_DUG.ahead;
  };

  it('under 0.35 H and over a deep bed the build is step 9\'s, number for number', () => {
    for (const tau of [-0.25, 0.2]) {
      const plain = loftOf(tau, STILL + 0.3);
      const deep = loftOf(tau, STILL + 0.3, STILL + 0.3 - 7);
      expect(0.3).toBeLessThan(DUG_CAP.free * heightOf(plain));
      expect(plain.dugCapped).toBe(0);
      expect(deep.dugCapped).toBe(0);
      expect(Array.from(deep.positions)).toEqual(Array.from(plain.positions));
      expect(Array.from(deep.wall!.seam!)).toEqual(Array.from(plain.wall!.seam!));
      expect(Array.from(deep.wall!.dug!)).toEqual(Array.from(plain.wall!.dug!));
    }
    // At the throw the trough is the case's own level, 0.3 m under the sea, as step 9 drew it.
    const on = loftOf(0.2, STILL + 0.3);
    for (let j = E + toe + 1; j <= E + toe + 6; j += 1) expect(yAt(on, j)).toBeCloseTo(STILL, 5);
  });

  it('under a sea standing high over the case the dig eases and stays under 0.5 H', () => {
    const over = 3.5;
    const sea = STILL + over;
    const on = loftOf(0.2, sea);
    const H = heightOf(on);
    expect(over).toBeGreaterThan(DUG_CAP.most * H);
    expect(on.dugCapped).toBeGreaterThan(0);
    // The trough's first vertices: the case's level is `over` under the sea; drawn at the capped dig.
    for (let j = E + toe + 1; j <= E + toe + 6; j += 1) expect(sea - yAt(on, j)).toBeCloseTo(dugCap(over, H, Infinity), 4);
    for (let j = E + LANDMARK.throat; j < LOFT_SAMPLES; j += 1) {
      expect(sea - yAt(on, j)).toBeLessThan(DUG_CAP.most * H);
      // The marks are step 9's: the face is still a dug floor there.
      expect(on.wall!.dug![slice * LOFT_SAMPLES + j]).toBe(1);
    }
    // The lip (crest to throat, air under it) is not a floor: left as it is.
    const calm = loftOf(0.2, STILL + 0.3);
    for (let j = E + crest + 1; j < E + LANDMARK.throat; j += 1) {
      if (yAt(calm, j) > sea + 2) expect(yAt(on, j)).toBeCloseTo(yAt(calm, j), 4);
    }
  });

  it('keeps half the sea\'s depth under the drawn surface where the bed is near', () => {
    const over = 0.3;
    const sea = STILL + over;
    const bed = sea - 0.4;
    const on = loftOf(0.2, sea, bed);
    expect(on.dugCapped).toBeGreaterThan(0);
    for (let j = E + LANDMARK.throat; j < LOFT_SAMPLES; j += 1) expect(yAt(on, j) - bed).toBeGreaterThanOrEqual(0.2 - 1e-6);
    for (let j = E + toe + 1; j <= E + toe + 6; j += 1) expect(yAt(on, j)).toBeCloseTo(sea - 0.2, 5);
  });

  it('the contact\'s floor follows the capped surface', () => {
    const over = 3.5;
    const sea = STILL + over;
    const contact = new SweptContact(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05, { face });
    contact.update(records(0.2), N, STILL, () => sea, () => sea - 7);
    const drawn = loftOf(0.2, sea, sea - 7);
    const H = heightOf(drawn);
    let deepest = 0;
    let read = 0;
    for (let z = -98; z <= -74; z += 0.5) {
      const floor = contact.floorAt(10.25, z);
      if (floor !== floor) continue;
      read += 1;
      deepest = Math.max(deepest, sea - floor);
    }
    expect(read).toBeGreaterThan(20);
    expect(deepest).toBeGreaterThan(DUG_CAP.free * H);
    expect(deepest).toBeLessThan(DUG_CAP.most * H);
    expect(deepest).toBeCloseTo(dugCap(over, H, Infinity), 3);
  });
});
