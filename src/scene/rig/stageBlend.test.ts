import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import { StageBlend, STAGE_READING } from './stageBlend';
import { stanceBlend } from './stanceBlend';
import { STAGE_POSES, blendPose, createStandingPose, stagePose } from './stagePoses';

/** The stages read through a recipe as the game draws it, frame by frame: each frame's weights. */
function read(recipe: StanceRecipe, side: 'regular' | 'goofy'): { backside: number; drop: number; clock: number }[] {
  const stages = new StageBlend();
  const out: { backside: number; drop: number; clock: number }[] = [];
  drawnRecipe(recipe, side, new Vector3(0, 0.03, 0), (state) => {
    if (state.phase !== 'standing') return;
    const weights = stages.update(state, stanceBlend(state));
    out.push({ ...weights, clock: state.clock });
  });
  return out;
}

describe('the stage reader (the animation-realism plan, §3.3)', () => {
  it.each(['regular', 'goofy'] as const)('reads the face\'s side in trim: frontside across a toes-side face, backside across a heels-side one (%s)', (side) => {
    expect(read(STANCE_RECIPES['trim-frontside'], side).at(-1)!.backside).toBeLessThan(0.05);
    expect(read(STANCE_RECIPES['trim-backside'], side).at(-1)!.backside).toBeGreaterThan(0.95);
  });

  it('keeps the last side on flat water, and reads no drop there', () => {
    const flat = read(STANCE_RECIPES.trim, 'regular');
    for (const weights of flat) {
      expect(weights.backside).toBe(0);
      expect(weights.drop).toBe(0);
    }
  });

  it('reads the drop going down the face', () => {
    expect(read(STANCE_RECIPES.drop, 'regular').at(-1)!.drop).toBeGreaterThan(0.95);
  });

  it('swings the side no faster than its rate: no pose flickers', () => {
    // Across a heels-side face from a frontside start: the side swings over `sideSwing`, eased.
    const frames = read(STANCE_RECIPES['trim-backside'], 'regular');
    for (let i = 1; i < frames.length; i += 1) {
      const dt = frames[i].clock - frames[i - 1].clock;
      // The ease's steepest is 1.5× the linear rate.
      expect(Math.abs(frames[i].backside - frames[i - 1].backside)).toBeLessThanOrEqual((1.5 * dt) / STAGE_READING.sideSwing + 1e-9);
    }
  });
});

describe('the key poses (the animation-realism plan, §3.1)', () => {
  it('blends one pose into another number by number', () => {
    const half = blendPose(STAGE_POSES.trimFrontside, STAGE_POSES.trimBackside, 0.5, createStandingPose());
    expect(half.chest).toBeCloseTo((STAGE_POSES.trimFrontside.chest + STAGE_POSES.trimBackside.chest) / 2, 9);
    expect(half.hands.trail.toes).toBeCloseTo((STAGE_POSES.trimFrontside.hands.trail.toes + STAGE_POSES.trimBackside.hands.trail.toes) / 2, 9);
  });

  it('stands trim frontside and backside on the same legs, with the backside chest open toward the wave', () => {
    const front = stagePose({ backside: 0, drop: 0 }, createStandingPose());
    const back = stagePose({ backside: 1, drop: 0 }, createStandingPose());
    expect(back.foot).toEqual(front.foot);
    expect(back.kneeTall).toBe(front.kneeTall);
    expect(back.chest).toBeGreaterThanOrEqual(45);
    expect(back.chest).toBeLessThanOrEqual(70);
    expect(front.chest).toBeGreaterThanOrEqual(20);
    expect(front.chest).toBeLessThanOrEqual(40);
  });

  it('holds the feet to the owner\'s call: about 60° front and 80° back riding (§10.3)', () => {
    for (const pose of Object.values(STAGE_POSES)) {
      expect(pose.foot.front).toBe(60);
      expect(pose.foot.rear).toBe(80);
    }
  });
});
