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

  // A 25.75 L board under 73 kg (0.35 L/kg, the field study's intermediate) floats awash under a prone rider.
  it('floats prone, nose up with the nose at the surface and the head well above water', () => {
    const { board, rider } = mounted('prone');
    run(board, new PlaneWater(), 6);
    expect(rider.attached).toBe(true);
    expect(Math.abs(board.velocity.y)).toBeLessThan(0.01);
    expect(Math.abs(rider.velocity.y)).toBeLessThan(0.01);
    const head = rider.partPosition(2, new Vector3());
    expect(head.y).toBeGreaterThan(0.2);
    const deck = board.toWorld({ x: 0, y: board.shape.curves.rocker(0.5) + board.shape.curves.thickness(0.5), z: 0 }, new Vector3());
    expect(deck.y).toBeLessThan(0);
    expect(deck.y).toBeGreaterThan(-0.15);
    const nose = board.toWorld({ x: 0, y: board.shape.curves.rocker(1), z: board.shape.length / 2 }, new Vector3());
    expect(Math.abs(nose.y)).toBeLessThan(0.05);
    // Part of the load is the rider's own buoyancy: the board alone floats only 26 kg.
    expect(rider.buoyancy.y).toBeGreaterThan(0);
  });

  // Plan §1.10: a sustainable paddling speed of about 1.5–2 m/s (provisional).
  it('paddles up to a steady 1.5–2 m/s in flat water without planing, pushing the water back', () => {
    const { board, rider } = mounted('prone');
    rider.paddle = true;
    const water = new PlaneWater();
    run(board, water, 20);
    let speed = 0;
    run(board, water, 5, () => {
      speed += board.velocity.z / 300;
    });
    expect(speed).toBeGreaterThan(1.5);
    expect(speed).toBeLessThan(2);
    expect(board.forces.pressure.y).toBeLessThan(0.5 * (board.mass + rider.mass) * WATER.gravity);
    const momentum = board.mass * board.velocity.z + rider.mass * rider.velocity.z;
    expect(water.reaction.z).toBeCloseTo(momentum, 6);
  });

  it('paddles faster over the ground with a following current', () => {
    const cruise = (current: number) => {
      const { board, rider } = mounted('prone');
      rider.paddle = true;
      const water = new PlaneWater({ flow: { x: 0, y: 0, z: current } });
      run(board, water, 20);
      let speed = 0;
      run(board, water, 5, () => {
        speed += board.velocity.z / 300;
      });
      return speed;
    };
    const gain = cruise(0.5) - cruise(0);
    expect(gain).toBeGreaterThan(0.35);
    expect(gain).toBeLessThan(0.65);
  });

  it('gets no stroke force with its hands out of the water', () => {
    const { board, rider } = mounted('prone', 3);
    rider.paddle = true;
    run(board, new PlaneWater({ level: -10 }), 0.5);
    expect(Math.abs(board.mass * board.velocity.z + rider.mass * rider.velocity.z)).toBeLessThan(1e-9);
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
