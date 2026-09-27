import { RIDER_SNAPSHOT, SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import type { SurferPose } from './poseCodec';

/** The parts of a surf zone snapshot a pose is made from. */
export interface PoseSource {
  /** Position, quaternion x y z w, then 1 with a board. */
  board: ArrayLike<number>;
  /** `RIDER_SNAPSHOT` layout. */
  rider: ArrayLike<number>;
}

/**
 * The player's own surfer as the others will see it (spec N1): a pose from the
 * latest snapshot, and the board's pushes on the water summed over every
 * snapshot since the last pose.
 */
export class OwnPoseTracker {
  private weight = 0;
  private x = 0;
  private z = 0;
  private jx = 0;
  private jz = 0;

  /** One new snapshot's push (x, z, jx, jz); call once per snapshot. */
  accumulate(reaction: ArrayLike<number>): void {
    const weight = Math.hypot(reaction[2], reaction[3]);
    if (!(weight > 0)) return;
    this.weight += weight;
    this.x += reaction[0] * weight;
    this.z += reaction[1] * weight;
    this.jx += reaction[2];
    this.jz += reaction[3];
  }

  /** Fills `out` from the snapshot, with the board's lift above this water (`heightAt`), and starts a new sum of pushes. */
  write(snapshot: PoseSource, heightAt: (x: number, z: number) => number, seaTime: number, paddling: boolean, out: SurferPose): SurferPose {
    const { board, rider } = snapshot;
    out.step = Math.round(seaTime / SURF_ZONE_STEP);
    out.boardPresent = board[7] > 0;
    out.x = board[0];
    out.z = board[2];
    out.lift = out.boardPresent ? board[1] - heightAt(board[0], board[2]) : 0;
    out.qx = board[3];
    out.qy = board[4];
    out.qz = board[5];
    out.qw = board[6];
    out.present = rider[RIDER_SNAPSHOT.present] > 0;
    for (let i = 0; i < 21; i += 1) out.points[i] = out.present ? rider[RIDER_SNAPSHOT.points + i] - board[i % 3] : 0;
    out.phase = out.present ? Math.round(rider[RIDER_SNAPSHOT.phase]) : -1;
    out.heading = out.present ? rider[RIDER_SNAPSHOT.heading] : 0;
    out.paddling = paddling;
    const { weight } = this;
    out.reaction.x = weight > 0 ? this.x / weight : 0;
    out.reaction.z = weight > 0 ? this.z / weight : 0;
    out.reaction.jx = this.jx;
    out.reaction.jz = this.jz;
    this.weight = this.x = this.z = this.jx = this.jz = 0;
    return out;
  }
}
