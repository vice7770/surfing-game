import { Quaternion, Vector3 } from 'three';
import { BOARD_CENTRE, deckAt, railHalfWidth } from './boardDeck';
import { STANDING_PELVIS, pelvisOverDeck } from './posturePoints';
import { POINT, type RiderVisualState } from './riderVisualState';
import type { StanceBlend } from './stanceBlend';
import { TAKE_OFF, type StageWeights, type WaterWeights } from './stagePoses';

/**
 * The stage reader (the animation-realism plan, §3.1, §3.3 and §6): how far the
 * standing rider is into each stage, from the drawn state only, so remote
 * surfers read it from the same state (no wire change). Each weight moves no
 * faster than a set rate and switches with hysteresis, so poses never flicker.
 * Phase 1: the side (frontside or backside) and the drop. Phase 2: the turn,
 * its rail and its kind (a bottom turn, a redirect, low into a cutback), the
 * tube and the kick-out. Phase 3: the pop-up's landing and its settle; lying,
 * the water stages (`WaterStages`: the lineup sit, the catch, the look-up).
 */
export const STAGE_READING = {
  /**
   * In trim, the side is the face's: the deck's normal tilts away from the face,
   * so a face on the toes' side reads as frontside. The tilt is smoothed over
   * `tiltTime` s and needs `tilt`° to switch; within it (flat water: the Wave
   * Pool's flat stretch) the last side holds. Read only while the board turns
   * slower than `turning` of a full turn (`StanceBlend.turn`): in a turn the
   * rail's roll is the turn's, not the face's (at 0.3 a carve's first roll onto
   * its rail on flat water flipped the side as the turn came in).
   */
  tiltTime: 0.5,
  tilt: 6,
  turning: 0.12,
  /** The side's weight swings fully in this, s. */
  sideSwing: 0.6,
  /**
   * The drop: the board travelling down the face, its descent (the climb
   * against the speed) from `dropFrom`° to `dropFull`°, eased in and out over
   * `dropEase` s.
   */
  dropFrom: 5,
  dropFull: 11,
  dropEase: 0.3,
  /**
   * A turn (the plan's §3.3: its rail is its side): the board turning from
   * `turnFrom` to `turnFull` of a full turn (`StanceBlend.turn`, 1.5 rad/s),
   * eased in over `turnIn` s and out over `turnOut` s; the rail read past
   * `railFrom` of a full turn and held below it, swinging over `railSwing` s.
   */
  turnFrom: 0.12,
  turnFull: 0.45,
  turnIn: 0.25,
  turnOut: 0.35,
  railFrom: 0.1,
  railSwing: 0.3,
  /**
   * The turn's kind. Where a face has been read (its tilt past `tilt` for
   * `faceTime` s riding steady), a redirect (the top turn, the snap, the cutback)
   * turns away from it and a bottom turn toward it. On water with no face (flat
   * water, the Wave Pool's flat stretch), a redirect has the weight back
   * (`StanceBlend.back` from `backFrom` to `backFull`); the rest is a bottom turn
   * (a heels'-side carve with the weight even is a backside one). Either way a bottom turn carried on round on its
   * rail, the weight going back (the climb), stays one until the turn lets go.
   * A redirect low (the depth from `lowFrom` to `lowFull`) is a cutback. Each
   * swings over `kindSwing` s.
   */
  faceTime: 0.4,
  backFrom: 0.15,
  backFull: 0.5,
  lowFrom: 0.15,
  lowFull: 0.45,
  kindSwing: 0.3,
  /**
   * The tube (the plan's §6): the pelvis lower than the standing one by
   * `tubeFrom` to `tubeFull` m: past Compress's full depth (0.3 m, `CROUCH_DEPTH`),
   * which only the deep tuck under a tube's curl reaches (0.45 m,
   * `MANUAL_CROUCH_DEPTH`; the plan's 0.195 m is the pumping crouch's, which
   * Compress passes too). Over `tubeEase` s.
   */
  tubeFrom: 0.31,
  tubeFull: 0.4,
  tubeEase: 0.3,
  /**
   * The kick-out over the back (§6): standing, the weight back past `kickBack`
   * (`StanceBlend.back`), the board climbing faster than `kickClimb` m/s,
   * pitched more than `kickPitch`° nose up, slowing (its speed falling faster
   * than `kickSlowing` m/s², smoothed over `slowingTime` s) and going about
   * straight (under `turning` of a full turn); out once the pitch falls under
   * `kickOutPitch`°. In over `kickIn` s, out over `kickOff` s.
   */
  kickBack: 0.5,
  kickClimb: 0.5,
  kickPitch: 15,
  kickOutPitch: 5,
  kickSlowing: 0.3,
  slowingTime: 0.2,
  kickIn: 0.25,
  kickOff: 0.35,
};

/**
 * The water stages (the plan's §6, phase 3), read from the drawn prone state
 * only, so remote surfers read them alike (the take-off cue aside: it is not on
 * the wire, so theirs come from the speed and the pitch, and may start later).
 */
export const WATER_READING = {
  /**
   * The lineup sit (drawn only, no new controls): prone, not stroking, no duck,
   * the board slower than `sitSlow` m/s and both hands resting at the rails
   * (within `handRest` m of their place beside the chest: a steer's sweep takes
   * one off) for `sitAfter` s; it lies down again on a stroke, a sweep, a duck,
   * or the board faster than `sitFast` m/s. In over `sitIn` s, out over `sitOut`.
   */
  sitAfter: 2,
  sitSlow: 0.5,
  sitFast: 0.8,
  handRest: 0.1,
  sitIn: 0.8,
  sitOut: 0.4,
  /**
   * The catch (§5.4): prone and stroking, and either the take-off cue (the
   * snapshot's, local) or the board faster than `catchSpeed` m/s and pitched
   * nose down more than `catchPitch`°; it lets go at the pop-up (held through the
   * push, whose pose takes over) or once neither has held for `catchHold` s. In
   * over `catchIn` s, out over `catchOut`. The cobra's depth is the board's
   * nose-down pitch from `cobraFrom`° to `cobraFull`°, swinging over `catchIn`.
   */
  catchSpeed: 2.5,
  catchPitch: 5,
  catchHold: 1,
  catchIn: 0.3,
  catchOut: 0.3,
  cobraFrom: 5,
  cobraFull: 15,
  /**
   * The paddler's look-up (§5.3: every 5–10 strokes): every `scanEvery` strokes,
   * both arms counted, each at its reach (a hand counted once it has come back
   * `strokeTurn` m along the board from its farthest forward, and again only once
   * it has gone forward that far from its farthest back: the stroke's own path,
   * so a remote surfer's poses count alike), a look up and ahead: in over
   * `scanRise` s, held, out by `scanTime` s. None in the catch or the sit.
   */
  scanEvery: 8,
  scanTime: 0.6,
  scanRise: 0.2,
  strokeTurn: 0.1,
};

const DEG = Math.PI / 180;
const WORLD_UP = new Vector3(0, 1, 0);
const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const ramp = (x: number, from: number, full: number) => Math.max(0, Math.min(1, (x - from) / (full - from)));

/** A weight moving at its rates (linear, then eased), and the target it moves to. */
class Swing {
  linear = 0;
  /** Moves toward `target` in `rise` s going up and `fall` s going down; a fresh read takes it as it is. */
  step(target: number, dt: number, fresh: boolean, rise: number, fall = rise): number {
    if (fresh) this.linear = target;
    else {
      const most = dt / (target > this.linear ? rise : fall);
      this.linear += Math.max(-most, Math.min(most, target - this.linear));
    }
    return ease(this.linear);
  }
}

export class StageBlend {
  readonly weights: StageWeights = { backside: 0, drop: 0, turn: 0, rail: 0, redirect: 0, cutback: 0, tube: 0, kickOut: 0, landing: 0 };
  /** The side read last: 1 backside, 0 frontside (frontside until a face says otherwise). */
  private side = 0;
  private tilt = 0;
  /** The turn's rail read last: 1 the toes', 0 the heels'. */
  private rail = 1;
  /** How long a face's tilt has been read riding steady, s, and whether one has been (a wave, not flat water). */
  private faceFor = 0;
  private faceSeen = false;
  /** The rail of the bottom turn under way (−1 none): carried on round, it stays a bottom turn. */
  private bottomRail = -1;
  /** In the kick-out (its hysteresis), and the speed's fall, m/s², smoothed. */
  private kicking = false;
  private slowing = 0;
  private lastSpeed = 0;
  private clock = Number.NaN;
  private readonly swings = {
    side: new Swing(), drop: new Swing(), turn: new Swing(), rail: new Swing(), redirect: new Swing(), cutback: new Swing(), tube: new Swing(), kickOut: new Swing(),
    landing: new Swing(),
  };
  private readonly up = new Vector3();
  private readonly nose = new Vector3();
  private readonly toes = new Vector3();

  reset(): void {
    this.clock = Number.NaN;
  }

  /** Reads the stages from a standing state (its stance's blend already read); a clock standing still keeps them, a fresh one takes them as they are. */
  update(state: RiderVisualState, blend: StanceBlend): StageWeights {
    const { up, nose, toes } = this;
    const R = STAGE_READING;
    up.set(0, 1, 0).applyQuaternion(state.boardQuaternion);
    nose.set(0, 0, 1).applyQuaternion(state.boardQuaternion);
    const pitch = Math.asin(Math.max(-1, Math.min(1, nose.y))) / DEG;
    nose.setY(0);
    if (nose.lengthSq() < 1e-8) nose.set(0, 0, 1);
    nose.normalize();
    // The board's left is up × nose; Regular faces the −x rail, its toes the board's right.
    toes.crossVectors(WORLD_UP, nose).normalize();
    if (blend.stance === 'regular') toes.negate();
    const tilt = Math.asin(Math.max(-1, Math.min(1, up.dot(toes)))) / DEG;
    const descent = Math.atan2(-state.climb, Math.max(state.speed, 1)) / DEG;
    const drop = ramp(descent, R.dropFrom, R.dropFull);
    const dt = state.clock - this.clock;
    if (dt === 0) return this.weights;
    const fresh = !(dt > 0 && dt < 0.25);
    this.clock = state.clock;
    const steady = Math.abs(blend.turn) < R.turning;
    if (fresh) {
      this.tilt = tilt;
      this.faceFor = 0;
      this.faceSeen = false;
      this.bottomRail = -1;
    } else if (steady) this.tilt += (tilt - this.tilt) * (1 - Math.exp(-dt / R.tiltTime));
    if (steady && Math.abs(this.tilt) > R.tilt) {
      this.faceFor += fresh ? 0 : dt;
      if (this.faceFor >= R.faceTime) this.faceSeen = true;
    } else this.faceFor = 0;
    // A face on the toes' side tilts the deck toward the heels (frontside); on the heels' side, toward the toes.
    if (steady || fresh) {
      if (this.tilt < -R.tilt) this.side = 0;
      else if (this.tilt > R.tilt) this.side = 1;
    }
    // The turn, its rail, and its kind.
    const turning = Math.abs(blend.turn);
    if (turning > R.railFrom || fresh) this.rail = blend.turn >= 0 ? 1 : 0;
    const away = this.rail === 1 ? this.side : 1 - this.side;
    const back = ramp(blend.back, R.backFrom, R.backFull);
    let redirect = this.faceSeen ? away : back;
    // A bottom turn carried on round on its rail (the climb, the weight going back) stays one until the turn lets go.
    if (this.weights.turn < 0.05) this.bottomRail = -1;
    else if (this.weights.turn > 0.5 && redirect < 0.5) this.bottomRail = this.rail;
    if (this.bottomRail === this.rail) redirect = 0;
    const low = ramp(blend.depth, R.lowFrom, R.lowFull);
    // The tube: the pelvis past Compress's full depth.
    const tube = ramp(STANDING_PELVIS - pelvisOverDeck(state), R.tubeFrom, R.tubeFull);
    // The kick-out: climbing straight up, nose up, the weight back, slowing; out as the nose comes down.
    if (fresh) {
      this.slowing = 0;
      this.kicking = false;
    } else this.slowing += ((this.lastSpeed - state.speed) / dt - this.slowing) * (1 - Math.exp(-dt / R.slowingTime));
    this.lastSpeed = state.speed;
    if (this.kicking) this.kicking = pitch > R.kickOutPitch;
    else this.kicking = blend.back > R.kickBack && state.climb > R.kickClimb && pitch > R.kickPitch && this.slowing > R.kickSlowing && steady;
    // Landing (upright, not yet standing) the stance's side and drop only: the turns, the tube and the kick-out stand.
    const standing = state.phase === 'standing';
    const w = this.weights;
    const s = this.swings;
    w.backside = s.side.step(this.side, dt, fresh, R.sideSwing);
    w.drop = s.drop.step(drop, dt, fresh, R.dropEase);
    w.turn = s.turn.step(standing ? ramp(turning, R.turnFrom, R.turnFull) : 0, dt, fresh, R.turnIn, R.turnOut);
    w.rail = s.rail.step(this.rail, dt, fresh, R.railSwing);
    w.redirect = s.redirect.step(redirect, dt, fresh, R.kindSwing);
    w.cutback = s.cutback.step(low, dt, fresh, R.kindSwing);
    w.tube = s.tube.step(standing ? tube : 0, dt, fresh, R.tubeEase);
    w.kickOut = s.kickOut.step(standing && this.kicking ? 1 : 0, dt, fresh, R.kickIn, R.kickOff);
    // The pop-up's landing, settling once standing (none for a rider read fresh standing: it never landed).
    w.landing = s.landing.step(standing ? 0 : 1, dt, fresh, 1e-6, TAKE_OFF.settle);
    return w;
  }
}

/** A hand's reaches along the board (`WATER_READING.strokeTurn`): counted at each farthest-forward place, once come back from it. */
class StrokeCounter {
  private armed = true;
  private extreme = Number.NaN;

  reset(): void {
    this.armed = true;
    this.extreme = Number.NaN;
  }

  /** Takes the hand's place along the board, m; true at a reach. */
  step(along: number): boolean {
    const turn = WATER_READING.strokeTurn;
    if (!Number.isFinite(this.extreme)) {
      this.extreme = along;
      return false;
    }
    if (this.armed) {
      this.extreme = Math.max(this.extreme, along);
      if (along < this.extreme - turn) {
        this.armed = false;
        this.extreme = along;
        return true;
      }
    } else {
      this.extreme = Math.min(this.extreme, along);
      if (along > this.extreme + turn) {
        this.armed = true;
        this.extreme = along;
      }
    }
    return false;
  }
}

/**
 * The water stages' reader (the plan's §6, phase 3): how far the prone rider is
 * into the lineup sit, the catch and its cobra, and the paddler's look-up, from
 * the drawn state only. Each weight swings no faster than its rate, the sit and
 * the catch switching with hysteresis. Read prone; through the push the weights
 * are held (the push's pose takes over from them); any other phase lets them
 * go. A clock standing still keeps them; a fresh read takes them as they are.
 */
export class WaterStages {
  readonly weights: WaterWeights = { sit: 0, catch: 0, cobra: 0, scan: 0 };
  /** How long the sit's idle has held, s, and whether it sits (its hysteresis); when the sit began (its scan's clock). */
  private idleFor = 0;
  private sitting = false;
  sitSince = Number.NaN;
  private catching = false;
  private heldAt = Number.NaN;
  /** Strokes counted since the last look-up, and when the last began. */
  private strokes = 0;
  private scanAt = Number.NaN;
  private readonly counters = [new StrokeCounter(), new StrokeCounter()];
  private clock = Number.NaN;
  private readonly swings = { sit: new Swing(), catch: new Swing(), cobra: new Swing() };
  private readonly inverse = new Quaternion();
  private readonly local = new Vector3();
  private readonly nose = new Vector3();

  reset(): void {
    this.clock = Number.NaN;
  }

  /** The time into the sit, s (its scan's clock), or none. */
  sitTime(clock: number): number {
    return Number.isFinite(this.sitSince) ? clock - this.sitSince : 0;
  }

  update(state: RiderVisualState): WaterWeights {
    const R = WATER_READING;
    const w = this.weights;
    const dt = state.clock - this.clock;
    if (dt === 0) return w;
    const fresh = !(dt > 0 && dt < 0.25);
    this.clock = state.clock;
    // Pushing, the catch and the look-up hold (the push's pose takes over from them); a sit stands up from sitting.
    if (state.phase === 'push' && !fresh) {
      w.sit = this.swings.sit.step(0, dt, false, R.sitIn, R.sitOut);
      this.sitting = false;
      this.idleFor = 0;
      return w;
    }
    const prone = state.phase === 'prone';
    const stroking = prone && state.stroking > 0;
    // Ducking: the press, or the two-body dive's whole (its press let go, the body still under, duck-drawn).
    const ducking = state.duck > 0 || state.swim.ducking;
    // The board's nose-down pitch, °.
    this.nose.set(0, 0, 1).applyQuaternion(state.boardQuaternion);
    const noseDown = -Math.asin(Math.max(-1, Math.min(1, this.nose.y))) / DEG;
    // The hands at rest beside the chest, on the rails (the physics' own rest), in the board shape's frame.
    this.inverse.copy(state.boardQuaternion).invert();
    const shape = (index: number) => this.local.copy(state.points[index]).sub(state.boardPosition).applyQuaternion(this.inverse).add(BOARD_CENTRE);
    const chest = shape(POINT.torso).z;
    const resting = [POINT.leftHand, POINT.rightHand].every((index, i) => {
      const hand = shape(index);
      const outward = i === 0 ? 1 : -1;
      return Math.hypot(hand.x - outward * (railHalfWidth(chest) + 0.02), hand.y - (deckAt(chest) + 0.02), hand.z - chest) < R.handRest;
    });
    // The sit: idle long enough sits; any stroke, sweep, duck or speed lies down.
    const idle = prone && !stroking && !ducking && resting && state.speed < R.sitSlow;
    if (fresh) {
      this.idleFor = 0;
      this.sitting = false;
      this.strokes = 0;
      this.scanAt = Number.NaN;
      this.counters.forEach((counter) => counter.reset());
    } else this.idleFor = idle ? this.idleFor + dt : 0;
    if (this.sitting) this.sitting = prone && !stroking && !ducking && resting && state.speed <= R.sitFast;
    else if (this.idleFor >= R.sitAfter) {
      this.sitting = true;
      this.sitSince = state.clock;
    }
    // The catch: stroking onto a wave (the cue, or speed down a nose-down board); let go once neither has held a while.
    const onWave = state.cue || (state.speed > R.catchSpeed && noseDown > R.catchPitch);
    if (prone && onWave) this.heldAt = state.clock;
    if (this.catching) this.catching = prone && state.clock - this.heldAt <= R.catchHold;
    else this.catching = stroking && onWave;
    // The look-up: strokes counted at each hand's reach, a look every so many.
    if (stroking && !fresh) {
      const reaches = [POINT.leftHand, POINT.rightHand].filter((index, i) => this.counters[i].step(shape(index).z - chest)).length;
      this.strokes += reaches;
      if (this.strokes >= R.scanEvery) {
        this.strokes = 0;
        this.scanAt = state.clock;
      }
    } else if (!stroking) this.counters.forEach((counter) => counter.reset());
    const since = state.clock - this.scanAt;
    const look = since >= 0 && since < R.scanTime ? ease(Math.min(since, R.scanTime - since) / R.scanRise) : 0;
    const s = this.swings;
    w.sit = s.sit.step(this.sitting ? 1 : 0, dt, fresh, R.sitIn, R.sitOut);
    w.catch = s.catch.step(this.catching ? 1 : 0, dt, fresh, R.catchIn, R.catchOut);
    w.cobra = s.cobra.step(ramp(noseDown, R.cobraFrom, R.cobraFull), dt, fresh, R.catchIn);
    w.scan = prone ? look * (1 - w.catch) * (1 - w.sit) : 0;
    return w;
  }
}
