import { PerspectiveCamera, Vector3 } from 'three';

export type SpectatorView = 'overview' | 'profile' | 'below' | 'cinematic' | RideView;

/**
 * Views that follow the rider: in front (from the beach side, looking out at the
 * rider and the incoming wave), behind (looking where the board heads), and side
 * (across the wave, showing its profile and the face).
 */
export type RideView = 'front' | 'behind' | 'side';
export const RIDE_VIEWS: readonly RideView[] = ['front', 'behind', 'side'];

/** What the ride view follows: the board's position and heading (radians from +z toward +x). */
export interface FollowTarget {
  position: { x: number; y: number; z: number };
  heading: number;
  /** The rider's velocity, m/s: the front view leads by it so it keeps up. */
  velocity?: { x: number; y: number; z: number };
  /** The crest of the wave the rider rides, when there is one: the front view keeps its lip in frame. */
  crest?: { x: number; y: number; z: number };
}

export interface SpectatorScene {
  heightAt(x: number, z: number): number;
  bedAt(x: number, z: number): number;
}

/**
 * The front view's offsets from the rider, m: to its side (−x, so the rider sits
 * right of centre, clear of the Wave Lab panel), shoreward, above, and how far out
 * to sea it looks. Behind: how far back and up. Side: how far across and up.
 */
const FRONT_SIDE = -5;
const FRONT_SHOREWARD = 9;
const FRONT_HEIGHT = 3.5;
const FRONT_LOOK_SEAWARD = 6;
const BEHIND_DISTANCE = 6.5;
const BEHIND_HEIGHT = 2.6;
const SIDE_DISTANCE = 14;
const SIDE_HEIGHT = 1.8;
/** The camera closes on where it wants to be at this rate, 1/s. */
const FOLLOW_RATE = 3;
/**
 * The front view leads the rider by its horizontal velocity over this time, s:
 * the follow rate's lag, so at a steady speed the rider stays where it sits at
 * rest instead of trailing by v / FOLLOW_RATE (3.3 m at 10 m/s).
 */
const FRONT_LEAD = 1 / FOLLOW_RATE;
/** The front view follows the rider's height smoothed over this time, s, so a drop down the face does not lift the wave in frame. */
const FRONT_HEIGHT_TIME = 1.5;
/** How far the front view's look point moves toward the crest, keeping the lip in frame. */
const FRONT_CREST_SHARE = 0.3;

/**
 * The menu's cinematic view (plan P8): the camera sweeps CINEMA_SWEEP m either
 * side of the break at CINEMA_RATE rad/s (a full sweep in about three minutes),
 * CINEMA_SHOREWARD m inshore of it and CINEMA_HEIGHT m up, looking out to sea.
 */
export const CINEMA_SWEEP = 55;
export const CINEMA_RATE = 0.035;
export const CINEMA_SHOREWARD = 60;
export const CINEMA_HEIGHT = 11;

/** Camera for the physical surf zone: cliff overview, water-line profile, underwater, or following the ride. */
export class SpectatorCamera {
  readonly camera = new PerspectiveCamera(52, 1, 0.1, 3000);
  private currentView: SpectatorView = 'overview';
  private readonly desired = new Vector3();
  private readonly crest = new Vector3();
  private readonly target = new Vector3();
  private settled = false;
  /** The rider's height as the front view follows it, smoothed. */
  private followHeight = 0;
  private cinemaTime = 0;
  private reducedMotion = false;

  get view(): SpectatorView {
    return this.currentView;
  }

  /** Change view and cut straight to it, so the camera never drifts through the surface. */
  setView(view: SpectatorView): void {
    this.currentView = view;
    this.settled = false;
  }

  /** Accessibility (plan P8): the cinematic view holds still. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  update(scene: SpectatorScene, focus: { x: number; z: number }, dt: number, follow?: FollowTarget): void {
    const view = this.currentView;
    if (view === 'cinematic') {
      if (!this.reducedMotion) this.cinemaTime += dt;
      const sweep = Math.sin(CINEMA_RATE * this.cinemaTime);
      this.desired.set(focus.x + CINEMA_SWEEP * sweep, 0, focus.z + CINEMA_SHOREWARD);
      this.desired.y = Math.max(scene.heightAt(this.desired.x, this.desired.z) + 6, CINEMA_HEIGHT);
      this.target.set(focus.x + 0.5 * CINEMA_SWEEP * sweep, 0, focus.z - 30);
    } else if (follow && (view === 'front' || view === 'behind' || view === 'side')) {
      const p = follow.position;
      if (view === 'front') {
        // The video brief's wide, elevated three-quarter view from the beach side,
        // looking back out to sea: the incoming wave while paddling, the face and lip
        // while riding (waves run toward +z). It leads a moving rider, holds its
        // height through drops, and tilts toward the crest.
        this.followHeight = this.settled ? this.followHeight + (p.y - this.followHeight) * (1 - Math.exp(-dt / FRONT_HEIGHT_TIME)) : p.y;
        const x = p.x + (follow.velocity?.x ?? 0) * FRONT_LEAD;
        const z = p.z + (follow.velocity?.z ?? 0) * FRONT_LEAD;
        this.desired.set(x + FRONT_SIDE, 0, z + FRONT_SHOREWARD);
        this.desired.y = Math.max(scene.heightAt(this.desired.x, this.desired.z) + 1.5, this.followHeight + FRONT_HEIGHT);
        this.target.set(x, this.followHeight + 0.4, z - FRONT_LOOK_SEAWARD);
        if (follow.crest) this.target.lerp(this.crest.set(follow.crest.x, follow.crest.y, follow.crest.z), FRONT_CREST_SHARE);
      } else if (view === 'behind') {
        const forwardX = Math.sin(follow.heading);
        const forwardZ = Math.cos(follow.heading);
        this.desired.set(p.x - forwardX * BEHIND_DISTANCE, 0, p.z - forwardZ * BEHIND_DISTANCE);
        this.desired.y = Math.max(scene.heightAt(this.desired.x, this.desired.z) + 1.2, p.y + BEHIND_HEIGHT);
        this.target.set(p.x + forwardX * 4, p.y + 0.6, p.z + forwardZ * 4);
      } else {
        // Across the wave: it runs from left to right through the frame, face and back in profile.
        this.desired.set(p.x - SIDE_DISTANCE, 0, p.z);
        this.desired.y = Math.max(scene.heightAt(this.desired.x, this.desired.z) + 0.8, p.y + SIDE_HEIGHT);
        this.target.set(p.x, p.y + 0.5, p.z);
      }
    } else if (view === 'overview' || view === 'front' || view === 'behind' || view === 'side') {
      this.desired.set(focus.x + 70, 16, focus.z + 95);
      this.target.set(focus.x, 0, focus.z - 40);
    } else if (view === 'profile') {
      const x = focus.x + 40;
      this.desired.set(x, scene.heightAt(x, focus.z) + 1.2, focus.z);
      this.target.set(focus.x, 0.6, focus.z);
    } else {
      const z = focus.z - 12;
      const bed = scene.bedAt(focus.x, z);
      const surface = scene.heightAt(focus.x, z);
      this.desired.set(focus.x, Math.max(bed + 0.4, Math.min(surface - 0.8, bed + 1.2)), z);
      this.target.set(focus.x, surface - 0.2, focus.z - 60);
    }
    this.camera.position.lerp(this.desired, this.settled ? 1 - Math.exp(-3 * dt) : 1);
    this.settled = true;
    this.camera.lookAt(this.target);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
