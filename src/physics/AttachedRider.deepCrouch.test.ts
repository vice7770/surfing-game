import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CROUCH_DEPTH, CROUCH_SHARE, MANUAL_CROUCH_DEPTH } from './AttachedRider';
import { WATER } from './hullForces';
import { PlaneWater } from './PlaneWater';
import { RideSession } from './RideSession';
import { deckHeight, stanceFeet } from './riderPosture';
import { CoveredWater } from './testing/CoveredWater';

const STEP = 1 / 60;
const idle = { paddle: false, popUp: false, steer: 0 };

/**
 * One ordinary placement, then unforced board/rider dynamics on flat water: under a tube's curl unless `covered` is
 * false. The deep tuck is for tube clearance only (the owner's decision of 2026-10-06).
 */
function prepared(speed = 8, covered = true) {
  const water = covered ? new CoveredWater(new PlaneWater()) : new PlaneWater();
  const session = new RideSession();
  session.place({ x: 0, z: 0, heading: 0, speed, phase: 'standing' }, water);
  for (let tick = 0; tick < 30; tick += 1) session.step(STEP, water, idle);
  return { session, water };
}

function headHeight(session: RideSession, drawn: boolean): number {
  const { rider, board } = session;
  const head = drawn ? rider.renderPoint(2, board, new Vector3()) : rider.partPosition(2, new Vector3());
  const feet = stanceFeet(board.shape);
  const z = (feet.front + feet.rear) / 2;
  const deck = board.toWorld({ x: 0, y: deckHeight(board.shape, z), z }, new Vector3());
  const radius = Math.cbrt(3 * rider.partVolumes[2] / (4 * Math.PI));
  return head.y + radius - deck.y;
}

describe('manual tube tuck', () => {
  it.each([6, 8, 11])('lowers the physical and published head while retaining a loaded standing rider at %i m/s', (speed) => {
    const { session, water } = prepared(speed);
    const standingHead = headHeight(session, false);
    let lowestLoad = Infinity;
    let fastestRest = 0;
    for (let tick = 0; tick < 60; tick += 1) {
      const previousRest = session.rider.leg.rest;
      session.step(STEP, water, { ...idle, crouch: 1 });
      expect(session.phase).toBe('standing');
      expect(session.rider.attached).toBe(true);
      fastestRest = Math.max(fastestRest, Math.abs(session.rider.leg.rest - previousRest) / STEP);
      const up = new Vector3(0, 1, 0).applyQuaternion(session.board.orientation);
      lowestLoad = Math.min(lowestLoad, session.rider.contact.force.dot(up) / (session.rider.mass * WATER.gravity));
    }
    const physicalHead = headHeight(session, false);
    const drawnHead = headHeight(session, true);
    expect(session.rider.inContact).toBe(true);
    expect(lowestLoad).toBeGreaterThan(0);
    expect(fastestRest).toBeLessThanOrEqual(1.5);
    expect(session.rider.leg.rest).toBeCloseTo(-MANUAL_CROUCH_DEPTH, 3);
    expect(standingHead - physicalHead).toBeGreaterThan(0.4);
    expect(physicalHead).toBeLessThan(1.1);
    expect(drawnHead).toBeCloseTo(physicalHead, 3);
  });

  it('keeps the pumping crouch and Compress targets, and selects the usual turn stance from a deeper tuck', () => {
    const pumping = prepared();
    const compress = prepared();
    const tuck = prepared();
    for (let tick = 0; tick < 60; tick += 1) {
      pumping.session.step(STEP, pumping.water, { ...idle, crouch: 0.6 });
      compress.session.step(STEP, compress.water, { ...idle, compress: 1 });
      tuck.session.step(STEP, tuck.water, { ...idle, crouch: 1 });
    }
    expect(pumping.session.rider.leg.rest).toBeCloseTo(-0.6 * CROUCH_SHARE * CROUCH_DEPTH, 3);
    expect(compress.session.rider.leg.rest).toBeCloseTo(-CROUCH_DEPTH, 3);
    let fastestRest = 0;
    for (let tick = 0; tick < 60; tick += 1) {
      const before = tuck.session.rider.leg.rest;
      tuck.session.step(STEP, tuck.water, { ...idle, crouch: 1, compress: 1 });
      fastestRest = Math.max(fastestRest, Math.abs(tuck.session.rider.leg.rest - before) / STEP);
    }
    expect(tuck.session.phase).toBe('standing');
    expect(tuck.session.rider.leg.rest).toBeCloseTo(-CROUCH_DEPTH, 3);
    expect(fastestRest).toBeLessThanOrEqual(2.5);
  });

  it('selects monotonically shallower tuck depths as partial Compress rises, without extending above its final stance', () => {
    let previousDepth = MANUAL_CROUCH_DEPTH;
    for (const compress of [0, 0.25, 0.5, 0.75, 0.81081, 1]) {
      const { session, water } = prepared();
      for (let tick = 0; tick < 90; tick += 1) session.step(STEP, water, { ...idle, crouch: 1, compress });
      const depth = -session.rider.leg.rest;
      expect(session.phase).toBe('standing');
      expect(session.rider.inContact).toBe(true);
      expect(depth).toBeGreaterThanOrEqual(CROUCH_DEPTH - 0.0001);
      expect(depth).toBeLessThanOrEqual(MANUAL_CROUCH_DEPTH);
      expect(depth).toBeLessThanOrEqual(previousDepth + 0.0001);
      previousDepth = depth;
    }
    expect(previousDepth).toBeCloseTo(CROUCH_DEPTH, 3);
  });

  it('stays loaded while a continuous Compress ramp extends a prepared tuck within the two stance depths', () => {
    const { session, water } = prepared();
    for (let tick = 0; tick < 60; tick += 1) session.step(STEP, water, { ...idle, crouch: 1 });
    let previousDepth = -session.rider.leg.rest;
    for (let tick = 1; tick <= 120; tick += 1) {
      session.step(STEP, water, { ...idle, crouch: 1, compress: Math.min(1, tick / 60) });
      const depth = -session.rider.leg.rest;
      const up = new Vector3(0, 1, 0).applyQuaternion(session.board.orientation);
      expect(session.phase).toBe('standing');
      expect(session.rider.contact.force.dot(up)).toBeGreaterThan(0);
      expect(depth).toBeGreaterThanOrEqual(CROUCH_DEPTH - 0.0001);
      expect(depth).toBeLessThanOrEqual(previousDepth + 0.0001);
      expect((previousDepth - depth) / STEP).toBeLessThanOrEqual(2.5);
      previousDepth = depth;
    }
    expect(previousDepth).toBeCloseTo(CROUCH_DEPTH, 3);
  });

  it.each([0, 0.6])('retains the pumping/Compress selection through partial turn inputs with manual crouch %f', (crouch) => {
    for (const compress of [0, 0.25, 0.5, 0.75, 1]) {
      const { session, water } = prepared();
      for (let tick = 0; tick < 90; tick += 1) session.step(STEP, water, { ...idle, crouch, compress });
      expect(session.phase).toBe('standing');
      expect(session.rider.leg.rest).toBeCloseTo(-Math.max(CROUCH_SHARE * crouch, compress) * CROUCH_DEPTH, 3);
    }
  });

  it('extends from a prepared tuck through normal loaded dynamics rather than snapping the body up', () => {
    const { session, water } = prepared();
    for (let tick = 0; tick < 60; tick += 1) session.step(STEP, water, { ...idle, crouch: 1 });
    let fastestRest = 0;
    for (let tick = 0; tick < 60; tick += 1) {
      const previousRest = session.rider.leg.rest;
      session.step(STEP, water, idle);
      expect(session.phase).toBe('standing');
      fastestRest = Math.max(fastestRest, Math.abs(session.rider.leg.rest - previousRest) / STEP);
    }
    expect(fastestRest).toBeLessThanOrEqual(2.5);
    expect(session.rider.leg.rest).toBeCloseTo(0, 3);
    expect(headHeight(session, false)).toBeGreaterThan(1.4);
    expect(headHeight(session, true)).toBeCloseTo(headHeight(session, false), 3);
  });
});

// The owner's decision of 2026-10-06: the deep tuck is for tube clearance. Full manual crouch keeps the pumping
// crouch's depth from before the tuck everywhere but under a tube's curl (the swept contact's `covered`).
describe('the tube tuck\'s gate', () => {
  it('keeps full manual crouch at the pumping depth on open water', () => {
    const { session, water } = prepared(8, false);
    for (let tick = 0; tick < 60; tick += 1) session.step(STEP, water, { ...idle, crouch: 1 });
    expect(session.phase).toBe('standing');
    expect(session.rider.covered).toBe(false);
    expect(session.rider.leg.rest).toBeCloseTo(-CROUCH_SHARE * CROUCH_DEPTH, 3);
  });

  it('folds full manual crouch into the deep tuck under a tube\'s curl', () => {
    const { session, water } = prepared(8, true);
    for (let tick = 0; tick < 60; tick += 1) session.step(STEP, water, { ...idle, crouch: 1 });
    expect(session.phase).toBe('standing');
    expect(session.rider.covered).toBe(true);
    expect(session.rider.leg.rest).toBeCloseTo(-MANUAL_CROUCH_DEPTH, 3);
  });

  it('rises back to the pumping depth through normal dynamics once the curl no longer covers it', () => {
    let over = true;
    const water = new CoveredWater(new PlaneWater(), () => over);
    const session = new RideSession();
    session.place({ x: 0, z: 0, heading: 0, speed: 8, phase: 'standing' }, water);
    for (let tick = 0; tick < 30; tick += 1) session.step(STEP, water, idle);
    for (let tick = 0; tick < 60; tick += 1) session.step(STEP, water, { ...idle, crouch: 1 });
    expect(session.rider.leg.rest).toBeCloseTo(-MANUAL_CROUCH_DEPTH, 3);
    over = false;
    let fastestRest = 0;
    for (let tick = 0; tick < 60; tick += 1) {
      const previousRest = session.rider.leg.rest;
      session.step(STEP, water, { ...idle, crouch: 1 });
      expect(session.phase).toBe('standing');
      expect(session.rider.inContact).toBe(true);
      fastestRest = Math.max(fastestRest, Math.abs(session.rider.leg.rest - previousRest) / STEP);
    }
    expect(session.rider.covered).toBe(false);
    expect(fastestRest).toBeLessThanOrEqual(2.5);
    expect(session.rider.leg.rest).toBeCloseTo(-CROUCH_SHARE * CROUCH_DEPTH, 3);
  });
});
