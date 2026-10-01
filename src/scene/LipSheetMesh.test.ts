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
  it('draws a splash-up in Rich only, as foam, never joined to a jet thrown beside it (G9)', () => {
    const { parcels, count } = strips({ column: 4, launchTime: 1 }, { column: 5, launchTime: 1.1, kind: 1 });
    // Classic draws the lip as it always has: the jet's strip alone, a half-column ribbon on each side.
    const sheet = buildLipSheet(parcels, count, 1);
    expect(sheet.indices.length).toBe(3 * 2 * 7 * 2);
    for (let v = 0; v < sheet.positions.length / 3; v += 1) expect(sheet.positions[v * 3]).toBeLessThan(5.5);
    // Rich: two chains of one strip, each two ribbon cells across by seven along (a joined pair would be three across).
    const rich = buildRichLipSheet(parcels, count, 1);
    const perCell = 2 * (LIP_SUBDIVISIONS + 2) ** 2;
    expect(rich.positions.length / 3).toBe(2 * 2 * 7 * perCell);
  });

  it('draws only the splash-ups at a swept spot, where the barrel draws the jet: in Rich as anywhere, and nothing in Classic (PR 5)', () => {
    const { parcels, count } = strips({ column: 4, launchTime: 1 }, { column: 5, launchTime: 1.1, kind: 1 });
    const rich = new LipSheetMesh();
    rich.setLook('rich');
    rich.update(parcels, count, 1, true);
    const splash = strips({ column: 5, launchTime: 1.1, kind: 1 });
    const alone = buildRichLipSheet(splash.parcels, splash.count, 1);
    expect(Array.from(rich.mesh.geometry.getAttribute('position').array)).toEqual(Array.from(alone.positions));
    const classic = new LipSheetMesh();
    classic.update(parcels, count, 1, true);
    expect(classic.mesh.geometry.getIndex()!.count).toBe(0);
    // Everywhere else, the jet's sheet as before.
    classic.update(parcels, count, 1);
    expect(classic.mesh.geometry.getIndex()!.count).toBe(3 * 2 * 7 * 2);
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
