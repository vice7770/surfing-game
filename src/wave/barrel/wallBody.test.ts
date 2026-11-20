import { describe, expect, it } from 'vitest';
import { streamWallFlow } from '../../physics/PhysicalSurfWater';
import { tubeFaceOf } from './faceAnchor';
import { TUBE_SEAM } from './tubeSeam';

/**
 * Ruling 6's streamline wall water (the water-physics advisor's advisor-ruling-6.md §4, docs/research/wall-body-2026-11-11;
 * `TubeFace.stream`, `?wallBody=stream`): in the wave's frame the surface is a streamline, its speed from the height
 * under the crest, q² = ((1 − B) c)² + 2 g · drop; along the ray c − q n_y, up q n_a.
 */
const C = 5;
const G = 9.81;
/** A wall whose ray is +z (tangent +x), its surface's normal (`na` along the ray, `ny` up), its crest at 2 m. */
const wall = (na: number, ny: number, b = 0.85, weight = 1) => ({
  normalX: 0, normalY: ny, normalZ: na, tangentX: 1, tangentZ: 0, wallTop: 2, wallSpeed: C, wallB: b, wallWeight: weight,
});
const sea = () => ({ flowX: 0.3, flowY: 0.1, flowZ: 0.4 });

describe('ruling 6: the streamline wall water', () => {
  it('moves the crest water at B of the wave\'s speed before the throw and with the wave after it', () => {
    const before = sea();
    streamWallFlow(before, 2, wall(0, 1, 0.85));
    expect(before.flowZ).toBeCloseTo(0.85 * C, 9);
    expect(before.flowY).toBeCloseTo(0, 9);
    const after = sea();
    streamWallFlow(after, 2, wall(0, 1, 1));
    expect(after.flowZ).toBeCloseTo(C, 9);
    expect(after.flowY).toBeCloseTo(0, 9);
  });

  it('draws water up a 45° face, half a metre under the crest, at the speed its drop gives', () => {
    const flow = sea();
    const s = Math.SQRT1_2;
    streamWallFlow(flow, 1.5, wall(s, s));
    const q = Math.sqrt((0.15 * C) ** 2 + 2 * G * 0.5);
    expect(flow.flowZ).toBeCloseTo(C - q * s, 9);
    expect(flow.flowY).toBeCloseTo(q * s, 9);
    // The advisor's figures: about 2.8 m/s forward and 2.2 m/s up.
    expect(flow.flowZ).toBeGreaterThan(2.6);
    expect(flow.flowZ).toBeLessThan(2.9);
    expect(flow.flowY).toBeGreaterThan(2.1);
    expect(flow.flowY).toBeLessThan(2.4);
  });

  it('gives the trough\'s back-flow at a flat foot 1.5 m under the crest', () => {
    const flow = sea();
    streamWallFlow(flow, 0.5, wall(0, 1));
    expect(flow.flowZ).toBeCloseTo(C - Math.sqrt((0.15 * C) ** 2 + 2 * G * 1.5), 9);
    expect(flow.flowZ).toBeLessThan(0);
    expect(flow.flowZ).toBeGreaterThan(-0.6);
    expect(flow.flowY).toBeCloseTo(0, 9);
  });

  it('sends water under a roof forward faster than the wave, and down', () => {
    const flow = sea();
    streamWallFlow(flow, 1.7, wall(-0.6, -0.8));
    const q = Math.sqrt((0.15 * C) ** 2 + 2 * G * 0.3);
    expect(flow.flowZ).toBeCloseTo(C + 0.8 * q, 9);
    expect(flow.flowZ).toBeGreaterThan(C);
    expect(flow.flowY).toBeCloseTo(-0.6 * q, 9);
  });

  it('keeps the sea\'s flow along the crest, and all of it where the weight or the seam\'s share is 0', () => {
    const face = sea();
    streamWallFlow(face, 1.5, wall(Math.SQRT1_2, Math.SQRT1_2));
    expect(face.flowX).toBe(0.3);
    for (const [weight, share] of [[0, 1], [1, 0], [Number.NaN, 1]] as const) {
      const flow = sea();
      streamWallFlow(flow, 1.5, wall(Math.SQRT1_2, Math.SQRT1_2, 0.85, weight), share);
      expect(flow, `${weight} ${share}`).toEqual(sea());
    }
  });

  it('weighs the change by the slices\' weight times the seam\'s share', () => {
    const whole = sea();
    streamWallFlow(whole, 1.5, wall(Math.SQRT1_2, Math.SQRT1_2));
    const part = sea();
    streamWallFlow(part, 1.5, wall(Math.SQRT1_2, Math.SQRT1_2, 0.85, 0.5), 0.5);
    expect(part.flowZ).toBeCloseTo(0.4 + 0.25 * (whole.flowZ - 0.4), 9);
    expect(part.flowY).toBeCloseTo(0.1 + 0.25 * (whole.flowY - 0.1), 9);
  });

  it('never reads a speed above the crest: a sample over the crest height takes the crest\'s', () => {
    const flow = sea();
    streamWallFlow(flow, 2.3, wall(0, 1));
    expect(flow.flowZ).toBeCloseTo(0.85 * C, 9);
  });
});

describe('ruling 6: the streamline wall water\'s switch', () => {
  it('is opt-in, and only with the seam blend it weighs by', () => {
    const all = tubeFaceOf(true, {})!;
    expect('stream' in all).toBe(false);
    expect(tubeFaceOf(true, { wallBody: 'stream' })).toEqual(all);
    const seam = { tau: TUBE_SEAM.tau, band: TUBE_SEAM.band };
    expect(tubeFaceOf(true, { tubeSeam: 'blend' })).toEqual({ ...all, seam });
    expect(tubeFaceOf(true, { tubeSeam: 'blend', wallBody: 'stream' })).toEqual({ ...all, seam, stream: true, follow: true });
    expect(tubeFaceOf(true, { tubeSeam: 'blend', wallBody: 'stream', tubeInertia: 'path' })).toEqual({ ...all, seam, stream: true });
    expect(tubeFaceOf(true, { tubeSeam: 'blend', wallBody: 'stream', formClock: 'c1' })).toMatchObject({ formClock: true, stream: true });
    for (const off of [{ wallFlow: 'old' }, { tubeFrom: 'piece' }, { tubeFace: 'old' }] as const) expect('stream' in tubeFaceOf(true, { tubeSeam: 'blend', wallBody: 'stream', ...off })!).toBe(false);
  });
});
