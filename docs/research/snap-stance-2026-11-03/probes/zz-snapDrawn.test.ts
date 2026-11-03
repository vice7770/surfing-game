import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe } from '../dev/ridingPoses';
import { StageBlend } from '../scene/rig/stageBlend';
import { stanceBlend } from '../scene/rig/stanceBlend';

it('drawn snap stages', () => {
  const lines: string[] = ['recipe\tt\tdepth\tback\tturn\tredirect\tcutback\tkickOut\tturnW\tweight\tyawRate'];
  for (const [name, steer, snap] of [['snap', -1, 1], ['snap-backside', 1, 1], ['S-steer', -1, 0]] as const) {
    const recipe = { ...STANCE_RECIPES['kick-out'], speed: 7, controls: snap ? [{ at: 0.3, steer, snap: 1 }, { at: 0.9, steer, snap: 0 }] : [{ at: 0.3, steer, trim: -1 }, { at: 0.9, steer, trim: 0 }], seconds: 1.8 };
    const stages = new StageBlend();
    drawnRecipe(recipe, 'regular', new Vector3(0, 0.03, 0), (state) => {
      if (state.phase !== 'standing') return;
      const blend = stanceBlend(state);
      const w = stages.update(state, blend);
      if (Math.round(state.clock * 60) % 6 === 0) lines.push([name, state.clock.toFixed(2), blend.depth.toFixed(2), blend.back.toFixed(2), blend.turn.toFixed(2), w.redirect.toFixed(2), w.cutback.toFixed(2), w.kickOut.toFixed(2), w.turn.toFixed(2), state.weight.toFixed(2), state.yawRate.toFixed(2)].join('\t'));
    });
  }
  writeFileSync(process.env.OUT ?? '/dev/null', lines.join('\n'));
});
