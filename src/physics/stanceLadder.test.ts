import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider, CROUCH_DEPTH, CROUCH_SHARE, EXTENSION_TALL, MANUAL_CROUCH_DEPTH, type AttachedRiderOptions } from './AttachedRider';
import { REFERENCE_RIDER } from './boardReference';
import { WATER } from './hullForces';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import type { SurfWater } from './SurfWater';
import { CoveredWater } from './testing/CoveredWater';

const STEP = 1 / 60;

/**
 * A standing rider (`options`) gliding at `speed` (6 m/s) on flat, still water (under a tube's curl if `covered`), with
 * `set` applied from the start and `control` before each step; `seconds` later, or at each step.
 */
function glide(
  set: (rider: AttachedRider) => void, seconds: number, each?: (rider: AttachedRider, board: BoardBody, time: number) => void, covered = false,
  speed = 6, control?: (rider: AttachedRider, time: number) => void, options: AttachedRiderOptions = {},
) {
  const water: SurfWater = covered ? new CoveredWater(new PlaneWater()) : new PlaneWater();
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), undefined, new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...options });
  board.attach(rider);
  set(rider);
  for (let i = 1; i <= Math.round(seconds / STEP); i += 1) {
    control?.(rider, i * STEP);
    board.step(STEP, water);
    each?.(rider, board, i * STEP);
  }
  return { board, rider };
}

/** The front foot's mean share of the load over the last half second of `seconds`. */
function frontShare(set: (rider: AttachedRider) => void, seconds: number): number {
  let sum = 0;
  let count = 0;
  glide(set, seconds, (rider, _board, time) => {
    if (time <= seconds - 0.5) return;
    sum += rider.contact.frontShare;
    count += 1;
  });
  return sum / count;
}

describe('the height ladder (the movement-flow spec)', () => {
  // The deep tuck is for tube clearance: on open water full manual crouch keeps the pumping crouch's share of the
  // depth, as before the tuck, and only under a tube's curl does it fold deeper (the owner's decision of 2026-10-06).
  it('keeps the pumping depth, tucks deeper manually only under a tube\'s curl, and retains the Compress depth', () => {
    const pumping = glide((rider) => { rider.crouch = 0.6; }, 1.5).rider;
    const crouched = glide((rider) => { rider.crouch = 1; }, 1.5).rider;
    const tucked = glide((rider) => { rider.crouch = 1; }, 1.5, undefined, true).rider;
    const compressed = glide((rider) => { rider.compress = 1; }, 1.5).rider;
    expect(pumping.attached && crouched.attached && tucked.attached && compressed.attached).toBe(true);
    expect(pumping.leg.rest).toBeCloseTo(-0.6 * CROUCH_SHARE * CROUCH_DEPTH, 2);
    expect(crouched.leg.rest).toBeCloseTo(-CROUCH_SHARE * CROUCH_DEPTH, 2);
    expect(tucked.leg.rest).toBeCloseTo(-MANUAL_CROUCH_DEPTH, 2);
    expect(compressed.leg.rest).toBeCloseTo(-CROUCH_DEPTH, 2);
  });

  it('goes deeper compressing over the pumping crouch than crouching', () => {
    const crouched = glide((rider) => { rider.crouch = 0.6; }, 1.5).rider;
    const both = glide((rider) => { rider.crouch = 0.6; rider.compress = 1; }, 1.5).rider;
    expect(both.attached).toBe(true);
    expect(both.leg.rest).toBeLessThan(crouched.leg.rest - 0.05);
  });

  it('selects the normal Compress stance with a full manual tuck also held', () => {
    const both = glide((rider) => { rider.crouch = 1; rider.compress = 1; }, 1.5).rider;
    expect(both.attached).toBe(true);
    expect(both.leg.rest).toBeCloseTo(-CROUCH_DEPTH, 2);
  });

  // Paced by the turn's load alone, Compress took about a second to its depth riding straight (the spec's Q1).
  it('drops into Compress from standing as fast as into the pumping crouch, and on to its own depth', () => {
    const when = (set: (rider: AttachedRider) => void, depth: number) => {
      let reached = Number.NaN;
      glide(set, 1, (rider, _board, time) => {
        if (Number.isNaN(reached) && rider.leg.rest <= -depth) reached = time;
      });
      return reached;
    };
    const crouchDepth = 0.9 * 0.6 * CROUCH_SHARE * CROUCH_DEPTH;
    expect(when((rider) => { rider.compress = 1; }, crouchDepth)).toBeLessThanOrEqual(when((rider) => { rider.crouch = 0.6; }, crouchDepth) + 0.03);
    expect(when((rider) => { rider.compress = 1; }, 0.9 * CROUCH_DEPTH)).toBeLessThan(0.6);
  });

  it('keeps the weight where W/S put it: Compress no longer moves it forward', () => {
    const at = (compress: number, trim: number) => frontShare((r) => { r.compress = compress; r.trim = trim; }, 2);
    // The trim moves the load as far compressed as standing (the forward weight took about a seventh of S's reach).
    const standingRange = at(0, 0) - at(0, -1);
    const compressedRange = at(1, 0) - at(1, -1);
    expect(standingRange).toBeGreaterThan(0.15);
    expect(compressedRange).toBeGreaterThan(0.95 * standingRange);
  });
});

// The phase-5 physics plan's item 2.2 A (the owner's decision 6 of 2026-10-22): the projection stands tall, 0.04 m over
// the riding stance (the knees to about 24°), then settles back over about 0.5 s. Until then the ladder's top was the
// riding stance.
describe('the projection rising tall (the phase-5 physics plan\'s item 2.2)', () => {
  /** `set` before each step at `speed` on flat water, Compress (or the crouch) let go at `release`, s: the leg's rest and extension over time. */
  const letGo = (
    speed: number, release: number, set: (rider: AttachedRider, time: number) => void = (rider, time) => { rider.compress = time < release ? 1 : 0; },
    options: AttachedRiderOptions = {},
  ) => {
    const rest: number[] = [];
    const extension: number[] = [];
    glide(() => {}, release + 1.8, (rider) => {
      rest.push(rider.leg.rest);
      extension.push(rider.leg.extension);
    }, false, speed, set, options);
    return { rest, extension, at: (time: number) => Math.round(time / STEP) - 1 };
  };

  // Since compress-exit (2026-10-29) the legs rise out of Compress no faster than the stance's spring can catch the body
  // (`projectionCatch`, 0.40–0.57 m/s): the riding stance comes 0.72 s after letting go (0.47 s before), and the tall
  // stance from 0.87 to 1.35 s (0.6 to 1.1 s). The legs at their full pace (`extension: 'old'`) keep the old timing.
  it('rises tall letting Compress go while the board planes, after the riding stance, then settles back to it', () => {
    for (const [options, riding, tallFrom, tallTo] of [[{}, 0.6, 0.9, 1.3], [{ extension: 'old' }, 0.4, 0.7, 0.95]] as const) {
      const { rest, extension, at } = letGo(7, 0.8, undefined, options);
      const after = rest.slice(at(0.8));
      expect(Math.max(...after)).toBeGreaterThan(0.9 * EXTENSION_TALL);
      expect(Math.max(...after)).toBeLessThanOrEqual(EXTENSION_TALL + 1e-9);
      // Up to the riding stance, then on: tall (the body over 0.6 of the aim) through the window.
      expect(rest[at(0.8 + riding)]).toBeLessThan(0);
      for (let k = at(0.8 + tallFrom); k <= at(0.8 + tallTo); k += 1) {
        expect(extension[k], `${((k + 1) * STEP - 0.8).toFixed(2)} s after`).toBeGreaterThan(0.6 * EXTENSION_TALL);
      }
      // Then back to the riding stance.
      expect(rest[at(0.8 + 1.7)]).toBeLessThan(0.1 * EXTENSION_TALL);
    }
  });

  // compress-exit (2026-10-29): the legs rising at their full pace out of a compressed bottom turn threw riders off the
  // deck at the Canyon's Big. A body rising at v on its leg spring (stiffness k) leaves the deck if the deck stops under
  // it once v > g·√(m/k), its spring's sag no longer enough to catch it (`projectionCatch`).
  it('rises out of Compress no faster than the stance\'s spring can catch the body, where at full pace it rose twice as fast', () => {
    const fastest = (options: AttachedRiderOptions) => {
      const { rest } = letGo(7, 0.8, undefined, options);
      return Math.max(...rest.slice(1).map((r, k) => (r - rest[k]) / STEP));
    };
    // The softest the leg gets is Compress's (CROUCH_SOFTENING's half of 44 kN/m): its catch is the fastest allowed.
    const softest = WATER.gravity * Math.sqrt(REFERENCE_RIDER.mass / 22_000);
    expect(fastest({})).toBeLessThanOrEqual(1.01 * softest);
    expect(fastest({ extension: 'old' })).toBeGreaterThan(2 * softest);
  });

  it('keeps the feet loaded letting Compress and the steer go out of a compressed turn at 9–11 m/s, where at full pace they went light', () => {
    /** The leg's least push, in body weights, after a compressed turn (0.5 s, steering one way) at `speed`, both let go together. */
    const leastPush = (speed: number, side: number, options: AttachedRiderOptions) => {
      let least = Infinity;
      const { rider } = glide(() => {}, 3, (r, _board, time) => {
        if (time >= 1 && r.attached) least = Math.min(least, r.leg.force / (r.mass * WATER.gravity));
      }, false, speed, (r, time) => {
        const turning = time >= 0.5 && time < 1;
        r.compress = turning ? 1 : 0;
        r.steer = turning ? side : 0;
      }, options);
      expect(rider.attached).toBe(true);
      return least;
    };
    for (const speed of [9, 11]) {
      for (const side of [1, -1]) expect(leastPush(speed, side, {}), `${speed} m/s, side ${side}`).toBeGreaterThan(0.5);
    }
    // At full pace, at 9 m/s, the push fell to nothing: the feet left the deck.
    expect(leastPush(9, 1, { extension: 'old' })).toBeLessThan(0);
  });

  it('stands no taller than the riding stance letting the crouch go, below planing, or taking Compress again', () => {
    const crouch = letGo(7, 0.8, (rider, time) => { rider.crouch = time < 0.8 ? 1 : 0; });
    expect(Math.max(...crouch.rest.slice(crouch.at(0.8)))).toBeLessThanOrEqual(1e-9);
    const slow = letGo(2.5, 0.8);
    expect(Math.max(...slow.rest.slice(slow.at(0.8)))).toBeLessThanOrEqual(1e-9);
    // Compress taken again 0.3 s after letting go, the leg still rising: it never passes the riding stance.
    const again = letGo(7, 0.8, (rider, time) => { rider.compress = time < 0.8 || time >= 1.1 ? 1 : 0; });
    expect(Math.max(...again.rest.slice(again.at(0.8)))).toBeLessThanOrEqual(1e-9);
  });
});
