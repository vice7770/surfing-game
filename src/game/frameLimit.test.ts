import { describe, expect, it } from 'vitest';
import { advanceFrameClock, frameDue } from './frameLimit';

describe('frameDue', () => {
  it('renders every frame without a limit, and waits out a 30 fps limit with a millisecond of slack', () => {
    expect(frameDue(1000, 990, 0)).toBe(true);
    expect(frameDue(1000, 990, 1000 / 30)).toBe(false);
    expect(frameDue(1033, 1000, 1000 / 30)).toBe(true);
  });

  it('holds the requested cadence on a jittered 120 Hz display without accumulating late callbacks', () => {
    const interval = 1000 / 60;
    let clock = 1000;
    const rendered: number[] = [];
    let oldClock = clock;
    let oldCount = 0;
    // Callback timestamps keep their 120 Hz period but alternate scheduling jitter.
    const jitter = [0, 1.4, -1.4, 0.7, 0, -0.7];
    for (let i = 1; i <= 1200; i += 1) {
      const now = 1000 + i * 1000 / 120 + jitter[i % jitter.length];
      if (frameDue(now, oldClock, interval)) { oldCount += 1; oldClock = now; }
      if (!frameDue(now, clock, interval)) continue;
      rendered.push(now);
      clock = advanceFrameClock(now, clock, interval);
    }
    expect(rendered.length).toBe(600);
    expect(oldCount).toBeLessThan(570);
    expect(clock).toBeCloseTo(11_000, 8);
  });

  it('skips missed periods after a stall and keeps uncapped/startup clocks on the actual timestamp', () => {
    const interval = 1000 / 60;
    const afterStall = advanceFrameClock(1505, 1000, interval);
    expect(afterStall).toBeCloseTo(1500, 9);
    expect(frameDue(1508, afterStall, interval)).toBe(false);
    expect(frameDue(1517, afterStall, interval)).toBe(true);
    expect(advanceFrameClock(1505, 1000, 0)).toBe(1505);
    expect(advanceFrameClock(1505, 0, interval)).toBe(1505);
  });

  it('retains the early-frame slack and switches between capped and uncapped schedules', () => {
    const early = advanceFrameClock(1016, 1000, 1000 / 60);
    expect(early).toBeCloseTo(1016.6666667, 6);
    expect(frameDue(1024, early, 1000 / 60)).toBe(false);
    const uncapped = advanceFrameClock(1024, early, 0);
    expect(uncapped).toBe(1024);
    expect(frameDue(1040, uncapped, 1000 / 60)).toBe(true);
    const at60 = advanceFrameClock(1040, uncapped, 1000 / 60);
    expect(frameDue(1057, at60, 1000 / 30)).toBe(false);
    expect(frameDue(1074, at60, 1000 / 30)).toBe(true);
    const at30 = advanceFrameClock(1074, at60, 1000 / 30);
    expect(frameDue(1090, at30, 1000 / 60)).toBe(true);
  });
});
