import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { LANDING_TIME, PUSH_TIME } from '../../physics/AttachedRider';
import { PlaneWater } from '../../physics/PlaneWater';
import { RideSession, type RideInput } from '../../physics/RideSession';
import { RIDER_SNAPSHOT, writeRiderSnapshot } from '../../wave/SurfZoneRunner';
import { BOARD_CENTRE, deckAt, railHalfWidth } from './boardDeck';
import { BONES, type Side } from './humanoidBones';
import { PosedBody } from './posedBody';
import { posturePoints } from './posturePoints';
import { RiderMotion } from './riderMotion';
import { POINT, createRiderVisualState, readRiderSnapshot, type RiderVisualState } from './riderVisualState';
import { WATER_READING, WaterStages } from './stageBlend';
import { StanceGauge } from './stanceGauge';
import { SIT, TAKE_OFF, sitScan } from './stagePoses';
import { createTestHumanoid } from './testHumanoid';

const STEP = 1 / 60;
const SIDES: readonly Side[] = ['left', 'right'];

/** A prone state at rest on a level board (the physics' prone posture), its hands at their rest beside the chest. */
function prone(): RiderVisualState {
  return posturePoints('prone', 'regular', new Vector3(0, BOARD_CENTRE.y, 0), new Quaternion(), createRiderVisualState());
}

/** Steps the reader over `seconds` from `from` s, `change` setting the state each step; returns the last weights. */
function read(stages: WaterStages, state: RiderVisualState, from: number, seconds: number, change: (state: RiderVisualState, time: number) => void = () => {}) {
  let time = from;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    time += STEP;
    state.clock = time;
    change(state, time);
    stages.update(state);
  }
  return { ...stages.weights, time };
}

// The animation-realism plan's §6 and phase 3: the water stages read from the drawn prone state, with no new controls.
describe('the water stages\' reader (the animation-realism plan, §6)', () => {
  it('sits after 2 s still, prone, not stroking and the hands at rest, easing in over 0.8 s', () => {
    const stages = new WaterStages();
    const state = prone();
    expect(read(stages, state, 0, WATER_READING.sitAfter - 0.1).sit).toBe(0);
    const half = read(stages, state, WATER_READING.sitAfter - 0.1, 0.5).sit;
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
    expect(read(stages, state, WATER_READING.sitAfter + 0.4, WATER_READING.sitIn).sit).toBe(1);
  });

  it('lies down again on a stroke, a sweep of a hand, a duck or the board moving off, within 0.4 s; the speed\'s hysteresis holds', () => {
    const causes: [string, (state: RiderVisualState) => void][] = [
      ['a stroke', (state) => { state.stroking = 1; }],
      ['a sweep', (state) => { state.points[POINT.leftHand].z += 0.3; }],
      ['a duck', (state) => { state.duck = 0.2; }],
      ['moving off', (state) => { state.speed = 1; }],
    ];
    for (const [cause, change] of causes) {
      const stages = new WaterStages();
      const state = prone();
      const sat = read(stages, state, 0, 3.5);
      expect(sat.sit, cause).toBe(1);
      expect(read(stages, state, sat.time, WATER_READING.sitOut + STEP, change).sit, cause).toBe(0);
    }
    // Between 0.5 and 0.8 m/s: no sit starts, and a sit holds.
    const stages = new WaterStages();
    const drifting = prone();
    expect(read(stages, drifting, 0, 3.5, (state) => { state.speed = 0.6; }).sit).toBe(0);
    const still = prone();
    const sat = read(stages, still, 3.5, 3.5);
    expect(read(stages, still, sat.time, 1, (state) => { state.speed = 0.7; }).sit).toBe(1);
  });

  it('reads the catch from the cue while stroking, or from speed down a nose-down board, and lets go a second after', () => {
    const nose = (degrees: number) => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (degrees * Math.PI) / 180);
    // The cue alone, not stroking: no catch; stroking with it: the catch, whole in 0.3 s.
    {
      const stages = new WaterStages();
      const state = prone();
      const idle = read(stages, state, 0, 1, (s) => { s.cue = true; });
      expect(idle.catch).toBe(0);
      const caught = read(stages, state, idle.time, WATER_READING.catchIn + STEP, (s) => { s.cue = true; s.stroking = 1; });
      expect(caught.catch).toBe(1);
      // The cue gone: held for a second, then let go.
      const held = read(stages, state, caught.time, WATER_READING.catchHold - 0.1, (s) => { s.cue = false; s.stroking = 1; });
      expect(held.catch).toBe(1);
      expect(read(stages, state, held.time, 0.2 + WATER_READING.catchOut + STEP, (s) => { s.cue = false; s.stroking = 1; }).catch).toBe(0);
    }
    // Remote surfers (no cue on the wire): faster than 2.5 m/s and nose down past 5°, the cobra by the pitch.
    const eased = (x: number) => x * x * (3 - 2 * x);
    for (const [speed, pitch, catches] of [[3, 12, true], [3, 3, false], [2, 12, false], [3, 20, true]] as const) {
      const stages = new WaterStages();
      const state = prone();
      state.boardQuaternion.copy(nose(pitch));
      const weights = read(stages, state, 0, 1, (s) => { s.speed = speed; s.stroking = 1; });
      expect(weights.catch, `${speed} m/s, ${pitch}°`).toBe(catches ? 1 : 0);
      // The cobra's depth: the nose-down pitch from 5° to 15°.
      const depth = Math.max(0, Math.min(1, (pitch - WATER_READING.cobraFrom) / (WATER_READING.cobraFull - WATER_READING.cobraFrom)));
      expect(weights.cobra, `${speed} m/s, ${pitch}°`).toBeCloseTo(eased(depth), 3);
    }
  });

  it('looks up every eight strokes, counted at each hand\'s reach, for 0.6 s; not in the catch', () => {
    const stages = new WaterStages();
    const state = prone();
    const reaches: number[] = [];
    let looking = Number.NaN;
    // Each hand along the board through a stroke a second, half a stroke apart (the physics' cycle), as the drawn state carries them.
    const stroke = (s: RiderVisualState, time: number) => {
      s.stroking = 1;
      for (const [index, phase] of [[POINT.leftHand, 0], [POINT.rightHand, 0.5]] as const) s.points[index].z = 0.45 * Math.cos(2 * Math.PI * (time + phase));
    };
    let time = 0;
    for (let i = 0; i < 6 * 60; i += 1) {
      time += STEP;
      state.clock = time;
      stroke(state, time);
      const { scan } = stages.update(state);
      if (scan > 0 && !(looking >= 0)) looking = time;
      if (scan === 0 && looking >= 0) {
        reaches.push(time - looking);
        looking = Number.NaN;
      }
    }
    // Two strokes a second (both arms): a look about every 4 s, each 0.6 s long.
    expect(reaches.length).toBeGreaterThanOrEqual(1);
    for (const span of reaches) expect(span).toBeCloseTo(WATER_READING.scanTime, 1);
    // In the catch, none.
    const catching = new WaterStages();
    const fast = prone();
    expect(read(catching, fast, 0, 6, (s, t) => { stroke(s, t); s.cue = true; }).scan).toBe(0);
  });
});

/** A ride session from rest, every step drawn as the page draws it (the snapshot, its motion, the clock) through `draw`. */
function drawnSession(seconds: number, input: (time: number, session: RideSession) => Partial<RideInput>, draw: (state: RiderVisualState, time: number) => void, water = new PlaneWater()) {
  const session = new RideSession();
  session.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' }, water);
  const state = createRiderVisualState();
  const motion = new RiderMotion();
  const rider = new Float64Array(RIDER_SNAPSHOT.length);
  const board = new Float64Array(8);
  let time = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    const asked = { paddle: false, popUp: false, steer: 0, ...input(time, session) };
    session.step(STEP, water, asked);
    time += STEP;
    writeRiderSnapshot(session, session.rider.attached && session.rider.popUpCue, rider, new Vector3());
    session.board.position.toArray(board, 0);
    session.board.orientation.toArray(board, 3);
    readRiderSnapshot(rider, board, state);
    motion.update(state, time);
    state.clock = time;
    state.stroking = asked.paddle && state.phase === 'prone' ? 1 : 0;
    draw(state, time);
  }
  return session;
}

/** A point in the board shape's frame (about its centre of mass, plus the centre: the deck's heights are there). */
const onBoard = (state: RiderVisualState, point: Vector3) => point.clone().sub(state.boardPosition).applyQuaternion(state.boardQuaternion.clone().invert()).add(BOARD_CENTRE);

describe('the drawn water stages (the animation-realism plan, phase 3)', () => {
  it('sits up when still: straddling, the trunk upright, the hips on the deck, the feet in the water past the rails; and lies down to paddle', () => {
    const { bones } = createTestHumanoid();
    const body = new PosedBody(bones);
    const gauge = new StanceGauge(bones);
    let sat: ReturnType<typeof gauge.measure> | undefined;
    let feet: Vector3[] = [];
    let lying = Number.NaN;
    drawnSession(5, (time) => ({ paddle: time > 3.6 }), (state, time) => {
      body.update(state);
      if (Math.abs(time - 3.6) < STEP / 2) {
        expect(body.rig.waterWeights.sit).toBe(1);
        sat = gauge.measure(state, 'regular');
        feet = SIDES.map((side) => onBoard(state, body.rig.joints.ankle[side]));
      }
      if (time > 3.6 && body.rig.waterWeights.sit === 0 && Number.isNaN(lying)) lying = time - 3.6;
    });
    expect(sat!.sitTrunk).toBeLessThanOrEqual(15);
    expect(sat!.hipsDeck).toBeGreaterThanOrEqual(0.05);
    expect(sat!.hipsDeck).toBeLessThanOrEqual(0.15);
    for (const ankle of feet) {
      expect(ankle.y).toBeLessThan(deckAt(ankle.z) - 0.2);
      expect(Math.abs(ankle.x)).toBeGreaterThan(railHalfWidth(ankle.z));
    }
    // Paddling again, lying down within the sit's way out (0.4 s).
    expect(lying).toBeLessThanOrEqual(WATER_READING.sitOut + 2 * STEP);
  });

  it('scans the sets sitting: the head turned 85° one way and 70° the other over a 5 s cycle, eased', () => {
    expect(sitScan(2.2)).toBeCloseTo(-85, 0);
    expect(sitScan(4.1)).toBeCloseTo(70, 0);
    expect(sitScan(0.4)).toBe(0);
    // Smooth, no faster than a head turns (about 300°/s at most).
    for (let t = 0; t < SIT.scan.cycle; t += STEP) expect(Math.abs(sitScan(t + STEP) - sitScan(t)) / STEP).toBeLessThan(300);
  });

  it('presses up from flat hands planted beside the lower ribs, the elbows straight by 80 % of the push, the hips held low', () => {
    const { bones } = createTestHumanoid();
    const body = new PosedBody(bones);
    const planted: Vector3[][] = [];
    const elbows: { s: number; angle: number }[] = [];
    const hipsLow: number[] = [];
    let since = Number.NaN;
    drawnSession(2.4, (time, session) => {
      if (session.rider.attached && session.rider.phase !== 'standing') {
        session.board.velocity.z = 6;
        session.rider.velocity.z = 6;
      }
      return { popUp: Math.abs(time - 0.5) < STEP / 2 };
    }, (state) => {
      const physicsPelvis = onBoard(state, state.points[POINT.pelvis]).y;
      body.update(state);
      if (state.phase !== 'push') return;
      if (Number.isNaN(since)) since = state.clock;
      const s = (state.clock - since) / PUSH_TIME;
      const j = body.rig.joints;
      if (s > TAKE_OFF.hand.place / PUSH_TIME + 0.05 && s < 0.6) planted.push(SIDES.map((side) => onBoard(state, j.wrist[side])));
      elbows.push({ s, angle: (SIDES.map((side) => j.shoulder[side].clone().sub(j.elbow[side]).angleTo(j.wrist[side].clone().sub(j.elbow[side]))).reduce((a, b) => a + b) / 2) * (180 / Math.PI) });
      // The drawn hips under the physics' pelvis through the press's first half (the point itself is moved: read before).
      if (s > 0.3 && s < 0.5) hipsLow.push(physicsPelvis - onBoard(state, bones.get(BONES.hips)!.getWorldPosition(new Vector3())).y);
    });
    // Planted: each wrist moves under 1 cm over the press.
    for (const side of [0, 1]) {
      const first = planted[0][side];
      for (const frame of planted) expect(frame[side].distanceTo(first)).toBeLessThan(0.01);
    }
    // The elbows deeply bent as the push begins and straight (within 20°) by 80 % of it.
    expect(elbows[0].angle).toBeLessThan(100);
    const straight = elbows.find((entry) => entry.s >= TAKE_OFF.press.straight)!;
    expect(straight.angle).toBeGreaterThan(160);
    expect(Math.min(...hipsLow)).toBeGreaterThan(0.02);
  });

  it('lands the feet together on their stance points at 45°, planted: they do not slide after touchdown, and settle to 60° and 80°', () => {
    const { bones } = createTestHumanoid();
    const body = new PosedBody(bones);
    const gauge = new StanceGauge(bones);
    let landed = Number.NaN;
    const soles: Vector3[][] = [];
    const angles: { t: number; front: number; rear: number }[] = [];
    drawnSession(3, (time, session) => {
      if (session.rider.attached && session.rider.phase !== 'standing') {
        session.board.velocity.z = 6;
        session.rider.velocity.z = 6;
      }
      return { popUp: Math.abs(time - 0.5) < STEP / 2 };
    }, (state) => {
      body.update(state);
      if (state.phase === 'landing' && Number.isNaN(landed)) landed = state.clock;
      if (Number.isNaN(landed)) return;
      const t = state.clock - landed - LANDING_TIME * TAKE_OFF.touch;
      if (t < 0 || t > 1.2) return;
      // Each sole's middle on the deck: between the ankle and the ball of the foot, across and along.
      soles.push(SIDES.map((side) => onBoard(state, body.rig.joints.ankle[side].clone().add(bones.get(BONES.toe[side])!.getWorldPosition(new Vector3())).multiplyScalar(0.5)).setY(0)));
      const read = gauge.measure(state, 'regular');
      angles.push({ t, front: read.footFront, rear: read.footRear });
    });
    for (const side of [0, 1]) {
      for (const frame of soles) expect(frame[side].distanceTo(soles[0][side]), `sole ${side}`).toBeLessThan(0.03);
    }
    expect(angles[0].front).toBeCloseTo(45, 0);
    expect(angles[0].rear).toBeCloseTo(45, 0);
    const settled = angles[angles.length - 1];
    expect(settled.front).toBeCloseTo(60, 0);
    expect(settled.rear).toBeCloseTo(80, 0);
  });
});
