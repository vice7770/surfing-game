// Snap round 2: the drawn body loading and leading (not part of the suite). OUT=<file.tsv>.
import { readFileSync, writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../dev/ridingPoses';
import { readGlbSkeleton } from '../scene/rig/glbSkeleton';
import { PosedBody } from '../scene/rig/posedBody';
import { StanceGauge } from '../scene/rig/stanceGauge';
import { stanceBlend } from '../scene/rig/stanceBlend';

const bones = () => {
  const bytes = readFileSync('public/assets/surfers/surfer1.glb');
  return readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).bones;
};
const yawOf = (q: { x: number; y: number; z: number; w: number }) => { const f = new Vector3(0, 0, 1).applyQuaternion(q as never); return Math.atan2(f.x, f.z); };
const SAMPLES = [0.15, 0.3, 0.5, 0.7, 0.9];

it('loading and leading, drawn', () => {
  const lines: string[] = ['recipe\tafter\tdepth(blend)\tback(blend)\tpelvisOverBackFoot\tdropWorld\thipsOver\tkneeF\tkneeR\thipR\ttrunkPitch\tlean\tchestTw\thipTw\theadYaw\tleadArm\ttrailArm\tweight\tturn\tredirect\tkickOut\tboardYaw\tpitch'];
  const base = STANCE_RECIPES.trim;
  const AT = 0.3;
  const cases: Record<string, StanceRecipe> = {
    stand: { ...base, steady: false, controls: [], seconds: 1.3 },
    crouch: { ...base, steady: false, controls: [{ at: AT, crouch: 1 }], seconds: 1.3 },
    compress: { ...base, steady: false, controls: [{ at: AT, compress: 1 }], seconds: 1.3 },
    snap: { ...base, steady: false, controls: [{ at: AT, snap: 1 }], seconds: 1.3 },
    'snap+steer': { ...base, steady: false, controls: [{ at: AT, snap: 1, steer: -1 }], seconds: 1.3 },
    'compress+steer': { ...base, steady: false, controls: [{ at: AT, compress: 1, crouch: 0.6, steer: -1 }], seconds: 1.3 },
  };
  for (const [name, recipe] of Object.entries(cases)) {
    const b = bones();
    const body = new PosedBody(b);
    const gauge = new StanceGauge(b);
    let standing = Number.NaN;
    let yaw0 = Number.NaN;
    drawnRecipe(recipe, 'regular', new Vector3(0, 0.03, 0), (state) => {
      body.update(state);
      if (state.phase !== 'standing') return;
      const back = state.points[6];
      const height = state.points[0].y - back.y;
      if (Number.isNaN(standing)) { standing = height; yaw0 = yawOf(state.boardQuaternion); }
      const after = state.clock - AT;
      if (!SAMPLES.some((s) => Math.abs(after - s) < 1e-6)) return;
      const m = gauge.measure(state, 'regular');
      const blend = stanceBlend(state);
      const forward = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0).normalize();
      const over = state.points[0].clone().sub(back).dot(forward);
      const pitch = Math.asin(new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).y) * 180 / Math.PI;
      const w = body.rig.stageWeights;
      lines.push([name, after.toFixed(2), blend.depth.toFixed(2), blend.back.toFixed(2), over.toFixed(2), (standing - height).toFixed(3), m.hipsOver.toFixed(2), m.kneeFront.toFixed(0), m.kneeRear.toFixed(0), m.hipRear.toFixed(0), m.trunkPitch.toFixed(0), m.lean.toFixed(0), m.chestTwist.toFixed(0), m.hipTwist.toFixed(0), m.headYaw.toFixed(0), m.leadArm.toFixed(0), m.trailArm.toFixed(0), (state.weight ?? NaN).toFixed(2), w.turn.toFixed(2), w.redirect.toFixed(2), w.kickOut.toFixed(2), (((yawOf(state.boardQuaternion) - yaw0) * 180) / Math.PI).toFixed(0), pitch.toFixed(0)].join('\t'));
    });
  }
  writeFileSync(process.env.OUT ?? '/dev/null', lines.join('\n'));
});
