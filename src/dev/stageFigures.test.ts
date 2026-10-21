import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { StanceGauge, measureJoints } from '../scene/rig/stanceGauge';
import { createTestHumanoid } from '../scene/rig/testHumanoid';
import { figureLengths } from './stanceFigure';
import { footAngles, freeFigure, standingFigure, type StandingSpec } from './stageFigures';

const lengths = figureLengths(new StanceGauge(createTestHumanoid().bones).joints());
/** A board rolled, pitched and turned, so the figure is built on the board and in the world, not on the axes. */
const board = {
  boardPosition: new Vector3(3, 0.05, -2),
  boardQuaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.7)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.12))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.3)),
};
const TRIM: StandingSpec = {
  width: 0.63, weight: 0.55, knee: [45, 50], foot: [55, 80], rearKneeIn: 20, lean: 5, trunk: 22, chest: 30, hips: 15, shoulderDrop: 8,
  head: [80, 10], lead: { dir: [0.35, 0.7, -0.62], elbow: 150 }, trail: { dir: [0.25, -0.15, -0.95], elbow: 155 },
};

describe('the animation-realism plan\'s stage figures', () => {
  it.each(['regular', 'goofy'] as const)('stand a standing stage\'s numbers as the stance gauge reads them (%s)', (stance) => {
    for (const spec of [TRIM, { ...TRIM, knee: [115, 135] as const, foot: [45, 45] as const, width: 0.7, weight: 0.3, lean: -30 }]) {
      const joints = standingFigure(spec, lengths, stance, board);
      const read = measureJoints(joints, board, stance);
      expect(read.kneeFront).toBeCloseTo(180 - spec.knee[0], 0);
      expect(read.kneeRear).toBeCloseTo(180 - spec.knee[1], 0);
      expect(read.stanceWidth).toBeCloseTo(spec.width, 2);
      expect(read.hipsOver).toBeCloseTo(spec.weight, 2);
      const feet = footAngles(joints, board);
      const [front, rear] = stance === 'regular' ? ['left', 'right'] as const : ['right', 'left'] as const;
      expect(feet[front]).toBeCloseTo(spec.foot[0], 0);
      expect(feet[rear]).toBeCloseTo(spec.foot[1], 0);
    }
  });

  it('keeps every limb its length, lying or in the water, and mirrors Goofy across the stringer', () => {
    const spec = {
      frame: 'board' as const, hips: [0, 0.11, -0.47] as const, up: [0, 0.1, 1] as const, chest: [0, 0.2, 1] as const, facing: [0, -1, 0.1] as const, look: [0, -0.15, 1] as const,
      legs: { left: { at: [0.05, 0.03, -1.3] as const, pole: [0, -1, 0] as const }, right: { at: [-0.05, 0.03, -1.3] as const, pole: [0, -1, 0] as const } },
      arms: { left: { at: [0.3, -0.05, 0.4] as const, pole: [0.6, 1, -0.4] as const }, right: { at: [-0.27, -0.27, -0.15] as const, pole: [-1, 0.7, -0.2] as const } },
    };
    const level = { boardPosition: new Vector3(0, 0.03, 0), boardQuaternion: new Quaternion() };
    const regular = freeFigure(spec, lengths, 'regular', level);
    const goofy = freeFigure(spec, lengths, 'goofy', level);
    for (const side of ['left', 'right'] as const) {
      expect(regular.knee[side].distanceTo(regular.hip[side])).toBeCloseTo(lengths.thigh, 4);
      expect(regular.elbow[side].distanceTo(regular.shoulder[side])).toBeCloseTo(lengths.upperArm, 4);
      const other = side === 'left' ? 'right' : 'left';
      expect(goofy.wrist[other].x).toBeCloseTo(-regular.wrist[side].x, 4);
      expect(goofy.wrist[other].z).toBeCloseTo(regular.wrist[side].z, 4);
    }
  });
});
