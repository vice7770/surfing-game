import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { LipContactParcel, LipParcelSource } from './DetachedSurfer';
import { PlaneWater } from './PlaneWater';
import { RideSession } from './RideSession';
import { SwellWater } from './SwellWater';
import { createWaterSample } from './SurfWater';

const STEP = 1 / 60;
const idle = { paddle: false, popUp: false, steer: 0 };

describe('ride session', () => {
  it('rides the same with or without the standing inputs left at rest', () => {
    const ride = (input: typeof idle & { trim?: number; crouch?: number; hand?: boolean }) => {
      const session = new RideSession();
      const water = new SwellWater({ height: 1, period: 9, depth: 5 });
      session.reset(new Vector3(0, 0, 0), 0, water);
      for (let i = 0; i < 300; i += 1) {
        session.step(STEP, water, { ...input, paddle: i < 240, popUp: i === 200 });
        water.advance(STEP);
      }
      return session.board.position.clone();
    };
    const plain = ride(idle);
    const explicit = ride({ ...idle, trim: 0, crouch: 0, hand: false });
    expect(explicit.distanceTo(plain)).toBe(0);
  });

  it('starts prone on a board floating level at the given point, heading the given way', () => {
    const session = new RideSession();
    session.reset(new Vector3(2, 0, -5), Math.PI / 2, new PlaneWater());
    expect(session.rider.attached).toBe(true);
    expect(session.rider.phase).toBe('prone');
    const forward = new Vector3(0, 0, 1).applyQuaternion(session.board.orientation);
    expect(forward.x).toBeCloseTo(1, 6);
    expect(session.board.position.x).toBeCloseTo(2, 6);
    expect(session.surfer.active).toBe(false);
  });

  it('relaunches drifting with the water and lying along its surface, so paddling off does not throw the rider', () => {
    // A quarter period past the crest: the surface falls and the orbital flow runs shoreward.
    const swell = new SwellWater({ height: 1.6, period: 10, direction: 0.3 });
    swell.advance(2.5);
    const at = new Vector3(3, 0, -4);
    const session = new RideSession();
    session.reset(at, 0.2, swell);
    const sample = swell.sampleAt(at.x, swell.surfaceAt(at.x, at.z) - 0.05, at.z, createWaterSample());
    const { board, rider } = session;
    expect(board.velocity.x).toBeCloseTo(sample.flowX, 2);
    expect(board.velocity.z).toBeCloseTo(sample.flowZ, 2);
    expect(rider.velocity.distanceTo(board.velocity)).toBeLessThan(0.05);
    const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    expect(up.angleTo(new Vector3(sample.normalX, sample.normalY, sample.normalZ))).toBeLessThan(0.01);
    const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    expect(Math.atan2(forward.x, forward.z)).toBeCloseTo(0.2, 2);
    for (let i = 0; i < 120; i += 1) {
      session.step(STEP, swell, { ...idle, paddle: true });
      swell.advance(STEP);
    }
    expect(rider.attached).toBe(true);
  });

  it('throws the rider off a board stopped dead, into a fall body that keeps its momentum', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.board.velocity.z = 6;
    session.rider.velocity.z = 6;
    for (let i = 0; i < 180; i += 1) {
      session.step(STEP, water, i === 30 ? { ...idle, popUp: true } : idle);
      if (session.rider.phase !== 'standing' || session.rider.popUpReport.outcome !== 'stood') {
        session.board.velocity.z = 6;
        session.rider.velocity.z = 6;
      }
    }
    expect(session.rider.phase).toBe('standing');
    // The board jams on something and is held still: the rider cannot hold on.
    let handed: { momentum: Vector3; centre: Vector3 } | undefined;
    for (let i = 0; i < 20 && !handed; i += 1) {
      session.board.velocity.set(0, 0, 0);
      session.board.angularVelocity.set(0, 0, 0);
      session.step(STEP, water, idle);
      if (session.surfer.active) handed = { momentum: session.started.momentum.clone(), centre: session.started.center.clone() };
    }
    expect(handed).toBeDefined();
    expect(session.rider.attached).toBe(false);
    expect(session.rider.separation).toBeDefined();
    expect(handed!.momentum.distanceTo(session.handoff.velocity.clone().multiplyScalar(session.rider.mass))).toBeLessThan(1e-9);
    expect(handed!.centre.distanceTo(session.handoff.center)).toBeLessThan(1e-9);
    // Still moving forward when it lets go: thrown over the nose.
    expect(handed!.momentum.z).toBeGreaterThan(50);
  });

  it('keeps the riderless board floating while the rider falls and swims', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.rider.popUp();
    for (let i = 0; i < 600; i += 1) session.step(STEP, water, idle);
    // At rest the pop-up fails and the rider lies back down; force a separation to check the aftermath.
    session.separate();
    for (let i = 0; i < 300; i += 1) session.step(STEP, water, { ...idle, paddle: true });
    expect(session.surfer.active).toBe(true);
    expect(Number.isFinite(session.surfer.centerOfMass().y)).toBe(true);
    expect(session.board.lowestPoint()).toBeGreaterThan(-0.05);
    expect(session.board.lowestPoint()).toBeLessThan(0.02);
  });

  it('lets the lip strike the rider on the board, and the surfer once fallen', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.step(STEP, water, idle);
    /** One parcel crossing `point` from +x to −x over the latest step. */
    const aimedAt = (point: Vector3, id: number): LipParcelSource => ({
      forEachContactNear(_center: Vector3, _reach: number, visit: (parcel: LipContactParcel) => void) {
        visit({ id, previousPosition: point.clone().add(new Vector3(1.5, 0, 0)), position: point.clone().add(new Vector3(-1.5, 0, 0)), velocity: new Vector3(-8, 0, 0), volume: 0.2, radius: 0.3 });
      },
    });
    session.strike(aimedAt(session.rider.partPosition(1, new Vector3()), 1));
    expect(session.rider.lastLipImpulse.x).toBeLessThan(0);
    session.separate();
    session.step(STEP, water, idle);
    session.step(STEP, water, idle);
    expect(session.surfer.active).toBe(true);
    session.strike(aimedAt(session.surfer.getPartPosition('torso', new Vector3()), 2));
    expect(session.surfer.lastContacts.lip.x).toBeLessThan(0);
  });

  it('lets the swimmer climb back onto a board within reach, the pair keeping its momentum', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.separate();
    for (let i = 0; i < 30; i += 1) session.step(STEP, water, idle);
    expect(session.surfer.active).toBe(true);
    // Still beside the board: reach for it.
    for (let i = 0; i < 900 && !session.rider.attached; i += 1) session.step(STEP, water, { ...idle, popUp: true });
    expect(session.rider.attached).toBe(true);
    expect(session.rider.phase).toBe('prone');
    expect(session.surfer.active).toBe(false);
    expect(session.remount.count).toBe(1);
    expect(session.remount.after.distanceTo(session.remount.before)).toBeLessThan(1e-9);
    // Back on the board it paddles again.
    for (let i = 0; i < 240; i += 1) session.step(STEP, water, { ...idle, paddle: true });
    expect(session.board.velocity.length()).toBeGreaterThan(0.8);
  });

  it('cannot climb onto a board out of reach', () => {
    const session = new RideSession();
    const water = new PlaneWater();
    session.reset(new Vector3(), 0, water);
    session.separate();
    for (let i = 0; i < 180; i += 1) session.step(STEP, water, idle);
    session.board.place(new Vector3(6, session.board.position.y, 6), session.board.orientation.clone());
    for (let i = 0; i < 300; i += 1) session.step(STEP, water, { ...idle, popUp: true });
    expect(session.rider.attached).toBe(false);
    expect(session.remount.count).toBe(0);
  });
});

