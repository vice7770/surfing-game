import { describe, expect, it, vi } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { readBarrelCases } from '../../wave/barrel/nodeBarrelCases';
import { decodeCase } from '../../wave/barrel/profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { createContactHit, SweptContact } from '../../wave/barrel/sweptContact';
import { LOFT_SAMPLES, SweptLoft, type LoftResult } from '../../wave/barrel/sweptLoft';
import { BarrelWater } from './barrelWater';

const slope = 1 / 19;
const still = 0.5;
const library = new ProfileLibrary(readBarrelCases('padang').map(decodeCase));
const times = library.profileTimes({ slope, footHeight: Math.fround(2.1), footDepth: 7 });
const seconds = times.clearSeconds;
const records = new Float32Array(21 * FRONT_STRIDE);
for (let k = 0; k < 21; k += 1) {
  const o = k * FRONT_STRIDE;
  records[o + FRONT_FIELD.x] = k; records[o + FRONT_FIELD.z] = -100;
  records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
  records[o + FRONT_FIELD.tau] = seconds; records[o + FRONT_FIELD.footHeight] = 2.1;
  records[o + FRONT_FIELD.footDepth] = 7; records[o + FRONT_FIELD.throwZ] = -100; records[o + FRONT_FIELD.pace] = 4;
}
const drawn = new SweptLoft(library, slope, { holdClearDrawing: true }).build(records, 21, still, () => still);

/** Tiny indexed layer fixture, retaining the real loft's metadata shape. Each strip has one or three level quads. */
function layers(fronts: { id: number; xs: number[]; heights: number[] }[]): LoftResult {
  const count = fronts.reduce((sum, front) => sum + front.xs.length, 0);
  const positions = new Float32Array(3 * count * LOFT_SAMPLES);
  const joined = new Uint8Array(count);
  const ids = new Int32Array(count);
  const indices: number[] = [];
  let row = 0;
  for (const front of fronts) {
    front.xs.forEach((x, k) => {
      ids[row + k] = front.id;
      front.heights.forEach((height, layer) => {
        for (let side = 0; side < 2; side += 1) {
          const v = (row + k) * LOFT_SAMPLES + 2 * layer + side;
          positions[3 * v] = x; positions[3 * v + 1] = height; positions[3 * v + 2] = side;
        }
      });
      if (k + 1 < front.xs.length) {
        joined[row + k] = 1;
        front.heights.forEach((_, layer) => {
          const a = (row + k) * LOFT_SAMPLES + 2 * layer, b = a + LOFT_SAMPLES;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        });
      }
    });
    row += front.xs.length;
  }
  return { ...drawn, positions, indices: new Uint32Array(indices), sliceJoined: joined, sliceFront: ids,
    sliceCount: count, vertexCount: count * LOFT_SAMPLES, indexCount: indices.length };
}

describe('water/air in the drawn barrel', () => {
  it('matches independent shipped Padang contact parity in the floor, cavity, roof and above, and leaves outside queries to raw water', () => {
    const contact = new SweptContact(library, slope);
    contact.update(records, 21, still, () => still);
    const water = new BarrelWater();
    water.prepare(drawn, 1);
    const profile = new Float32Array(2 * PROFILE_POINTS);
    library.profileAt({ slope, footHeight: records[FRONT_FIELD.footHeight], footDepth: 7, seconds: records[FRONT_FIELD.tau], hold: 'contact' }, profile);
    const x = 10.25;
    const z = -100 - profile[2 * LANDMARK.crest] + (profile[2 * LANDMARK.lip] + profile[2 * LANDMARK.throat]) / 2;
    const hit = createContactHit();
    expect(contact.query(x, 100, z, hit)).toBe(true);
    const floor = hit.floorY;
    expect(contact.query(x, floor + 0.01, z, hit)).toBe(true);
    const under = hit.ceilingY, top = hit.ceilingTopY;
    expect(Number.isFinite(under) && Number.isFinite(top)).toBe(true);
    expect(under).toBeGreaterThan(floor);
    expect(top).toBeGreaterThan(under);
    for (const [y, expected] of [
      [floor - 0.2, true], [(floor + under) / 2, false], [(under + top) / 2, true], [top + 0.2, false],
    ] as const) {
      expect(contact.query(x, y, z, hit)).toBe(true);
      expect(hit.inWater).toBe(expected);
      expect(water.query(x, y, z)).toBe(hit.inWater);
    }
    // A margin tests depth below a water layer's top; it must not move air upward into the roof.
    const margin = (top - under) / 4;
    expect(water.query(x, under - margin / 2, z, margin)).toBe(false);
    expect(water.query(x, top - margin / 2, z, margin)).toBe(false);
    expect(water.query(x, (under + top) / 2, z, margin)).toBe(true);
    expect(water.query(500, 0, z)).toBeUndefined();
  });

  it('counts shared quad diagonals and adjacent strip edges once, including exact material boundaries', () => {
    const water = new BarrelWater();
    water.prepare(layers([{ id: 1, xs: [0, 1, 2], heights: [0, 2, 3] }]), 1);
    for (const x of [0.5, 1, 1.5]) {
      expect(water.query(x, -1, 0.5)).toBe(true);
      expect(water.query(x, 1, 0.5)).toBe(false);
      expect(water.query(x, 2, 0.5)).toBe(true);
      expect(water.query(x, 2.5, 0.5)).toBe(true);
      expect(water.query(x, 3, 0.5)).toBe(false);
    }
    expect(water.query(0.5, -0.05, 0.5, 0.1)).toBe(false);
    expect(water.query(0.5, -0.2, 0.5, 0.1)).toBe(true);
    expect(water.query(0.5, 1.95, 0.5, 0.1)).toBe(false);
  });

  it('uses the first covering front instead of cancelling overlapping fronts, regardless of numeric front ID', () => {
    const water = new BarrelWater();
    water.prepare(layers([{ id: 21, xs: [0, 1], heights: [0] }, { id: 7, xs: [0, 1], heights: [4] }]), 1);
    expect(water.query(0.5, -1, 0.5)).toBe(true);
    expect(water.query(0.5, 2, 0.5)).toBe(false);
    water.prepare(layers([{ id: 7, xs: [0, 1], heights: [4] }, { id: 21, xs: [0, 1], heights: [0] }]), 2);
    expect(water.query(0.5, 2, 0.5)).toBe(true);
  });

  it('returns undefined for missing-floor columns and uses only the actual active joined triangle prefix', () => {
    const water = new BarrelWater();
    const unclosed = layers([{ id: 1, xs: [0, 1], heights: [2, 3] }]);
    water.prepare(unclosed, 1);
    for (const y of [0, 2.5, 4]) expect(water.query(0.5, y, 0.5)).toBeUndefined();
    const clipped = layers([{ id: 1, xs: [0, 1], heights: [0, 2, 3] }]);
    clipped.indexCount = 6;
    water.prepare(clipped, 2);
    expect(water.query(0.5, 2.5, 0.5)).toBe(false);
    clipped.sliceJoined[0] = 0;
    water.prepare(clipped, 3);
    expect(water.query(0.5, -1, 0.5)).toBeUndefined();
  });

  it('caches only the latest camera position/margin and invalidates on a new stamp of the reused loft or retirement', () => {
    const water = new BarrelWater();
    const loft = layers([{ id: 1, xs: [0, 1], heights: [0] }]);
    const classify = vi.spyOn(water as unknown as { classify(x: number, y: number, z: number, margin: number): boolean | undefined }, 'classify');
    water.prepare(loft, 1);
    expect(water.query(0.5, -0.05, 0.5, 0)).toBe(true);
    water.prepare(loft, 1);
    expect(water.query(0.5, -0.05, 0.5, 0)).toBe(true);
    expect(classify).toHaveBeenCalledTimes(1);
    expect(water.query(0.5, -0.05, 0.5, 0.1)).toBe(false);
    expect(classify).toHaveBeenCalledTimes(2);
    for (let v = 0; v < loft.vertexCount; v += 1) loft.positions[3 * v + 1] -= 1;
    water.prepare(loft, 2);
    expect(water.query(0.5, -0.05, 0.5, 0)).toBe(false);
    expect(classify).toHaveBeenCalledTimes(3);
    water.prepare(undefined, 3);
    expect(water.query(0.5, -0.05, 0.5, 0)).toBeUndefined();
    water.prepare(loft, 4);
    expect(water.query(0.5, -2, 0.5)).toBe(true);
    water.prepare({ ...loft, indexCount: 0, vertexCount: 0, sliceCount: 0 }, 5);
    expect(water.query(0.5, -2, 0.5)).toBeUndefined();
  });
});
