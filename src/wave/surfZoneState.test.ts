import { beforeAll, describe, expect, it } from 'vitest';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE } from './SpillingRoller';
import { SurfZoneSimulation, type SurfZoneConfig } from './SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState, type SurfZoneState } from './surfZoneState';

// A small breaking tank (the Point, 40 m of shore) whose lip throws within seconds.
const config: SurfZoneConfig = {
  spot: 'point', seed: 7, significantHeight: 1.6, peakPeriod: 11, directionDegrees: 10, spreading: 18, tide: 0,
  componentCount: 24, alongShore: 40, stage: 2, compute: 'cpu', startSeaTime: 0,
};
const STEP = 1 / 60;

/** Steps `sim` until water is in the air (so the lip's state matters), at most `limit` steps. */
function untilAirborne(sim: SurfZoneSimulation, limit = 2400): void {
  for (let i = 0; i < limit && !(sim.lip.airborneVolume() > 0.05 && i > 300); i += 1) sim.step(STEP);
}

function fingerprint(sim: SurfZoneSimulation): number[] {
  const { solver } = sim;
  let a = 0;
  let b = 0;
  for (let i = 0; i < solver.h.length; i += 1) {
    a += solver.h[i] * ((i % 97) + 1);
    b += solver.qx[i] * ((i % 89) + 1) + solver.qz[i] * ((i % 83) + 1);
  }
  // G9: the air in the water and the tubes' collapse ride along too.
  return [
    sim.seaTime, a, b, sim.foam.dense.reduce((sum, v) => sum + v, 0), sim.lipLaunches, sim.lip.airborneVolume(), sim.lip.landings,
    sim.aeration.air.reduce((sum, v) => sum + v, 0), sim.lip.tubeCount,
  ];
}

describe('surf zone state (spec N1: the sea handover)', () => {
  it('restores a running sea exactly: the copy steps on as the original does, lip in the air included', () => {
    const donor = new SurfZoneSimulation(config);
    untilAirborne(donor);
    expect(donor.lip.airborneVolume()).toBeGreaterThan(0);
    const state = donor.exportState();
    // A joiner skips its own spin-up: the handed-over sea replaces all of it.
    const joiner = new SurfZoneSimulation({ ...config, startSeaTime: 1000, spinUpPeriods: 0 });
    joiner.importState(state);
    expect(joiner.seaTime).toBe(donor.seaTime);
    for (let i = 0; i < 300; i += 1) {
      donor.step(STEP);
      joiner.step(STEP);
    }
    expect(fingerprint(joiner)).toEqual(fingerprint(donor));
  });

  it('hands over a sea spun up but not yet stepped: the copy throws as the original does', () => {
    // A host answers a joiner as soon as its sea is ready, before its first step; waves already break by then.
    const donor = new SurfZoneSimulation({ ...config, spinUpPeriods: 6 });
    const joiner = new SurfZoneSimulation({ ...config, startSeaTime: 1000, spinUpPeriods: 0 });
    joiner.importState(decodeSurfZoneState(encodeSurfZoneState(donor.exportState())));
    for (let i = 0; i < 60; i += 1) {
      donor.step(STEP);
      joiner.step(STEP);
    }
    expect(joiner.lipLaunches).toBe(donor.lipLaunches);
    expect(joiner.lipRollers).toBe(donor.lipRollers);
  });

  it('survives 32-bit encoding closely enough to break where the donor breaks', () => {
    const donor = new SurfZoneSimulation(config);
    untilAirborne(donor);
    const bytes = encodeSurfZoneState(donor.exportState());
    const joiner = new SurfZoneSimulation({ ...config, startSeaTime: 1000 });
    joiner.importState(decodeSurfZoneState(bytes));
    for (let i = 0; i < 300; i += 1) {
      donor.step(STEP);
      joiner.step(STEP);
    }
    const { solver } = donor;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < solver.h.length; i += 1) {
      if (solver.h[i] <= 0.01) continue;
      const d = solver.surfaceAt(i) - joiner.solver.surfaceAt(i);
      sum += d * d;
      count += 1;
    }
    expect(Math.sqrt(sum / count) / config.significantHeight).toBeLessThan(1e-3);
    expect(joiner.lipLaunches).toBe(donor.lipLaunches);
  });

  // The Padang Padang spec, Part B: the swept barrel's front rides in the header, exactly.
  it('carries a breaking front through its bytes exactly, and hands over none where the spot runs none', () => {
    const donor = new SurfZoneSimulation({ ...config, stage: 1 });
    const state = donor.exportState();
    expect(state.front).toBeUndefined();
    const point = {
      id: 7, front: 2, column: 11, sigma: 3.1622776601683795, x: -8.5, z: -140.25, b: 0.3123456789, height: 1.7,
      joined: 51.23456789, depth: 2.4567, throwDepth: 2.3, crestDepth: 2.3561, thrown: null, broke: 51.9, tau: -0.4321, seen: 55.1, fresh: 3.01,
      footHeight: 1.64, footDepth: 7.2, throwZ: -141.123456789,
    };
    state.front = { nextId: 12, nextFront: 3, points: [point], held: [{ ...point, id: 8, tau: 0, thrown: 52.0123456789, throwZ: null }],
      tracks: [{ column: 12, z: -260.5, footHeight: null, refHeight: null, depth: 6.4, seen: 55.1, crossed: null, fresh: null }, { column: 13, z: -180.5, footHeight: 1.9, refHeight: 2.05, depth: 2.3, seen: 55.1, crossed: 54.97, fresh: 2.9 }],
    };
    expect(decodeSurfZoneState(encodeSurfZoneState(state)).front).toEqual(state.front);
  });

  it('refuses a state from a different tank', () => {
    const donor = new SurfZoneSimulation({ ...config, stage: 1 });
    const other = new SurfZoneSimulation({ ...config, stage: 1, alongShore: 60 });
    expect(() => other.importState(donor.exportState())).toThrow(/tank/);
  });
});

/** FNV-1a over the doubles' IEEE bits: a 64-bit fingerprint. */
function hash64(values: Iterable<number>): string {
  const view = new DataView(new ArrayBuffer(8));
  let hash = 0xcbf29ce484222325n;
  for (const value of values) {
    view.setFloat64(0, value);
    for (let i = 0; i < 8; i += 1) {
      hash ^= BigInt(view.getUint8(i));
      hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
    }
  }
  return hash.toString(16).padStart(16, '0');
}

/** The Canyon's sea, its foam and whitewater, the roller's table and the front's waves, as one 64-bit fingerprint. */
function canyonFingerprint(sim: SurfZoneSimulation): string {
  const { solver } = sim;
  const front = sim.spilling!.exportState();
  const waves = front.waves.flatMap((wave) => [
    wave.id, wave.onset, wave.startX, wave.startZ, wave.crestX, wave.frontX, wave.tipX, wave.backX, wave.lastJoin,
    ...[wave.reached, wave.joinedAt, wave.joinedZ, wave.crest, wave.seen, wave.seenAt].flat().map((value) => value ?? Number.NaN),
  ]);
  return hash64([
    sim.seaTime, ...solver.h, ...solver.qx, ...solver.qz, ...sim.foam.dense, ...sim.whitewaterStrength, ...sim.roller!.table,
    front.started, front.celerity, ...waves,
  ]);
}

describe('the Canyon\'s spilling front and roller lenses in the handover (the roller lens, S3, §5)', () => {
  // The Canyon's whole arm, 160 m of shore, spun up a period: its waves already break and carry lenses.
  const canyon: SurfZoneConfig = {
    spot: 'canyon', seed: 3, significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: 150, tide: 0,
    componentCount: 12, alongShore: 160, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, compute: 'cpu', startSeaTime: 0,
  };
  let donor: SurfZoneSimulation;
  let state: SurfZoneState;
  beforeAll(() => {
    donor = new SurfZoneSimulation(canyon);
    state = donor.exportState();
  }, 120_000);

  it('carries its front and lenses in the header, exactly: NaN as null, through JSON and the wire', () => {
    const spilling = state.spilling!;
    expect(spilling.front.waves.length).toBeGreaterThan(0);
    expect(spilling.roller!.lenses.length).toBeGreaterThan(20);
    // Columns no wave has reached travel as null.
    expect(spilling.front.waves.some((wave) => wave.reached.includes(null))).toBe(true);
    expect(JSON.parse(JSON.stringify(spilling))).toEqual(spilling);
    expect(decodeSurfZoneState(encodeSurfZoneState(state)).spilling).toEqual(spilling);
  });

  it('hands the Canyon over: in-process the copy steps on bit for bit; over the 32-bit wire its lenses lie where the donor\'s do', () => {
    const exact = new SurfZoneSimulation({ ...canyon, startSeaTime: 1000, spinUpPeriods: 0 });
    exact.importState(state);
    const wire = new SurfZoneSimulation({ ...canyon, startSeaTime: 1000, spinUpPeriods: 0 });
    wire.importState(decodeSurfZoneState(encodeSurfZoneState(state)));
    for (let i = 0; i < 300; i += 1) {
      donor.step(STEP);
      exact.step(STEP);
      wire.step(STEP);
    }
    expect(canyonFingerprint(exact)).toBe(canyonFingerprint(donor));
    // Over the wire (P): as many drawn lens columns within 2, and their crests within 0.5 m on average.
    const nx = donor.solver.nx;
    const drawn = (sim: SurfZoneSimulation) => {
      const columns: number[] = [];
      for (let lens = 0; lens < ROLLER_SLOTS * nx; lens += 1) if (sim.roller!.table[lens * ROLLER_STRIDE + ROLLER_FIELD.scale] > 0) columns.push(lens);
      return columns;
    };
    const there = drawn(donor);
    const here = drawn(wire);
    expect(there.length).toBeGreaterThan(20);
    expect(Math.abs(here.length - there.length)).toBeLessThanOrEqual(2);
    const shared = there.filter((lens) => here.includes(lens));
    const crest = (sim: SurfZoneSimulation, lens: number) => sim.roller!.table[lens * ROLLER_STRIDE + ROLLER_FIELD.crest];
    const offset = shared.reduce((sum, lens) => sum + Math.abs(crest(wire, lens) - crest(donor, lens)), 0) / shared.length;
    expect(offset).toBeLessThanOrEqual(0.5);
  }, 240_000);
});
