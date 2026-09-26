import { describe, expect, it } from 'vitest';
import { JET_RELEASE_TIME, LINK_TIME, PlungingLip, STRIP_PARCELS, lipThrow, overturnArea, tubeWidthRatio } from './PlungingLip';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';

function basin(): ShallowWaterSolver {
  const solver = new ShallowWaterSolver({ nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => 2, { manning: 0 });
  for (let iz = 10; iz < 14; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] += 0.8;
  }
  return solver;
}

function momentumZ(solver: ShallowWaterSolver): number {
  let total = 0;
  for (let iz = 0; iz < solver.nz; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) total += solver.qz[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
  }
  return total;
}

describe('PlungingLip', () => {
  it('conserves water volume through launch, flight and landing in a closed basin', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const before = solver.totalVolume();
    const thrown = lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6);
    expect(thrown).toBeCloseTo(0.6, 12);
    expect(lip.airborneVolume()).toBeCloseTo(0.6, 12);
    expect(solver.totalVolume() + lip.airborneVolume()).toBeCloseTo(before, 9);
    for (let frame = 0; frame < 120; frame += 1) {
      solver.step(1 / 60);
      lip.step(1 / 60);
      expect((solver.totalVolume() + lip.airborneVolume()) / before).toBeCloseTo(1, 12);
    }
    expect(lip.activeCount()).toBe(0);
    expect(lip.landings).toBe(STRIP_PARCELS);
  });

  it('caps the volume taken from the crest at a fifth of the local water', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const cell = solver.cellIndex(3.5, 12.5);
    const depths = [cell - solver.nx, cell, cell + solver.nx].map((index) => solver.h[index]);
    const thrown = lip.launch(cell, { x: 0, z: 4 }, 3, 100);
    expect(thrown).toBeCloseTo(0.2 * depths.reduce((sum, depth) => sum + depth, 0) * solver.dx * solver.dz[0], 9);
    [cell - solver.nx, cell, cell + solver.nx].forEach((index, n) => expect(solver.h[index]).toBeCloseTo(0.8 * depths[n], 9));
  });

  it('offers each airborne parcel for contact, and a struck parcel lands with its changed momentum', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const cell = solver.cellIndex(3.5, 12.5);
    const thrown = lip.launch(cell, { x: 0, z: 4 }, 30, 0.6);
    for (let t = 0; t <= JET_RELEASE_TIME + 1 / 60; t += 1 / 120) lip.step(1 / 120);
    const seen: { id: number; travel: number; expected: number }[] = [];
    lip.forEachContact((parcel) => {
      // Over the last 1/120 s step the parcel moved at its velocity, less half a step of gravity.
      const expected = Math.hypot(parcel.velocity.z, parcel.velocity.y + 9.81 / 240) / 120;
      seen.push({ id: parcel.id, travel: parcel.position.distanceTo(parcel.previousPosition), expected });
      expect(parcel.radius).toBeCloseTo(Math.cbrt((3 * parcel.volume) / (4 * Math.PI)), 12);
      parcel.velocity.x += 2;
    });
    expect(seen.length).toBe(STRIP_PARCELS);
    expect(new Set(seen.map((parcel) => parcel.id)).size).toBe(STRIP_PARCELS);
    for (const parcel of seen) expect(parcel.travel).toBeCloseTo(parcel.expected, 3);
    // Ids stay with their parcels.
    const again: number[] = [];
    lip.forEachContact((parcel) => again.push(parcel.id));
    expect(again).toEqual(seen.map((parcel) => parcel.id));
    for (let frame = 0; frame < 1200 && lip.activeCount() > 0; frame += 1) lip.step(1 / 120);
    let momentumX = 0;
    for (let index = 0; index < solver.h.length; index += 1) momentumX += solver.qx[index] * solver.dx * solver.dz[Math.floor(index / solver.nx)];
    expect(momentumX).toBeCloseTo(thrown * 2, 9);
  });

  it('lands ahead of the crest and hands its forward momentum to the water there', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const cell = solver.cellIndex(3.5, 12.5);
    const thrown = lip.launch(cell, { x: 0, z: 4 }, 3, 0.6);
    const landed: number[] = [];
    for (let frame = 0; frame < 120 && lip.activeCount() > 0; frame += 1) lip.step(1 / 120);
    for (let iz = 0; iz < solver.nz; iz += 1) if (solver.qz[iz * solver.nx + 3] > 0) landed.push(solver.zCenters[iz]);
    expect(Math.min(...landed)).toBeGreaterThan(13.5);
    expect(momentumZ(solver)).toBeCloseTo(thrown * 4, 9);
  });

  it('keeps a bounded number of parcels, refusing a whole strip it cannot hold', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 2 * STRIP_PARCELS + 3);
    const cell = solver.cellIndex(3.5, 12.5);
    expect(lip.launch(cell, { x: 0, z: 4 }, 3, 0.1)).toBeGreaterThan(0);
    expect(lip.launch(cell + 1, { x: 0, z: 4 }, 3, 0.1)).toBeGreaterThan(0);
    const volume = solver.totalVolume();
    expect(lip.launch(cell + 2, { x: 0, z: 4 }, 3, 0.1)).toBe(0);
    expect(solver.totalVolume()).toBe(volume);
    expect(lip.activeCount()).toBe(2 * STRIP_PARCELS);
  });

  it('releases a strip of parcels along the jet over the release time, from where the crest has moved to', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 30, 0.6);
    const flying = () => {
      let count = 0;
      lip.forEachActive(() => (count += 1));
      return count;
    };
    expect(flying()).toBe(1);
    lip.step(JET_RELEASE_TIME / 2);
    expect(flying()).toBeGreaterThan(1);
    expect(flying()).toBeLessThan(STRIP_PARCELS);
    lip.step(JET_RELEASE_TIME / 2 + 1e-9);
    expect(flying()).toBe(STRIP_PARCELS);
    // The strip is the jet's cross-section: the first parcel has fallen furthest, the last is still at the crest's height.
    const parcels: { index: number; y: number; z: number }[] = [];
    lip.forEachActiveParcel((p) => parcels.push({ index: p.index, y: p.y, z: p.z }));
    parcels.sort((a, b) => a.index - b.index);
    for (let k = 1; k < parcels.length; k += 1) expect(parcels[k].y).toBeGreaterThan(parcels[k - 1].y);
    expect(parcels.at(-1)!.y).toBeCloseTo(30, 6);
  });

  it('links neighbouring columns thrown close in time into one sheet, and not those thrown far apart', () => {
    const across = (gap: number) => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      lip.launch(solver.cellIndex(2.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
      for (let t = 0; t < gap; t += 1 / 60) lip.step(1 / 60);
      lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
      lip.step(JET_RELEASE_TIME + 0.01);
      const column = new Map<number, number>();
      lip.forEachActiveParcel((p) => column.set(p.slot, p.column));
      let count = 0;
      lip.forEachLink((a, b) => {
        if (column.get(a) !== column.get(b)) count += 1;
      });
      return count;
    };
    expect(across(0.5)).toBe(STRIP_PARCELS);
    expect(across(LINK_TIME + 1)).toBe(0);
  });

  it('keeps its links across a sliding window', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(2.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
    lip.step(JET_RELEASE_TIME + 0.01);
    const links = () => {
      const found: string[] = [];
      lip.forEachLink((a, b) => found.push(`${a}-${b}`));
      return found.sort();
    };
    const before = links();
    solver.shiftAlongShore(3);
    expect(links()).toEqual(before);
  });

  it('throws the same sheet for the same throws', () => {
    const run = () => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      lip.launch(solver.cellIndex(2.5, 12.5), { x: 0.5, z: 4 }, 5, 0.4);
      for (let frame = 0; frame < 30; frame += 1) lip.step(1 / 60);
      const out: number[] = [];
      lip.forEachActiveParcel((p) => out.push(p.x, p.y, p.z, p.index));
      return out;
    };
    expect(run()).toEqual(run());
  });
});

describe('lip shape', () => {
  it('throws only from plunging breakers', () => {
    expect(lipThrow({ iribarren: 0.3, breakerHeight: 1.5, windOverCelerity: 0, width: 1 })).toBeUndefined();
    expect(lipThrow({ iribarren: 2.4, breakerHeight: 1.5, windOverCelerity: 0, width: 1 })).toBeUndefined();
    expect(lipThrow({ iribarren: 0.8, breakerHeight: 1.5, windOverCelerity: 0, width: 1 })).toBeDefined();
  });

  it('sizes the overturn from the Surf Ranch measurements (Feddersen et al. 2023)', () => {
    expect(overturnArea(0.75)).toBeCloseTo(0.2, 2);
    expect(overturnArea(-0.4)).toBeCloseTo(0.4, 2);
    expect(overturnArea(-2)).toBe(0.4);
    expect(overturnArea(3)).toBe(0.2);
    const calm = lipThrow({ iribarren: 0.8, breakerHeight: 1.5, windOverCelerity: 0, width: 2 })!;
    expect(calm.volume).toBeCloseTo(overturnArea(0) * 1.5 * 1.5 * 2, 12);
  });

  it('rounds the tube from almond to circle as ξ rises and as offshore wind grows', () => {
    expect(tubeWidthRatio(0.4, 0)).toBeCloseTo(1 / 3, 12);
    expect(tubeWidthRatio(2, 0)).toBeCloseTo(1, 12);
    expect(tubeWidthRatio(0.8, -1)).toBeGreaterThan(tubeWidthRatio(0.8, 0));
    expect(tubeWidthRatio(0.8, 1)).toBeLessThan(tubeWidthRatio(0.8, 0));
    // A ballistic lip launched level from the crest lands one tube length ahead: speed = (L/W)·√(gH/2).
    const almond = lipThrow({ iribarren: 0.4, breakerHeight: 1.5, windOverCelerity: 0, width: 1 })!;
    const round = lipThrow({ iribarren: 2, breakerHeight: 1.5, windOverCelerity: 0, width: 1 })!;
    expect(almond.speed).toBeCloseTo(3 * Math.sqrt((9.81 * 1.5) / 2), 9);
    expect(round.speed).toBeCloseTo(Math.sqrt((9.81 * 1.5) / 2), 9);
  });
});
