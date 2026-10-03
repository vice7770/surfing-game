import { describe, expect, it } from 'vitest';
import { VariantCycle } from './variants';

/** A small seeded generator, so a run is the same every time. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('VariantCycle', () => {
  it('plays a lone recording every time', () => {
    const cycle = new VariantCycle(1);
    expect([cycle.next(), cycle.next(), cycle.next()]).toEqual([0, 0, 0]);
    expect(new VariantCycle(0).next()).toBe(0);
  });

  it('plays every recording once per round, in a shuffled order', () => {
    const cycle = new VariantCycle(8, seeded(3));
    const orders = new Set<string>();
    for (let round = 0; round < 6; round += 1) {
      const picks = Array.from({ length: 8 }, () => cycle.next());
      expect([...picks].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      orders.add(picks.join());
    }
    // Not the same round over and over.
    expect(orders.size).toBeGreaterThan(1);
  });

  it('never repeats a recording straight away, across rounds and for any pool size', () => {
    for (const count of [2, 3, 5, 8]) {
      const cycle = new VariantCycle(count, seeded(count * 17));
      let previous = -1;
      for (let i = 0; i < 400; i += 1) {
        const pick = cycle.next();
        expect(pick, `pool of ${count}, pick ${i}`).not.toBe(previous);
        expect(pick).toBeGreaterThanOrEqual(0);
        expect(pick).toBeLessThan(count);
        previous = pick;
      }
    }
  });

  it('survives a generator stuck at either end of its range', () => {
    for (const value of [0, 0.999999]) {
      const cycle = new VariantCycle(4, () => value);
      let previous = -1;
      for (let i = 0; i < 40; i += 1) {
        const pick = cycle.next();
        expect(pick).not.toBe(previous);
        previous = pick;
      }
    }
  });
});
