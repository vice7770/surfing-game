import { describe, expect, it } from 'vitest';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import { SurfZoneSimulation } from '../wave/SurfZoneSimulation';
import { TierRecorder, compareTiers, perMinute, type ActivitySource, type TierActivity } from './tierParity';

/** A 2 × 2 surf zone to record from, with its lip's counters and this step's landings set by hand. */
interface FakeZone extends ActivitySource {
  solver: {
    nx: number; nz: number; time: number; xCenters: Float64Array; zCenters: Float64Array;
    h: Float64Array; qx: Float64Array; qz: Float64Array; plungeHold: Float64Array; maxStableStep(): number;
  };
  lipLaunches: number;
  lipRollers: number;
  lipImpacts: { kind?: number }[];
  lip: { tubeCount: number };
}

function fakeZone(): FakeZone {
  return {
    solver: {
      nx: 2, nz: 2, time: 0, xCenters: Float64Array.of(0.5, 1.5), zCenters: Float64Array.of(-1, 1),
      h: Float64Array.of(1, 1, 1, 0.01), qx: Float64Array.of(2, 0, 0, 5), qz: Float64Array.of(0, 3, 0, 0),
      plungeHold: Float64Array.of(0, 0.4, 0.2, 0),
      maxStableStep: () => 0.02,
    },
    lipLaunches: 4, lipRollers: 1, lipImpacts: [], lip: { tubeCount: 0 },
  };
}

function particles(kinds: number[]): { count: number; particles: Float32Array } {
  const packed = new Float32Array(kinds.length * SPRAY_STRIDE);
  kinds.forEach((kind, k) => { packed[k * SPRAY_STRIDE + 5] = kind; });
  return { count: kinds.length, particles: packed };
}

describe('TierRecorder', () => {
  it('counts throws, rollers and landings by kind from where it started', () => {
    const zone = fakeZone();
    const recorder = new TierRecorder(zone);
    zone.lipLaunches = 7;
    zone.lipRollers = 3;
    zone.lipImpacts = [{ kind: 0 }, { kind: 1 }, { kind: 0 }, {}];
    recorder.record(0.5);
    const activity = recorder.activity;
    expect(activity.throws).toBe(3);
    expect(activity.rollers).toBe(2);
    // A landing that does not say is a jet's.
    expect(activity.jetLandings).toBe(3);
    expect(activity.splashLandings).toBe(1);
    expect(activity.seconds).toBe(0.5);
    expect(activity.steps).toBe(1);
  });

  it('integrates the tubes, particles and plunge zone over time, and keeps their peaks', () => {
    const zone = fakeZone();
    const recorder = new TierRecorder(zone);
    zone.lip.tubeCount = 4;
    recorder.record(0.5, particles([0, 0, 1, 2, 2, 3, 4]));
    zone.lip.tubeCount = 2;
    recorder.record(0.5, particles([2]));
    const { activity } = recorder;
    expect(activity.tubeSeconds).toBeCloseTo(3, 12);
    expect(activity.tubesPeak).toBe(4);
    expect(activity.spraySeconds).toBeCloseTo(1, 12);
    expect(activity.mistSeconds).toBeCloseTo(0.5, 12);
    expect(activity.tubeSpraySeconds).toBeCloseTo(1, 12);
    expect(activity.foamBallSeconds).toBeCloseTo(1.5, 12);
    expect(activity.foamBallsPeak).toBe(2);
    expect(activity.plungeCellSeconds).toBeCloseTo(2, 12);
    expect(activity.plungePeak).toBe(2);
  });

  it('keeps the fastest water over 5 cm, where and when, and the smallest stable step', () => {
    const zone = fakeZone();
    zone.solver.time = 12;
    const recorder = new TierRecorder(zone);
    recorder.record(0.1);
    const { fastest, smallestStep, brokenSteps } = recorder.activity;
    // The 0.01 m cell moves at 500 m/s, but it is swash.
    expect(fastest.speed).toBeCloseTo(3, 12);
    expect([fastest.x, fastest.z, fastest.time, fastest.depth]).toEqual([1.5, -1, 12, 1]);
    expect(smallestStep).toBe(0.02);
    expect(brokenSteps).toBe(0);
  });

  it('counts steps that leave water not finite or below zero, from the first', () => {
    const zone = fakeZone();
    const recorder = new TierRecorder(zone);
    recorder.record(0.1);
    zone.solver.time = 3;
    zone.solver.qz[2] = Number.NaN;
    recorder.record(0.1);
    zone.solver.time = 4;
    zone.solver.qz[2] = 0;
    zone.solver.h[0] = -0.1;
    recorder.record(0.1);
    expect(recorder.activity.brokenSteps).toBe(2);
    expect(recorder.activity.firstBroken).toBe(3);
  });

  it('reads a surf zone as the page and worker run it', () => {
    const simulation = new SurfZoneSimulation({
      spot: 'point', seed: 3, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0,
      alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 8,
    });
    // Built spun up, the zone has thrown already (its spin-up advances the lip, as the page's and worker's do since
    // c9fb6a59): the recorder counts from where it starts. One peak period's run holds a break (the next set comes
    // about 2.4 s after the spin-up).
    const recorder = new TierRecorder(simulation);
    const launches = simulation.lipLaunches;
    const landings = simulation.lip.landings;
    for (let frame = 0; frame < 300; frame += 1) {
      simulation.step(1 / 30);
      recorder.record(1 / 30);
    }
    const { activity } = recorder;
    expect(activity.throws).toBe(simulation.lipLaunches - launches);
    expect(activity.throws).toBeGreaterThan(0);
    expect(activity.jetLandings + activity.splashLandings).toBe(simulation.lip.landings - landings);
    expect(activity.tubesPeak).toBeGreaterThan(0);
  }, 120_000);
});

describe('compareTiers', () => {
  const quiet = (): TierActivity => new TierRecorder(fakeZone()).activity;
  const busy = (overrides: Partial<TierActivity> = {}): TierActivity => ({
    ...quiet(), seconds: 60, steps: 3600, throws: 300, rollers: 40, jetLandings: 2400, splashLandings: 700, tubeSeconds: 120, tubesPeak: 9,
    spraySeconds: 6000, mistSeconds: 1500, tubeSpraySeconds: 800, foamBallSeconds: 900, foamBallsPeak: 40, plungeCellSeconds: 9000, plungePeak: 600,
    ...overrides,
  });

  it('flags a tier that throws nothing while the other throws', () => {
    const findings = compareTiers(busy(), busy({ throws: 0, jetLandings: 0, splashLandings: 0, tubeSeconds: 0 }));
    expect(findings.filter((finding) => finding.kind === 'silent').map((finding) => finding.metric)).toEqual(['throws', 'jetLandings', 'splashLandings', 'tubeSeconds']);
    expect(findings.find((finding) => finding.metric === 'throws')!.detail).toMatch(/GPU/);
    // One stray roller a minute on one tier is not a silent one.
    expect(compareTiers(busy({ rollers: 0 }), busy({ rollers: 1 }))).toEqual([]);
  });

  it('flags a metric more than twice as busy on one tier, once there is enough of it', () => {
    const findings = compareTiers(busy({ rollers: 40 }), busy({ rollers: 100, mistSeconds: 1400 }));
    expect(findings.map((finding) => `${finding.kind} ${finding.metric}`)).toEqual(['diverges rollers']);
    // Four against one of a rare event is not a divergence.
    expect(compareTiers(busy({ rollers: 4 }), busy({ rollers: 1 }))).toEqual([]);
  });

  it('flags broken water, and water faster than the probes allow', () => {
    const findings = compareTiers(busy({ brokenSteps: 3, firstBroken: 41 }), busy({ fastest: { speed: 23.5, x: 12.5, z: -28.5, time: 60.9, depth: 0.42 } }));
    expect(findings.map((finding) => `${finding.kind} ${finding.metric}`)).toEqual(['broken water', 'fast fastest']);
  });

  it('reads nothing into two quiet tiers', () => {
    expect(compareTiers(quiet(), quiet())).toEqual([]);
  });

  it('gives counts per minute of the time recorded', () => {
    expect(perMinute(30, 45)).toBeCloseTo(40, 12);
    expect(perMinute(3, 0)).toBe(0);
  });
});
