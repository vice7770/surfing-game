import { Quaternion, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe } from '../../dev/ridingPoses';
import type { StanceName } from '../../physics/riderPosture';
import { PosedBody } from './posedBody';
import { POINT, type RiderVisualState } from './riderVisualState';
import { RIG_SWITCHES } from './stanceBlend';
import { StanceGauge } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

/**
 * **Step 3.5h, the drawing's half, measured at the SKINNED pose** (rows 1 and 2 of
 * `docs/research/new-rider/3.5/engine-target.md`; `RIG_SWITCHES.trunk`).
 *
 * The probe in `docs/research/new-rider/3.5/trunk.ts` measures the physics: `AttachedRider.parts`, and the points the
 * rig is handed. **Neither of those is the drawn body** — they stop upstream of the bones — and these two rows are
 * exactly about the drawn and the physical trunk disagreeing, so the drawn side has to be read off the skeleton. That
 * is what this file does: `createTestHumanoid` + `PosedBody` run the real rig, and `StanceGauge.joints()` reads the
 * posed bones' world positions.
 *
 * The physics is not involved. One standing state is taken from the default rider, and a second is made from it by
 * folding **only** its torso and head points about its pelvis - which is what `trunk: 'mass'` makes the physics do.
 * The question asked of the rig is the only one it owns: **given a folded trunk in the points it is handed, does the
 * drawn body follow it, and who moves the pelvis?**
 *
 * No footage angle appears here. After thirteen clips the video series has **no gated measurement of trunk angular
 * travel** - every folded-trunk angle in it is an image-plane reading that has never passed its own admissibility
 * gate - so the fold angles below are chosen to span the rotor's own range (`hipRange`, up to 1.2 rad) and the bounds
 * are read off this test's own output, not off a clip.
 */
const DEG = 180 / Math.PI;
/** Fold angles to hand the rig, rad: nothing, a quarter of the rotor's tall range, and half of it. */
const FOLDS = [0, 0.3, 0.6] as const;
const STANCES: readonly StanceName[] = ['regular', 'goofy'];

interface Read {
  /** The skinned trunk from the world's vertical, °: the posed spine-to-neck line. */
  tilt: number;
  /** The skinned trunk's own pitch toward the nose, °, which is the channel the fold is in. */
  pitch: number;
  /** The posed hips, in the board's frame, m: who moved the pelvis. */
  hips: Vector3;
}

/** One standing state from the default rider, captured at the end of a trim. */
function standingState(stance: StanceName): RiderVisualState {
  return drawnRecipe(STANCE_RECIPES.trim, stance, new Vector3(0, 0.03, 0), () => {}).state;
}

/**
 * `state` with its torso and head folded by `fold` rad about its pelvis, on the axis the physics folds on: the board
 * frame's x, which is `AttachedRider.across` while the body stands square to the deck (upright, `orientation` is
 * `bodyFrame`). Nothing else is touched - not the pelvis, not the feet, not the hands.
 */
function folded(state: RiderVisualState, fold: number): RiderVisualState {
  if (fold === 0) return state;
  const axis = new Vector3(1, 0, 0).applyQuaternion(state.boardQuaternion);
  const pelvis = state.points[POINT.pelvis];
  for (const i of [POINT.torso, POINT.head]) {
    const point = state.points[i] as Vector3;
    point.sub(pelvis).applyAxisAngle(axis, fold).add(pelvis);
  }
  return state;
}

/** The skinned body the rig draws from `state`, with `trunk` set or not. */
function drawn(stance: StanceName, fold: number, trunk: 'mass' | undefined): Read {
  RIG_SWITCHES.trunk = trunk;
  try {
    const state = folded(standingState(stance), fold);
    const { bones } = createTestHumanoid();
    const body = new PosedBody(bones);
    const gauge = new StanceGauge(bones);
    body.update(state);
    const j = gauge.joints();
    const trunkLine = j.neck.clone().sub(j.spine);
    const nose = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0).normalize();
    const inverse = new Quaternion().copy(state.boardQuaternion).invert();
    return {
      tilt: Math.acos(Math.max(-1, Math.min(1, trunkLine.y / trunkLine.length()))) * DEG,
      pitch: Math.atan2(trunkLine.dot(nose), trunkLine.y) * DEG,
      hips: j.hips.clone().sub(state.boardPosition).applyQuaternion(inverse),
    };
  } finally {
    RIG_SWITCHES.trunk = undefined;
  }
}

afterEach(() => {
  expect(RIG_SWITCHES).toEqual({ trunk: undefined });
});

describe('the trunk\'s one state, drawn (`RIG_SWITCHES.trunk`)', () => {
  it('leaves the drawn body untouched with the switch off and an unfolded trunk, which is the default path', () => {
    for (const stance of STANCES) {
      const off = drawn(stance, 0, undefined);
      const again = drawn(stance, 0, undefined);
      expect(again.tilt).toBeCloseTo(off.tilt, 9);
      expect(again.pitch).toBeCloseTo(off.pitch, 9);
      expect(again.hips.distanceTo(off.hips)).toBeLessThan(1e-9);
      // The default rider's points carry no fold at all, so the drawn trunk is the rig's own hinge and it is real.
      expect(off.tilt).toBeGreaterThan(5);
    }
  });

  it('follows a folded trunk in the points it is handed, and by more with the switch on than without it', () => {
    for (const stance of STANCES) {
      const flat = drawn(stance, 0, 'mass');
      for (const fold of FOLDS.filter((x) => x > 0)) {
        const on = drawn(stance, fold, 'mass');
        // The rig draws the fold: the skinned trunk pitches toward the nose with it, monotonically.
        expect(on.pitch - flat.pitch).toBeGreaterThan(0.3 * fold * DEG);
        expect(on.pitch - flat.pitch).toBeLessThan(1.2 * fold * DEG);
      }
      // Monotone in the fold.
      const pitches = FOLDS.map((fold) => drawn(stance, fold, 'mass').pitch);
      expect(pitches[1]).toBeGreaterThan(pitches[0]);
      expect(pitches[2]).toBeGreaterThan(pitches[1]);
    }
  });

  it('adds no hinge of its own standing, so the drawn trunk is the folded one and nothing else', () => {
    for (const stance of STANCES) {
      // With the switch on and no fold in the points, the trunk stands as the physics put it: no pose-table hinge.
      const on = drawn(stance, 0, 'mass');
      const off = drawn(stance, 0, undefined);
      expect(on.tilt).toBeLessThan(off.tilt);
    }
  });

  it('takes the rig\'s own pelvis shift off the drawn body, so the pelvis has one owner', () => {
    for (const stance of STANCES) {
      const onFlat = drawn(stance, 0, 'mass');
      const offFlat = drawn(stance, 0, undefined);
      // The whole of what the rig's own hinge does to the drawn pelvis - `poseHinge`'s `backForMass`, and the
      // drop-to-reach the shifted hips then need - measured at the skinned hips on a plain trim: **0.0729 m**, and
      // the switch takes all of it away. That is the second owner this change removes; the physics' own correction
      // (the drawn pelvis moving back as `localCenter` moves) is the one that remains.
      expect(offFlat.hips.distanceTo(onFlat.hips)).toBeGreaterThan(0.05);
    }
  });

  it('pins the ONE coupling found while building this: the drawn hips ride the body\'s up as it tilts', () => {
    for (const stance of STANCES) {
      const fold = 0.9;
      const onMoved = drawn(stance, fold, 'mass').hips.distanceTo(drawn(stance, 0, 'mass').hips);
      const offMoved = drawn(stance, fold, undefined).hips.distanceTo(drawn(stance, 0, undefined).hips);
      /**
       * **A finding, pinned rather than fixed.** `HumanoidRig` builds `this.up` as `points[torso] − points[pelvis]`
       * (`:905–907`) and uses it for two different things: the trunk's own direction, and the axis the drawn hips are
       * lifted along above the physics' pelvis (`standingLift`). Once the physics folds the trunk those two stop
       * being the same vector, so the drawn hips travel about **55 mm per radian** of fold - **0.0530 m at 0.9 rad**.
       *
       * It is **not introduced by standing the rig's hinge down**: with the switch off and the same folded points it
       * is 0.0499 m, within 3 mm. It arrives with the physics folding the points at all, which is row 1 itself. It
       * has **one owner** and so is not the double-pelvis hazard; what the drawn hips' lift axis ought to be once the
       * trunk is a channel of its own is a rig question the owner's eye settles, and it is left for them.
       */
      expect(onMoved).toBeLessThan(0.07);
      expect(Math.abs(onMoved - offMoved)).toBeLessThan(0.005);
    }
  });
});
