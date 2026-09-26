import { describe, expect, it } from 'vitest';
import { MAX_ONLINE_BATCH, OnlinePacer } from './OnlinePacer';

const STEP = 1 / 60;

describe('OnlinePacer', () => {
  it('asks for the steps that reach the room clock, minus those on their way', () => {
    const pacer = new OnlinePacer();
    expect(pacer.next(10 + 5 * STEP, 10, 0, STEP).steps).toBe(5);
    expect(pacer.next(10 + 5 * STEP, 10, 5, STEP).steps).toBe(0);
    expect(pacer.next(10 + 5 * STEP, 10, 3, STEP).steps).toBe(2);
  });

  it('asks nothing while ahead of the room', () => {
    expect(new OnlinePacer().next(10, 10.5, 0, STEP).steps).toBe(0);
  });

  it('caps a frame\'s batch', () => {
    expect(new OnlinePacer().next(20, 10, 0, STEP).steps).toBe(MAX_ONLINE_BATCH);
  });

  it('never re-syncs before the first catch-up', () => {
    const pacer = new OnlinePacer();
    let result = pacer.next(20, 10, 0, 1);
    for (let i = 0; i < 10; i += 1) result = pacer.next(20 + i, 10 + i, 0, 1);
    expect(result.resync).toBe(false);
    expect(result.caughtUp).toBe(false);
  });

  it('gives up catching up from more than 30 s behind, and rebuilds', () => {
    const pacer = new OnlinePacer();
    expect(pacer.next(40, 15, 0, 1).resync).toBe(false);
    expect(pacer.next(50, 15, 0, 1).resync).toBe(true);
  });

  it('re-syncs after 3 s more than 1 s behind', () => {
    const pacer = new OnlinePacer();
    expect(pacer.next(10, 10, 0, 0.1).caughtUp).toBe(true);
    let result = pacer.next(11.5, 10, 0, 1);
    result = pacer.next(12.5, 11, 0, 1);
    expect(result.resync).toBe(false);
    result = pacer.next(13.5, 12, 0, 1.1);
    expect(result.resync).toBe(true);
  });

  it('forgives a short lag', () => {
    const pacer = new OnlinePacer();
    pacer.next(10, 10, 0, 0.1);
    pacer.next(11.5, 10, 0, 2);
    pacer.next(12, 11.8, 0, 0.1);
    expect(pacer.next(13.5, 12, 0, 2).resync).toBe(false);
  });

  it('re-syncs at once after a long gap (a background tab), then only once', () => {
    const pacer = new OnlinePacer();
    pacer.next(10, 10, 0, 0.1);
    expect(pacer.next(40, 10, 0, 30).resync).toBe(true);
    pacer.reset();
    expect(pacer.next(40, 40, 0, 0.02).resync).toBe(false);
    expect(pacer.next(40.02, 40, 0, 0.02).resync).toBe(false);
  });
});
