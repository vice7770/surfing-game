import { describe, expect, it } from 'vitest';
import { PhysicalSurfWater } from '/Users/regina/Desktop/Projects/surfing-game/src/physics/PhysicalSurfWater';
import { createWaterSample } from '/Users/regina/Desktop/Projects/surfing-game/src/physics/SurfWater';
import { ShallowWaterSolver, uniformEdges } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/ShallowWaterSolver';
import { FRONT_FIELD, FRONT_STRIDE } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/frontRecords';
import { readBarrelCases } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/nodeBarrelCases';
import { decodeCase } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/profileFormat';
import { PROFILE_POINTS, ProfileLibrary } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/ProfileLibrary';
import { createContactHit, SweptContact } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/sweptContact';
import { SweptLoft } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/sweptLoft';

const cases = readBarrelCases('padang').map(decodeCase);
const barrel = cases.find(c => c.id === 'pad19-a30-l12')!;
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const STILL = 0.5;
const height = Math.fround(barrel.nonlinearity * 7);
const query = { slope: barrel.slope, footHeight: height, footDepth: 7 };
const clear = library.profileTimes(query).clearSeconds;
const ages = [{ stage: 'before throw', seconds: -0.1 * clear }, { stage: 'at throw', seconds: 0 }];

function frontAt(seconds: number): Float32Array {
  const data = new Float32Array(9 * FRONT_STRIDE);
  for (let k = 0; k < 9; k += 1) {
    const o = k * FRONT_STRIDE;
    data[o + FRONT_FIELD.x] = k + 0.5; data[o + FRONT_FIELD.z] = -100;
    data[o + FRONT_FIELD.front] = 1; data[o + FRONT_FIELD.sigma] = k;
    data[o + FRONT_FIELD.footHeight] = height; data[o + FRONT_FIELD.footDepth] = 7;
    data[o + FRONT_FIELD.tau] = seconds; data[o + FRONT_FIELD.throwZ] = -100;
    data[o + FRONT_FIELD.pace] = 0;
  }
  return data;
}

function ordinaryWater(): { solver: ShallowWaterSolver; water: PhysicalSurfWater } {
  const solver = new ShallowWaterSolver({ nx: 16, xMin: -4, dx: 1, zEdges: uniformEdges(-115, -85, 30), xBoundary: 'open' }, () => 7, { waterLevel: STILL });
  for (let iz = 0; iz < solver.nz; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) {
    const i = iz * solver.nx + ix, x = solver.xCenters[ix], z = solver.zCenters[iz];
    solver.h[i] += 0.08 * Math.sin(0.3 * x) + 0.12 * Math.cos(0.4 * (z + 100));
    solver.qx[i] = solver.h[i] * 0.3; solver.qz[i] = solver.h[i] * 1.4;
  }
  return { solver, water: new PhysicalSurfWater(solver, { peakPeriod: 19 }) };
}

describe('bounded-C water before formation', () => {
  it.each(ages)('keeps the drawing on ordinary water $stage', ({ seconds }) => {
    const data = frontAt(seconds), before = data.slice();
    const lookup = library.profileAt({ ...query, seconds: data[FRONT_FIELD.tau] }, new Float32Array(2 * PROFILE_POINTS));
    expect(lookup.analytic!.formation).toBe(0);
    const waters = [() => STILL, (x: number, z: number) => STILL + 0.12 * (z + 100) + 0.04 * Math.cos(x)];
    for (const heightAt of waters) {
      const draw = new SweptLoft(library, barrel.slope).build(data, 9, STILL, heightAt);
      expect(draw.sliceCount).toBeGreaterThan(4); expect(draw.indexCount).toBeGreaterThan(0);
      let largestHeightError = 0;
      for (let v = 0; v < draw.vertexCount; v += 1) {
        const o = 3 * v;
        largestHeightError = Math.max(largestHeightError, Math.abs(draw.positions[o + 1] - heightAt(draw.positions[o], draw.positions[o + 2])));
      }
      // The sampler sees pre-store coordinates; the final geometry includes F32 coordinate/height roundoff.
      expect(largestHeightError).toBeLessThan(5e-6);
      expect(draw.mask.subarray(0, draw.vertexCount).every(v => v === 0)).toBe(true);
      expect(draw.lift.subarray(0, draw.vertexCount).every(v => v === 0)).toBe(true);
    }
    expect(data).toEqual(before);
  });

  it.each(ages)('lets real deferred body contact use ordinary surface, normals and flow $stage', ({ seconds }) => {
    const { solver, water: ordinary } = ordinaryWater();
    const owner = SweptContact.forOrdinaryWorker(library, barrel.slope);
    // The ordinary water and the contact-enabled facade share one solver, as the worker does.
    const water = new PhysicalSurfWater(solver, { peakPeriod: 19, swept: owner.queries });
    const data = frontAt(seconds), before = data.slice();
    owner.updateFromPlainSurface(data, 9, STILL, ordinary);
    const levels: number[] = [];
    for (const x of [2.371, 4.371, 6.371]) for (const z of [-106.7, -102.3, -100, -98.7, -96.2]) {
      const level = ordinary.surfaceAt(x, z); levels.push(level);
      expect(owner.queries.floorAt(x, z)).toBeNaN();
      expect(water.surfaceAt(x, z)).toBe(level);
      for (const y of [level - 0.2, level + 0.2, level + 1]) {
        expect(owner.queries.query(x, y, z, createContactHit())).toBe(false);
        const expected = ordinary.sampleAt(x, y, z, createWaterSample());
        expect(expected.outsideDomain).toBe(false);
        expect(Math.hypot(expected.flowX, expected.flowY, expected.flowZ)).toBeGreaterThan(0.5);
        expect(water.sampleAt(x, y, z, createWaterSample())).toEqual(expected);
      }
    }
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(0.01);
    expect(data).toEqual(before);
  });
});
