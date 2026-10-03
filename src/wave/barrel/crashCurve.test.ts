import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { CrashCurve, createCrashSlice } from './crashCurve';
import { FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { LANDMARK, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';
import { tubeCase } from './toyCase';

const GRAVITY = 9.81;
const library = () => new ProfileLibrary([tubeCase(0.2), tubeCase(0.4)]);
/** A straight front along +x at z = −100, 1 m apart, thrown at z −100 once τ ≥ 0 (A0 0.3: h0 7 m). */
function front(n: number, tau: (k: number) => number): FrontPoint[] {
  return Array.from({ length: n }, (_, k) => ({
    id: k, front: 1, column: k, sigma: k, x: k + 0.5, z: -100, b: 0, height: 2, joined: 0, depth: 3, throwDepth: 2.5, crestDepth: 2,
    thrown: tau(k) >= 0 ? 0 : null, throwZ: tau(k) >= 0 ? -100 : null, footHeight: 2.1, footDepth: 7, broke: 0, tau: tau(k), fresh: null, seen: 0,
  }));
}
const flat = () => 0;
/** The toy's touchdown, s: 0.5 √(7/g). */
const TOUCHDOWN = 0.5 * Math.sqrt(7 / GRAVITY);

describe('the crash curve (the Padang Padang spec, Part B, PR 5)', () => {
  it('stands its tip and crest where the loft draws them, at the same σ (drawing and crash agree)', () => {
    for (const tau of [0.3 * TOUCHDOWN, TOUCHDOWN, TOUCHDOWN + 0.1]) {
      const points = front(21, () => tau);
      const records = new Float32Array(21 * FRONT_STRIDE);
      writeFrontRecords(points, records);
      const loft = new SweptLoft(library(), 0.05).build(records, 21, 0, flat);
      const crash = new CrashCurve(library(), 0.05).slice(points, 0, 21, 10, 0, flat, createCrashSlice());
      // Slices start 1.5 m before σ 0, every half metre: σ 10 is slice 23.
      const tip = 3 * (23 * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
      expect(crash.tipX).toBeCloseTo(loft.positions[tip], 3);
      expect(crash.tipY).toBeCloseTo(loft.positions[tip + 1], 3);
      expect(crash.tipZ).toBeCloseTo(loft.positions[tip + 2], 3);
      const crest = 3 * (23 * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
      expect(crash.crestY).toBeCloseTo(loft.positions[crest + 1], 3);
      expect(crash.crestZ).toBeCloseTo(loft.positions[crest + 2], 3);
      expect(crash.fade).toBeCloseTo(loft.sliceFade[23], 6);
    }
  });

  it('lands where the loft draws its lip on a front at an angle, its anchor on the crest point from the throw, with or without a throw point (the advisor, 2026-10-03)', () => {
    // A front at 36.9° to the columns (its ray (−0.6, 0.8)), its crest crossing its throw depth 1 m behind each point, or
    // with no throw point recorded.
    const slanted = (tau: number, anchored: boolean): FrontPoint[] => Array.from({ length: 21 }, (_, k) => ({
      id: k, front: 1, column: k, sigma: 1.25 * k, x: k + 0.5, z: -100 + 0.75 * (k - 10), b: 0, height: 2, joined: 0, depth: 3, throwDepth: 2.5,
      crestDepth: 2, thrown: anchored ? 0 : null, throwZ: anchored ? -101 + 0.75 * (k - 10) : null, footHeight: 2.1, footDepth: 7, broke: 0, tau,
      fresh: null, seen: 0,
    }));
    for (const tau of [0, 0.2 * TOUCHDOWN, 0.4 * TOUCHDOWN, 0.7 * TOUCHDOWN, TOUCHDOWN, TOUCHDOWN + 0.1]) {
      for (const anchored of [true, false]) {
        const points = slanted(tau, anchored);
        const records = new Float32Array(21 * FRONT_STRIDE);
        writeFrontRecords(points, records);
        const loft = new SweptLoft(library(), 0.05).build(records, 21, 0, flat);
        const crash = new CrashCurve(library(), 0.05).slice(points, 0, 21, 10, 0, flat, createCrashSlice());
        // σ 12.5 is slice 28 (from −1.5 m every half metre). The tube's crest is its profile's origin: its vertex is the anchor.
        const vertex = (landmark: number) => 3 * (28 * LOFT_SAMPLES + LOFT.extensionSamples + landmark);
        const crest = vertex(LANDMARK.crest);
        const tip = vertex(LANDMARK.lip);
        expect(crash.anchorX).toBeCloseTo(loft.positions[crest], 3);
        expect(crash.anchorZ).toBeCloseTo(loft.positions[crest + 2], 3);
        for (const [mine, theirs] of [[crash.tipX, tip], [crash.tipY, tip + 1], [crash.tipZ, tip + 2], [crash.crestX, crest], [crash.crestY, crest + 1], [crash.crestZ, crest + 2]]) {
          expect(mine).toBeCloseTo(loft.positions[theirs], 3);
        }
        // On the crest point, the point itself here (c = 0): nothing along the ray or across it.
        expect(-0.6 * (crash.anchorX - 10.5) + 0.8 * (crash.anchorZ + 100)).toBeCloseTo(0, 9);
        expect(0.8 * (crash.anchorX - 10.5) + 0.6 * (crash.anchorZ + 100)).toBeCloseTo(0, 9);
        // From touchdown the lip lands on the flat under the drawn tip.
        if (tau >= TOUCHDOWN) {
          expect(crash.landX).toBeCloseTo(loft.positions[tip], 3);
          expect(crash.landZ).toBeCloseTo(loft.positions[tip + 2], 3);
        }
      }
    }
    // Read at another z (the foresight's paced z), as if the point stood there.
    const curve = new CrashCurve(library(), 0.05);
    const there = slanted(TOUCHDOWN, true);
    there[10].z = -98;
    const moved = curve.slice(there, 0, 21, 10, 0, flat, createCrashSlice());
    const foreseen = curve.slice(slanted(TOUCHDOWN, true), 0, 21, 10, 0, flat, createCrashSlice(), { z: -98 });
    for (const key of ['anchorX', 'anchorZ', 'tipX', 'tipZ', 'landX', 'landZ'] as const) expect(foreseen[key]).toBeCloseTo(moved[key], 9);
  });

  it('reads the ray the slice is drawn on, from its front’s tangent over ±2 m', () => {
    const points: FrontPoint[] = Array.from({ length: 21 }, (_, k) => ({
      id: k, front: 1, column: k, sigma: 1.25 * k, x: k + 0.5, z: -100 + 0.75 * (k - 10), b: 0, height: 2, joined: 0, depth: 3, throwDepth: 2.5,
      crestDepth: 2, thrown: null, throwZ: null, footHeight: 2.1, footDepth: 7, broke: 0, tau: 0.1, fresh: null, seen: 0,
    }));
    const curve = new CrashCurve(library(), 0.05);
    const ray = curve.ray(points, 0, 21, 10, { x: 0, z: 0 });
    const slice = curve.slice(points, 0, 21, 10, 0, flat, createCrashSlice());
    expect(ray.x).toBeCloseTo(-0.6, 12);
    expect(ray.z).toBeCloseTo(0.8, 12);
    expect(ray.x).toBe(slice.rayX);
    expect(ray.z).toBe(slice.rayZ);
  });

  it('lands the lip on the face’s point nearest its tip (metrics.py’s closing of the void)', () => {
    const crash = new CrashCurve(library(), 0.05).slice(front(21, () => TOUCHDOWN), 0, 21, 10, 0, flat, createCrashSlice());
    // In h0 the tip is (1.2, 0.5): the face from the throat (0.6, 0.6) to the toe (0.8, 0) lies 0.54 from it, the flat
    // beyond 0.5 straight below it, so it lands on the flat under its tip.
    expect(crash.landY).toBeCloseTo(0, 6);
    expect(crash.landX).toBeCloseTo(crash.tipX, 6);
    expect(crash.landZ).toBeCloseTo(crash.tipZ, 4);
  });

  it('scales the held overturn by the slice’s h0, and takes PR 4’s collapse for its void’s height', () => {
    const lib = library();
    const slice = new CrashCurve(lib, 0.05).slice(front(21, () => 0), 0, 21, 10, 0, flat, createCrashSlice());
    const times = lib.profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 });
    expect(slice.scale).toBe(7);
    expect(slice.collapse).toBe(times.collapseSeconds);
    expect(slice.voidHeight).toBeCloseTo((GRAVITY * times.collapseSeconds * times.collapseSeconds) / 2, 12);
    // The toy's held frame is its last tube frame: its jet 0.015 h0², its void 0.27 h0² (its frames are 32-bit).
    expect(slice.jetArea).toBeCloseTo(0.015 * 49, 4);
    expect(slice.voidArea).toBeCloseTo(0.27 * 49, 4);
    expect(slice.voidLength).toBeCloseTo(Math.sqrt(0.72) * 7, 4);
    expect(slice.width).toBe(1);
    expect(slice.endWeight).toBe(1);
    expect(slice.rayX).toBeCloseTo(0, 12);
    expect(slice.rayZ).toBeCloseTo(1, 12);
  });

  it('gives an end point half a gap and no weight, as the loft blends a front’s ends into the water', () => {
    const curve = new CrashCurve(library(), 0.05);
    const end = curve.slice(front(21, () => 0), 0, 21, 0, 0, flat, createCrashSlice());
    expect(end.width).toBe(0.5);
    expect(end.endWeight).toBe(0);
    expect(curve.slice(front(21, () => 0), 0, 21, 1, 0, flat, createCrashSlice()).endWeight).toBeCloseTo(0.4 * 0.4 * (3 - 0.8), 12);
  });

  it('reaches over the lifted band of the drawn profile, for the whitewater gate', () => {
    const slice = new CrashCurve(library(), 0.05).slice(front(21, () => TOUCHDOWN), 0, 21, 10, 0, flat, createCrashSlice());
    // Samples 6 … 121 of the tube: from the back's (−2 + 2 × 6/32) h0 to the flat's (0.8 + 1.2 × 9/15) h0.
    expect(slice.reachBack).toBeCloseTo((-2 + (2 * 6) / 32) * 7, 4);
    expect(slice.reachFront).toBeCloseTo((0.8 + (1.2 * 9) / 15) * 7, 4);
  });

  it('reads the held frame’s tip velocity, and the drawn crest standing still', () => {
    const motion = new CrashCurve(library(), 0.05).jetMotion(front(1, () => 0)[0], { tipAlong: 0, tipUp: 0, crestSpeed: 0 });
    expect(motion.tipAlong).toBeCloseTo(0.9 * Math.sqrt(GRAVITY * 7), 5);
    expect(motion.tipUp).toBeCloseTo(-0.3 * Math.sqrt(GRAVITY * 7), 5);
    expect(motion.crestSpeed).toBeCloseTo(0, 9);
  });

  it('uses only + − × ÷, √ and floor (online determinism)', () => {
    expect(readFileSync('src/wave/barrel/crashCurve.ts', 'utf8')).not.toMatch(/Math\.(sin|cos|tan|exp|log|pow|hypot|atan|cbrt)/);
  });
});
