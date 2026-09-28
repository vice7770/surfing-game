import { Quaternion, Vector3 } from 'three';
import { POINT, type RiderVisualState } from './riderVisualState';

/**
 * A drawn point's jump decays with this half-life, s (Holden's critically
 * damped decay), and no faster than this, m/s: the landing's feet (about 0.85 m
 * from the lying legs to the stance) come under the body over about half a
 * second, as the pop-up's reach does (Borgonovo-Santos et al. 2021: 0.48 s).
 */
export const POINT_INERTIA_HALF_LIFE = 0.05;
export const POINT_INERTIA_TRAVEL = 2;
/** A point leaving the path its motion predicts faster than this, m/s, has jumped. */
const JUMP = 1;
/**
 * A jump drawn between physics steps spreads over the display frames between
 * them: it may carry on this many frames after it began (a step over three
 * frames at 144 Hz), then the point's rate is learned again from its motion.
 */
const JUMP_SPREAD = 2;
/** The pelvis point this far, m, from the last frame's: a teleport, drawn at once. */
const TELEPORT = 3;
/** A frame longer than this, s (or none), starts over. */
const LONGEST_FRAME = 0.25;
const LN2 = Math.log(2);

interface Track {
  goal: Vector3;
  goalRate: Vector3;
  drawn: Vector3;
  drawnRate: Vector3;
  offset: Vector3;
  offsetRate: Vector3;
  decay: number;
  /** Frames since the point jumped, while its jump may carry on; 0 otherwise. */
  spread: number;
}

const scratch = new Vector3();
const scratch2 = new Vector3();
const inverse = new Quaternion();

/** Holden's critically damped decay of an offset `x` with velocity `v` over `dt` at a decay rate `y`, in place. */
function decay(x: Vector3, v: Vector3, y: number, dt: number): void {
  const j = scratch2.copy(x).multiplyScalar(y).add(v);
  const e = Math.exp(-y * dt);
  x.addScaledVector(j, dt).multiplyScalar(e);
  v.addScaledVector(j, -y * dt).multiplyScalar(e);
}

/**
 * The physics' drawn points blended where they jump (the riding-body plan,
 * step 1): the landing's feet coming off the lying legs, a hand going to the
 * water, a posture's shift mid-transition. Before the rig solves, each of the
 * seven points that left its predicted path (or all of them at a phase change)
 * keeps the jump as an offset that decays, on the board while riding (where a
 * standing body is still) and in the world once fallen (the fall carries over).
 * A point moving smoothly is left as it is; a teleport starts over.
 */
export class PointInertia {
  private readonly tracks: Track[] = Array.from({ length: 7 }, () => ({
    goal: new Vector3(), goalRate: new Vector3(), drawn: new Vector3(), drawnRate: new Vector3(),
    offset: new Vector3(), offsetRate: new Vector3(), decay: 0, spread: 0,
  }));
  private clock = Number.NaN;
  private phase = '';
  private fallen = false;
  private learning = false;
  private readonly pelvis = new Vector3();

  reset(): void {
    this.clock = Number.NaN;
  }

  /** Moves the tracks from the board's frame into the world's (`toWorld`), or back, at the board's present pose and motion. */
  private changeFrame(state: RiderVisualState, toWorld: boolean): void {
    const boardVelocity = scratch.copy(state.travel).multiplyScalar(state.speed);
    boardVelocity.y = state.climb;
    for (const track of this.tracks) {
      for (const place of [track.goal, track.drawn]) {
        if (toWorld) place.applyQuaternion(state.boardQuaternion).add(state.boardPosition);
        else place.sub(state.boardPosition).applyQuaternion(inverse);
      }
      for (const rate of [track.goalRate, track.drawnRate]) {
        if (toWorld) rate.applyQuaternion(state.boardQuaternion).add(boardVelocity);
        else rate.sub(boardVelocity).applyQuaternion(inverse);
      }
    }
  }

  /** Blends the jumps out of `state.points`, in place, over the time since the last frame (`state.clock`). */
  apply(state: RiderVisualState): void {
    const dt = state.clock - this.clock;
    const fallen = state.phase === 'fallen';
    const fresh = !(dt >= 0 && dt <= LONGEST_FRAME) || state.points[POINT.pelvis].distanceTo(this.pelvis) > TELEPORT;
    this.pelvis.copy(state.points[POINT.pelvis]);
    this.clock = state.clock;
    // Riding, the points on the board; fallen, in the world.
    inverse.copy(state.boardQuaternion).invert();
    // The body leaving the board (or climbing back on): what was drawn carries over into the other frame, moving on
    // with the board's motion, so the fall blends like any other switch.
    if (!fresh && !this.learning && fallen !== this.fallen) this.changeFrame(state, fallen);
    this.fallen = fallen;
    const switched = state.phase !== this.phase;
    this.phase = state.phase;
    const toFrame = (point: Vector3, out: Vector3) => (fallen ? out.copy(point) : out.copy(point).sub(state.boardPosition).applyQuaternion(inverse));
    const fromFrame = (point: Vector3, out: Vector3) => (fallen ? out.copy(point) : out.copy(point).applyQuaternion(state.boardQuaternion).add(state.boardPosition));
    if (fresh) {
      this.learning = true;
      state.points.forEach((point, i) => {
        const track = this.tracks[i];
        toFrame(point, track.goal);
        track.drawn.copy(track.goal);
        track.goalRate.set(0, 0, 0);
        track.drawnRate.set(0, 0, 0);
        track.offset.set(0, 0, 0);
        track.offsetRate.set(0, 0, 0);
        track.decay = 0;
        track.spread = 0;
      });
      return;
    }
    if (dt === 0) {
      state.points.forEach((point, i) => fromFrame(this.tracks[i].drawn, point));
      return;
    }
    if (this.learning) {
      this.learning = false;
      state.points.forEach((point, i) => {
        const track = this.tracks[i];
        const goal = toFrame(point, scratch);
        track.goalRate.copy(goal).sub(track.goal).divideScalar(dt);
        track.drawnRate.copy(track.goalRate);
        track.goal.copy(goal);
        track.drawn.copy(goal);
      });
      return;
    }
    const base = (2 * LN2) / POINT_INERTIA_HALF_LIFE;
    state.points.forEach((point, i) => {
      const track = this.tracks[i];
      const goal = toFrame(point, scratch);
      const goalRate = new Vector3().copy(goal).sub(track.goal).divideScalar(dt);
      const off = new Vector3().copy(track.goal).addScaledVector(track.goalRate, dt).distanceTo(goal);
      // Just after a jump its rate is the jump's: the jump may carry on (drawn over the frames between two steps),
      // else the point's rate is learned again from its motion.
      const after = track.spread > 0;
      const continuing = after && track.spread <= JUMP_SPREAD && goalRate.distanceTo(track.goalRate) > JUMP;
      track.spread = continuing ? track.spread + 1 : 0;
      if (switched || continuing || (!after && off > JUMP * dt)) {
        goalRate.copy(track.goalRate);
        track.offset.copy(track.drawn).addScaledVector(track.drawnRate, dt).sub(goal);
        track.offsetRate.copy(track.drawnRate).sub(goalRate);
        track.decay = Math.min(base, (Math.E * POINT_INERTIA_TRAVEL) / Math.max(1e-6, track.offset.length()));
        if (!continuing) track.spread = 1;
      } else {
        decay(track.offset, track.offsetRate, track.decay || base, dt);
      }
      track.goal.copy(goal);
      track.goalRate.copy(goalRate);
      const drawn = goalRate.copy(goal).add(track.offset);
      track.drawnRate.copy(drawn).sub(track.drawn).divideScalar(dt);
      track.drawn.copy(drawn);
      fromFrame(drawn, point);
    });
  }
}
