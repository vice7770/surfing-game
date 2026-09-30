import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
const RANGE = (45 * Math.PI) / 180;

/** A standing rider gliding at 6 m/s on flat, still water with `rotate` asked from the start, and the board's yaw rate at each step. */
function glide(rotate: number, seconds: number, each?: (rider: AttachedRider, board: BoardBody, time: number) => void) {
  const water = new PlaneWater();
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), undefined, new Vector3(0, 0, 6));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  rider.rotate = rotate;
  for (let i = 1; i <= Math.round(seconds / STEP); i += 1) {
    board.step(STEP, water);
    each?.(rider, board, i * STEP);
  }
  return { board, rider };
}

describe('the upper body\'s twist (the movement-flow spec)', () => {
  it('turns toward the rotation asked for within its range', () => {
    let reached = Number.NaN;
    let most = 0;
    const { rider } = glide(1, 1, (r, _board, time) => {
      if (Number.isNaN(reached) && r.twist.angle >= 0.9 * RANGE) reached = time;
      most = Math.max(most, Math.abs(r.twist.angle));
    });
    expect(rider.attached).toBe(true);
    expect(reached).toBeLessThan(0.65);
    expect(most).toBeLessThanOrEqual(RANGE + 1e-9);
    expect(glide(-0.5, 1).rider.twist.angle).toBeCloseTo(-0.5 * RANGE, 2);
  });

  it('rests with no rotation asked for, as the keyboard rides', () => {
    let most = 0;
    glide(Number.NaN, 1, (rider) => { most = Math.max(most, Math.abs(rider.twist.angle)); });
    expect(most).toBe(0);
  });

  // The hips turn the upper body one way and the board the other through the feet; as the twist stops, back again.
  it('turns the board the other way as the upper body starts to twist', () => {
    const rates: number[] = [];
    glide(1, 0.5, (_rider, board) => rates.push(board.angularVelocity.y));
    const start = Math.min(...rates.slice(0, 6));
    expect(start).toBeLessThan(-0.05);
  });
});
