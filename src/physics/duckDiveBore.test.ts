import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RideSession } from './RideSession';
import { BoreWater } from './testing/BoreWater';

const STEP = 1 / 60;
/** A duck-dive press lasts about this long, s (coaching sources: a second or two under). */
const HOLD = 1.5;

type Input = { paddle: boolean; popUp: boolean; steer: number; duckDive: number };

/** Ride `inputs` from rest at `z` heading out to sea (−z) on `water`; the board's final z. */
function replay(inputs: readonly Input[], water: BoreWater, z = 0): number {
  const session = new RideSession();
  session.reset(new Vector3(0, 0, z), Math.PI, water);
  for (const input of inputs) {
    session.step(STEP, water, input);
    water.advance(STEP);
  }
  return session.board.position.z;
}

/**
 * A prone paddler heading out to sea (−z) from `z` meets a 1.2 m broken wave.
 * `diveAt` is the front's distance, m, when a HOLD-second duck-dive starts
 * (undefined: stays on top, paddling). Returns the setback, m: how much further
 * shoreward the board is 4 s after the front reached it than the same inputs
 * leave it on still water, and whether the rider is still on.
 */
function meetBore(diveAt?: number, depth = 2.5, z = 0) {
  const water = new BoreWater({ depth, height: 1.2, frontZ: -12 });
  const session = new RideSession();
  session.reset(new Vector3(0, 0, z), Math.PI, water);
  const inputs: Input[] = [];
  let started = -1;
  let passedAt = -1;
  for (let i = 0; i < 900; i += 1) {
    const gap = session.board.position.z - water.frontZ();
    if (diveAt !== undefined && started < 0 && gap <= diveAt) started = i;
    if (passedAt < 0 && gap <= 0) passedAt = i;
    const diving = started >= 0 && (i - started) * STEP < HOLD;
    const input = { paddle: !diving, popUp: false, steer: 0, duckDive: diving ? 1 : 0 };
    inputs.push(input);
    session.step(STEP, water, input);
    water.advance(STEP);
    if (passedAt >= 0 && i - passedAt > 4 / STEP) break;
  }
  const still = replay(inputs, new BoreWater({ depth, height: 0, frontZ: -12 }), z);
  return { pushed: session.board.position.z - still, attached: session.rider.attached };
}

/**
 * The same from five starts 0.3 m apart: which arm pulls as the front arrives moves a single meeting's setback by metres
 * (on top 4.4–7.3 m, a timed dive 1.4–3.8 m at 60 strokes a minute), and the stroke's rate moves the arm (the phase 5
 * physics plan, item 2.8). The mean setback, and the meetings' setbacks with the rider still on.
 */
function meetings(diveAt?: number, depth = 2.5) {
  const runs = [0, 0.3, 0.6, 0.9, 1.2].map((z) => meetBore(diveAt, depth, z));
  const on = runs.filter((run) => run.attached);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return { pushed: mean(runs.map((run) => run.pushed)), on: on.length, pushedOn: on.length ? mean(on.map((run) => run.pushed)) : Number.NaN };
}

describe('duck-dive under a broken wave (survey §5)', () => {
  // Measured 2026-10-21 over the five starts (at 60 strokes a minute in brackets): on top, set back 5.9 m (6.0), the rider
  // on from 3 (2).
  it('a paddler staying on top is set back by a 1.2 m broken wave', () => {
    const top = meetings(undefined);
    expect(top.pushed).toBeGreaterThan(2);
    expect(top.on).toBeGreaterThan(0);
  });

  /*
   * Survey §5: a dive started 2.5 m (about 1–2 body lengths) from the front. It
   * was an open check on one meeting, set back 3.8 m against 4.5 m on top: the
   * front arrives about 0.4 s after the press begins, while the press and knee
   * take 0.55 s and the depth builds over about a second (a real duck-dive is one
   * quick motion carried in by the paddling speed). Over the five starts it is
   * met, and was at 60 strokes a minute too: the timed dive keeps the rider on
   * from 4 (3) and is set back 1.8 m (2.4 m) with it on, against 5.9 m (6.0 m) on
   * top. Counted only with the rider on: until the stages eased in, the check was
   * met because the rider had let go and the board slipped under alone. See
   * docs/research/duck-dive-report.md.
   */
  it('a well-timed dive is pushed back much less than staying on top', () => {
    const top = meetings(undefined);
    const timed = meetings(2.5); // about 1–2 body lengths
    expect(timed.on).toBeGreaterThanOrEqual(3);
    expect(timed.pushedOn).toBeLessThan(0.5 * top.pushed);
  });

  it('diving early or late does worse than on time', () => {
    const timed = meetings(2.5).pushed;
    expect(meetings(12).pushed).toBeGreaterThan(timed);
    expect(meetings(0.2).pushed).toBeGreaterThan(timed);
  });

  it('is weaker in shallow inside water', () => {
    const deep = meetings(2.5, 2.5).pushed / meetings(undefined, 2.5).pushed;
    const shallow = meetings(2.5, 1.3).pushed / meetings(undefined, 1.3).pushed;
    expect(shallow).toBeGreaterThan(deep);
  });
});
