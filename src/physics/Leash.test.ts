import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BoardBody } from './BoardBody';
import { LEASH, Leash } from './Leash';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
const node = (mass = 7.5) => ({ position: new Vector3(), velocity: new Vector3(), mass });

describe('leash', () => {
  it('is slack up to its length, soft for 40 % more, then steep', () => {
    const leash = new Leash();
    expect(leash.tensionAt(-0.2, 0)).toBe(0);
    expect(leash.tensionAt(0.4 * LEASH.length, 0)).toBeCloseTo(LEASH.softTension, 5);
    const soft = leash.tensionAt(0.2, 0) / 0.2;
    const steep = (leash.tensionAt(0.4 * LEASH.length + 0.1, 0) - leash.tensionAt(0.4 * LEASH.length, 0)) / 0.1;
    expect(steep).toBeGreaterThan(8 * soft);
  });

  it('never pushes: closing, a stretched cord keeps only its spring, and a slack one carries nothing', () => {
    const leash = new Leash();
    expect(leash.tensionAt(0.05, -3)).toBeCloseTo(leash.tensionAt(0.05, 0), 9);
    expect(leash.tensionAt(-0.1, -3)).toBe(0);
    expect(leash.tensionAt(0.05, 3)).toBeGreaterThan(leash.tensionAt(0.05, 0));
  });

  it('stops a board thrown away from a floating swimmer, and the pair settles', () => {
    const water = new PlaneWater();
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y - 0.02, 0.5), new Quaternion(), new Vector3(0, 0, 6));
    const ankle = node(73);
    const leash = new Leash();
    let furthest = 0;
    for (let i = 0; i < 600; i += 1) {
      board.step(STEP, water);
      leash.step(STEP, ankle.position, ankle, board.position, board, false);
      ankle.position.addScaledVector(ankle.velocity, STEP);
      furthest = Math.max(furthest, board.position.distanceTo(ankle.position));
      expect(Number.isFinite(board.position.z)).toBe(true);
    }
    expect(leash.snapped).toBe(false);
    expect(furthest).toBeLessThan(LEASH.length * 1.55);
    expect(board.velocity.clone().sub(ankle.velocity).length()).toBeLessThan(0.5);
  });

  it('holds at 1.1 kN, snaps at 1.3 kN, and then holds nothing', () => {
    /** The distance at which the resting cord pulls `tension`, N. */
    const at = (tension: number) => LEASH.length * (1 + LEASH.softShare) + (tension - LEASH.softTension) / LEASH.stiffness;
    const pull = (distance: number) => {
      const board = new BoardBody();
      board.place(new Vector3(0, 0, distance));
      const ankle = node(1e6);
      const leash = new Leash();
      leash.step(STEP, ankle.position, ankle, board.position, board, false);
      return { leash, board, ankle };
    };
    const holding = pull(at(1100));
    expect(holding.leash.snapped).toBe(false);
    expect(holding.leash.tension).toBeCloseTo(1100, 0);
    const { leash, board, ankle } = pull(at(1300));
    expect(leash.snapped).toBe(true);
    const before = board.velocity.clone();
    leash.step(STEP, ankle.position, ankle, board.position, board, false);
    expect(board.velocity.distanceTo(before)).toBe(0);
    expect(leash.tension).toBe(0);
  });

  it('reels the board in hand over hand, down to reach, and lets the cord out when released', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, 0, 1.8));
    const ankle = node(1e6);
    const leash = new Leash();
    for (let i = 0; i < 300; i += 1) {
      leash.step(STEP, ankle.position, ankle, board.position, board, true);
      board.position.addScaledVector(board.velocity, STEP);
      board.centerOfMass.addScaledVector(board.velocity, STEP);
      board.velocity.multiplyScalar(0.9);
    }
    expect(leash.length).toBeCloseTo(LEASH.reach, 2);
    expect(board.position.distanceTo(ankle.position)).toBeLessThan(LEASH.reach + 0.2);
    leash.step(STEP, ankle.position, ankle, board.position, board, false);
    expect(leash.length).toBe(LEASH.length);
  });

  // Review Focus 4: the arms can't pull harder than they are able to.
  it('never reels harder than the arms can pull, so reeling alone cannot snap it', () => {
    const board = new BoardBody();
    board.place(new Vector3(0, 0, LEASH.length));
    const ankle = node(1e6);
    const leash = new Leash();
    let most = 0;
    for (let i = 0; i < 600; i += 1) {
      board.velocity.set(0, 0, 1.5); // held seaward by a rip
      leash.step(STEP, ankle.position, ankle, board.position, board, true);
      board.position.addScaledVector(board.velocity, STEP);
      board.centerOfMass.addScaledVector(board.velocity, STEP);
      most = Math.max(most, leash.tension);
    }
    expect(leash.snapped).toBe(false);
    expect(most).toBeLessThanOrEqual(LEASH.reelForce);
  });
});
