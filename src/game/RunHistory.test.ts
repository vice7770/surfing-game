import { expect, it } from 'vitest';
import { RunHistory, type RunReport } from './RunHistory';

it('keeps a bounded, persistent record of measured run outcomes', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const history = new RunHistory(storage);
  for (let seed = 1; seed <= 14; seed += 1) {
    const report: RunReport = {
      seed, outcome: seed % 2 ? 'wipeout' : 'complete', reason: 'Measured outcome',
      settings: { height: 1.4, period: 8, speed: 3, paddleForce: 14, boardResponse: 1 },
      elapsedSeconds: 12, rideDistance: seed, peakSpeed: 4.2, peakBreaking: 0.7,
      peakFlow: 0.5, lowestBalance: 0.3, popUpAt: 5, ridingAt: 6,
    };
    history.add(report);
  }
  const restored = new RunHistory(storage);
  expect(restored.recent).toHaveLength(12);
  expect(restored.recent[0]).toMatchObject({ seed: 14, outcome: 'complete', rideDistance: 14 });
  expect(restored.recent.at(-1)?.seed).toBe(3);
});
