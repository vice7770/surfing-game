import { describe, expect, it } from 'vitest';
import { PADDLE_RESERVE, PaddleReserve } from './PaddleReserve';

// The sprint paddle's reserve (the owner's choices of 2026-10-22): 8 s of sprinting, 15 s to refill, and a quarter back
// before an emptied one sprints again.
describe('PaddleReserve', () => {
  const STEP = 1 / 60;
  const run = (reserve: PaddleReserve, sprinting: boolean, seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i += 1) reserve.step(STEP, sprinting);
  };

  it('lasts 8 s of sprinting from full', () => {
    expect(PADDLE_RESERVE).toMatchObject({ drain: 8, refill: 15, again: 0.25 });
    const reserve = new PaddleReserve();
    run(reserve, true, 7.9);
    expect(reserve.available).toBe(true);
    expect(reserve.level).toBeCloseTo(0.1 / 8, 3);
    run(reserve, true, 0.2);
    expect(reserve.level).toBe(0);
    expect(reserve.available).toBe(false);
  });

  it('refills in 15 s of anything else, from empty', () => {
    const reserve = new PaddleReserve();
    run(reserve, true, 9);
    run(reserve, false, 14.9);
    expect(reserve.level).toBeLessThan(1);
    run(reserve, false, 0.2);
    expect(reserve.level).toBe(1);
  });

  it('waits, emptied, until a quarter is back before it sprints again', () => {
    const reserve = new PaddleReserve();
    run(reserve, true, 9);
    run(reserve, false, 3.6);
    expect(reserve.spent).toBe(true);
    expect(reserve.available).toBe(false);
    run(reserve, false, 0.2);
    expect(reserve.level).toBeGreaterThanOrEqual(0.25);
    expect(reserve.available).toBe(true);
    // Not emptied, a part-used reserve sprints whenever it has any.
    const part = new PaddleReserve();
    run(part, true, 4);
    expect(part.available).toBe(true);
  });

  it('is full again after a reset (a new session or a retry)', () => {
    const reserve = new PaddleReserve();
    run(reserve, true, 9);
    reserve.reset();
    expect(reserve).toMatchObject({ level: 1, spent: false });
  });
});
