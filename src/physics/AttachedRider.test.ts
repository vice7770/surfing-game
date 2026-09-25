import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { REFERENCE_RIDER } from './boardReference';
import { WATER } from './hullForces';
import { PlaneWater } from './PlaneWater';
import { stanceFeet } from './riderPosture';
import type { SurfWater } from './SurfWater';

const STEP = 1 / 60;

/** A board level at the surface (lowest bottom point at `bottomY`) with a rider mounted in `phase`. */
function mounted(phase: 'standing' | 'prone' = 'standing', bottomY = 0) {
  const board = new BoardBody();
  board.place(new Vector3(0, bottomY + board.shape.centerOfMass.y, 0));
  const rider = new AttachedRider(board.shape, { phase });
  board.attach(rider);
  return { board, rider };
}

function run(board: BoardBody, water: SurfWater, seconds: number, each?: () => void): void {
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    board.step(STEP, water);
    each?.();
  }
}

const totalWork = (board: BoardBody, rider: AttachedRider) =>
  Object.values(board.work).reduce((a, b) => a + b, 0) + Object.values(rider.work).reduce((a, b) => a + b, 0);

describe('rider coupled to the board', () => {
  it('reports more front-foot load during landing than in the settled stance', () => {
    const read = (phase: 'landing' | 'standing') => {
      const board = new BoardBody();
      board.place(new Vector3(0, board.shape.centerOfMass.y, 0));
      const rider = new AttachedRider(board.shape, { phase });
      board.attach(rider);
      const tow = () => {
        board.velocity.z = 6;
        rider.velocity.z = 6;
      };
      tow();
      run(board, new PlaneWater(), 1, tow);
      return { front: rider.contact.frontShare, force: rider.contact.force.y, feasible: rider.contact.feasible };
    };
    const landing = read('landing');
    const standing = read('standing');
    expect(landing.feasible).toBe(true);
    expect(standing.feasible).toBe(true);
    expect(landing.force).toBeGreaterThan(0);
    expect(standing.force).toBeGreaterThan(0);
    expect(landing.front).toBeGreaterThan(standing.front);
  });

  it('rides a board towed at 6 m/s, pressing its weight onto the deck between its feet', () => {
    const { board, rider } = mounted('standing');
    const tow = () => {
      board.velocity.z = 6;
      rider.velocity.z = 6;
    };
    tow();
    run(board, new PlaneWater(), 4, tow);
    expect(rider.attached).toBe(true);
    expect(rider.inContact).toBe(true);
    expect(Math.abs(board.velocity.y)).toBeLessThan(0.01);
    expect(Math.abs(rider.velocity.y)).toBeLessThan(0.01);
    const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    expect(rider.contact.force.dot(up) / (REFERENCE_RIDER.mass * WATER.gravity)).toBeCloseTo(1, 1);
    const { rear, front } = stanceFeet(board.shape);
    expect(rider.contact.centreOfPressure.z).toBeGreaterThan(rear - 0.06);
    expect(rider.contact.centreOfPressure.z).toBeLessThan(front + 0.06);
    expect(Math.abs(rider.contact.centreOfPressure.x)).toBeLessThan(0.13);
    expect(rider.postureError).toBeLessThan(0.01);
  });

  it('sinks a board it stands on at rest', () => {
    const { board, rider } = mounted('standing');
    run(board, new PlaneWater(), 1);
    expect(board.position.y).toBeLessThan(-0.1);
    expect(rider.position.y - board.position.y).toBeGreaterThan(0.5);
  });

  it('lets go once it tips beyond recovery, and stops loading the board', () => {
    const { board, rider } = mounted('standing');
    run(board, new PlaneWater(), 4);
    expect(rider.attached).toBe(false);
    expect(['balance', 'foot slip', 'lost board']).toContain(rider.separation);
    // Relieved of the rider, the board floats back to its own draft.
    expect(board.lowestPoint()).toBeGreaterThan(-0.05);
  });

  it('falls with the board as one body in the air, conserving momentum', () => {
    const { board, rider } = mounted('standing', 5);
    const water = new PlaneWater({ inside: () => false });
    const before = board.velocity.clone().multiplyScalar(board.mass).addScaledVector(rider.velocity, rider.mass);
    run(board, water, 0.5);
    const after = board.velocity.clone().multiplyScalar(board.mass).addScaledVector(rider.velocity, rider.mass);
    const gravity = -(board.mass + rider.mass) * WATER.gravity * 0.5;
    expect(after.y - before.y).toBeCloseTo(gravity, 6);
    expect(Math.abs(after.x) + Math.abs(after.z)).toBeLessThan(1e-9);
    expect(rider.postureError).toBeLessThan(0.01);
  });

  it('closes the board and rider energy ledger through a landing', () => {
    const { board, rider } = mounted('prone', 0.3);
    const before = board.kineticEnergy() + rider.kineticEnergy();
    run(board, new PlaneWater(), 2);
    const change = board.kineticEnergy() + rider.kineticEnergy() - before;
    const scale = (board.mass + rider.mass) * WATER.gravity * 0.3;
    expect(Math.abs(change - totalWork(board, rider)) / scale).toBeLessThan(0.01);
  });

  it('cannot pull the rider down with a board that drops away: it flies instead', () => {
    const { board, rider } = mounted('standing');
    const water = new PlaneWater();
    const tow = () => {
      board.velocity.z = 6;
      rider.velocity.z = 6;
    };
    tow();
    run(board, water, 1, tow);
    const riderFall = rider.velocity.y;
    board.velocity.y = -4;
    board.step(STEP, water);
    expect(rider.inContact).toBe(false);
    expect(rider.contact.feasible).toBe(false);
    expect(rider.velocity.y).toBeGreaterThan(riderFall - WATER.gravity * STEP - 1e-6);
  });
});
