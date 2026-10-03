import { describe, expect, it } from 'vitest';
import { LIP_STRIDE } from '../../wave/SurfZoneRunner';
import { seededRandom } from '../../wave/random';
import { LIP_SUBDIVISIONS, buildRichLipSheet, lipThickness } from './richLip';

/** Packs parcels as a snapshot does: x, y, z, column, index, launch time, age, volume. */
function pack(parcels: number[][]): Float32Array {
  const data = new Float32Array(parcels.length * LIP_STRIDE);
  parcels.forEach((parcel, k) => data.set(parcel, k * LIP_STRIDE));
  return data;
}

/** A strip in column `column`: parcels along +z at 1 m, height from `y(k)`, each holding `volume`. */
function strip(column: number, y: (k: number) => number, volume: number, indices = [0, 1, 2, 3, 4, 5, 6, 7], launchTime = 1): number[][] {
  return indices.map((k) => [column + 0.5, y(k), k, column, k, launchTime, 0.1, volume]);
}

const vertices = (positions: Float32Array) => Array.from({ length: positions.length / 3 }, (_, k) => [positions[3 * k], positions[3 * k + 1], positions[3 * k + 2]]);

describe('the Rich lip', () => {
  it('is as thick as its water: a parcel’s volume over the area of sheet it stands for', () => {
    expect(lipThickness(0.2, 0.5, 1)).toBeCloseTo(0.4, 12);
    expect(lipThickness(0, 0.5, 1)).toBe(0);
  });

  it('is never thicker than a compact blob of its own water, where just-thrown parcels still bunch up', () => {
    expect(lipThickness(0.1, 0.01, 1)).toBeCloseTo(Math.sqrt(0.1), 12);
    expect(lipThickness(0.1, 0.01, 2)).toBeCloseTo(Math.sqrt(0.05), 12);
  });

  it('builds two faces half its thickness either side of a flat strip', () => {
    const volume = lipThickness(1, 1, 1) * 0.2; // 0.2 m thick at 1 m spacing and width
    const sheet = buildRichLipSheet(pack(strip(3, () => 2, volume)), 8, 1);
    const ys = vertices(sheet.positions).map(([, y]) => y);
    expect(Math.min(...ys)).toBeCloseTo(1.9, 5);
    expect(Math.max(...ys)).toBeCloseTo(2.1, 5);
    expect(sheet.indices.length).toBeGreaterThan(0);
    expect(Math.max(...Array.from(sheet.thickness))).toBeCloseTo(0.2, 6);
  });

  it('rounds its open edges: the faces meet there, their normals turning outward, so it closes with no box', () => {
    const volume = 0.2;
    const sheet = buildRichLipSheet(pack(strip(3, () => 2, volume)), 8, 1);
    const drawn = vertices(sheet.positions);
    const normals = vertices(sheet.normals);
    let edges = 0;
    drawn.forEach(([x, y, z], k) => {
      if (Math.abs(x - 3) > 1e-6 && Math.abs(x - 4) > 1e-6) return;
      // Toward the strip's ends the edge also rounds along it: check the side edges between.
      if (z < 1 - 1e-6 || z > 6 + 1e-6) return;
      edges += 1;
      expect(y).toBeCloseTo(2, 6);
      expect(sheet.thickness[k]).toBeCloseTo(0, 6);
      expect(normals[k][0] * Math.sign(x - 3.5)).toBeGreaterThan(0.99);
    });
    expect(edges).toBeGreaterThan(0);
  });

  it('passes its spline through every parcel', () => {
    const parcels = strip(3, (k) => 2 + Math.sin(k * 0.7), 0);
    const sheet = buildRichLipSheet(pack(parcels), 8, 1);
    const drawn = vertices(sheet.positions);
    for (const [x, y, z] of parcels) {
      expect(drawn.some(([dx, dy, dz]) => Math.hypot(dx - x, dy - y, dz - z) < 1e-5)).toBe(true);
    }
  });

  it('joins strips linked across columns with no gap, and hangs a half-column ribbon on each open side', () => {
    const sheet = buildRichLipSheet(pack([...strip(3, () => 2, 0.05), ...strip(4, () => 2, 0.05)]), 16, 1);
    const xs = vertices(sheet.positions).map(([x]) => x);
    expect(xs.some((x) => Math.abs(x - 4) < 1e-6)).toBe(true);
    expect(Math.min(...xs)).toBeCloseTo(3, 5);
    expect(Math.max(...xs)).toBeCloseTo(5, 5);
  });

  it('builds only a strip’s flying run once its tip has landed', () => {
    const sheet = buildRichLipSheet(pack(strip(3, () => 2, 0.05, [3, 4, 5, 6, 7])), 5, 1);
    const zs = vertices(sheet.positions).map(([, , z]) => z);
    expect(Math.min(...zs)).toBeGreaterThan(2.99);
  });

  /** A few throws of jets and a splash-up across columns, some strips broken where parcels landed. */
  function throwOf(seed: number): { parcels: Float32Array; count: number } {
    const random = seededRandom(seed, 99);
    const rows: number[][] = [];
    for (let w = 0; w < 3; w += 1) {
      const columns = 2 + Math.floor(random() * 12);
      const first = Math.floor(random() * 30);
      const launch = 10 * w + random();
      const kind = w === 2 ? 1 : 0;
      for (let c = first; c < first + columns; c += 1) {
        const per = 3 + Math.floor(random() * 8);
        for (let k = 0; k < per; k += 1) {
          if (random() < 0.08) continue;
          rows.push([c + 0.5 + 0.1 * random(), 3 - 0.2 * k + 0.3 * random(), 10 + 0.3 * k + 0.2 * random(), c, k, launch + 0.02 * random() * (c - first), 0.1 * k * random(), 0.01 + 0.2 * random(), kind]);
        }
      }
    }
    return { parcels: pack(rows), count: rows.length };
  }
  const checksum = (values: ArrayLike<number>) => {
    let total = 0;
    for (let i = 0; i < values.length; i += 1) total += values[i] * ((i % 7) + 1);
    return total;
  };

  it('builds the same sheet as before it was built into typed arrays, point for point', () => {
    // Pinned from the builder before the Particles setting (an array per point), on two throws.
    const pinned = [
      { seed: 7, vertices: 600, indices: 2304, positions: 56199.31521475315, normals: -53.70973637441057, foam: 1489.4583054296672, thickness: 152.85558771155775, indexSum: 2760820 },
      { seed: 42, vertices: 400, indices: 1536, positions: 49453.669567108154, normals: -22.093793045605707, foam: 987.6849018465728, thickness: 74.3235752414912, indexSum: 1224896 },
    ];
    for (const expected of pinned) {
      const { parcels, count } = throwOf(expected.seed);
      const sheet = buildRichLipSheet(parcels, count, 1);
      expect(sheet.positions.length / 3).toBe(expected.vertices);
      expect(sheet.indices.length).toBe(expected.indices);
      expect(checksum(sheet.positions)).toBeCloseTo(expected.positions, 6);
      expect(checksum(sheet.normals)).toBeCloseTo(expected.normals, 9);
      expect(checksum(sheet.foam)).toBeCloseTo(expected.foam, 9);
      expect(checksum(sheet.thickness)).toBeCloseTo(expected.thickness, 9);
      expect(checksum(sheet.indices)).toBe(expected.indexSum);
      // Built again, the same (the build keeps its buffers from one sheet to the next).
      expect(Array.from(buildRichLipSheet(parcels, count, 1).positions)).toEqual(Array.from(sheet.positions));
    }
  });

  // The Particles setting draws fewer spline points between parcels at its lower levels.
  it('draws the spline points it is asked for between parcels, through every parcel still', () => {
    const parcels = strip(3, (k) => 2 + Math.sin(k * 0.7), 0);
    for (const subdivisions of [LIP_SUBDIVISIONS, 2, 1]) {
      const sheet = buildRichLipSheet(pack(parcels), 8, 1, subdivisions);
      // Two ribbon cells across, seven along; two faces of (subdivisions + 2)² points each.
      expect(sheet.positions.length / 3).toBe(2 * 7 * 2 * (subdivisions + 2) ** 2);
      const drawn = vertices(sheet.positions);
      for (const [x, y, z] of parcels) expect(drawn.some(([dx, dy, dz]) => Math.hypot(dx - x, dy - y, dz - z) < 1e-5)).toBe(true);
    }
  });

  it('builds nothing from no parcels', () => {
    const sheet = buildRichLipSheet(new Float32Array(0), 0, 1);
    expect(sheet.positions.length).toBe(0);
    expect(sheet.indices.length).toBe(0);
  });
});
