import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import { StageBlend, STAGE_READING } from './stageBlend';
import { stanceBlend } from './stanceBlend';
import { NO_STAGES, STAGE_POSES, blendPose, createStandingPose, stagePose, type StageWeights } from './stagePoses';

type Read = StageWeights & { clock: number };

/** The stages read through a recipe as the game draws it, frame by frame: each frame's weights. */
function read(recipe: StanceRecipe, side: 'regular' | 'goofy'): Read[] {
  const stages = new StageBlend();
  const out: Read[] = [];
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
    const front = stagePose({ ...NO_STAGES }, createStandingPose());
    const back = stagePose({ ...NO_STAGES, backside: 1 }, createStandingPose());
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

// The animation-realism plan's phase 2 (§3.3, §6): a turn's rail is its side (a bottom turn frontside on the toes', a
// redirect frontside on the heels'), its kind read from the weight (and, on a wave, the face); the tube past Compress's
// depth under a curl; the kick-out climbing nose up with the weight back.
describe('the stage reader\'s turns, tube and kick-out (the animation-realism plan, phase 2)', () => {
  const last = (id: string, side: 'regular' | 'goofy') => read(STANCE_RECIPES[id], side).at(-1)!;

  it.each(['regular', 'goofy'] as const)('reads a compressed turn as a bottom turn on its rail, and the weight back as a redirect (%s)', (side) => {
    const front = last('compress-frontside', side);
    expect(front.turn).toBeGreaterThan(0.95);
    expect(front.rail).toBeGreaterThan(0.95);
    expect(front.redirect).toBeLessThan(0.05);
    const back = last('compress-backside', side);
    expect(back.rail).toBeLessThan(0.05);
    expect(back.redirect).toBeLessThan(0.05);
    const top = last('top-turn-frontside', side);
    expect(top.rail).toBeLessThan(0.05);
    expect(top.redirect).toBeGreaterThan(0.95);
    expect(top.cutback).toBeLessThan(0.05);
    const topBack = last('top-turn-backside', side);
    expect(topBack.rail).toBeGreaterThan(0.95);
    expect(topBack.redirect).toBeGreaterThan(0.95);
    // Low, crouched: the cutback.
    expect(last('cutback-frontside', side).cutback).toBeGreaterThan(0.3);
  });

  it('keeps a bottom turn carried on round with the weight going back a bottom turn (the climb), not a redirect', () => {
    // The surfer sheet's bottom turn: Compress on the toes' rail, let go with S at 1.7 s, still turning the same way.
    const recipe: StanceRecipe = {
      ...STANCE_RECIPES['extension-frontside'],
      controls: [{ at: 0, crouch: 0.6 }, { at: 0.4, steer: 1 }, { at: 0.7, compress: 1 }, { at: 1.7, compress: 0, crouch: 0, steer: 0.3, trim: -0.5 }],
      seconds: 2.3,
    };
    for (const frame of read(recipe, 'regular').filter((weights) => weights.clock > 1.2)) expect(frame.redirect, `${frame.clock.toFixed(2)} s`).toBeLessThan(0.05);
  });

  it('reads the tube in the deep tuck under a curl, on the face\'s side, and not in Compress', () => {
    for (const side of ['regular', 'goofy'] as const) {
      expect(last('tube-frontside', side).tube, side).toBeGreaterThan(0.95);
      const pig = last('tube-backside', side);
      expect(pig.tube, side).toBeGreaterThan(0.95);
      expect(pig.backside, side).toBeGreaterThan(0.95);
      expect(Math.max(...read(STANCE_RECIPES['compress-frontside'], side).map((weights) => weights.tube)), side).toBe(0);
    }
  });

  it('reads the kick-out climbing straight up nose high with the weight back, and not in a top turn', () => {
    for (const side of ['regular', 'goofy'] as const) {
      expect(last('kick-out', side).kickOut, side).toBeGreaterThan(0.95);
      expect(Math.max(...read(STANCE_RECIPES['top-turn-frontside'], side).map((weights) => weights.kickOut)), side).toBe(0);
    }
  });

  it('swings every stage no faster than its rate through a weave: no pose flickers', () => {
    const weave: StanceRecipe = { ...STANCE_RECIPES.trim, controls: [{ at: 0.3, trim: -1, steer: 1 }, { at: 1.1, steer: -1 }, { at: 1.9, steer: 1 }], seconds: 2.4 };
    const frames = read(weave, 'regular');
    const fastest = { turn: STAGE_READING.turnIn, rail: STAGE_READING.railSwing, redirect: STAGE_READING.kindSwing, cutback: STAGE_READING.kindSwing } as const;
    for (let i = 1; i < frames.length; i += 1) {
      const dt = frames[i].clock - frames[i - 1].clock;
      for (const [stage, time] of Object.entries(fastest) as [keyof typeof fastest, number][]) {
        expect(Math.abs(frames[i][stage] - frames[i - 1][stage]), `${stage} at ${frames[i].clock.toFixed(2)} s`).toBeLessThanOrEqual((1.5 * dt) / time + 1e-9);
      }
    }
  });
});
