import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider, LEG_POWER_HELD, LEG_POWER_WINDOW, type AttachedRiderOptions } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { WATER } from './hullForces';
import { PlaneWater } from './PlaneWater';
import { kneeStrength } from './standingBody';

// The new surfer's step 3.1 (`rider: 'new'`, the `?rider=new` dev switch; docs/research/new-rider/3.1): standing, the
// body is free along the board too (a ninth unknown in the board's solve) and leans with the face on its pitch ankle;
// the knees have a strength cap in place of MAX_LOAD. Every other phase is the old rider's.

const STEP = 1 / 60;
const WEIGHT = 73 * WATER.gravity;

/** A board placed on a planar face of `angle`° (falling toward +z), heading straight down it (or up, `up`), at `speed`. */
function onFace(angle: number, phase: 'standing' | 'prone', options: AttachedRiderOptions, speed: number, up = false) {
  const slope = -Math.tan((angle * Math.PI) / 180);
  const water = new PlaneWater({ slopeZ: slope });
  const normal = new Vector3(0, 1, -slope).normalize();
  const down = new Vector3(0, 0, 1).addScaledVector(normal, -normal.z).normalize();
  const forward = up ? down.clone().negate() : down;
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase, ...options });
  board.attach(rider);
  return { board, rider, water };
}

describe('the new surfer standing (rider: new, step 3.1)', () => {
  it('caps the legs\' push at the knees\' strength, weaker as they bend (the design\'s 3.0, 2.25, 2.1 and 1.9 body weights)', () => {
    // The hip–ankle line standing (pelvis 0.78 m), the pumping crouch (0.195 m down), Compress (0.3 m) and the tuck (0.45 m).
    expect(kneeStrength(0.705) / WEIGHT).toBeCloseTo(3.0, 1);
    expect(kneeStrength(0.51) / WEIGHT).toBeCloseTo(2.25, 1);
    expect(kneeStrength(0.405) / WEIGHT).toBeCloseTo(2.1, 1);
    expect(kneeStrength(0.255) / WEIGHT).toBeCloseTo(1.94, 1);
    expect(kneeStrength(0.9)).toBe(Infinity);
  });

  it('stands free along the board, and lying down is the old rider\'s step for step', () => {
    const standing = onFace(0, 'standing', { rider: 'new' }, 7);
    standing.board.step(STEP, standing.water);
    expect(standing.rider.freeBody).toBe(true);
    expect(onFace(0, 'standing', {}, 7).rider.freeBody).toBe(false);
    const positions = (options: AttachedRiderOptions) => {
      const { board, rider, water } = onFace(0, 'prone', options, 0);
      rider.paddle = true;
      const out: number[] = [];
      for (let n = 0; n < 120; n += 1) {
        board.step(STEP, water);
        out.push(board.position.x, board.position.y, board.position.z, rider.position.x, rider.position.y, rider.position.z);
      }
      expect(rider.freeBody).toBe(false);
      return out;
    };
    expect(positions({ rider: 'new' })).toEqual(positions({}));
  });

  it('holds a start placed straight down a 35° face, where the old rider is thrown, within the legs\' power', () => {
    for (const options of [{}, { rider: 'new' as const }]) {
      const { board, rider, water } = onFace(35, 'standing', options, 6);
      const works: number[] = [];
      const inner = rider as unknown as { finish: (h: number, b: BoardBody) => void };
      const finish = inner.finish.bind(rider);
      inner.finish = (h, b) => {
        const before = board.work.rider + rider.work.contact;
        finish(h, b);
        works.push(board.work.rider + rider.work.contact - before);
      };
      let fellAt = Infinity;
      for (let n = 0; n < 60 && fellAt === Infinity; n += 1) {
        board.step(STEP, water);
        if (!rider.attached) fellAt = (n + 1) * STEP;
      }
      if (!options.rider) {
        expect(fellAt).toBeLessThan(0.15);
        continue;
      }
      expect(fellAt).toBe(Infinity);
      // The most net work over any 0.5 s (the new surfer's standing substeps a frame, step 3.2), within A-lite's held power.
      const per = Math.round(LEG_POWER_WINDOW / (STEP / (rider.standingSubsteps ?? 32)));
      let most = 0;
      for (let k = 0; k + per <= works.length; k += 1) most = Math.max(most, works.slice(k, k + per).reduce((a, b) => a + b, 0));
      expect(most).toBeLessThanOrEqual(LEG_POWER_HELD * rider.mass * LEG_POWER_WINDOW + 1);
    }
  });

  it('leans with a 20° face going down it, so the board trims flatter and gains speed (bar N2)', () => {
    const { board, rider, water } = onFace(20, 'standing', { rider: 'new' }, 4);
    for (let n = 0; n < 150; n += 1) board.step(STEP, water);
    expect(rider.attached).toBe(true);
    const normal = new Vector3(0, 1, Math.tan((20 * Math.PI) / 180)).normalize();
    const trim = (Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).dot(normal)) * 180) / Math.PI;
    expect(trim).toBeLessThan(10);
    expect(board.velocity.length() - 4).toBeGreaterThan(3);
  });
});

describe('the new surfer\'s yaw inertia (rider: new, step 3.2b)', () => {
  it('turns its own yaw inertia with the board through the feet (the lower share; the upper on the twist), slowing the board\'s answer to a couple; the old rider has none', () => {
    const answer = (options: AttachedRiderOptions) => {
      const { board, rider, water } = onFace(11, 'standing', options, 7);
      for (let n = 0; n < 60; n += 1) board.step(STEP, water);
      expect(rider.attached).toBe(true);
      const inner = rider as unknown as { coupleYaw: (s: Float64Array, r: Float64Array, b: BoardBody) => void; prepare: (h: number, b: BoardBody, w: unknown) => void };
      let h = 0;
      const prepare = inner.prepare.bind(rider);
      inner.prepare = (step, b, w) => { h = step; prepare(step, b, w); };
      const couple = inner.coupleYaw.bind(rider);
      const up = new Vector3();
      inner.coupleYaw = (s, r, b) => {
        couple(s, r, b);
        up.set(0, 1, 0).applyQuaternion(b.orientation);
        r[3] += h * 2 * up.x; r[4] += h * 2 * up.y; r[5] += h * 2 * up.z;
      };
      const before = board.angularVelocity.dot(up.set(0, 1, 0).applyQuaternion(board.orientation));
      board.step(STEP, water);
      return { gain: board.angularVelocity.dot(up.set(0, 1, 0).applyQuaternion(board.orientation)) - before, inertia: rider.yawInertia };
    };
    const free = answer({ rider: 'new' });
    const point = answer({ rider: 'new', yawInertiaScale: 0 });
    // Step 3.2e: what the board meets in a substep is the rider's lower share, rigid with it (1.24-1.37 kg·m², tall to
    // Compress), and a small share of the upper body's through the legs' twist; the upper body turns on the twist.
    expect(free.inertia).toBeGreaterThanOrEqual(1.24);
    expect(free.inertia).toBeLessThanOrEqual(1.5);
    expect(point.inertia).toBe(0);
    // A 2 N·m couple for one frame: about 2/60 over the inertia the board meets (its own and the water's, plus the rider's).
    expect(free.gain).toBeGreaterThan(0);
    // (3.2b's whole body made it 2.5 times; the lower share alone, about 2.)
    expect(point.gain / free.gain).toBeGreaterThan(1.8);
    expect(answer({}).inertia).toBe(0);
  });
});

