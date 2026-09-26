import { describe, expect, it } from 'vitest';
import { LIP_STRIDE } from '../../wave/SurfZoneRunner';
import { buildRichLipSheet, lipThickness } from './richLip';

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

  it('builds nothing from no parcels', () => {
    const sheet = buildRichLipSheet(new Float32Array(0), 0, 1);
    expect(sheet.positions.length).toBe(0);
    expect(sheet.indices.length).toBe(0);
  });
});
