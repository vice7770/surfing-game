import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { PlaneWater } from '../physics/PlaneWater';
import { RideSession, type RideInput } from '../physics/RideSession';
import { HoldReading } from './holdReading';

const STEP = 1 / 60;

/**
 * A ride session as the page sees it: each step the status the runner writes
 * (`boardInReach`: free and in reach), a new object per delivery, and the
 * page's reading of the hold against the session's own.
 */
function compare(seconds: number, input: (time: number, session: RideSession) => Partial<RideInput>, speed = 2) {
  const session = new RideSession();
  const water = new PlaneWater();
  session.place({ x: 0, z: 0, heading: 0, speed, phase: 'standing' }, water);
  const reading = new HoldReading();
  let status: { boardInReach: boolean } | undefined;
  let frames = 0;
  let agree = 0;
  let held = 0;
  let time = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    const asked: RideInput = { paddle: false, popUp: false, steer: 0, ...input(time, session) };
    // The page reads the hold from what it asks this frame and the status it last had, before the step.
    const holding = reading.update({
      fallen: !session.rider.attached, asked: asked.popUp || (asked.reel ?? false), diving: (asked.duckDive ?? 0) > 0.3, status,
      chest: session.renderPoint(1, new Vector3()), board: session.board.position, turn: session.board.orientation,
    });
    session.step(STEP, water, asked);
    time += STEP;
    status = { boardInReach: session.surfer.active && session.recovery.state === 'free' && session.recovery.inReach(session.board) };
    if (!session.rider.attached) {
      frames += 1;
      const truth = session.recovery.state === 'holding';
      if (truth === holding) agree += 1;
      if (truth) held += 1;
    }
  }
  return { frames, agree, held, reading };
}

describe('the page\'s reading of the hold (the animation-realism plan, phase 4)', () => {
  it('reads the swimmer holding the board as the session has it, from the pop-up key and the chest by the board', () => {
    // A slow fall, the key held from 3 s (reeling, then grabbing): the session holds from 16.3 s and comes on at 17.2 s.
    const climb = compare(18, (time, session) => {
      if (Math.abs(time - 0.5) < STEP / 2 && session.rider.attached) session.separate('balance');
      return { reel: time > 3 };
    });
    expect(climb.held).toBeGreaterThan(30);
    expect(climb.agree / climb.frames).toBeGreaterThan(0.99);
  });

  it('lets go diving, and on the board again', () => {
    const dive = compare(18, (time, session) => {
      if (Math.abs(time - 0.5) < STEP / 2 && session.rider.attached) session.separate('balance');
      return { reel: time > 3 && time < 16.5, duckDive: time > 16.5 ? 1 : 0 };
    });
    expect(dive.agree / dive.frames).toBeGreaterThan(0.99);
    const reading = new HoldReading();
    const at = new Vector3();
    reading.update({ fallen: true, asked: true, diving: false, status: { boardInReach: true }, chest: at, board: at, turn: new Quaternion() });
    expect(reading.holding).toBe(true);
    expect(reading.update({ fallen: false, asked: false, diving: false, status: undefined, chest: at, board: at, turn: new Quaternion() })).toBe(false);
  });

  it('lets go once a newer status finds the board free and in reach again (the grab missed), not on the same one', () => {
    const reading = new HoldReading();
    const at = new Vector3();
    const first = { boardInReach: true };
    reading.update({ fallen: true, asked: true, diving: false, status: first, chest: at, board: at, turn: new Quaternion() });
    expect(reading.update({ fallen: true, asked: false, diving: false, status: first, chest: at, board: at, turn: new Quaternion() })).toBe(true);
    expect(reading.update({ fallen: true, asked: false, diving: false, status: { boardInReach: false }, chest: at, board: at, turn: new Quaternion() })).toBe(true);
    expect(reading.update({ fallen: true, asked: false, diving: false, status: { boardInReach: true }, chest: at, board: at, turn: new Quaternion() })).toBe(false);
    // Too far from the board, the physics lets go too.
    reading.update({ fallen: true, asked: true, diving: false, status: { boardInReach: true }, chest: at, board: at, turn: new Quaternion() });
    expect(reading.update({ fallen: true, asked: false, diving: false, status: undefined, chest: new Vector3(3, 0, 0), board: at, turn: new Quaternion() })).toBe(false);
  });
});
