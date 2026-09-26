import { describe, expect, it } from 'vitest';
import { HINTS_KEY, HintBook, HintCoach, type HintState } from './hints';

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, data };
}

describe('HintBook', () => {
  it('offers a hint until it succeeds, then never again', () => {
    const book = new HintBook(memory());
    expect(book.offer('lean')).toBe(true);
    expect(book.offer('lean')).toBe(true);
    book.succeeded('lean');
    expect(book.offer('lean')).toBe(false);
    expect(book.offer('trim')).toBe(true);
  });

  it('remembers across visits through the storage', () => {
    const storage = memory();
    new HintBook(storage).succeeded('crouch');
    expect(storage.data.get(HINTS_KEY)).toBeDefined();
    expect(new HintBook(storage).offer('crouch')).toBe(false);
    expect(new HintBook(storage).offer('hand')).toBe(true);
  });

  it('still works for the session when the storage throws', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
    const book = new HintBook(broken);
    expect(book.offer('hand')).toBe(true);
    book.succeeded('hand');
    expect(book.offer('hand')).toBe(false);
  });
});

describe('HintCoach', () => {
  const idle = { steer: 0, trim: 0, crouch: 0, hand: false };
  const standing = (input = idle, crestBreaking = 0): HintState => ({ standing: true, crestBreaking, input });
  const ride = (coach: HintCoach, seconds: number, state: HintState) => {
    let shown: ReturnType<HintCoach['update']>;
    for (let t = 0; t < seconds - 1e-9; t += 0.1) shown = coach.update(0.1, state);
    return shown;
  };

  it('teaches the lean after 2 s standing, and trim then crouch after 5 s', () => {
    const coach = new HintCoach(new HintBook(memory()));
    expect(ride(coach, 1.9, standing())).toBeUndefined();
    expect(ride(coach, 0.2, standing())).toBe('lean');
    expect(ride(coach, 3, standing())).toBe('lean');
    // Leaning for half a second retires the lean; the trim is next.
    expect(ride(coach, 0.6, standing({ ...idle, steer: 1 }))).toBe('trim');
    expect(ride(coach, 0.6, standing({ ...idle, trim: -1 }))).toBe('crouch');
    expect(ride(coach, 0.6, standing({ ...idle, crouch: 1 }))).toBeUndefined();
  });

  it('teaches the hand when the crest breaks beside the rider, and forgets the clock on a fall', () => {
    const coach = new HintCoach(new HintBook(memory()));
    expect(coach.update(0.1, standing(idle, 0.5))).toBe('hand');
    ride(coach, 3, standing());
    expect(coach.update(0.1, { standing: false, crestBreaking: 0, input: idle })).toBeUndefined();
    expect(ride(coach, 1, standing())).toBeUndefined();
  });

  it('retires a hint the player already uses, before it is ever shown', () => {
    const book = new HintBook(memory());
    const coach = new HintCoach(book);
    ride(coach, 0.6, standing({ ...idle, crouch: 1 }));
    expect(book.offer('crouch')).toBe(false);
  });
});
