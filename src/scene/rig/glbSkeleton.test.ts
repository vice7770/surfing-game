import { readFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { readGlbSkeleton } from './glbSkeleton';
import { BONES, REQUIRED_BONES } from './humanoidBones';
import { HumanoidRig } from './HumanoidRig';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState } from './riderVisualState';

const SURFERS: { id: string; height: number }[] = JSON.parse(readFileSync('public/assets/surfers/surfers.json', 'utf8')).surfers;
const glb = (id: string) => {
  const bytes = readFileSync(`public/assets/surfers/${id}.glb`);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

describe('the surfers’ skeletons, read in node', () => {
  it.each(SURFERS.map((surfer) => [surfer.id, surfer.height] as const))('%s has the rig’s bones and stands its %f m', (id, height) => {
    const { root, bones } = readGlbSkeleton(glb(id));
    for (const name of REQUIRED_BONES) expect(bones.has(name), name).toBe(true);
    root.updateMatrixWorld(true);
    const head = bones.get(BONES.head)!.getWorldPosition(new Vector3());
    expect(head.y / height).toBeGreaterThan(0.85);
    expect(head.y / height).toBeLessThan(0.95);
    for (const side of ['left', 'right'] as const) expect(bones.get(BONES.foot[side])!.getWorldPosition(new Vector3()).y).toBeLessThan(0.15);
  });

  it('is the skeleton the rig stands on the board', () => {
    const { root, bones } = readGlbSkeleton(glb('surfer1'));
    const rig = new HumanoidRig(bones);
    const state = posturePoints('standing', 'regular', new Vector3(0, 0.03, 0), new Quaternion(), createRiderVisualState());
    rig.solve(state);
    root.updateMatrixWorld(true);
    for (const [side, point] of [['left', POINT.leftFoot], ['right', POINT.rightFoot]] as const) {
      const foot = state.points[point];
      expect(Math.abs(rig.joints.ankle[side].y - foot.y - rig.soleHeight)).toBeLessThan(0.01);
      expect(bones.get(BONES.foot[side])!.getWorldPosition(new Vector3()).distanceTo(rig.joints.ankle[side])).toBeLessThan(0.01);
    }
  });
});
