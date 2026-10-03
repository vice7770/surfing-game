import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { BumpWater } from './BumpWater';
import { PlaneWater } from './PlaneWater';
import type { StanceName } from './riderPosture';
import type { SurfWater } from './SurfWater';

const STEP = 1 / 60;

/**
 * A standing rider (`stance`) planing along +z at `speed` on `water`, with `pump` setting its
 * crouch each step from the board's position along z and the time; the pair's speed,
 * kinetic energy, and the work its leg and gravity did on them after `seconds`, how far it
 * went along z, the hull's pressure work and the gameplay rules' work.
 */
function ride(water: SurfWater, speed: number, seconds: number, pump: (z: number, time: number) => number, stance: StanceName = 'regular') {
  const board = new BoardBody();
  const surface = water.surfaceAt(0, 0);
  const slope = (water.surfaceAt(0, 0.5) - water.surfaceAt(0, -0.5));
  const pitch = Math.atan(-slope);
  board.place(new Vector3(0, surface + board.shape.centerOfMass.y, 0), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pitch), new Vector3(0, -Math.sin(pitch), Math.cos(pitch)).multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
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
    along: board.position.z,
    pressure: board.work.pressure,
    rules: rider.work.assist + rider.work.carry + rider.work.leanOut,
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

// The movement-flow spec's bar (pumping makes about 0.2–0.6 m/s a pump when extension is timed with the high-load part
// of each up-and-down; mistimed pumps lose speed): a pump track, the up-and-down a face gives a board that rides up and
// down it, here laid on still water as a 14° slope with 0.1 m bumps every 8 m, ridden from 6 m/s (about five bumps in
// 6 s). The path swings the load on the feet 0.56–1.31 body weights a bump for a rider standing tall. Timed, the crouch
// follows the board's place on the bumps (LEAD sets its phase): deepest a fifteenth of a bump before each crest and
// tallest as far before each hollow. The legs follow about 0.15 s later, so the rider extends as the board drops into
// each hollow and crouches as it climbs to the next crest. Mistimed by half a bump it does the opposite. Measured: the
// best steady stance (tall) ends at 6.91 m/s, timed 8.44 (+0.29 m/s a pump), mistimed 5.93 (−0.23 a pump); Regular and
// Goofy alike; any lead from 1.75 to 2.5 rad keeps at least +0.26 a pump. The timed rider's legs do no more net work
// than standing (32 J against 33 J): what it gains is the hull's drag. A planing hull's drag rises faster than its load
// (here 16–40 N a metre at 0.6 body weights, 237 at 1.3; Savitsky's trim grows with the load at a fixed load point), so
// the flatter load the timed rider gives it, 0.83–1.16 body weights, costs 16% less pressure drag a metre (106.8 N
// against 127.3). Mistimed, the load swings 0.47–1.45 and the drag a metre rises 17%. On longer, faster bumps the legs'
// work counts instead (the first test above, 0.15 m every 12 m at 9–12 m/s: the legs do 557 J more for 481 J more
// kinetic energy and the drag a metre is unchanged, Kogelbauer et al. 2024's work against the load), and the gain a
// pump is smaller in m/s (0.09). With no up-and-down, on flat water or a uniform slope, there is no load swing to
// flatten and a crouch rhythm only adds one: it keeps nothing.
describe('pumping over a pump track (the movement-flow spec\'s bar)', () => {
  const WAVELENGTH = 8;
  const track = new BumpWater({ slopeZ: -Math.tan((14 * Math.PI) / 180), amplitude: 0.1, wavelength: WAVELENGTH });
  const k = (2 * Math.PI) / WAVELENGTH;
  const LEAD = 2;
  const timed = (z: number) => 0.5 + 0.5 * Math.sin(k * z + LEAD);
  const mistimed = (z: number) => 0.5 - 0.5 * Math.sin(k * z + LEAD);
  const pumps = (run: { along: number }) => run.along / WAVELENGTH;
  const dragPerMetre = (run: { along: number; pressure: number }) => -run.pressure / run.along;

  it('timed pumps keep over 0.2 m/s a pump more than the best steady stance and mistimed ones lose speed, the legs adding no work: the hull carries a flatter load', () => {
    const steady = [0, 0.5, 1].map((crouch) => ride(track, 6, 6, () => crouch));
    const best = steady.reduce((a, b) => (b.speed > a.speed ? b : a));
    const withPump = ride(track, 6, 6, timed);
    const against = ride(track, 6, 6, mistimed);
    expect([...steady, withPump, against].every((run) => run.attached)).toBe(true);
    expect((withPump.speed - best.speed) / pumps(withPump)).toBeGreaterThan(0.2);
    expect((against.speed - best.speed) / pumps(against)).toBeLessThan(-0.1);
    // Nothing but the rider's own legs and the water: the compressed turn's rules never act.
    expect(withPump.rules + against.rules).toBe(0);
    // The speed is drag the hull no longer pays, not work the legs put in.
    expect(Math.abs(withPump.leg - best.leg)).toBeLessThan(50);
    expect(dragPerMetre(withPump)).toBeLessThan(0.9 * dragPerMetre(best));
    expect(dragPerMetre(against)).toBeGreaterThan(1.1 * dragPerMetre(best));
    // A straight line has no frontside or backside: Goofy keeps the same speed.
    expect(ride(track, 6, 6, timed, 'goofy').speed).toBeCloseTo(withPump.speed, 6);
  });

  // The gain is the path's load swing flattened, so a path that hardly swings it leaves nothing to gain: on bumps
  // 0.03 m high (the load 0.85–1.12 body weights a bump, standing tall) the same timed pump keeps +0.01 m/s a pump.
  it('keeps nothing where the path hardly swings the load', () => {
    const gentle = new BumpWater({ slopeZ: -Math.tan((14 * Math.PI) / 180), amplitude: 0.03, wavelength: WAVELENGTH });
    const best = Math.max(...[0, 0.5, 1].map((crouch) => ride(gentle, 6, 6, () => crouch).speed));
    const withPump = ride(gentle, 6, 6, timed);
    expect(withPump.attached).toBe(true);
    expect(Math.abs(withPump.speed - best) / pumps(withPump)).toBeLessThan(0.05);
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

  // At the pad's full lean. Measured: 15° from 6 m/s, 5.98 m/s held steady (crouched) against 7.49 timed (+0.25 a
  // pump) and 3.17 mistimed (−0.47); 12° from 7, 4.13 against 5.88 (+0.29) and 1.66 (−0.41). Regular and Goofy,
  // starting either way, give the same numbers. Only full S-turns swing the load enough for this (the pump track's
  // law above): at 0.8 of the stick the timed pump keeps +0.11 and +0.13 a pump, at 0.6 −0.02 to 0.00, at 0.3–0.5
  // −0.09 to −0.04, riding straight −0.10, where the crouch's own up-and-down costs the hull more than it saves.
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
