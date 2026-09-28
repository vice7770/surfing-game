import { Bone, Quaternion, Vector3, type Object3D } from 'three';
import { BONES, type Side } from './humanoidBones';
import { POINT, type RiderVisualState } from './riderVisualState';

/**
 * A switch's jump decays with this half-life, s (Holden's critically damped
 * decay): a small one settles in about 0.2 s.
 */
export const INERTIA_HALF_LIFE = 0.05;
/**
 * A large jump decays no faster than a limb can turn, rad/s, and the hips no
 * faster than they travel, m/s: the landing's legs (about 2 rad) swing under
 * the body over about 0.3 s, as the pop-up's reach does (Borgonovo-Santos et
 * al. 2021: 0.48 s), not in a frame.
 */
export const INERTIA_TURN = 6;
export const INERTIA_TRAVEL = 2;
/**
 * A bone leaving the path its motion predicts faster than this, rad/s (0.1 rad
 * in a 60 Hz frame: the Compress hand's arm kicked 0.2 rad in a frame), has
 * jumped; the hips faster than this, m/s. Rates, so a display's frame rate does
 * not change what counts as a jump. A steady motion is predicted exactly.
 */
const JUMP_TURN = 6;
const JUMP_TRAVEL = 3;
/**
 * A jump drawn between physics steps spreads over the display frames between
 * them: it may carry on this many frames after it began (a step over three
 * frames at 144 Hz), then the rig's rate is learned again from its motion.
 */
const JUMP_SPREAD = 2;
/** The body's pelvis point this far, m, from the last frame's: a teleport (a retry, a placement), drawn at once. */
const TELEPORT = 3;
/** A jump that would carry the hips further than this, m, starts over instead (a retry from the water onto a board nearby). */
const FARTHEST = 1.5;
/** A frame longer than this, s (or none), starts over: nothing to blend from. */
const LONGEST_FRAME = 0.25;

const SIDES: readonly Side[] = ['left', 'right'];
/** The bones the rig drives and the inertia blends, parents first: the trunk, the neck and head, and the limbs. */
const BLENDED = [
  BONES.hips, ...BONES.spine, BONES.neck, BONES.head,
  ...SIDES.flatMap((side) => [BONES.arm[side], BONES.foreArm[side], BONES.hand[side], BONES.upLeg[side], BONES.leg[side], BONES.foot[side]]),
];
const LN2 = Math.log(2);

/** A rotation's vector (axis times angle, rad), the shorter way round. */
function toVector(q: Quaternion, out: Vector3): Vector3 {
  const w = q.w < 0 ? -q.w : q.w;
  const sign = q.w < 0 ? -1 : 1;
  const s = Math.sqrt(Math.max(0, 1 - w * w));
  const angle = 2 * Math.atan2(s, w);
  return s < 1e-9 ? out.set(2 * sign * q.x, 2 * sign * q.y, 2 * sign * q.z) : out.set(q.x, q.y, q.z).multiplyScalar((sign * angle) / s);
}

/** The rotation a vector stands for. */
function fromVector(v: Vector3, out: Quaternion): Quaternion {
  const angle = v.length();
  if (angle < 1e-12) return out.set(v.x / 2, v.y / 2, v.z / 2, 1).normalize();
  const s = Math.sin(angle / 2) / angle;
  return out.set(v.x * s, v.y * s, v.z * s, Math.cos(angle / 2));
}

/**
 * Holden's critically damped decay of an offset `x` with velocity `v` over `dt`
 * at a decay rate `y` (half the damping), in place.
 */
function decay(x: Vector3, v: Vector3, y: number, dt: number): void {
  const j = x.clone().multiplyScalar(y).add(v);
  const e = Math.exp(-y * dt);
  x.addScaledVector(j, dt).multiplyScalar(e);
  v.addScaledVector(j, -y * dt).multiplyScalar(e);
}

interface Track {
  bone: Bone;
  /** Whether this bone's drawn world rotation is set this frame (a child's walk up to its parent reads it). */
  blended: boolean;
  /** The rig's rotation for the bone this frame (on the board while riding, in the world once fallen), and last frame, and its rate, rad/s. */
  target: Quaternion;
  goal: Quaternion;
  goalRate: Vector3;
  /** The rotation drawn last frame, and its rate. */
  drawn: Quaternion;
  drawnRate: Vector3;
  /** The drawn rotation in the world, this frame. */
  world: Quaternion;
  /** The offset from the rig's world rotation to the drawn one (a rotation vector), its rate, and how fast it decays, 1/s. */
  offset: Vector3;
  offsetRate: Vector3;
  decay: number;
  /** Frames since the bone jumped, while its jump may carry on; 0 otherwise. */
  spread: number;
}

const scratchQ = new Quaternion();
const scratchQ2 = new Quaternion();
const drawnQ = new Quaternion();
const parentQ = new Quaternion();
const scratchV = new Vector3();
const scratchV2 = new Vector3();
const placeV = new Vector3();
/** The frame the body blends in this frame: the board's pose while riding, the world's once fallen. */
const frameQ = new Quaternion();
const frameInverse = new Quaternion();
const frameP = new Vector3();
const boardInverse = new Quaternion();

/**
 * The drawn body's switches blended out (the riding-body plan, step 1;
 * Bollo's inertialization, GDC 2018, and Holden's dead blending). After the
 * rig solves, each blended bone that jumped (off the path its last motion
 * predicts, or at a phase change) keeps the jump as an offset that decays, so
 * the drawn bone moves on from where it was; a bone moving smoothly is drawn
 * exactly as the rig solved it. A teleport, or a jump that would carry the
 * body across the sea, starts over. The bones blend whole, not against their
 * parents (an arm's switch decaying joint by joint added up to a forearm
 * turning three times a limb's pace), and on the board while riding, so a
 * board that turns or jumps (a retry nearby, an online surfer corrected) keeps
 * the body standing on it; once fallen, in the world, the fall carried over.
 */
export class BodyInertia {
  private readonly tracks: Track[];
  private readonly byBone = new Map<Bone, Track>();
  private readonly hips: Bone;
  private readonly hipsGoal = new Vector3();
  private readonly hipsGoalRate = new Vector3();
  private readonly hipsDrawn = new Vector3();
  private readonly hipsDrawnRate = new Vector3();
  private readonly hipsOffset = new Vector3();
  private readonly hipsOffsetRate = new Vector3();
  private hipsDecay = 0;
  private hipsSpread = 0;
  private readonly pelvis = new Vector3();
  private readonly hipsWorld = new Vector3();
  private clock = Number.NaN;
  private phase = '';
  private fallen = false;
  /** Just started over: the next frame only learns how the pose moves (a jump is measured against that motion). */
  private learning = false;

  constructor(bones: Map<string, Bone>) {
    this.hips = bones.get(BONES.hips)!;
    this.tracks = BLENDED.map((name) => ({
      bone: bones.get(name)!, blended: false, target: new Quaternion(), goal: new Quaternion(), goalRate: new Vector3(),
      drawn: new Quaternion(), drawnRate: new Vector3(), world: new Quaternion(), offset: new Vector3(), offsetRate: new Vector3(), decay: 0, spread: 0,
    }));
    for (const track of this.tracks) this.byBone.set(track.bone, track);
  }

  /** Forgets the past: the next frame is drawn as the rig solves it. */
  reset(): void {
    this.clock = Number.NaN;
  }

  /** After the rig's solve: blends the bones' jumps out, over the time since the last frame (from `state.clock`). */
  apply(state: RiderVisualState): void {
    const dt = state.clock - this.clock;
    const fallen = state.phase === 'fallen';
    let fresh = !(dt >= 0 && dt <= LONGEST_FRAME) || state.points[POINT.pelvis].distanceTo(this.pelvis) > TELEPORT;
    this.pelvis.copy(state.points[POINT.pelvis]);
    this.clock = state.clock;
    if (fallen) {
      frameQ.identity();
      frameP.set(0, 0, 0);
    } else {
      frameQ.copy(state.boardQuaternion);
      frameP.copy(state.boardPosition);
    }
    frameInverse.copy(frameQ).invert();
    // The body leaving the board (or climbing back on): what was drawn carries over into the other frame.
    if (!fresh && fallen !== this.fallen) this.changeFrame(state, fallen);
    this.fallen = fallen;
    // The rig's pose in the frame: the hips' place (the skeleton's parent may be scaled) and every bone's rotation.
    const goal = this.worldHips(this.hipsWorld).sub(frameP).applyQuaternion(frameInverse);
    this.hips.updateMatrixWorld(true);
    for (const track of this.tracks) track.bone.getWorldQuaternion(track.target).premultiply(frameInverse);
    const switched = state.phase !== this.phase;
    this.phase = state.phase;
    // Carried on from where they were drawn, the hips would land this far from the rig's: too far is no switch.
    if (!fresh && dt > 0 && !this.learning) fresh = scratchV.copy(this.hipsDrawn).addScaledVector(this.hipsDrawnRate, dt).distanceTo(goal) > FARTHEST;
    if (fresh) {
      this.start(goal);
      return;
    }
    if (dt === 0) {
      // The clock stands still: draw what was drawn.
      this.draw(this.hipsDrawn);
      return;
    }
    if (this.learning) {
      this.learn(goal, dt);
      return;
    }
    const base = (2 * LN2) / INERTIA_HALF_LIFE;
    for (const track of this.tracks) {
      const { target } = track;
      const goalRate = toVector(scratchQ.copy(target).multiply(scratchQ2.copy(track.goal).invert()), scratchV).divideScalar(dt);
      // Where the rig's pose would be had it kept its motion: a bone far off that path jumped.
      const predicted = fromVector(scratchV2.copy(track.goalRate).multiplyScalar(dt), scratchQ).multiply(track.goal);
      const off = 2 * Math.acos(Math.min(1, Math.abs(predicted.dot(target))));
      // Just after a jump its rate is the jump's: the jump may carry on (drawn over the frames between two steps),
      // else the rig's rate is learned again from its motion.
      const after = track.spread > 0;
      const continuing = after && track.spread <= JUMP_SPREAD && goalRate.distanceTo(track.goalRate) > JUMP_TURN;
      track.spread = continuing ? track.spread + 1 : 0;
      if (switched || continuing || (!after && off > JUMP_TURN * dt)) {
        // The drawn bone carries on from where it was: the offset takes the jump. A jump breaks the pose, not its
        // motion: the rig's pose keeps the rate it had (this frame's rate is the jump itself).
        goalRate.copy(track.goalRate);
        const onward = fromVector(scratchV2.copy(track.drawnRate).multiplyScalar(dt), scratchQ).multiply(track.drawn);
        toVector(onward.multiply(scratchQ2.copy(target).invert()), track.offset);
        track.offsetRate.copy(track.drawnRate).sub(goalRate);
        track.decay = Math.min(base, (Math.E * INERTIA_TURN) / Math.max(1e-6, track.offset.length()));
        if (!continuing) track.spread = 1;
      } else {
        decay(track.offset, track.offsetRate, track.decay || base, dt);
      }
      track.goal.copy(target);
      track.goalRate.copy(goalRate);
      const drawn = fromVector(track.offset, drawnQ).multiply(target);
      toVector(scratchQ.copy(drawn).multiply(scratchQ2.copy(track.drawn).invert()), track.drawnRate).divideScalar(dt);
      track.drawn.copy(drawn);
    }
    const goalRate = scratchV.copy(goal).sub(this.hipsGoal).divideScalar(dt);
    const off = scratchV2.copy(this.hipsGoal).addScaledVector(this.hipsGoalRate, dt).distanceTo(goal);
    const after = this.hipsSpread > 0;
    const continuing = after && this.hipsSpread <= JUMP_SPREAD && goalRate.distanceTo(this.hipsGoalRate) > JUMP_TRAVEL;
    this.hipsSpread = continuing ? this.hipsSpread + 1 : 0;
    if (switched || continuing || (!after && off > JUMP_TRAVEL * dt)) {
      goalRate.copy(this.hipsGoalRate);
      this.hipsOffset.copy(this.hipsDrawn).addScaledVector(this.hipsDrawnRate, dt).sub(goal);
      this.hipsOffsetRate.copy(this.hipsDrawnRate).sub(goalRate);
      this.hipsDecay = Math.min(base, (Math.E * INERTIA_TRAVEL) / Math.max(1e-6, this.hipsOffset.length()));
      if (!continuing) this.hipsSpread = 1;
    } else {
      decay(this.hipsOffset, this.hipsOffsetRate, this.hipsDecay || base, dt);
    }
    this.hipsGoal.copy(goal);
    this.hipsGoalRate.copy(goalRate);
    const drawn = scratchV2.copy(goal).add(this.hipsOffset);
    this.hipsDrawnRate.copy(drawn).sub(this.hipsDrawn).divideScalar(dt);
    this.hipsDrawn.copy(drawn);
    this.draw(drawn);
  }

  /**
   * Poses the skeleton as drawn: the hips at `hips` in the frame, and each
   * blended bone at its drawn rotation, parents first; a bone between (a
   * clavicle) keeps the rig's turn against its drawn parent.
   */
  private draw(hips: Vector3): void {
    for (const track of this.tracks) track.blended = false;
    for (const track of this.tracks) {
      track.world.copy(frameQ).multiply(track.drawn);
      this.drawnWorld(track.bone.parent, parentQ);
      track.bone.quaternion.copy(parentQ.invert().multiply(track.world));
      track.blended = true;
    }
    this.placeHips(placeV.copy(hips).applyQuaternion(frameQ).add(frameP));
  }

  /**
   * Moves the tracks from the board's frame into the world's (`toWorld`), or
   * back, at the board's present pose and motion (its turn left out: a frame's
   * worth, a degree or two).
   */
  private changeFrame(state: RiderVisualState, toWorld: boolean): void {
    const board = state.boardQuaternion;
    boardInverse.copy(board).invert();
    const turn = toWorld ? board : boardInverse;
    for (const track of this.tracks) {
      track.goal.premultiply(turn);
      track.drawn.premultiply(turn);
      for (const vector of [track.goalRate, track.drawnRate, track.offset, track.offsetRate]) vector.applyQuaternion(turn);
    }
    const velocity = scratchV.copy(state.travel).multiplyScalar(state.speed);
    velocity.y = state.climb;
    for (const place of [this.hipsGoal, this.hipsDrawn]) {
      if (toWorld) place.applyQuaternion(board).add(state.boardPosition);
      else place.sub(state.boardPosition).applyQuaternion(boardInverse);
    }
    for (const rate of [this.hipsGoalRate, this.hipsDrawnRate]) {
      if (toWorld) rate.applyQuaternion(board).add(velocity);
      else rate.sub(velocity).applyQuaternion(boardInverse);
    }
    this.hipsOffset.applyQuaternion(turn);
    this.hipsOffsetRate.applyQuaternion(turn);
  }

  /** A node's world rotation as drawn this frame: a blended bone's own, or the rig's turn on its drawn parent. */
  private drawnWorld(node: Object3D | null, out: Quaternion): Quaternion {
    if (!node) return out.identity();
    const track = node instanceof Bone ? this.byBone.get(node) : undefined;
    if (track?.blended) return out.copy(track.world);
    if (!(node instanceof Bone) || !(node.parent instanceof Bone)) return node.getWorldQuaternion(out);
    return this.drawnWorld(node.parent, out).multiply(node.quaternion);
  }

  /** The hips' place in the world, as the rig set it. */
  private worldHips(out: Vector3): Vector3 {
    out.copy(this.hips.position);
    if (this.hips.parent) {
      this.hips.parent.updateMatrixWorld(true);
      this.hips.parent.localToWorld(out);
    }
    return out;
  }

  /** Puts the hips at a place in the world, and the skeleton under them. */
  private placeHips(world: Vector3): void {
    this.hips.position.copy(world);
    if (this.hips.parent) this.hips.parent.worldToLocal(this.hips.position);
    this.hips.updateMatrixWorld(true);
  }

  /** Draws the rig's pose as it is, and learns its motion from the frame before. */
  private learn(hips: Vector3, dt: number): void {
    this.learning = false;
    for (const track of this.tracks) {
      toVector(scratchQ.copy(track.target).multiply(scratchQ2.copy(track.goal).invert()), track.goalRate).divideScalar(dt);
      track.drawnRate.copy(track.goalRate);
      track.goal.copy(track.target);
      track.drawn.copy(track.target);
    }
    this.hipsGoalRate.copy(hips).sub(this.hipsGoal).divideScalar(dt);
    this.hipsDrawnRate.copy(this.hipsGoalRate);
    this.hipsGoal.copy(hips);
    this.hipsDrawn.copy(hips);
  }

  /** Draws the rig's pose as it is; the next frame learns its motion. */
  private start(hips: Vector3): void {
    this.learning = true;
    for (const track of this.tracks) {
      track.goal.copy(track.target);
      track.drawn.copy(track.target);
      track.goalRate.set(0, 0, 0);
      track.drawnRate.set(0, 0, 0);
      track.offset.set(0, 0, 0);
      track.offsetRate.set(0, 0, 0);
      track.decay = 0;
      track.spread = 0;
    }
    this.hipsSpread = 0;
    this.hipsGoal.copy(hips);
    this.hipsDrawn.copy(hips);
    this.hipsGoalRate.set(0, 0, 0);
    this.hipsDrawnRate.set(0, 0, 0);
    this.hipsOffset.set(0, 0, 0);
    this.hipsOffsetRate.set(0, 0, 0);
    this.hipsDecay = 0;
  }
}
