import { readFileSync, writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../dev/ridingPoses';
import { readGlbSkeleton } from '../scene/rig/glbSkeleton';
import { PosedBody } from '../scene/rig/posedBody';
import { StanceGauge } from '../scene/rig/stanceGauge';

const bones = () => {
  const bytes = readFileSync('public/assets/surfers/surfer1.glb');
  return readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).bones;
};
const yawOf = (q: { x: number; y: number; z: number; w: number }) => { const f = new Vector3(0, 0, 1).applyQuaternion(q as never); return Math.atan2(f.x, f.z); };

it('loading and leading, drawn', () => {
  const lines: string[] = ['recipe\tt\tpelvisDrop\tkneeF\tkneeR\thipR\ttrunkPitch\tchestTw\thipTw\theadYaw\tleadArm\ttrailArm\tweight\tboardYaw\tyawRate'];
  const base = STANCE_RECIPES.trim;
  const cases: Record<string, StanceRecipe> = {
    stand: { ...base, steady: false, controls: [], seconds: 1.2 },
    crouch: { ...base, steady: false, controls: [{ at: 0.3, crouch: 1 }], seconds: 1.2 },
    compress: { ...base, steady: false, controls: [{ at: 0.3, compress: 1 }], seconds: 1.2 },
    snap: { ...base, steady: false, controls: [{ at: 0.3, snap: 1 }], seconds: 1.2 },
    'snap+steer': { ...base, steady: false, controls: [{ at: 0.3, snap: 1, steer: -1 }], seconds: 1.2 },
    'compress+steer': { ...base, steady: false, controls: [{ at: 0.3, compress: 1, crouch: 0.6, steer: -1 }], seconds: 1.2 },
  };
  for (const [name, recipe] of Object.entries(cases)) {
    const b = bones();
    const body = new PosedBody(b);
    const gauge = new StanceGauge(b);
    let standingPelvis = Number.NaN;
    drawnRecipe(recipe, 'regular', new Vector3(0, 0.03, 0), (state) => {
      body.update(state);
      const tick = Math.round(state.clock * 60);
      if (state.phase !== 'standing' || tick % 6 !== 0) return;
      const m = gauge.measure(state, 'regular');
      const up = new Vector3(0, 1, 0).applyQuaternion(state.boardQuaternion);
      const pelvis = state.points[0].clone().sub(state.boardPosition).dot(up);
      if (Number.isNaN(standingPelvis)) standingPelvis = pelvis;
      lines.push([name, state.clock.toFixed(2), (standingPelvis - pelvis).toFixed(3), m.kneeFront.toFixed(0), m.kneeRear.toFixed(0), m.hipRear.toFixed(0), m.trunkPitch.toFixed(0), m.chestTwist.toFixed(0), m.hipTwist.toFixed(0), m.headYaw.toFixed(0), m.leadArm.toFixed(0), m.trailArm.toFixed(0), (state.weight ?? NaN).toFixed(2), ((yawOf(state.boardQuaternion) * 180) / Math.PI).toFixed(0), state.yawRate.toFixed(2)].join('\t'));
    });
  }
  writeFileSync(process.env.OUT ?? '/dev/null', lines.join('\n'));
});
