import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../wave/barrel/frontRecords';
import { ProfileLibrary } from '../wave/barrel/ProfileLibrary';
import { createContactHit, SweptContact } from '../wave/barrel/sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft } from '../wave/barrel/sweptLoft';
import { tubeCase } from '../wave/barrel/toyCase';
import { drawnLoftBounds, pointInDrawnWater, type DrawnLoft } from './drawnWater';

/**
 * A square of water surface over x 0–10, z 0–10 at height y, in the loft's winding: positive xz area is a surface with
 * air above it (the face, a lip's top), reversed is one with water above it (a lip's underside).
 */
function sheet(y: number, airAbove: boolean, first = 0): { positions: number[]; indices: number[] } {
  const positions = [0, y, 0, 10, y, 0, 0, y, 10, 10, y, 10];
  const up = [0, 1, 2, 1, 3, 2];
  const down = [0, 2, 1, 1, 2, 3];
  return { positions, indices: (airAbove ? up : down).map((v) => v + first) };
}

/**
 * Stacked sheets, bottom to top, as one loft's triangles: each in the strip given (its vertices in that strip's slice,
 * as the loft lays them out, `LOFT_SAMPLES` a slice), strip 0 by default.
 */
function stack(layers: readonly (readonly [number, boolean, number?])[]): DrawnLoft {
  const used = new Map<number, number>();
  const placed = layers.map(([y, airAbove, strip = 0]) => {
    const first = strip * LOFT_SAMPLES + (used.get(strip) ?? 0);
    used.set(strip, (used.get(strip) ?? 0) + 4);
    return sheet(y, airAbove, first);
  });
  const vertexCount = Math.max(...placed.map((one) => Math.max(...one.indices) + 1));
  const positions = new Float32Array(3 * vertexCount);
  const indices: number[] = [];
  for (const one of placed) {
    one.positions.forEach((value, k) => { positions[3 * one.indices.reduce((m, v) => Math.min(m, v)) + k] = value; });
    indices.push(...one.indices);
  }
  return { positions, indices: new Uint32Array(indices), indexCount: indices.length, vertexCount };
}

describe('the water as drawn at a point', () => {
  it('reads a lone sheet as the water: under it in water, over it in air', () => {
    const loft = stack([[1, true]]);
    expect(pointInDrawnWater(loft, 5, 0, 5)).toBe(true);
    expect(pointInDrawnWater(loft, 5, 2, 5)).toBe(false);
  });

  it('reads a tube as the critics’ camera sees it: air in the cavity, water in the lip and under the face', () => {
    // The face at 0, the lip's underside at 2 and its top at 3, over one column.
    const loft = stack([[0, true], [2, false], [3, true]]);
    expect(pointInDrawnWater(loft, 5, -1, 5)).toBe(true);
    expect(pointInDrawnWater(loft, 5, 1, 5)).toBe(false);
    expect(pointInDrawnWater(loft, 5, 2.5, 5)).toBe(true);
    expect(pointInDrawnWater(loft, 5, 4, 5)).toBe(false);
  });

  it('is undefined where the loft does not lie over the point, whatever the height', () => {
    const loft = stack([[0, true], [2, false], [3, true]]);
    expect(pointInDrawnWater(loft, 11, 1, 5)).toBeUndefined();
    expect(pointInDrawnWater(loft, 5, 1, -0.5)).toBeUndefined();
    expect(pointInDrawnWater(loft, 5, -50, 5)).toBe(true);
    expect(pointInDrawnWater({ positions: new Float32Array(0), indices: new Uint32Array(0), indexCount: 0, vertexCount: 0 }, 5, 1, 5)).toBeUndefined();
  });

  it('counts a point in water only when it is more than the margin under the surface above it, as height − margin did', () => {
    const loft = stack([[1, true]]);
    expect(pointInDrawnWater(loft, 5, 0.85, 5, 0.1)).toBe(true);
    expect(pointInDrawnWater(loft, 5, 0.95, 5, 0.1)).toBe(false);
    expect(pointInDrawnWater(loft, 5, 0.95, 5)).toBe(true);
    // The lip's sheet: under its top by less than the margin is not under the water.
    const lip = stack([[0, true], [2, false], [3, true]]);
    expect(pointInDrawnWater(lip, 5, 2.5, 5, 0.1)).toBe(true);
    expect(pointInDrawnWater(lip, 5, 2.95, 5, 0.1)).toBe(false);
  });

  it('counts a point on an edge two triangles share once, so the answer does not flicker on a seam', () => {
    // Each sheet's two triangles share the diagonal (10, y, 0) → (0, y, 10); (5, ·, 5) lies on all of them. Counted twice,
    // the top (air above) would turn the cavity into water, and the lip's underside would hide it.
    const loft = stack([[0, true], [2, false], [3, true]]);
    expect(pointInDrawnWater(loft, 5, 1, 5)).toBe(false);
    expect(pointInDrawnWater(loft, 5, 2.5, 5)).toBe(true);
    expect(pointInDrawnWater(loft, 5, -1, 5)).toBe(true);
    expect(pointInDrawnWater(loft, 5, 4, 5)).toBe(false);
    // And on a seam of the quad's outer edges, a point is covered by the sheet or by none, never by half of it.
    for (const [x, z] of [[0, 0], [10, 0], [0, 10], [10, 10], [5, 0], [0, 5], [10, 5], [5, 10]]) {
      const answers = [-1, 1, 2.5, 4].map((y) => pointInDrawnWater(loft, x, y, z));
      expect(answers.every((answer) => answer === undefined) || answers.every((answer) => answer !== undefined)).toBe(true);
    }
  });

  it('keeps two fronts\' sheets lying on one another as water: the first front\'s strip answers, as the rider\'s contact', () => {
    // Two fronts' extensions both rest on the water: two coincident surfaces with air above, which a parity over both
    // would cancel. The contact takes the first front's strip alone (`SweptContact.strip`).
    const loft = stack([[1, true, 0], [1, true, 3]]);
    expect(pointInDrawnWater(loft, 5, 0, 5)).toBe(true);
    expect(pointInDrawnWater(loft, 5, 2, 5)).toBe(false);
  });

  it('takes the first strip alone where strips overlap in plan (a crest curving), as the contact does', () => {
    // Strip 0's tube, and strip 5's face over the same ground above its cavity: the rider in strip 0's cavity is in air,
    // though a sum over both strips (−1 for the underside, +1 for each top) would put him in water.
    const loft = stack([[0, true, 0], [2, false, 0], [3, true, 0], [2.5, true, 5]]);
    expect(pointInDrawnWater(loft, 5, 1, 5)).toBe(false);
    expect(pointInDrawnWater(loft, 5, 2.2, 5)).toBe(true);
    expect(pointInDrawnWater(loft, 5, -1, 5)).toBe(true);
    // The order of the triangles in the list does not matter: the lowest strip wins wherever it comes.
    const reversed = { ...loft, indices: Uint32Array.from([...loft.indices.subarray(18, 24), ...loft.indices.subarray(0, 18)]) };
    expect(pointInDrawnWater(reversed, 5, 1, 5)).toBe(false);
  });

  it('leaves the answer to the water where the strip is open under the point (a fold at its edge), as the contact does', () => {
    // A lip with no face under it at this column: both its crossings are above the point.
    const loft = stack([[2, false], [3, true]]);
    expect(pointInDrawnWater(loft, 5, 1, 5)).toBeUndefined();
    expect(pointInDrawnWater(loft, 5, 2.5, 5)).toBe(true);
    expect(pointInDrawnWater(loft, 5, 4, 5)).toBe(false);
  });

  it('keeps the water through a fold of the profile, which adds a surface facing each way', () => {
    // The lip's tip folds the profile over itself: an up-facing and a down-facing triangle at one height.
    const loft = stack([[0, true], [3, true], [3, false]]);
    expect(pointInDrawnWater(loft, 5, 1, 5)).toBe(false);
    expect(pointInDrawnWater(loft, 5, -1, 5)).toBe(true);
  });
});

describe('the box a drawn loft spans', () => {
  it('is its vertices\' footprint and top, from the vertices its triangles use only', () => {
    const loft = stack([[0, true], [2, false], [3, true]]);
    expect(drawnLoftBounds(loft)).toEqual({ xMin: 0, xMax: 10, zMin: 0, zMax: 10, top: 3 });
    // A buffer longer than the loft (the loft's own are allocated for its budget): the stale vertices past the count are not read.
    const padded = { ...loft, positions: new Float32Array([...loft.positions, 50, 80, -40]) };
    expect(drawnLoftBounds(padded)).toEqual({ xMin: 0, xMax: 10, zMin: 0, zMax: 10, top: 3 });
    // No vertices: an inverted box, outside which every point lies.
    const empty = drawnLoftBounds({ positions: new Float32Array(0), indices: new Uint32Array(0), indexCount: 0, vertexCount: 0 });
    expect(empty.xMin).toBe(Infinity);
    expect(empty.top).toBe(-Infinity);
  });

  it('leaves out only answers the scan would give: none covered outside the footprint, none in water over the top', () => {
    const loft = stack([[0, true], [2, false], [3, true]]);
    const box = drawnLoftBounds(loft);
    for (const [x, y, z] of [[11, 1, 5], [-0.5, 1, 5], [5, 1, 10.5], [5, -9, -1]]) {
      expect(x < box.xMin || x > box.xMax || z < box.zMin || z > box.zMax).toBe(true);
      expect(pointInDrawnWater(loft, x, y, z)).toBeUndefined();
    }
    for (const y of [3, 3.5, 40]) {
      expect(y >= box.top).toBe(true);
      expect(pointInDrawnWater(loft, 5, y, 5, 0.1)).not.toBe(true);
    }
  });
});

// A swept barrel's real loft: the toy tube of the contact's tests, a straight front along +x at z = −100, thrown there.
const STILL = 0.5;
const flat = () => STILL;
const H0 = 7;
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
// The toy at x = 1 h0 (along 7 m, z = −93): the flat, the underside and the top (the contact's tests).
const UNDER = STILL + (0.7 - 1 / 6) * H0;
const TOP = STILL + 0.55 * H0;

describe('the water as drawn by the swept barrel’s own loft', () => {
  const drawn = () => new SweptLoft(library(), 0.05).build(records(21, 0.1), 21, STILL, flat);

  it('reads the tube’s cavity as air where the solver’s height would put the camera under water', () => {
    const loft = drawn();
    // Under a swept lip the solver's height is the hump the tube is cut from: as high as the lip's top, or higher.
    const hump = TOP + 0.5;
    const cavity = 2.5;
    expect(cavity < hump - 0.1).toBe(true);
    expect(pointInDrawnWater(loft, 10.3, cavity, -93, 0.1)).toBe(false);
    expect(pointInDrawnWater(loft, 10.3, 0, -93, 0.1)).toBe(true);
    expect(pointInDrawnWater(loft, 10.3, (UNDER + TOP) / 2, -93)).toBe(true);
    expect(pointInDrawnWater(loft, 10.3, 9, -93, 0.1)).toBe(false);
  });

  it('is undefined beyond the loft, where the solver’s water is what is drawn', () => {
    const loft = drawn();
    expect(pointInDrawnWater(loft, 10.3, 0, -150)).toBeUndefined();
    expect(pointInDrawnWater(loft, 60, 0, -93)).toBeUndefined();
  });

  it('draws its triangles from its first vertexCount vertices, inside its box', () => {
    const loft = drawn();
    const box = drawnLoftBounds(loft);
    expect(loft.indexCount).toBeGreaterThan(1000);
    let highest = -Infinity;
    for (let t = 0; t < loft.indexCount; t += 1) {
      const v = loft.indices[t];
      expect(v).toBeLessThan(loft.vertexCount);
      const [x, y, z] = [loft.positions[3 * v], loft.positions[3 * v + 1], loft.positions[3 * v + 2]];
      expect(x >= box.xMin && x <= box.xMax && z >= box.zMin && z <= box.zMax && y <= box.top).toBe(true);
      highest = Math.max(highest, y);
    }
    // The top is the lip's, as drawn (a vertex no triangle uses would only make the box larger, never wrong).
    expect(box.top).toBeGreaterThanOrEqual(highest);
    expect(box.top).toBeGreaterThan(TOP - 0.5);
  });

  it('flips just above and below every drawn triangle', () => {
    const loft = drawn();
    const p = loft.positions;
    let checked = 0;
    for (let t = 0; t < loft.indexCount; t += 3) {
      const [a, b, c] = [loft.indices[t], loft.indices[t + 1], loft.indices[t + 2]];
      const slice = Math.floor(a / LOFT_SAMPLES);
      // The strips at a front's ends, whose lip is thinner than the probe's step, and the tip's fold, are left out (as the contact's).
      if (loft.sliceWeight[slice] !== 1 || loft.sliceWeight[slice + 1] !== 1) continue;
      if (Math.abs((a % LOFT_SAMPLES) - LOFT.extensionSamples - 64) <= 1) continue;
      const area = (p[3 * b] - p[3 * a]) * (p[3 * c + 2] - p[3 * a + 2]) - (p[3 * b + 2] - p[3 * a + 2]) * (p[3 * c] - p[3 * a]);
      if (Math.abs(area) < 1e-6) continue;
      const x = (p[3 * a] + p[3 * b] + p[3 * c]) / 3;
      const y = (p[3 * a + 1] + p[3 * b + 1] + p[3 * c + 1]) / 3;
      const z = (p[3 * a + 2] + p[3 * b + 2] + p[3 * c + 2]) / 3;
      const above = pointInDrawnWater(loft, x, y + 1e-4, z);
      const below = pointInDrawnWater(loft, x, y - 1e-4, z);
      expect(above).toBeDefined();
      expect(below).toBe(!above);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('agrees with the contact on a curving front, where its strips overlap in plan', () => {
    // A front bowed seaward on a 6 m radius: its rays converge shoreward and cross within the profile's reach.
    const n = 25;
    const radius = 6;
    const curved = new Float32Array(n * FRONT_STRIDE);
    for (let k = 0; k < n; k += 1) {
      const theta = -0.7 + (1.4 * k) / (n - 1);
      const o = k * FRONT_STRIDE;
      curved[o + FRONT_FIELD.x] = 10 + radius * Math.sin(theta); curved[o + FRONT_FIELD.z] = -100 - radius * Math.cos(theta);
      curved[o + FRONT_FIELD.front] = 1; curved[o + FRONT_FIELD.sigma] = radius * (theta + 0.7);
      curved[o + FRONT_FIELD.tau] = 0.1; curved[o + FRONT_FIELD.footHeight] = 2.1; curved[o + FRONT_FIELD.footDepth] = 7;
      curved[o + FRONT_FIELD.throwZ] = -100;
    }
    const loft = new SweptLoft(library(), 0.05).build(curved, n, STILL, flat);
    const contact = new SweptContact(library(), 0.05);
    contact.update(curved, n, STILL, flat);
    const hit = createContactHit();
    const stripsAt = (x: number, z: number) => {
      const found = new Set<number>();
      for (let t = 0; t < loft.indexCount; t += 3) {
        const [a, b, c] = [loft.indices[t], loft.indices[t + 1], loft.indices[t + 2]];
        const p = loft.positions;
        const area = (p[3 * b] - p[3 * a]) * (p[3 * c + 2] - p[3 * a + 2]) - (p[3 * b + 2] - p[3 * a + 2]) * (p[3 * c] - p[3 * a]);
        if (area === 0) continue;
        const wb = ((x - p[3 * a]) * (p[3 * c + 2] - p[3 * a + 2]) - (z - p[3 * a + 2]) * (p[3 * c] - p[3 * a])) / area;
        const wc = ((p[3 * b] - p[3 * a]) * (z - p[3 * a + 2]) - (p[3 * b + 2] - p[3 * a + 2]) * (x - p[3 * a])) / area;
        if (wb >= 0 && wc >= 0 && wb + wc <= 1) found.add(Math.floor(Math.min(a, b, c) / LOFT_SAMPLES));
      }
      return found;
    };
    let seed = 2024;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    let answered = 0;
    let overlapping = 0;
    let disagreed = 0;
    for (let k = 0; k < 3000; k += 1) {
      const x = 2 + 16 * random();
      const z = -108 + 14 * random();
      const y = -1 + 7 * random();
      if (!contact.query(x, y, z, hit)) continue;
      const drawn = pointInDrawnWater(loft, x, y, z);
      if (drawn === undefined) continue;
      answered += 1;
      const strips = [...stripsAt(x, z)];
      if (strips.length > 1 && Math.max(...strips) - Math.min(...strips) > 1) overlapping += 1;
      if (drawn !== hit.inWater) disagreed += 1;
    }
    expect(answered).toBeGreaterThan(800);
    // The overlaps are there to be judged, and the one strip the contact takes answers for the camera too.
    expect(overlapping).toBeGreaterThan(50);
    expect(disagreed).toBe(0);
  });

  it('agrees with the swept contact’s parity on the points it answers (the rider hits what is drawn)', () => {
    const contact = new SweptContact(library(), 0.05);
    contact.update(records(21, 0.1), 21, STILL, flat);
    const loft = drawn();
    const hit = createContactHit();
    let seed = 12345;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    let answered = 0;
    let disagreed = 0;
    for (let k = 0; k < 4000; k += 1) {
      const x = 2 + 17 * random();
      const z = -112 + 24 * random();
      const y = -1 + 9 * random();
      if (!contact.query(x, y, z, hit)) continue;
      answered += 1;
      if (pointInDrawnWater(loft, x, y, z) !== hit.inWater) disagreed += 1;
    }
    expect(answered).toBeGreaterThan(1500);
    expect(disagreed).toBe(0);
  });
});
