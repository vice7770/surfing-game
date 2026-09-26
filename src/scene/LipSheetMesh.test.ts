import { describe, expect, it } from 'vitest';
import { LIP_STRIDE } from '../wave/SurfZoneRunner';
import { buildLipSheet } from './LipSheetMesh';

/** Parcels of strips in the snapshot's layout: x, y, z, column, index, launch time, age. */
function strips(...defs: { column: number; launchTime: number; indices?: number[] }[]): { parcels: Float32Array; count: number } {
  const rows: number[][] = [];
  for (const { column, launchTime, indices = [0, 1, 2, 3, 4, 5, 6, 7] } of defs) {
    for (const k of indices) rows.push([column + 0.5, 3 - 0.2 * k, 10 + 0.3 * k, column, k, launchTime, 0.1 * k]);
  }
  const parcels = new Float32Array(rows.length * LIP_STRIDE);
  rows.forEach((row, i) => parcels.set(row, i * LIP_STRIDE));
  return { parcels, count: rows.length };
}

describe('lip sheet mesh', () => {
  it('joins two strips thrown close in time into one surface, a column wide at its ends', () => {
    const { parcels, count } = strips({ column: 4, launchTime: 1 }, { column: 5, launchTime: 1.2 });
    const sheet = buildLipSheet(parcels, count, 1);
    // 7 quads between the strips, and a half-column ribbon of 7 quads on each outer side.
    expect(sheet.indices.length).toBe(3 * 2 * (7 + 7 + 7));
    // The parcels themselves are vertices, where they are.
    const vertices = new Set<string>();
    for (let v = 0; v < sheet.positions.length / 3; v += 1) vertices.add(`${sheet.positions[v * 3].toFixed(3)},${sheet.positions[v * 3 + 1].toFixed(3)},${sheet.positions[v * 3 + 2].toFixed(3)}`);
    for (let i = 0; i < count; i += 1) {
      expect(vertices.has(`${parcels[i * LIP_STRIDE].toFixed(3)},${parcels[i * LIP_STRIDE + 1].toFixed(3)},${parcels[i * LIP_STRIDE + 2].toFixed(3)}`)).toBe(true);
    }
  });

  it('keeps strips thrown far apart as separate ribbons', () => {
    const { parcels, count } = strips({ column: 4, launchTime: 1 }, { column: 5, launchTime: 4 });
    const sheet = buildLipSheet(parcels, count, 1);
    expect(sheet.indices.length).toBe(3 * 2 * (4 * 7));
    for (let t = 0; t < sheet.indices.length; t += 3) {
      const xs = [0, 1, 2].map((j) => sheet.positions[sheet.indices[t + j] * 3]);
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(0.5 + 1e-6);
    }
  });

  it('leaves a gap where a strip has lost parcels', () => {
    const { parcels, count } = strips({ column: 4, launchTime: 1, indices: [0, 1, 2, 5, 6, 7] });
    const sheet = buildLipSheet(parcels, count, 1);
    // Along the strip only 0-1, 1-2, 5-6 and 6-7 are joined: 4 quads on each side.
    expect(sheet.indices.length).toBe(3 * 2 * (2 * 4));
  });

  it('whitens the lip with age and at its tip', () => {
    const { parcels, count } = strips({ column: 4, launchTime: 1 });
    const sheet = buildLipSheet(parcels, count, 1);
    expect(Math.max(...sheet.foam)).toBeGreaterThan(Math.min(...sheet.foam));
  });
});
