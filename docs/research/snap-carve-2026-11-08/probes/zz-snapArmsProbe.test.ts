import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import { createTestHumanoid } from './testHumanoid';
import { PosedBody } from './posedBody';
import { StanceGauge } from './stanceGauge';
import { RIG_SWITCHES } from './HumanoidRig';
import { stanceBlend, weightBack } from './stanceBlend';

const DEG = 180 / Math.PI;
it('probe', () => {
  const base = STANCE_RECIPES.trim;
  const cases: Record<string, StanceRecipe> = {
    'flat snap L': { ...base, steady: false, controls: [{ at: 0.3, snap: 1, steer: -1 }], seconds: 1.3 },
    'flat snap R': { ...base, steady: false, controls: [{ at: 0.3, snap: 1, steer: 1 }], seconds: 1.3 },
    'across snap +': { ...base, water: 'across', speed: 7, steady: false, controls: [{ at: 0.3, snap: 1, steer: 1 }], seconds: 1.3 },
    'across snap -': { ...base, water: 'across', speed: 7, steady: false, controls: [{ at: 0.3, snap: 1, steer: -1 }], seconds: 1.3 },
    'across late +': { ...base, water: 'across', speed: 8, steady: false, controls: [{ at: 0.8, snap: 1, steer: 1 }], seconds: 1.8 },
    'across late -': { ...base, water: 'across', speed: 8, steady: false, controls: [{ at: 0.8, snap: 1, steer: -1 }], seconds: 1.8 },
    'flat compress L': { ...base, steady: false, controls: [{ at: 0.3, compress: 1, crouch: 0.6, steer: -1 }], seconds: 1.3 },
  };
  const lines: string[] = [];
  for (const deep of [false, true]) for (const arms of [undefined, 'old'] as const) for (const stance of ['regular', 'goofy'] as const) for (const [name, recipe] of Object.entries(cases)) {
    RIG_SWITCHES.snapArms = arms; (globalThis as { SNAP_DEPTH?: string }).SNAP_DEPTH = deep ? 'deep' : undefined;
    const { bones } = createTestHumanoid();
    const body = new PosedBody(bones);
    const gauge = new StanceGauge(bones);
    drawnRecipe(recipe, stance, new Vector3(0, 0.03, 0), (state) => {
      body.update(state);
      if (state.phase !== 'standing') return;
      const after = state.clock - recipe.controls[0].at;
      if (![0.2, 0.4, 0.6, 0.9].some((s) => Math.abs(after - s) < 1e-6)) return;
      const m = gauge.measure(state, stance);
      const j = gauge.joints();
      const front = stance === 'regular' ? 'left' : 'right'; const rear = front === 'left' ? 'right' : 'left';
      const nose = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0).normalize();
      const yaw = (v: Vector3) => Math.atan2(v.x, v.z);
      const rel = (v: Vector3) => { let d = (yaw(v) - yaw(nose)) * DEG; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
      const leadV = j.wrist[front].clone().sub(j.shoulder[front]);
      const trailV = j.wrist[rear].clone().sub(j.shoulder[rear]);
      const b = stanceBlend(state);
      lines.push([deep ? 'deep' : 'dflt', arms ?? 'new', stance, name, after.toFixed(1), `yawRate ${(state.yawRate * DEG).toFixed(0)}`, `twist ${(state.twist * DEG).toFixed(0)}`, `back ${weightBack(state).toFixed(2)} depth ${b.depth.toFixed(2)}`,
        `lead hd ${rel(leadV).toFixed(0)} up ${(leadV.y / leadV.length()).toFixed(2)} arm ${m.leadArm.toFixed(0)} el ${m.leadElbow.toFixed(0)}`,
        `trail hd ${rel(trailV).toFixed(0)} up ${(trailV.y / trailV.length()).toFixed(2)} arm ${m.trailArm.toFixed(0)} el ${m.trailElbow.toFixed(0)}`,
        `lowHand ${m.lowHand.toFixed(2)} redirect ${body.rig.stageWeights.redirect.toFixed(2)} tube ${body.rig.stageWeights.tube.toFixed(2)} knees ${m.kneeFront.toFixed(0)}/${m.kneeRear.toFixed(0)}`].join(' | '));
    });
  }
  RIG_SWITCHES.snapArms = undefined;
  writeFileSync(process.env.OUT ?? '/dev/null', lines.join('\n'));
});
