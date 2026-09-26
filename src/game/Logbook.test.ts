import { describe, expect, it } from 'vitest';
import { LOGBOOK_KEY, LOGBOOK_SIZE, Logbook, type LoggedRide } from './Logbook';
import { DEFAULT_CONDITIONS } from './SurfConditions';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, data };
}

const ride = (overrides: Partial<LoggedRide> = {}): LoggedRide => ({
  outcome: 'wipeout', reason: 'ride.reason.balance', distance: 20, topSpeed: 5, seconds: 6,
  spot: 'point', conditions: DEFAULT_CONDITIONS, seed: 1, at: 1_700_000_000_000, ...overrides,
});

describe('Logbook', () => {
  it('keeps the newest rides, up to its size', () => {
    const log = new Logbook(memory());
    for (let i = 0; i < LOGBOOK_SIZE + 5; i += 1) log.add(ride({ seed: i }));
    expect(log.recent).toHaveLength(LOGBOOK_SIZE);
    expect(log.recent[0].seed).toBe(LOGBOOK_SIZE + 4);
  });

  it('sets every best on a first ride, and only the beaten ones after', () => {
    const log = new Logbook(memory());
    expect(log.add(ride()).sort()).toEqual(['distance', 'seconds', 'topSpeed']);
    expect(log.add(ride({ distance: 30, topSpeed: 4, seconds: 5 }))).toEqual(['distance']);
    expect(log.bests('point')).toEqual({ distance: 30, topSpeed: 5, seconds: 6 });
    expect(log.bests('reef')).toEqual({});
  });

  it('keeps bests after their ride leaves the recent list, across reloads', () => {
    const storage = memory();
    const log = new Logbook(storage);
    log.add(ride({ distance: 99 }));
    for (let i = 0; i < LOGBOOK_SIZE; i += 1) log.add(ride({ distance: 1 }));
    const reloaded = new Logbook(storage);
    expect(reloaded.recent.every((entry) => entry.distance === 1)).toBe(true);
    expect(reloaded.bests('point').distance).toBe(99);
  });

  it('drops corrupt entries and survives a broken storage', () => {
    const stored = { recent: [ride(), { ...ride(), spot: 'moon' }, { ...ride(), distance: 'far' }, { ...ride(), outcome: 'teleported' }], bests: { point: { distance: -1, topSpeed: 5 }, moon: { distance: 3 } } };
    const log = new Logbook(memory({ [LOGBOOK_KEY]: JSON.stringify(stored) }));
    expect(log.recent).toHaveLength(1);
    expect(log.bests('point')).toEqual({ topSpeed: 5 });
    expect(new Logbook(memory({ [LOGBOOK_KEY]: 'not json' })).recent).toEqual([]);
    const broken = new Logbook({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } });
    expect(() => broken.add(ride())).not.toThrow();
    expect(broken.recent).toHaveLength(1);
  });
});
