import { describe, expect, it } from 'vitest';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { createWaterSample, type WaterSample } from '../../physics/SurfWater';
import { BarrelWater } from '../../scene/barrel/barrelWater';
import { SweptBarrelMesh } from '../../scene/barrel/SweptBarrelMesh';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { tubeFaceOf, type TubeFace } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { createContactHit, SweptContact, type ContactHit } from './sweptContact';
import { LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
import { lipCase } from './toyCase';

/**
 * The Wave Pool Barrel's frame-rate fixes (pool-barrel-perf, 2026-11-06) give the same bits as the paths they replace,
 * each against its `?…=old` switch: the worker's lazy face contact rows (`?contactRows=old`), the plain surface's kept
 * stencil (`?plainHeight=old`) and the face contact's own cached heights, the camera's water test in typed arrays (`?cameraWater=old`) and the mesh's faces-out
 * loop (`?barrelMesh=old`). The drawing's cubic height (`?barrelHeight=old`) is pinned in cubicSurface.test.ts.
 */
const STILL = 0.5;
const H0 = 7;
/** A gently curved front along +x about z = −100 at clock `tau`, `n` points; its anchors left to the crest (NaN). */
function records(n: number, tau: number, bend = 0.01): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100 + bend * (k - n / 2) ** 2; out[o + FRONT_FIELD.front] = 1;
    out[o + FRONT_FIELD.sigma] = k; out[o + FRONT_FIELD.tau] = tau + 0.01 * k; out[o + FRONT_FIELD.footHeight] = 2.1;
    out[o + FRONT_FIELD.footDepth] = H0; out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
    for (const f of [FRONT_FIELD.pace, FRONT_FIELD.anchor, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
  }
  return out;
}
/** Water that rises and falls about still level, so the face ruling's floor (never under it) bites on part of the loft. */
const wavy = (phase: number) => (x: number, z: number) => STILL + 0.6 * Math.sin(0.37 * x + phase) + 0.9 * Math.cos(0.45 * (z + 100) - phase);
const hitKeys = Object.keys(createContactHit()) as (keyof ContactHit)[];

describe('pool-barrel-perf: the worker\'s face contact finds its rows on demand with the same answers', () => {
  const faces: [string, TubeFace][] = [
    ['the default', tubeFaceOf(true, {})!],
    ['the smooth wall (opt-in)', tubeFaceOf(true, { tubeTrack: 'on' })!],
    ['the union alone', tubeFaceOf(true, { tubeAnchor: 'old', tubeForm: 'old', wallFlow: 'old', tubeContact: 'old' })!],
  ];
  for (const [name, face] of faces) {
    it(`answers every query, floor and normal as the full build does: ${name}`, () => {
      const library = new ProfileLibrary([lipCase(0.3, 0.04)]);
      const full = new SweptContact(library, 0.05, { face });
      const lazy = SweptContact.forFaceWorker(library, 0.05, face);
      const a = createContactHit();
      const b = createContactHit();
      let answered = 0;
      let inWater = 0;
      // Three generations (pre-throw, open, late), each over new water: a lazy row is never carried into the next.
      for (const [tau, phase] of [[-0.3, 0], [0.25, 1.3], [0.6, 2.1]] as const) {
        const front = records(25, tau);
        for (const contact of [full, lazy]) contact.update(front, 25, STILL, wavy(phase));
        // Points through the front in a scrambled order, so rows are first prepared by queries in no particular order.
        const points: [number, number, number][] = [];
        for (let x = 1.1; x < 24; x += 1.7) for (let z = -104; z <= -94; z += 0.23) for (let y = STILL - 1.5; y <= STILL + 0.8 * H0; y += 0.41) points.push([x, y, z]);
        for (let k = points.length - 1; k > 0; k -= 1) {
          const j = (k * 7919) % (k + 1);
          [points[k], points[j]] = [points[j], points[k]];
        }
        for (const [x, y, z] of points) {
          const found = full.query(x, y, z, a);
          expect(lazy.query(x, y, z, b)).toBe(found);
          expect(Object.is(lazy.floorAt(x, z), full.floorAt(x, z))).toBe(true);
          if (!found) continue;
          answered += 1;
          if (a.inWater) inWater += 1;
          for (const key of hitKeys) if (!Object.is(a[key], b[key])) expect.fail(`${key} at (${x}, ${y}, ${z}): ${b[key]} against ${a[key]}`);
        }
      }
      expect(answered).toBeGreaterThan(2000);
      expect(inWater).toBeGreaterThan(500);
    });
  }

  it('differs from the full build when its floor is left out (the test can fail)', () => {
    // The lazy rows without the floor's rule (the ordinary contact's) answer differently on the same water.
    const face = tubeFaceOf(true, {})!;
    const library = new ProfileLibrary([lipCase(0.3, 0.04)]);
    const full = new SweptContact(library, 0.05, { face });
    const ordinary = new SweptContact(library, 0.05, { face: { ...face, union: false } });
    const front = records(25, 0.25);
    full.update(front, 25, STILL, wavy(1.3));
    ordinary.update(front, 25, STILL, wavy(1.3));
    const a = createContactHit();
    const b = createContactHit();
    let differ = 0;
    for (let x = 1.1; x < 24; x += 1.7) for (let z = -104; z <= -94; z += 0.23) {
      if (full.query(x, STILL + 0.2, z, a) !== ordinary.query(x, STILL + 0.2, z, b) || !Object.is(a.surfaceY, b.surfaceY)) differ += 1;
    }
    expect(differ).toBeGreaterThan(10);
  });
});

describe('pool-barrel-perf: the plain surface keeps a stencil it may and reads the same bits', () => {
  /** Scrambled water over a stretched grid, its rows uneven. */
  function solver(): ShallowWaterSolver {
    const s = new ShallowWaterSolver({ nx: 41, xMin: -10, dx: 1, zEdges: uniformEdges(-130, -70, 60) }, (x, z) => 3 + 0.04 * (z + 130) + 0.1 * Math.sin(x), { waterLevel: STILL });
    for (let i = 0; i < s.h.length; i += 1) s.h[i] = Math.max(0, s.h[i] + 0.8 * Math.sin(1.7 * i) + 0.3 * Math.cos(0.11 * i));
    return s;
  }
  const keys = Object.keys(createWaterSample()) as (keyof WaterSample)[];
  it('answers plainSurfaceAt and sampleAt as before, inside cache scopes and out, across invalidations and edges', () => {
    const water = solver();
    const fast = new PhysicalSurfWater(water, { peakPeriod: 10, nodeSpacing: 1 });
    const old = new PhysicalSurfWater(water, { peakPeriod: 10, nodeSpacing: 1, plainHeight: 'old' });
    const a = createWaterSample();
    const b = createWaterSample();
    let seed = 11;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    // Runs of nearby points (the loft's vertices along a ray share stencils), jumps, points on nodes, past the edges.
    const points: [number, number][] = [];
    let x = 0;
    let z = -100;
    for (let k = 0; k < 6000; k += 1) {
      if (next() < 0.05) { x = -14 + 58 * next(); z = -134 + 68 * next(); }
      else if (next() < 0.1) { x = Math.round(x); z = Math.round(z); }
      else { x += 0.25 * (next() - 0.3); z += 0.1 * (next() - 0.5); }
      points.push([x, z]);
    }
    const compare = (k: number) => {
      const [px, pz] = points[k];
      expect(Object.is(fast.plainSurfaceAt(px, pz), old.plainSurfaceAt(px, pz))).toBe(true);
      if (k % 3 === 0) {
        fast.sampleAt(px, STILL - 0.3, pz, a);
        old.sampleAt(px, STILL - 0.3, pz, b);
        for (const key of keys) if (!Object.is(a[key], b[key])) expect.fail(`${key} at (${px}, ${pz})`);
      }
    };
    for (let k = 0; k < 2000; k += 1) compare(k);
    fast.withSurfaceNodeCache(() => old.withSurfaceNodeCache(() => {
      for (let k = 2000; k < 4000; k += 1) {
        compare(k);
        // A caller that changes the water inside a scope says so (`invalidateSurfaceNodeCache`): the kept stencil goes too.
        if (k % 500 === 0) {
          for (let i = 0; i < water.h.length; i += 7) water.h[i] += 0.05;
          fast.invalidateSurfaceNodeCache();
          old.invalidateSurfaceNodeCache();
        }
      }
    }));
    for (let k = 4000; k < 6000; k += 1) compare(k);
  });
});

describe('pool-barrel-perf: the face contact\'s own cached heights are the water\'s', () => {
  it('reads plainSurfaceAt\'s bits through its own cache, and the new water once emptied', () => {
    const s = new ShallowWaterSolver({ nx: 41, xMin: -10, dx: 1, zEdges: uniformEdges(-130, -70, 60) }, () => 4, { waterLevel: STILL });
    for (let i = 0; i < s.h.length; i += 1) s.h[i] = Math.max(0, s.h[i] + 0.7 * Math.sin(1.3 * i));
    const water = new PhysicalSurfWater(s, { peakPeriod: 10, nodeSpacing: 1 });
    const cached = water.createCachedPlainSurface();
    for (let round = 0; round < 3; round += 1) {
      cached.invalidate();
      for (let x = -12; x < 33; x += 0.37) for (let z = -132; z < -68; z += 0.53) {
        expect(Object.is(cached.heightAt(x, z), water.plainSurfaceAt(x, z))).toBe(true);
      }
      // The water's next step: the contact empties the cache at its next update.
      for (let i = 0; i < s.h.length; i += 3) s.h[i] += 0.04;
    }
    // Not emptied, it keeps the last generation's heights (the reason it is emptied at each update).
    let stale = 0;
    for (let x = -12; x < 33; x += 0.37) if (!Object.is(cached.heightAt(x, -100.25), water.plainSurfaceAt(x, -100.25))) stale += 1;
    expect(stale).toBeGreaterThan(10);
  });
});

describe('pool-barrel-perf: the drawing\'s camera water and faces-out loop', () => {
  const library = new ProfileLibrary([lipCase(0.3, 0.04)]);
  const lofts = [-0.3, 0.25, 0.6].map((tau, k) => new SweptLoft(library, 0.05, { holdClearDrawing: true, face: tubeFaceOf(true, {})! })
    .build(records(25, tau, 0.02), 25, STILL, wavy(k)));
  it('answers the camera\'s water and air in typed arrays as with objects (`?cameraWater=old`)', () => {
    let answered = 0;
    for (const source of lofts) {
      // A copy (the loft's result is reused) whose triangles' strips interleave, so a strip has many ranges.
      const loft: LoftResult = { ...source, positions: source.positions.slice(), indices: source.indices.slice(0, source.indexCount) };
      for (const shuffled of [false, true]) {
        if (shuffled) {
          const triangles = loft.indexCount / 3;
          const order = Array.from({ length: triangles }, (_, k) => k).sort((p, q) => ((p * 2654435761) % 977) - ((q * 2654435761) % 977) || p - q);
          const from = loft.indices.slice();
          order.forEach((t, k) => { for (let m = 0; m < 3; m += 1) loft.indices[3 * k + m] = from[3 * t + m]; });
        }
        const fast = new BarrelWater();
        const old = new BarrelWater('old');
        fast.prepare(loft, 1);
        old.prepare(loft, 1);
        for (let x = 0; x < 25; x += 0.9) for (let z = -105; z <= -93; z += 0.31) for (let y = STILL - 1; y <= STILL + 5; y += 0.37) {
          for (const margin of [0, 0.1]) {
            const want = old.query(x, y, z, margin);
            expect(fast.query(x, y, z, margin)).toBe(want);
            if (want !== undefined) answered += 1;
          }
        }
      }
    }
    expect(answered).toBeGreaterThan(1000);
  });

  it('turns the same triangles to face out without its per-triangle arrays (`?barrelMesh=old`)', () => {
    for (const loft of lofts) {
      const uniforms = { waterBarrelScreenFallback: { value: 0 }, waterBarrelMaskActive: { value: 0 } };
      const meshes = [new SweptBarrelMesh(uniforms), new SweptBarrelMesh(uniforms)];
      meshes[1].faces = 'old';
      for (const mesh of meshes) mesh.update(loft);
      const [fast, old] = meshes.map((mesh) => mesh.mesh.geometry.getIndex()!.array as Uint32Array);
      expect(loft.indexCount).toBeGreaterThan(6 * (LOFT_SAMPLES - 1));
      expect(Array.from(fast.subarray(0, loft.indexCount))).toEqual(Array.from(old.subarray(0, loft.indexCount)));
      // Some of them turned: the loop does something.
      let turned = 0;
      for (let i = 0; i < loft.indexCount; i += 1) if (fast[i] !== loft.indices[i]) turned += 1;
      expect(turned).toBeGreaterThan(0);
    }
  });
});
