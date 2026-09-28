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
  'compress-frontside.kneeFront': 'the knees follow the physics\' full crouch, a little deeper than the thesis\'s 70–90° (step 6)',
  'compress-frontside.hipRear': 'the hinge meets the hips\' mean (75°); the rear thigh, more upright, leaves its hip at 94°',
  'compress-frontside.lowHand': 'the drawn hand still blending down to the physics\' (0.12 m) 0.4 s into Compress: step 1\'s point blend carries the switch',
  'compress-backside.hipFront': 'backside the hinge stops at Hobgood\'s upright trunk so the heel-side hand reaches the water: the thesis\'s hips cannot fold with it',
  'compress-backside.hipRear': 'as the front hip: the upright backside trunk',
  'compress-backside.kneeRear': 'the physics\' backside crouch leaves the rear knee at 105° (step 6)',
  'compress-backside.lowHand': 'the drawn hand still blending down to the physics\' (0.18 m): step 1\'s point blend',
  'extension-frontside.kneeFront': 'the physics\' pelvis still low and forward 0.3 s after Compress (its weight 0.71): step 6',
  'extension-frontside.kneeRear': 'as the front knee: the physics\' pelvis still rising',
  'extension-backside.kneeFront': 'as frontside: the physics\' pelvis still low and forward',
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
