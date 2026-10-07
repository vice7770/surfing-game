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
 * (step 3), missed today on surfer2 as the game draws it, Regular and Goofy,
 * each with why: the rest are met. A new miss fails this, and so does a miss
 * fixed without being struck off.
 */
const KNOWN_MISSES: Record<string, string> = {
  'trim.kneeFront': 'the physics sits the hips forward (its weight 0.64, over 0.50–0.62): the front knee bends for it (step 6)',
  'compress-frontside.kneeFront': 'the front knee closes a hair past the thesis\'s 70° (69.7–69.8°): since the compressed turn\'s pull eased short of the rail\'s bite and within a real bottom turn\'s pull (371fda18, 51d0d8e5), the body leans 54° rather than 62° and the trunk folds over the front hip again (76°, met)',
  'compress-frontside.hipRear': 'the hinge brings the hips\' mean to the depth\'s angle (84° at the physics\' Compress depth, 0.87) and meets it; the rear thigh, more upright, leaves its hip at about 95°: one angle for both hips, the rig\'s mapping (it could reach this)',
  'compress-frontside.lowHand': 'the drawn hand still blending down to the physics\' (0.12 m) 0.4 s into Compress: step 1\'s point blend carries the switch',
  'compress-backside.hipFront': 'backside the hinge stops at Hobgood\'s upright trunk so the heel-side hand reaches the water: the thesis\'s hips cannot fold with it',
  'compress-backside.hipRear': 'as the front hip: the upright backside trunk',
  'compress-backside.lowHand': 'the drawn hand still blending down to the physics\' (0.18 m): step 1\'s point blend',
  'extension-frontside.kneeFront': 'let go tall and centred (the spec\'s projection) on flat water, the turn bleeds its speed (7.6 to 5.3 m/s in 0.3 s) and the slowing board rides 17° nose-up under the upright body, its whole load on the front foot: the front knee bends to 100–101°. The spec\'s projection carries the board up a face, which flat water lacks',
  'extension-frontside.kneeRear': 'the physics\' pelvis still rising 0.3 s after Compress, from its deeper ladder (the movement-flow spec)',
  'extension-backside.kneeFront': 'as frontside: the board 17° nose-up under the body, the front knee at 102–103° (the rear one met, 158°)',
  'landing.stanceWidth': 'the drawn feet still gliding apart at the landing\'s end: the physics jumps them from the lying legs (step 6), step 1 blends the jump',
  'landing.weight': 'as the width: the front foot not yet arrived',
};

const bytes = readFileSync('public/assets/surfers/surfer2.glb');
const skeleton = () => readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).bones;
const at = new Vector3(0, 0.03, 0);

describe('the stance map\'s targets, on the drawn body (the stance poses, step 3)', () => {
  it('meets every target of medium or high confidence the drawn pose owns, but the known misses', () => {
    const misses = new Map<string, string>();
    for (const stance of STANCES) {
      const readings: StanceReading[] = [];
      for (const side of ['regular', 'goofy'] as const) {
        const physics = measurePoints(stanceState(stance.id, side, at, createRiderVisualState()).state, side);
        const bones = skeleton();
        const gauge = new StanceGauge(bones);
        const body = new PosedBody(bones);
        const { state, reached } = drawnStance(stance.id, side, at, (step) => body.update(step));
        readings.push(reached ? { surfer: 'surfer2', stance: side, reached, angles: gauge.measure(state, side), physics } : { surfer: 'surfer2', stance: side, reached });
      }
      for (const row of compareStance(stance, readings).rows) {
        if (row.status === 'out' && row.owner === 3 && row.target.confidence !== 'low') {
          misses.set(`${stance.id}.${row.measure}`, `${row.regular.mean.toFixed(2)} / ${row.goofy.mean.toFixed(2)} for ${row.target.min}–${row.target.max}`);
        }
      }
    }
    expect(Object.fromEntries(misses)).toEqual(Object.fromEntries(Object.keys(KNOWN_MISSES).map((key) => [key, misses.get(key) ?? 'met'])));
  }, 240_000);
});
