import { describe, expect, it } from 'vitest';
import { RIDER_PHASES, RIDER_SNAPSHOT } from '../wave/SurfZoneRunner';
import { SnapshotTrack } from './snapshotTrack';

const STEP = 1 / 60;

/** A snapshot at `time` of a board at x = `x` (and the rider's pelvis beside it), heading `heading`, present. */
function snapshot(x: number, heading = 0) {
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  rider[RIDER_SNAPSHOT.points] = x;
  rider[RIDER_SNAPSHOT.present] = 1;
  rider[RIDER_SNAPSHOT.heading] = heading;
  const board = new Float64Array(8);
  board[0] = x;
  board[6] = 1;
  board[7] = 1;
  return { rider, board };
}

/**
 * Drives a track as the page does: snapshots from a board moving at `speed` m/s along x, delivered every `every`
 * steps, drawn at `rate` Hz for `seconds`. Returns the drawn x and times, frame by frame.
 */
function drive(rate: number, every: number, seconds: number, speed = 8, teleport?: { at: number; by: number }) {
  const track = new SnapshotTrack();
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  const board = new Float64Array(8);
  const drawn: { x: number; time: number; newest: number }[] = [];
  let simTime = 0;
  let steps = 0;
  let accumulator = 0;
  let newest = 0;
  const place = (time: number) => speed * time + (teleport && time >= teleport.at ? teleport.by : 0);
  const first = snapshot(0);
  track.push(0, first.rider, first.board);
  for (let f = 0; f < Math.round(seconds * rate); f += 1) {
    accumulator += 1 / rate;
    let taken = 0;
    while (accumulator >= STEP - 1e-12 && taken < 3) {
      accumulator -= STEP;
      taken += 1;
      simTime += STEP;
      steps += 1;
      if (steps % every === 0) {
        const next = snapshot(place(simTime));
        track.push(simTime, next.rider, next.board);
        newest = simTime;
      }
    }
    const time = track.sample(1 / rate, rider, board);
    drawn.push({ x: board[0], time: time ?? Number.NaN, newest });
  }
  return drawn;
}

describe('the snapshot track', () => {
  it('draws a new place every frame at 120 Hz from 60 Hz snapshots', () => {
    const drawn = drive(120, 1, 2).slice(30);
    for (let i = 1; i < drawn.length; i += 1) expect(drawn[i].x).not.toBe(drawn[i - 1].x);
  });

  it('draws the board travelling evenly when the snapshots come batched by 3', () => {
    const drawn = drive(60, 3, 3).slice(30);
    const travel = drawn.slice(1).map((frame, i) => frame.x - drawn[i].x);
    const mean = travel.reduce((a, b) => a + b, 0) / travel.length;
    const spread = Math.sqrt(travel.reduce((a, b) => a + (b - mean) ** 2, 0) / travel.length);
    expect(mean).toBeCloseTo(8 / 60, 2);
    expect(spread / mean).toBeLessThan(0.1);
  });

  it('never draws ahead of the newest snapshot, and trails it by at most 2 steps once settled', () => {
    for (const rate of [60, 120, 144]) {
      for (const frame of drive(rate, 1, 2).slice(20)) {
        expect(frame.time).toBeLessThanOrEqual(frame.newest + 1e-9);
        expect(frame.newest - frame.time).toBeLessThanOrEqual(2 * STEP + 1e-9);
      }
    }
  });

  it('never sweeps across a teleport', () => {
    const drawn = drive(120, 1, 2, 8, { at: 1, by: 20 });
    // Before the jump the board is below 8.2 m; after it, beyond 28 m: nothing is drawn in between.
    expect(drawn.every((frame) => frame.x < 8.3 || frame.x > 27.9)).toBe(true);
    expect(drawn[drawn.length - 1].x).toBeGreaterThan(28);
  });

  it('never blends a riding body\'s points into a fallen one\'s (tips and limb centres are different points)', () => {
    // The stance poses (the riding-body plan, step 3): blended across the fall, a "standing" rider was drawn with its
    // feet half-way to the fallen legs' centres, a posture that is neither.
    const track = new SnapshotTrack();
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    const board = new Float64Array(8);
    const fallen = RIDER_PHASES.indexOf('fallen');
    const standing = RIDER_PHASES.indexOf('standing');
    let fell = false;
    for (let i = 0; i <= 12; i += 1) {
      const next = snapshot(i * 0.1);
      next.rider[RIDER_SNAPSHOT.phase] = i < 6 ? standing : fallen;
      // The feet: a tip standing, the leg's centre fallen, 0.4 m higher.
      next.rider[RIDER_SNAPSHOT.points + 5 * 3 + 1] = i < 6 ? 0 : 0.4;
      track.push(i * STEP, next.rider, next.board);
      // Four frames a step (240 Hz), crossing the fall between the sixth and seventh snapshots.
      for (let frame = 0; frame < 4; frame += 1) {
        track.sample(STEP / 4, rider, board);
        const foot = rider[RIDER_SNAPSHOT.points + 5 * 3 + 1];
        expect(foot === 0 || foot === 0.4, `step ${i}, frame ${frame}: foot at ${foot}`).toBe(true);
        expect(rider[RIDER_SNAPSHOT.phase] === fallen, `step ${i}, frame ${frame}`).toBe(foot === 0.4);
        fell ||= foot === 0.4;
      }
    }
    expect(fell).toBe(true);
  });

  it('holds the pose while the clock stands still', () => {
    const track = new SnapshotTrack();
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    const board = new Float64Array(8);
    for (let i = 0; i <= 4; i += 1) {
      const next = snapshot(i * 0.1);
      track.push(i * STEP, next.rider, next.board);
    }
    track.sample(STEP, rider, board);
    const held = board[0];
    for (let i = 0; i < 5; i += 1) track.sample(0, rider, board);
    expect(board[0]).toBe(held);
  });

  it('turns the heading the short way across ±π', () => {
    const track = new SnapshotTrack();
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    const board = new Float64Array(8);
    const before = snapshot(0, Math.PI - 0.1);
    const after = snapshot(0.1, -Math.PI + 0.1);
    track.push(0, before.rider, before.board);
    track.push(STEP, after.rider, after.board);
    track.sample(0, rider, board);
    // Drawn between the two, halfway at most: never swung back through zero.
    expect(Math.abs(rider[RIDER_SNAPSHOT.heading])).toBeGreaterThan(Math.PI - 0.11);
  });

  it('starts over when the sea time goes back (a new sea)', () => {
    const track = new SnapshotTrack();
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    const board = new Float64Array(8);
    for (let i = 0; i < 10; i += 1) {
      const next = snapshot(100 + i);
      track.push(5 + i * STEP, next.rider, next.board);
    }
    const fresh = snapshot(0);
    track.push(0, fresh.rider, fresh.board);
    track.sample(STEP, rider, board);
    expect(board[0]).toBe(0);
  });
});
