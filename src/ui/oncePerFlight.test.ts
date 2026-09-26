import { describe, expect, it } from 'vitest';
import { oncePerFlight } from './oncePerFlight';

describe('oncePerFlight', () => {
  it('ignores calls while one is still running, and runs again once it settles', async () => {
    let runs = 0;
    let finish: () => void = () => {};
    const start = oncePerFlight(async () => {
      runs += 1;
      await new Promise<void>((resolve) => { finish = resolve; });
    });
    const first = start();
    void start();
    expect(runs).toBe(1);
    finish();
    await first;
    void start();
    expect(runs).toBe(2);
  });

  it('runs again after a call that failed', async () => {
    let runs = 0;
    const start = oncePerFlight(async () => {
      runs += 1;
      throw new Error('no surf zone');
    });
    await expect(start()).rejects.toThrow('no surf zone');
    await expect(start()).rejects.toThrow('no surf zone');
    expect(runs).toBe(2);
  });
});
