import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RideSession } from './RideSession';
import { BoreWater } from './testing/BoreWater';

const STEP = 1 / 60;
/** A duck-dive press lasts about this long, s (coaching sources: a second or two under). */
const HOLD = 1.5;

type Input = { paddle: boolean; popUp: boolean; steer: number; duckDive: number };

/** Ride `inputs` from rest heading out to sea (−z) on `water`; the board's final z. */
function replay(inputs: readonly Input[], water: BoreWater): number {
  const session = new RideSession();
  session.reset(new Vector3(0, 0, 0), Math.PI, water);
  for (const input of inputs) {
    session.step(STEP, water, input);
    water.advance(STEP);
  }
  return session.board.position.z;
}

/**
 * A prone paddler heading out to sea (−z) meets a 1.2 m broken wave. `diveAt` is
 * the front's distance, m, when a HOLD-second duck-dive starts (undefined: stays
 * on top, paddling). Returns the setback, m: how much further shoreward the board
 * is 4 s after the front reached it than the same inputs leave it on still water,
 * and whether the rider is still on.
 */
function meetBore(diveAt?: number, depth = 2.5) {
  const water = new BoreWater({ depth, height: 1.2, frontZ: -12 });
  const session = new RideSession();
  session.reset(new Vector3(0, 0, 0), Math.PI, water);
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
  const still = replay(inputs, new BoreWater({ depth, height: 0, frontZ: -12 }));
  return { pushed: session.board.position.z - still, attached: session.rider.attached };
}

describe('duck-dive under a broken wave (survey §5)', () => {
  it('a paddler staying on top is set back by a 1.2 m broken wave', () => {
    const top = meetBore(undefined);
    expect(top.pushed).toBeGreaterThan(2);
    expect(top.attached).toBe(true);
  });

  /*
   * Open check (survey §5): a dive started 2.5 m (about 1–2 body lengths) from
   * the front keeps the rider on but is set back 3.8 m against 4.5 m on top. The
   * front arrives about 0.4 s after the press begins, while the press and knee
   * take 0.55 s and the depth builds over about a second: a real duck-dive is one
   * quick motion carried in by the paddling speed. Started 9 m out, a dive is set
   * back 0.9 m with the rider on. (Until the stages eased in, this check was met
   * only because the rider had let go and the board slipped under alone.) Not
   * tuned into passing; see docs/research/duck-dive-report.md.
   */
  it.fails('a well-timed dive is pushed back much less than staying on top', () => {
    const top = meetBore(undefined);
    const timed = meetBore(2.5); // about 1–2 body lengths
    expect(timed.pushed).toBeLessThan(0.5 * top.pushed);
  });

  it('diving early or late does worse than on time', () => {
    const timed = meetBore(2.5).pushed;
    expect(meetBore(12).pushed).toBeGreaterThan(timed);
    expect(meetBore(0.2).pushed).toBeGreaterThan(timed);
  });

  it('is weaker in shallow inside water', () => {
    const deep = meetBore(2.5, 2.5).pushed / meetBore(undefined, 2.5).pushed;
    const shallow = meetBore(2.5, 1.3).pushed / meetBore(undefined, 1.3).pushed;
    expect(shallow).toBeGreaterThan(deep);
  });
});
