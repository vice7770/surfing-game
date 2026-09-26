import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { JET_RELEASE_TIME, LINK_TIME, PlungingLip, STRIP_PARCELS, lipThrow, overturnArea } from './PlungingLip';
import { jetRelativeSpeed, overturn, overturnParameter, tubeFloorDepth, type TubeGeometry } from './Overturn';
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

  it('takes from the crest the momentum its jet carries off', () => {
    // A jet is the crest's fast surface water: thrown faster than the column moves, it must not add momentum.
    const solver = basin();
    for (let i = 0; i < solver.h.length; i += 1) solver.qz[i] = 1.5 * solver.h[i];
    const lip = new PlungingLip(solver, 256);
    const before = momentumZ(solver);
    const thrown = lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6, 3);
    expect(momentumZ(solver) + thrown * 4).toBeCloseTo(before, 9);
  });

  it('ignores a contact query from a body that has gone non-finite', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 4 }, 3, 0.6, 3);
    lip.step(JET_RELEASE_TIME);
    let visited = 0;
    lip.forEachContactNear(new Vector3(Number.NaN, 0, 0), 1, (parcel) => {
      visited += 1;
      parcel.velocity.set(Number.NaN, Number.NaN, Number.NaN);
    });
    expect(visited).toBe(0);
    lip.forEachActiveParcel((parcel) => expect(Number.isFinite(parcel.vx + parcel.vy + parcel.vz)).toBe(true));
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
    let ahead = 0;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      if (solver.qz[iz * solver.nx + 3] > 0) landed.push(solver.zCenters[iz]);
      if (solver.zCenters[iz] > 13.5) for (let ix = 0; ix < solver.nx; ix += 1) ahead += solver.qz[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
    }
    expect(Math.min(...landed)).toBeGreaterThan(13.5);
    // The crest lost what the jet carried off, and the water where it landed gained it.
    expect(ahead).toBeCloseTo(thrown * 4, 9);
    expect(momentumZ(solver)).toBeCloseTo(0, 9);
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

  it('releases each parcel where its crest has moved to, not where the faster jet has', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    const start = solver.zCenters[Math.floor(solver.cellIndex(3.5, 12.5) / solver.nx)];
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 6 }, 30, 0.6, 4);
    lip.step(JET_RELEASE_TIME + 1e-9);
    let last = { index: -1, z: 0, age: 0 };
    lip.forEachActiveParcel((p) => { if (p.index > last.index) last = { index: p.index, z: p.z, age: p.age }; });
    expect(last.index).toBe(STRIP_PARCELS - 1);
    expect(last.z - 6 * last.age).toBeCloseTo(start + 4 * JET_RELEASE_TIME, 6);
  });

  describe('the void under the lip', () => {
    // A still crest on the hump, 0.8 m up, throwing a jet that flies its void to the front end.
    const tube: TubeGeometry = { length: 1.2, width: 0.5, tilt: 0.35 };
    const drop = tube.width / 2 + tube.length * Math.sin(tube.tilt);
    const reach = tube.length * Math.cos(tube.tilt);
    const speed = reach / Math.sqrt((2 * drop) / 9.81);
    const throwOver = (lip: PlungingLip, solver: ShallowWaterSolver) =>
      lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: speed }, 0.8, 0.3, 0, tube);
    const crestZ = (solver: ShallowWaterSolver) => solver.zCenters[Math.floor(solver.cellIndex(3.5, 12.5) / solver.nx)];

    it('lowers the water to the void floor under the lip, opening only as far as the jet has reached', () => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      throwOver(lip, solver);
      lip.step(0.1);
      const tip = speed * 0.1;
      const ahead = tip / 2;
      expect(lip.carve(3.5, crestZ(solver) + ahead, 5)).toBeCloseTo(0.8 - tubeFloorDepth(tube, ahead), 9);
      // Beyond the jet's tip, behind the crest, and in another column, the water is untouched.
      expect(lip.carve(3.5, crestZ(solver) + tip + 0.2, 5)).toBe(5);
      expect(lip.carve(3.5, crestZ(solver) - 0.2, 5)).toBe(5);
      expect(lip.carve(5.5, crestZ(solver) + ahead, 5)).toBe(5);
      // It only ever carves down.
      expect(lip.carve(3.5, crestZ(solver) + ahead, -1)).toBe(-1);
    });

    it("lands the jet at the void's front end, then closes the void", () => {
      const solver = basin();
      const lip = new PlungingLip(solver, 256);
      const landings: number[] = [];
      lip.onLand = (_x, z, _v, _vx, _vy, _vz, flight) => {
        if (flight && flight.launch.z === crestZ(solver)) landings.push(z - flight.launch.z);
      };
      throwOver(lip, solver);
      for (let step = 0; step < 240 && lip.airborneVolume() > 0; step += 1) lip.step(1 / 120);
      expect(landings[0]).toBeCloseTo(reach, 1);
      expect(lip.carve(3.5, crestZ(solver) + reach / 2, 5)).toBe(5);
    });
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

  it('offers the sheet at its closest point to a body, and hands a strike back to the parcels it joins', () => {
    const solver = basin();
    const lip = new PlungingLip(solver, 256);
    lip.launch(solver.cellIndex(2.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
    lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 1 }, 60, 0.3);
    lip.step(JET_RELEASE_TIME + 0.01);
    const parcels = new Map<number, { x: number; y: number; z: number; vz: number; volume: number }>();
    lip.forEachActiveParcel((p) => parcels.set(p.slot, { x: p.x, y: p.y, z: p.z, vz: p.vz, volume: p.volume }));
    // A body just beside the middle of the across-link between the two strips' tips.
    const tip = [...parcels.values()].filter((p) => p.y < 60).sort((a, b) => a.y - b.y);
    const center = new Vector3(3, tip[0].y, tip[0].z + 0.1);
    const momentumBefore = [...parcels.values()].reduce((sum, p) => sum + p.volume * p.vz, 0);
    let offered = 0;
    let exchanged = 0;
    lip.forEachContactNear(center, 0.5, (parcel) => {
      offered += 1;
      expect(parcel.position.distanceTo(center)).toBeLessThanOrEqual(0.5);
      parcel.velocity.z -= 1;
      exchanged += parcel.volume;
    });
    expect(offered).toBeGreaterThan(0);
    let momentumAfter = 0;
    lip.forEachActiveParcel((p) => (momentumAfter += p.volume * p.vz));
    expect(momentumAfter - momentumBefore).toBeCloseTo(-exchanged, 9);
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
  const conditions = { iribarren: 0.8, slope: 1 / 20, nonlinearity: 0.3, breakerHeight: 1.5, windOverCelerity: 0, width: 1 };

  it('throws only from plunging breakers', () => {
    expect(lipThrow({ ...conditions, iribarren: 0.3 })).toBeUndefined();
    expect(lipThrow({ ...conditions, iribarren: 2.4 })).toBeUndefined();
    expect(lipThrow(conditions)).toBeDefined();
  });

  it("throws the jet's own water and flies it over the void, from the overturn of Pick & Feddersen (2026)", () => {
    const thrown = lipThrow({ ...conditions, width: 2 })!;
    const shape = overturn(overturnParameter(1 / 20, 0.3));
    expect(thrown.shape).toEqual(shape);
    expect(thrown.volume).toBeCloseTo(shape.jetArea * 1.5 * 1.5 * 2, 12);
    expect(thrown.relativeSpeed).toBeCloseTo(jetRelativeSpeed(shape, 1.5), 12);
  });

  it('throws bigger, faster jets over steeper beds', () => {
    const gentle = lipThrow({ ...conditions, slope: 1 / 50 })!;
    const steep = lipThrow({ ...conditions, slope: 1 / 12 })!;
    expect(steep.volume).toBeGreaterThan(gentle.volume);
    expect(steep.relativeSpeed).toBeGreaterThan(gentle.relativeSpeed);
  });

  it('opens the void and rounds it in offshore wind, as measured at Surf Ranch (Feddersen et al. 2023)', () => {
    expect(overturnArea(0.75)).toBeCloseTo(0.2, 2);
    expect(overturnArea(-0.4)).toBeCloseTo(0.4, 2);
    expect(overturnArea(-2)).toBe(0.4);
    expect(overturnArea(3)).toBe(0.2);
    const calm = lipThrow(conditions)!;
    const offshore = lipThrow({ ...conditions, windOverCelerity: -0.4 })!;
    const onshore = lipThrow({ ...conditions, windOverCelerity: 0.75 })!;
    expect(offshore.shape.area / calm.shape.area).toBeCloseTo(overturnArea(-0.4) / overturnArea(0), 12);
    expect(offshore.shape.aspect - calm.shape.aspect).toBeCloseTo(0.18 * 0.4, 12);
    expect(onshore.shape.area).toBeLessThan(calm.shape.area);
  });
});

