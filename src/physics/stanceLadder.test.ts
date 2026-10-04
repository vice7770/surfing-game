import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider, CROUCH_DEPTH, CROUCH_SHARE, MANUAL_CROUCH_DEPTH } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;

/** A standing rider gliding at 6 m/s on flat, still water, with `set` applied from the start; `seconds` later, or at each step. */
function glide(set: (rider: AttachedRider) => void, seconds: number, each?: (rider: AttachedRider, board: BoardBody, time: number) => void) {
  const water = new PlaneWater();
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), undefined, new Vector3(0, 0, 6));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  set(rider);
  for (let i = 1; i <= Math.round(seconds / STEP); i += 1) {
    board.step(STEP, water);
    each?.(rider, board, i * STEP);
  }
  return { board, rider };
}

/** The front foot's mean share of the load over the last half second of `seconds`. */
function frontShare(set: (rider: AttachedRider) => void, seconds: number): number {
  let sum = 0;
  let count = 0;
  glide(set, seconds, (rider, _board, time) => {
    if (time <= seconds - 0.5) return;
    sum += rider.contact.frontShare;
    count += 1;
  });
  return sum / count;
}

describe('the height ladder (the movement-flow spec)', () => {
  it('keeps the pumping depth, tucks deeper manually, and retains the Compress depth', () => {
    const pumping = glide((rider) => { rider.crouch = 0.6; }, 1.5).rider;
    const crouched = glide((rider) => { rider.crouch = 1; }, 1.5).rider;
    const compressed = glide((rider) => { rider.compress = 1; }, 1.5).rider;
    expect(pumping.attached && crouched.attached && compressed.attached).toBe(true);
    expect(pumping.leg.rest).toBeCloseTo(-0.6 * CROUCH_SHARE * CROUCH_DEPTH, 2);
    expect(crouched.leg.rest).toBeCloseTo(-MANUAL_CROUCH_DEPTH, 2);
    expect(compressed.leg.rest).toBeCloseTo(-CROUCH_DEPTH, 2);
  });

  it('goes deeper compressing over the pumping crouch than crouching', () => {
    const crouched = glide((rider) => { rider.crouch = 0.6; }, 1.5).rider;
    const both = glide((rider) => { rider.crouch = 0.6; rider.compress = 1; }, 1.5).rider;
    expect(both.attached).toBe(true);
    expect(both.leg.rest).toBeLessThan(crouched.leg.rest - 0.05);
  });

  it('selects the normal Compress stance with a full manual tuck also held', () => {
    const both = glide((rider) => { rider.crouch = 1; rider.compress = 1; }, 1.5).rider;
    expect(both.attached).toBe(true);
    expect(both.leg.rest).toBeCloseTo(-CROUCH_DEPTH, 2);
  });

  // Paced by the turn's load alone, Compress took about a second to its depth riding straight (the spec's Q1).
  it('drops into Compress from standing as fast as into the pumping crouch, and on to its own depth', () => {
    const when = (set: (rider: AttachedRider) => void, depth: number) => {
      let reached = Number.NaN;
      glide(set, 1, (rider, _board, time) => {
        if (Number.isNaN(reached) && rider.leg.rest <= -depth) reached = time;
      });
      return reached;
    };
    const crouchDepth = 0.9 * 0.6 * CROUCH_SHARE * CROUCH_DEPTH;
    expect(when((rider) => { rider.compress = 1; }, crouchDepth)).toBeLessThanOrEqual(when((rider) => { rider.crouch = 0.6; }, crouchDepth) + 0.03);
    expect(when((rider) => { rider.compress = 1; }, 0.9 * CROUCH_DEPTH)).toBeLessThan(0.6);
  });

  it('keeps the weight where W/S put it: Compress no longer moves it forward', () => {
    const at = (compress: number, trim: number) => frontShare((r) => { r.compress = compress; r.trim = trim; }, 2);
    // The trim moves the load as far compressed as standing (the forward weight took about a seventh of S's reach).
    const standingRange = at(0, 0) - at(0, -1);
    const compressedRange = at(1, 0) - at(1, -1);
    expect(standingRange).toBeGreaterThan(0.15);
    expect(compressedRange).toBeGreaterThan(0.95 * standingRange);
  });
});
