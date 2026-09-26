/** MPFB's Mixamo skeleton, named as three.js loads it (GLTFLoader drops the colon: `mixamorig:Hips` → `mixamorigHips`). */
export type Side = 'left' | 'right';

const m = (name: string) => `mixamorig${name}`;
const sided = (name: string): Record<Side, string> => ({ left: m(`Left${name}`), right: m(`Right${name}`) });
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'] as const;
const fingers = (side: 'Left' | 'Right') => FINGERS.map((finger) => [1, 2, 3].map((joint) => m(`${side}Hand${finger}${joint}`)) as [string, string, string]);

export const BONES = {
  hips: m('Hips'),
  spine: [m('Spine'), m('Spine1'), m('Spine2')] as const,
  neck: m('Neck'),
  head: m('Head'),
  shoulder: sided('Shoulder'),
  arm: sided('Arm'),
  foreArm: sided('ForeArm'),
  hand: sided('Hand'),
  upLeg: sided('UpLeg'),
  leg: sided('Leg'),
  foot: sided('Foot'),
  toe: sided('ToeBase'),
  /** Thumb, index, middle, ring, pinky; three joints each, knuckle first. */
  fingers: { left: fingers('Left'), right: fingers('Right') } as Record<Side, readonly (readonly [string, string, string])[]>,
} as const;

/** The middle finger's knuckle: the hand's axis runs from the wrist to it. */
export const MIDDLE_FINGER = 2;

/** Every bone the rig drives or measures. */
export const REQUIRED_BONES: readonly string[] = [
  BONES.hips, ...BONES.spine, BONES.neck, BONES.head,
  ...(['left', 'right'] as const).flatMap((side) => [
    BONES.shoulder[side], BONES.arm[side], BONES.foreArm[side], BONES.hand[side],
    BONES.upLeg[side], BONES.leg[side], BONES.foot[side], BONES.toe[side], BONES.fingers[side][MIDDLE_FINGER][0],
  ]),
];
