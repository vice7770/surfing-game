import { Quaternion, Vector3 } from 'three';
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
