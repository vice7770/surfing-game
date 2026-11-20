import { describe, expect, it } from 'vitest';
import { createWaterSample } from '../../physics/SurfWater';
import { PhysicalSurfWater, WALL_WATER, wallWaterFlow } from '../../physics/PhysicalSurfWater';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { type TubeFace } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { createContactHit, NEAREST, SweptContact } from './sweptContact';
import { lipCase } from './toyCase';

/**
 * The step 7 follow-up (pool-tube-contact, 2026-11-05; the water-physics advisor's second ruling,
 * docs/research/pool-tube-wall-2026-11-04/advisor-ruling-2.md): the contact's nearest surface (§1). The cap, the merge and
 * the guard are in tubeFollowUp.test.ts.
 */
const STILL = 0.5;
const H0 = 7;
const flat = () => STILL;
/** A straight front along +x at z = −100 at clock `tau` (its rays along +z). */
function records(n: number, tau: number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = H0;
    out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
    for (const f of [FRONT_FIELD.pace, FRONT_FIELD.anchor, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
  }
  return out;
}
/** Only the nearest surface on (the loft is built as without it: no anchor, union or the rest). */
const face = (contact: boolean): TubeFace => ({
  anchor: false, union: false, lag: false, clockRate: 2, thrownEnds: false, continuity: false, distance: false, contour: false, wallFlow: false,
  contact, cap: false, merge: false, guard: false, track: false, inertia: false, retire: false, buoy: false, drop: false,
});
const library = () => new ProfileLibrary([lipCase(0.3, 0.04)]);
const contactWith = (on: boolean, tau = -0.3) => {
  const contact = new SweptContact(library(), 0.05, { face: face(on) });
  contact.update(records(21, tau), 21, STILL, flat);
  return contact;
};

/** The wall's points (in the case's water, no water floor) on a grid across the middle of the front, with their hits. */
function wallPoints(contact: SweptContact) {
  const found: { x: number; y: number; z: number; hit: ReturnType<typeof createContactHit> }[] = [];
  for (let z = -102; z <= -97; z += 0.05) {
    for (let y = STILL + 0.05; y <= STILL + 0.6 * H0; y += 0.05) {
      const hit = createContactHit();
      if (contact.query(10.25, y, z, hit) && hit.inWater && !(hit.waterFloorY === hit.waterFloorY)) found.push({ x: 10.25, y, z, hit });
    }
  }
  return found;
}

describe('the step 7 follow-up: the contact\'s nearest surface', () => {
  it('casts shoreward along the ray at the point\'s height to the face just ahead, as a march along it finds', () => {
    const contact = contactWith(true);
    const plain = contactWith(false);
    const points = wallPoints(contact);
    const ahead = points.filter((p) => p.hit.aheadDepth === p.hit.aheadDepth);
    expect(points.length).toBeGreaterThan(100);
    expect(ahead.length).toBeGreaterThan(20);
    const probe = createContactHit();
    for (const { x, y, z, hit } of ahead) {
      // The ray (the front's shoreward normal: +z here).
      const rx = -hit.tangentZ;
      const rz = hit.tangentX;
      expect(rz).toBeCloseTo(1, 6);
      // A 1 mm march along it on the contact without the cast: the first point out of the water.
      let marched = Number.NaN;
      for (let t = 0.001; t <= NEAREST.reach + 0.002; t += 0.001) {
        if (!(plain.query(x + t * rx, y, z + t * rz, probe) && probe.inWater)) {
          marched = t;
          break;
        }
      }
      const cast = Math.hypot(hit.aheadX - x, hit.aheadZ - z);
      expect(Math.abs(cast - marched)).toBeLessThan(0.0021);
      // Its depth along its own normal, and the normal a unit vector out of the water (along the ray, the face ahead).
      expect(Math.hypot(hit.aheadNormalX, hit.aheadNormalY, hit.aheadNormalZ)).toBeCloseTo(1, 9);
      expect(hit.aheadDepth).toBeCloseTo(cast * Math.abs(hit.aheadNormalX * rx + hit.aheadNormalZ * rz), 9);
      expect(hit.aheadNormalX * rx + hit.aheadNormalZ * rz).toBeGreaterThan(0);
    }
  });

  it('answers the nearer of the crossing above and the face ahead along its own normal, blended within 0.05 m', () => {
    const contact = contactWith(true);
    const points = wallPoints(contact);
    let chosen = 0;
    let blended = 0;
    for (const { x, y, z, hit } of points) {
      // The crossing above along its normal: d_v |n_y|.
      expect(hit.verticalDepth).toBeCloseTo((hit.surfaceY - y) * Math.abs(hit.normalY), 9);
      if (!(hit.aheadDepth === hit.aheadDepth)) {
        expect(hit.aheadWeight).toBe(0);
        expect(hit.normalDepth).toBe(hit.verticalDepth);
        continue;
      }
      const gap = hit.verticalDepth - hit.aheadDepth;
      const cast = Math.hypot(hit.aheadX - x, hit.aheadZ - z);
      const inReach = cast <= NEAREST.reach - NEAREST.fade;
      if (gap >= NEAREST.blend && inReach) expect(hit.aheadWeight).toBe(1);
      else if (gap <= -NEAREST.blend) expect(hit.aheadWeight).toBe(0);
      else if (inReach) {
        expect(hit.aheadWeight).toBeGreaterThan(0);
        expect(hit.aheadWeight).toBeLessThan(1);
      }
      if (hit.aheadWeight === 1) chosen += 1;
      expect(hit.normalDepth).toBeCloseTo(hit.verticalDepth + hit.aheadWeight * (hit.aheadDepth - hit.verticalDepth), 12);
      expect(hit.normalDepth).toBeLessThanOrEqual(Math.max(hit.verticalDepth, hit.aheadDepth) + 1e-12);
    }
    // Behind a steep face the face ahead is the nearer by far: the vertical line meets the crest's top.
    expect(chosen).toBeGreaterThan(10);
    // Along fine lines through the wall the answer moves smoothly: through the blend and at the cast's reach.
    const hit = createContactHit();
    for (let y = STILL + 0.1; y <= STILL + 0.5 * H0; y += 0.1) {
      let last = Number.NaN;
      for (let z = -102; z <= -97; z += 0.002) {
        const wall = contact.query(10.25, y, z, hit) && hit.inWater && !(hit.waterFloorY === hit.waterFloorY);
        if (!wall) {
          last = Number.NaN;
          continue;
        }
        if (hit.aheadWeight > 0 && hit.aheadWeight < 1) blended += 1;
        // Over the cast's last 0.1 m the face ahead fades out (smoothstep, slope at most 1.5 per 0.1 m): the answer moves at
        // most 0.03 of the two answers' gap a 2 mm step there, and 0.03 m elsewhere.
        const gap = hit.aheadDepth === hit.aheadDepth ? Math.abs(hit.verticalDepth - hit.aheadDepth) : 0;
        if (last === last) expect(Math.abs(hit.normalDepth - last)).toBeLessThan(0.03 + 0.03 * gap);
        last = hit.normalDepth;
      }
    }
    expect(blended).toBeGreaterThan(0);
  });

  it('leaves every field of the vertical answer as before, and computes nothing with `?tubeContact=old`', () => {
    const on = contactWith(true);
    const off = contactWith(false);
    const a = createContactHit();
    const b = createContactHit();
    for (let z = -103; z <= -96; z += 0.1) {
      for (let y = STILL - 0.5; y <= STILL + 0.7 * H0; y += 0.1) {
        const ra = on.query(10.25, y, z, a);
        const rb = off.query(10.25, y, z, b);
        expect(ra).toBe(rb);
        if (!ra) continue;
        for (const key of ['inWater', 'surfaceY', 'normalX', 'normalY', 'normalZ', 'floorY', 'waterFloorY', 'ceilingY', 'lipShare', 'wallAlong', 'life'] as const) {
          expect(Object.is(a[key], b[key]), key).toBe(true);
        }
        expect(b.normalDepth).toBeNaN();
        expect(b.aheadWeight).toBe(0);
      }
    }
  });

  it('reports a wall point\'s surface its depth along the nearest normal above it in the water, its normal clamped as the face\'s', () => {
    const solver = new ShallowWaterSolver({ nx: 48, xMin: -12, dx: 1, zEdges: uniformEdges(-130, -70, 60) }, () => H0, { waterLevel: STILL });
    const nearest = contactWith(true);
    const vertical = contactWith(false);
    const on = new PhysicalSurfWater(solver, { peakPeriod: 18, nodeSpacing: 2, swept: nearest, sweptUnion: true, sweptNearest: true });
    const off = new PhysicalSurfWater(solver, { peakPeriod: 18, nodeSpacing: 2, swept: vertical, sweptUnion: true });
    const a = createWaterSample();
    const b = createWaterSample();
    const hit = createContactHit();
    let answered = 0;
    for (const { x, y, z } of wallPoints(nearest)) {
      on.sampleAt(x, y, z, a);
      off.sampleAt(x, y, z, b);
      nearest.query(x, y, z, hit);
      // Over the solver's flat surface (0.5 m) here, so the face ahead counts whole.
      expect(y).toBeGreaterThan(STILL);
      expect(a.surfaceY - y).toBeCloseTo(hit.normalDepth, 9);
      expect(a.surfaceY - y).toBeLessThanOrEqual(b.surfaceY - y + 1e-9);
      expect(Math.hypot(a.normalX, a.normalY, a.normalZ)).toBeCloseTo(1, 9);
      if (a.normalY >= 0.5) expect(a.slopeZ).toBeCloseTo(-a.normalZ / a.normalY, 9);
      else expect(Math.hypot(a.slopeX, a.slopeZ)).toBeCloseTo(Math.sqrt(3), 9);
      // The solver's flow is the same (no wall water without `sweptWall`).
      expect(a.flowZ).toBe(b.flowZ);
      if (hit.aheadWeight === 1) answered += 1;
    }
    expect(answered).toBeGreaterThan(10);
  });

  it('fades the wall water\'s kinematic normal part to the solver\'s flow from 0.3 to 0.6 m deep', () => {
    const base = createContactHit();
    Object.assign(base, {
      normalX: 0, normalY: 0.2, normalZ: 0.98, tangentX: 1, tangentZ: 0, wallAlong: 6, wallUp: 3, wallLow: 0, wallTop: 2, wallSpeed: 6,
      wallB: 1, wallWeight: 1,
    });
    const flowAt = (depth: number) => {
      const out = { flowX: 0, flowY: 0.4, flowZ: 1.5 };
      wallWaterFlow(out, 1, { ...base, normalDepth: depth });
      return out;
    };
    const none = { flowX: 0, flowY: 0.4, flowZ: 1.5 };
    wallWaterFlow(none, 1, base);
    // Shallower than 0.3 m and without a depth: the kinematic condition whole; past 0.6 m the solver's normal part.
    expect(flowAt(0.2)).toEqual(none);
    expect(flowAt(Number.NaN)).toEqual(none);
    const n = Math.hypot(base.normalZ, base.normalY);
    const normalOf = (f: { flowY: number; flowZ: number }) => (f.flowZ * base.normalZ + f.flowY * base.normalY) / n;
    const solverNormal = (1.5 * base.normalZ + 0.4 * base.normalY) / n;
    const kinematic = (base.wallUp * base.normalY + base.wallAlong * base.normalZ) / n;
    expect(normalOf(none)).toBeCloseTo(kinematic, 9);
    expect(normalOf(flowAt(0.7))).toBeCloseTo(solverNormal, 9);
    expect(normalOf(flowAt(0.45))).toBeCloseTo(0.5 * (kinematic + solverNormal), 9);
    expect(WALL_WATER.fade).toEqual([0.3, 0.6]);
  });
});
