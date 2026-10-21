import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import type { StanceName } from '../../physics/riderPosture';
import { BOARD_CENTRE, deckAt, railHalfWidth } from './boardDeck';
import { LEASH } from '../../physics/Leash';
import { FALL_READING } from './fallStages';
import { readGlbSkeleton } from './glbSkeleton';
import type { Side } from './humanoidBones';
import { PosedBody } from './posedBody';
import { POINT, type RiderVisualState } from './riderVisualState';
import { StanceGauge, type StanceAngles, type StanceJoints } from './stanceGauge';
import { FALL_POSES } from './stagePoses';

const SIDES: readonly Side[] = ['left', 'right'];
const at = new Vector3(0, 0.03, 0);
const skeleton = (surfer: string) => {
  const bytes = readFileSync(`public/assets/surfers/${surfer}.glb`);
  return readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).bones;
};

interface Frame { time: number; since: number; state: RiderVisualState; angles: StanceAngles; joints: StanceJoints; body: PosedBody }

/** A recipe drawn on surfer2 as the page draws it, each fallen frame measured: `visit` sees it (its time into the fall). */
function drawnFall(recipe: StanceRecipe, stance: StanceName, visit: (frame: Frame) => void): void {
  const bones = skeleton('surfer2');
  const gauge = new StanceGauge(bones);
  const body = new PosedBody(bones);
  let fallAt = Number.NaN;
  drawnRecipe(recipe, stance, at, (state) => {
    body.update(state);
    if (state.phase !== 'fallen') return;
    if (Number.isNaN(fallAt)) fallAt = state.clock;
    visit({ time: state.clock, since: state.clock - fallAt, state, angles: gauge.measure(state, stance), joints: gauge.joints(), body });
  });
}

const flexion = (included: number) => 180 - included;

// The animation-realism plan's §7 and phase 4: the reflexes over the ragdoll, its shape by cause, surfacing, the reel
// and the climb, drawn only.
describe('the fall\'s reflexes over the ragdoll (the animation-realism plan, phase 4)', () => {
  it.each(['regular', 'goofy'] as const)('shields the head (%s): the forearms over it by half a second into a fall to the side, held while under water and tumbling', (stance) => {
    let first = Number.NaN;
    const after: number[] = [];
    drawnFall({ ...STANCE_RECIPES['fall-side'], after: 2 }, stance, ({ since, angles }) => {
      if (Number.isNaN(first) && angles.wristsToHead <= 0.25) first = since;
      if (since >= 0.5 && since <= 2) after.push(angles.wristsToHead);
    });
    expect(first).toBeGreaterThan(FALL_READING.onset);
    expect(first).toBeLessThan(0.5);
    // Held: all but the frames the body flips over entering the water (the bones' smoothing a few frames behind it).
    after.sort((x, y) => x - y);
    expect(after[Math.floor(0.9 * after.length)]).toBeLessThan(0.25);
    expect(after.at(-1)!).toBeLessThan(0.4);
  });

  it('keeps each drawn arm\'s middle within an arm\'s reach of the physics\' arm point (the ragdoll still reads), and the arms on their own sides', () => {
    let worst = 0;
    let crossedArms = 0;
    let frames = 0;
    drawnFall({ ...STANCE_RECIPES['fall-side'], after: 3 }, 'regular', ({ since, joints, state, body }) => {
      if (since < FALL_READING.settle) return;
      frames += 1;
      for (const side of SIDES) {
        const middle = joints.shoulder[side].clone().add(joints.wrist[side]).multiplyScalar(0.5);
        worst = Math.max(worst, middle.distanceTo(state.points[side === 'left' ? POINT.leftHand : POINT.rightHand]) / body.rig.armLength);
      }
      // No hand past the other shoulder (the forearms cross a little in the cage, by design). Before, each arm reached for
      // the point of its name, on the body's other side, across the chest, the whole fall.
      const left = new Vector3().crossVectors(joints.neck.clone().sub(joints.spine).normalize(), joints.chestFacing).normalize();
      const across = (side: Side) => joints.wrist[side].clone().sub(joints.shoulder[side === 'left' ? 'right' : 'left']).dot(left) * (side === 'left' ? 1 : -1);
      if (SIDES.some((side) => across(side) < -0.1)) crossedArms += 1;
    });
    // Kept to it as solved; drawn, the bones' smoothing a little behind.
    expect(worst).toBeLessThanOrEqual(1.1);
    expect(crossedArms / frames).toBeLessThan(0.05);
  });

  it('balls up going over the falls (the lip\'s cause): the knees to the chest, flexed 100° or more, the hips 90° or more, the forearms over the head', () => {
    let reading: StanceAngles | undefined;
    drawnFall(STANCE_RECIPES['fall-over'], 'regular', ({ angles }) => { reading = angles; });
    expect(flexion(reading!.kneeFront)).toBeGreaterThanOrEqual(100);
    expect(flexion(reading!.kneeRear)).toBeGreaterThanOrEqual(100);
    expect(flexion(reading!.hipFront)).toBeGreaterThanOrEqual(90);
    expect(flexion(reading!.hipRear)).toBeGreaterThanOrEqual(90);
    expect(reading!.wristsToHead).toBeLessThanOrEqual(0.25);
  });

  it('curls loosely while tumbling: the knees flexed 60–110° (Rapture: go limp)', () => {
    let reading: StanceAngles | undefined;
    let curl = 0;
    drawnFall(STANCE_RECIPES['fall-tumble'], 'regular', ({ angles, body }) => {
      reading = angles;
      curl = body.rig.fallWeights.curl;
    });
    expect(curl).toBeGreaterThan(0.9);
    for (const knee of [reading!.kneeFront, reading!.kneeRear]) {
      expect(flexion(knee)).toBeGreaterThanOrEqual(60);
      expect(flexion(knee)).toBeLessThanOrEqual(110);
    }
  });

  it('draws a shape for each cause: the cage to the side, the arms thrown up round the head in a pearl, out and back off the back', () => {
    const wrists = (id: string, after?: number) => {
      const reading = { up: 0, apart: 0, shape: '' };
      drawnFall({ ...STANCE_RECIPES[id], after: after ?? STANCE_RECIPES[id].after }, 'regular', ({ joints, body }) => {
        const up = joints.neck.clone().sub(joints.spine).normalize();
        reading.up = joints.wrist.left.clone().add(joints.wrist.right).multiplyScalar(0.5).sub(joints.neck).dot(up);
        reading.apart = joints.wrist.left.distanceTo(joints.wrist.right);
        reading.shape = body.rig.fallWeights.shape;
      });
      return reading;
    };
    // The cage read once the body has gone in (0.5 s in, it flips over entering the water and the wrists, at the head
    // by 0.45 s, cross by 0.75).
    const side = wrists('fall-side', 0.8);
    const pearl = wrists('fall-pearl');
    const back = wrists('fall-back');
    expect([side.shape, pearl.shape, back.shape]).toEqual(['side', 'pearl', 'back']);
    // The cage: the forearms crossed before the head; the pearl's arms round it, apart; off the back, out wide.
    expect(side.apart).toBeLessThan(0.2);
    expect(pearl.apart).toBeGreaterThan(side.apart + 0.05);
    expect(back.apart).toBeGreaterThan(pearl.apart + 0.2);
  });

  it('goes in feet first from riding: the ankles under the hips while in the air', () => {
    let lowest = 0;
    let air = 0;
    drawnFall({ ...STANCE_RECIPES['fall-side'], after: 0.5 }, 'regular', ({ since, joints, body }) => {
      air = Math.max(air, body.rig.fallWeights.air);
      if (since < 0.25 || body.rig.fallWeights.air < 0.6) return;
      const hips = joints.hip.left.clone().add(joints.hip.right).multiplyScalar(0.5);
      lowest = Math.max(lowest, (hips.y - Math.max(joints.ankle.left.y, joints.ankle.right.y)) / body.rig.legLength);
    });
    expect(air).toBeGreaterThan(0.6);
    expect(lowest).toBeGreaterThan(0.75);
  });

  it('surfaces with the arms crossed overhead: the wrists over the head (0–0.25 m) while it rises under water', () => {
    let reading: StanceAngles | undefined;
    let surfacing = 0;
    drawnFall(STANCE_RECIPES.surfacing, 'regular', ({ angles, body }) => {
      reading = angles;
      surfacing = body.rig.fallWeights.surfacing;
    });
    expect(surfacing).toBeGreaterThan(0.9);
    expect(reading!.wristsOverHead).toBeGreaterThanOrEqual(0);
    expect(reading!.wristsOverHead).toBeLessThanOrEqual(0.25);
  });

  it('once up treads water, the head lifted and turning to the board, then round for the next wave', () => {
    const turned: number[] = [];
    let nearer = 0;
    let up = 0;
    let trunk = 90;
    drawnFall({ ...STANCE_RECIPES.surfacing, seconds: 9 }, 'regular', ({ body, joints, state, angles }) => {
      up = body.rig.fallWeights.surfaced;
      if (up < 0.99) return;
      trunk = Math.min(trunk, angles.sitTrunk);
      // The head's turn from the chest about the up, °, and how much nearer the board's bearing it looks than the chest faces.
      const level = (v: Vector3) => v.clone().setY(0).normalize();
      const chest = level(joints.chestFacing);
      const face = level(joints.headFacing);
      turned.push((Math.atan2(new Vector3().crossVectors(chest, face).y, chest.dot(face)) * 180) / Math.PI);
      const toBoard = level(state.boardPosition.clone().sub(joints.head));
      nearer = Math.max(nearer, (Math.acos(Math.max(-1, Math.min(1, chest.dot(toBoard)))) - Math.acos(Math.max(-1, Math.min(1, face.dot(toBoard))))) * 180 / Math.PI);
    });
    expect(up).toBeGreaterThan(0.99);
    // Treading water, upright over the physics' floating body (within its 60° of it).
    expect(trunk).toBeLessThan(45);
    // The head turned toward the board past the chest, and scanning round (the next wave): it turns through 40° or more.
    expect(nearer).toBeGreaterThan(20);
    expect(Math.max(...turned) - Math.min(...turned)).toBeGreaterThan(30);
  });

  it.each([['regular', 'right'], ['goofy', 'left']] as const)('reels hand over hand (%s), the back foot\'s hand first: 0.8–1.5 pulls a second, the cord drawn from the pulling hand, the trunk within 30° of the vertical', (stance, first) => {
    const grips: { time: number; side: string }[] = [];
    let trunk = 90;
    let reelFrom = Number.NaN;
    drawnFall({ ...STANCE_RECIPES.reel, seconds: 6.2 }, stance, ({ time, state, angles, body }) => {
      if (Number.isNaN(reelFrom) && body.rig.fallWeights.reel > 0) reelFrom = time;
      if (!state.leash.gripped) return;
      const side = SIDES.find((s) => body.rig.joints.wrist[s].distanceTo(state.leash.grip) < 1e-6) ?? '?';
      if (grips.at(-1)?.side !== side) grips.push({ time, side });
      if (body.rig.fallWeights.reel > 0.99) trunk = Math.min(trunk, angles.sitTrunk);
    });
    expect(grips[0].side).toBe(first);
    // The leash comes in (1.83 m to its 0.8 m reach at 0.6 m/s) in about a second: a pull or two, each a pull's length
    // at the leash's rate (1.3 pulls a second, the plan's 0.8–1.5), the hands taking turns.
    const pulls = LEASH.reelRate / FALL_POSES.reel.pull;
    expect(pulls).toBeGreaterThanOrEqual(0.8);
    expect(pulls).toBeLessThanOrEqual(1.5);
    expect(grips.length).toBeGreaterThanOrEqual(2);
    expect(grips[1].time - reelFrom).toBeCloseTo(1 / pulls, 1);
    expect(grips.every((grip, i) => i === 0 || grip.side !== grips[i - 1].side)).toBe(true);
    expect(trunk).toBeLessThanOrEqual(30);
  });

  it('climbs on from the side: both hands on the near rail by its middle as the swimmer comes beside it, the chest over the deck before the legs swing on, the prone pose easing in over 0.4 s', () => {
    // The slow fall's swimmer reels in and grabs the board at 16.3 s; it comes on at about 17.5 s.
    const recipe: StanceRecipe = { phase: 'prone', water: 'flat', start: 'standing', speed: 2, separate: 0.5, controls: [{ at: 3, reel: true }], seconds: 18.4 };
    const bones = skeleton('surfer2');
    const gauge = new StanceGauge(bones);
    const body = new PosedBody(bones);
    let bestGrip = Number.POSITIVE_INFINITY;
    let chestOn = Number.NaN;
    let feetOn = Number.NaN;
    let prone = Number.NaN;
    let fastestFoot = 0;
    const lastAnkles = SIDES.map(() => new Vector3());
    let lastTime = Number.NaN;
    drawnRecipe(recipe, 'regular', at, (state) => {
      body.update(state);
      if (state.clock < 15) return;
      const joints = gauge.joints();
      const inverse = state.boardQuaternion.clone().invert();
      const shape = (v: Vector3) => v.clone().sub(state.boardPosition).applyQuaternion(inverse).add(BOARD_CENTRE);
      const over = (v: Vector3) => {
        const s = shape(v);
        return Math.abs(s.x) < railHalfWidth(s.z) && s.y > deckAt(s.z) - 0.1;
      };
      if (state.phase === 'fallen' && body.rig.fallWeights.climb > 0.99) bestGrip = Math.min(bestGrip, gauge.measure(state, 'regular').railGrip);
      if (Number.isNaN(chestOn) && over(joints.spine.clone().add(joints.neck).multiplyScalar(0.5))) chestOn = state.clock;
      if (Number.isNaN(feetOn) && over(joints.ankle.left) && over(joints.ankle.right)) feetOn = state.clock;
      if (Number.isNaN(prone) && state.phase === 'prone') prone = state.clock;
      // On the board, the feet swing on (the board's frame), never flung.
      if (state.phase === 'prone' && Number.isFinite(lastTime)) {
        SIDES.forEach((side, i) => { fastestFoot = Math.max(fastestFoot, shape(joints.ankle[side]).distanceTo(lastAnkles[i]) / (state.clock - lastTime)); });
      }
      SIDES.forEach((side, i) => lastAnkles[i].copy(shape(joints.ankle[side])));
      lastTime = state.clock;
    });
    expect(Number.isFinite(prone)).toBe(true);
    expect(bestGrip).toBeLessThan(0.15);
    expect(chestOn).toBeLessThan(feetOn);
    expect(feetOn - prone).toBeGreaterThan(0.1);
    expect(feetOn - prone).toBeLessThanOrEqual(FALL_POSES.climb.on + 0.05);
    expect(fastestFoot).toBeLessThan(6);
  });

  it('swims with the head lifted to sight the board every five strokes (the plan\'s 4–6), the crawl as it was', () => {
    const recipe: StanceRecipe = { phase: 'fallen', water: 'flat', start: 'prone', speed: 0, separate: 0.5, controls: [{ at: 1, swim: true }], seconds: 16 };
    const sights: number[] = [];
    let looking = false;
    drawnFall(recipe, 'regular', ({ time, joints, state }) => {
      // The face turned forward along the heading (a sight), not down at the water nor to the side (a breath).
      const forward = joints.headFacing.dot(new Vector3(Math.sin(state.heading), 0, Math.cos(state.heading)));
      if (!looking && forward > 0.6) sights.push(time);
      looking = forward > 0.6;
    });
    expect(sights.length).toBeGreaterThanOrEqual(2);
    // Five strokes (both arms) at the crawl's 0.38 cycles a second: 6.6 s.
    const every = FALL_POSES.sight.every / (2 * 0.38);
    for (let i = 1; i < sights.length; i += 1) expect(sights[i] - sights[i - 1]).toBeCloseTo(every, 0);
  });
});
