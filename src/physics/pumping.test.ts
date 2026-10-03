import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { BumpWater } from './BumpWater';
import { PlaneWater } from './PlaneWater';
import type { SurfWater } from './SurfWater';

const STEP = 1 / 60;

/**
 * A standing rider planing along +z at `speed` on `water`, with `pump` setting its
 * crouch each step from the board's position along z and the time; the pair's speed,
 * kinetic energy, and the work its leg and gravity did on them after `seconds`.
 */
function ride(water: SurfWater, speed: number, seconds: number, pump: (z: number, time: number) => number) {
  const board = new BoardBody();
  const surface = water.surfaceAt(0, 0);
  const slope = (water.surfaceAt(0, 0.5) - water.surfaceAt(0, -0.5));
  const pitch = Math.atan(-slope);
  board.place(new Vector3(0, surface + board.shape.centerOfMass.y, 0), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pitch), new Vector3(0, -Math.sin(pitch), Math.cos(pitch)).multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  let time = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    rider.crouch = pump(board.position.z, time);
    board.step(STEP, water);
    time += STEP;
  }
  return {
    speed: board.velocity.length(),
    attached: rider.attached,
    kinetic: board.kineticEnergy() + rider.kineticEnergy(),
    leg: rider.work.contact + board.work.rider,
    gravity: rider.work.gravity + board.work.gravity,
  };
}

/**
 * A standing rider S-turning down a still plane (`slope`°, falling toward +z) from `speed` along its fall line: the
 * lean swept from one rail to the other as a pad's stick, sin(2πt / `period`), and the crouch `pump(t)`. Its speed
 * after `seconds`, whether it stayed on, and the gameplay rules' work (the crouch is not Compress: none of them act).
 */
function sTurns(slope: number, speed: number, seconds: number, period: number, pump: (time: number) => number) {
  const tilt = (slope * Math.PI) / 180;
  const normal = new Vector3(0, 1, Math.tan(tilt)).normalize();
  const fall = new Vector3(0, -Math.sin(tilt), Math.cos(tilt));
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(normal, fall), normal, fall)), fall.clone().multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  const water = new PlaneWater({ slopeZ: -Math.tan(tilt) });
  let time = 0;
  for (let i = 0; i < Math.round(seconds / STEP) && rider.attached; i += 1) {
    rider.steer = Math.sin((2 * Math.PI * time) / period);
    rider.crouch = pump(time);
    board.step(STEP, water);
    time += STEP;
  }
  return { speed: board.velocity.length(), attached: rider.attached, rules: rider.work.assist + rider.work.carry + rider.work.leanOut };
}

describe('pumping', () => {
  // Energy enters as work against the load on the feet: extend while it is high (through the hollows),
  // crouch while it is low (over the tops), as in Kogelbauer et al. 2024's half-pipe optimum (the survey's
  // section 3). The pump is timed by where the board is on the bumps, as a surfer times it with the face;
  // a rule on the load itself chases its own motion (extending raises the load that keeps it extending).
  const WAVELENGTH = 12;
  const bumps = new BumpWater({ slopeZ: -Math.tan((15 * Math.PI) / 180), amplitude: 0.15, wavelength: WAVELENGTH });
  const k = (2 * Math.PI) / WAVELENGTH;
  // Crouched going down into a hollow, extending through it and up the far side; the stroke starts a
  // radian early (about 0.2 s here) because the legs take that long to move.
  const LEAD = 1;
  const stroke = (z: number) => 0.5 * Math.sin(k * z + LEAD);
  const timed = (z: number) => 0.5 + stroke(z);
  const mistimed = (z: number) => 0.5 - stroke(z);

  it('gains speed over bumps when timed with the load, and loses it when not', () => {
    const withPump = ride(bumps, 6, 10, timed);
    const steady = ride(bumps, 6, 10, () => 0.5);
    const against = ride(bumps, 6, 10, mistimed);
    expect(withPump.attached && steady.attached && against.attached).toBe(true);
    expect(withPump.speed - steady.speed).toBeGreaterThan(0.1);
    expect(steady.speed - against.speed).toBeGreaterThan(0.1);
    // The legs put the energy in, or take it out.
    expect(withPump.leg).toBeGreaterThan(0);
    expect(against.leg).toBeLessThan(0);
    // Most of the legs' extra work shows up as speed; the rest goes to the drag of a faster, bobbing board
    // (unlike Kogelbauer's wheels, a hull's drag rises with its load). The gain is never more than the
    // legs and the longer descent paid for.
    const gained = withPump.kinetic - steady.kinetic;
    const legs = withPump.leg - steady.leg;
    expect(gained).toBeGreaterThan(0.5 * legs);
    expect(gained).toBeLessThan(legs + withPump.gravity - steady.gravity);
  });

  it('cannot keep a shortboard planing on flat water', () => {
    const flat = new PlaneWater();
    const withPump = ride(flat, 3, 5, (_z, time) => (Math.floor(time * 2) % 2 === 0 ? 1 : 0));
    const without = ride(flat, 3, 5, () => 0);
    expect(Math.abs(withPump.speed - without.speed)).toBeLessThan(0.1);
  });
});

// The movement-flow spec's pumping, weighting and unweighting with the rail changes: S-turns with the lean swept
// from rail to rail once every PERIOD (a rail change a second, as Forsyth et al. 2024's 0.96 s bottom turn), and the
// crouch at twice that frequency. Timed, it is deepest 3/16 of a period after the stick crosses the middle, as the
// body comes upright between the rails (unweighted), and tallest 3/16 after the stick's peak, as the new rail sets
// (weighted): the load comes off the rail change, where the board rides nose-up to its flow (12–15° on the 15° face
// from 6 m/s) and the planing hull's drag per unit of load is highest, and goes back on as the new rail sets. Against
// the best steady stance a timed pump gains 80–110 J of kinetic energy, its legs doing 53–55 J more net work, while
// the hull's pressure drag per metre falls 13–14% and the mean load stays the same (1.04–1.05 body weights). Mistimed
// by half a pump, the load lands on the rail change instead.
describe('pumping through rail changes (the movement-flow spec)', () => {
  const PERIOD = 2;
  const SECONDS = 6;
  const PUMPS = SECONDS / (PERIOD / 2);
  const crouched = (phase: number) => (time: number) => 0.5 + 0.5 * Math.cos((4 * Math.PI * time) / PERIOD + phase);
  const TIMED = (5 * Math.PI) / 4;
  const MISTIMED = Math.PI / 4;

  // The spec's bar: about 0.2–0.6 m/s a pump. Measured: 15° from 6 m/s, 5.98 m/s held steady (crouched) against 7.49
  // timed (+0.25 a pump) and 3.17 mistimed (−0.47); 12° from 7, 4.13 against 5.88 (+0.29) and 1.66 (−0.41). Regular
  // and Goofy, starting either way, give the same numbers.
  it.each([[15, 6], [12, 7]])('down a %i° still face from %i m/s, timed pumps keep over 0.2 m/s a pump more than the best steady stance, and mistimed ones lose it', (slope, speed) => {
    const steady = Math.max(...[0, 0.5, 1].map((crouch) => sTurns(slope, speed, SECONDS, PERIOD, () => crouch).speed));
    const timed = sTurns(slope, speed, SECONDS, PERIOD, crouched(TIMED));
    const mistimed = sTurns(slope, speed, SECONDS, PERIOD, crouched(MISTIMED));
    expect(timed.attached && mistimed.attached).toBe(true);
    expect((timed.speed - steady) / PUMPS).toBeGreaterThan(0.2);
    expect((mistimed.speed - steady) / PUMPS).toBeLessThan(-0.2);
    // Nothing but the rider's own legs and the water: the compressed turn's rules never act.
    expect(timed.rules + mistimed.rules).toBe(0);
  });

  // On flat water the same pumps keep nothing: from 6 m/s both are down to about 3 m/s, where the board drops off the
  // plane, within 1.5 s (timed 3.00 m/s against 2.92 at a steady half crouch).
  it('keeps nothing on flat water: timed S-turn pumps drop off the plane with the steady stance', () => {
    const steady = sTurns(0, 6, 1.5, PERIOD, () => 0.5);
    const timed = sTurns(0, 6, 1.5, PERIOD, crouched(TIMED));
    expect(timed.attached && steady.attached).toBe(true);
    expect(timed.speed).toBeLessThan(3.5);
    expect(Math.abs(timed.speed - steady.speed)).toBeLessThan(0.15);
  });
});
