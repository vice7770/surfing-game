import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { REFERENCE_BOARD } from '../physics/boardReference';
import { WATER } from '../physics/hullForces';
import { createWaterSample } from '../physics/SurfWater';
import type { SpotName } from './Bathymetry';
import { BubbleCloud } from './BubbleCloud';
import {
  LIP_HIT_STRIDE, LIP_STRIDE, RIDER_PHASES, RIDER_SNAPSHOT, ROAR_SECTORS, SOUND_EVENT_CAPACITY, STROKE_HIT_STRIDE, SURF_ZONE_STEP, SurfZoneRunner, surfZoneSea,
} from './SurfZoneRunner';
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

  it('renders on a finer grid when asked, for close shots, leaving the physics as it is', () => {
    const fine = new SurfZoneRunner(config, { renderSpacing: 0.5 });
    const coarse = new SurfZoneRunner(config);
    expect(fine.grid.spacing).toBe(0.5);
    expect(fine.grid.nx).toBe(2 * (coarse.grid.nx - 1) + 1);
    expect(fine.createBuffers().surface.length).toBe(fine.grid.nx * fine.grid.nz * 2);
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
    // Raw heights: the page carves them with the snapshot's tubes (G9).
    runner.simulation.writeUniformSurface(surface, runner.grid, false);
    runner.simulation.writeUniformFlow(flow, runner.grid);
    expect(Array.from(buffers.surface)).toEqual(Array.from(surface));
    expect(Array.from(buffers.flow)).toEqual(Array.from(flow));
    const parcels: number[] = [];
    runner.simulation.lip.forEachActive((x, y, z) => parcels.push(x, y, z));
    expect(buffers.lipCount).toBe(parcels.length / 3);
    const drawn: number[] = [];
    for (let k = 0; k < buffers.lipCount; k += 1) drawn.push(...buffers.lip.subarray(k * LIP_STRIDE, k * LIP_STRIDE + 3));
    expect(drawn).toEqual(Array.from(Float32Array.from(parcels)));
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

  // L2: a lesson attempt places the rider; it counts as a restart.
  it('places the rider where a lesson asks, standing, as a restart', () => {
    const runner = new SurfZoneRunner(calm, { rider: true });
    const place = { x: runner.focus.x + 3, z: runner.focus.z - 2, heading: 0.3, speed: 3, phase: 'standing' as const };
    runner.advance(1, { ...idle, place });
    const ride = runner.status().ride!;
    expect(ride.phase).toBe('standing');
    expect(ride.resets).toBe(1);
    expect(Math.hypot(runner.session!.board.position.x - place.x, runner.session!.board.position.z - place.z)).toBeLessThan(0.5);
  });

  it('spawns the rider where asked, relative to the take-off (spec N1)', () => {
    const runner = new SurfZoneRunner(calm, { rider: true, spawnAlong: 12, spawnOut: 20 });
    const board = runner.session!.board.position;
    expect(board.x).toBeCloseTo(runner.focus.x + 12, 6);
    expect(runner.focus.z - board.z).toBeCloseTo(20, 6);
  });

  it('respawns at a given spot on retry, and there again on the next', () => {
    const runner = new SurfZoneRunner(calm, { rider: true });
    const spot = { x: runner.focus.x - 9, z: runner.focus.z - 15 };
    runner.advance(1, { ...idle, retry: true, spawnAt: spot });
    expect(runner.session!.board.position.x).toBeCloseTo(spot.x, 1);
    expect(runner.session!.board.position.z).toBeCloseTo(spot.z, 1);
    runner.advance(30, { ...idle, paddle: true });
    runner.advance(1, { ...idle, retry: true });
    expect(runner.session!.board.position.x).toBeCloseTo(spot.x, 1);
  });

  it('reports the board\'s push on the water in each snapshot, once', () => {
    const runner = new SurfZoneRunner(calm, { rider: true });
    runner.session!.reset(new Vector3(runner.focus.x, 0, runner.focus.z - 25), 0, runner.water);
    runner.advance(60, { ...idle, paddle: true });
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    expect(Math.hypot(buffers.reaction[2], buffers.reaction[3])).toBeGreaterThan(0);
    expect(Math.abs(buffers.reaction[1] - runner.session!.board.position.z)).toBeLessThan(3);
    runner.fill(buffers);
    expect([...buffers.reaction]).toEqual([0, 0, 0, 0]);
  });

  it('applies remote boards\' pushes before its next step, without reporting them as its own', () => {
    const runner = new SurfZoneRunner(calm, { rider: true });
    const { solver } = runner.simulation;
    const before = solver.qx.slice();
    const x = runner.focus.x + 5;
    const z = runner.focus.z - 30;
    runner.advance(1, idle, Float32Array.of(x, z, 400, 0));
    const column = solver.xCenters.findIndex((center) => Math.abs(center - x) <= solver.dx / 2);
    let changed = false;
    for (let row = 0; row < solver.nz; row += 1) {
      if (Math.abs(solver.zCenters[row] - z) > 3) continue;
      if (Math.abs(solver.qx[row * solver.nx + column] - before[row * solver.nx + column]) > 1e-3) changed = true;
    }
    expect(changed).toBe(true);
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    expect(Math.abs(buffers.reaction[2])).toBeLessThan(50);
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

// S1: what makes sound, reported with each snapshot.
describe('SurfZoneRunner sound events', () => {
  const still: SurfZoneConfig = { ...config, spot: 'beach', significantHeight: 0.02, peakPeriod: 10 };
  const sectorPowers = (roar: Float32Array) => Array.from({ length: ROAR_SECTORS }, (_, i) => roar[i * 3]);

  it('reports no roar on a calm sea, and roar where breaking water moves', () => {
    const calm = new SurfZoneRunner(still);
    calm.advance(30);
    const quiet = calm.createBuffers();
    calm.fill(quiet);
    expect(sectorPowers(quiet.roar).every((power) => power === 0)).toBe(true);

    const runner = new SurfZoneRunner(still);
    runner.advance(30);
    const { solver, breaking } = runner.simulation;
    breaking.strength.fill(0);
    const cell = solver.cellIndex(5, -40);
    breaking.strength[cell] = 1;
    solver.qx[cell] = 0;
    solver.qz[cell] = 2;
    const loud = runner.createBuffers();
    runner.fill(loud);
    const sector = sectorPowers(loud.roar).findIndex((power) => power > 0);
    expect(sector).toBeGreaterThanOrEqual(0);
    expect(sectorPowers(loud.roar).filter((power) => power > 0)).toHaveLength(1);
    expect(loud.roar[sector * 3 + 1]).toBeCloseTo(solver.xCenters[cell % solver.nx], 6);
    expect(loud.roar[sector * 3 + 2]).toBeCloseTo(solver.zCenters[Math.floor(cell / solver.nx)], 6);
  });

  it('reports each lip landing once, and merges a burst beyond its capacity without losing water', () => {
    const runner = new SurfZoneRunner(still);
    const step = runner.simulation.step.bind(runner.simulation);
    let landings = 1;
    runner.simulation.step = (dt: number) => {
      step(dt);
      for (let i = 0; i < landings; i += 1) runner.simulation.lipImpacts.push({ x: 1 + i * 0.1, z: -50, volume: 0.4, vx: 0, vy: -5, vz: 3 });
    };
    runner.advance(1);
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    expect(buffers.lipHitCount).toBe(1);
    expect(buffers.lipHits[2]).toBeCloseTo(0.4, 6);
    expect(buffers.lipHits[3]).toBeCloseTo(Math.hypot(5, 3), 5);
    landings = 0;
    runner.advance(1);
    runner.fill(buffers);
    expect(buffers.lipHitCount).toBe(0);
    landings = 100;
    runner.advance(1);
    runner.fill(buffers);
    expect(buffers.lipHitCount).toBe(SOUND_EVENT_CAPACITY);
    let volume = 0;
    for (let i = 0; i < buffers.lipHitCount; i += 1) volume += buffers.lipHits[i * LIP_HIT_STRIDE + 2];
    expect(volume).toBeCloseTo(40, 3);
  });

  it('reports a paddler’s strokes with the work each hand did', () => {
    const runner = new SurfZoneRunner(still, { rider: true });
    runner.advance(60, { paddle: true, popUp: false, steer: 0, retry: false });
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    expect(buffers.strokeHitCount).toBeGreaterThan(0);
    for (let i = 0; i < buffers.strokeHitCount; i += 1) expect(buffers.strokeHits[i * STROKE_HIT_STRIDE + 2]).toBeGreaterThan(0);
  });
});
