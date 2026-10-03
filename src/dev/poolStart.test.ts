import { describe, expect, it } from 'vitest';
import { POOL } from '../wave/pool';
import { SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import { isDue, placementFor, POOL_STARTS } from './poolStart';

const DEG = Math.PI / 180;

describe('the recorder\'s placed start on the pool', () => {
  it('is due for one step, a whole number of periods after the first break, and never on that first wave', () => {
    const first = 20.2;
    const due: number[] = [];
    for (let step = 0; step < 60 * 45; step += 1) {
      const since = step * SURF_ZONE_STEP;
      if (isDue(first + since, first)) due.push(since);
    }
    // 10, 20, 30 and 40 s after: the first wave is the start-up's own, the later ones the steady machine's.
    expect(due).toHaveLength(4);
    due.forEach((since, i) => expect(Math.abs(since - POOL.period * (i + 1))).toBeLessThan(SURF_ZONE_STEP / 2 + 1e-9));
  });

  it('puts the rider ahead of the crest down the face, heading toward the open face of its arm', () => {
    const travel = -20 * DEG;
    const right = placementFor('trough', { x: 35, z: -174 }, travel, 1);
    expect(right.x).toBeCloseTo(35 + POOL_STARTS.trough.ahead * Math.sin(travel), 6);
    expect(right.z).toBeCloseTo(-174 + POOL_STARTS.trough.ahead * Math.cos(travel), 6);
    expect(right.heading).toBeCloseTo(travel + POOL_STARTS.trough.angle * DEG, 6);
    expect(right.speed).toBe(7);
    expect(right.phase).toBe('standing');
    expect(right.followSurface).toBeUndefined();
    // The left arm turns the other way from the wave's travel.
    const left = placementFor('trough', { x: -35, z: -174 }, -travel, -1);
    expect(left.heading).toBeCloseTo(-travel - POOL_STARTS.trough.angle * DEG, 6);
    expect(left.x).toBeCloseTo(-right.x, 6);
  });

  it('puts a start on the face closer to the crest, moving along the surface, and across the face more', () => {
    const face = placementFor('face', { x: 35, z: -174 }, 0, 1);
    const trough = placementFor('trough', { x: 35, z: -174 }, 0, 1);
    expect(face.z - -174).toBeLessThan(trough.z - -174);
    expect(face.followSurface).toBe(true);
    expect(face.heading).toBeGreaterThan(trough.heading);
    expect(face.speed).toBeLessThan(trough.speed);
  });
});
