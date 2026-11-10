import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { HOLLOW, hollowWetShare, railDepth } from './deckHollow';
import { PlaneWater } from './PlaneWater';

const G = 9.81;

describe('the hollow over a banked planing deck (deck-hollow, 2026-11-10)', () => {
  it('is open (dry) behind the entry and sealed (wet) a seal time later, whatever the speed', () => {
    const depth = 0.2;
    const seal = HOLLOW.seal * Math.sqrt(depth / G);
    expect(seal).toBeCloseTo(0.33, 2);
    for (const speed of [4, 7, 10]) {
      expect(hollowWetShare(0, speed, depth), `${speed}`).toBe(0);
      expect(hollowWetShare(HOLLOW.closing * seal * speed, speed, depth), `${speed}`).toBeCloseTo(0, 12);
      expect(hollowWetShare(0.8 * seal * speed, speed, depth), `${speed}`).toBeCloseTo(0.5, 12);
      expect(hollowWetShare(seal * speed, speed, depth), `${speed}`).toBeCloseTo(1, 12);
      expect(hollowWetShare(3 * seal * speed, speed, depth), `${speed}`).toBe(1);
    }
  });

  it('closes sooner over a shallower deck, and from the tail first as the board slows', () => {
    // 1 m behind the entry at 7 m/s: 0.14 s old. A deck 0.3 m under seals at 0.40 s, one 0.02 m under at 0.10 s.
    expect(hollowWetShare(1, 7, 0.3)).toBe(0);
    expect(hollowWetShare(1, 7, 0.02)).toBe(1);
    // The advisor's figure: at 0.2 m it starts closing on the tail (1.2 m back) below about 4 m/s... 6 m/s by the ramp's start.
    expect(hollowWetShare(1.2, 7, 0.2)).toBe(0);
    expect(hollowWetShare(1.2, 4.5, 0.2)).toBeGreaterThan(0.3);
    expect(hollowWetShare(1.2, 3.5, 0.2)).toBe(1);
  });

  it('never stands off the plane, over a deck above the surface or at rest, and fades out in broken water', () => {
    const depth = 0.2;
    const stalled = HOLLOW.planing * Math.sqrt(G * depth);
    expect(hollowWetShare(0.1, stalled * 0.99, depth)).toBe(1);
    expect(hollowWetShare(0.1, stalled * 1.01, depth)).toBe(0);
    expect(hollowWetShare(0.1, 7, 0)).toBe(1);
    expect(hollowWetShare(0.1, 7, -0.05)).toBe(1);
    expect(hollowWetShare(0.1, 0, depth)).toBe(1);
    expect(hollowWetShare(0.1, 7, depth, 0.25)).toBeCloseTo(0.25, 12);
    expect(hollowWetShare(0.1, 7, depth, 1)).toBe(1);
    expect(hollowWetShare(0.1, 7, depth, 3)).toBe(1);
  });

  it("places a rail's deck edge half a patch spacing past its outer patch", () => {
    expect(railDepth(0.1, 0)).toBeCloseTo(0.15, 12);
    expect(railDepth(-0.1, 0)).toBeCloseTo(-0.15, 12);
    expect(railDepth(-Infinity, 0.1)).toBe(-Infinity);
    expect(railDepth(0.1, -Infinity)).toBe(0.1);
  });
});

/** A standing rider on flat water at `speed`, in Compress with the stick held from 0.2 s, for `seconds`. */
function arc(deckHollow: 'on' | undefined, speed: number, steer: number, seconds: number, compress = 1): { board: BoardBody; rider: AttachedRider; water: number } {
  const water = new PlaneWater({ depth: 3 });
  const board = new BoardBody(deckHollow ? { deckHollow } : {});
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  for (let n = 0; n < Math.round(seconds * 60); n += 1) {
    rider.steer = n >= 12 ? steer : 0;
    rider.compress = compress;
    rider.crouch = compress ? 0.6 : 0;
    board.step(1 / 60, water);
  }
  return { board, rider, water: rider.work.water };
}

describe('a Compress turn on flat water with the hollow (`deckHollow: "on"`)', () => {
  it('keeps the legs out of the water the banked deck runs under: the water takes far less from the rider, and the turn keeps more speed', () => {
    const off = arc(undefined, 6, 1, 1.4);
    const on = arc('on', 6, 1, 1.4);
    // Off, the crouched legs over the buried inside rail are counted wet; on, only where the tail has both rails under.
    expect(off.water).toBeLessThan(-300);
    expect(on.water).toBeGreaterThan(off.water * 0.6);
    expect(on.board.work.friction).toBeGreaterThan(off.board.work.friction);
    expect(on.board.velocity.length()).toBeGreaterThan(off.board.velocity.length() + 0.5);
    expect(on.rider.attached).toBe(true);
  });

  it('changes nothing in level trim: both rails ride at one height, so no station has an air path', () => {
    const off = arc(undefined, 7.5, 0, 1.5);
    const on = arc('on', 7.5, 0, 1.5);
    expect(on.board.velocity.z).toBeCloseTo(off.board.velocity.z, 6);
    expect(on.board.centerOfMass.y).toBeCloseTo(off.board.centerOfMass.y, 6);
  });
});
