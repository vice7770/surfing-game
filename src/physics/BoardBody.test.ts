import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardBody, type BoardPayload } from './BoardBody';
import { REFERENCE_BOARD, REFERENCE_RIDER } from './boardReference';
import { buildBoardShape } from './boardShape';
import { DetachedSurfer } from './DetachedSurfer';
import { WATER } from './hullForces';
import type { SurfWater, WaterSample } from './SurfWater';
import { SurfWaterBodyField } from './SurfWaterBodyField';

interface PlaneOptions {
  /** Surface y = level + slopeX x + slopeZ z. */
  level?: number;
  slopeX?: number;
  slopeZ?: number;
  flow?: { x: number; y: number; z: number };
  /** Water depth under the surface; 0 makes dry ground at `level`. */
  depth?: number;
  inside?: (x: number, z: number) => boolean;
}

/** An analytic sheet of water, with hydrostatic pressure under a plane surface, that records its reactions. */
class PlaneWater implements SurfWater {
  readonly reaction = { x: 0, y: 0, z: 0 };
  reactions = 0;
  constructor(private readonly o: PlaneOptions = {}) {}

  surfaceAt(x: number, z: number): number {
    return (this.o.level ?? 0) + (this.o.slopeX ?? 0) * x + (this.o.slopeZ ?? 0) * z;
  }

  sampleAt(x: number, _y: number, z: number, out: WaterSample): WaterSample {
    const depth = this.o.depth ?? 3;
    const inside = this.o.inside ? this.o.inside(x, z) : true;
    const flow = this.o.flow ?? { x: 0, y: 0, z: 0 };
    const surface = this.surfaceAt(x, z);
    const slopeX = this.o.slopeX ?? 0;
    const slopeZ = this.o.slopeZ ?? 0;
    const norm = Math.hypot(slopeX, 1, slopeZ);
    Object.assign(out, {
      surfaceY: depth > 0 ? surface : surface - 0.05, stillDepth: depth, waterDepth: depth, bedY: inside ? surface - depth : -Infinity,
      wet: inside && depth > 0.01, outsideDomain: !inside, slopeX, slopeZ, normalX: -slopeX / norm, normalY: 1 / norm, normalZ: -slopeZ / norm,
      flowX: flow.x, flowY: flow.y, flowZ: flow.z, regime: inside ? (depth > 0.01 ? 'profile' : 'dry') : 'outside', breaking: 0,
    });
    return out;
  }

  addReaction(_x: number, _z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    this.reaction.x += impulseX;
    this.reaction.y += impulseY;
    this.reaction.z += impulseZ;
    this.reactions += 1;
  }
}

const STEP = 1 / 60;

function run(board: BoardBody, water: SurfWater, seconds: number, dt = STEP): void {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i += 1) board.step(dt, water);
}

/** The board's own centre of mass, with its lowest bottom point at `bottomY`. */
function levelBoard(bottomY = 0, payloads: BoardPayload[] = []): BoardBody {
  const board = new BoardBody({ payloads });
  board.place(new Vector3(0, bottomY + board.shape.centerOfMass.y, 0));
  return board;
}

/** Board up axis in world coordinates. */
const up = (board: BoardBody) => new Vector3(0, 1, 0).applyQuaternion(board.orientation);

const SHAPE = buildBoardShape();

/** A payload standing in for the rider, on the deck: by default over the board's centre of mass. */
const deckPayload = (mass: number, z = SHAPE.centerOfMass.z): BoardPayload[] => [
  { mass, point: { x: 0, y: SHAPE.centerOfMass.y + REFERENCE_BOARD.thickness / 2, z } },
];
/** A standing rider's weight sits a little aft of the middle. */
const STANCE = -0.25;

describe('rigid board body', () => {
  it('floats bare at the draft that displaces its own mass, and settles level', () => {
    const board = levelBoard(0.02);
    const water = new PlaneWater();
    run(board, water, 10);
    expect(Math.abs(board.velocity.y)).toBeLessThan(1e-3);
    expect(board.angularVelocity.length()).toBeLessThan(1e-3);
    // Settling on a rockered hull leaves a slow glide: edge-on, a light board meets little resistance.
    expect(Math.hypot(board.velocity.x, board.velocity.z)).toBeLessThan(0.02);
    expect(board.submergedVolume / (REFERENCE_BOARD.mass / WATER.density)).toBeCloseTo(1, 1);
    expect(Math.abs(board.forces.buoyancy.y / (board.mass * WATER.gravity) - 1)).toBeLessThan(0.01);
    const tilt = up(board);
    expect(Math.abs(tilt.x)).toBeLessThan(Math.sin((0.5 * Math.PI) / 180));
    expect(Math.abs(tilt.z)).toBeLessThan(Math.sin((3 * Math.PI) / 180));
  });

  it('floats 20 kg deeper, but cannot float a 75 kg rider at rest', () => {
    const bare = levelBoard();
    const light = levelBoard(0, deckPayload(20));
    const heavy = levelBoard(0, deckPayload(75));
    const water = new PlaneWater();
    for (const board of [bare, light, heavy]) run(board, water, 4);
    expect(light.position.y).toBeLessThan(bare.position.y - 0.01);
    expect(Math.abs(light.velocity.y)).toBeLessThan(1e-3);
    expect(Math.hypot(light.velocity.x, light.velocity.z)).toBeLessThan(0.02);
    expect(light.submergedVolume).toBeLessThan(REFERENCE_BOARD.volume);
    expect(heavy.position.y).toBeLessThan(-0.3);
    expect(heavy.velocity.y).toBeLessThan(-0.1);
  });

  // 65 % of a standing rider and board must come from planing lift (P4b record). Like a towing tank
  // carriage, the test holds the speed through still water and leaves heave, pitch and roll free.
  it('carries a 75 kg rider when towed at 6 m/s, but not at 0.5 m/s', () => {
    const towed = (speed: number) => {
      const board = levelBoard(0, deckPayload(75, STANCE));
      board.velocity.z = speed;
      const water = new PlaneWater();
      // The rigid load pitches for about 3 s before it settles.
      for (let i = 0; i < 240; i += 1) {
        board.step(STEP, water);
        board.velocity.z = speed;
      }
      return board;
    };
    const fast = towed(6);
    const slow = towed(0.5);
    expect(fast.position.y).toBeGreaterThan(-0.02);
    expect(Math.abs(fast.velocity.y)).toBeLessThan(0.01);
    expect(up(fast).y).toBeGreaterThan(Math.cos((15 * Math.PI) / 180));
    expect(fast.forces.pressure.y).toBeGreaterThan(fast.forces.buoyancy.y);
    expect(slow.position.y).toBeLessThan(-0.2);
  });

  it('lands from a 1 m drop and settles, with its energy ledger closed', () => {
    const board = levelBoard(1);
    const water = new PlaneWater();
    const before = board.kineticEnergy();
    run(board, water, 5);
    expect(Math.abs(board.velocity.y)).toBeLessThan(1e-3);
    expect(board.angularVelocity.length()).toBeLessThan(1e-2);
    // The asymmetric rocker turns under 1 % of the landing momentum into a glide (the same at 4 to 64 substeps).
    expect(Math.hypot(board.velocity.x, board.velocity.z)).toBeLessThan(0.05);
    expect(Number.isFinite(board.position.y)).toBe(true);
    const work = Object.values(board.work).reduce((sum, value) => sum + value, 0);
    const scale = board.mass * WATER.gravity * 1;
    expect(Math.abs(board.kineticEnergy() - before - work) / scale).toBeLessThan(0.01);
    expect(board.work.pressure).toBeLessThan(0);
  });

  // Plan §1.10: drop speed within tolerance of √(2gΔh). On a 31° face a planing rider loses a little to drag.
  it('drops down a steep face at close to the frictionless speed, with its energy ledger closed', () => {
    const slope = 0.6;
    const angle = Math.atan(slope);
    const board = new BoardBody({ payloads: deckPayload(REFERENCE_RIDER.mass, STANCE) });
    const orientation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle);
    const along = new Vector3(0, -Math.sin(angle), Math.cos(angle));
    const start = 4;
    board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0), orientation, along.clone().multiplyScalar(start));
    const water = new PlaneWater({ slopeZ: -slope });
    const before = board.kineticEnergy();
    const top = board.centerOfMass.y;
    let steps = 0;
    while (top - board.centerOfMass.y < 1 && steps < 600) {
      board.step(STEP, water);
      steps += 1;
    }
    const drop = top - board.centerOfMass.y;
    expect(drop).toBeGreaterThanOrEqual(1);
    const ideal = Math.sqrt(start * start + 2 * WATER.gravity * drop);
    const speed = board.velocity.length();
    expect(speed / ideal).toBeGreaterThan(0.85);
    expect(speed / ideal).toBeLessThanOrEqual(1);
    const work = Object.values(board.work).reduce((sum, value) => sum + value, 0);
    expect(Math.abs(board.kineticEnergy() - before - work) / (board.mass * WATER.gravity * drop)).toBeLessThan(0.01);
  });

  it('drifts up to a current’s speed, handing the water the momentum it takes', () => {
    const board = levelBoard();
    const water = new PlaneWater({ flow: { x: 0.8, y: 0, z: 0 } });
    run(board, water, 1);
    const drift = board.velocity.x;
    run(board, water, 29);
    expect(board.velocity.x).toBeGreaterThan(drift);
    expect(board.velocity.x / 0.8).toBeGreaterThan(0.9);
    expect(board.velocity.x / 0.8).toBeLessThan(1.001);
    expect(water.reaction.x).toBeCloseTo(board.mass * board.velocity.x, 6);
    expect(water.reactions).toBeGreaterThan(0);
  });

  it('gives the same motion at 1/60 and 1/120 s steps, and bit-identical repeats', () => {
    const drop = (dt: number) => {
      const board = levelBoard(0.5);
      board.angularVelocity.set(0.4, 0, 0.8);
      run(board, new PlaneWater({ flow: { x: 0.3, y: 0, z: -1 } }), 2, dt);
      return board;
    };
    const coarse = drop(1 / 60);
    const fine = drop(1 / 120);
    expect(coarse.position.distanceTo(fine.position)).toBeLessThan(0.01);
    expect(coarse.orientation.angleTo(fine.orientation)).toBeLessThan((0.5 * Math.PI) / 180);
    const again = drop(1 / 60);
    expect(again.position.toArray()).toEqual(coarse.position.toArray());
    expect(again.orientation.toArray()).toEqual(coarse.orientation.toArray());
  });

  it('rests on dry ground without sinking into it', () => {
    const board = levelBoard(0.2);
    run(board, new PlaneWater({ depth: 0 }), 2);
    const lowest = board.lowestPoint();
    expect(lowest).toBeGreaterThan(-0.005);
    expect(lowest).toBeLessThan(0.005);
    expect(board.velocity.length()).toBeLessThan(1e-2);
  });

  it('feels no water beyond the domain', () => {
    const board = levelBoard(0);
    const water = new PlaneWater({ inside: () => false });
    run(board, water, 1);
    expect(board.outsideDomain).toBe(true);
    expect(board.velocity.y).toBeCloseTo(-WATER.gravity, 6);
    expect(water.reactions).toBe(0);
  });

  it('takes a detached surfer’s strike through the contact seam, conserving momentum', () => {
    const water = new PlaneWater();
    const board = levelBoard();
    run(board, water, 2);
    const surfer = new DetachedSurfer();
    surfer.start({
      center: new Vector3(0, 0.75, -0.1), orientation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
      velocity: new Vector3(0, -3, 0), angularVelocity: new Vector3(),
    });
    const field = new SurfWaterBodyField(water);
    const momentum = () => surfer.linearMomentum().add(board.velocity.clone().multiplyScalar(board.mass));
    let contacts = 0;
    for (let i = 0; i < 30 && contacts === 0; i += 1) {
      surfer.step(STEP, field);
      const before = momentum();
      contacts = surfer.resolveBoardContact(board);
      if (contacts > 0) expect(momentum().distanceTo(before)).toBeLessThan(1e-9);
      board.step(STEP, water);
    }
    expect(contacts).toBeGreaterThan(0);
    expect(board.velocity.y).toBeLessThan(0);
  });
});
