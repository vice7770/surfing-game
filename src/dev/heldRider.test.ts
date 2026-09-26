import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardBody } from '../physics/BoardBody';
import { PlaneWater } from '../physics/PlaneWater';
import { HeldRider, towAlongHeading } from './heldRider';

const STEP = 1 / 60;

function towed(couple: number, seconds: number) {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0));
  const rider = new HeldRider(board.shape);
  board.attach(rider);
  const water = new PlaneWater();
  towAlongHeading(board, rider, 7);
  rider.rollCouple = couple;
  let widest = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    board.step(STEP, water);
    towAlongHeading(board, rider, 7);
    widest = Math.max(widest, Math.abs(rider.bank.angle) + Math.abs(rider.bank.rate));
  }
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  const rail = -Math.asin(new Vector3(1, 0, 0).applyQuaternion(board.orientation).y);
  return { rider, widest, rail, heading: Math.atan2(forward.x, forward.z) };
}

describe('the held rider (carve lab)', () => {
  it('keeps its body upright on a board towed straight', () => {
    const { rider, widest } = towed(0, 2);
    expect(rider.attached).toBe(true);
    expect(widest).toBeLessThan(1e-6);
  });

  it('rolls the board onto the rail a couple asks for, and the board turns that way', () => {
    const left = towed(30, 1);
    const right = towed(-30, 1);
    expect(left.rider.attached && right.rider.attached).toBe(true);
    expect(left.rail).toBeGreaterThan(0.02);
    expect(left.heading).toBeGreaterThan(0.02);
    expect(right.rail).toBeLessThan(-0.02);
    expect(right.heading).toBeLessThan(-0.02);
  });

  // The carve lab's load line: the board rights about the rider's load line, so under a held, banked body it
  // settles on the bank (share 0.97–1.0 at 7 m/s). Nothing of the rider's own balance may reach the board meanwhile.
  it('lets the board settle on the bank of a held, banked body', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0));
    const rider = new HeldRider(board.shape);
    board.attach(rider);
    const water = new PlaneWater();
    rider.holding = false;
    rider.steer = 0.6;
    for (let i = 0; i < 42; i += 1) {
      towAlongHeading(board, rider, 7);
      board.step(STEP, water);
    }
    rider.holding = true;
    rider.steer = 0;
    for (let i = 0; i < 42; i += 1) {
      towAlongHeading(board, rider, 7);
      board.step(STEP, water);
    }
    const rail = -Math.asin(new Vector3(1, 0, 0).applyQuaternion(board.orientation).y);
    expect(rider.attached).toBe(true);
    expect(rider.bank.angle).toBeGreaterThan(0.2);
    expect(Math.abs(rail / rider.bank.angle - 1)).toBeLessThan(0.15);
  });

  it('rides as any rider when not holding, banking into the steer', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0));
    const rider = new HeldRider(board.shape);
    board.attach(rider);
    rider.holding = false;
    rider.steer = 0.5;
    const water = new PlaneWater();
    for (let i = 0; i < 60; i += 1) {
      towAlongHeading(board, rider, 7);
      board.step(STEP, water);
    }
    expect(rider.attached).toBe(true);
    expect(rider.bank.angle).toBeGreaterThan(0.1);
  });
});
