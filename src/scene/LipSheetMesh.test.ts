import { describe, expect, it } from 'vitest';
import { LIP_STRIDE } from '../wave/SurfZoneRunner';
import { LipSheetMesh, buildLipSheet } from './LipSheetMesh';
import { LIP_SUBDIVISIONS, buildRichLipSheet } from './water/richLip';

/** Parcels of strips in the snapshot's layout: x, y, z, column, index, launch time, age. */
function strips(...defs: { column: number; launchTime: number; indices?: number[]; kind?: number }[]): { parcels: Float32Array; count: number } {
  const rows: number[][] = [];
  for (const { column, launchTime, indices = [0, 1, 2, 3, 4, 5, 6, 7], kind = 0 } of defs) {
    for (const k of indices) rows.push([column + 0.5, 3 - 0.2 * k, 10 + 0.3 * k, column, k, launchTime, 0.1 * k, 0.05, kind]);
  }
  const parcels = new Float32Array(rows.length * LIP_STRIDE);
  rows.forEach((row, i) => parcels.set(row, i * LIP_STRIDE));
  return { parcels, count: rows.length };
}

describe('lip sheet mesh', () => {
  it('draws a splash-up as foam, and never joins it to a jet thrown beside it (G9)', () => {
    const { parcels, count } = strips({ column: 4, launchTime: 1 }, { column: 5, launchTime: 1.1, kind: 1 });
    const sheet = buildLipSheet(parcels, count, 1);
    // Two separate strips: each with a half-column ribbon on both sides, none joined across.
    expect(sheet.indices.length).toBe(3 * 2 * (7 + 7) * 2);
    const splashFoam: number[] = [];
    for (let v = 0; v < sheet.positions.length / 3; v += 1) if (sheet.positions[v * 3] > 5) splashFoam.push(sheet.foam[v]);
    expect(Math.min(...splashFoam)).toBe(1);
    // Rich: two chains of one strip, each two ribbon cells across by seven along (a joined pair would be three across).
    const rich = buildRichLipSheet(parcels, count, 1);
    const perCell = 2 * (LIP_SUBDIVISIONS + 2) ** 2;
    expect(rich.positions.length / 3).toBe(2 * 2 * 7 * perCell);
  });

  it('rebuilds only when a new snapshot brings different parcels, in either look', () => {
    for (const look of ['classic', 'rich'] as const) {
      const lip = new LipSheetMesh();
      lip.setLook(look);
      const { parcels, count } = strips({ column: 4, launchTime: 1 }, { column: 5, launchTime: 1.2 });
      lip.update(parcels, count, 1);
      const built = lip.mesh.geometry.getAttribute('position');
      lip.update(parcels, count, 1);
      expect(lip.mesh.geometry.getAttribute('position')).toBe(built);
      parcels[1] += 0.1;
      lip.update(parcels, count, 1);
      expect(lip.mesh.geometry.getAttribute('position')).not.toBe(built);
    }
  });

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
