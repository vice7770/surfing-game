import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { readGlbSkeleton } from '../scene/rig/glbSkeleton';
import { PosedBody } from '../scene/rig/posedBody';
import { createRiderVisualState } from '../scene/rig/riderVisualState';
import { StanceGauge, measurePoints } from '../scene/rig/stanceGauge';
import { STANCES } from '../scene/rig/stanceMap';
import { drawnStance, stanceState } from './ridingPoses';
import { compareStance, type StanceReading } from './stanceReport';

/**
 * The stance map's targets of medium or high confidence the drawn pose owns
 * (step 3), missed today on the four surfers as the game draws them, Regular
 * and Goofy, each with why: the rest are met. A new miss fails this, and so
 * does a miss fixed without being struck off.
 */
const KNOWN_MISSES: Record<string, string> = {
  'compress-frontside.hipRear': 'the hinge brings the trunk to the key pose\'s angle by the depth; the rear thigh, more upright, leaves its hip at about 100°: one hinge for both hips, the rig\'s mapping (phase 2\'s bottom-turn pose)',
  'compress-backside.hipFront': 'backside the hinge stops at Hobgood\'s upright trunk so the heel-side hand reaches the water: the thesis\'s hips cannot fold with it',
  'compress-backside.hipRear': 'as the front hip: the upright backside trunk',
  'compress-backside.kneeFront': 'within 1° of the thesis\'s 90° (90.8° included): read 0.4 s into a Compress still dropping, with the motion filter\'s pelvis 0.125 s behind the physics\' (the plan\'s §4: the accepted lag)',
  'compress-backside.lowHand': 'the drawn hand still blending down to the physics\' (0.18 m): step 1\'s point blend',
  'extension-frontside.kneeFront': 'let go tall and centred (the spec\'s projection) on flat water, the turn bleeds its speed and the slowing board rides 17° nose-up under the upright body, its whole load on the front foot: the front knee bends. The spec\'s projection carries the board up a face, which flat water lacks',
  'extension-frontside.kneeRear': 'the physics\' pelvis still rising 0.3 s after Compress, from its deeper ladder (the movement-flow spec); and the knees stand tall at trim\'s 42° (the animation-realism plan, phase 1), where the extension\'s are straighter: phase 2\'s bottom-turn pose (compress at the base, extend climbing)',
  'extension-backside.kneeFront': 'as frontside: the board 17° nose-up under the body',
  'extension-backside.kneeRear': 'as frontside\'s rear knee: the knees stand tall at trim\'s 42°, the extension\'s straighter legs are phase 2\'s (it met at 158° with the knees standing tall at 25°)',
  'landing.stanceWidth': 'the drawn feet still gliding apart at the landing\'s end: the physics jumps them from the lying legs (step 6), step 1 blends the jump (phase 3 plants them)',
  'landing.weight': 'as the width: the front foot not yet arrived',
  'pop-up.leadElbow': 'surfers 3 and 4: the push\'s hands on the rails beside the chest bend their shorter arms to 87–88° (surfers 1 and 2 meet it); phase 3 puts the hands flat beside the lower ribs. Seen once the map was read on all four surfers',
  'pop-up.trailElbow': 'as the leading elbow',
  'snap-frontside.weight': 'read 0.5 s into the snap as the weight goes back: the motion filter\'s pelvis 0.125 s behind the physics\' draws it 0.01–0.02 forward of the 0.45 (the physics\' own points meet it)',
  'snap-backside.weight': 'as frontside',
};

const SURFERS = ['surfer1', 'surfer2', 'surfer3', 'surfer4'] as const;
const skeleton = (surfer: string) => {
  const bytes = readFileSync(`public/assets/surfers/${surfer}.glb`);
  return readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).bones;
};
const at = new Vector3(0, 0.03, 0);

describe('the stance map\'s targets, on the drawn body (the stance poses, step 3; the animation-realism plan, phase 1)', () => {
  it('meets every target of medium or high confidence the drawn pose owns, on all four surfers, but the known misses', () => {
    const misses = new Map<string, string>();
    for (const stance of STANCES) {
      const readings: StanceReading[] = [];
      for (const surfer of SURFERS) {
        for (const side of ['regular', 'goofy'] as const) {
          const physics = measurePoints(stanceState(stance.id, side, at, createRiderVisualState()).state, side);
          const bones = skeleton(surfer);
          const gauge = new StanceGauge(bones);
          const body = new PosedBody(bones);
          const { state, reached } = drawnStance(stance.id, side, at, (step) => body.update(step));
          readings.push(reached ? { surfer, stance: side, reached, angles: gauge.measure(state, side), physics } : { surfer, stance: side, reached });
        }
      }
      for (const row of compareStance(stance, readings).rows) {
        if (row.status === 'out' && row.owner === 3 && row.target.confidence !== 'low') {
          misses.set(`${stance.id}.${row.measure}`, `${row.regular.mean.toFixed(2)} / ${row.goofy.mean.toFixed(2)} for ${row.target.min}–${row.target.max}`);
        }
      }
    }
    expect(Object.fromEntries(misses)).toEqual(Object.fromEntries(Object.keys(KNOWN_MISSES).map((key) => [key, misses.get(key) ?? 'met'])));
  }, 900_000);
});
