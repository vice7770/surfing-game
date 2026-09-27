import { describe, expect, it } from 'vitest';
import { ClockSync, roomSeaTime } from './ClockSync';

describe('ClockSync', () => {
  it('estimates the server clock from the quickest round trip', () => {
    const clock = new ClockSync();
    // The server runs 5000 ms ahead. A slow, lopsided sample (180 ms out, 20 back) would mislead by 80 ms.
    clock.add(1000, 1000 + 5000 + 180, 1200);
    clock.add(2000, 2000 + 5000 + 10, 2020);
    expect(clock.rtt).toBe(20);
    expect(clock.offset).toBeCloseTo(5000, 6);
    expect(clock.serverNow(3000)).toBeCloseTo(8000, 6);
  });

  it('keeps only recent samples', () => {
    const clock = new ClockSync(2);
    clock.add(0, 100, 2);
    clock.add(10, 5110, 30);
    clock.add(20, 5120, 40);
    expect(clock.offset).toBeCloseTo(5090, 6);
  });

  it('ignores a pong that arrives before its ping', () => {
    const clock = new ClockSync();
    clock.add(100, 0, 50);
    expect(clock.ready).toBe(false);
    expect(clock.offset).toBe(0);
  });

  it('tells the room sea time from the server clock', () => {
    expect(roomSeaTime({ seaTimeAtCreate: 30, createdAt: 10_000 }, 12_500)).toBeCloseTo(32.5, 9);
  });
});
