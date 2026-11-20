import { describe, expect, it } from 'vitest';
import { createWaterSample } from '../../physics/SurfWater';
import { wallWaterFlow } from '../../physics/PhysicalSurfWater';
import { libraryFromBytes } from './barrelLibrary';
import { BreakingFront, type FrontPoint } from './BreakingFront';
import type { CrestSample } from './crestOnset';
import { ANCHOR_CONTINUITY, FaceAnchor, smoothPlaces, smoothShifts } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { advanceClocks, FORMATION, throwContourDistance, type OnsetTiming } from './sliceClock';
import { BARREL_SLOPE, WALL_FLOW } from './sweptLoft';
import { createContactHit } from './sweptContact';

/**
 * Step 7, Q1 of the Wave Pool's surfable tube (pool-tube-wall, 2026-11-04; the water-physics advisor's ruling §1.4,
 * docs/research/pool-tube-wall-2026-11-04/advisor-ruling.md): the anchor's extrapolation blend, formation by distance, the
 * wall's water and the records' fields. The anchor's continuity step and the switches are in faceAnchor.test.ts.
 */
describe('step 7: the wall\'s continuity, formation and flow', () => {
  it('reads the distance to the throw contour along a ray, ahead and behind, linear between reads', () => {
    // A plane face 1:10 along +z: still depth 4 m at z 0, 2 m at z 20.
    const still = (_x: number, z: number) => 4 - z / 10;
    expect(throwContourDistance(still, 0, 0, 0, 1, 2.6)).toBeCloseTo(14, 9);
    expect(throwContourDistance(still, 0, 5, 0, 1, 3.33)).toBeCloseTo(1.7, 9);
    // Past it: negative.
    expect(throwContourDistance(still, 0, 18, 0, 1, 2.6)).toBeCloseTo(-4, 9);
    // Along a ray 60° off the slope: the distance grows by 1/cos 60°.
    const c = Math.cos(Math.PI / 3);
    const s = Math.sin(Math.PI / 3);
    expect(throwContourDistance(still, 0, 0, s, c, 3.5)).toBeCloseTo(5 / c, 9);
    // Past its reach ahead: Infinity; past it behind: NaN.
    expect(throwContourDistance(still, 0, 0, 0, 1, 1)).toBe(Infinity);
    expect(throwContourDistance(still, 0, 100, 0, 1, 3)).toBeNaN();
  });

  it('runs a point\'s pre-throw clock by its distance from τ_e, at 0.5–1.5× real time, and throws it at 0', () => {
    // Points 1 m apart along x, their crests at z; the contour at z 10 along +z; C the long-wave speed (unmeasured).
    const still = (_x: number, z: number) => 3 - z / 10;
    const timing: OnsetTiming = {
      h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7, thrownRate: 1.25,
      distance: { to: (x, z, dx, dz, depth) => throwContourDistance(still, x, z, dx, dz, depth), contour: true },
    };
    const make = (k: number, z: number): FrontPoint => ({
      id: k, front: 0, column: k, sigma: k, x: k, z, b: Number.NaN, height: 0.8, joined: 0, depth: 2.5, throwDepth: 2, crestDepth: 3 - z / 10,
      thrown: null, throwZ: null, footHeight: 0.84, footDepth: 4.4, broke: 0, tau: timing.earliest, seen: 0, fresh: null, dirX: 0, dirZ: 1,
      crestSpeed: 5,
    });
    const points = [0, 1, 2, 3, 4].map((k) => make(k, 1.5));
    const dt = 1 / 60;
    let time = 0;
    let last = points.map((p) => p.tau);
    let lastWeight = 0;
    let thrownAt = Number.NaN;
    for (let n = 0; n < 200; n += 1) {
      time += dt;
      for (const p of points) {
        // Its crest comes in at C along +z.
        p.z += 5 * dt;
        p.crestDepth = 3 - p.z / 10;
      }
      advanceClocks(points, time, timing, dt);
      points.forEach((p, k) => {
        const step = p.tau - last[k];
        if (last[k] < 0) {
          expect(step).toBeGreaterThanOrEqual(FORMATION.rate[0] * dt - 1e-12);
          expect(step).toBeLessThanOrEqual(FORMATION.rate[1] * dt + 1e-12);
        }
      });
      const w = points[2].formation ?? 1;
      expect(w - lastWeight).toBeLessThanOrEqual(FORMATION.weightRate * dt + 1e-12);
      expect(w).toBeGreaterThanOrEqual(lastWeight);
      lastWeight = w;
      if (!(thrownAt === thrownAt) && points[2].thrown !== null) thrownAt = time;
      last = points.map((p) => p.tau);
    }
    // Its crest reaches the contour (z 10) after (10 − 1.5) / 5 = 1.7 s: its clock, started at τ_e, follows −D/C and throws
    // within a step of it, the throw recorded where the clock crossed 0.
    expect(thrownAt).toBeCloseTo(1.7, 1);
    expect(points[2].thrown).toBeCloseTo(1.7, 1);
    expect(points[2].formation).toBe(1);
  });

  it('holds an unbroken point short of its throw with `?tubeThrow=break`, and throws it at the contour and retires it later without', () => {
    const still = (_x: number, z: number) => 3 - z / 10;
    const base: OnsetTiming = {
      h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7, thrownRate: 1.25,
      distance: { to: (x, z, dx, dz, depth) => throwContourDistance(still, x, z, dx, dz, depth), contour: true },
    };
    const point = (): FrontPoint => ({
      id: 0, front: 0, column: 0, sigma: 0, x: 0, z: 9, b: Number.NaN, height: 0.8, joined: 0, depth: 2.5, throwDepth: 2, crestDepth: 2.1,
      thrown: null, throwZ: null, footHeight: 0.84, footDepth: 4.4, broke: 0, tau: -0.05, seen: 0, fresh: null, dirX: 0, dirZ: 1,
      crestSpeed: 5, unbroken: true, formation: 1,
    });
    const dt = 1 / 60;
    const held = point();
    const thrown = point();
    let time = 0;
    for (let n = 0; n < 60; n += 1) {
      time += dt;
      held.z += 5 * dt;
      thrown.z += 5 * dt;
      advanceClocks([held], time, { ...base, distance: { ...base.distance!, contour: false } }, dt);
      advanceClocks([thrown], time, base, dt);
    }
    expect(held.tau).toBeLessThan(0);
    expect(held.thrown).toBeNull();
    expect(held.retire).toBeGreaterThan(0);
    expect(thrown.thrown).not.toBeNull();
    // Unbroken 0.3 s past its throw it retires over 0.5 s (the guard).
    expect(thrown.tau).toBeGreaterThan(0.3);
    expect(thrown.retire).toBeCloseTo(Math.min(1, (thrown.tau - 0.3) / 0.5), 6);
  });

  it('joins a crest by its distance to its throw contour, not its lead depth, and leaves its throw to its clock', () => {
    // A plane face 1:10 along +z from the 4.4 m foot (z 0); the throw contour at 2 m (z 24).
    const still = (_x: number, z: number) => 4.4 - z / 10;
    const timing: OnsetTiming = { h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7 };
    const front = new BreakingFront(1, timing, { distance: (x, z, dx, dz, depth) => throwContourDistance(still, x, z, dx, dz, depth) });
    const sample = (z: number, strength: number): CrestSample => ({
      column: 0, row: 0, x: 0, z, eta: 0.8, wave: 1.2, strength, rise: 0, depth: still(0, z), b: Number.NaN, speed: 4, dirX: 0, dirZ: 1,
    });
    let time = 0;
    let joinedAt = Number.NaN;
    for (let z = 0.5; z < 30; z += 0.5) {
      time += 0.1;
      front.update([sample(z, 0)], 1, time);
      if (front.points.length && !(joinedAt === joinedAt)) joinedAt = z;
    }
    // |τ_e| C_p = 1.7 × 4 = 6.8 m short of the contour (z 24): joined at z ≥ 17.2, the first read there.
    expect(joinedAt).toBeCloseTo(17.5, 9);
    const p = front.points[0];
    expect(p.tau).toBe(timing.earliest);
    expect(p.unbroken).toBe(true);
    // Its crest past its throw depth: still unthrown (its clock throws it).
    expect(p.crestDepth).toBeLessThan(2);
    expect(p.thrown).toBeNull();
  });

  it('blends the case\'s crossing\'s extrapolation in over life 0.45–0.55, as before outside it', () => {
    const library = libraryFromBytes(readBarrelCases('pool', undefined, 'pool'), 'basilisk', 'pool');
    const slope = BARREL_SLOPE.pool!;
    const old = new FaceAnchor(library, slope);
    const blended = new FaceAnchor(library, slope, true);
    const times = library.profileTimes({ slope, footHeight: 0.84, footDepth: 4.4 });
    const td = times.touchdownSeconds;
    const a = new Float64Array(3);
    const b = new Float64Array(3);
    let oldStep = 0;
    let newStep = 0;
    let lastOld = Number.NaN;
    let lastNew = Number.NaN;
    const [from, to] = ANCHOR_CONTINUITY.blend;
    for (let life = 0.3; life <= 0.7 + 1e-9; life += 0.0025) {
      old.caseFace(0.84, 4.4, life * td, 'contact', a);
      blended.caseFace(0.84, 4.4, life * td, 'contact', b);
      if (life < from - 1e-9 || life > to + 1e-9) expect(b[0]).toBeCloseTo(a[0], 9);
      if (lastOld === lastOld) oldStep = Math.max(oldStep, Math.abs(a[0] - lastOld));
      if (lastNew === lastNew) newStep = Math.max(newStep, Math.abs(b[0] - lastNew));
      lastOld = a[0];
      lastNew = b[0];
    }
    // No step anywhere: within the blend no larger than the crossing's own motion a sample (measured: on the pool's cases and
    // a38 the switch itself steps by under 1 mm at the contact's hold, so the blend changes little there).
    expect(newStep).toBeLessThanOrEqual(oldStep * 1.01 + 1e-4);
  });

  it('gives the wall\'s water the surface\'s own normal speed and the ramp along the ray, the climb up the face following', () => {
    const hit = createContactHit();
    // The ray along +z (the front's tangent along +x); a 60° face, its normal (0, cos 60°, sin 60°) out of the water, forward.
    hit.tangentX = 1;
    hit.tangentZ = 0;
    const face = (degrees: number) => {
      const angle = (degrees * Math.PI) / 180;
      hit.normalX = 0;
      hit.normalY = Math.cos(angle);
      hit.normalZ = Math.sin(angle);
    };
    face(60);
    // The face moving forward at 5 m/s (its own normal speed 5 sin 60°), the crest's water at B·C.
    Object.assign(hit, { wallAlong: 5, wallUp: 0, wallLow: 0, wallTop: 1, wallSpeed: 5, wallB: WALL_FLOW.before, wallWeight: 1 });
    const flow = createWaterSample();
    const at = (y: number, weight = 1) => {
      flow.flowX = 0.3;
      flow.flowY = 0.2;
      flow.flowZ = 1;
      hit.wallWeight = weight;
      wallWaterFlow(flow, y, hit);
      return { ...flow };
    };
    const normal = (f: { flowY: number; flowZ: number }) => f.flowZ * hit.normalZ + f.flowY * hit.normalY;
    for (const y of [0, 0.25, 0.5, 1]) {
      const f = at(y);
      // The kinematic condition, at every height; along the crest the solver's kept.
      expect(normal(f)).toBeCloseTo(5 * hit.normalZ, 9);
      expect(f.flowX).toBeCloseTo(0.3, 12);
    }
    // Along the ray: the solver's at the anchor's height, B·C at the crest, where the climb is within C.
    expect(at(1).flowZ).toBeCloseTo(WALL_FLOW.before * 5, 9);
    expect(at(0.5).flowZ).toBeCloseTo(1 + 0.5 * (WALL_FLOW.before * 5 - 1), 9);
    // The water climbs the face (up), the more the slower it moves forward.
    expect(at(0.5).flowY).toBeGreaterThan(0);
    expect(at(1).flowY).toBeGreaterThan(0);
    // Low on the face, the climb needed passes C: held to C, the normal condition still met.
    const low = at(0);
    expect(normal(low)).toBeCloseTo(5 * hit.normalZ, 9);
    const climb = -low.flowZ * hit.normalY + low.flowY * hit.normalZ;
    expect(climb).toBeCloseTo(5, 9);
    // A vertical face: the normal condition (forward at its speed), the climb at most C; no blow-up.
    face(90);
    const wall = at(0.5);
    expect(wall.flowZ).toBeCloseTo(5, 9);
    expect(Math.abs(wall.flowY)).toBeLessThanOrEqual(5 + 1e-9);
    // No weight: the solver's flow.
    face(60);
    expect(at(0.5, 0)).toMatchObject({ flowX: 0.3, flowY: 0.2, flowZ: 1 });
  });

  it('smooths the places the shifts put the case\'s crest, so a neighbour\'s row step stays out of a point\'s shift', () => {
    // A straight front along x, its rays along +z; the case's crest stands at z 3 everywhere; the points' crests sit on
    // 1 m rows (z 0 or 1), so each one's own shift is 3 − z.
    const n = 9;
    const sigma = Array.from({ length: n }, (_, k) => k);
    const x = sigma.slice();
    const z = sigma.map((k) => (k % 3 === 0 ? 1 : 0));
    const raw = z.map((v) => 3 - v);
    const ones = sigma.map(() => 1);
    const zeros = sigma.map(() => 0);
    const out = new Float64Array(n);
    smoothPlaces(sigma, x, z, raw, zeros, ones, n, out);
    for (let k = 0; k < n; k += 1) expect(out[k] + z[k]).toBeCloseTo(3, 12);
    // Smoothing the shifts themselves would carry the neighbours' steps.
    const plain = new Float64Array(n);
    smoothShifts(sigma, raw, n, plain);
    expect(Math.max(...Array.from(plain, (v, k) => Math.abs(v + z[k] - 3)))).toBeGreaterThan(0.2);
  });

  it('carries step 7\'s fields in the records, NaN where the simulation keeps none', () => {
    const p: FrontPoint = {
      id: 0, front: 0, column: 0, sigma: 0, x: 0, z: 0, b: Number.NaN, height: 1, joined: 0, depth: 2.5, throwDepth: 2, crestDepth: 2,
      thrown: null, throwZ: null, footHeight: 1, footDepth: 4.4, broke: 0, tau: -1, seen: 0, fresh: null,
    };
    const out = new Float32Array(2 * FRONT_STRIDE);
    writeFrontRecords([p, { ...p, x: 1, sigma: 1, anchorShift: 2.25, wallSpeed: 5.5, tauRate: 1.25 }], out);
    for (const field of ['anchor', 'crestSpeed', 'tauRate'] as const) expect(out[FRONT_FIELD[field]]).toBeNaN();
    expect([out[FRONT_STRIDE + FRONT_FIELD.anchor], out[FRONT_STRIDE + FRONT_FIELD.crestSpeed], out[FRONT_STRIDE + FRONT_FIELD.tauRate]]).toEqual([2.25, 5.5, 1.25]);
  });
});
