import { Vector3 } from 'three';
import { BONES } from '../rig/humanoidBones';

export type OutfitId = 'fullsuit' | 'springsuit' | 'vestShorts' | 'vestBikini';
export type Chain = 'torso' | 'head' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
export const OUTFITS: readonly OutfitId[] = ['fullsuit', 'springsuit', 'vestShorts', 'vestBikini'];

/** The skeleton's bind pose: joint positions by bone index, in the mesh's bind space. */
export interface RestSkeleton {
  names: readonly string[];
  positions: readonly Vector3[];
}

type Part = 'torso' | 'head' | 'arm' | 'leg';
/**
 * Where a garment covers one part of the body:
 * - `all` or `none`;
 * - a cut across a limb `at` a share of its upper or lower segment, keeping the root side;
 * - a band on the torso `above` and/or `below` shares of the hips→neck line;
 * - a collar `neck` of the way from the neck joint to the head joint.
 */
type Rule = 'all' | 'none' | { segment: 'upper' | 'lower'; at: number } | { above?: number; below?: number } | { neck: number };
type Garment = Record<Part, Rule>;
const NONE: Garment = { torso: 'none', head: 'none', arm: 'none', leg: 'none' };
const VEST: Garment = { torso: { above: 0.06 }, head: { neck: 0.4 }, arm: { segment: 'upper', at: 0.45 }, leg: 'none' };

/**
 * Each outfit's garment A (suit or vest), garment B (shorts or bikini) and
 * accent (a chest-and-shoulder yoke on suits). The cut positions are art
 * direction from wetsuit and swimwear patterns, tuned on the screenshot sheet.
 */
const OUTFIT_RULES: Record<OutfitId, readonly [Garment, Garment, Garment]> = {
  fullsuit: [
    { torso: 'all', head: { neck: 0.55 }, arm: { segment: 'lower', at: 0.93 }, leg: { segment: 'lower', at: 0.95 } },
    NONE,
    { torso: { above: 0.62 }, head: 'none', arm: { segment: 'upper', at: 0.35 }, leg: 'none' },
  ],
  springsuit: [
    { torso: 'all', head: { neck: 0.55 }, arm: { segment: 'upper', at: 0.4 }, leg: { segment: 'upper', at: 0.45 } },
    NONE,
    { torso: { above: 0.62 }, head: 'none', arm: { segment: 'upper', at: 0.25 }, leg: 'none' },
  ],
  vestShorts: [VEST, { torso: { below: 0.1 }, head: 'none', arm: 'none', leg: { segment: 'upper', at: 0.55 } }, NONE],
  vestBikini: [VEST, { torso: { below: 0 }, head: 'none', arm: 'none', leg: { segment: 'upper', at: 0.06 } }, NONE],
};

const CHAIN_OF = new Map<string, Chain>();
for (const side of ['left', 'right'] as const) {
  const arm: Chain = side === 'left' ? 'leftArm' : 'rightArm';
  const leg: Chain = side === 'left' ? 'leftLeg' : 'rightLeg';
  for (const bone of [BONES.arm[side], BONES.foreArm[side], BONES.hand[side], ...BONES.fingers[side].flat()]) CHAIN_OF.set(bone, arm);
  for (const bone of [BONES.upLeg[side], BONES.leg[side], BONES.foot[side], BONES.toe[side]]) CHAIN_OF.set(bone, leg);
}
CHAIN_OF.set(BONES.neck, 'head');
CHAIN_OF.set(BONES.head, 'head');

/** The chain a bone belongs to; unlisted bones (hips, spine, shoulders, end bones) by name, else the torso. */
export function chainOf(boneName: string): Chain {
  const known = CHAIN_OF.get(boneName);
  if (known) return known;
  if (/Left(Hand|Arm|ForeArm)/.test(boneName)) return 'leftArm';
  if (/Right(Hand|Arm|ForeArm)/.test(boneName)) return 'rightArm';
  if (/Left(UpLeg|Leg|Foot|Toe)/.test(boneName)) return 'leftLeg';
  if (/Right(UpLeg|Leg|Foot|Toe)/.test(boneName)) return 'rightLeg';
  if (/Head|Neck|Eye/.test(boneName)) return 'head';
  return 'torso';
}

const LIMB = {
  arm: { left: [BONES.arm.left, BONES.foreArm.left, BONES.hand.left], right: [BONES.arm.right, BONES.foreArm.right, BONES.hand.right] },
  leg: { left: [BONES.upLeg.left, BONES.leg.left, BONES.foot.left], right: [BONES.upLeg.right, BONES.leg.right, BONES.foot.right] },
} as const;
/** Values are clamped here, m: far from any edge, a vertex is simply in or out. */
const LIMIT = 0.2;
const axis = new Vector3();
const plane = new Vector3();
const offset = new Vector3();

/** Signed distance from `p` to the garment's edge on this chain: positive where covered. */
function signedValue(rule: Rule, chain: Chain, p: Vector3, joint: (name: string) => Vector3): number {
  if (rule === 'all') return LIMIT;
  if (rule === 'none') return -LIMIT;
  if ('segment' in rule) {
    const limb = chain.endsWith('Arm') ? LIMB.arm : LIMB.leg;
    const [root, middle, end] = limb[chain.startsWith('left') ? 'left' : 'right'];
    const from = joint(rule.segment === 'upper' ? root : middle);
    const to = joint(rule.segment === 'upper' ? middle : end);
    axis.subVectors(to, from).normalize();
    plane.copy(from).lerp(to, rule.at);
    return -offset.subVectors(p, plane).dot(axis);
  }
  if ('neck' in rule) {
    const neck = joint(BONES.neck);
    const head = joint(BONES.head);
    axis.subVectors(head, neck).normalize();
    plane.copy(neck).lerp(head, rule.neck);
    return -offset.subVectors(p, plane).dot(axis);
  }
  const hips = joint(BONES.hips);
  axis.subVectors(joint(BONES.neck), hips);
  const length = axis.length();
  axis.divideScalar(length);
  const along = offset.subVectors(p, hips).dot(axis);
  let value = LIMIT;
  if (rule.above !== undefined) value = Math.min(value, along - rule.above * length);
  if (rule.below !== undefined) value = Math.min(value, rule.below * length - along);
  return value;
}

/**
 * Per-vertex outfit coverage, four floats a vertex: garment A, garment B,
 * accent, unused. Each is the signed distance (m, clamped to ±0.2) to that
 * garment's edge on the vertex's chain, the chain holding most of its skin
 * weight. Edges are planes, so a linear distance interpolated across a triangle
 * finds them exactly and the shader can draw them crisp.
 */
export function computeOutfitCoverage(
  positions: ArrayLike<number>, skinIndex: ArrayLike<number>, skinWeight: ArrayLike<number>, rest: RestSkeleton, outfit: OutfitId,
): Float32Array {
  const count = positions.length / 3;
  const out = new Float32Array(count * 4);
  const chains = rest.names.map(chainOf);
  const index = new Map(rest.names.map((name, i) => [name, i]));
  const joint = (name: string) => {
    const i = index.get(name);
    if (i === undefined) throw new Error(`outfit coverage needs the bone ${name}`);
    return rest.positions[i];
  };
  const rules = OUTFIT_RULES[outfit];
  const weights = new Map<Chain, number>();
  const p = new Vector3();
  for (let v = 0; v < count; v += 1) {
    weights.clear();
    for (let k = 0; k < 4; k += 1) {
      const w = skinWeight[v * 4 + k];
      if (w > 0) {
        const chain = chains[skinIndex[v * 4 + k]];
        weights.set(chain, (weights.get(chain) ?? 0) + w);
      }
    }
    let chain: Chain = 'torso';
    let heaviest = -1;
    for (const [c, w] of weights) {
      if (w > heaviest) {
        heaviest = w;
        chain = c;
      }
    }
    const part: Part = chain === 'torso' || chain === 'head' ? chain : chain.endsWith('Arm') ? 'arm' : 'leg';
    p.set(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
    for (let g = 0; g < 3; g += 1) out[v * 4 + g] = Math.max(-LIMIT, Math.min(LIMIT, signedValue(rules[g][part], chain, p, joint)));
    out[v * 4 + 3] = 0;
  }
  return out;
}
