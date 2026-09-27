import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { REFERENCE_BOARD } from './boardReference';
import { buildBoardShape, type BoardShape } from './boardShape';
import { PlaneWater } from './PlaneWater';
import { deckHeight } from './riderPosture';

const STEP = 1 / 60;

/** A prone rider settled on flat water. */
function proneRider(shape: BoardShape = buildBoardShape()) {
  const water = new PlaneWater();
  const board = new BoardBody({ shape });
  board.place(new Vector3(0, shape.centerOfMass.y - 0.03, 0));
  const rider = new AttachedRider(board.shape);
  board.attach(rider);
  for (let i = 0; i < 120; i += 1) board.step(STEP, water);
  return { water, board, rider };
}

/** The deck at mid-length, below the surface, m. */
function deckDepth(board: BoardBody): number {
  return -board.toWorld({ x: 0, y: deckHeight(board.shape, 0), z: 0 }, new Vector3()).y;
}

/**
 * The dive held `hold` s at `amount`, then released for `after` s: the deck's
 * deepest point under the surface, whether it came back up to where it floats
 * lying down, and whether the rider stayed on.
 */
function duckDive(amount: number, hold = 1.5, after = 3, shape?: BoardShape) {
  const { water, board, rider } = proneRider(shape);
  const resting = deckDepth(board);
  let deepest = 0;
  for (let i = 0; i < (hold + after) / STEP; i += 1) {
    rider.duckDive = i * STEP < hold ? amount : 0;
    board.step(STEP, water);
    deepest = Math.max(deepest, deckDepth(board));
  }
  // Lying down, the deck floats awash: back up means back within 5 cm of that.
  return { deepest, surfaced: deckDepth(board) < resting + 0.05, attached: rider.attached, rider, board };
}

describe('duck-dive', () => {
  it('keeps the body on the deck through the press, the knee and the release (each stage eases in)', () => {
    // A stage that starts at full acceleration asks the hands to pull the body onto the deck far beyond
    // their grip, and it leaves the board even on still water.
    const { water, board, rider } = proneRider();
    let lifted = 0;
    for (let i = 0; i < 4.5 / STEP; i += 1) {
      rider.duckDive = i * STEP < 1.5 ? 1 : 0;
      board.step(STEP, water);
      if (!rider.inContact) lifted += STEP;
    }
    expect(lifted).toBe(0);
    expect(rider.attached).toBe(true);
  });

  it('comes back up with the rider on after a full push, deeper than lying awash', () => {
    const full = duckDive(1);
    expect(full.deepest).toBeGreaterThan(0.3);
    expect(full.attached).toBe(true);
    expect(full.surfaced).toBe(true);
  });

  /*
   * Open check (the wipeout spec's Part A, survey §5): a strong push sinks the
   * reference board 0.5–1 m. On flat water from rest it reaches 0.43 m (0.39 m
   * from paddling speed): the press lifts the upper body out of the water and its
   * weight holds the pair down until the body re-enters the water and floats it,
   * about 9° nose-up. What it lacks is the dynamic push-and-follow of a real
   * duck-dive (the body's momentum driving the board in nose first). Not tuned
   * into passing; see docs/research/duck-dive-report.md.
   */
  it.fails('a strong push sinks the reference board 0.5–1 m (survey §5)', () => {
    const full = duckDive(1);
    expect(full.deepest).toBeGreaterThan(0.5);
    expect(full.deepest).toBeLessThan(1.0);
  });

  /*
   * Open check: the real surf zone's report had every diver let go (fixed for the
   * press itself: it now eases in and out, and the hands grip the rails). From
   * paddling speed on flat water the pair still rolls over about 1.5 s into the
   * dive: under water the board has no waterplane, and the hull gives a
   * submerged board neither a plate's face-on drag (it meets the flow with the
   * planing coefficient, about 0.46 against a plate's 1.2) nor added roll
   * inertia, so the raised rider rides an inverted pendulum the balance cannot
   * catch. Faster leaning, reflex gains and a lower knee did not hold it. The
   * fix is the submerged board's hydrodynamics, a board-solver change.
   */
  it.fails('keeps hold of the board when ducking from paddling speed', () => {
    const { water, board, rider } = proneRider();
    rider.paddle = true;
    for (let i = 0; i < 240; i += 1) board.step(STEP, water);
    rider.paddle = false;
    rider.duckDive = 1;
    for (let i = 0; i < 90; i += 1) board.step(STEP, water);
    expect(rider.attached).toBe(true);
    rider.duckDive = 0;
    for (let i = 0; i < 120; i += 1) board.step(STEP, water);
    expect(rider.attached).toBe(true);
  });

  it('pushes shallower on a lighter press (analog)', () => {
    expect(duckDive(0.5).deepest).toBeLessThan(duckDive(1).deepest - 0.1);
  });

  it('sinks a 50 L board less than the reference', () => {
    const big = buildBoardShape({ ...REFERENCE_BOARD, length: 2.13, width: 0.54, thickness: 0.076, volume: 0.05, mass: 4.5 });
    expect(duckDive(1, 1.5, 3, big).deepest).toBeLessThan(duckDive(1).deepest - 0.1);
  });

  /*
   * Open check (survey §5): a board over about 50 L is practically un-diveable.
   * The static press still holds the 50 L board 0.25 m under (0.58 of the
   * reference's depth): the same missing dynamics as above. Not tuned into passing.
   */
  it.fails('a 50 L board is practically un-diveable (survey §5)', () => {
    // A 7'0" funboard, 21.3" x 3" (2.13 x 0.54 x 0.076 m), 50 L.
    const big = buildBoardShape({ ...REFERENCE_BOARD, length: 2.13, width: 0.54, thickness: 0.076, volume: 0.05, mass: 4.5 });
    expect(duckDive(1, 1.5, 3, big).deepest).toBeLessThan(0.5 * duckDive(1).deepest);
  });

  /*
   * Open check (the spec's "arms push the nose"; coaching sinks the nose 40–60 cm,
   * survey §5): the press tips the board further nose-up, 9° to 13°, the tail
   * sinking and the nose staying at the surface. Lying prone, the reference board
   * is already fully under water (25.8 L, its buoyancy acting at z −0.056 m), and
   * the rider, rigid on the deck, loads it through its centre of mass: the press
   * brings that to z −0.067 m, level with the board's buoyancy, never onto the
   * hands. A real press pivots the body on the hands, the hips and legs carried by
   * the water. Tried: the legs trailing in the water (12.6°), an upward-dog press
   * with the hips down (9.7°, no longer tipping up but not down). Not tuned into
   * passing; see ROADMAP (P11, wipeout slice).
   */
  it.fails('the arms sink the nose first: the press tips the board nose-down and puts the nose under', () => {
    const { water, board, rider } = proneRider();
    const noseY = () => board.toWorld({ x: 0, y: deckHeight(board.shape, board.shape.length / 2 - 0.05), z: board.shape.length / 2 - 0.05 }, new Vector3()).y;
    const pitch = () => Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y);
    const [restPitch, restNose] = [pitch(), noseY()];
    rider.duckDive = 1;
    for (let i = 0; i < 18; i += 1) board.step(STEP, water); // 0.3 s: the press, before the knee lands
    expect(pitch()).toBeLessThan(restPitch - (3 * Math.PI) / 180);
    expect(noseY()).toBeLessThan(Math.min(0, restNose) - 0.1);
  });

  it('the knee follows the arms about 0.3 s later, and both let go on release', () => {
    const { water, board, rider } = proneRider();
    rider.duckDive = 1;
    for (let i = 0; i < 12; i += 1) board.step(STEP, water); // 0.2 s
    expect(rider.duck.press).toBeGreaterThan(0.5);
    expect(rider.duck.knee).toBe(0);
    for (let i = 0; i < 30; i += 1) board.step(STEP, water); // 0.7 s
    expect(rider.duck.knee).toBeGreaterThan(0.5);
    rider.duckDive = 0;
    for (let i = 0; i < 15; i += 1) board.step(STEP, water); // a quarter into the 1 s release: easing back
    expect(rider.duck.press).toBeGreaterThan(0.2);
    expect(rider.duck.press).toBeLessThan(0.9);
    for (let i = 0; i < 51; i += 1) board.step(STEP, water);
    expect(rider.duck.press + rider.duck.knee).toBe(0);
  });

  it('does not paddle while ducking', () => {
    const strokes = (duck: number) => {
      const { water, board, rider } = proneRider();
      rider.paddle = true;
      rider.duckDive = duck;
      let load = 0;
      // The arms take the rails within the press's first 0.1 s.
      for (let i = 0; i < 90; i += 1) {
        board.step(STEP, water);
        if (i >= 6) load += rider.handLoad[0] + rider.handLoad[1];
      }
      return load;
    };
    expect(strokes(0)).toBeGreaterThan(0);
    expect(strokes(1)).toBe(0);
  });

  it('reaches the hands forward onto the rails, ahead of the chest, while ducking', () => {
    const { water, board, rider } = proneRider();
    rider.duckDive = 1;
    for (let i = 0; i < 30; i += 1) board.step(STEP, water);
    const hand = board.toLocal(rider.renderPoint(3, board, new Vector3()), new Vector3());
    const chest = board.toLocal(rider.renderPoint(1, board, new Vector3()), new Vector3());
    const half = board.shape.curves.width(Math.min(1, Math.max(0, hand.z / board.shape.length + 0.5))) / 2;
    expect(Math.abs(Math.abs(hand.x) - half)).toBeLessThan(0.05);
    expect(hand.z).toBeGreaterThan(chest.z + 0.1);
  });

  it('draws the kneeling leg\'s foot on the deck behind the knee', () => {
    const { water, board, rider } = proneRider();
    rider.duckDive = 1;
    for (let i = 0; i < 45; i += 1) board.step(STEP, water);
    expect(rider.duck.knee).toBeGreaterThan(0.8);
    // Regular: the back (right) foot, point 6.
    const foot = board.toLocal(rider.renderPoint(6, board, new Vector3()), new Vector3());
    expect(foot.y).toBeGreaterThan(deckHeight(board.shape, foot.z) - 0.02);
    expect(foot.z).toBeLessThan(-0.6);
  });

  // The stances spec made the stance change between rides: the duck-dive follows it.
  it('ducks in the stance the rider has now, the back knee on the tail', () => {
    const { water, board, rider } = proneRider();
    rider.stance = 'goofy';
    rider.duckDive = 1;
    for (let i = 0; i < 45; i += 1) board.step(STEP, water);
    // Goofy: the back (left, part 5) knee on the tail, the front (right, part 6) leg kicked up.
    expect(rider.parts[6 * 3 + 1]).toBeGreaterThan(rider.parts[5 * 3 + 1] + 0.2);
  });

  // Review Focus 3.
  it('does nothing standing', () => {
    const water = new PlaneWater();
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y - 0.03, 0));
    const standing = new AttachedRider(board.shape, { phase: 'standing' });
    board.attach(standing);
    standing.duckDive = 1;
    board.step(STEP, water);
    expect(standing.duck.press).toBe(0);
  });

  // Review Focus 3.
  it('refuses a pop-up while ducking', () => {
    const { rider } = duckDive(1, 0.3, 0);
    expect(rider.popUp()).toBe(false);
  });

  // Review Focus 5.
  it('comes back lying normally after a relaunch mid-duck', () => {
    const { rider, board } = duckDive(1, 0.5, 0);
    board.attach(rider);
    expect(rider.duck.press + rider.duck.knee).toBe(0);
  });
});

// The wipeout spec, Part B: aerated water holds a prone pair lower.
describe('lying down in aerated water', () => {
  it('sits deeper than in clear water', () => {
    const deck = (air: number) => {
      const water = new PlaneWater({ voidFraction: air });
      const board = new BoardBody();
      board.place(new Vector3(0, board.shape.centerOfMass.y - 0.03, 0));
      const rider = new AttachedRider(board.shape);
      board.attach(rider);
      // Heavier than aerated water, the pair keeps sinking: 3 s in.
      for (let i = 0; i < 180; i += 1) board.step(STEP, water);
      return deckDepth(board);
    };
    expect(deck(0.15)).toBeGreaterThan(deck(0) + 0.08);
  });
});
