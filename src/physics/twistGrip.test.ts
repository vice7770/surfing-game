import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { surfZoneConfigFor, twistGripSwitch } from '../game/PhysicalMode';
import { physicalSettingsFor } from '../game/SurfConditions';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { RideSession } from './RideSession';
import { REFERENCE_RIDER } from './boardReference';
import { createWaterSample, type SurfWater } from './SurfWater';
import { FaceWater } from './testing/FaceWater';

/**
 * **Step 3.5k — `?twistGrip=feet`: the twist's end stop bounded by the same foot grip its active torque already is.**
 *
 * These tests prove the MECHANISM and the CHAIN. ⚠️ They do not and cannot prove the switch reaches a running
 * session: `?bodyBank=hip` parsed zero times in a real session while its own tests passed. That is what
 * `docs/research/new-rider/3.5/twist-grip-ride.ts` is for, in `MODE=parse|session|sea`.
 */

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** The stop's own constants, restated so these tests check the clamp against the formula and not against itself. */
const TWIST_BODY_RANGE = 0.87;
const FOOT_FRICTION = 0.9;
const TWIST_GRIP_SPAN = 0.315;
const TWIST_BODY_TORQUE = 100;
const TWIST_STIFFNESS = 20;
const TWIST_DAMPING = 3;
const TWIST_STOP = 2000;
const TWIST_STOP_DAMPING = 50;
/** `NEW_STANDING_SUBSTEPS` = 16 substeps a frame, so the implicit solve's own h. */
const SUBSTEP = STEP / 16;
/** Canyon B's own calibration (#223), the face every probe in 3.5 rides. */
const FACE = { depth: 6, height: 1.4, slope: 16, crestZ: 0, vertical: 'surface' as const };
const RIDER_OPTS = { rider: 'new' as const, feltFrame: 'deck' as const, riderBody: 'two' as const, stanceReach: 'keep' as const, deepen: 'on' as const };
const scratch = createWaterSample();

interface Frame { t: number; angle: number; rate: number; drawn: number; ask: number; got: number; bound: number; slips: number; substeps: number; alpha: number; torque: number; active: number }

/** `3.5/bank.ts`'s own flush placement on the calibrated face, then `seconds` of ride, one read a frame. */
function ride(twistGrip: 'feet' | undefined, stance: 'tall' | 'crouch' | 'compress', steer: number, seconds = 4): Frame[] {
  const water = new FaceWater(FACE);
  const z = water.front * 0.5;
  const sy = water.surfaceAt(0, z);
  const here = water.sampleAt(0, sy, z, scratch);
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const fall = new Vector3(here.slopeX, 0, here.slopeZ);
  if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
  fall.normalize();
  const heading = (Math.atan2(fall.x, fall.z) * DEG - 45) / DEG;
  const level = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  const forward = level.clone().addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(0, sy, z).addScaledVector(normal, board.shape.centerOfMass.y - 0.06),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(5.7).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing', ...RIDER_OPTS, ...(twistGrip ? { twistGrip } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  rider.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rider.compress = stance === 'compress' ? 1 : 0;
  rider.steer = steer;
  const w: SurfWater = water;
  const frames: Frame[] = [];
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    board.step(STEP, w);
    water.advance(STEP);
    if (!rider.attached) break;
    const tb = rider.twistBody;
    const l = rider.twistStopLedger;
    frames.push({
      t: (i + 1) * STEP, angle: tb.angle, rate: tb.rate, drawn: rider.drawnTwist, ask: l.ask, got: l.got,
      bound: l.bound, slips: l.slips, substeps: l.substeps, alpha: tb.alpha, torque: tb.torque, active: tb.active,
    });
  }
  return frames;
}

describe('?twistGrip=feet — the switch itself', () => {
  it('takes only `feet`, trimmed and case-folded, and nothing else', () => {
    expect(twistGripSwitch('?twistGrip=feet')).toEqual({ twistGrip: 'feet' });
    expect(twistGripSwitch('?twistGrip=FEET')).toEqual({ twistGrip: 'feet' });
    expect(twistGripSwitch('?twistGrip=%20feet%20')).toEqual({ twistGrip: 'feet' });
    for (const v of ['on', 'yes', '1', 'true', 'off', 'grip', '']) {
      expect(twistGripSwitch(`?twistGrip=${v}`), v).toEqual({});
    }
    expect(twistGripSwitch('')).toEqual({});
    expect(twistGripSwitch('?rider=new')).toEqual({});
  });

  it('survives every hop from a search string to the rider a RideSession builds', () => {
    const settings = () => physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'offshore', time: 'midday' }, { stage: 2, compute: 'cpu' });
    // ⭐ The owner's own address, which is where this has to work.
    const owner = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
    for (const [search, want] of [[owner, undefined], [`${owner}&twistGrip=feet`, 'feet']] as const) {
      (globalThis as { location?: { search: string } }).location = { search };
      const config = surfZoneConfigFor(settings(), 5, false);
      expect(config.twistGrip, search).toBe(want);
      // `SurfZoneRunner`'s own forwarding expression — the hop a `swing` option was once silently dropped in.
      const forwarded = { ...(config.twistGrip ? { twistGrip: config.twistGrip } : {}) };
      expect(forwarded.twistGrip, search).toBe(want);
      const session = new RideSession({ ...RIDER_OPTS, ...forwarded } as ConstructorParameters<typeof RideSession>[0]);
      // Read off the OBJECT the host built, never off the string handed in.
      expect(session.rider.twistStopBounded, search).toBe(want === 'feet');
    }
  });
});

describe('`legLoad` and the grip bound it builds', () => {
  it('is the WHOLE body load through both feet, not one leg\'s: m g at rest, so 0.9 × 716 × 0.315 = 203 N·m', () => {
    // `legLoad = mass × max(0, specificForce · up)` with `mass = REFERENCE_RIDER.mass`, the whole rider, so at one
    // body weight along the leg line it is m g = 716 N — the same 716 N `LEAN_IN_RATE`'s own note uses for the
    // feet's moment. The couple two feet at ±TWIST_GRIP_SPAN make is 2 × (μ legLoad / 2) × span = μ legLoad span,
    // so the expression at `predictiveBank` IS a two-foot couple with the total load, and is self-consistent.
    const atRest = FOOT_FRICTION * REFERENCE_RIDER.mass * 9.81 * TWIST_GRIP_SPAN;
    expect(atRest).toBeGreaterThan(200);
    expect(atRest).toBeLessThan(207);
    // Ridden, the live bound sits around that: the median over a loaded crouch is within a factor of two of 203.
    const frames = ride('feet', 'crouch', 0).filter((k) => k.bound > 0);
    expect(frames.length).toBeGreaterThan(10);
    const bounds = frames.map((k) => k.bound).sort((a, b) => a - b);
    const median = bounds[Math.floor(bounds.length / 2)];
    expect(median).toBeGreaterThan(100);
    expect(median).toBeLessThan(410);
  });
});

describe('the clamp', () => {
  it('off the switch, delivers exactly what the stop asks — however much that is', () => {
    let past = 0;
    let peakAsk = 0;
    for (const stance of ['tall', 'crouch', 'compress'] as const) for (const steer of [0, 1, -1]) {
      for (const k of ride(undefined, stance, steer)) {
        expect(k.got).toBe(k.ask);
        expect(k.slips).toBe(0);
        if (Math.abs(k.angle) > TWIST_BODY_RANGE) past += 1;
        peakAsk = Math.max(peakAsk, k.ask);
      }
    }
    // ⛔ A run that never reaches the stop proves nothing, so the population past it is asserted, not assumed.
    expect(past).toBeGreaterThan(20);
    // And the defect itself: the shipped stop asks the feet for more than the ACTIVE torque's own bound.
    expect(peakAsk).toBeGreaterThan(TWIST_BODY_TORQUE);
  });

  it('on the switch, never delivers more than the feet\'s grip, and does bite', () => {
    let slipped = 0;
    let past = 0;
    for (const stance of ['tall', 'crouch', 'compress'] as const) for (const steer of [0, 1, -1]) {
      const frames = ride('feet', stance, steer);
      for (const k of frames) {
        expect(k.got).toBeLessThanOrEqual(k.bound + 1e-9);
        if (Math.abs(k.angle) > TWIST_BODY_RANGE) past += 1;
      }
      slipped += frames.length ? frames[frames.length - 1].slips : 0;
    }
    expect(past).toBeGreaterThan(20);
    expect(slipped).toBeGreaterThan(0);
  });

  it('removes a torque and adds none: `got` is `ask` or the bound, never more than either', () => {
    for (const stance of ['tall', 'crouch', 'compress'] as const) for (const steer of [0, 1, -1]) {
      for (const k of ride('feet', stance, steer)) {
        expect(k.got).toBeLessThanOrEqual(Math.max(k.ask, 0) + 1e-9);
        expect(k.got === k.ask || Math.abs(k.got - k.bound) < 1e-9).toBe(true);
      }
    }
  });
});

describe('the implicit solve stays consistent with the torque actually applied', () => {
  /**
   * ⭐ **The task's main technical risk, settled by an exact assertion.** `coupleYaw` is an implicit solve: the stop's
   * stiffness and damping sit in the system matrix through `alpha = h (k h + c)` as well as in `tb.spring`. Clamping
   * `tb.spring` alone would leave the matrix predicting a torque the joint no longer delivers. So the stop leaves
   * `alpha` at the same moment it leaves the torque, and `alpha` then has only ONE of two possible values — which is
   * a fact about the matrix, testable to the digit.
   */
  const inside = SUBSTEP * (TWIST_STIFFNESS * SUBSTEP + TWIST_DAMPING);
  const stopped = SUBSTEP * ((TWIST_STIFFNESS + TWIST_STOP) * SUBSTEP + TWIST_DAMPING + TWIST_STOP_DAMPING);

  it('off the switch, a frame past the stop carries the stop\'s own stiffness in the matrix', () => {
    const frames = ride(undefined, 'crouch', 0).filter((k) => Math.abs(k.angle) > TWIST_BODY_RANGE && k.ask > 0);
    expect(frames.length).toBeGreaterThan(5);
    for (const k of frames) expect(k.alpha).toBeCloseTo(stopped, 12);
  });

  it('on the switch, a SLIPPING frame carries the base joint\'s stiffness alone — the matrix moved with the torque', () => {
    const all = ride('feet', 'crouch', 0);
    // A frame whose last substep slipped: its `got` is the bound and below its own `ask`.
    const slipping = all.filter((k) => k.ask > k.got + 1e-9);
    expect(slipping.length).toBeGreaterThan(0);
    for (const k of slipping) {
      expect(k.alpha).toBeCloseTo(inside, 12);
      expect(k.alpha).toBeLessThan(stopped / 10);
    }
    // And a frame past the stop that did NOT slip is untouched: the stick branch is the shipped one.
    const sticking = all.filter((k) => Math.abs(k.angle) > TWIST_BODY_RANGE && k.ask > 0 && Math.abs(k.ask - k.got) < 1e-9);
    for (const k of sticking) expect(k.alpha).toBeCloseTo(stopped, 12);
  });

  it('so the DELIVERED joint torque is bounded too, not just the spring term', () => {
    // `tb.torque = spring + alpha θ̇_new / h`. In slip that is the saturation torque plus the ACTIVE torque and the
    // BASE joint's own spring and damper — each separately bounded — and nothing else. This is the number that
    // would still have run away had only `tb.spring` been clamped.
    for (const k of ride('feet', 'crouch', 0)) {
      if (!(k.ask > k.got + 1e-9)) continue;
      const base = TWIST_STIFFNESS * Math.abs(k.angle) + (TWIST_STIFFNESS * SUBSTEP + TWIST_DAMPING) * Math.abs(k.rate);
      expect(Math.abs(k.torque)).toBeLessThanOrEqual(k.bound + Math.min(TWIST_BODY_TORQUE, k.bound) + base + 1e-6);
    }
  });
});

describe('the pose, since the torso\'s twist is drawn', () => {
  it('`drawnTwist` is the twist itself for the new surfer, so a moved clamp is a moved pose', () => {
    const off = ride(undefined, 'crouch', 0);
    const on = ride('feet', 'crouch', 0);
    for (const k of [...off, ...on]) expect(k.drawn).toBeCloseTo(k.angle, 12);
    const peak = (fs: Frame[]): number => fs.reduce((m, k) => Math.max(m, Math.abs(k.drawn)), 0);
    // This cell reaches the stop and slips, so the two arms must NOT draw the same torso.
    expect(on.some((k) => k.ask > k.got + 1e-9)).toBe(true);
    expect(Math.abs(peak(on) - peak(off))).toBeGreaterThan(1e-6);
  });

  it('a cell that never reaches the stop draws an identical pose, frame for frame', () => {
    const off = ride(undefined, 'tall', 1);
    const on = ride('feet', 'tall', 1);
    expect(off.length).toBe(on.length);
    expect(off.every((k) => Math.abs(k.angle) <= TWIST_BODY_RANGE)).toBe(true);
    for (let i = 0; i < off.length; i += 1) expect(on[i].drawn).toBe(off[i].drawn);
  });
});
