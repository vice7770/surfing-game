import { OnlinePacer } from '../net/OnlinePacer';
import { OwnPoseTracker } from '../net/ownPose';
import { createPose, type SurferPose } from '../net/poseCodec';
import { POSE_HZ } from '../net/protocol';
import { chooseSpawn } from '../net/spawn';
import type { RideInput } from '../physics/RideSession';
import type { RideRequest } from '../wave/SurfZoneRunner';
import type { SurfZoneHost } from './SurfZoneHost';

/** A respawn waits this long, s, so the button can't jump the queue for waves (spec N1). */
export const RESPAWN_SECONDS = 3;
const IDLE: RideInput = { paddle: false, popUp: false, steer: 0 };

/** What online play needs from the physical mode (PhysicalMode). */
export interface OnlineSurf {
  readonly host?: SurfZoneHost;
  advance(steps: number, input?: Omit<RideRequest, 'retry'>, reactions?: ArrayLike<number>): void;
  retry(spawnAt?: { x: number; z: number }): void;
}

/** What online play needs from the session (OnlineController). */
export interface OnlineLink {
  readonly clockReady: boolean;
  seaTimeNow(): number;
  takeReactions(): Float32Array | undefined;
  sendPose(pose: SurferPose): void;
  readonly remote: { latestPositions(): { x: number; z: number }[] };
}

export type OnlinePhase = 'catching-up' | 'riding' | 'resyncing';

/**
 * A frame of online play (spec N1): step the sea to the room's clock (catching
 * up after a join without the player's input), then move to a free spot in the
 * lineup; hand the player's input and the others' pushes to the water; send
 * the player's pose 20 times a second; count down a respawn.
 */
export class OnlinePlay {
  phase: OnlinePhase = 'catching-up';
  private readonly pacer = new OnlinePacer();
  private readonly own = new OwnPoseTracker();
  private readonly pose = createPose();
  private lastSeaTime = Number.NaN;
  private sendClock = 0;
  private respawnAt?: number;

  constructor(private readonly link: OnlineLink, private readonly now: () => number = () => performance.now()) {}

  /** One frame of `elapsed` s with the player's input (undefined while a menu is open). Returns whether the sea must be rebuilt. */
  step(surf: OnlineSurf, elapsed: number, input: RideInput | undefined): { resync: boolean } {
    const host = surf.host;
    if (!host || !this.link.clockReady) {
      surf.advance(0);
      return { resync: false };
    }
    const shown = host.snapshot.status.seaTime;
    if (shown !== this.lastSeaTime) {
      this.own.accumulate(host.snapshot.reaction);
      this.lastSeaTime = shown;
    }
    const { steps, resync, caughtUp } = this.pacer.next(this.link.seaTimeNow(), shown, host.outstandingSteps, elapsed);
    if (resync) {
      this.phase = 'resyncing';
      return { resync: true };
    }
    if (caughtUp && this.phase === 'catching-up') {
      this.phase = 'riding';
      surf.retry(this.freeSpot(host));
    }
    if (this.respawnAt !== undefined && this.now() >= this.respawnAt) {
      this.respawnAt = undefined;
      surf.retry(this.freeSpot(host));
    }
    const riding = this.phase === 'riding';
    surf.advance(steps, riding ? input ?? IDLE : IDLE, this.link.takeReactions());
    if (!riding) return { resync: false };
    this.sendClock += elapsed;
    const interval = 1 / POSE_HZ;
    if (this.sendClock + 1e-9 >= interval) {
      this.sendClock = Math.min(interval, this.sendClock - interval);
      this.link.sendPose(this.own.write(host.snapshot, (x, z) => host.heightAt(x, z), shown, riding && (input?.paddle ?? false), this.pose));
    }
    return { resync: false };
  }

  /** A free spot outside the break, away from the others' latest positions. */
  private freeSpot(host: SurfZoneHost): { x: number; z: number } {
    const { init } = host;
    return chooseSpawn({
      focusX: init.focus.x, focusZ: init.focus.z, xMin: init.windowXMin, xMax: init.windowXMin + (init.grid.nx - 1) * init.grid.spacing,
    }, this.link.remote.latestPositions());
  }

  /** R online: back to a free spot in the lineup after RESPAWN_SECONDS (a second press doesn't restart the count). */
  respawn(): void {
    if (this.phase === 'riding' && this.respawnAt === undefined) this.respawnAt = this.now() + RESPAWN_SECONDS * 1000;
  }

  /** Seconds until the respawn, while one is counting down. */
  get respawnIn(): number | undefined {
    return this.respawnAt === undefined ? undefined : Math.max(0, (this.respawnAt - this.now()) / 1000);
  }

  /** A rebuilt sea: catch up again, then take a free spot. */
  restart(): void {
    this.pacer.reset();
    this.phase = 'catching-up';
    this.lastSeaTime = Number.NaN;
    this.sendClock = 0;
    this.respawnAt = undefined;
  }
}
