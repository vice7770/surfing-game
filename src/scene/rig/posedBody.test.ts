import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BONES } from './humanoidBones';
import { HumanoidRig } from './HumanoidRig';
import { PosedBody } from './posedBody';
import { posturePoints } from './posturePoints';
import { createRiderVisualState } from './riderVisualState';
import { createTestHumanoid } from './testHumanoid';

describe('the posed body', () => {
  it('draws a new pose at once after a reset, even at the same clock (the surfer sheet’s tiles)', () => {
    const { bones } = createTestHumanoid();
    const body = new PosedBody(bones);
    const standing = posturePoints('standing', 'regular', new Vector3(), new Quaternion(), createRiderVisualState());
    body.update(standing);
    // Another tile: another pose, the clock unchanged. Without a reset the layers read a clock standing still.
    const prone = () => posturePoints('prone', 'regular', new Vector3(), new Quaternion(), createRiderVisualState());
    body.reset();
    body.update(prone());
    const plain = createTestHumanoid();
    new HumanoidRig(plain.bones).solve(prone());
    for (const name of [BONES.hips, BONES.leg.left, BONES.foreArm.right, BONES.head]) {
      const drawn = bones.get(name)!.getWorldPosition(new Vector3());
      expect(drawn.distanceTo(plain.bones.get(name)!.getWorldPosition(new Vector3())), name).toBeLessThan(1e-6);
    }
  });
});
