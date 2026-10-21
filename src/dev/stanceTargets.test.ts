import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { readGlbSkeleton } from '../scene/rig/glbSkeleton';
import { PosedBody } from '../scene/rig/posedBody';
import { createRiderVisualState } from '../scene/rig/riderVisualState';
import { StanceGauge, measurePoints } from '../scene/rig/stanceGauge';
import { STANCES } from '../scene/rig/stanceMap';
import { measureDrawnStance, stanceState } from './ridingPoses';
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
  'compress-backside.lowHand': 'the drawn hand still blending down to the physics\' (0.18 m): step 1\'s point blend',
  'extension-frontside.kneeFront': 'let go tall and centred (the spec\'s projection) on flat water, the turn bleeds its speed and the slowing board rides 17° nose-up under the upright body, its whole load on the front foot: the front knee bends. The spec\'s projection carries the board up a face, which flat water lacks. Read 0.3 s after letting go: the leg rises over the riding stance (decision 6) only from about 0.6 s',
  'extension-frontside.kneeRear': 'the physics\' pelvis still rising 0.3 s after Compress, from its deeper ladder (the movement-flow spec); and the knees stand tall at trim\'s 42° (the animation-realism plan, phase 1), where the extension\'s are straighter: phase 2\'s bottom-turn pose (compress at the base, extend climbing)',
  'extension-backside.kneeFront': 'as frontside: the board 17° nose-up under the body',
  'extension-backside.kneeRear': 'as frontside\'s rear knee: the knees stand tall at trim\'s 42°, the extension\'s straighter legs are phase 2\'s (it met at 158° with the knees standing tall at 25°)',
  'paddling.pullDepth': 'the physics\' hand path (`HAND_DEPTH` 0.25 m under the deck beside the rail): the drawn wrist follows the physics\' hand, 0.30 m under the waterline for 0.15–0.25, with the board rolling 18° toward the pulling arm (the phase 5 physics plan\'s batch C; 0.25 m at 7° before). Its depth taken from the water\'s surface (0.22 m) read as jumps at 30 Hz: pinned with the stroke\'s drawn length (the body film)',
  'pop-up-hands.handsApart': 'the hands flat 2 cm inside the rails beside the drawn lower ribs (the owner\'s call, §10.4): the physics lays the prone body far back on this 1.78 m board (its pelvis 0.37 m from the tail), where the board is 0.42 m wide, so 0.37 m apart; Borgonovo-Santos\' 0.46 m is the board\'s width at the chest',
};

/**
 * The targets of medium or high confidence the physics owns (its own reading misses them too: the weight, the lean,
 * the lower hand), missed today, each with why. Pinned as the drawn ones are: a new miss fails this, and so does one
 * met without being struck off.
 *
 * The weight is the feet's pressure, smoothed over 0.3 s (the phase-5 physics plan's W1, the owner's decision 1 of
 * 2026-10-22), read at steady speed riding straight (trim, W/S, the pump: met, but the pump's). Carving on flat water
 * the board sheds 0.2–0.6 g, which a wave's face would feed back (the plan's §1.2, §2.4), and the pressure moves ahead
 * of the body by its height times the deceleration; the balance re-centres it only past 0.2 m from the middle (the
 * plan's W2, a 0.1 m zone about where W/S hold it, is held back: it broke the Compress cap's 11 m/s guard). Until
 * phase 5 the weight read the pelvis's place, which on a nose-up deck reads its pitch: the compressed bottom turns'
 * 0.59–0.60 now read 0.61, met.
 */
const PHASE5_MISSES: Record<string, string> = {
  'extension-frontside.weight': 'let go with no S held on flat water, the board slows about 0.5 g out of the turn: the pressure 0.74 on the front foot, where the thesis\'s final phase puts it back (S\'s; the recipe holds none, the movement-flow spec\'s projection)',
  'extension-backside.weight': 'as frontside',
  'top-turn-frontside.weight': 'at full S (decision 5) on flat water, the carve slows the board about 0.3 g: the pressure 0.46 against the top turn\'s 70/30 on the back foot (Rapture); the plan\'s W2 (S holding 0.30 within 0.1 m) is held back',
  'top-turn-backside.weight': 'as frontside',
  'snap-frontside.weight': 'full S on flat water, the board slowing 0.5–0.6 g: the pressure 0.49 against 0.30–0.45 (the pelvis, read as the weight until phase 5, met it)',
  'snap-backside.weight': 'as frontside',
  'cutback-frontside.weight': 'S at −0.7 on flat water, the carve slowing about 0.3 g: the pressure 0.51 against 65/35 to 70/30 on the back foot (Rapture)',
  'cutback-backside.weight': 'as frontside',
  'pump-compression.weight': 'at steady speed, crouching loads the feet evenly: 0.51 against 55/45 onto the back foot going uphill (Rapture), which the flat recipe has no hill for',
  'pump-extension.weight': 'at steady speed, rising out of the crouch: 0.63 against 55/45 onto the front foot going downhill',
  'landing.weight': 'the pressure at the landing\'s end, smoothed: 0.81, the trunk sitting 0.08 m forward (the landing posture), against the study\'s 72 ± 8 % of the peak force',
};

const SURFERS = ['surfer1', 'surfer2', 'surfer3', 'surfer4'] as const;
const skeleton = (surfer: string) => {
  const bytes = readFileSync(`public/assets/surfers/${surfer}.glb`);
  return readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).bones;
};
const at = new Vector3(0, 0.03, 0);

describe('the stance map\'s targets, on the drawn body (the stance poses, step 3; the animation-realism plan, phases 1 to 3)', () => {
  it('meets every target of medium or high confidence, on all four surfers, but the known misses: the drawn pose\'s and the physics\' (phase 5)', () => {
    const misses = new Map<string, string>();
    const physics = new Map<string, string>();
    for (const stance of STANCES) {
      const readings: StanceReading[] = [];
      for (const surfer of SURFERS) {
        for (const side of ['regular', 'goofy'] as const) {
          const physics = measurePoints(stanceState(stance.id, side, at, createRiderVisualState()).state, side);
          const bones = skeleton(surfer);
          const gauge = new StanceGauge(bones);
          const body = new PosedBody(bones);
          const { reached, angles } = measureDrawnStance(stance.id, side, at, (step) => body.update(step), (step) => gauge.measure(step, side));
          readings.push(reached ? { surfer, stance: side, reached, angles, physics } : { surfer, stance: side, reached });
        }
      }
      for (const row of compareStance(stance, readings).rows) {
        if (row.status !== 'out' || row.target.confidence === 'low') continue;
        const reading = `${row.regular.mean.toFixed(2)} / ${row.goofy.mean.toFixed(2)} for ${row.target.min}–${row.target.max}`;
        (row.owner === 3 ? misses : physics).set(`${stance.id}.${row.measure}`, reading);
      }
    }
    expect(Object.fromEntries(misses)).toEqual(Object.fromEntries(Object.keys(KNOWN_MISSES).map((key) => [key, misses.get(key) ?? 'met'])));
    expect(Object.fromEntries(physics)).toEqual(Object.fromEntries(Object.keys(PHASE5_MISSES).map((key) => [key, physics.get(key) ?? 'met'])));
  }, 900_000);
});
