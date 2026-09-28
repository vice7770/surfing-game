import { Quaternion } from 'three';
import { RIDER_SNAPSHOT } from '../wave/SurfZoneRunner';

/** The physics' fixed step, s (`SURF_ZONE_STEP`). */
const STEP = 1 / 60;
/** Snapshots kept. */
const CAPACITY = 6;
/** The drawing trails the newest snapshot by this much, s: one step, so there is always a snapshot either side. */
const DELAY = STEP;
/** Each frame the drawing clock closes this share of its gap to where it should be; past `SNAP_GAP` s it jumps there. */
const CATCH_UP = 0.1;
const SNAP_GAP = 4 * STEP;
/** Neighbours whose boards are this far apart, m, are a teleport (a retry, a placement), never blended across. */
const TELEPORT = 2;

/** The rider's fields that blend between snapshots; every other field is taken from the nearer one. */
const BLENDED = [
  ...Array.from({ length: 21 }, (_, i) => RIDER_SNAPSHOT.points + i),
  RIDER_SNAPSHOT.duck, RIDER_SNAPSHOT.plug, RIDER_SNAPSHOT.plug + 1, RIDER_SNAPSHOT.plug + 2, RIDER_SNAPSHOT.breath,
];

interface Slot {
  time: number;
  rider: Float64Array;
  board: Float64Array;
}

const qa = new Quaternion();
const qb = new Quaternion();

/**
 * The local rider drawn between physics snapshots (the riding-body plan, step
 * 1; Fiedler's "Fix Your Timestep"). The physics steps at 60 Hz and its
 * snapshots arrive when they arrive: one per frame, none on a 120 Hz display's
 * every other frame, or several at once from a late worker. The page draws the
 * board, the rider and the camera's target from a clock that runs with the
 * simulated time, one step behind the newest snapshot, blended between the two
 * snapshots either side of it.
 */
export class SnapshotTrack {
  private readonly slots: Slot[] = [];
  private renderTime = Number.NaN;

  /** A snapshot of the sea at `seaTime`; one no later than the newest is ignored, and an earlier sea's time starts the track over. */
  push(seaTime: number, rider: ArrayLike<number>, board: ArrayLike<number>): void {
    const newest = this.slots[this.slots.length - 1];
    if (newest && seaTime <= newest.time) {
      // A new sea, or the same one set back (a replay): start over. The same snapshot again is ignored.
      if (seaTime < newest.time - 0.25) this.reset();
      else return;
    }
    const slot = this.slots.length >= CAPACITY ? this.slots.shift()! : { time: 0, rider: new Float64Array(rider.length), board: new Float64Array(board.length) };
    slot.time = seaTime;
    slot.rider.set(rider);
    slot.board.set(board);
    this.slots.push(slot);
  }

  reset(): void {
    this.slots.length = 0;
    this.renderTime = Number.NaN;
  }

  /**
   * Advances the drawing clock by `dt` simulated seconds and writes the rider
   * and board to draw into `outRider` and `outBoard`. Returns the sea time drawn,
   * or undefined before any snapshot.
   */
  sample(dt: number, outRider: Float64Array, outBoard: Float64Array): number | undefined {
    const { slots } = this;
    if (!slots.length) return undefined;
    const oldest = slots[0].time;
    const newest = slots[slots.length - 1].time;
    const target = newest - DELAY;
    if (!Number.isFinite(this.renderTime)) this.renderTime = target;
    if (dt > 0) {
      // Paused (no simulated time), the pose holds exactly.
      this.renderTime += dt;
      const gap = target - this.renderTime;
      if (Math.abs(gap) > SNAP_GAP) this.renderTime = target;
      else this.renderTime += CATCH_UP * gap;
    }
    this.renderTime = Math.min(newest, Math.max(oldest, this.renderTime));
    let after = slots.findIndex((slot) => slot.time > this.renderTime);
    if (after < 0) after = slots.length - 1;
    const b = slots[after];
    const a = slots[Math.max(0, after - 1)];
    const span = b.time - a.time;
    const t = span > 0 ? Math.min(1, Math.max(0, (this.renderTime - a.time) / span)) : 1;
    const teleport = a.board[7] !== b.board[7] || a.rider[RIDER_SNAPSHOT.present] !== b.rider[RIDER_SNAPSHOT.present]
      || Math.hypot(b.board[0] - a.board[0], b.board[1] - a.board[1], b.board[2] - a.board[2]) > TELEPORT;
    if (teleport || a === b) {
      // Never swept across: the newer is drawn.
      outRider.set(b.rider);
      outBoard.set(b.board);
      return this.renderTime;
    }
    outRider.set(t < 0.5 ? a.rider : b.rider);
    outBoard.set(t < 0.5 ? a.board : b.board);
    for (const i of BLENDED) outRider[i] = a.rider[i] + (b.rider[i] - a.rider[i]) * t;
    const turn = b.rider[RIDER_SNAPSHOT.heading] - a.rider[RIDER_SNAPSHOT.heading];
    outRider[RIDER_SNAPSHOT.heading] = a.rider[RIDER_SNAPSHOT.heading] + Math.atan2(Math.sin(turn), Math.cos(turn)) * t;
    for (let i = 0; i < 3; i += 1) outBoard[i] = a.board[i] + (b.board[i] - a.board[i]) * t;
    qa.fromArray(a.board, 3).slerp(qb.fromArray(b.board, 3), t).toArray(outBoard, 3);
    return this.renderTime;
  }
}
