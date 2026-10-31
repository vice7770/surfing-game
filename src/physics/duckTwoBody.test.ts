import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { REFERENCE_BOARD } from './boardReference';
import { buildBoardShape } from './boardShape';
import { PlaneWater } from './PlaneWater';
import { RideSession, type RideSessionOptions } from './RideSession';
import { deckHeight } from './riderPosture';

const STEP = 1 / 60;
const idle = { paddle: false, popUp: false, steer: 0 };
const DEGREE = Math.PI / 180;

/**
 * A rider lying on flat water (after `paddle` s paddling), then holding the Duck-dive `hold` s and letting go for
 * `after` s: the deck's deepest at its middle, the board's pitch 0.3 s in (nose-down negative), and how it ended.
 */
function dive(hold: number, paddle = 0, after = 4, options: RideSessionOptions = {}) {
  const water = new PlaneWater({ depth: 5 });
  const session = new RideSession(options);
  session.reset(new Vector3(), 0, water);
  for (let i = 0; i < 120; i += 1) session.step(STEP, water, idle);
  for (let i = 0; i < paddle / STEP; i += 1) session.step(STEP, water, { ...idle, paddle: true });
  const { board } = session;
  const pitch = () => Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y);
  const depth = (z: number) => water.surfaceAt(0, 0) - board.toWorld({ x: 0, y: deckHeight(board.shape, z), z }, new Vector3()).y;
  const rest = pitch();
  let deepest = 0;
  let pitchEarly = 0;
  let noseFirst = false;
  let kept = true;
  let back = Number.NaN;
  for (let i = 0; i < (hold + after) / STEP; i += 1) {
    const t = i * STEP;
    session.step(STEP, water, { ...idle, duckDive: t < hold ? 1 : 0 });
    deepest = Math.max(deepest, depth(0));
    if (Math.abs(t - 0.3) < STEP / 2) {
      pitchEarly = pitch();
      noseFirst = depth(board.shape.length / 2 - 0.1) > depth(-board.shape.length / 2 + 0.1);
    }
    if (!session.rider.attached) kept = false;
    if (t > hold && Number.isNaN(back) && session.rider.attached && !session.ducking && !session.rider.climbingOn) back = t - hold;
  }
  return { session, rest, pitchEarly, noseFirst, deepest, kept, back };
}

// duck-two-body (2026-10-31; docs/research/duck-dive-2026-10-31/two-body-plan.md, steps 2–4): the rider ducks as its own
// body held to the rails, the board under water as a submerged plate. The duck-dive-l3 README's numbers for the rigid
// rider: nose-up 9° → 13°, 0.42 m deep, rolled over 1.1 s into a dive from paddling speed.
describe('the two-body duck-dive', () => {
  it('pushes the nose down first: the board pitches nose-down, its nose deeper than its tail', () => {
    const { rest, pitchEarly, noseFirst } = dive(1.5);
    expect(pitchEarly).toBeLessThan(rest - 5 * DEGREE);
    expect(noseFirst).toBe(true);
  });

  it('sinks the reference board 0.5–1 m with a strong push (survey §5)', () => {
    const { deepest } = dive(1.5);
    expect(deepest).toBeGreaterThan(0.5);
    expect(deepest).toBeLessThan(1);
  });

  it('keeps hold of the board through a 3 s dive from paddling speed, and lies on it again after', () => {
    const { kept, back } = dive(3, 4, 6);
    expect(kept).toBe(true);
    expect(back).toBeGreaterThan(0);
    expect(back).toBeLessThan(6);
  });

  it('lies on the board again a few seconds after a dive from rest', () => {
    const { kept, back, session } = dive(1.5, 0, 6);
    expect(kept).toBe(true);
    expect(back).toBeLessThan(5);
    expect(session.phase).toBe('prone');
  });

  /*
   * Open check (survey §5): a board over about 50 L is practically un-diveable. The two-body dive sinks the 50 L board
   * 0.58 m against the reference's 0.61, though the arms' 250 N and the knee's 150 N are short of its 460 N net
   * buoyancy. Not yet explained (unverified: the body, up out of the water over the deck as the press begins, may load it
   * with its weight in air through the deck's contact). Not tuned into passing.
   */
  it.fails('cannot sink a 50 L board half as deep as the reference (survey §5: practically un-diveable)', () => {
    // A 7'0" funboard, 21.3" x 3" (2.13 x 0.54 x 0.076 m), 50 L.
    const big = buildBoardShape({ ...REFERENCE_BOARD, length: 2.13, width: 0.54, thickness: 0.076, volume: 0.05, mass: 4.5 });
    const reference = dive(1.5).deepest;
    expect(dive(1.5, 0, 4, { shape: big }).deepest).toBeLessThan(0.5 * reference);
  });

  it('keeps the rigid rider\'s dive with `duckBody: \'old\'`', () => {
    const { session } = dive(0.5, 0, 0.1, { duckBody: 'old' });
    expect(session.ducking).toBe(false);
    expect(session.rider.duck.press).toBeGreaterThan(0.3);
  });
});
