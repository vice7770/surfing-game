import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BONES } from '../rig/humanoidBones';
import { createTestHumanoid } from '../rig/testHumanoid';
import { OUTFITS, chainOf, computeOutfitCoverage, type OutfitId, type RestSkeleton } from './outfits';

const { bones } = createTestHumanoid();
const names = [...bones.keys()];
const rest: RestSkeleton = { names, positions: names.map((n) => bones.get(n)!.getWorldPosition(new Vector3())) };

/** Coverage of one vertex skinned wholly to `bone`: [garment A, garment B, accent, unused], signed metres. */
function coverage(outfit: OutfitId, bone: string, point: [number, number, number]): Float32Array {
  return computeOutfitCoverage(point, [names.indexOf(bone), 0, 0, 0], [1, 0, 0, 0], rest, outfit);
}

describe('outfits', () => {
  it('offers the four agreed outfits', () => {
    expect(OUTFITS).toEqual(['fullsuit', 'springsuit', 'vestShorts', 'vestBikini']);
  });

  it('assigns bones to limb chains, the torso by default', () => {
    expect(chainOf(BONES.hand.left)).toBe('leftArm');
    expect(chainOf(BONES.fingers.right[1][2])).toBe('rightArm');
    expect(chainOf(BONES.toe.right)).toBe('rightLeg');
    expect(chainOf(BONES.spine[1])).toBe('torso');
    expect(chainOf(BONES.shoulder.left)).toBe('torso');
    expect(chainOf(BONES.head)).toBe('head');
  });

  it('a full suit covers the forearm but not the hand, the shin but not the foot, the chest but not the face', () => {
    expect(coverage('fullsuit', BONES.foreArm.left, [0.55, 1.4, 0])[0]).toBeGreaterThan(0);
    expect(coverage('fullsuit', BONES.hand.left, [0.78, 1.4, 0])[0]).toBeLessThan(0);
    expect(coverage('fullsuit', BONES.leg.right, [-0.09, 0.3, 0])[0]).toBeGreaterThan(0);
    expect(coverage('fullsuit', BONES.foot.right, [-0.09, 0.04, 0.1])[0]).toBeLessThan(0);
    expect(coverage('fullsuit', BONES.spine[2], [0, 1.35, 0.1])[0]).toBeGreaterThan(0);
    expect(coverage('fullsuit', BONES.head, [0, 1.62, 0.08])[0]).toBeLessThan(0);
    expect(coverage('fullsuit', BONES.hips, [0, 0.9, 0])[1]).toBeLessThan(0); // one garment only
  });

  it('a spring suit stops above the elbow and above the knee', () => {
    expect(coverage('springsuit', BONES.arm.left, [0.22, 1.4, 0])[0]).toBeGreaterThan(0);
    expect(coverage('springsuit', BONES.foreArm.left, [0.55, 1.4, 0])[0]).toBeLessThan(0);
    expect(coverage('springsuit', BONES.upLeg.left, [0.09, 0.85, 0])[0]).toBeGreaterThan(0);
    expect(coverage('springsuit', BONES.leg.left, [0.09, 0.4, 0])[0]).toBeLessThan(0);
  });

  it('dresses the vest outfits: a vest over the chest, boardshorts over hips and thighs', () => {
    expect(coverage('vestShorts', BONES.spine[2], [0, 1.35, 0])[0]).toBeGreaterThan(0);
    expect(coverage('vestShorts', BONES.hips, [0, 0.9, 0])[1]).toBeGreaterThan(0);
    expect(coverage('vestShorts', BONES.upLeg.left, [0.09, 0.8, 0])[1]).toBeGreaterThan(0);
    expect(coverage('vestShorts', BONES.leg.left, [0.09, 0.35, 0])[1]).toBeLessThan(0);
    expect(coverage('vestShorts', BONES.foreArm.left, [0.55, 1.4, 0])[0]).toBeLessThan(0); // short sleeves
  });

  it('cuts a bikini bottom smaller than boardshorts', () => {
    expect(coverage('vestBikini', BONES.hips, [0, 0.9, 0])[1]).toBeGreaterThan(0);
    expect(coverage('vestBikini', BONES.upLeg.left, [0.09, 0.8, 0])[1]).toBeLessThan(0);
    expect(coverage('vestBikini', BONES.spine[0], [0, 1.05, 0])[1]).toBeLessThan(0);
  });

  it('gives signed distances to the cut, so edges stay crisp between vertices', () => {
    // The spring suit's sleeve ends 40 % down the upper arm (x = 0.292): 1 cm either side reads ±1 cm.
    expect(coverage('springsuit', BONES.arm.left, [0.282, 1.4, 0])[0]).toBeCloseTo(0.01, 6);
    expect(coverage('springsuit', BONES.arm.left, [0.302, 1.4, 0])[0]).toBeCloseTo(-0.01, 6);
  });

  it('takes a vertex’s chain from its heaviest weights', () => {
    const hand = names.indexOf(BONES.hand.left);
    const foreArm = names.indexOf(BONES.foreArm.left);
    const spine = names.indexOf(BONES.spine[2]);
    // 40 % forearm + 30 % hand makes it an arm vertex despite 30 % on the spine.
    const value = computeOutfitCoverage([0.55, 1.4, 0], [foreArm, hand, spine, 0], [0.4, 0.3, 0.3, 0], rest, 'springsuit');
    expect(value[0]).toBeLessThan(0);
  });
});
