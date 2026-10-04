import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { SurfZoneRunner } from '../SurfZoneRunner';
import type { SurfZoneConfig } from '../SurfZoneSimulation';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { encodeCase } from './profileFormat';
import { createContactHit, SweptContact, type ContactHit, type OrdinaryContactOwner } from './sweptContact';
import { SweptLoft, type LoftResult } from './sweptLoft';
import { tubeCase } from './toyCase';

const STILL = 0.5;
function frontRecords(count: number): Float32Array {
  const records = new Float32Array(count * FRONT_STRIDE);
  for (let k = 0; k < count; k += 1) {
    const o = k * FRONT_STRIDE;
    records[o + FRONT_FIELD.x] = k + 0.5;
    records[o + FRONT_FIELD.z] = -100;
    records[o + FRONT_FIELD.front] = 1;
    records[o + FRONT_FIELD.sigma] = k;
    records[o + FRONT_FIELD.tau] = 0.1;
    records[o + FRONT_FIELD.footHeight] = 2.1;
    records[o + FRONT_FIELD.footDepth] = 7;
    records[o + FRONT_FIELD.throwZ] = -100;
  }
  return records;
}

type PrivatePreparation = {
  normalDemand: boolean;
  result: LoftResult;
  heightReady: Uint8Array;
  normalReady: Uint8Array;
};
function contactPair() {
  const solver = new ShallowWaterSolver({
    nx: 48, xMin: -12, dx: 1, zEdges: uniformEdges(-130, -70, 60),
  }, () => 7, { waterLevel: STILL });
  let preparation: PrivatePreparation | undefined;
  const build = SweptLoft.prototype.build;
  // Inspect preparation in the test; the ordinary facade exposes only query/floor methods.
  vi.spyOn(SweptLoft.prototype, 'build').mockImplementation(function (this: SweptLoft, ...args) {
    const result = build.apply(this, args);
    const state = this as unknown as PrivatePreparation;
    if (state.normalDemand) preparation = state;
    return result;
  });
  const owner = SweptContact.forOrdinaryWorker(new ProfileLibrary([tubeCase(0.3)]), 0.05);
  const eager = new SweptContact(new ProfileLibrary([tubeCase(0.3)]), 0.05);
  const water = new PhysicalSurfWater(solver, { peakPeriod: 18, nodeSpacing: 2 });
  const actual = createContactHit(), expected = createContactHit();
  return {
    solver, owner, eager, water,
    state() {
      expect(preparation).toBeDefined();
      return preparation!;
    },
    update(records: Float32Array) {
      owner.updateFromPlainSurface(records, records.length / FRONT_STRIDE, STILL, water);
      water.withSurfaceNodeCache(() => eager.update(records, records.length / FRONT_STRIDE, STILL,
        (x, z) => water.plainSurfaceAt(x, z)));
    },
    query(x: number, y: number, z: number) {
      const result = owner.queries.query(x, y, z, actual);
      expect(result).toBe(eager.query(x, y, z, expected));
      for (const key of Object.keys(expected) as (keyof ContactHit)[]) {
        expect(Object.is(actual[key], expected[key]), key).toBe(true);
      }
      return result;
    },
  };
}
afterEach(() => vi.restoreAllMocks());

describe('ordinary worker contact preparation', () => {
  it('keeps eager answers and selected normals through shrink, empty and captured-height generations', () => {
    const p = contactPair();
    expect(Object.isFrozen(p.owner)).toBe(true);
    expect(Object.isFrozen(p.owner.queries)).toBe(true);
    expect(Object.keys(p.owner).sort()).toEqual(['queries', 'updateFromPlainSurface']);
    expect(Object.keys(p.owner.queries).sort()).toEqual(['floorAt', 'query']);
    for (const count of [21, 13, 0, 21]) {
      p.update(frontRecords(count));
      const state = p.state();
      expect(state.heightReady.some(Boolean)).toBe(false);
      expect(state.normalReady.some(Boolean)).toBe(false);
      expect(p.query(999, 0, 999)).toBe(false);
      expect(state.heightReady.some(Boolean)).toBe(false);
      expect(Object.is(p.owner.queries.floorAt(10.3, -93), p.eager.floorAt(10.3, -93))).toBe(true);
      expect(state.normalReady.some(Boolean)).toBe(false);
      if (count === 0) {
        expect(p.query(10.3, 4.3, -93)).toBe(false);
        expect(state.heightReady.some(Boolean)).toBe(false);
        continue;
      }
      expect(state.heightReady.some(Boolean)).toBe(true);
      expect(p.query(10.3, 4.3, -93)).toBe(true);
      const selected = Array.from(state.normalReady.subarray(0, state.result.vertexCount))
        .flatMap((ready, vertex) => ready ? [vertex] : []);
      expect(selected).toHaveLength(3);
      expect(p.eager.last!.vertexCount).toBeGreaterThan(selected.length);
      for (const vertex of selected) for (let axis = 0; axis < 3; axis += 1) {
        const at = 3 * vertex + axis;
        expect(Object.is(state.result.normals[at], p.eager.last!.normals[at])).toBe(true);
      }
      const ready = state.normalReady.slice();
      expect(p.query(10.3, 4.3, -93)).toBe(true);
      expect(state.normalReady).toEqual(ready);
    }
    const records = frontRecords(21);
    for (let i = 0; i < p.solver.h.length; i += 1) p.solver.h[i] += 0.03 * Math.sin(i * 0.17);
    p.update(records);
    expect(p.state().heightReady.some(Boolean)).toBe(false);
    const previousFloor = p.eager.floorAt(10.3, -93);
    p.solver.h.fill(9.375); p.solver.bed.fill(-6.875);
    for (let i = 0; i < p.solver.xCenters.length; i += 1) p.solver.xCenters[i] += 3;
    // First private demand occurs after mutation; the eager contact already owns its old geometry.
    expect(Object.is(p.owner.queries.floorAt(10.3, -93), previousFloor)).toBe(true);
    expect(p.query(10.3, 2.5, -93)).toBe(true);
    p.update(records);
    expect(p.state().heightReady.some(Boolean)).toBe(false);
    expect(Object.is(p.eager.floorAt(10.3, -93), previousFloor)).toBe(false);
    expect(Object.is(p.owner.queries.floorAt(10.3, -93), p.eager.floorAt(10.3, -93))).toBe(true);
    p.query(10.3, 2.5, -93);
  });

  it('selects query-only contact for a real Padang stage-2 worker while public construction stays eager', () => {
    const config: SurfZoneConfig = {
      spot: 'padang', stage: 2, seed: 3, significantHeight: 1.4, peakPeriod: 19,
      directionDegrees: 0, spreading: 24, tide: STILL, windSpeed: 0, componentCount: 2,
      alongShore: 12, dx: 2, fineSpacing: 2, coarseSpacing: 8, spinUpPeriods: 0,
    };
    const options = { contact: true, renderSpacing: 2, barrelCases: [encodeCase(tubeCase(0.3))] };
    const factory = vi.spyOn(SweptContact, 'forOrdinaryWorker');
    const publicRunner = new SurfZoneRunner(config, options, 'warm');
    expect(factory).not.toHaveBeenCalled();
    expect(publicRunner.contact).toBeInstanceOf(SweptContact);
    publicRunner.contact!.update(frontRecords(3), 3, STILL, (x, z) => publicRunner.water.plainSurfaceAt(x, z));
    const publicLoft = publicRunner.contact!.last!;
    expect(publicLoft.vertexCount).toBeGreaterThan(0);
    expect(publicLoft.normals.subarray(0, 3 * publicLoft.vertexCount).some((value) => value !== 0)).toBe(true);

    const workerRunner = SurfZoneRunner.forWorker(config, options, 'warm');
    expect(workerRunner.simulation.solver).toBeInstanceOf(BoussinesqSolver);
    expect(workerRunner.simulation.front).toBeDefined();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(workerRunner.contact).toBeUndefined();
    const owner = factory.mock.results[0].value as OrdinaryContactOwner;
    const workerState = workerRunner as unknown as {
      ordinaryContactOwner?: OrdinaryContactOwner;
      contactQueries?: OrdinaryContactOwner['queries'];
    };
    expect(workerState.ordinaryContactOwner).toBe(owner);
    expect(workerState.contactQueries).toBe(owner.queries);
    expect(Object.isFrozen(owner.queries)).toBe(true);
    expect(Object.keys(owner.queries).sort()).toEqual(['floorAt', 'query']);
  });
});
