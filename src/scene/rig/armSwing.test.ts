import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ArmSwing, armPendulum } from './armSwing';

const MOST = (35 * Math.PI) / 180;
const shoulder = new Vector3(0, 1.4, 0);

/** Runs a target along `path(t)` (its shoulder carried with it) at `rate` Hz for `seconds`, returning the hand's place at the end. */
function run(swing: ArmSwing, path: (t: number) => Vector3, rate: number, seconds: number, share = 1): Vector3 {
  const hand = new Vector3();
  for (let i = 0; i <= Math.round(seconds * rate); i += 1) {
    const t = i / rate;
    const target = path(t);
    const from = shoulder.clone().add(target).sub(new Vector3(0.45, 1.1, 0));
    hand.copy(target);
    swing.follow('left', from, hand, share, t);
  }
  return hand;
}

describe('the arm swing (step 4; Pontzer et al. 2009)', () => {
  it('swings at the arm\'s own pendulum frequency, from Winter\'s segments', () => {
    const omega = armPendulum(0.3, 0.25, 0.185);
    expect(omega).toBeGreaterThan(4.6);
    expect(omega).toBeLessThan(5);
    expect(armPendulum(0.36, 0.3, 0.22)).toBeLessThan(omega);
  });

  it('leaves a hand carried at a steady speed on its target', () => {
    const swing = new ArmSwing(4.8, MOST);
    const hand = run(swing, (t) => new Vector3(0.45, 1.1, 8 * t), 60, 1);
    expect(hand.distanceTo(new Vector3(0.45, 1.1, 8))).toBeLessThan(1e-6);
  });

  it('leaves the hand behind as its target speeds up, then settles', () => {
    // Rising at 2 m/s² for 0.3 s, then steadily.
    const rise = (t: number) => (t < 0.3 ? t * t : 0.09 + 0.6 * (t - 0.3));
    const path = (t: number) => new Vector3(0.45, 1.1 + rise(t), 0);
    const early = run(new ArmSwing(4.8, MOST), path, 60, 0.3);
    expect(early.y).toBeLessThan(path(0.3).y - 0.005);
    const late = run(new ArmSwing(4.8, MOST), path, 60, 2.5);
    expect(late.distanceTo(path(2.5))).toBeLessThan(0.002);
  });

  it('lets a sustained acceleration go: a board slowing steadily has its hands back on their places', () => {
    // Slowing from 8 m/s at 1 m/s² (flat water's drag): the body and the arm's tone take it, not the swing.
    const path = (t: number) => new Vector3(0.45, 1.1, 8 * t - 0.5 * t * t);
    const hand = run(new ArmSwing(4.8, MOST), path, 60, 3);
    expect(hand.distanceTo(path(3))).toBeLessThan(0.005);
  });

  it('swings the same at 30, 60 and 144 Hz', () => {
    const path = (t: number) => new Vector3(0.45, 1.1 + 0.08 * Math.sin(2 * Math.PI * 1.25 * t), 8 * t);
    // At 1 s, a whole number of frames at each rate.
    const at = (rate: number) => run(new ArmSwing(4.8, MOST), path, rate, 1);
    expect(at(30).distanceTo(at(144))).toBeLessThan(0.005);
    expect(at(60).distanceTo(at(144))).toBeLessThan(0.002);
  });

  it('keeps its swing at a clock standing still, and rests with no share, after a reset or a jump', () => {
    const swing = new ArmSwing(4.8, MOST);
    const path = (t: number) => new Vector3(0.45, 1.1 + t * t, 0);
    const moving = run(swing, path, 60, 0.3);
    const again = path(0.3);
    swing.follow('left', shoulder.clone().add(again).sub(new Vector3(0.45, 1.1, 0)), again, 1, 0.3);
    expect(again.distanceTo(moving)).toBeLessThan(1e-9);
    const still = new ArmSwing(4.8, MOST);
    expect(run(still, path, 60, 0.3, 0).distanceTo(path(0.3))).toBeLessThan(1e-9);
    swing.reset();
    const fresh = path(0.35);
    swing.follow('left', shoulder, fresh, 1, 0.35);
    expect(fresh.distanceTo(path(0.35))).toBeLessThan(1e-9);
    // A teleport of a metre within a frame is a new start, not a fling.
    const jumped = run(swing, (t) => new Vector3(0.45, 1.1 + (t > 0.5 ? 1 : 0), 0), 60, 0.6);
    expect(jumped.distanceTo(new Vector3(0.45, 2.1, 0))).toBeLessThan(1e-6);
  });

  it('holds the hand within its swing\'s reach of the shoulder', () => {
    // A swing held within 5°, and a hard stop from 2 m/s: the hand flies on as far as it may.
    const most = (5 * Math.PI) / 180;
    const swing = new ArmSwing(4.8, most);
    const path = (t: number) => new Vector3(0.45, 1.1, t < 0.2 ? 2 * t : 0.4);
    const hand = run(swing, path, 60, 0.25);
    const target = path(0.25);
    const from = shoulder.clone().add(target).sub(new Vector3(0.45, 1.1, 0));
    expect(hand.clone().sub(from).angleTo(target.clone().sub(from))).toBeCloseTo(most, 6);
    expect(hand.distanceTo(from)).toBeCloseTo(target.distanceTo(from), 9);
  });
});
