import { describe, expect, it } from 'vitest';
import { LessonFlow, type FlowFrame } from './lessonFlow';
import { lessonById } from './lessons';

const STEP = 1 / 30;
const frame = (patch: Partial<FlowFrame> = {}): FlowFrame => ({
  dt: STEP, phase: 'standing', speed: 6, heading: 0,
  input: { steer: 0, trim: 0, crouch: 0, hand: false, paddle: false },
  wave: { valid: true, faceFraction: 0.5, crestBreaking: 0.2, aheadOfCrest: 5 },
  ...patch,
});
const feed = (flow: LessonFlow, seconds: number, patch: Partial<FlowFrame> = {}) => {
  for (let t = 0; t < seconds - 1e-9; t += STEP) flow.frame(frame(patch));
};

describe('lesson flow', () => {
  it('starts on the explanation card, and passes when the goal does', () => {
    const flow = new LessonFlow(lessonById('popUp'));
    expect(flow.state).toBe('card');
    flow.start();
    expect(flow.state).toBe('attempt');
    feed(flow, 2.1);
    expect(flow.state).toBe('passed');
    expect(flow.misses).toBe(0);
  });

  it('misses on a fall, naming why, and restarts on the same wave two seconds later', () => {
    const flow = new LessonFlow(lessonById('lean'));
    flow.start();
    feed(flow, 0.5);
    flow.frame(frame({ phase: 'fallen', separation: 'foot slip' }));
    expect(flow.state).toBe('missed');
    expect(flow.cause).toBe('ride.reason.footSlip');
    expect(flow.tick(1.9)).toBeUndefined();
    expect(flow.tick(0.2)).toBe('restart');
  });

  it('misses when the ride analysis ends the ride, but not on a report from before the attempt', () => {
    const flow = new LessonFlow(lessonById('pocket'));
    flow.start();
    flow.frame(frame({ report: { id: 4, end: 'lost the wave' } }));
    expect(flow.state).toBe('attempt');
    flow.frame(frame({ report: { id: 5, end: 'lost the wave' } }));
    expect(flow.state).toBe('missed');
    expect(flow.cause).toBe('ride.reason.lostWave');
  });

  it('misses when time runs out, sooner from a prone start', () => {
    const riding = new LessonFlow(lessonById('lean'));
    riding.start();
    feed(riding, 24.9);
    expect(riding.state).toBe('attempt');
    feed(riding, 0.2);
    expect(riding.cause).toBe('school.miss.time');
    const prone = new LessonFlow(lessonById('popUp'));
    prone.start();
    feed(prone, 12.1, { phase: 'prone' });
    expect(prone.state).toBe('missed');
  });

  it('brings the explanation back after three misses in a row', () => {
    const flow = new LessonFlow(lessonById('lean'));
    for (let miss = 1; miss <= 3; miss += 1) {
      flow.start();
      flow.frame(frame({ phase: 'fallen', separation: 'balance' }));
      expect(flow.tick(2.1)).toBe(miss < 3 ? 'restart' : 'card');
    }
    expect(flow.state).toBe('card');
    expect(flow.misses).toBe(0);
  });

  it('R does nothing on a card or after passing, and restarts during an attempt or a miss', () => {
    const flow = new LessonFlow(lessonById('popUp'));
    expect(flow.retry()).toBe(false);
    flow.start();
    expect(flow.retry()).toBe(true);
    feed(flow, 2.1);
    expect(flow.state).toBe('passed');
    expect(flow.retry()).toBe(false);
  });

  // Review: the catch's time limit cut off a good ride after the catch.
  it('in Free Practice from prone, lets a ride that stood run past the catch’s time limit', () => {
    const flow = new LessonFlow(undefined, { start: 'waiting' });
    flow.start();
    feed(flow, 3, { phase: 'prone' });
    feed(flow, 14);
    expect(flow.state).toBe('attempt');
    const lost = new LessonFlow(undefined, { start: 'waiting' });
    lost.start();
    feed(lost, 15.1, { phase: 'prone' });
    expect(lost.cause).toBe('school.miss.time');
  });

  it('in Free Practice, has no goal, restarts after every ride and never shows the card', () => {
    const flow = new LessonFlow(undefined, { start: 'pocket' });
    for (let ride = 0; ride < 4; ride += 1) {
      flow.start();
      feed(flow, 5);
      expect(flow.state).toBe('attempt');
      flow.frame(frame({ phase: 'fallen', separation: 'balance' }));
      expect(flow.tick(2.1)).toBe('restart');
    }
    expect(flow.misses).toBe(0);
  });
});
