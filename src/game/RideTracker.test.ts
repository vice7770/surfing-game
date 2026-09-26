import { describe, expect, it } from 'vitest';
import { RideTracker, type RideFrame } from './RideTracker';

const STEP = 1 / 60;

/** Frames of `seconds` in `phase`, moving along x at `speed`, from where `from` left off. */
function frames(phase: RideFrame['phase'], seconds: number, speed: number, from: RideFrame, resets = from.resets): RideFrame[] {
  const out: RideFrame[] = [];
  let last = from;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    last = { ...last, phase, speed, resets, seaTime: last.seaTime + STEP, x: last.x + speed * STEP };
    out.push(last);
  }
  return out;
}

const start: RideFrame = { phase: 'prone', speed: 1.5, resets: 0, seaTime: 100, x: 0, z: -40 };

function feed(tracker: RideTracker, sequence: RideFrame[]) {
  return sequence.map((frame) => tracker.update(frame)).filter((result) => result !== undefined);
}

describe('RideTracker', () => {
  it('measures a ride from standing until the lip knocks the rider off', () => {
    const tracker = new RideTracker();
    const paddling = frames('prone', 2, 1.5, start);
    const riding = frames('standing', 3, 4, paddling.at(-1)!);
    const fallen = { ...riding.at(-1)!, phase: 'fallen' as const, separation: 'impact' as const, seaTime: riding.at(-1)!.seaTime + STEP };
    const results = feed(tracker, [...paddling, ...riding, fallen]);
    expect(results).toHaveLength(1);
    const [ride] = results;
    expect(ride.outcome).toBe('wipeout');
    expect(ride.reason).toBe('ride.reason.impact');
    expect(ride.distance).toBeCloseTo(12, 0);
    expect(ride.topSpeed).toBe(4);
    expect(ride.seconds).toBeCloseTo(3, 1);
  });

  it('calls a ride that leaves the surf zone complete, and one the player restarts ended', () => {
    const riding = frames('standing', 2, 5, start);
    const outOfWave = new RideTracker();
    const [complete] = feed(outOfWave, [...riding, { ...riding.at(-1)!, phase: 'prone', resets: 1 }]);
    expect(complete).toMatchObject({ outcome: 'complete', reason: 'ride.reason.outOfWave' });

    const restarted = new RideTracker();
    feed(restarted, riding);
    restarted.noteRetry();
    const [ended] = feed(restarted, [{ ...riding.at(-1)!, phase: 'prone', resets: 1 }]);
    expect(ended).toMatchObject({ outcome: 'ended', reason: 'ride.reason.retry' });
  });

  it('does not count a pop-up that fails at once', () => {
    const tracker = new RideTracker();
    const riding = frames('standing', 0.5, 3, start);
    expect(feed(tracker, [...riding, { ...riding.at(-1)!, phase: 'fallen', separation: 'balance' }])).toEqual([]);
  });

  it('reports a finished ride once', () => {
    const tracker = new RideTracker();
    const riding = frames('standing', 2, 3, start);
    const fallen = { ...riding.at(-1)!, phase: 'fallen' as const, separation: 'balance' as const };
    expect(feed(tracker, [...riding, fallen, fallen, { ...fallen, seaTime: fallen.seaTime + 1 }])).toHaveLength(1);
  });
});
