import { PerspectiveCamera, Vector3 } from 'three';

/** `free`: the Wave Lab flies the camera itself (spec L1). */
export type SpectatorView = 'overview' | 'profile' | 'below' | 'cinematic' | 'free' | RideView;

/**
 * Views that follow the rider: in front (from the beach side, looking out at the
 * rider and the incoming wave), behind (looking where the board heads), and side
 * (across the wave, showing its profile and the face).
 */
export type RideView = 'front' | 'behind' | 'side';
export const RIDE_VIEWS: readonly RideView[] = ['front', 'behind', 'side'];

function isRideView(view: SpectatorView): view is RideView {
  return view === 'front' || view === 'behind' || view === 'side';
}

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
 * The lean toward the crest fades in as a wave comes from FRONT_CREST_FAR m to
 * FRONT_CREST_FULL m seaward of the rider, and out once its crest is between the
 * rider and FRONT_CREST_PASSED m shoreward. The wave gauge only reports a crest
 * from 40 m seaward to 12 m shoreward of the rider, so a wave appearing at one
 * end of that window or leaving at the other never turns the view in one frame.
 */
const FRONT_CREST_FAR = 30;
const FRONT_CREST_FULL = 15;
const FRONT_CREST_PASSED = 4;

/**
 * The ride views' swing around the rider (the owner, 2026-10-22): the pad's right stick across swings the camera
 * round the rider's vertical axis at up to SWING_RATE rad/s (90°/s at full stick), the rate easing in and out over
 * SWING_EASE s so it never jerks. The swing holds until the view changes.
 */
export const SWING_RATE = Math.PI / 2;
export const SWING_EASE = 0.15;

/** The swing rate a stick pushed this far asks for, rad/s: −1 (left) to 1 (right), after the pad's dead zone and response. */
export function swingRate(stick: number): number {
  return SWING_RATE * Math.min(1, Math.max(-1, Number.isFinite(stick) ? stick : 0));
}

/** An angle wrapped to (−π, π]. */
function wrapAngle(angle: number): number {
  const wrapped = angle - 2 * Math.PI * Math.floor((angle + Math.PI) / (2 * Math.PI));
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

/** Turn the point (x, z) about the vertical axis through (pivotX, pivotZ) by `angle`: positive turns +z toward +x. */
function swingAbout<T extends { x: number; z: number }>(point: T, pivotX: number, pivotZ: number, angle: number): T {
  if (angle === 0) return point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - pivotX;
  const dz = point.z - pivotZ;
  point.x = pivotX + dx * cos + dz * sin;
  point.z = pivotZ - dx * sin + dz * cos;
  return point;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** The share of the look point moved toward a crest `seaward` m seaward of the rider (negative once it has passed). */
export function crestLean(seaward: number): number {
  return FRONT_CREST_SHARE * smoothstep(-FRONT_CREST_PASSED, 0, seaward) * (1 - smoothstep(FRONT_CREST_FULL, FRONT_CREST_FAR, seaward));
}

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
  /** The front view's lean from its look point toward the crest: as wanted this frame, and as eased. */
  private readonly leanWanted = new Vector3();
  private readonly lean = new Vector3();
  private readonly target = new Vector3();
  private settled = false;
  /** The rider's height as the front view follows it, smoothed. */
  private followHeight = 0;
  private cinemaTime = 0;
  private reducedMotion = false;
  /** How far the ride view has swung round the rider from its own framing, rad (positive: the camera moved to its right). */
  private swingAngle = 0;
  /** The swing's rate now, rad/s, eased toward the stick's. */
  private swingSpeed = 0;
  /** The swing the camera's position already carries, so a change of swing moves it along the arc, not across it. */
  private appliedSwing = 0;
  /** Whether the last update followed a rider in a ride view: only then does the stick swing it. */
  private following = false;

  get view(): SpectatorView {
    return this.currentView;
  }

  /** The ride view's swing round the rider from its own framing, rad, in (−π, π]: positive, the camera has moved to its right. */
  get swing(): number {
    return this.swingAngle;
  }

  /** Change view and cut straight to it, so the camera never drifts through the surface; every view starts unswung. */
  setView(view: SpectatorView): void {
    this.currentView = view;
    this.settled = false;
    this.swingAngle = 0;
    this.swingSpeed = 0;
    this.appliedSwing = 0;
    this.following = false;
  }

  /**
   * Swing the ride view round the rider (the owner, 2026-10-22): `stick` is the pad's right stick across, −1 to 1 after
   * its dead zone and response, positive moving the camera to its right; `dt` is real time, s, so slow motion does not
   * slow it. The rate eases toward the stick's over SWING_EASE; the angle wraps round the full circle and holds where
   * it is left, through every stage of the ride, until the view changes. Other views, and a ride view with no rider
   * to follow, ignore the stick.
   */
  steerSwing(stick: number, dt: number): void {
    const step = Math.max(0, dt);
    const wanted = this.following ? swingRate(stick) : 0;
    const ease = (SWING_RATE / SWING_EASE) * step;
    const gap = wanted - this.swingSpeed;
    this.swingSpeed = Math.abs(gap) <= ease ? wanted : this.swingSpeed + Math.sign(gap) * ease;
    if (this.swingSpeed !== 0) this.swingAngle = wrapAngle(this.swingAngle + this.swingSpeed * step);
  }

  /** Accessibility (plan P8): the cinematic view holds still. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  update(scene: SpectatorScene, focus: { x: number; z: number }, dt: number, follow?: FollowTarget): void {
    const view = this.currentView;
    // The lab's free camera (spec L1) is flown by its owner.
    if (view === 'free') return;
    if (view === 'cinematic') {
      if (!this.reducedMotion) this.cinemaTime += dt;
      const sweep = Math.sin(CINEMA_RATE * this.cinemaTime);
      this.desired.set(focus.x + CINEMA_SWEEP * sweep, 0, focus.z + CINEMA_SHOREWARD);
      this.desired.y = Math.max(scene.heightAt(this.desired.x, this.desired.z) + 6, CINEMA_HEIGHT);
      this.target.set(focus.x + 0.5 * CINEMA_SWEEP * sweep, 0, focus.z - 30);
    } else if (follow && isRideView(view)) {
      const p = follow.position;
      // The swing turns each view's framing round the rider's vertical axis (its led point, in front); the water's
      // clearance is taken where the camera then stands.
      const swing = this.swingAngle;
      let pivotX = p.x;
      let pivotZ = p.z;
      if (view === 'front') {
        // The video brief's wide, elevated three-quarter view from the beach side,
        // looking back out to sea: the incoming wave while paddling, the face and lip
        // while riding (waves run toward +z). It leads a moving rider, holds its
        // height through drops, and tilts toward the crest.
        this.followHeight = this.settled ? this.followHeight + (p.y - this.followHeight) * (1 - Math.exp(-dt / FRONT_HEIGHT_TIME)) : p.y;
        const x = p.x + (follow.velocity?.x ?? 0) * FRONT_LEAD;
        const z = p.z + (follow.velocity?.z ?? 0) * FRONT_LEAD;
        pivotX = x;
        pivotZ = z;
        swingAbout(this.desired.set(x + FRONT_SIDE, 0, z + FRONT_SHOREWARD), x, z, swing);
        this.desired.y = Math.max(scene.heightAt(this.desired.x, this.desired.z) + 1.5, this.followHeight + FRONT_HEIGHT);
        swingAbout(this.target.set(x, this.followHeight + 0.4, z - FRONT_LOOK_SEAWARD), x, z, swing);
        // Waves run toward +z, so the crest is seaward of the rider by the rider's z less the crest's. The
        // gauge's crest can vanish or change wave between steps, so the lean eases at the follow rate. Swung
        // away from facing out to sea, the lean fades: by side-on the crest is no longer ahead of the camera.
        const { crest } = follow;
        if (crest) this.leanWanted.set(crest.x, crest.y, crest.z).sub(this.target).multiplyScalar(crestLean(p.z - crest.z) * Math.max(0, Math.cos(swing)));
        else this.leanWanted.set(0, 0, 0);
        this.lean.lerp(this.leanWanted, this.settled ? 1 - Math.exp(-FOLLOW_RATE * dt) : 1);
        this.target.add(this.lean);
      } else if (view === 'behind') {
        const forwardX = Math.sin(follow.heading);
        const forwardZ = Math.cos(follow.heading);
        swingAbout(this.desired.set(p.x - forwardX * BEHIND_DISTANCE, 0, p.z - forwardZ * BEHIND_DISTANCE), p.x, p.z, swing);
        this.desired.y = Math.max(scene.heightAt(this.desired.x, this.desired.z) + 1.2, p.y + BEHIND_HEIGHT);
        swingAbout(this.target.set(p.x + forwardX * 4, p.y + 0.6, p.z + forwardZ * 4), p.x, p.z, swing);
      } else {
        // Across the wave: it runs from left to right through the frame, face and back in profile.
        swingAbout(this.desired.set(p.x - SIDE_DISTANCE, 0, p.z), p.x, p.z, swing);
        this.desired.y = Math.max(scene.heightAt(this.desired.x, this.desired.z) + 0.8, p.y + SIDE_HEIGHT);
        this.target.set(p.x, p.y + 0.5, p.z);
      }
      // The swing since the last frame carries the camera round the arc at once; the follow's smoothing below is
      // left to the rider's own motion, so a swing neither lags nor cuts inside the circle.
      if (this.settled) swingAbout(this.camera.position, pivotX, pivotZ, wrapAngle(swing - this.appliedSwing));
      this.appliedSwing = swing;
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
    this.following = Boolean(follow) && isRideView(view);
    if (!this.following) this.appliedSwing = this.swingAngle;
    this.camera.position.lerp(this.desired, this.settled ? 1 - Math.exp(-3 * dt) : 1);
    this.settled = true;
    this.camera.lookAt(this.target);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
