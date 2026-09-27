import { describe, expect, it } from 'vitest';
import { SCHOOL_KEY, SchoolProgress } from './schoolProgress';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, data };
};

describe('school progress', () => {
  it('remembers passed lessons between visits', () => {
    const storage = memory();
    const progress = new SchoolProgress(storage);
    expect(progress.passed('trim')).toBe(false);
    progress.pass('trim');
    progress.pass('trim');
    const again = new SchoolProgress(storage);
    expect(again.passed('trim')).toBe(true);
    expect(again.count).toBe(1);
  });

  it('is started once the first lesson is passed (the menu badge goes)', () => {
    const progress = new SchoolProgress(memory());
    progress.pass('trim');
    expect(progress.started).toBe(false);
    progress.pass('lean');
    expect(progress.started).toBe(true);
  });

  it('drops unknown lessons and survives broken storage', () => {
    const storage = memory();
    storage.data.set(SCHOOL_KEY, JSON.stringify(['lean', 'surfing on the moon', 7]));
    expect(new SchoolProgress(storage).count).toBe(1);
    storage.data.set(SCHOOL_KEY, '{nope');
    expect(new SchoolProgress(storage).count).toBe(0);
    const failing = new SchoolProgress({ getItem: () => { throw new Error('private'); }, setItem: () => { throw new Error('full'); } });
    failing.pass('hand');
    expect(failing.passed('hand')).toBe(true);
  });
});
