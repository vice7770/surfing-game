import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { REFERENCE_BOARD } from '../physics/boardReference';
import { WATER } from '../physics/hullForces';
import { createWaterSample } from '../physics/SurfWater';
import type { SpotName } from './Bathymetry';
import { BubbleCloud } from './BubbleCloud';
import { RIDER_PHASES, RIDER_SNAPSHOT, SURF_ZONE_STEP, SurfZoneRunner, surfZoneSea } from './SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from './SurfZoneSimulation';

const config: SurfZoneConfig = {
  spot: 'point', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 12, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('SurfZoneRunner', () => {
  it('steps the surf zone exactly like the simulation it wraps, at a fixed 1/60 s', () => {
    const runner = new SurfZoneRunner(config);
    const direct = new SurfZoneSimulation(config);
    runner.advance(90);
    for (let step = 0; step < 90; step += 1) direct.step(SURF_ZONE_STEP);
    expect(Array.from(runner.simulation.solver.h)).toEqual(Array.from(direct.solver.h));
    expect(Array.from(runner.simulation.foam.dense)).toEqual(Array.from(direct.foam.dense));
    expect(runner.simulation.seaTime).toBe(direct.seaTime);
  });

  it('reports how many breaks threw a jet and how many spilled', () => {
    const runner = new SurfZoneRunner(config);
    runner.simulation.lipJets = 3;
    runner.simulation.lipRollers = 5;
    expect(runner.status().lipJets).toBe(3);
    expect(runner.status().lipRollers).toBe(5);
  });

  it('fills a snapshot with the render surface, the current, the lip and the bubbles', () => {
    const runner = new SurfZoneRunner(config);
    runner.advance(120);
    const crest = runner.simulation.solver.cellIndex(0, -60);
    runner.simulation.lip.launch(crest, { x: 0, z: 4 }, runner.simulation.solver.surfaceAt(crest) + 1, 0.3);
    runner.simulation.foam.source[crest] = 40;
    runner.bubbles.update(runner.simulation, SURF_ZONE_STEP);
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    const surface = new Float32Array(buffers.surface.length);
    const flow = new Float32Array(buffers.flow.length);
    runner.simulation.writeUniformSurface(surface, runner.grid);
    runner.simulation.writeUniformFlow(flow, runner.grid);
    expect(Array.from(buffers.surface)).toEqual(Array.from(surface));
    expect(Array.from(buffers.flow)).toEqual(Array.from(flow));
    const parcels: number[] = [];
    runner.simulation.lip.forEachActive((x, y, z) => parcels.push(x, y, z));
    expect(buffers.lipCount).toBe(parcels.length / 3);
    expect(Array.from(buffers.lip.subarray(0, parcels.length))).toEqual(Array.from(Float32Array.from(parcels)));
    expect(buffers.bubbleCount).toBe(runner.bubbles.count);
    expect(buffers.bubbleCount).toBeGreaterThan(0);
    expect(Array.from(buffers.bubbles.subarray(0, buffers.bubbleCount * 3))).toEqual(Array.from(runner.bubbles.positions.subarray(0, buffers.bubbleCount * 3)));
    const bed = new Float32Array(runner.bed.length);
    runner.simulation.writeUniformBed(bed, runner.grid);
    expect(Array.from(runner.bed)).toEqual(Array.from(bed));
  });

  it('reports the readout values the simulation would give', () => {
    const runner = new SurfZoneRunner(config);
    runner.advance(60);
    const { simulation } = runner;
    const status = runner.status();
    expect(status.seaTime).toBe(simulation.seaTime);
    expect(status.timeToSet).toBe(simulation.timeToSet);
    expect(status.cells).toBe(simulation.solver.nx * simulation.solver.nz);
    expect(status.breakPoint).toEqual(simulation.breakPoint());
    expect(status.breakDepth).toBe(simulation.spot.depthAt(status.breakPoint.x, status.breakPoint.z) + config.tide);
    expect(status.breaker).toEqual(simulation.iribarren());
    expect(status.breakingFraction).toBe(simulation.breakingFraction());
    expect(status.peel).toEqual(simulation.peelEstimate());
    expect(status.lipLaunches).toBe(simulation.lipLaunches);
    expect(status.lipAirborne).toBe(simulation.lip.airborneVolume());
    expect(status.onsetScale).toBe(simulation.breaking.onsetScale);
    expect(runner.focus).toEqual(simulation.breakPoint());
  });

  it('builds the same sea on either side of the worker boundary', () => {
    const simulation = new SurfZoneSimulation(config);
    expect(surfZoneSea(config).components).toEqual(simulation.sea.components);
  });

  it('splashes spray where lip water lands, and hands it over in the snapshot', () => {
    const runner = new SurfZoneRunner(config);
    runner.advance(60);
    const crest = runner.simulation.solver.cellIndex(0, -60);
    runner.simulation.lip.launch(crest, { x: 0, z: 4 }, runner.simulation.solver.surfaceAt(crest) + 1.5, 0.4);
    let splashed = 0;
    for (let step = 0; step < 60; step += 1) {
      runner.advance(1);
      splashed = Math.max(splashed, runner.spray.count);
    }
    expect(splashed).toBeGreaterThan(20);
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    expect(buffers.sprayCount).toBe(runner.spray.count);
    expect(Array.from(buffers.spray.subarray(0, buffers.sprayCount * 5))).toEqual(Array.from(runner.spray.particles.subarray(0, runner.spray.count * 5)));
  });

  it('carries a bubble cloud in the runner, not in the renderer', () => {
    expect(new SurfZoneRunner(config).bubbles).toBeInstanceOf(BubbleCloud);
  });
});

describe('SurfZoneRunner with a board', () => {
  const calm = (spot: SpotName): SurfZoneConfig => ({ ...config, spot, significantHeight: 0.02, peakPeriod: 10 });

  it('floats a riderless board in the lineup on every spot’s calm water, at its draft', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      const runner = new SurfZoneRunner(calm(spot), { board: true });
      const board = runner.board!;
      expect(board.position.z).toBeCloseTo(runner.focus.z - 25, 6);
      runner.advance(240);
      expect(board.outsideDomain, spot).toBe(false);
      expect(board.submergedVolume / (REFERENCE_BOARD.mass / WATER.density), spot).toBeCloseTo(1, 1);
      expect(Math.abs(board.velocity.y), spot).toBeLessThan(0.02);
      expect(runner.status().board?.resets).toBe(0);
    }
  }, 60_000);

  it('lets passing waves move the board on the Beach, and keeps it finite', () => {
    const runner = new SurfZoneRunner({ ...config, spot: 'beach', significantHeight: 1.2, peakPeriod: 10 }, { board: true });
    const board = runner.board!;
    const start = board.position.clone();
    let lowest = Infinity;
    let highest = -Infinity;
    for (let step = 0; step < 900; step += 1) {
      runner.advance(1);
      lowest = Math.min(lowest, board.position.y);
      highest = Math.max(highest, board.position.y);
      expect(Number.isFinite(board.position.x + board.position.y + board.position.z + board.orientation.w)).toBe(true);
    }
    expect(highest - lowest).toBeGreaterThan(0.2);
    expect(board.position.distanceTo(start)).toBeGreaterThan(0.5);
  });

  it('puts a board that left the window back in the lineup, counting it', () => {
    const runner = new SurfZoneRunner(calm('point'), { board: true });
    const board = runner.board!;
    const spawn = board.position.clone();
    board.place(spawn.clone().setX(runner.windowXMin - 5));
    runner.advance(1);
    expect(board.position.distanceTo(spawn)).toBeLessThan(0.05);
    expect(runner.status().board?.resets).toBe(1);
  });

  it('snapshots the board’s pose as stepped, and nothing without one', () => {
    const runner = new SurfZoneRunner(calm('reef'), { board: true });
    runner.advance(30);
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    const { position, orientation } = runner.board!;
    expect(Array.from(buffers.board)).toEqual([...position.toArray(), ...orientation.toArray(), 1]);
    const bare = new SurfZoneRunner(calm('reef'));
    const empty = bare.createBuffers();
    bare.fill(empty);
    expect(bare.board).toBeUndefined();
    expect(empty.board[7]).toBe(0);
  });
});

describe('SurfZoneRunner with a rider', () => {
  const calm: SurfZoneConfig = { ...config, spot: 'beach', significantHeight: 0.02, peakPeriod: 10 };
  const idle = { paddle: false, popUp: false, steer: 0, retry: false };

  it('lies a rider prone on the board in the lineup, and snapshots its render points and phase', () => {
    const runner = new SurfZoneRunner(calm, { rider: true });
    runner.advance(60, idle);
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    const session = runner.session!;
    expect(session.rider.attached).toBe(true);
    expect(buffers.rider[RIDER_SNAPSHOT.present]).toBe(1);
    expect(buffers.rider[RIDER_SNAPSHOT.phase]).toBe(RIDER_PHASES.indexOf('prone'));
    for (let i = 0; i < 7; i += 1) {
      const point = new Vector3(buffers.rider[i * 3], buffers.rider[i * 3 + 1], buffers.rider[i * 3 + 2]);
      expect(point.distanceTo(session.board.position)).toBeLessThan(1.6);
    }
    expect(runner.status().ride?.phase).toBe('prone');
  });

  it('starts the rider just outside the break line, where catches happen', () => {
    const runner = new SurfZoneRunner(calm, { rider: true });
    const board = runner.session!.board.position;
    expect(runner.focus.z - board.z).toBeCloseTo(6, 6);
    expect(board.x).toBeCloseTo(runner.focus.x, 6);
  });

  it('paddles toward the beach when asked', () => {
    const runner = new SurfZoneRunner(calm, { rider: true });
    // In calm water the break line is almost at the shore; paddle from deep water instead.
    runner.session!.reset(new Vector3(runner.focus.x, 0, runner.focus.z - 25), 0, runner.water);
    const start = runner.session!.board.position.clone();
    runner.advance(360, { ...idle, paddle: true });
    const board = runner.session!.board;
    expect(board.position.z - start.z).toBeGreaterThan(3);
    expect(runner.status().ride!.speed).toBeGreaterThan(1);
    const { balance } = runner.status().ride!;
    expect(balance).toBeGreaterThanOrEqual(0);
    expect(balance).toBeLessThanOrEqual(1);
  });

  it('puts board and rider back in the lineup on retry, without restarting the wave', () => {
    const runner = new SurfZoneRunner(calm, { rider: true });
    const start = runner.session!.board.position.clone();
    runner.advance(120, { ...idle, paddle: true });
    const seaTime = runner.simulation.seaTime;
    runner.advance(1, { ...idle, retry: true });
    expect(runner.session!.board.position.distanceTo(start)).toBeLessThan(0.2);
    expect(runner.session!.rider.phase).toBe('prone');
    expect(runner.simulation.seaTime).toBeGreaterThan(seaTime);
    expect(runner.status().ride!.resets).toBe(1);
  });

  it('reads each ride from its trace, and reports the finished ride as plain data', () => {
    // On a flat sea the break line, and the lineup just outside it, lie in the shallows: a ride there ends inside at once.
    const runner = new SurfZoneRunner(calm, { rider: true });
    runner.advance(1);
    expect(runner.status().ride!.report).toBeUndefined();
    const { rider, board } = runner.session!;
    const { x, y, z } = board.position;
    expect(runner.water.sampleAt(x, y, z, createWaterSample()).stillDepth).toBeLessThan(0.5);
    const stand = () => {
      // A pop-up's last two phases, as the analyzer reads them: landing, then standing.
      for (const phase of ['landing', 'standing'] as const) {
        rider.phase = phase;
        board.attach(rider);
        runner.advance(1);
      }
      runner.advance(1);
    };
    stand();
    const status = runner.status();
    expect(status.ride!.report).toMatchObject({ id: 1, end: 'inside', maneuvers: [] });
    expect(structuredClone(status)).toEqual(status);
    stand();
    expect(runner.status().ride!.report!.id).toBe(2);
  });
});

describe('SurfZoneRunner rider in waves', () => {
  it('measures the rider against the wave it rides, and reports its speed over ground', () => {
    const runner = new SurfZoneRunner(config, { rider: true });
    runner.advance(15 * 60, { paddle: true, popUp: false, steer: 0, retry: false });
    const ride = runner.status().ride!;
    const { velocity } = runner.session!.board;
    expect(ride.speed).toBeCloseTo(Math.hypot(velocity.x, velocity.z), 9);
    expect(ride.boardSpeed).toBeCloseTo(velocity.length(), 9);
    const { requiredSpeed, ...rest } = ride.wave;
    for (const [name, value] of Object.entries(rest)) if (typeof value === 'number') expect(Number.isFinite(value), name).toBe(true);
    expect(requiredSpeed).toBeGreaterThan(0);
    expect(Math.hypot(ride.wave.directionX, ride.wave.directionZ)).toBeCloseTo(1, 9);
  });

  // Without fins (P4e) the prone board wanders off its heading, so this only asks that the rider holds on.
  it('holds on lying down while paddling through passing waves', () => {
    const runner = new SurfZoneRunner({ ...config, spot: 'beach', significantHeight: 1.2, peakPeriod: 10, directionDegrees: 0 }, { rider: true });
    for (let i = 0; i < 12 * 60; i += 1) {
      runner.advance(1, { paddle: true, popUp: false, steer: 0, retry: false });
      expect(runner.session!.phase).toBe('prone');
    }
  });
});
