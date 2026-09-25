import { describe, expect, it } from 'vitest';
import { buildBoardShape } from './boardShape';
import { DetachedSurfer } from './DetachedSurfer';
import { RIDER_PARTS, deckHeight, postureCenter, riderPartMasses, riderPartVolumes, riderPose, stanceFeet, type PosePhase } from './riderPosture';

const shape = buildBoardShape();

describe('rider posture', () => {
  it('uses the detached surfer’s parts, masses and volumes, so a fall starts from the same body', () => {
    const surfer = new DetachedSurfer();
    expect(surfer.nodes.map((node) => node.part)).toEqual([...RIDER_PARTS]);
    expect(riderPartMasses()).toEqual(surfer.nodes.map((node) => node.mass));
    riderPartVolumes().forEach((volume, i) => expect(volume).toBeCloseTo(surfer.nodes[i].volume, 12));
  });

  it('stands with the rear foot over the fins and the front foot 0.63 m ahead', () => {
    const { rear, front } = stanceFeet(shape);
    expect(rear).toBeCloseTo(-shape.length / 2 + 0.3, 12);
    expect(front - rear).toBeCloseTo(0.63, 12);
  });

  it('holds each posture’s centre of mass over its support, at the height the phase needs', () => {
    const heights: Record<PosePhase, [number, number]> = { prone: [0.05, 0.12], push: [0.22, 0.34], landing: [0.58, 0.68], standing: [0.8, 0.88] };
    for (const phase of Object.keys(heights) as PosePhase[]) {
      const pose = riderPose(shape, phase, 'regular');
      const centre = postureCenter(pose.parts, riderPartMasses());
      const above = centre.y - deckHeight(shape, centre.z);
      expect(above, phase).toBeGreaterThan(heights[phase][0]);
      expect(above, phase).toBeLessThan(heights[phase][1]);
      expect(centre.x, phase).toBeGreaterThan(pose.support.xMin);
      expect(centre.x, phase).toBeLessThan(pose.support.xMax);
      expect(centre.z, phase).toBeGreaterThan(pose.support.zMin);
      expect(centre.z, phase).toBeLessThan(pose.support.zMax);
    }
  });

  it('mirrors goofy across the stringer, swapping left and right', () => {
    const swap = [0, 1, 2, 4, 3, 6, 5];
    for (const phase of ['prone', 'push', 'landing', 'standing'] as const) {
      const regular = riderPose(shape, phase, 'regular');
      const goofy = riderPose(shape, phase, 'goofy');
      for (let i = 0; i < RIDER_PARTS.length; i += 1) {
        const j = swap[i];
        expect(goofy.parts[i * 3]).toBeCloseTo(-regular.parts[j * 3], 12);
        expect(goofy.parts[i * 3 + 1]).toBeCloseTo(regular.parts[j * 3 + 1], 12);
        expect(goofy.parts[i * 3 + 2]).toBeCloseTo(regular.parts[j * 3 + 2], 12);
      }
      expect(goofy.support).toEqual({ ...regular.support, xMin: -regular.support.xMax, xMax: -regular.support.xMin });
    }
  });
});
