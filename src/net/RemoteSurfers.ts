import { RIDER_PHASES, SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import { createPose, decodePose, readBundle, type SurferPose } from './poseCodec';
import type { PlayerInfo } from './protocol';

/** Others are drawn this far in the past, s, so there is almost always a pose on each side to interpolate between (spec N1). */
export const INTERPOLATION_DELAY = 0.1;
/** Past a player's newest pose, carry them on at their last velocity for at most this long, s, then hold. */
export const EXTRAPOLATE_LIMIT = 0.25;
/** A player not heard from in this long, s, vanishes until their poses come back. */
export const VANISH_SECONDS = 5;
/** Poses kept per player. */
const KEPT = 8;
/** Boards further apart than this per physics step, m, are a teleport (a retry, a placement), never blended across: as the local track. */
const TELEPORT = 2;
/**
 * A point whose velocity between two poses departs from its velocity between
 * the poses either side by more than this, m/s, has jumped: as the drawn
 * body's smoothing reads a jump (`pointInertia`). A limb turning back changes
 * by about 1.2 m/s from one 50 ms pose to the next; the reach's hand, 0.7 m
 * within a step, by 14.
 */
const JUMP = 3;
const FALLEN = RIDER_PHASES.indexOf('fallen');

/** Another surfer at one moment, ready to draw on this player's water. */
export interface RemoteState {
  x: number;
  z: number;
  /** Height above the water surface where the board sits, m. */
  lift: number;
  quaternion: [number, number, number, number];
  /** The rider's seven points relative to the board, m (x, y, z each). */
  points: Float32Array;
  /** Index in `RIDER_PHASES`, or −1 with no rider. */
  phase: number;
  present: boolean;
  boardPresent: boolean;
  paddling: boolean;
  /** The wipeout spec: the leash has snapped, the rider is duck-diving, the fallen surfer dives. */
  leashSnapped: boolean;
  ducking: boolean;
  diving: boolean;
  heading: number;
}

export function createRemoteState(): RemoteState {
  return {
    x: 0, z: 0, lift: 0, quaternion: [0, 0, 0, 1], points: new Float32Array(21), phase: -1,
    present: false, boardPresent: false, paddling: false, leashSnapped: false, ducking: false, diving: false, heading: 0,
  };
}

interface Remote {
  info: PlayerInfo;
  /** Poses in step order, oldest first. */
  poses: SurferPose[];
  /** When a pose last came, local ms. */
  heardAt: number;
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Two poses the surfer did not jump between: blended, else the newer is drawn whole. */
function continuous(a: SurferPose, b: SurferPose): boolean {
  return a.present === b.present && a.boardPresent === b.boardPresent
    && Math.hypot(b.x - a.x, b.z - a.z) <= TELEPORT * (b.step - a.step);
}

/** Whether the poses at `i` and `i + 1` blend: the surfer did not jump between them, and their points mean the same. */
function joined(poses: readonly SurferPose[], i: number): boolean {
  const a = poses[i];
  const b = poses[i + 1];
  return a !== undefined && b !== undefined && continuous(a, b) && a.phase === b.phase;
}

/** The difference, m/s, between point `p`'s velocities from pose `i` to `i + 1` and from `j` to `j + 1`. */
function change(poses: readonly SurferPose[], i: number, j: number, p: number): number {
  const spanI = (poses[i + 1].step - poses[i].step) * SURF_ZONE_STEP;
  const spanJ = (poses[j + 1].step - poses[j].step) * SURF_ZONE_STEP;
  let sum = 0;
  for (let k = 3 * p; k < 3 * p + 3; k += 1) {
    const v = (poses[i + 1].points[k] - poses[i].points[k]) / spanI;
    const w = (poses[j + 1].points[k] - poses[j].points[k]) / spanJ;
    sum += (v - w) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Whether point `p` jumps between the joined poses at `i` and `i + 1`: its
 * velocity departs from each joined neighbour's by more than `JUMP`. With no
 * neighbour a jump is not told from motion. Fallen, the points are measured
 * from a board tumbling away (the drawn body's smoothing reads them in the
 * world): none is read.
 */
function jumps(poses: readonly SurferPose[], i: number, p: number): boolean {
  if (poses[i].phase === FALLEN) return false;
  let compared = false;
  for (const j of [i - 1, i + 1]) {
    if (!joined(poses, j)) continue;
    compared = true;
    if (change(poses, i, j, p) <= JUMP) return false;
  }
  return compared;
}

/**
 * A point's slope at pose `b`, per step, from its neighbours `before` and
 * `after` steps away (0: none, the one chord there is). Steffen's monotone
 * slope (1990, A&A 239: 443): the three-point formula on uneven steps (exact
 * for an even acceleration), held within twice either chord and zero at a turn,
 * so the curve never overshoots the poses (a jump rests either side of it).
 */
function slope(a: number, b: number, c: number, before: number, after: number): number {
  if (!(before > 0)) return (c - b) / after;
  if (!(after > 0)) return (b - a) / before;
  const s0 = (b - a) / before;
  const s1 = (c - b) / after;
  if (s0 * s1 <= 0) return 0;
  const p = (s0 * after + s1 * before) / (before + after);
  return Math.sign(p) * Math.min(2 * Math.abs(s0), 2 * Math.abs(s1), Math.abs(p));
}

function copyPose(pose: SurferPose, out: RemoteState): void {
  out.x = pose.x;
  out.z = pose.z;
  out.lift = pose.lift;
  out.quaternion[0] = pose.qx;
  out.quaternion[1] = pose.qy;
  out.quaternion[2] = pose.qz;
  out.quaternion[3] = pose.qw;
  out.points.set(pose.points);
  out.phase = pose.phase;
  out.present = pose.present;
  out.boardPresent = pose.boardPresent;
  out.paddling = pose.paddling;
  out.leashSnapped = pose.leashSnapped;
  out.ducking = pose.ducking;
  out.diving = pose.diving;
  out.heading = pose.heading;
}

/**
 * The other players in the room (spec N1): who they are, and their recent
 * poses, drawn smoothly a little in the past on the shared sea's clock.
 */
export class RemoteSurfers {
  private readonly remotes = new Map<number, Remote>();

  join(info: PlayerInfo): void {
    this.remotes.set(info.id, { info, poses: [], heardAt: Number.NEGATIVE_INFINITY });
  }

  leave(id: number): void {
    this.remotes.delete(id);
  }

  ids(): number[] {
    return [...this.remotes.keys()];
  }

  info(id: number): PlayerInfo | undefined {
    return this.remotes.get(id)?.info;
  }

  /**
   * A bundle from the server: each known player's newer pose is kept, and its
   * push on the water appended to `reactions` (x, z, jx, jz) to apply once.
   */
  receiveBundle(data: ArrayBuffer, localNow: number, reactions: number[]): void {
    readBundle(data, (id, view, offset) => {
      const remote = this.remotes.get(id);
      if (!remote) return;
      const newest = remote.poses.at(-1);
      if (newest && view.getUint32(offset, true) <= newest.step) return;
      const pose = decodePose(view, offset, remote.poses.length >= KEPT ? remote.poses.shift()! : createPose());
      remote.poses.push(pose);
      remote.heardAt = localNow;
      const { reaction } = pose;
      if (reaction.jx !== 0 || reaction.jz !== 0) reactions.push(reaction.x, reaction.z, reaction.jx, reaction.jz);
    });
  }

  /** Hides players silent for VANISH_SECONDS; returns their ids. They return with their next pose. */
  prune(localNow: number): number[] {
    const hidden: number[] = [];
    for (const [id, remote] of this.remotes) {
      if (remote.poses.length && localNow - remote.heardAt > VANISH_SECONDS * 1000) {
        remote.poses.length = 0;
        hidden.push(id);
      }
    }
    return hidden;
  }

  /** A player as they were at `seaTime`; false when there is nothing to draw. */
  sample(id: number, seaTime: number, out: RemoteState): boolean {
    const poses = this.remotes.get(id)?.poses;
    if (!poses?.length) return false;
    const t = seaTime / SURF_ZONE_STEP;
    const first = poses[0];
    const last = poses[poses.length - 1];
    if (t <= first.step) {
      copyPose(first, out);
      return true;
    }
    if (t >= last.step) {
      copyPose(last, out);
      const previous = poses[poses.length - 2];
      if (previous) {
        const ahead = Math.min(t - last.step, EXTRAPOLATE_LIMIT / SURF_ZONE_STEP);
        const span = last.step - previous.step;
        out.x += ((last.x - previous.x) / span) * ahead;
        out.z += ((last.z - previous.z) / span) * ahead;
      }
      return true;
    }
    let index = 0;
    while (poses[index + 1].step <= t) index += 1;
    const a = poses[index];
    const b = poses[index + 1];
    if (!continuous(a, b)) {
      // A retry or a placement: never swept across the sea, the newer is drawn.
      copyPose(b, out);
      return true;
    }
    const span = b.step - a.step;
    const f = (t - a.step) / span;
    const near = f < 0.5 ? a : b;
    copyPose(near, out);
    out.x = a.x + (b.x - a.x) * f;
    out.z = a.z + (b.z - a.z) * f;
    out.lift = a.lift + (b.lift - a.lift) * f;
    if (a.phase === b.phase) {
      // Each point on a cubic through the poses either side (a monotone Catmull-Rom, on uneven steps): at 20 poses a
      // second its speed carries on across each pose, where the chords turned it at every pose. A point that jumps
      // (the reach's hand), like every point across a phase switch (the fall's tips to limbs' centres, the landing's
      // feet from where the legs lay), is the nearer pose's: the jump lands in one frame, mid-way, as the local track
      // draws it within a step, and the drawn body's smoothing takes it (spread over the 50 ms it would read as motion).
      // The board glides on under the nearer's points.
      const before = poses[index - 1];
      const after = poses[index + 2];
      const from = joined(poses, index - 1) ? a.step - before.step : 0;
      const to = joined(poses, index + 1) ? after.step - b.step : 0;
      const f2 = f * f;
      const f3 = f2 * f;
      const ha = 2 * f3 - 3 * f2 + 1;
      const hb = 1 - ha;
      const hsa = (f3 - 2 * f2 + f) * span;
      const hsb = (f3 - f2) * span;
      for (let p = 0; p < 7; p += 1) {
        if (jumps(poses, index, p)) continue;
        // Nor is a curve bent by a neighbour's jump.
        const fromHere = from && !jumps(poses, index - 1, p) ? from : 0;
        const toHere = to && !jumps(poses, index + 1, p) ? to : 0;
        for (let i = 3 * p; i < 3 * p + 3; i += 1) {
          const pa = a.points[i];
          const pb = b.points[i];
          const sa = slope(fromHere ? before.points[i] : pa, pa, pb, fromHere, span);
          const sb = slope(pa, pb, toHere ? after.points[i] : pb, span, toHere);
          out.points[i] = ha * pa + hb * pb + hsa * sa + hsb * sb;
        }
      }
    }
    out.heading = a.heading + wrapAngle(b.heading - a.heading) * f;
    // Normalised linear interpolation along the shorter arc.
    const sign = a.qx * b.qx + a.qy * b.qy + a.qz * b.qz + a.qw * b.qw < 0 ? -1 : 1;
    const q = out.quaternion;
    q[0] = a.qx + (sign * b.qx - a.qx) * f;
    q[1] = a.qy + (sign * b.qy - a.qy) * f;
    q[2] = a.qz + (sign * b.qz - a.qz) * f;
    q[3] = a.qw + (sign * b.qw - a.qw) * f;
    const norm = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    for (let i = 0; i < 4; i += 1) q[i] /= norm;
    return true;
  }

  /** Where each visible player last was: for choosing a free spawn. */
  latestPositions(): { x: number; z: number }[] {
    const positions: { x: number; z: number }[] = [];
    for (const remote of this.remotes.values()) {
      const last = remote.poses.at(-1);
      if (last) positions.push({ x: last.x, z: last.z });
    }
    return positions;
  }
}
