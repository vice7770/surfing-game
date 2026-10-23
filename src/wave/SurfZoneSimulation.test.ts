import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { CANYON, CANYON_OLD, PADANG, REEF, canyonArmAt, canyonBreakLineZ, canyonFootZ, createSpot, padangForeFootZ, padangReefAt, type SpotName } from './Bathymetry';
import { madsenSorensenWaveNumber } from './BoussinesqSolver';
import { SETS_OVER_TYPICAL, komarGaughan } from './surfForecast';
import { BREAKER_INDEX } from './SwellReadout';
import { breakerDepthFor } from './Breaking';
import {
  CANYON_RIDE_LINEUP, CANYON_RIDE_LINEUP_OLD, CANYON_SWELL_DEPTH, CANYON_TAKE_OFF_DEPTH_OLD, canyonTakeOffDepth, FOAM_DECAY, RIDE_LINEUP_OFFSET, rideLineupOffset, LIP_JET, OFFSHORE_DEPTH, SET_FINE_MARGIN, SIDE_FEED_SPOTS, SWEPT_BARREL, SurfZoneSimulation, TAKE_OFF, TAKE_OFF_EDGE_MARGIN, TAKE_OFF_INDEX, TANK, ZONE_WAVELENGTHS, edgeHeight,
  solverStage, barrelFrontFrom, surfZoneSea, takeOffPoint,
  alongShoreOf, tankDepth, tankLayout, tankRiderBounds,
  windOnsetScale, type RenderGrid, type SurfZoneConfig,
} from './SurfZoneSimulation';
import { BoussinesqSolver } from './BoussinesqSolver';
import { PSI_RANGE, REEF_OVERTURN, overturn, overturnParameter, reefOverturn } from './Overturn';
import { shallowWaterWaveNumber, shoalingCoefficient, waveKinematics } from './dispersion';
import { PADANG_SWELLS, PADANG_TIDES, REEF_SWELLS } from '../game/SurfConditions';
import { PADANG_PRACTICE_SWELL, PADANG_SPREADING, REEF_PRACTICE_SWELL } from '../game/PhysicalMode';
import { crestSpeedAt } from './CrestKinematics';
import { PhysicalSurfWater } from '../physics/PhysicalSurfWater';
import { PADANG_FRONT } from './barrel/barrelSpots';
import { TAKE_OFF_BAND } from './SurfMeter';
import { SideFeed } from './SideFeed';
import { JET_RELEASE_TIME, SOURCE_SHARE } from './PlungingLip';
import { libraryFromBytes } from './barrel/barrelLibrary';
import { readBarrelCases } from './barrel/nodeBarrelCases';
import type { FrontPoint } from './barrel/BreakingFront';
import { FRONT_FIELD, FRONT_STRIDE, writeFrontRecords } from './barrel/frontRecords';
import { ROLLER_FIELD, ROLLER_STRIDE } from './SpillingRoller';
import { CURL_CAPACITY, CURL_STRIDE } from './SpillingCurl';

const small_ = (): SurfZoneConfig => ({ ...small, spot: 'padang', alongShore: PADANG.alongShore });
const small: Omit<SurfZoneConfig, 'spot'> = {
  seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 10, spreading: 12, tide: 0,
  componentCount: 12, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
};

type SnapshotOutputs = [Float32Array, Float32Array, Float32Array];
interface SnapshotInternals {
  writeUniformFields(grid: RenderGrid, surface?: Float32Array, flow?: Float32Array, aeration?: Float32Array): void;
  velocityX?: Float64Array;
  velocityZ?: Float64Array;
  voidFractions?: Float64Array;
}
const snapshotInternals = (scene: SurfZoneSimulation): SnapshotInternals => scene as unknown as SnapshotInternals;
const snapshotOutputs = (grid: RenderGrid): SnapshotOutputs => [
  new Float32Array(grid.nx * grid.nz * 2), new Float32Array(grid.nx * grid.nz * 2), new Float32Array(grid.nx * grid.nz * 2),
];
function snapshotScene(): SurfZoneSimulation {
  const scene = new SurfZoneSimulation({ ...small, spot: 'padang' }, 'warm');
  const heights = [0, 0.00999999999999, 0.01, 0.01000000000001, 0.3, 1.2, -0, 2.7];
  for (let i = 0; i < scene.solver.h.length; i += 1) {
    scene.solver.h[i] = heights[i % heights.length];
    scene.solver.bed[i] = -0.5 - (i % 23) / 7;
    scene.solver.qx[i] = i % 11 === 0 ? -0 : ((i % 19) - 9) / 3;
    scene.solver.qz[i] = i % 13 === 0 ? 0 : ((i % 17) - 8) / 5;
    scene.foam.dense[i] = (i % 7) / 10;
    scene.foam.residual[i] = (i % 3) / 20;
    scene.aeration.depth[i] = (i % 5) / 10;
    scene.aeration.air[i] = scene.aeration.depth[i] * (i % 13) / 10;
  }
  return scene;
}
function expectSnapshotBits(a: ArrayBufferView, b: ArrayBufferView): void {
  expect(Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength))).toBe(true);
}
function expectSnapshotPair(a: SurfZoneSimulation, b: SurfZoneSimulation, aa: SnapshotOutputs, bb: SnapshotOutputs): void {
  for (let i = 0; i < aa.length; i += 1) expectSnapshotBits(aa[i], bb[i]);
  for (const key of ['h', 'bed', 'qx', 'qz'] as const) expectSnapshotBits(a.solver[key], b.solver[key]);
  for (const key of ['dense', 'residual'] as const) expectSnapshotBits(a.foam[key], b.foam[key]);
  for (const key of ['air', 'depth', 'turbulence'] as const) expectSnapshotBits(a.aeration[key], b.aeration[key]);
  for (const key of ['velocityX', 'velocityZ', 'voidFractions'] as const) {
    expect(snapshotInternals(a)[key]).toBeInstanceOf(Float64Array);
    expect(snapshotInternals(b)[key]).toBeInstanceOf(Float64Array);
    expectSnapshotBits(snapshotInternals(a)[key]!, snapshotInternals(b)[key]!);
  }
}

describe('SurfZoneSimulation', () => {
  it('writes the worker snapshot fields together with the same data as separate surface, air and current writers', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'padang' }, 'warm');
    for (let i = 0; i < simulation.solver.h.length; i += 1) {
      simulation.solver.h[i] = i % 13 === 0 ? 0 : 0.1 + (i % 17) / 4;
      simulation.solver.qx[i] = (i % 11) - 5;
      simulation.solver.qz[i] = (i % 19) - 9;
      simulation.foam.dense[i] = (i % 7) / 10;
      simulation.foam.residual[i] = (i % 3) / 20;
      simulation.aeration.depth[i] = (i % 5) / 10;
      simulation.aeration.air[i] = simulation.aeration.depth[i] * (i % 3) / 10;
    }
    for (const spacing of [1, 2, 3]) {
      const grid = simulation.renderGrid(spacing);
      const n = grid.nx * grid.nz * 2;
      const surface = new Float32Array(n);
      const flow = new Float32Array(n);
      const air = new Float32Array(n);
      const together = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
      simulation.writeUniformSurface(surface, grid, false);
      simulation.writeUniformFlow(flow, grid);
      simulation.writeUniformAeration(air, grid);
      simulation.writeUniformSnapshot(together[0], together[1], together[2], grid);
      expect(together).toEqual([surface, flow, air]);
      expect(together.every((field) => field.every(Number.isFinite))).toBe(true);
    }
  });

  it('writes a roller\'s lens tops in the worker snapshot exactly as the per-node writer does (the M1 CPU study)', () => {
    const scene = new SurfZoneSimulation({ ...small, spot: 'canyon', alongShore: 40, dx: 1, fineSpacing: 1 }, 'warm');
    const { solver } = scene;
    const roller = scene.roller!;
    expect(roller).toBeDefined();
    for (let i = 0; i < solver.h.length; i += 1) {
      solver.h[i] = i % 29 === 0 ? 0.005 : 0.5 + (i % 17) / 5;
      solver.bed[i] = -solver.h[i] + 0.3 * Math.sin(i * 0.37);
      scene.foam.dense[i] = (i % 7) / 10;
      scene.aeration.depth[i] = (i % 5) / 10;
      scene.aeration.air[i] = scene.aeration.depth[i] * (i % 3) / 10;
    }
    // Lenses in two slots of most columns, some empty or ending mid-table, across the fine zone.
    const zone = solver.zCenters[solver.nz - 1] - solver.zCenters[0];
    for (let column = 0; column < solver.nx; column += 1) {
      for (let slot = 0; slot < 2; slot += 1) {
        if ((column + slot) % 5 === 0) continue;
        const o = (slot * solver.nx + column) * ROLLER_STRIDE;
        roller.table[o + ROLLER_FIELD.crest] = solver.zCenters[0] + zone * (0.3 + 0.4 * slot) + 0.7 * Math.sin(column * 0.3);
        roller.table[o + ROLLER_FIELD.length] = 3 + (column % 4);
        roller.table[o + ROLLER_FIELD.scale] = 0.4 + 0.1 * (column % 6);
        roller.table[o + ROLLER_FIELD.thickness] = 0.3;
      }
    }
    const lenses = roller.table.slice();
    for (const spacing of [1, 2, 0.5]) {
      roller.table.set(lenses);
      const grid = scene.renderGrid(spacing);
      const separate = snapshotOutputs(grid);
      const together = snapshotOutputs(grid);
      snapshotInternals(scene).writeUniformFields(grid, ...separate);
      scene.writeUniformSnapshot(...together, grid);
      for (let k = 0; k < 3; k += 1) expectSnapshotBits(together[k], separate[k]);
      const plain = snapshotOutputs(grid);
      roller.table.fill(0);
      scene.writeUniformSnapshot(...plain, grid);
      // The lenses did raise some tops.
      expect(plain[0].some((value, k) => value !== together[0][k])).toBe(true);
    }
  });

  it('preserves dynamic void fraction receivers, replacement and preprocessing before snapshot output', () => {
    const prepare = () => {
      const scene = snapshotScene();
      const grid = { ...scene.renderGrid(2), nx: 8, nz: 4 };
      const out = snapshotOutputs(grid);
      for (const field of out) field.fill(123.25);
      const calls: Array<[number, string, boolean, number[], number | undefined]> = [];
      const original = scene.aeration.voidFraction;
      function later(this: typeof scene.aeration, cell: number): number {
        calls.push([cell, 'later', this === scene.aeration, out.map(field => field[0]), snapshotInternals(scene).velocityX?.[cell]]);
        scene.solver.bed[cell] -= 0.0125;
        this.depth[cell] += 0.001;
        return original.call(this, cell);
      }
      scene.aeration.voidFraction = function(this: typeof scene.aeration, cell: number): number {
        calls.push([cell, 'first', this === scene.aeration, out.map(field => field[0]), snapshotInternals(scene).velocityX?.[cell]]);
        scene.solver.bed[cell] -= 0.025;
        if (cell + 1 < scene.solver.qx.length) scene.solver.qx[cell + 1] += 0.125;
        if (cell === 2) this.voidFraction = later;
        return original.call(this, cell);
      };
      return { scene, grid, out, calls };
    };
    const a = prepare(); const b = prepare();
    snapshotInternals(a.scene).writeUniformFields(a.grid, ...a.out);
    b.scene.writeUniformSnapshot(...b.out, b.grid);
    expect(b.calls).toEqual(a.calls);
    expect(b.calls).toHaveLength(b.scene.solver.h.length);
    expect(b.calls.every((row, index) => row[0] === index && row[2] && row[3].every(value => value === 123.25))).toBe(true);
    expect(b.calls.every(row => typeof row[4] === 'number')).toBe(true);
    expect(b.calls.slice(0, 4).map(row => row[1])).toEqual(['first', 'first', 'first', 'later']);
    expectSnapshotPair(a.scene, b.scene, a.out, b.out);
  });

  it('preserves snapshot bits and store order with overlapping outputs and output input aliases', () => {
    for (const kind of ['same', 'overlap', 'input'] as const) {
      const a = snapshotScene(); const b = snapshotScene();
      const grid = { ...a.renderGrid(2), nx: 3, nz: 4, xMin: a.solver.xCenters[0], zMin: a.solver.zCenters[0] };
      const n = grid.nx * grid.nz * 2;
      const prepare = (scene: SurfZoneSimulation): { views: SnapshotOutputs; backing: Uint8Array } => {
        if (kind === 'input') return {
          views: [new Float32Array(scene.solver.h.buffer, scene.solver.h.byteOffset, n),
            new Float32Array(scene.solver.bed.buffer, scene.solver.bed.byteOffset, n),
            new Float32Array(scene.aeration.depth.buffer, scene.aeration.depth.byteOffset, n)],
          backing: new Uint8Array(scene.solver.h.buffer, scene.solver.h.byteOffset, scene.solver.h.byteLength),
        };
        const backing = new ArrayBuffer((n + 4) * 4);
        if (kind === 'same') {
          const view = new Float32Array(backing, 0, n);
          return { views: [view, view, view], backing: new Uint8Array(backing) };
        }
        return { views: [new Float32Array(backing, 0, n), new Float32Array(backing, 8, n), new Float32Array(backing, 16, n)],
          backing: new Uint8Array(backing) };
      };
      const aa = prepare(a); const bb = prepare(b);
      snapshotInternals(a).writeUniformFields(grid, ...aa.views);
      b.writeUniformSnapshot(...bb.views, grid);
      expectSnapshotBits(aa.backing, bb.backing);
      expectSnapshotPair(a, b, aa.views, bb.views);
    }
  });

  it('allocates snapshot scratch for every source cell and reuses it across repeated render layouts', () => {
    const a = snapshotScene(); const b = snapshotScene();
    for (const scene of [a, b]) for (const key of ['velocityX', 'velocityZ', 'voidFractions'] as const) {
      expect(snapshotInternals(scene)[key]).toBeUndefined();
    }
    const grid = { ...a.renderGrid(2), nx: 8, nz: 4 };
    let aa = snapshotOutputs(grid); let bb = snapshotOutputs(grid);
    snapshotInternals(a).writeUniformFields(grid, ...aa);
    b.writeUniformSnapshot(...bb, grid);
    expectSnapshotPair(a, b, aa, bb);
    const identities = [a, b].map(scene => ({ ...snapshotInternals(scene) }));
    for (const scene of [a, b]) for (const key of ['velocityX', 'velocityZ', 'voidFractions'] as const) {
      expect(snapshotInternals(scene)[key]!.length).toBe(scene.solver.h.length);
    }
    for (const spacing of [1, 2, 3]) {
      const changed = { ...a.renderGrid(spacing), nx: 5, nz: 7 };
      aa = snapshotOutputs(changed); bb = snapshotOutputs(changed);
      snapshotInternals(a).writeUniformFields(changed, ...aa);
      b.writeUniformSnapshot(...bb, changed);
      expectSnapshotPair(a, b, aa, bb);
      for (const [index, scene] of [a, b].entries()) for (const key of ['velocityX', 'velocityZ', 'voidFractions'] as const) {
        expect(snapshotInternals(scene)[key]).toBe(identities[index][key]);
      }
    }
  });

  it('feeds a sea\'s sides with the incoming sea when its config asks, on the clock of a handed-over sea (wave sizes)', () => {
    const simulation = new SurfZoneSimulation({ ...small_(), sideFeed: true }, 'warm');
    const feed = simulation.solver.relaxationZones.find((zone) => zone instanceof SideFeed) as SideFeed | undefined;
    expect(feed).toBeDefined();
    const donor = new SurfZoneSimulation({ ...small_(), startSeaTime: 500 }, 'warm');
    const state = donor.exportState();
    simulation.importState(state);
    expect(feed!.timeOffset).toBe(state.seaTimeOffset);
  });

  // No spot's sides are fed by default (the owner, 2026-10-07: Padang Padang's feed shed two-way crests and spun up a
  // current, while its open sides held their height: docs/research/padang-side-feed-2026-10-08.md).
  it('feeds no spot\'s sides by default, Padang Padang\'s included', () => {
    expect(SIDE_FEED_SPOTS).toEqual([]);
    for (const config of [...(['beach', 'point', 'reef', 'canyon'] as const).map((spot) => ({ ...small, spot })), small_()]) {
      const simulation = new SurfZoneSimulation(config, 'warm');
      expect(simulation.solver.relaxationZones.some((zone) => zone instanceof SideFeed), config.spot).toBe(false);
    }
  });

  it('takes the Reef\'s buoy swell in deep water, shoaled to its 30 m edge, and the Canyon\'s at its edge', () => {
    expect(edgeHeight({ ...small, spot: 'reef', significantHeight: 3, peakPeriod: 18 }, OFFSHORE_DEPTH.reef))
      .toBeCloseTo(3 * shoalingCoefficient(18, OFFSHORE_DEPTH.reef + small.tide), 9);
    expect(edgeHeight({ ...small, spot: 'canyon', significantHeight: 3, peakPeriod: 18 })).toBe(3);
    // A deeper Canyon edge takes the same sea de-shoaled to it: its sizes are given at CANYON_SWELL_DEPTH (canyon-big).
    expect(edgeHeight({ ...small, spot: 'canyon', significantHeight: 2.4, peakPeriod: 14 }, 7.9)).toBeCloseTo(
      (2.4 * shoalingCoefficient(14, 7.9 + small.tide)) / shoalingCoefficient(14, CANYON_SWELL_DEPTH + small.tide), 12,
    );
    expect(edgeHeight({ ...small, spot: 'canyon', significantHeight: 2.4, peakPeriod: 14 }, 7.9)).toBeLessThan(2.4);
  });

  it('keeps the water finite on the biggest swells the Reef and today\'s Point tank can be given (wave sizes review)', () => {
    // The Reef at its 3 m cap and the Point on today's 8 m tank (2.4 m, shoaled to ~3.1 m), 18 s at high tide.
    // (The Reef at 3 m / 18 s / high tide already blew up with seed 3 before the wave-sizes work; its tank is the Reef rework's.)
    const big = { ...small, peakPeriod: 18, tide: 1, alongShore: 40, dx: 1, fineSpacing: 1, componentCount: 32 };
    for (const config of [
      { ...big, seed: 1, spot: 'reef' as const, significantHeight: 3 },
      { ...big, seed: 1, spot: 'point' as const, significantHeight: 2.4 },
      { ...big, seed: 3, spot: 'point' as const, significantHeight: 2.4 },
    ]) {
      const simulation = new SurfZoneSimulation(config);
      for (let frame = 0; frame < 30 * 30; frame += 1) simulation.step(1 / 30);
      for (const value of simulation.solver.h) expect(Number.isFinite(value)).toBe(true);
    }
  }, 600_000);

  it('takes a buoy height in deep water and shoals it to the tank\'s edge (wave sizes)', () => {
    const config: SurfZoneConfig = { ...small, spot: 'point', significantHeight: 2, peakPeriod: 12 };
    expect(edgeHeight(config)).toBeCloseTo(2 * shoalingCoefficient(12, OFFSHORE_DEPTH.point), 12);
    expect(surfZoneSea(config).components[0].amplitude).toBeCloseTo(edgeHeight(config) / Math.sqrt(8 * small.componentCount!), 12);
    // Practice gives its height at the edge, and the Canyon always takes its swell there: their seas stay as they were.
    expect(edgeHeight({ ...config, heightAt: 'edge' })).toBe(2);
    expect(edgeHeight({ ...config, spot: 'canyon' })).toBe(2);
  });

  it('warm-starts so the spun-up sea sits at a chosen sea time (a room\'s clock)', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'canyon', stage: 1, startSeaTime: 500 });
    expect(simulation.seaTime).toBeCloseTo(500, 6);
    const early = new SurfZoneSimulation({ ...small, spot: 'canyon', stage: 1, startSeaTime: 3 });
    expect(early.seaTime).toBeCloseTo(3, 6);
  });

  it('builds a finite, wave-filled surf zone for every spot and hands over before the set', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon', 'padang'] as const) {
      const simulation = new SurfZoneSimulation({ ...small, spot });
      const { solver } = simulation;
      let finite = true;
      let largest = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        finite &&= Number.isFinite(solver.h[i]) && solver.h[i] >= 0 && Number.isFinite(solver.qz[i]);
        const z = solver.zCenters[Math.floor(i / solver.nx)];
        if (z > TANK.zoneInner && z < TANK.blendEnd && solver.h[i] > 0) largest = Math.max(largest, Math.abs(solver.surfaceAt(i)));
      }
      expect(finite).toBe(true);
      expect(largest).toBeGreaterThan(0.25 * small.significantHeight);
      expect(simulation.timeToSet).toBeCloseTo(25, 6);
    }
  });

  it('runs Padang Padang on stage 2 whatever the config asks, forcing the solver’s own waves at its boundary', () => {
    expect(solverStage('padang', 1)).toBe(2);
    const padang = new SurfZoneSimulation({ ...small, spot: 'padang', stage: 1 });
    expect(padang.solver).toBeInstanceOf(BoussinesqSolver);
    const omega = padang.sea.components[0].omega;
    expect(padang.sea.components[0].k).toBeCloseTo(madsenSorensenWaveNumber(omega, padang.sea.depth), 10);
  });

  // The peak-sizing fix (2026-10-01): the front sizes a crest within 1 m shallower than the 7 m foot, so it must see each
  // crest before the foot. At the peak the fine zone starts 3.7–6 m deep on Practice and Small.
  it('follows Padang Padang’s crests from the relaxation zone’s edge, deeper than its foot all along the window, at every swell and tide', () => {
    const bed = createSpot('padang', 1);
    const swells = [{ ...PADANG_PRACTICE_SWELL, heightAt: 'edge' as const }, ...Object.values(PADANG_SWELLS)];
    for (const swell of swells) {
      for (const tide of Object.values(PADANG_TIDES)) {
        const config: SurfZoneConfig = { ...small, spot: 'padang', alongShore: PADANG.alongShore, tide, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod };
        const layout = tankLayout(config);
        const from = barrelFrontFrom(config, layout);
        expect(from).toBe(layout.zoneInner);
        for (let x = -PADANG.alongShore / 2; x <= PADANG.alongShore / 2; x += 5) {
          expect(tankDepth(bed, layout.edgeDepth, x, from, layout), `x ${x}`).toBeGreaterThan(PADANG.baseDepth);
        }
        // The rows before the fix, kept for the probe's comparison.
        expect(barrelFrontFrom({ ...config, barrelFrontFrom: 'fine' }, layout)).toBe(layout.fineFrom);
      }
    }
  });

  // The crest jumps (the advisor, 2026-10-01): Padang Padang's maxima jump forward as its faces steepen, as the Reef's do.
  it('builds Padang Padang’s front to follow its crests’ jumps within 10 m, with no join past the throw depth', () => {
    expect(PADANG_FRONT).toEqual({ jumpReach: 10 });
    const optionsOf = (config: SurfZoneConfig) => (new SurfZoneSimulation(config, 'warm').front as unknown as { options: object }).options;
    expect(optionsOf(small_())).toBe(PADANG_FRONT);
    // A probe's override: none, as before the rule.
    expect(optionsOf({ ...small_(), barrelFront: {} })).toEqual({});
  });

  it('gives Padang Padang a tank beyond its forereef whose fine zone reaches past its sets’ first break at every tide', () => {
    const bed = createSpot('padang', 1);
    const swells = [{ ...PADANG_PRACTICE_SWELL, heightAt: 'edge' as const }, ...Object.values(PADANG_SWELLS)];
    for (const swell of swells) {
      for (const tide of Object.values(PADANG_TIDES)) {
        const config: SurfZoneConfig = { ...small, spot: 'padang', alongShore: PADANG.alongShore, tide, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod };
        const layout = tankLayout(config);
        expect(layout.edgeDepth).toBe(PADANG.deep);
        // The blend onto the spot's bed lies on the deep water beyond the forereef's foot.
        expect(layout.blendEnd).toBeLessThanOrEqual(padangForeFootZ() + 1e-9);
        const sets = Math.min(0.9 * (PADANG.deep + tide), (SETS_OVER_TYPICAL * komarGaughan(swell.significantHeight, swell.peakPeriod)) / BREAKER_INDEX);
        for (let x = -PADANG.alongShore / 2; x <= PADANG.alongShore / 2; x += 5) {
          let z = layout.shore;
          while (z > -2000 && bed.depthAt(x, z) + tide < sets) z -= 1;
          expect(z, `x ${x}`).toBeGreaterThanOrEqual(layout.fineFrom + SET_FINE_MARGIN - 1);
        }
        expect(layout.blendEnd).toBeLessThanOrEqual(layout.fineFrom - 20);
        expect(layout.zoneInner - layout.offshore).toBeGreaterThanOrEqual(ZONE_WAVELENGTHS * waveKinematics(swell.peakPeriod, layout.edgeDepth).wavelength - 1e-9);
      }
    }
  });

  // The root cause of Part A's peel discrepancy: a linear sea injected where it is strongly nonlinear releases free
  // harmonics and keeps changing shape (Schäffer 1996). Schäffer's S = 4 a2/a1, the bound second harmonic over the
  // first at Hm0 and Tp (Stokes, finite depth), is acceptable for first-order generation up to 1.2 (Eldrup & Andersen
  // 2019, table 2). On the 10 m platform a 3 m, 18 s swell reached S ≈ 3.8.
  it('injects Padang Padang’s sea where first-order generation holds: Schäffer’s S at the edge is at most 1.2 for every swell', () => {
    for (const swell of Object.values(PADANG_SWELLS)) {
      const config: SurfZoneConfig = { ...small_(), significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod };
      const layout = tankLayout(config);
      const a1 = edgeHeight(config, layout.edgeDepth) / 2;
      const { wavelength } = waveKinematics(swell.peakPeriod, layout.edgeDepth);
      const kh = ((2 * Math.PI) / wavelength) * layout.edgeDepth;
      const a2OverA1 = (((2 * Math.PI) / wavelength) * a1 / 4) * Math.cosh(kh) * (2 + Math.cosh(2 * kh)) / Math.sinh(kh) ** 3;
      expect(4 * a2OverA1, `Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s`).toBeLessThanOrEqual(1.2);
    }
  });

  it('finds Padang Padang’s break on its wedge inside the fine surf zone, and it plunges', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'padang', alongShore: PADANG.alongShore, significantHeight: PADANG_SWELLS.small.significantHeight, peakPeriod: PADANG_SWELLS.small.peakPeriod });
    const point = simulation.breakPoint();
    const bed = (z: number) => tankDepth(simulation.spot, OFFSHORE_DEPTH.padang, point.x, z, simulation.tank);
    expect(point.z).toBeGreaterThan(simulation.tank.fineFrom);
    expect(bed(point.z)).toBeGreaterThan(PADANG.crestDepth);
    expect(bed(point.z)).toBeLessThan(PADANG.baseDepth);
    expect(simulation.iribarren().type).toBe('plunging');
  });

  // The wave-sizes spec's Q11: the take-off follows the measured break (docs/research/size-report.md, seed 1, mid tide).
  it('seats Padang Padang’s take-off within 15 m of where each swell’s sets broke in the size report', () => {
    const measured = [
      { swell: { ...PADANG_PRACTICE_SWELL, heightAt: 'edge' as const }, setBreakZ: -176 },
      { swell: PADANG_SWELLS.small, setBreakZ: -194 },
      { swell: PADANG_SWELLS.medium, setBreakZ: -216 },
      { swell: PADANG_SWELLS.big, setBreakZ: -266 },
    ];
    for (const { swell, setBreakZ } of measured) {
      const point = takeOffPoint({
        ...small, seed: 1, spot: 'padang', alongShore: PADANG.alongShore, tide: 0, significantHeight: swell.significantHeight,
        peakPeriod: swell.peakPeriod, ...('heightAt' in swell ? { heightAt: swell.heightAt } : {}),
      });
      expect(Math.abs(point.z - setBreakZ), `Hs ${swell.significantHeight} m`).toBeLessThanOrEqual(15);
    }
  });

  // Review Focus 5.
  it('takes off at Padang Padang’s peak, where every swell breaks at every tide, never on the dry flat or in the channel', () => {
    const swells = [{ ...PADANG_PRACTICE_SWELL, heightAt: 'edge' as const }, ...Object.values(PADANG_SWELLS)];
    for (const swell of swells) {
      for (const tide of Object.values(PADANG_TIDES)) {
        const config: SurfZoneConfig = {
          ...small, spot: 'padang', alongShore: PADANG.alongShore, tide, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
          ...('heightAt' in swell ? { heightAt: swell.heightAt } : {}),
        };
        const tank = tankLayout(config);
        const point = takeOffPoint(config);
        const depth = tankDepth(createSpot('padang', 1), tank.edgeDepth, point.x, point.z, tank) + tide;
        expect(point.x).toBe(PADANG.takeOffX);
        expect(padangReefAt(point.x)).toBe(true);
        expect(depth).toBeGreaterThanOrEqual(0.4 * breakerDepthFor(edgeHeight(config, tank.edgeDepth), tank.edgeDepth + tide));
        expect(depth).toBeLessThan(PADANG.baseDepth + tide);
      }
    }
  });

  it('measures Padang Padang’s peel on its reef only', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'padang', alongShore: PADANG.alongShore });
    const xs = simulation.solver.xCenters;
    for (let column = 0; column < xs.length; column += 1) expect(simulation.peel.measures(column)).toBe(padangReefAt(xs[column]));
  });

  it('runs the Reef on stage 2 whatever the config asks, forcing the solver’s own waves at its boundary', () => {
    expect(solverStage('reef', 1)).toBe(2);
    expect(solverStage('beach', 1)).toBe(1);
    expect(solverStage('canyon', undefined)).toBe(2);
    const reef = new SurfZoneSimulation({ ...small, spot: 'reef', stage: 1 });
    expect(reef.solver).toBeInstanceOf(BoussinesqSolver);
    const omega = reef.sea.components[0].omega;
    expect(reef.sea.components[0].k).toBeCloseTo(madsenSorensenWaveNumber(omega, reef.sea.depth), 10);
    const beach = new SurfZoneSimulation({ ...small, spot: 'beach' });
    expect(beach.sea.components[0].k).toBe(shallowWaterWaveNumber(beach.sea.components[0].omega, beach.sea.depth));
  });

  it('spins up the menu\'s first Reef on the GPU tier\'s sea without blowing up', () => {
    // The practice groundswell, 64 components and seed 1: at a quarter second between stability checks,
    // a trough drained a reef cell to 7 cm with 112 m/s of backwash and the spin-up diverged at 2.25 s.
    const simulation = new SurfZoneSimulation({
      spot: 'reef', seed: 1, significantHeight: 2, peakPeriod: 12, directionDegrees: 10, spreading: 40, bandwidth: 0.08,
      tide: 0, windSpeed: 0, stage: 2, componentCount: 64,
    });
    const { solver } = simulation;
    let deepest = 0;
    for (let i = 0; i < solver.h.length; i += 1) deepest = Math.max(deepest, solver.h[i]);
    // No column stands more than 10 m above the tank's floor (the runaway piled water far higher).
    expect(deepest).toBeLessThan(OFFSHORE_DEPTH.reef + 10);
    expect(solver.maxStableStep()).toBeGreaterThan(1e-3);
  }, 180_000);

  describe('spinning up after the build (the worker spins up on its GPU)', () => {
    const sameWater = (a: SurfZoneSimulation, b: SurfZoneSimulation) => {
      expect(a.solver.time).toBe(b.solver.time);
      expect(Array.from(a.solver.h)).toEqual(Array.from(b.solver.h));
      expect(Array.from(a.solver.qx)).toEqual(Array.from(b.solver.qx));
      expect(Array.from(a.solver.qz)).toEqual(Array.from(b.solver.qz));
    };
    const sameSea = (a: SurfZoneSimulation, b: SurfZoneSimulation) => {
      sameWater(a, b);
      expect(a.exportState()).toEqual(b.exportState());
      expect(a.breaking.strength).toEqual(b.breaking.strength);
      expect(a.whitewaterStrength).toEqual(b.whitewaterStrength);
      expect(a.aeration.turbulence).toEqual(b.aeration.turbulence);
      expect(a.lipImpacts).toEqual(b.lipImpacts);
      expect(a.frontPauses).toBe(b.frontPauses);
      expect(a.crash?.counts).toEqual(b.crash?.counts);
    };

    it('warms the complete swept sea to the same state as ordinary requested steps, including device feedback and fallback', async () => {
      // Big's swell, on the small test grid: real front/jet evolution, not a seated rider or a native GPU proof.
      const config: SurfZoneConfig = { ...small, ...PADANG_SWELLS.big, spot: 'padang', seed: 1, spinUpPeriods: 2 };
      const library = libraryFromBytes(readBarrelCases('padang'));
      const duration = config.spinUpPeriods! * config.peakPeriod;
      const reference = new SurfZoneSimulation(config, 'warm', library);
      while (reference.solver.time < duration - 1e-9) {
        reference.step(Math.min(reference.solver.maxStableStep(), duration - reference.solver.time));
      }
      expect(reference.solver.time).toBe(duration);
      expect(reference.front!.exportState().tracks.some(({ footHeight }) => footHeight !== null)).toBe(true);
      expect(reference.front!.points.length).toBeGreaterThan(0);
      expect(reference.crash!.counts.throws).toBeGreaterThan(0);
      expect(reference.crash!.counts.crashes).toBeGreaterThan(0);
      expect(reference.foam.dense.some((value) => value > 0)).toBe(true);
      expect(reference.aeration.air.some((value) => value > 0)).toBe(true);
      sameSea(new SurfZoneSimulation(config, 'spun-up', library), reference);
      for (const failAt of [Infinity, 11]) {
        const warm = new SurfZoneSimulation(config, 'warm', library);
        let calls = 0;
        let disposed = 0;
        let landed = 0;
        let carriedPlunge = 0;
        const waterStarts: number[] = [];
        const incomingImpacts: number[] = [];
        const stable: boolean[] = [];
        const tell = warm.lip.onLand!;
        warm.lip.onLand = (...args) => { landed += args[2]; tell(...args); };
        const prepareStep = vi.fn(async () => undefined);
        warm.device = {
          step: async (dt) => {
            calls += 1;
            waterStarts.push(warm.solver.time);
            incomingImpacts.push(warm.lipImpacts.length);
            stable.push(dt <= warm.solver.maxStableStep());
            if ((warm.solver as BoussinesqSolver).plungeHold.some((value) => value > 0)) carriedPlunge += 1;
            if (calls === failAt) throw new Error('device lost before this water interval');
            warm.solver.step(dt);
          },
          prepareStep,
          dispose: () => { disposed += 1; },
        };
        warm.enableSoloWaterPrefetch();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try { await warm.spinUp(); } finally { warn.mockRestore(); }
        expect(calls).toBeGreaterThan(10);
        expect(stable.every(Boolean)).toBe(true);
        expect(incomingImpacts.every((count) => count === 0)).toBe(true);
        expect(landed).toBeGreaterThan(0);
        expect(prepareStep).not.toHaveBeenCalled();
        expect(warm.hasWaterPrefetch).toBe(false);
        expect(disposed).toBe(failAt === Infinity ? 0 : 1);
        expect(warm.device === undefined).toBe(failAt !== Infinity);
        if (failAt === Infinity) expect(carriedPlunge).toBeGreaterThan(0);
        sameSea(warm, reference);
        // Spin-up is idempotent at the boundary: no new water request or feedback interval after handover.
        const state = warm.exportState();
        const costs = { ...warm.stepCosts };
        const completedCalls = calls;
        await warm.spinUp();
        expect(calls).toBe(completedCalls);
        expect(warm.exportState()).toEqual(state);
        expect(warm.stepCosts).toEqual(costs);
        expect(waterStarts.every((time, k) => k === 0 || time > waterStarts[k - 1])).toBe(true);
        expect(waterStarts.every((time) => time < duration)).toBe(true);
      }
    });

    it('does not step a zero-duration startup or consume a staged future-water interval', async () => {
      const simulation = new SurfZoneSimulation({ ...small, spot: 'padang', spinUpPeriods: 0 }, 'warm');
      const state = simulation.exportState();
      const step = vi.fn(async () => {});
      const commit = vi.fn(() => true);
      const discard = vi.fn();
      const prepareStep = vi.fn(async () => ({ commit, discard }));
      simulation.device = { step, prepareStep, dispose() {} };
      simulation.enableSoloWaterPrefetch();
      simulation.prefetchWater(1 / 60);
      await prepareStep.mock.results[0].value;
      expect(simulation.hasWaterPrefetch).toBe(true);
      await simulation.spinUp();
      expect(prepareStep).toHaveBeenCalledExactlyOnceWith(1 / 60);
      expect(discard).toHaveBeenCalledTimes(1);
      expect(commit).not.toHaveBeenCalled();
      expect(step).not.toHaveBeenCalled();
      expect(simulation.hasWaterPrefetch).toBe(false);
      expect(simulation.exportState()).toEqual(state);
      expect(simulation.seaTime).toBe(simulation.plan.warmStartSeaTime);
    });

    it('builds warm, then spins up to the same sea as a build that spins up at once', async () => {
      const eager = new SurfZoneSimulation({ ...small, spot: 'point' });
      const warm = new SurfZoneSimulation({ ...small, spot: 'point' }, 'warm');
      expect(warm.solver.time).toBe(0);
      await warm.spinUp();
      sameSea(warm, eager);
      for (let step = 0; step < 30; step += 1) {
        eager.step(1 / 60);
        warm.step(1 / 60);
      }
      sameSea(warm, eager);
      expect(Array.from(warm.breaking.strength)).toEqual(Array.from(eager.breaking.strength));
      expect(Array.from(warm.foam.dense)).toEqual(Array.from(eager.foam.dense));
    });

    it('spins up on its device, one stable substep a call', async () => {
      const eager = new SurfZoneSimulation({ ...small, spot: 'point' });
      const warm = new SurfZoneSimulation({ ...small, spot: 'point' }, 'warm');
      const steps: number[] = [];
      let overshoots = 0;
      // A stand-in device that takes the CPU solver's own step.
      warm.device = {
        step: async (dt: number) => {
          if (dt > warm.solver.maxStableStep()) overshoots += 1;
          steps.push(dt);
          warm.solver.step(dt);
        },
        dispose() {},
      };
      await warm.spinUp();
      expect(steps.length).toBeGreaterThan(20);
      expect(overshoots).toBe(0);
      sameSea(warm, eager);
    });

    it('finishes the spin-up on the CPU when its device fails partway', async () => {
      const eager = new SurfZoneSimulation({ ...small, spot: 'point' });
      const warm = new SurfZoneSimulation({ ...small, spot: 'point' }, 'warm');
      let calls = 0;
      let disposed = false;
      warm.device = {
        step: async (dt: number) => {
          calls += 1;
          if (calls > 10) throw new Error('device lost');
          warm.solver.step(dt);
        },
        dispose: () => { disposed = true; },
      };
      const warn = console.warn;
      console.warn = () => {};
      try {
        await warm.spinUp();
      } finally {
        console.warn = warn;
      }
      expect(disposed).toBe(true);
      expect(warm.device).toBeUndefined();
      sameSea(warm, eager);
    });
  });

  it('drops a failing device and steps that frame on the CPU', async () => {
    const reference = new SurfZoneSimulation({ ...small, spot: 'point' });
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point' });
    let disposed = false;
    simulation.device = { step: () => Promise.reject(new Error('device lost')), dispose: () => { disposed = true; } };
    const warn = console.warn;
    console.warn = () => {};
    try {
      await simulation.stepAsync(1 / 60);
    } finally {
      console.warn = warn;
    }
    reference.step(1 / 60);
    expect(disposed).toBe(true);
    expect(simulation.device).toBeUndefined();
    expect(Array.from(simulation.solver.h)).toEqual(Array.from(reference.solver.h));
    expect(simulation.solver.time).toBe(reference.solver.time);
  });

  it('replays a seed exactly and changes with another', () => {
    const run = (seed: number) => {
      const simulation = new SurfZoneSimulation({ ...small, spot: 'beach', seed });
      for (let frame = 0; frame < 30; frame += 1) simulation.step(1 / 30);
      return Array.from(simulation.solver.h);
    };
    expect(run(3)).toEqual(run(3));
    expect(run(4)).not.toEqual(run(3));
  });

  it('renders the surface it samples, with dry land tucked under the bed', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(data, grid);
    let wetChecked = 0;
    let dryChecked = 0;
    for (let iz = 0; iz < grid.nz; iz += 7) {
      for (let ix = 0; ix < grid.nx; ix += 3) {
        const x = grid.xMin + ix * grid.spacing;
        const z = grid.zMin + iz * grid.spacing;
        const height = data[(iz * grid.nx + ix) * 2];
        if (simulation.solver.sampleCentered(simulation.solver.h, x, z) > 0.01) {
          expect(height).toBeCloseTo(simulation.heightAt(x, z), 5);
          wetChecked += 1;
        } else {
          expect(height).toBeLessThan(simulation.bedAt(x, z));
          dryChecked += 1;
        }
      }
    }
    expect(wetChecked).toBeGreaterThan(100);
    expect(dryChecked).toBeGreaterThan(5);
  });

  it('finds the break line at the shoaled breaker depth', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const point = simulation.breakPoint();
    const depth = breakerDepthFor(edgeHeight(simulation.config), simulation.sea.depth);
    expect(simulation.breakerDepth()).toBeCloseTo(depth, 12);
    expect(tankDepth(simulation.spot, OFFSHORE_DEPTH.beach, point.x, point.z)).toBeCloseTo(depth, 1);
  });

  it('breaks waves in the surf zone, measures the peel and paints whitewater', () => {
    // Bores need the game's 1 m surf-zone cells; 2 m cells smear them below either breaking criterion.
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let broke = false;
    let estimate = simulation.peelEstimate();
    for (let frame = 0; frame < 20 * 30 && !(estimate && simulation.breakingFraction() > 0.02); frame += 1) {
      simulation.step(1 / 30);
      broke ||= simulation.breakingFraction() > 0;
      estimate = simulation.peelEstimate() ?? estimate;
    }
    expect(broke).toBe(true);
    expect(estimate).toBeDefined();
    expect(estimate!.angleDegrees).toBeGreaterThanOrEqual(0);
    expect(estimate!.angleDegrees).toBeLessThanOrEqual(90);
    for (const value of simulation.breaking.strength) expect(value).toBeLessThanOrEqual(1);
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(data, grid);
    let whitewater = 0;
    for (let k = 0; k < grid.nx * grid.nz; k += 1) if (data[k * 2 + 1] > 0.3) whitewater += 1;
    expect(whitewater).toBeGreaterThan(0);
    const iribarren = simulation.iribarren();
    expect(iribarren.value).toBeGreaterThan(0);
    expect(['spilling', 'plunging', 'surging']).toContain(iribarren.type);
  });

  it('keeps measuring peel while earlier bores are still crossing the surf zone', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let late = 0;
    for (let frame = 0; frame < 24 * 30; frame += 1) {
      simulation.step(1 / 30);
      if (frame > 12 * 30 && simulation.peelEstimate()) late += 1;
    }
    expect(late).toBeGreaterThan(30);
  }, 60_000);

  it('throws a lip from plunging point waves, once per wave, but not from a spilling beach', () => {
    const run = (config: SurfZoneConfig) => {
      const simulation = new SurfZoneSimulation(config);
      let broke = 0;
      for (let frame = 0; frame < 20 * 30; frame += 1) {
        simulation.step(1 / 30);
        if (simulation.breakingFraction() > 0) broke += 1;
      }
      return { simulation, broke };
    };
    const point = run({ ...small, spot: 'point', dx: 1, fineSpacing: 1, peakPeriod: 14, directionDegrees: 20, spreading: 24 });
    expect(point.simulation.iribarren().type).toBe('plunging');
    expect(point.simulation.lipLaunches).toBeGreaterThan(0);
    expect(point.simulation.lipLaunches).toBeLessThanOrEqual(point.simulation.solver.nx * Math.ceil(20 / (0.7 * 14)));
    expect(point.simulation.lip.landings).toBeGreaterThan(0);
    const beach = run({ ...small, spot: 'beach', dx: 1, fineSpacing: 1, peakPeriod: 6 });
    expect(beach.simulation.iribarren().type).toBe('spilling');
    expect(beach.broke).toBeGreaterThan(0);
    expect(beach.simulation.lipLaunches).toBe(0);
    expect(beach.simulation.lipJets).toBe(0);
    expect(beach.simulation.lipRollers).toBeGreaterThan(0);
  }, 60_000);

  it('spills at the Canyon at every size: no lip, no tube, and its foam follows the spilling front', () => {
    for (const [significantHeight, peakPeriod] of [[1.4, 11], [3, 14]]) {
      const simulation = new SurfZoneSimulation({
        ...small, spot: 'canyon', significantHeight, peakPeriod, directionDegrees: 0, spreading: PADANG_SPREADING, alongShore: CANYON.alongShore,
        dx: 1, fineSpacing: 1,
      });
      let broke = 0;
      for (let frame = 0; frame < 30 * 30; frame += 1) {
        simulation.step(1 / 30);
        if (simulation.breakingFraction() > 0) broke += 1;
      }
      expect(broke).toBeGreaterThan(0);
      expect(simulation.lipRollers).toBeGreaterThan(0);
      expect(simulation.lipJets).toBe(0);
      expect(simulation.lipLaunches).toBe(0);
      expect(simulation.lip.landings).toBe(0);
      expect(simulation.spilling!.started).toBeGreaterThan(0);
      // The whitewater only ever lowers the solver's breaking.
      const { whitewaterStrength, breaking } = simulation;
      for (let i = 0; i < whitewaterStrength.length; i += 1) expect(whitewaterStrength[i]).toBeLessThanOrEqual(breaking.strength[i]);
    }
  }, 600_000);

  it('draws the Canyon’s tubes from its own run where Big plunges, beside its spilling look, and changes nothing felt (2026-10-22)', () => {
    // Big's typical waves (2.4 m at 14 s): a tube where ξ_f ≥ 0.54 (foot crests to 1.98 m), the curl elsewhere.
    const config: SurfZoneConfig = {
      ...small, spot: 'canyon', significantHeight: 2.4, peakPeriod: 14, directionDegrees: 0, spreading: PADANG_SPREADING,
      alongShore: CANYON.alongShore, dx: 1, fineSpacing: 1,
    };
    const library = libraryFromBytes(readBarrelCases('canyon'));
    expect(library.cases.map((c) => c.id)).toEqual(['periodic-canyon23-a38-l13']);
    const tubes = new SurfZoneSimulation(config, 'warm', library);
    // `?canyonTube=off`: the Canyon as before its tubes were wired.
    const before = new SurfZoneSimulation({ ...config, sweptBarrel: false }, 'warm', library);
    expect(before.front).toBeUndefined();
    expect(tubes.front).toBeDefined();
    expect(tubes.crash).toBeUndefined();
    for (const simulation of [tubes, before]) {
      expect(simulation.spilling).toBeDefined();
      expect(simulation.roller).toBeDefined();
      expect(simulation.curl).toBeDefined();
    }
    expect(tubes.tubeFootMax).toBeCloseTo(1.98, 2);
    expect(tubes.tubeSpanned).toBe(true);
    const records = new Float32Array(FRONT_STRIDE * 4096);
    let drawn = 0;
    let curls = 0;
    let tubeColumns = 0;
    for (let frame = 0; frame < 30 * 30; frame += 1) {
      tubes.step(1 / 30);
      before.step(1 / 30);
      const count = tubes.writeTubeRecords(records);
      for (let k = 0; k < count; k += 1) expect(records[k * FRONT_STRIDE + FRONT_FIELD.footHeight]).toBeLessThanOrEqual(tubes.tubeFootMax);
      // Only pieces that have reached a wave height's span (the pods guard): no lone points.
      expect(count).toBeLessThanOrEqual(tubes.front!.points.filter((p) => p.tubeSpan === true).length);
      drawn += count;
      curls += tubes.writeCurls(new Float32Array(CURL_CAPACITY * CURL_STRIDE));
      tubeColumns += tubes.curl!.tube.reduce((sum, v) => sum + v, 0);
    }
    // Its front joins and draws tubes, the curl gives them their columns and draws the rest, and nothing is thrown.
    expect(tubes.front!.joins).toBeGreaterThan(0);
    expect(drawn).toBeGreaterThan(0);
    expect(tubeColumns).toBeGreaterThan(0);
    expect(curls).toBeGreaterThan(0);
    expect(tubes.lipJets).toBe(0);
    expect(tubes.lip.landings).toBe(0);
    // The water, its breaking and the felt whitewater are the same with the tubes and without: they are drawn and felt
    // by the rider, never poured into the sea.
    expect(Array.from(tubes.solver.h)).toEqual(Array.from(before.solver.h));
    expect(Array.from(tubes.whitewaterStrength)).toEqual(Array.from(before.whitewaterStrength));
  }, 1_800_000);

  it('throws each jet ahead of its crest, 1.15-1.8 times its speed, as measured jets leave (P7)', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, peakPeriod: 14, directionDegrees: 20, spreading: 24 });
    const launches: { speed: number; crest: number }[] = [];
    const launch = simulation.lip.launch.bind(simulation.lip);
    simulation.lip.launch = (cell, velocity, height, volume, crestSpeed) => {
      launches.push({ speed: Math.hypot(velocity.x, velocity.z), crest: crestSpeedAt(simulation.solver, cell)! });
      return launch(cell, velocity, height, volume, crestSpeed);
    };
    for (let frame = 0; frame < 20 * 30; frame += 1) simulation.step(1 / 30);
    expect(simulation.lipJets).toBeGreaterThan(0);
    expect(launches.length).toBeGreaterThan(0);
    for (const { speed, crest } of launches) {
      expect(speed / crest).toBeGreaterThan(1.15);
      expect(speed / crest).toBeLessThan(1.8);
    }
  }, 60_000);

  it('carves the void under a flying lip into the water the rider feels and the renderer draws (P7)', () => {
    const simulation = new SurfZoneSimulation({
      spot: 'reef', seed: 1, significantHeight: 1.5, peakPeriod: 12, directionDegrees: 0, spreading: 24, tide: 0,
      alongShore: 8, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 12,
    });
    const { solver } = simulation;
    const water = PhysicalSurfWater.forSimulation(simulation);
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    let carved = 0;
    for (let frame = 0; frame < 60 * 30 && carved === 0; frame += 1) {
      simulation.step(1 / 30);
      if (simulation.lip.airborneVolume() === 0) continue;
      simulation.writeUniformSurface(data, grid);
      for (let r = 0; r < grid.nz; r += 1) {
        for (let c = 0; c < grid.nx; c += 1) {
          const x = grid.xMin + c * grid.spacing;
          const z = grid.zMin + r * grid.spacing;
          const face = solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
          const floor = simulation.lip.carve(x, z, face);
          if (!(floor < face - 0.05)) continue;
          carved += 1;
          expect(simulation.heightAt(x, z)).toBeCloseTo(floor, 6);
          expect(data[(r * grid.nx + c) * 2]).toBeCloseTo(floor, 3);
          expect(water.surfaceAt(x, z)).toBeCloseTo(floor, 3);
        }
      }
    }
    expect(carved).toBeGreaterThan(0);
  }, 60_000);

  // Stage 2 still needs 1 m cells to break (P3a): every column's Small-swell break lies in the fine surf zone.
  it('builds the Reef on a 30 m tank that stays deep up to its forereef, with every break in the fine surf zone', () => {
    expect(OFFSHORE_DEPTH.reef).toBe(REEF.deep);
    const reef = createSpot('reef', 1);
    const breakDepth = breakerDepthFor(REEF_SWELLS.small.significantHeight, REEF.deep);
    for (let x = -80; x <= 80; x += 4) {
      for (let z = TANK.zoneInner; z <= REEF.shelfEdge - (REEF.deep - REEF.shelfDepth) / REEF.foreSlope; z += 1) {
        expect(tankDepth(reef, OFFSHORE_DEPTH.reef, x, z)).toBeCloseTo(REEF.deep, 3);
      }
      let z = TANK.zoneInner;
      while (tankDepth(reef, OFFSHORE_DEPTH.reef, x, z) > breakDepth) z += 0.5;
      expect(z).toBeGreaterThan(TANK.fineFrom);
    }
  });

  it('seats the Canyon take-off on its arm just downcoast of its peak, up its face where its waves break', () => {
    const canyon = createSpot('canyon', 1);
    // The straight-crest bed: each wave starts breaking at the arm's peak, so riders wait there, whatever the swell.
    expect(TAKE_OFF.canyon).toBe('peak');
    for (const [significantHeight, peakPeriod, directionDegrees] of [[1.4, 11, 0], [0.9, 9, -10], [2.4, 14, 10]]) {
      const config: SurfZoneConfig = { ...small, spot: 'canyon', alongShore: CANYON.alongShore, significantHeight, peakPeriod, directionDegrees };
      const tank = tankLayout(config);
      const bed = (x: number, z: number) => tankDepth(canyon, tank.edgeDepth, x, z, tank);
      const point = takeOffPoint(config);
      expect(point.x).toBe(CANYON.takeOffX);
      expect(canyonArmAt(point.x)).toBe(true);
      expect(point.x - CANYON.peakX).toBeGreaterThan(0);
      expect(point.x - CANYON.peakX).toBeLessThan(TAKE_OFF_EDGE_MARGIN);
      // Up the arm's face where it is as deep as this size's sets were measured starting to break.
      expect(bed(point.x, point.z)).toBeCloseTo(canyonTakeOffDepth(significantHeight), 1);
      expect(point.z).toBeLessThan(canyonBreakLineZ(point.x));
    }
    // Where nine in ten of each size's waves had started breaking in the take-off's column (canyon-long-wave, 2026-10-22,
    // 3 seeds × 14 periods): the sets, not the median wave (0.96 + 0.65 Hs until the owner's playtest of 2026-10-11). On
    // canyon-layout's short arm, on its fan, they were 2.19, 2.65 and 3.85 m (1.14 + 1.12 Hs); on the long arm 2.23, 2.69
    // and 3.82 m (1.24 + 1.07 Hs); on the 1:30 face below a 2.8 m hinge before it 2.26, 2.65 and 4.07 m (1.06 + 1.24 Hs).
    for (const [significantHeight, ninetiethDepth] of [[0.9, 2.43], [1.4, 2.85], [2.4, 3.91]]) {
      expect(Math.abs(canyonTakeOffDepth(significantHeight) - ninetiethDepth)).toBeLessThan(0.06);
    }
    // The planar arm's take-offs, 130–165 m from the waterline (canyon-long-wave; 134–174 m on the short arm's fan, 320–358 m
    // on the long arm).
    for (const [significantHeight, peakPeriod, z] of [[0.9, 9, -130], [1.4, 11, -141.5], [2.4, 14, -164.5]]) {
      expect(takeOffPoint({ ...small, spot: 'canyon', alongShore: undefined, significantHeight, peakPeriod, directionDegrees: 0 })).toEqual({ x: CANYON.takeOffX, z });
    }
  });

  it('starts the rider 11 m seaward of the take-off, at the Canyon\'s every size too, seaward of where its waves break', () => {
    // Every other spot, at every size, as before.
    expect(RIDE_LINEUP_OFFSET).toBe(11);
    for (const spot of ['beach', 'point', 'reef', 'padang', 'pool'] as const) {
      for (const significantHeight of [0.6, 0.9, 1.4, 2.4, 3.8]) expect(rideLineupOffset({ spot, significantHeight })).toBe(RIDE_LINEUP_OFFSET);
    }
    // The Canyon's Practice (1.4 m at the edge), Small and Medium keep today's start (the owner, 2026-10-12: "fine for now"),
    // and since canyon-long-wave Big's too (6 m out on the short arm's fan); never inside the take-off.
    for (const significantHeight of [0.6, 0.9, 1.4, 1.9, 2.4, 3]) expect(rideLineupOffset({ spot: 'canyon', significantHeight })).toBe(RIDE_LINEUP_OFFSET);
    for (const { offset } of CANYON_RIDE_LINEUP) expect(offset).toBeGreaterThanOrEqual(0);
    const canyon = createSpot('canyon', 1);
    const big: SurfZoneConfig = { ...small, spot: 'canyon', alongShore: CANYON.alongShore, significantHeight: 2.4, peakPeriod: 14, directionDegrees: 0 };
    const takeOff = takeOffPoint(big);
    const start = takeOff.z - rideLineupOffset(big);
    // Seaward of where one wave in ten starts breaking in the take-off's column (its x ± 4 m): 10 m seaward of the take-off
    // on the planar arm (2026-10-22: 66 waves, big-start's transect probe and the size report pooled; their median 10 m
    // inside it, 3.08 m deep), so 11 m out, about 4.37 m deep, 176 m from the waterline, on faces as steep as 6 m out
    // (12°). On the short arm's fan one in ten broke 6.0 m seaward and Big started 6 m out (4.08 m deep, 180 m out).
    const tank = tankLayout(big);
    const depth = (z: number) => tankDepth(canyon, tank.edgeDepth, takeOff.x, z, tank);
    expect(depth(start)).toBeGreaterThan(canyonTakeOffDepth(big.significantHeight));
    expect(depth(start)).toBeCloseTo(4.37, 1);
    expect(depth(start)).toBeGreaterThan(3.08);
    expect(-start).toBeCloseTo(175.5, 6);
  });

  // The `?canyonBed=old` dev switch (canyon-layout, 2026-10-22; repointed by canyon-long-wave): main's whole Canyon layout
  // until canyon-long-wave, canyon-layout's short arm on its fan, to ride the two side by side. The values are main's own
  // (bff9a874, read off its build with no `canyonBed`; the branch's 'old' reproduces every one exactly): its bed, window,
  // tank, rider bounds, take-offs, starts, curl and readout.
  it('rebuilds main\'s Canyon from before canyon-long-wave with `canyonBed: \'old\'`: its bed, window, take-off, start and curl, exactly', () => {
    expect(CANYON_OLD).toMatchObject({
      shoreSlope: 1 / 15, pathSlope: 1 / 23, hingeDepth: 2.2, fan: 15, peakX: -10, peakZ: -120, angle: 70, takeOffX: -2, zoneInner: -390, alongShore: 220,
      peelReach: 10, runOn: 0,
    });
    expect(Object.isFrozen(CANYON_OLD)).toBe(true);
    expect(CANYON_TAKE_OFF_DEPTH_OLD).toEqual({ base: 1.14, perMetre: 1.12 });
    expect(CANYON_RIDE_LINEUP_OLD.map(({ offset }) => offset)).toEqual([RIDE_LINEUP_OFFSET, RIDE_LINEUP_OFFSET, 6]);
    const old = createSpot('canyon', 1, { canyonBed: 'old' });
    const today = createSpot('canyon', 1);
    const depths: [number, number, number][] = [
      [-50, -150, 6], [-30, -200, 6], [-20, -180, 3.5], [-10, -130, 1.4347826086956523], [-10, -120, 1], [-2, -150, 2.8010949588668224],
      [-2, -100, 1.0622672240994664], [10, -120, 2.2747529621723226], [10, -60, 1], [20, -95, 2.025741407363205], [28, -40, 1.3767305850732359],
      [35, -60, 4], [40, -30, 2], [-60, -200, 6], [0, -40, 2], [-70, -350, 6], [70, -20, 1.3333333333333333], [5, -250, 6], [15, -170, 4.726247833415342],
    ];
    for (const [x, z, depth] of depths) expect(old.depthAt(x, z)).toBe(depth);
    // Today's layout differs on the arm (and only the Canyon's bed takes the switch).
    expect(today.depthAt(10, -120)).not.toBe(old.depthAt(10, -120));
    expect(createSpot('beach', 1, { canyonBed: 'old' }).depthAt(0, -200)).toBe(createSpot('beach', 1).depthAt(0, -200));
    // Main's window, tank, rider bounds, take-offs and starts at Small, Medium, Big and between.
    for (const [significantHeight, peakPeriod, z, offset] of [[0.9, 9, -134, 11], [1.4, 11, -147.5, 11], [2.4, 14, -173.5, 6], [1.9, 12, -160.5, 8.5]]) {
      const config: SurfZoneConfig = {
        ...small, spot: 'canyon', alongShore: undefined, dx: 1, fineSpacing: 1, coarseSpacing: 4, significantHeight, peakPeriod, directionDegrees: 0, tide: 0, canyonBed: 'old',
      };
      expect(alongShoreOf(config)).toBe(220);
      expect(tankLayout(config)).toEqual({ offshore: -480, zoneInner: -390, blendEnd: -330, fineFrom: -390, shore: 30, edgeDepth: 7.9 });
      expect(tankRiderBounds(config)).toEqual({ xMin: -89, xMax: 89, zMin: -386, zMax: 28 });
      expect(takeOffPoint(config)).toEqual({ x: -2, z });
      expect(rideLineupOffset(config)).toBe(offset);
      expect(canyonTakeOffDepth(significantHeight, 'old')).toBe(1.14 + 1.12 * significantHeight);
    }
    // Its grid, drawn curl (the span to 1:23, landing 0.75 H ahead) and its readout's breaker, at Big.
    const simulation = new SurfZoneSimulation({
      spot: 'canyon', seed: 1, significantHeight: 2.4, peakPeriod: 14, directionDegrees: 0, spreading: 150, tide: 0,
      componentCount: 8, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, canyonBed: 'old',
    }, 'warm');
    expect([simulation.solver.nx, simulation.solver.nz]).toEqual([220, 451]);
    expect(simulation.breakPoint()).toEqual({ x: -2, z: -173.5 });
    const curl = simulation.curl!;
    expect(curl.landingShare).toBe(0.7504564066600995);
    expect(curl.size(40, 2.5).ahead).toBe(1.8761410166502488);
    expect([40, 80, 120].map((column) => curl.size(column, 1).width)).toEqual([0.3970425178726579, 0.3970425178726579, 0.35998175526758286]);
    let sum = 0;
    for (let column = 0; column < simulation.solver.nx; column += 1) sum += curl.size(column, 1).width;
    expect(sum).toBe(85.61307577789329);
    expect(simulation.iribarren()).toEqual({ value: 0.46487176340760533, type: 'plunging' });
  });

  it('starts the rider where `startOut` says (the `?startOut=<m>` dev switch), at any spot and size', () => {
    expect(rideLineupOffset({ spot: 'canyon', significantHeight: 2.4, startOut: 11 })).toBe(11);
    expect(rideLineupOffset({ spot: 'canyon', significantHeight: 1.4, startOut: 0 })).toBe(0);
    expect(rideLineupOffset({ spot: 'beach', significantHeight: 1.4, startOut: 20 })).toBe(20);
    expect(rideLineupOffset({ spot: 'beach', significantHeight: 1.4, startOut: Number.NaN })).toBe(RIDE_LINEUP_OFFSET);
  });

  it('takes off straight out from the window centre at the other spots', () => {
    for (const spot of ['beach', 'point'] as const) expect(takeOffPoint({ ...small, spot, alongShore: 160 }).x).toBe(0);
  });

  it('measures the Reef’s peel on its ledge only, and every other spot everywhere', () => {
    const reef = new SurfZoneSimulation({ ...small, spot: 'reef', alongShore: 160, dx: 4 });
    const column = (x: number) => reef.solver.xCenters.findIndex((center) => Math.abs(center - x) <= 2);
    expect(reef.peel.measures(column(-40))).toBe(true);
    expect(reef.peel.measures(column(60))).toBe(false);
    const point = new SurfZoneSimulation({ ...small, spot: 'point', alongShore: 160, dx: 4 });
    expect(point.peel.measures(column(60))).toBe(true);
  });

  it('takes off at the Reef’s peak, where every Reef swell breaks, never on dry reef or in the pass', () => {
    const swells = [REEF_PRACTICE_SWELL, ...Object.values(REEF_SWELLS)];
    for (const swell of swells) {
      const config: SurfZoneConfig = { ...small, spot: 'reef', alongShore: 160, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod };
      const point = takeOffPoint(config);
      const depth = tankDepth(createSpot('reef', 1), OFFSHORE_DEPTH.reef, point.x, point.z);
      expect(point.x).toBe(REEF.takeOffX);
      expect(depth).toBeGreaterThanOrEqual(0.4 * breakerDepthFor(swell.significantHeight, OFFSHORE_DEPTH.reef));
      expect(depth).toBeLessThanOrEqual(REEF.shelfDepth);
      expect(Math.abs(point.x - REEF.passX)).toBeGreaterThan(2 * REEF.passHalfWidth);
    }
  });

  it('finds the Reef’s break on its ledge inside the fine surf zone, and it plunges', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', alongShore: 160, significantHeight: REEF_SWELLS.small.significantHeight, peakPeriod: REEF_SWELLS.small.peakPeriod });
    const point = simulation.breakPoint();
    const bed = (z: number) => tankDepth(simulation.spot, OFFSHORE_DEPTH.reef, point.x, z);
    expect(point.z).toBeGreaterThan(TANK.fineFrom);
    expect(bed(point.z)).toBeGreaterThan(REEF.crestDepth);
    expect(bed(point.z)).toBeLessThan(REEF.shelfDepth);
    expect(simulation.iribarren().type).toBe('plunging');
  });

  describe('the steep Reef holds', () => {
    // Through the set's arrival (~35 s on the 30 m tank): finite, never negative, no runaway (past ones reached 23 and 112 m/s).
    const run = (overrides: Partial<SurfZoneConfig>, fastestAllowed = 20) => {
      const simulation = new SurfZoneSimulation({
        ...small, spot: 'reef', significantHeight: REEF_SWELLS.big.significantHeight, peakPeriod: REEF_SWELLS.big.peakPeriod,
        directionDegrees: 20, spreading: 24, dx: 1, fineSpacing: 1, ...overrides,
      });
      const { solver } = simulation;
      let finite = true;
      let fastest = 0;
      for (let frame = 0; frame < 45 * 30; frame += 1) {
        simulation.step(1 / 30);
        for (let i = 0; i < solver.h.length; i += 1) {
          finite &&= Number.isFinite(solver.h[i]) && solver.h[i] >= 0;
          if (solver.h[i] > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i]);
        }
      }
      expect(finite).toBe(true);
      expect(fastest).toBeLessThan(fastestAllowed);
      expect(solver.maxStableStep()).toBeGreaterThan(1e-3);
      return simulation;
    };

    // With the lagoon (Part C) this seed's first Big set sent thin backwash down the ledge, seaward of where its jets
    // left the crest (outside the plunge zone, by design), at 22–29 m/s while each draining cell kept its dispersion
    // until it thinned; supercritical water is shallow water now (SWITCH_FROUDE), and it peaks at 9.5 m/s.
    it('stays finite and bounded under the Big swell, and plunges', () => {
      expect(run({}).lipLaunches).toBeGreaterThan(0);
    }, 300_000);
    // At low tide a Big trough drains the ledge to ~0.3 m; its backwash reached ~23 m/s before SWITCH_FROUDE, 10 m/s
    // since (past runaways: 112 m/s, NaN).
    it('stays finite over the drying reef flat at low tide', () => run({ tide: -0.6 }), 300_000);
    // A thick lip landing on the drained crest piled 0.4 m of water to 1.5 m in 0.1 s: a bore the depth switch did not
    // see, drained at 23.5 m/s with the dispersive terms on (+25°, t 60.9 s). The plunge zone holds it in shallow water.
    it('stays finite with oblique swells across the open −x edge', () => {
      run({ directionDegrees: -25, alongShore: 60 });
      run({ directionDegrees: 25, alongShore: 60 });
    }, 600_000);
    // The pass and inner reef end in a lagoon and a 1:9.64 inland slope (Part C), where the Big swell ran up a 1:5 face.
    it('stays finite over the lagoon at low tide', () => run({ tide: -1.0, alongShore: 60 }), 300_000);
    // The 40 m window's open −x edge cuts the ledge: over a bed sloping across it, main (aa71add) ran this to NaN (Part B).
    it('stays finite where the window\'s open edge cuts the ledge', () => run({ directionDegrees: 25 }), 300_000);
  });

  // The game's own tank (160 m, 1 m cells, the GPU tier's 64 components) through the Reef's Big sets at high tide, as
  // far as they ran before: every cell finite, never negative, and nowhere faster than 20 m/s (they peak at 8–12).
  describe('the Reef\'s Big swell at high tide holds by its open edges', () => {
    const run = (overrides: Partial<SurfZoneConfig>, until: number) => {
      const simulation = new SurfZoneSimulation({
        spot: 'reef', seed: 3, significantHeight: 3, peakPeriod: 17, directionDegrees: 20, spreading: 24, tide: 0.6,
        componentCount: 64, ...overrides,
      });
      const { solver } = simulation;
      let finite = true;
      let fastest = 0;
      while (finite && solver.time < until) {
        simulation.step(1 / 30);
        for (let i = 0; i < solver.h.length; i += 1) {
          finite &&= Number.isFinite(solver.h[i] + solver.qx[i] + solver.qz[i]) && solver.h[i] >= 0;
          if (solver.h[i] > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i]);
        }
      }
      expect(finite).toBe(true);
      expect(fastest).toBeLessThan(20);
    };

    // A breaking crest's face read 40–66 m/s in 10 m of water (water piling up, not a travelling crest), and the jet's
    // momentum taken from the water ran it away (t 70 s); once that was bounded, a dispersive cell beside a bore on the
    // ledge 8 m inside the −x edge kept the bore's flux as it drained, to NaN (t 84 s).
    it('stays finite through its sets', () => run({}, 90), 600_000);
    // Given at the edge, a trough drawn down to 1.5 m over the ledge where the −x edge cuts it drew the edge's inflow
    // from 20 to 40 m/s, then NaN (t 78–83 s).
    it('stays finite through a trough drawn down at the −x edge', () => run({ heightAt: 'edge', peakPeriod: 18, tide: 1, componentCount: 24 }, 90), 600_000);
  });

  describe('Padang Padang holds', () => {
    // Through the set's arrival: finite, never negative, no runaway (the Reef's once reached 112 m/s over a drained reef).
    const run = (overrides: Partial<SurfZoneConfig>, fastestAllowed = 20) => {
      const simulation = new SurfZoneSimulation({
        ...small, spot: 'padang', significantHeight: PADANG_SWELLS.big.significantHeight, peakPeriod: PADANG_SWELLS.big.peakPeriod,
        directionDegrees: PADANG_SWELLS.big.directionDegrees ?? 0, spreading: PADANG_SPREADING, alongShore: PADANG.alongShore, dx: 1, fineSpacing: 1, ...overrides,
      });
      const { solver } = simulation;
      let finite = true;
      let fastest = 0;
      // The peel meter's way, every 6 s, where its fit holds (r² over 0.8).
      const directions: number[] = [];
      for (let frame = 0; frame < 45 * 30; frame += 1) {
        simulation.step(1 / 30);
        for (let i = 0; i < solver.h.length; i += 1) {
          finite &&= Number.isFinite(solver.h[i]) && solver.h[i] >= 0;
          if (solver.h[i] > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i]);
        }
        const estimate = frame % 180 === 179 ? simulation.peelEstimate() : undefined;
        if (estimate && estimate.fit > 0.8) directions.push(estimate.direction);
      }
      expect(finite).toBe(true);
      expect(fastest).toBeLessThan(fastestAllowed);
      expect(solver.maxStableStep()).toBeGreaterThan(1e-3);
      return { simulation, directions };
    };

    // The time limits are generous: a Big-swell run took 80 min on a loaded M1 Air (performance is measured, never a gate).
    // A left: seen from a surfer facing the beach, it runs to their left, toward +x and the channel (the advisor's check).
    // A single estimate can fit a window holding the tail of one wave and the head of the next (a 130 m peel takes about
    // a period), so most well-fitted estimates must run that way.
    it('stays finite and bounded under the Big swell, plunges, and peels left toward the channel', () => {
      const { simulation, directions } = run({});
      expect(simulation.lipLaunches).toBeGreaterThan(0);
      expect(directions.length).toBeGreaterThan(0);
      expect(directions.filter((direction) => direction === 1).length).toBeGreaterThan(directions.length / 2);
    }, 7_200_000);
    // Review Focus 1: the lowest springs leave 5 cm over the reef flat.
    it('stays finite over the nearly dry reef flat at the lowest spring tide', () => run({ tide: -1.2 }, 30), 7_200_000);
    it('stays finite at high tide', () => run({ tide: PADANG_TIDES.high }), 7_200_000);
    // Review Focus 2: oblique swells across the open side edges, over the advisor's robustness range (Mead & Black's
    // Bingin held its peel from −10° to +20°; the swell arrives square by default).
    it('stays finite with the most oblique swells across the open side edges', () => {
      run({ directionDegrees: -10 });
      run({ directionDegrees: 20 });
    }, 14_400_000);
  });

  it('spins up the menu’s Padang Padang on the GPU tier’s sea without blowing up', () => {
    for (const seed of [1, 2, 3]) {
      const simulation = new SurfZoneSimulation({
        spot: 'padang', seed, significantHeight: PADANG_PRACTICE_SWELL.significantHeight, peakPeriod: PADANG_PRACTICE_SWELL.peakPeriod,
        heightAt: 'edge', directionDegrees: PADANG_PRACTICE_SWELL.directionDegrees ?? 0, spreading: PADANG_PRACTICE_SWELL.spreading,
        bandwidth: PADANG_PRACTICE_SWELL.bandwidth, tide: 0, windSpeed: 0, stage: 2, componentCount: 64,
      });
      const { solver } = simulation;
      let finite = true;
      let deepest = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        finite &&= Number.isFinite(solver.h[i]);
        deepest = Math.max(deepest, solver.h[i]);
      }
      expect(finite, `seed ${seed}`).toBe(true);
      expect(deepest, `seed ${seed}`).toBeLessThan(OFFSHORE_DEPTH.padang + 10);
      expect(solver.maxStableStep(), `seed ${seed}`).toBeGreaterThan(1e-3);
    }
  }, 900_000);

  it('throws the Reef\'s ledge breaks as reef breaks and every other spot\'s by Pick & Feddersen', () => {
    const reef = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    const ratios: number[] = [];
    reef.onThrow = (event) => { if (event.vortexRatio !== undefined) ratios.push(event.vortexRatio); };
    for (let frame = 0; frame < 60 * 30 && ratios.length === 0; frame += 1) reef.step(1 / 30);
    expect(ratios.length).toBeGreaterThan(0);
    for (const ratio of ratios) {
      expect(ratio).toBeGreaterThanOrEqual(REEF_OVERTURN.roundestRatio);
      expect(ratio).toBeLessThanOrEqual(REEF_OVERTURN.gentlestRatio);
    }
    const point = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let reefBreaks = 0;
    point.onThrow = (event) => { if (event.vortexRatio !== undefined) reefBreaks += 1; };
    for (let frame = 0; frame < 20 * 30; frame += 1) point.step(1 / 30);
    expect(point.lipLaunches).toBeGreaterThan(0);
    expect(reefBreaks).toBe(0);
  }, 240_000);

  it('holds the water where its lip lands in shallow water', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    const solver = simulation.solver as BoussinesqSolver;
    const { x, z } = simulation.breakPoint();
    const landing = solver.cellIndex(x, z);
    simulation.step(1 / 30);
    expect(solver.mask[landing]).toBe(1);
    expect(solver.plungeHold[landing]).toBe(0);
    // A jet parcel from a wave 4 m high falls only 0.3 m onto the face, moving toward the shore: its zone is the wave's
    // roller, 1.5 H ahead, not its short fall's.
    simulation.lip.onLand!(x, z, 0.3, 0, -2.4, 7, { launch: { x, y: 0.3, z: z - 3 }, y: 0, age: 0.6, crestSpeed: 6, kind: 0, volume: 0.3, waveHeight: 4 });
    expect(solver.plungeHold[landing]).toBeGreaterThan(0);
    expect(solver.plungeHold[solver.cellIndex(x, z + 5)]).toBeGreaterThan(0);
    simulation.step(1 / 30);
    expect(solver.mask[landing]).toBe(0);
  }, 60_000);

  it('throws lips from plunging waves on the reef edge', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    // The Reef's 30 m tank brings the set onto its ledge ~35 s in; run until a lip has flown and landed.
    for (let frame = 0; frame < 60 * 30 && simulation.lip.landings === 0; frame += 1) simulation.step(1 / 30);
    expect(simulation.iribarren().type).toBe('plunging');
    expect(simulation.lipLaunches).toBeGreaterThan(0);
    expect(simulation.lip.landings).toBeGreaterThan(0);
  }, 240_000);

  it('counts a column breaking once per wave for the peel, and never shore swash', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.4, peakPeriod: 10, dx: 1, fineSpacing: 1 });
    const { solver } = simulation;
    const onsets: { column: number; time: number; still: number }[] = [];
    const peel = simulation.peel;
    const mark = peel.markOnset.bind(peel);
    peel.markOnset = (column: number, time: number) => {
      const row = solver.rowBelow(simulation.outerBreakZ(column));
      onsets.push({ column, time, still: solver.restLevel - solver.bed[row * solver.nx + column] });
      mark(column, time);
    };
    for (let frame = 0; frame < 30 * 30; frame += 1) simulation.step(1 / 30);
    expect(onsets.length).toBeGreaterThan(0);
    for (const onset of onsets) expect(onset.still).toBeGreaterThanOrEqual(0.4 * simulation.breakerDepth() - 1e-9);
    const last = new Map<number, number>();
    for (const { column, time } of onsets) {
      if (last.has(column)) expect(time - last.get(column)!).toBeGreaterThanOrEqual(0.7 * 10 - 1e-9);
      last.set(column, time);
    }
  }, 60_000);

  it('measures each wave breaking at the take-off: its face and where it broke (wave sizes)', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    const measured: { x: number; face: number; z: number }[] = [];
    simulation.onBreak = (wave) => measured.push(wave);
    expect(simulation.surf.reading(simulation.solver.time)).toBeUndefined();
    // Sets reach the take-off every 12-16 s here: three have broken by 43 s.
    for (let frame = 0; frame < 50 * 30; frame += 1) simulation.step(1 / 30);
    expect(measured.length).toBeGreaterThan(0);
    for (const wave of measured) {
      expect(wave.face).toBeGreaterThan(0.2);
      expect(wave.face).toBeLessThan(4);
      expect(wave.z).toBeGreaterThan(TANK.fineFrom - 5);
    }
    const takeOff = simulation.breakPoint();
    for (const wave of simulation.surf.waves()) expect(Math.abs(wave.x - takeOff.x)).toBeLessThanOrEqual(TAKE_OFF_BAND);
    const reading = simulation.surf.reading(simulation.solver.time);
    expect(reading).toBeDefined();
    expect(reading!.sets).toBeGreaterThanOrEqual(reading!.typical);
  }, 90_000);

  it('does not read the spin-up bores as one simultaneous close-out', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1 });
    for (let frame = 0; frame < 3; frame += 1) simulation.step(1 / 30);
    expect(simulation.peelEstimate()).toBeUndefined();
  });

  it('holds waves up longer under offshore wind', () => {
    const onshore = new SurfZoneSimulation({ ...small, spot: 'beach', windSpeed: 10 });
    const offshore = new SurfZoneSimulation({ ...small, spot: 'beach', windSpeed: -10 });
    expect(offshore.breaking.onsetScale).toBeGreaterThan(1);
    expect(onshore.breaking.onsetScale).toBeLessThan(1);
    expect(onshore.breaking.onsetScale).toBeCloseTo(windOnsetScale(10, onshore.breakerDepth()), 12);
  });

  // Douglass 1990 and King & Baker 1996 via Zdyrski & Feddersen 2022: onshore wind lowers the
  // breaker index by up to ~40 % at U/√(g h_b) ≈ 4; offshore wind raises it by up to ~10 %.
  it('scales the wind effect on breaking by the breaker celerity, stronger onshore than offshore', () => {
    const celerity = Math.sqrt(9.81 * 2);
    expect(windOnsetScale(0, 2)).toBe(1);
    expect(windOnsetScale(10, 2)).toBeCloseTo(1 - (0.1 * 10) / celerity, 12);
    expect(windOnsetScale(-4, 2)).toBeCloseTo(1 + (0.05 * 4) / celerity, 12);
    expect(windOnsetScale(-10, 2)).toBe(1.1);
    expect(windOnsetScale(30, 1)).toBe(0.6);
    expect(windOnsetScale(6, 1)).toBeLessThan(windOnsetScale(6, 3));
  });

  it('leaves foam behind the breaking bores, fading into lace, and none offshore of the break', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    const { solver, foam } = simulation;
    let outermost = Infinity;
    for (let frame = 0; frame < 20 * 30; frame += 1) {
      simulation.step(1 / 30);
      for (let i = 0; i < solver.h.length; i += 1) {
        if (simulation.breaking.strength[i] > 0.3) outermost = Math.min(outermost, solver.zCenters[Math.floor(i / solver.nx)]);
      }
    }
    let foamy = 0;
    let lace = 0;
    for (let i = 0; i < solver.h.length; i += 1) {
      const z = solver.zCenters[Math.floor(i / solver.nx)];
      expect(foam.totalAt(i)).toBeLessThanOrEqual(1 + 1e-12);
      if (z < outermost - 10) expect(foam.totalAt(i)).toBeLessThan(1e-3);
      if (foam.totalAt(i) > 0.05) foamy += 1;
      if (foam.residual[i] > 0.02) lace += 1;
    }
    expect(outermost).toBeLessThan(0);
    expect(foamy).toBeGreaterThan(50);
    expect(lace).toBeGreaterThan(50);
  }, 60_000);

  it('keeps lace longest in the beach’s sandy surf and lets a spot override its decay', () => {
    expect(FOAM_DECAY.beach.residual).toBeGreaterThan(FOAM_DECAY.reef.residual);
    for (const decay of Object.values(FOAM_DECAY)) expect(decay.dense).toBe(3);
    expect(new SurfZoneSimulation({ ...small, spot: 'reef' }).foam.decay).toEqual(FOAM_DECAY.reef);
    expect(new SurfZoneSimulation({ ...small, spot: 'reef', foamDecay: { dense: 1, residual: 2 } }).foam.decay).toEqual({ dense: 1, residual: 2 });
  });

  it('splashes landing lip water into foam', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const { solver, foam, lip } = simulation;
    foam.dense.fill(0);
    foam.residual.fill(0);
    const crest = solver.cellIndex(0, -60);
    // From a 1 m wave: a jet takes the water above its trough.
    expect(lip.launch(crest, { x: 0, z: 4 }, solver.surfaceAt(crest) + 1, 0.2, 0, undefined, JET_RELEASE_TIME, 1)).toBeGreaterThan(0);
    // The whole strip leaves the crest and lands.
    for (let step = 0; step < 240 && lip.activeCount() > 0; step += 1) lip.step(1 / 60);
    expect(lip.landings).toBeGreaterThan(0);
    expect(lip.activeCount()).toBe(0);
    expect(foam.dense.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0.5);
  });

  it('renders the foam field and the current it rides on', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const { solver, foam } = simulation;
    for (let frame = 0; frame < 30; frame += 1) simulation.step(1 / 30);
    for (let i = 0; i < solver.h.length; i += 1) {
      foam.dense[i] = solver.h[i] > 0.01 ? 0.5 * (1 + Math.sin(i * 0.37)) * 0.6 : 0;
      foam.residual[i] = solver.h[i] > 0.01 ? 0.1 : 0;
    }
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const flow = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(surface, grid);
    simulation.writeUniformFlow(flow, grid);
    const total = Float64Array.from(foam.dense, (value, i) => value + foam.residual[i]);
    const u = Float64Array.from(solver.qx, (q, i) => (solver.h[i] > 0.01 ? q / solver.h[i] : 0));
    const w = Float64Array.from(solver.qz, (q, i) => (solver.h[i] > 0.01 ? q / solver.h[i] : 0));
    let wet = 0;
    for (let r = 0; r < grid.nz; r += 5) {
      for (let c = 0; c < grid.nx; c += 3) {
        const k = r * grid.nx + c;
        const x = grid.xMin + c * grid.spacing;
        const z = grid.zMin + r * grid.spacing;
        if (solver.sampleCentered(solver.h, x, z) <= 0.01) {
          expect(surface[k * 2 + 1]).toBe(0);
          expect(flow[k * 2]).toBe(0);
          continue;
        }
        wet += 1;
        expect(surface[k * 2 + 1]).toBeCloseTo(solver.sampleCentered(total, x, z), 5);
        expect(flow[k * 2]).toBeCloseTo(solver.sampleCentered(u, x, z), 5);
        expect(flow[k * 2 + 1]).toBeCloseTo(solver.sampleCentered(w, x, z), 5);
      }
    }
    expect(wet).toBeGreaterThan(200);
  });
});

describe('the swept barrel’s breaking front (the Padang Padang spec, Part B)', () => {
  const padang = (overrides: Partial<SurfZoneConfig> = {}): SurfZoneConfig => ({
    ...small_(), significantHeight: PADANG_SWELLS.small.significantHeight, peakPeriod: PADANG_SWELLS.small.peakPeriod,
    directionDegrees: 0, spreading: PADANG_SPREADING, ...overrides,
  });

  function pacedFrontFixture() {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'padang' }, 'warm', libraryFromBytes(readBarrelCases('padang')));
    const point = (id: number, front: number, x: number, z: number, sigma: number, base: number, pace: number): FrontPoint => ({
      id, front, column: id, sigma, x, z, b: 0, height: 2.1,
      joined: 0, depth: 3, throwDepth: 2, crestDepth: 2, thrown: 0, throwZ: base,
      footHeight: 2.1, footDepth: 7, broke: 0, tau: 0.1, fresh: null, seen: 0,
      jetStrip: -1, jetPace: pace, jetBase: base, jetUntil: 10, jetAt: 0,
    });
    const points = [
      point(0, 4, -6, -110, 0, -110, 3),
      point(1, 4, -4, -110, 2, -112, 4),
      point(2, 4, -2, -110, 4, -110, 5),
      point(3, 9, 10, -140, 0, -140, 3),
      point(4, 9, 12, -140, 2, -143, 6),
    ];
    simulation.front!.points = points;
    // Keep these already linked crests for one frame; the real clock/crash pipeline moves them on their different paces.
    const tracking = vi.spyOn(simulation.front!, 'update').mockImplementation(() => {});
    return { simulation, points, tracking };
  }

  it('remeasures each front after the crash finalizes paced crest positions, including its serialized geometry', () => {
    const { simulation, points, tracking } = pacedFrontFixture();
    try {
      simulation.step(1 / 60);
    } finally {
      tracking.mockRestore();
    }
    // A thrown lip's clock runs at least at real time (the advisor, 2026-10-22): τ 0.1 + one step, each crest on its pace.
    const tau = 0.1 + 1 / 60;
    [-110 + 3 * tau, -112 + 4 * tau, -110 + 5 * tau, -140 + 3 * tau, -143 + 6 * tau].forEach((z, k) => expect(points[k].z).toBeCloseTo(z, 9));
    const distance = (a: FrontPoint, b: FrontPoint) => {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      return Math.sqrt(dx * dx + dz * dz);
    };
    expect(points.map((p) => p.sigma)).toEqual([0, distance(points[0], points[1]), distance(points[0], points[1]) + distance(points[1], points[2]), 0, distance(points[3], points[4])]);
    expect(points.map((p) => [p.id, p.front, p.footHeight, p.footDepth])).toEqual([[0, 4, 2.1, 7], [1, 4, 2.1, 7], [2, 4, 2.1, 7], [3, 9, 2.1, 7], [4, 9, 2.1, 7]]);
    for (const p of points) expect(p.tau).toBeCloseTo(tau, 12);
    const records = new Float32Array(points.length * FRONT_STRIDE);
    expect(writeFrontRecords(points, records)).toBe(points.length);
    for (let k = 0; k < points.length; k += 1) {
      expect(records[k * FRONT_STRIDE + FRONT_FIELD.sigma]).toBe(Math.fround(points[k].sigma));
      if (k === 0 || points[k].front !== points[k - 1].front) {
        expect(records[k * FRONT_STRIDE + FRONT_FIELD.sigma]).toBe(0);
        continue;
      }
      const dx = records[k * FRONT_STRIDE + FRONT_FIELD.x] - records[(k - 1) * FRONT_STRIDE + FRONT_FIELD.x];
      const dz = records[k * FRONT_STRIDE + FRONT_FIELD.z] - records[(k - 1) * FRONT_STRIDE + FRONT_FIELD.z];
      const ds = records[k * FRONT_STRIDE + FRONT_FIELD.sigma] - records[(k - 1) * FRONT_STRIDE + FRONT_FIELD.sigma];
      expect(ds).toBeCloseTo(Math.sqrt(dx * dx + dz * dz), 4);
    }
    expect(simulation.lipLaunches).toBe(0);
    expect(simulation.lipJets).toBe(0);
    expect(simulation.lipVolume).toBe(0);
  });

  it('starts a surviving crest at zero when the crash removes a front head, without carrying arc length across fronts', () => {
    const { simulation, points, tracking } = pacedFrontFixture();
    points[0].jetAt = -100;
    try {
      simulation.step(1 / 60);
    } finally {
      tracking.mockRestore();
    }
    expect(simulation.crash!.counts.exits).toBe(1);
    expect(simulation.front!.points.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    const after = simulation.front!.points;
    expect(after[0].front).toBe(4);
    expect(after[0].sigma).toBe(0);
    expect(after[1].sigma).toBeGreaterThan(2);
    expect(after[2].front).toBe(9);
    expect(after[2].sigma).toBe(0);
    // Its crests 3 − 3 τ apart in z, τ 0.1 + one step (a thrown clock runs at least at real time).
    const tau = 0.1 + 1 / 60;
    expect(after[3].sigma).toBeCloseTo(Math.sqrt(2 * 2 + (3 - 3 * tau) ** 2), 12);
    expect(simulation.exportState().front!.points.map((p) => p.sigma)).toEqual(after.map((p) => p.sigma));
  });

  it('runs on Padang Padang and the Canyon only (the Canyon from 2026-10-22, off with its switch)', () => {
    expect(SWEPT_BARREL).toEqual(['padang', 'canyon']);
    expect(new SurfZoneSimulation({ ...small, spot: 'beach' }, 'warm').front).toBeUndefined();
    expect(new SurfZoneSimulation({ ...small, spot: 'canyon', sweptBarrel: false }, 'warm').front).toBeUndefined();
    expect(new SurfZoneSimulation(padang(), 'warm').front).toBeDefined();
    expect(new SurfZoneSimulation(padang({ sweptBarrel: false }), 'warm').front).toBeUndefined();
  });

  // Every other spot, and Padang Padang's water, unchanged: the front reads the water and never writes it.
  it('leaves the water, its breaking and its lips exactly as with the front off', () => {
    const on = new SurfZoneSimulation(padang());
    const off = new SurfZoneSimulation(padang({ sweptBarrel: false }));
    for (let frame = 0; frame < 30 * 30; frame += 1) {
      on.step(1 / 30);
      off.step(1 / 30);
    }
    const [a, b] = [on.exportState(), off.exportState()];
    expect(a.arrays).toEqual(b.arrays);
    expect(a.counters).toEqual(b.counters);
    expect(a.lip).toEqual(b.lip);
  }, 900_000);

  it('links the breaking crests into fronts whose clocks run on, and hands them over exactly', () => {
    const donor = new SurfZoneSimulation(padang());
    let spanned = 0;
    for (let frame = 0; frame < 30 * 30; frame += 1) {
      donor.step(1 / 30);
      const byFront = new Map<number, number[]>();
      for (const point of donor.front!.points) byFront.set(point.front, [...(byFront.get(point.front) ?? []), point.tau]);
      for (const taus of byFront.values()) if (taus.length >= 5) spanned = Math.max(spanned, Math.max(...taus) - Math.min(...taus));
    }
    // Some front's slices stand at clearly different stages: the peel, not a close-out.
    expect(spanned).toBeGreaterThan(0.5);
    expect(donor.front!.points.length).toBeGreaterThan(0);
    // Review Focus 3: a joiner steps on with the donor's front, point for point.
    const joiner = new SurfZoneSimulation({ ...padang(), startSeaTime: 1000, spinUpPeriods: 0 });
    joiner.importState(donor.exportState());
    for (let frame = 0; frame < 5 * 30; frame += 1) {
      donor.step(1 / 30);
      joiner.step(1 / 30);
    }
    expect(joiner.front!.points).toEqual(donor.front!.points);
  }, 1_800_000);

  // The crash (PR 5): the barrel's jets leave and land on its clock, at a swept spot given the library.
  it('throws no Kennedy lip at a swept spot with the library, pours the barrel’s jets from its crash curve with the water balanced, and hands the held jets over exactly', () => {
    const library = libraryFromBytes(readBarrelCases('padang'));
    const donor = new SurfZoneSimulation(padang(), 'spun-up', library);
    let thrown = 0;
    let landed = 0;
    const tell = donor.lip.onLand!;
    donor.lip.onLand = (x, z, volume, vx, vy, vz, flight) => {
      landed += volume;
      tell(x, z, volume, vx, vy, vz, flight);
    };
    const step = () => {
      const before = donor.lipVolume;
      donor.step(1 / 30);
      thrown += donor.lipVolume - before;
    };
    for (let frame = 0; frame < 30 * 30; frame += 1) step();
    const { counts } = donor.crash!;
    expect(counts.onsets).toBeGreaterThan(0);
    expect(counts.throws).toBeGreaterThan(0);
    expect(counts.crashes).toBeGreaterThan(0);
    expect(donor.lipJets).toBe(counts.throws);
    // Every strip in the air is a barrel's jet or a splash-up: no Kennedy lip.
    expect(donor.exportState().lip.strips.every(([, strip]) => strip.swept === true || strip.kind === 1)).toBe(true);
    expect(thrown).toBeCloseTo(landed + donor.lip.airborneVolume(), 6);
    // Review Focus 3: a joiner given the sea while jets are held pours them exactly as the donor.
    const held = () => donor.exportState().lip.strips.some(([, strip]) => strip.swept === true && strip.tube?.closedAt === null);
    for (let frame = 0; frame < 30 * 30 && !held(); frame += 1) step();
    expect(held()).toBe(true);
    const joiner = new SurfZoneSimulation({ ...padang(), startSeaTime: 1000, spinUpPeriods: 0 }, 'spun-up', library);
    joiner.importState(donor.exportState());
    for (let frame = 0; frame < 5 * 30; frame += 1) {
      donor.step(1 / 30);
      joiner.step(1 / 30);
    }
    const [a, b] = [donor.exportState(), joiner.exportState()];
    expect(b.lip).toEqual(a.lip);
    expect(b.front).toEqual(a.front);
    expect(b.arrays).toEqual(a.arrays);
  }, 3_600_000);

  it('keeps Kennedy’s lip without the library or with the crash off, and gives the foam the solver’s own breaking there', () => {
    const alone = new SurfZoneSimulation(padang(), 'warm');
    expect(alone.crash).toBeUndefined();
    expect(alone.whitewaterStrength).toBe(alone.breaking.strength);
    const off = new SurfZoneSimulation(padang({ sweptCrash: false }), 'warm', libraryFromBytes(readBarrelCases('padang')));
    expect(off.crash).toBeUndefined();
    // The Canyon has no crash: its foam follows its spilling front (the canyon spilling prototype), or, with the front
    // off, the solver's own breaking.
    const canyon = new SurfZoneSimulation({ ...small, spot: 'canyon' }, 'warm', libraryFromBytes(readBarrelCases('padang')));
    expect(canyon.crash).toBeUndefined();
    expect(canyon.spilling).toBeDefined();
    expect(canyon.whitewaterStrength).not.toBe(canyon.breaking.strength);
    const plain = new SurfZoneSimulation({ ...small, spot: 'canyon', spillingFront: false }, 'warm');
    expect(plain.spilling).toBeUndefined();
    expect(plain.whitewaterStrength).toBe(plain.breaking.strength);
    const on = new SurfZoneSimulation(padang(), 'warm', libraryFromBytes(readBarrelCases('padang')));
    expect(on.crash).toBeDefined();
    expect(on.whitewaterStrength).not.toBe(on.breaking.strength);
  });
});

describe('the tank sized to the swell (wave sizes)', () => {
  const config = (spot: SpotName, significantHeight: number, peakPeriod = 14): SurfZoneConfig => ({ ...small, spot, significantHeight, peakPeriod });

  it('keeps today\'s tank for small days and Practice', () => {
    for (const spot of ['beach', 'point'] as const) {
      expect(tankLayout(config(spot, 1.5, 18))).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH[spot] });
      expect(tankLayout({ ...config(spot, 1.4, 12), heightAt: 'edge' })).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH[spot] });
    }
  });

  // The straight-crest Canyon: on 4 m cells over its blend the shoaling waves lost a third of their height unbroken.
  it('gives the Canyon today\'s zone and edge moved out to its own zone, with 1 m cells from the zone in', () => {
    for (const [significantHeight, peakPeriod] of [[0.9, 9], [1.4, 11], [3, 14]]) {
      const layout = tankLayout(config('canyon', significantHeight, peakPeriod));
      expect(layout).toEqual({
        offshore: CANYON.zoneInner - CANYON.zoneLength, zoneInner: CANYON.zoneInner,
        blendEnd: CANYON.zoneInner + CANYON.blendLength, fineFrom: CANYON.zoneInner, shore: TANK.shore, edgeDepth: CANYON.edgeDepth,
      });
      // The blend onto the shelf ends seaward of the arm's furthest foot.
      expect(layout.blendEnd).toBeLessThan(canyonFootZ());
    }
  });

  it('deepens the edge to 3.3 Hs, within 0.4 of the deep-water wavelength, and lengthens the tank to reach it', () => {
    const layout = tankLayout(config('beach', 3, 14));
    expect(layout.edgeDepth).toBeGreaterThanOrEqual(9.9 - 0.05);
    const spot = createSpot('beach', small.seed);
    // The edge takes the bed's depth where the zone starts.
    expect(spot.depthAt(0, layout.zoneInner)).toBeCloseTo(layout.edgeDepth, 6);
    expect(layout.zoneInner - layout.offshore).toBeGreaterThanOrEqual(Math.max(60, 0.75 * waveKinematics(14, layout.edgeDepth).wavelength) - 1e-6);
    expect(layout.blendEnd - layout.zoneInner).toBe(TANK.blendEnd - TANK.zoneInner);
    // A short-period storm sea keeps kh ≤ 2.5 at the edge.
    expect(tankLayout(config('point', 4, 6)).edgeDepth).toBeLessThanOrEqual(0.4 * (9.81 * 36) / (2 * Math.PI) + 1e-9);
  });

  it('places a big day\'s take-off by the spot\'s calibrated breaker index, and today\'s tanks as before', () => {
    const big: SurfZoneConfig = { ...small, spot: 'point', significantHeight: 3, peakPeriod: 14, alongShore: 160 };
    const tank = tankLayout(big);
    expect(tank.edgeDepth).toBeGreaterThan(OFFSHORE_DEPTH.point);
    const target = breakerDepthFor(edgeHeight(big, tank.edgeDepth), tank.edgeDepth + big.tide, TAKE_OFF_INDEX.point);
    const point = takeOffPoint(big);
    expect(tankDepth(createSpot('point', big.seed), tank.edgeDepth, point.x, point.z, tank)).toBeCloseTo(target, 0);
    const todays: SurfZoneConfig = { ...small, spot: 'point', alongShore: 160 };
    expect(tankDepth(createSpot('point', 1), OFFSHORE_DEPTH.point, 0, takeOffPoint(todays).z))
      .toBeCloseTo(breakerDepthFor(edgeHeight(todays), OFFSHORE_DEPTH.point), 0);
    // Only a swell-sized tank uses the calibrated index. Every spot has one, the Wave Pool too (the movement-flow spec's
    // sixth spot, f79c9ecd).
    expect(Object.keys(TAKE_OFF_INDEX).sort()).toEqual(['beach', 'canyon', 'padang', 'point', 'pool', 'reef']);
  });

  it('reaches a 13.2 m edge for a 4 m Beach swell on its deepened outer shelf', () => {
    const layout = tankLayout(config('beach', 4, 14));
    expect(layout.edgeDepth).toBeGreaterThanOrEqual(13.2 - 0.05);
  });

  it('gives the Reef today\'s inner tank at its 30 m edge, with a zone three quarters of the edge wavelength long', () => {
    for (const [significantHeight, peakPeriod] of [[1.3, 15], [3, 17]]) {
      const layout = tankLayout(config('reef', significantHeight, peakPeriod));
      expect(layout.edgeDepth).toBe(REEF.deep);
      expect({ zoneInner: layout.zoneInner, blendEnd: layout.blendEnd, fineFrom: layout.fineFrom, shore: layout.shore })
        .toEqual({ zoneInner: TANK.zoneInner, blendEnd: TANK.blendEnd, fineFrom: TANK.fineFrom, shore: TANK.shore });
      expect(layout.zoneInner - layout.offshore).toBeCloseTo(Math.max(60, ZONE_WAVELENGTHS * waveKinematics(peakPeriod, REEF.deep).wavelength), 6);
    }
  });

  it('starts the fine zone 40 m seaward of where the sets break, never shoreward of −150', () => {
    // The Reef has its own layout (above).
    for (const spot of ['beach', 'point'] as const) {
      const layout = tankLayout(config(spot, 4, 18));
      const sets = SETS_OVER_TYPICAL * komarGaughan(4, 18) / BREAKER_INDEX;
      const bed = createSpot(spot, small.seed);
      let setBreak = layout.blendEnd;
      while (bed.depthAt(0, setBreak) > sets && setBreak < TANK.shore) setBreak += 1;
      expect(layout.fineFrom).toBeLessThanOrEqual(Math.min(TANK.fineFrom, setBreak - 40) + 1);
      // The blend onto the spot's bed stays clear of the breaking sets.
      expect(layout.blendEnd).toBeLessThanOrEqual(layout.fineFrom - 20);
    }
  });

  it('keeps every layout ordered with a finite bed', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon', 'padang'] as const) {
      for (const significantHeight of [0.3, 1, 2, 3, 4]) {
        for (const peakPeriod of [6, 10, 14, 18]) {
          const layout = tankLayout(config(spot, significantHeight, peakPeriod));
          expect(layout.offshore).toBeLessThan(layout.zoneInner);
          expect(layout.zoneInner).toBeLessThan(layout.blendEnd);
          // The Canyon's 1 m cells start at its zone, over its blend; every other tank blends on its coarse cells.
          if (spot === 'canyon') expect(layout.fineFrom).toBe(layout.zoneInner);
          else expect(layout.blendEnd).toBeLessThan(layout.fineFrom);
          expect(layout.fineFrom).toBeLessThan(layout.shore);
          expect(layout.zoneInner - layout.offshore).toBeGreaterThanOrEqual(60);
          expect(Number.isFinite(tankDepth(createSpot(spot, 1), layout.edgeDepth, 0, layout.offshore, layout))).toBe(true);
        }
      }
    }
  });

  it('builds and steps the deepest Beach tank, its boundary forcing the solver\'s own waves', () => {
    const deepest = { ...config('beach', 4, 18), alongShore: 20, dx: 2 };
    const simulation = new SurfZoneSimulation(deepest);
    expect(simulation.tank).toEqual(tankLayout(deepest));
    expect(simulation.solver.zCenters[0]).toBeLessThan(simulation.tank.zoneInner);
    const omega = simulation.sea.components[0].omega;
    expect(simulation.sea.components[0].k).toBeCloseTo(madsenSorensenWaveNumber(omega, simulation.sea.depth), 10);
    for (let frame = 0; frame < 60; frame += 1) simulation.step(1 / 30);
    for (const value of simulation.solver.h) expect(Number.isFinite(value)).toBe(true);
  }, 300_000);

  it('builds today\'s tanks exactly as before', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    expect(simulation.tank).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH.beach });
    const omega = simulation.sea.components[0].omega;
    expect(simulation.sea.components[0].k).toBe(shallowWaterWaveNumber(omega, simulation.sea.depth));
  });
});

// The Teahupo'o Reef's lip jet, raised on the owner's call of 2026-10-03: the water-physics advisor's periodic Basilisk
// runs of its ledge give the jet, and the source's cap rises with it. Only the Reef's.
describe('the lip jet per spot (the Reef\'s periodic Basilisk runs)', () => {
  const RUNS = 'docs/research/water-physics/notes/round6-tube-profiles/data';

  it('gives the Reef, and only the Reef, a jet of its own, and every other spot\'s lip the defaults', () => {
    expect(Object.keys(LIP_JET)).toEqual(['reef']);
    expect(LIP_JET.reef).toEqual({ jetArea: 0.585, sourceShare: 0.3 });
    expect(SOURCE_SHARE).toBe(0.2);
    for (const spot of ['beach', 'point', 'reef', 'canyon', 'padang'] as const) {
      const { lip } = new SurfZoneSimulation(spot === 'padang' ? small_() : { ...small, spot }, 'warm');
      expect(lip.sourceShare, spot).toBe(spot === 'reef' ? 0.3 : SOURCE_SHARE);
    }
  });

  it('takes the Reef\'s jet from the median of the two periodic runs of its ledge, within the owner\'s 0.55–0.6 H²', () => {
    // The jet's area just before the lip lands, over the breaking wave's height squared, for the 1:4.2 and the 1:6 ledge.
    const jet = (run: string) => (JSON.parse(readFileSync(`${RUNS}/periodic_${run}_L12_plunge.json`, 'utf8')) as {
      pre_touchdown: { 'per H at vertical': { jet: number } };
    }).pre_touchdown['per H at vertical'].jet;
    const [low, high] = [jet('reef42'), jet('reef60')].sort((a, b) => a - b);
    expect(low).toBeCloseTo(0.55, 2);
    expect(high).toBeCloseTo(0.62, 2);
    expect(LIP_JET.reef!.jetArea!).toBeCloseTo((low + high) / 2, 2);
    expect(LIP_JET.reef!.jetArea!).toBeGreaterThanOrEqual(0.55);
    expect(LIP_JET.reef!.jetArea!).toBeLessThanOrEqual(0.6);
    // The cap is provisional (the advisor's inference): above the share of the window's water the jet takes (0.585 of about 2.6 H²), and well under all of it.
    expect(LIP_JET.reef!.sourceShare!).toBeGreaterThan(LIP_JET.reef!.jetArea! / 2.6);
    expect(LIP_JET.reef!.sourceShare!).toBeLessThan(0.5);
  });

  // A spot's reef breaks as thrown, each ask over its column and H², with what the slab would ask (beyond Pick &
  // Feddersen's fits, no jet of the spot's own) or what theirs is (inside them); stepped until `enough` or `seconds`.
  const reefBreaks = (config: SurfZoneConfig, enough: (beyond: number, inside: number) => boolean, seconds: number) => {
    const simulation = new SurfZoneSimulation(config);
    const nonlinearity = edgeHeight(config, simulation.tank.edgeDepth) / (simulation.tank.edgeDepth + config.tide);
    const beyond: { asked: number; slab: number }[] = [];
    const inside: { asked: number; theirs: number }[] = [];
    simulation.onThrow = (event) => {
      if (event.orthogonalGradient === undefined) return;
      const asked = event.asked / (simulation.tubeColumnWidth * event.height * event.height);
      const psi = overturnParameter(event.orthogonalGradient, nonlinearity);
      if (psi > PSI_RANGE.max) beyond.push({ asked, slab: reefOverturn(event.orthogonalGradient, nonlinearity)!.jetArea });
      else inside.push({ asked, theirs: overturn(psi).jetArea });
    };
    for (let frame = 0; frame < seconds * 30 && !enough(beyond.length, inside.length); frame += 1) simulation.step(1 / 30);
    return { simulation, beyond, inside };
  };

  // Inside the fits a Reef break keeps theirs (the reef overturn's tests in Overturn.test.ts): at game size such breaks
  // are 0.2-0.3 % of the Reef's throws, too few to wait for here, and this sea throws none in its first 90 s.
  it('asks the Reef\'s ledge breaks beyond Pick & Feddersen\'s fits for its sourced jet, not the slab', () => {
    const config: SurfZoneConfig = { ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 };
    const { simulation, beyond } = reefBreaks(config, (count) => count >= 3, 60);
    expect(beyond.length).toBeGreaterThanOrEqual(3);
    for (const { asked, slab } of beyond) {
      expect(asked).toBeCloseTo(LIP_JET.reef!.jetArea!, 9);
      // The slab would have asked about 0.47 H².
      expect(LIP_JET.reef!.jetArea! - slab).toBeGreaterThan(0.05);
    }
    expect(simulation.lip.sourceShare).toBe(0.3);
  }, 240_000);

  // The Reef's entry must not leak to another spot. Padang Padang's reef breaks go beyond the fits within seconds, so a
  // leaked jet would show in their asks.
  it('asks another spot\'s reef breaks for the slab beyond the fits and theirs inside them, never the Reef\'s jet (Padang Padang)', () => {
    const { simulation, beyond, inside } = reefBreaks(small_(), (out, within) => out >= 3 && within >= 3, 40);
    expect(beyond.length).toBeGreaterThanOrEqual(3);
    expect(inside.length).toBeGreaterThanOrEqual(3);
    for (const { asked, slab } of beyond) {
      expect(asked).toBeCloseTo(slab, 9);
      // Each slab here differs from the Reef's jet, so a leaked one would fail the line above.
      expect(Math.abs(slab - LIP_JET.reef!.jetArea!)).toBeGreaterThan(1e-3);
    }
    for (const { asked, theirs } of inside) expect(asked).toBeCloseTo(theirs, 9);
    expect(simulation.lip.sourceShare).toBe(SOURCE_SHARE);
  }, 240_000);
});

// The Canyon roller lens (S3, docs/superpowers/plans/2026-10-06-canyon-roller-s3.md, Task 2).
describe('the Canyon roller lens (S3)', () => {
  /** The test "spills at the Canyon at every size"'s Medium sea: Hs 1.4 m, Tp 11 s, 0°, s = 150, on its own window (240 m since canyon-long-wave). */
  const canyon: SurfZoneConfig = {
    ...small, spot: 'canyon', significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: PADANG_SPREADING, alongShore: CANYON.alongShore,
    dx: 1, fineSpacing: 1,
  };

  it('grows lenses on the Canyon\'s waves, draws them only where their front has reached, and raises the node heights by their tops', () => {
    // The same sea without the roller: it never writes the water, so the two stay bit for bit the same. Both without the
    // spilling lip, whose look reads the lenses (its own test below shows it changes nothing felt).
    const simulation = new SurfZoneSimulation({ ...canyon, spillingCurl: false });
    const plain = new SurfZoneSimulation({ ...canyon, roller: false, spillingCurl: false });
    const roller = simulation.roller!;
    const front = simulation.spilling!;
    const grid = simulation.renderGrid(1);
    const withRoller = snapshotOutputs(grid);
    const without = snapshotOutputs(grid);
    const extent = { low: 0, high: 0 };
    let drawn = 0;
    let nodes = 0;
    let highest = 0;
    for (let frame = 1; frame <= 3 * 11 * 30; frame += 1) {
      simulation.step(1 / 30);
      plain.step(1 / 30);
      if (frame % 15 !== 0) continue;
      let differ = 0;
      for (let i = 0; i < simulation.solver.h.length; i += 1) {
        if (!Object.is(simulation.solver.h[i], plain.solver.h[i]) || !Object.is(simulation.solver.qz[i], plain.solver.qz[i])) differ += 1;
      }
      expect(differ).toBe(0);
      // The rider feels the solver's breaking behind each front and where no wave owns a cell, none ahead.
      const felt = simulation.feltBreaking;
      const strength = simulation.breaking.strength;
      for (let i = 0; i < felt.length; i += 1) if (felt[i] !== 0) expect(felt[i]).toBe(strength[i]);
      // Every drawn lens's front has reached its column, and ahead of every front its wave has none.
      for (let column = 0; column < simulation.solver.nx; column += 1) {
        for (let slot = 0; slot < 2; slot += 1) {
          const id = roller.tableWave(column, slot);
          if (id < 0) continue;
          const wave = front.waves.find((candidate) => candidate.id === id);
          if (wave) expect(Number.isNaN(wave.reached[column])).toBe(false);
          drawn += 1;
        }
        for (const wave of front.waves) {
          if (!Number.isNaN(wave.reached[column])) continue;
          for (let slot = 0; slot < 2; slot += 1) expect(roller.tableWave(column, slot)).not.toBe(wave.id);
        }
      }
      // The node heights: with the roller less without it is each node's rise, to float32 precision.
      roller.extentZ(extent);
      if (!(extent.high > extent.low)) continue;
      simulation.writeUniformSnapshot(withRoller[0], withRoller[1], withRoller[2], grid);
      plain.writeUniformSnapshot(without[0], without[1], without[2], grid);
      for (let r = 0; r < grid.nz; r += 1) {
        const z = grid.zMin + r * grid.spacing;
        for (let c = 0; c < grid.nx; c += 1) {
          const o = (r * grid.nx + c) * 2;
          const x = grid.xMin + c * grid.spacing;
          const surface = without[0][o];
          const wet = surface > simulation.bedAt(x, z) - 0.04;
          const rise = wet ? roller.riseAt(x, z) : 0;
          expect(Math.abs(withRoller[0][o] - surface - rise)).toBeLessThanOrEqual(4e-7 * Math.max(1, Math.abs(surface)));
          expect(withRoller[0][o + 1]).toBe(without[0][o + 1]);
          highest = Math.max(highest, rise);
          nodes += 1;
        }
      }
    }
    expect(roller.counts.born).toBeGreaterThan(0);
    expect(drawn).toBeGreaterThan(0);
    expect(nodes).toBeGreaterThan(0);
    expect(highest).toBeGreaterThan(0.01);
  }, 900_000);

  it('runs at the Canyon only, and not with it or the front off: the rider then feels the solver\'s breaking (Review Focus 4)', () => {
    const on = new SurfZoneSimulation({ ...small, spot: 'canyon' }, 'warm');
    expect(on.roller).toBeDefined();
    expect(on.roller!.options.mask).toBe('front');
    expect(on.feltBreaking).not.toBe(on.breaking.strength);
    const solver = new SurfZoneSimulation({ ...small, spot: 'canyon', rollerMask: 'solver' }, 'warm');
    expect(solver.roller!.options.mask).toBe('solver');
    expect(solver.feltBreaking).toBe(solver.breaking.strength);
    for (const config of [
      { ...small, spot: 'canyon', roller: false }, { ...small, spot: 'canyon', spillingFront: false }, { ...small, spot: 'beach' },
    ] as SurfZoneConfig[]) {
      const off = new SurfZoneSimulation(config, 'warm');
      expect(off.roller).toBeUndefined();
      expect(off.feltBreaking).toBe(off.breaking.strength);
    }
    expect(on.stepCosts.roller).toBe(0);
  });

  // The Canyon spilling lip (docs/research/canyon-lip-2026-10-11): look only.
  it('draws the spilling lip as a look only: everything felt is byte for byte the same with it on and off', () => {
    const on = new SurfZoneSimulation(canyon);
    const off = new SurfZoneSimulation({ ...canyon, spillingCurl: false });
    expect(on.curl).toBeDefined();
    expect(off.curl).toBeUndefined();
    const grid = on.renderGrid(1);
    const [onOut, offOut] = [snapshotOutputs(grid), snapshotOutputs(grid)];
    const curls = new Float32Array(CURL_CAPACITY * CURL_STRIDE);
    const same = (name: string, a: ArrayLike<number>, b: ArrayLike<number>, length = a.length) => {
      expect(a.length, name).toBe(b.length);
      let differ = 0;
      for (let i = 0; i < length; i += 1) if (!Object.is(a[i], b[i])) differ += 1;
      expect(differ, name).toBe(0);
    };
    let drawnDiffer = 0;
    let slices = 0;
    let splashes = 0;
    // Medium, a few seconds of its peel, after its spin-up.
    for (let frame = 1; frame <= 5 * 30; frame += 1) {
      on.step(1 / 30);
      off.step(1 / 30);
      // The water and the breaking the solver uses; the whitewater the air and the roar are fed; the breaking felt.
      same('h', on.solver.h, off.solver.h);
      same('qx', on.solver.qx, off.solver.qx);
      same('qz', on.solver.qz, off.solver.qz);
      same('breaking', on.breaking.strength, off.breaking.strength);
      same('whitewater', on.whitewaterStrength, off.whitewaterStrength);
      same('felt', on.feltBreaking, off.feltBreaking);
      // The roller's table (`writeTable`): its push, froth drag and water entry, and the lens's top.
      same('roller', on.roller!.table, off.roller!.table);
      // The air the rider floats in (`aerateBores` → `voidFraction`) and its turbulence, and the bores that drive it.
      same('air', on.aeration.air, off.aeration.air);
      same('plume', on.aeration.depth, off.aeration.depth);
      same('turbulence', on.aeration.turbulence, off.aeration.turbulence);
      expect(on.foam.breakingCount).toBe(off.foam.breakingCount);
      same('bores', on.foam.breakingCells, off.foam.breakingCells, on.foam.breakingCount);
      same('dissipation', on.foam.dissipation, off.foam.dissipation);
      // The lip impacts the water, the foam's air and the sound take are the same; its splashes go to the drawn spray alone.
      expect(on.lipImpacts).toEqual(off.lipImpacts);
      expect(off.drawnImpacts).toHaveLength(0);
      splashes += on.drawnImpacts.length;
      // The drawn foam's shoreward drift never reaches the air: the air above rides the current's stencil.
      for (let i = 0; i < on.foam.dense.length; i += 1) if (on.foam.dense[i] !== off.foam.dense[i]) drawnDiffer += 1;
      if (frame % 15 !== 0) continue;
      // The heights drawn are the heights felt; the current too.
      on.writeUniformSnapshot(onOut[0], onOut[1], onOut[2], grid);
      off.writeUniformSnapshot(offOut[0], offOut[1], offOut[2], grid);
      for (let o = 0; o < onOut[0].length; o += 2) expect(onOut[0][o]).toBe(offOut[0][o]);
      same('flow', onOut[1], offOut[1]);
      // Over the arm's face, its flat top and down the line (canyon-long-wave's planar arm; x −30…20, z −330…−230 on the
      // long arm before canyon-layout).
      for (const [x, z] of [[-9, -150], [0, -70], [20, -60]]) expect(on.heightAt(x, z)).toBe(off.heightAt(x, z));
      slices += on.writeCurls(curls);
      expect(off.writeCurls(curls)).toBe(0);
    }
    // What is drawn does change: the curls, their splashes, and the foam held back until they land and drifting ashore.
    expect(slices).toBeGreaterThan(0);
    expect(splashes).toBeGreaterThan(0);
    expect(drawnDiffer).toBeGreaterThan(0);
  }, 900_000);

  /**
   * The drawn foam on the unbroken shoulder ahead of each wave's front at the take-off: per front whose crest lies from
   * 15 m seaward of the size's take-off line to 40 m inshore of it, the mean over 3–15 m ahead along its crest, from 1 m
   * behind the crest to 8 m ahead, up to where another wave has broken on that crest (its own whitewater: the shoulder ends
   * there). The band ran to 15 m inshore until canyon-long-wave (2026-10-22): on the planar arm the waves down the line
   * break nearer its crest line, their fronts 25 m inshore of the take-off line at the median (1 m on the short arm's fan),
   * so the old band held 13 fronts in 30 s at Medium against 90 on the fan.
   */
  function shoulderFoam(simulation: SurfZoneSimulation): number[] {
    const { solver, foam } = simulation;
    const { nx, nz, xCenters, zCenters, h, bed, restLevel, dx } = solver;
    const takeOff = takeOffPoint(simulation.config);
    const out: number[] = [];
    for (const wave of simulation.spilling!.waves) {
      // From 15 m upcoast of the take-off to 30 m downcoast (x −45…0 on the old layout's take-off at x −30).
      if (!(wave.frontX > takeOff.x - 15 && wave.frontX < takeOff.x + 30) || !canyonArmAt(wave.frontX)) continue;
      const front = Math.round((wave.frontX - xCenters[0]) / dx);
      let z = Number.NaN;
      for (let d = 0; d <= 6 && !(z === z); d += 1) if (wave.crest[front - d] === wave.crest[front - d]) z = wave.crest[front - d];
      const line = takeOff.z + (wave.frontX - takeOff.x) * Math.tan((CANYON.angle * Math.PI) / 180);
      if (!(z - line >= -15 && z - line <= 40)) continue;
      let sum = 0;
      let n = 0;
      for (let d = 1; d <= 15 && front + d < nx; d += 1) {
        const c = front + d;
        let best = -Infinity;
        let at = z;
        for (let iz = 0; iz < nz; iz += 1) {
          if (Math.abs(zCenters[iz] - z) > 2) continue;
          const level = h[iz * nx + c] + bed[iz * nx + c];
          if (level > best) [best, at] = [level, zCenters[iz]];
        }
        if (best - restLevel < 0.2) break;
        z = at;
        if (simulation.spilling!.waves.some((other) => other !== wave && other.reached[c] === other.reached[c]
          && other.crest[c] >= z - 1 && other.crest[c] <= z + 8)) break;
        if (d < 3) continue;
        for (let iz = 0; iz < nz; iz += 1) {
          if (zCenters[iz] < z - 1 || zCenters[iz] > z + 8) continue;
          sum += foam.dense[iz * nx + c] + foam.residual[iz * nx + c];
          n += 1;
        }
      }
      if (n > 20) out.push(sum / n);
    }
    return out;
  }

  for (const [size, significantHeight, peakPeriod, least] of [['Medium', 1.4, 11, 40], ['Big', 2.4, 14, 15]] as const) {
    it(`keeps the shoulder ahead of each front at the take-off clean green water at ${size}: its drawn foam at most 0.02`, () => {
      const simulation = new SurfZoneSimulation({ ...canyon, significantHeight, peakPeriod });
      const samples: number[] = [];
      for (let frame = 1; frame <= 30 * 30; frame += 1) {
        simulation.step(1 / 30);
        if (frame % 8 === 0) samples.push(...shoulderFoam(simulation));
      }
      expect(samples.length).toBeGreaterThanOrEqual(least);
      for (const foam of samples) expect(foam).toBeLessThanOrEqual(0.02);
    }, 900_000);
  }

  it('draws every other spot exactly as before: no spilling lip, its switch changes nothing', () => {
    for (const spot of ['beach', 'point', 'reef', 'pool'] as SpotName[]) {
      const config: SurfZoneConfig = { ...small, spot };
      const asked = new SurfZoneSimulation({ ...config, spillingCurl: true }, 'warm');
      const plain = new SurfZoneSimulation({ ...config, spillingCurl: false }, 'warm');
      expect(asked.curl, spot).toBeUndefined();
      const grid = asked.renderGrid(1);
      const [a, b] = [snapshotOutputs(grid), snapshotOutputs(grid)];
      for (let frame = 0; frame < 20; frame += 1) {
        asked.step(1 / 30);
        plain.step(1 / 30);
      }
      asked.writeUniformSnapshot(a[0], a[1], a[2], grid);
      plain.writeUniformSnapshot(b[0], b[1], b[2], grid);
      for (let k = 0; k < 3; k += 1) expect(Array.from(a[k]), spot).toEqual(Array.from(b[k]));
      expect(asked.writeCurls(new Float32Array(CURL_STRIDE))).toBe(0);
    }
  }, 120_000);

  it('starts the Canyon\'s front and roller afresh in a sea taken over without them (the plan\'s §5: a donor without them)', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'canyon' }, 'warm');
    const state = simulation.exportState();
    // A donor without them: an older build, or a stored lesson sea.
    delete state.spilling;
    // A front wave and a lens left from a sea this one ran before.
    simulation.spilling!.observeOnset(3, 1, -60);
    simulation.roller!.table.fill(0.5);
    simulation.importState(state);
    expect(simulation.spilling!.waves).toHaveLength(0);
    expect(simulation.spilling!.started).toBe(0);
    expect(simulation.roller!.table.every((value) => value === 0)).toBe(true);
    expect(simulation.roller!.riseAt(0, -60)).toBe(0);
  });
});
