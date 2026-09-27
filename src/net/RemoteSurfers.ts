import { SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
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
  heading: number;
}

export function createRemoteState(): RemoteState {
  return {
    x: 0, z: 0, lift: 0, quaternion: [0, 0, 0, 1], points: new Float32Array(21), phase: -1,
    present: false, boardPresent: false, paddling: false, heading: 0,
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
    const f = (t - a.step) / (b.step - a.step);
    const near = f < 0.5 ? a : b;
    copyPose(near, out);
    out.x = a.x + (b.x - a.x) * f;
    out.z = a.z + (b.z - a.z) * f;
    out.lift = a.lift + (b.lift - a.lift) * f;
    for (let i = 0; i < 21; i += 1) out.points[i] = a.points[i] + (b.points[i] - a.points[i]) * f;
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
