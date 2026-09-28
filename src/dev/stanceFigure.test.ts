import { readFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { readGlbSkeleton } from '../scene/rig/glbSkeleton';
import { StanceGauge, measureJoints } from '../scene/rig/stanceGauge';
import { STANCES } from '../scene/rig/stanceMap';
import { createTestHumanoid } from '../scene/rig/testHumanoid';
import { FIGURE_HONOURS, NEUTRAL_STANCE, figureAngles, figureLengths, figurePlan, referenceJoints } from './stanceFigure';

const surfer = () => {
  const bytes = readFileSync('public/assets/surfers/surfer2.glb');
  return readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).bones;
};

describe('the reference figure', () => {
  it.each([['the test humanoid', () => createTestHumanoid().bones], ['surfer2', surfer]] as const)(
    'is read back by the gauge as the targets it was built from, every stance, on %s',
    (_, bones) => {
      const lengths = figureLengths(new StanceGauge(bones()).joints());
      // A board rolled 20° and turned, so the figure is built on the board, not the world.
      const board = { boardPosition: new Vector3(4, 0.1, -3), boardQuaternion: new Quaternion().setFromAxisAngle(new Vector3(0.3, 1, 0.6).normalize(), 0.4) };
      for (const stance of STANCES) {
        for (const side of ['regular', 'goofy'] as const) {
          const wanted = figureAngles(stance, NEUTRAL_STANCE);
          const plan = figurePlan(stance);
          const feet = { front: new Vector3(0, 0.14, 0.32), rear: new Vector3(0, 0.12, -0.29) };
          const read = measureJoints(referenceJoints(wanted, lengths, feet, side, board, plan), board, side);
          for (const measure of FIGURE_HONOURS) {
            // A trunk bent to meet the hips' targets leaves its own angle to follow.
            if (plan.trunkFromHips && (measure === 'trunkFlexion' || measure === 'trunkPitch')) continue;
            const tolerance = measure === 'weight' || measure === 'stanceWidth' ? 0.01 : 2;
            expect(Math.abs(read[measure] - wanted[measure]), `${stance.id}, ${side}: ${measure} ${read[measure].toFixed(2)} for ${wanted[measure].toFixed(2)}`).toBeLessThan(tolerance);
          }
          // The hips, where the map targets them: their mean met, the trunk bent for it.
          if (plan.trunkFromHips) {
            const hips = (read.hipFront + read.hipRear) / 2;
            expect(Math.abs(hips - (wanted.hipFront + wanted.hipRear) / 2), `${stance.id}, ${side}: hips ${read.hipFront.toFixed(0)}/${read.hipRear.toFixed(0)} for ${wanted.hipFront}/${wanted.hipRear}`).toBeLessThan(2);
          }
        }
      }
    },
  );

  it('bends the trunk for the hips where their source ranks at least as high as the trunk\'s', () => {
    const plan = (id: string) => figurePlan(STANCES.find((stance) => stance.id === id)!);
    // Compress: the thesis's hips over a trunk read from a video. Trim: Weiss's hips over a coaching cue.
    expect(plan('compress-frontside').trunkFromHips).toBe(true);
    expect(plan('trim').trunkFromHips).toBe(true);
    // The drop targets no hips.
    expect(plan('drop').trunkFromHips).toBe(false);
  });

  it('takes each target’s middle, and the drawn body’s own reading where the map has none', () => {
    const trim = STANCES.find((stance) => stance.id === 'trim')!;
    const angles = figureAngles(trim, { ...NEUTRAL_STANCE, headPitch: 33 });
    expect(angles.kneeFront).toBe((trim.targets.kneeFront!.min + trim.targets.kneeFront!.max) / 2);
    expect(angles.headPitch).toBe(33);
  });
});
