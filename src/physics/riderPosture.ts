import { REFERENCE_RIDER } from './boardReference';
import type { BoardShape } from './boardShape';
import type { BodyPart } from './DetachedSurfer';

interface Vec { x: number; y: number; z: number }

/** The detached surfer's parts, in its node order, so a fall starts from the same body. */
export const RIDER_PARTS: readonly BodyPart[] = ['pelvis', 'torso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
/** The detached surfer's split of a 73 kg body, kg. */
const PART_MASSES = [20, 23, 5, 5, 5, 7.5, 7.5];
/** The detached surfer's default body density, kg/m³. */
export const RIDER_BODY_DENSITY = 950;

export type StanceName = 'regular' | 'goofy';
export type PosePhase = 'prone' | 'push' | 'landing' | 'standing';

/** Where on the deck the body can press: a rectangle in the board frame (x across, z toward the nose). */
export interface SupportRegion {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

/**
 * A body posture on the board: part centres in the board frame when level (x,
 * y, z per part), and its support. An upright posture (standing, landing) is
 * carried at `base`, the stance point on the deck, and keeps its body vertical
 * while the board pitches and rolls under the feet, turning only with the
 * board's heading. Prone and push lie rigid on the deck.
 */
export interface Posture {
  parts: Float64Array;
  support: SupportRegion;
  upright: boolean;
  base: Vec;
}

export function riderPartMasses(total: number = REFERENCE_RIDER.mass): number[] {
  const sum = PART_MASSES.reduce((a, b) => a + b, 0);
  return PART_MASSES.map((mass) => (mass * total) / sum);
}

export function riderPartVolumes(total: number = REFERENCE_RIDER.mass, density = RIDER_BODY_DENSITY): number[] {
  return riderPartMasses(total).map((mass) => mass / density);
}

/** Deck height at the stringer, m, a distance z along the board from mid-length. */
export function deckHeight(shape: BoardShape, z: number): number {
  const s = Math.min(1, Math.max(0, z / shape.length + 0.5));
  return shape.curves.rocker(s) + shape.curves.thickness(s);
}

/**
 * Where the feet stand (a modelling choice): the rear foot 0.30 m from the tail,
 * over the fins, and the front foot 0.63 m ahead of it, the measured pop-up foot
 * spacing (Borgonovo-Santos et al. 2021).
 */
export function stanceFeet(shape: BoardShape): { rear: number; front: number } {
  const rear = -shape.length / 2 + 0.3;
  return { rear, front: rear + 0.63 };
}

export function postureCenter(parts: ArrayLike<number>, masses: readonly number[], out: Vec = { x: 0, y: 0, z: 0 }): Vec {
  let total = 0;
  out.x = 0;
  out.y = 0;
  out.z = 0;
  masses.forEach((mass, i) => {
    out.x += mass * parts[i * 3];
    out.y += mass * parts[i * 3 + 1];
    out.z += mass * parts[i * 3 + 2];
    total += mass;
  });
  out.x /= total;
  out.y /= total;
  out.z /= total;
  return out;
}

type PartPlace = [x: number, heightAboveDeck: number, z: number];

/**
 * The regular-stance postures, as each part's position across the board, its
 * height above the deck there and its position along the board. The heights
 * are illustrative, not measured: a standing crouch with the centre of mass
 * about 0.85 m over the deck, a landing crouch at 0.63 m, the push-up with the
 * hands on the rails at 0.28 m, and prone at 0.09 m with the legs over the tail.
 * A person facing the nose has their right at −x, so prone the left hand is at
 * +x; standing regular (left foot forward) faces the −x rail.
 */
function regularPlaces(shape: BoardShape, phase: PosePhase): { places: PartPlace[]; support: SupportRegion } {
  const { rear, front } = stanceFeet(shape);
  const middle = (rear + front) / 2;
  const feet: SupportRegion = { xMin: -0.13, xMax: 0.13, zMin: rear - 0.06, zMax: front + 0.06 };
  switch (phase) {
    case 'standing':
      return {
        places: [[0, 0.78, middle], [0, 1.05, middle], [0, 1.38, middle], [0, 1.0, middle + 0.45], [0, 1.0, middle - 0.45], [0, 0.35, front - 0.08], [0, 0.35, rear + 0.08]],
        support: feet,
      };
    case 'landing': {
      // Landing loads the front foot (72/28 in the laboratory study), so the trunk sits forward.
      const trunk = middle + 0.12;
      return {
        places: [[0, 0.55, trunk], [0, 0.8, trunk], [0, 1.1, trunk], [0, 0.75, trunk + 0.35], [0, 0.75, trunk - 0.35], [0, 0.25, front - 0.06], [0, 0.25, rear + 0.06]],
        support: feet,
      };
    }
    case 'push':
      return {
        places: [[0, 0.25, -0.25], [0, 0.4, 0.15], [0, 0.55, 0.45], [0.22, 0.2, 0.15], [-0.22, 0.2, 0.15], [0.08, 0.1, -0.55], [-0.08, 0.1, -0.55]],
        support: { xMin: -0.23, xMax: 0.23, zMin: -0.65, zMax: 0.3 },
      };
    case 'prone':
      return {
        places: [[0, 0.1, -0.22], [0, 0.12, 0.25], [0, 0.2, 0.62], [0.28, 0, 0.2], [-0.28, 0, 0.2], [0.08, 0.05, -0.75], [-0.08, 0.05, -0.75]],
        support: { xMin: -0.18, xMax: 0.18, zMin: -0.65, zMax: 0.55 },
      };
  }
}

/** Left and right swap under the goofy mirror. */
const MIRROR = [0, 1, 2, 4, 3, 6, 5];

/**
 * A phase's posture for a stance. Goofy (right foot forward) mirrors regular
 * across the stringer, swapping left and right parts, so steering input can keep
 * one meaning for both.
 */
export function riderPose(shape: BoardShape, phase: PosePhase, stance: StanceName): Posture {
  const { places, support } = regularPlaces(shape, phase);
  const upright = phase === 'standing' || phase === 'landing';
  const { rear, front } = stanceFeet(shape);
  const middle = (rear + front) / 2;
  const base = { x: 0, y: deckHeight(shape, middle), z: middle };
  const parts = new Float64Array(RIDER_PARTS.length * 3);
  for (let i = 0; i < RIDER_PARTS.length; i += 1) {
    const [x, height, z] = places[stance === 'regular' ? i : MIRROR[i]];
    parts[i * 3] = stance === 'regular' ? x : -x;
    parts[i * 3 + 1] = deckHeight(shape, z) + height;
    parts[i * 3 + 2] = z;
  }
  return { parts, support: stance === 'regular' ? support : { ...support, xMin: -support.xMax, xMax: -support.xMin }, upright, base };
}
