/**
 * **Frozen evidence for `trunk-drawn.md` §3.** Measurement only; it changes nothing.
 *
 * The drawn trunk with and without `RIG_SWITCHES.trunk === 'mass'`, over every standing stance recipe, with the
 * switch as the ONLY difference between the two arms. It drives the rig exactly as `src/scene/rig/trunkMass.test.ts`
 * does — `createTestHumanoid` + `PosedBody`, then `StanceGauge.joints()` — because the question is about the
 * **skinned** body: `AttachedRider.parts` and the points the rig is handed both stop upstream of the bones.
 *
 * **The angle is derived from the drawn POSITIONS, not from the expression under test.** It never reads `wanted`,
 * `hingeAngle` or `physicsTrunk`; it reads the posed joints' world positions and the board's quaternion. A broken
 * measurement would come back constant, NaN, or unmoved by the pose — the real one spans 24° within the switch-off
 * arm alone.
 *
 * To run it, copy it under `src/scene/rig/` (Vitest excludes `docs/**`) and `npx vitest run` it. It was run that
 * way and then deleted; the numbers it printed are tabulated in `trunk-drawn.md`.
 */
import { writeFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { describe, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe } from '../../dev/ridingPoses';
import type { StanceName } from '../../physics/riderPosture';
import { PosedBody } from './posedBody';
import { POINT, type RiderVisualState } from './riderVisualState';
import { RIG_SWITCHES } from './stanceBlend';
import { StanceGauge } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

const DEG = 180 / Math.PI;

interface Read {
  /** The spine's base to the neck, from the world's vertical, toward the toes (+) or heels, °. */
  spineTilt: number;
  /** The shoulders' midpoint from the hips, the same way, °: the line a picture of the rider shows. */
  shoulderTilt: number;
  /** The same line's unsigned angle from the vertical, °, kept to show what the sign hides. */
  shoulderAbs: number;
  /** The posed hips in the board's frame, m: who moved the pelvis. */
  hips: Vector3;
  phase: string;
}

/**
 * `state` with its torso and head folded by `fold` rad about its pelvis, on the axis the physics folds on — what
 * `trunk: 'mass'` makes the hip rotor do. Nothing else is touched.
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

function drawn(id: string, stance: StanceName, fold: number, trunk: 'mass' | undefined): Read {
  RIG_SWITCHES.trunk = trunk;
  try {
    const state = folded(drawnRecipe(STANCE_RECIPES[id], stance, new Vector3(0, 0.03, 0), () => {}).state, fold);
    const { bones } = createTestHumanoid();
    const body = new PosedBody(bones);
    const gauge = new StanceGauge(bones);
    body.update(state);
    const j = gauge.joints();
    const spine = j.neck.clone().sub(j.spine);
    const line = j.shoulder.left.clone().add(j.shoulder.right).multiplyScalar(0.5).sub(j.hips);
    // Toward the toes, levelled: Regular faces −x in the board's frame, Goofy +x.
    const toes = new Vector3(stance === 'regular' ? -1 : 1, 0, 0).applyQuaternion(state.boardQuaternion).setY(0).normalize();
    const inverse = new Quaternion().copy(state.boardQuaternion).invert();
    return {
      spineTilt: Math.atan2(spine.dot(toes), spine.y) * DEG,
      shoulderTilt: Math.atan2(line.dot(toes), line.y) * DEG,
      shoulderAbs: Math.acos(Math.max(-1, Math.min(1, line.y / line.length()))) * DEG,
      hips: j.hips.clone().sub(state.boardPosition).applyQuaternion(inverse),
      phase: state.phase,
    };
  } finally {
    RIG_SWITCHES.trunk = undefined;
  }
}

/** Every standing recipe in `STANCE_RECIPES`; the prone and landing ones are not the switch's branch. */
const STANDING = [
  'trim', 'trim-frontside', 'trim-backside', 'trim-forward', 'trim-back', 'drop',
  'compress-frontside', 'compress-backside', 'extension-frontside', 'extension-backside',
  'top-turn-frontside', 'top-turn-backside', 'snap-frontside', 'snap-backside',
  'cutback-frontside', 'cutback-backside', 'pump-compression', 'pump-extension',
  'hand-in-face', 'tube-frontside', 'tube-backside', 'kick-out',
];

describe('the drawn trunk with and without `?trunk=mass`', () => {
  it('tabulates every standing pose, both stances, at two folds', () => {
    // Nothing, and the hip rotor's measured live standing range from PR #429 (5.5° = 0.096 rad).
    const out: string[] = [];
    const log = (...parts: unknown[]) => out.push(parts.join(' '));
    for (const fold of [0, 0.096]) {
      log(`\n=== fold handed to the rig: ${(fold * DEG).toFixed(1)}° ===`);
      log('recipe'.padEnd(22), 'st', 'phase'.padEnd(9), 'sgnSpOFF sgnSpON sgnShOFF sgnShON  absOFF   absON    hipsMove');
      for (const id of STANDING) {
        for (const stance of ['regular', 'goofy'] as StanceName[]) {
          const off = drawn(id, stance, fold, undefined);
          const on = drawn(id, stance, fold, 'mass');
          log(
            id.padEnd(22), stance === 'regular' ? 'R ' : 'G ', off.phase.padEnd(9),
            off.spineTilt.toFixed(2).padStart(8), on.spineTilt.toFixed(2).padStart(8),
            off.shoulderTilt.toFixed(2).padStart(8), on.shoulderTilt.toFixed(2).padStart(8),
            off.shoulderAbs.toFixed(2).padStart(8), on.shoulderAbs.toFixed(2).padStart(8),
            off.hips.distanceTo(on.hips).toFixed(4).padStart(8),
          );
        }
      }
    }
    writeFileSync('trunk-drawn.txt', out.join('\n'));
  });
});
