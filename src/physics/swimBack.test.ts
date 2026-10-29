import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CLIMB_TIME } from './AttachedRider';
import { PlaneWater } from './PlaneWater';
import { ChopWater } from './testing/ChopWater';
import { RideSession, type RideInput, type RideSessionOptions } from './RideSession';

const STEP = 1 / 60;
const idle: RideInput = { paddle: false, popUp: false, steer: 0 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Standing at `speed` m/s on flat water for `ride` s, then off: the board thrown on, the body plunged and tumbled. */
function wipeout(options: RideSessionOptions = {}, speed = 5, ride = 1) {
  const session = new RideSession(options);
  const water = new PlaneWater({ depth: 3 });
  session.place({ x: 0, z: 0, heading: 0, speed, phase: 'standing', followSurface: true }, water);
  for (let i = 0; i < Math.round(ride / STEP); i += 1) session.step(STEP, water, idle);
  session.separate('balance');
  return { session, water };
}

/** A swimmer floating calm beside its board, 0.5 m to its side, both heading +z, deck up. */
function besideTheBoard() {
  const session = new RideSession();
  const water = new PlaneWater({ depth: 3 });
  session.reset(new Vector3(), 0, water);
  session.separate('balance');
  for (let i = 0; i < 180; i += 1) session.step(STEP, water, idle);
  const torso = session.surfer.getPartPosition('torso', new Vector3());
  session.board.place(new Vector3(torso.x + 0.5, session.board.shape.centerOfMass.y - 0.03, torso.z), new Quaternion());
  session.surfer.heading = 0;
  return { session, water };
}

/** Steps until the rider lies on the board again (attached, the climb done), at most `seconds`; the time it took, or NaN. */
function backOn(session: RideSession, water: PlaneWater, seconds: number, input: (n: number) => RideInput): number {
  for (let n = 0; n < seconds / STEP; n += 1) {
    session.step(STEP, water, session.rider.attached ? idle : input(n));
    if (session.rider.attached && !session.rider.climbingOn && session.phase === 'prone') return (n + 1) * STEP;
  }
  return Number.NaN;
}

// swim-back (2026-10-29): the owner's "after falling he just struggles without moving". The swimmer swam; what stalled
// was the board once held: the hands' places sat inside the deck, so the board's contact and the springs kicked its
// rails every step and it rolled and spun while held, and the climb waited for a still, level deck that rarely came.
describe('back on the board after a wipeout (swim-back)', () => {
  it('swims through the water at a front crawl\'s pace, 0.8–1.2 m/s', () => {
    const { session, water } = wipeout();
    let along = 0;
    let time = 0;
    const center = new Vector3();
    for (let n = 0; n < 12 / STEP; n += 1) {
      const { surfer } = session;
      // Out to sea, away from the board (it follows on the leash).
      session.step(STEP, water, { ...idle, paddle: true, steer: Math.max(-1, Math.min(1, 2 * wrap(Math.PI - surfer.heading))) });
      if (n * STEP < 4 || surfer.controlGain < 0.5) continue;
      const momentum = surfer.linearMomentum(center);
      along += ((momentum.x * Math.sin(surfer.heading) + momentum.z * Math.cos(surfer.heading)) / surfer.mass) * STEP;
      time += STEP;
    }
    expect(time).toBeGreaterThan(6);
    expect(along / time).toBeGreaterThan(0.8);
    expect(along / time).toBeLessThan(1.2);
  });

  // Twelve falls (3–6 m/s, after 0.5–1.5 s standing), holding the reel from the first moment: measured 2.1–5.4 s; before,
  // 2.2–16.1 s, or not in 20 s (median about 7 s).
  // In a wind chop the head is often under at the surface: swimming up toward the light at 60° then, the stroke gave
  // half its push forward (0.70 m/s); up only with the chest under too (held down), 0.80 m/s.
  it('swims on through a chop with the face in the water, not up toward the light', () => {
    const speed = (options: RideSessionOptions) => {
      const session = new RideSession(options);
      const water = new ChopWater(1, 1);
      session.reset(new Vector3(), 0, water);
      for (let i = 0; i < 60; i += 1) { session.step(STEP, water, idle); water.advance(STEP); }
      session.separate('balance');
      let along = 0;
      let time = 0;
      const momentum = new Vector3();
      for (let n = 0; n < 16 / STEP; n += 1) {
        const { surfer } = session;
        session.step(STEP, water, { ...idle, paddle: true, steer: Math.max(-1, Math.min(1, 2 * wrap(Math.PI - surfer.heading))) });
        water.advance(STEP);
        if (n * STEP < 2 || surfer.controlGain < 0.5) continue;
        surfer.linearMomentum(momentum);
        along += ((momentum.x * Math.sin(surfer.heading) + momentum.z * Math.cos(surfer.heading)) / surfer.mass) * STEP;
        time += STEP;
      }
      return along / time;
    };
    const now = speed({});
    expect(now).toBeGreaterThan(0.75);
    expect(now).toBeGreaterThan(speed({ swim: 'old' }) + 0.05);
  });

  it('holding the reel, lies on the board again within 6 s of every fall, where half took longer before', () => {
    const reel = (n: number): RideInput => ({ ...idle, popUp: n === 0, reel: true });
    let slowBefore = 0;
    for (const speed of [3, 4, 5, 6]) {
      for (const ride of [0.5, 1, 1.5]) {
        const now = wipeout({}, speed, ride);
        expect(backOn(now.session, now.water, 20, reel), `${speed} m/s, ${ride} s`).toBeLessThan(6);
        const before = wipeout({ swim: 'old' }, speed, ride);
        const old = backOn(before.session, before.water, 20, reel);
        if (Number.isNaN(old) || old > 6) slowBefore += 1;
      }
    }
    expect(slowBefore).toBeGreaterThanOrEqual(6);
  });

  it('swimming to the board and reeling together, lies on it within 4 s', () => {
    const { session, water } = wipeout();
    const back = backOn(session, water, 10, () => {
      const { surfer, board } = session;
      const center = surfer.centerOfMass();
      const bearing = Math.atan2(board.position.x - center.x, board.position.z - center.z);
      return { ...idle, paddle: session.recovery.state === 'free', reel: true, steer: Math.max(-1, Math.min(1, 2 * wrap(bearing - surfer.heading))) };
    });
    expect(back).toBeLessThan(4);
  });

  it('climbs on from where the body is: no jump, the momentum kept, the body floating beside the board, then up onto it', () => {
    const { session, water } = besideTheBoard();
    const swimmer = session.surfer.centerOfMass(new Vector3());
    session.step(STEP, water, { ...idle, popUp: true });
    expect(session.rider.climbingOn).toBe(true);
    // The rider starts where the swimmer was (a step's travel), and the pair keeps the momentum it had.
    expect(session.rider.position.distanceTo(swimmer)).toBeLessThan(0.05);
    expect(session.remount.after.distanceTo(session.remount.before)).toBeLessThan(1e-9);
    const start = session.board.toLocal(session.rider.position, new Vector3()).y;
    // Beside the board, the body still floats: its buoyancy is a swimmer's, not cut by the deck's plane.
    session.step(STEP, water, idle);
    expect(session.rider.buoyancy.y).toBeGreaterThan(0.5 * session.rider.mass * 9.81);
    const hand = new Vector3();
    let steps = 1;
    while (session.rider.climbingOn && steps < 2 * CLIMB_TIME / STEP) {
      session.step(STEP, water, idle);
      steps += 1;
      // The drawn hands hold the rails throughout.
      const local = session.board.toLocal(session.renderPoint(3, hand), hand);
      expect(Math.abs(local.x)).toBeLessThan(0.4);
    }
    expect(steps * STEP).toBeCloseTo(CLIMB_TIME, 1);
    expect(session.rider.attached).toBe(true);
    expect(session.phase).toBe('prone');
    expect(session.board.toLocal(session.rider.position, new Vector3()).y).toBeGreaterThan(start + 0.1);
  });

  it('neither paddles, pops up nor shows the cue while climbing on', () => {
    const { session, water } = besideTheBoard();
    session.step(STEP, water, { ...idle, popUp: true });
    expect(session.rider.climbingOn).toBe(true);
    for (let i = 0; i < 20; i += 1) {
      session.step(STEP, water, { ...idle, paddle: true, popUp: true });
      expect(session.phase).toBe('prone');
      expect(session.rider.popUpCue).toBe(false);
      expect(session.rider.sprintPaddling).toBe(false);
    }
  });
});
