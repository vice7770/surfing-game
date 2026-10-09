import { describe, expect, it } from 'vitest';
import { RIDER_BOUNDS, boundsDepth, boundsPush, riderBounds, sideMargin, type RiderBounds } from './riderBounds';
import { RideSession } from './RideSession';
import { practiceSwell } from '../game/PhysicalMode';
import { swellChoice } from '../game/SurfConditions';
import { OPEN_EDGE_RAMP } from '../wave/ShallowWaterSolver';
import { alongShoreOf, takeOffPoint, tankLayout, tankRiderBounds, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import type { SpotName } from '../wave/Bathymetry';

const STEP = 1 / 60;
const tank = { xMin: -80, xMax: 80, zoneInner: -270, shore: 30 };
const bounds: RiderBounds = riderBounds(tank, { side: sideMargin(OPEN_EDGE_RAMP, 1), offshore: 4, shore: 2 });

/** A body coasting with nothing but the bounds on it (and `thrust` outward along x, m/s²), from x0 at v0 along x. */
function coast(x0: number, v0: number, seconds: number, thrust = 0) {
  let x = x0;
  let v = v0;
  let farthest = x;
  let largestKick = 0;
  const push = { x: 0, z: 0 };
  for (let t = 0; t < seconds; t += STEP) {
    v += thrust * STEP;
    boundsPush(x, -100, v, 0, bounds, STEP, push);
    largestKick = Math.max(largestKick, Math.abs(push.x));
    v += push.x;
    x += v * STEP;
    farthest = Math.max(farthest, x);
  }
  return { x, v, farthest, largestKick };
}

describe('the rider’s bounds', () => {
  it('holds the rider a cell past the edge ramp inside each side edge, inside the relaxation zone and off the shore wall', () => {
    expect(sideMargin(OPEN_EDGE_RAMP, 1)).toBe(21);
    expect(sideMargin(OPEN_EDGE_RAMP, 2)).toBe(22);
    expect(bounds).toEqual({ xMin: -59, xMax: 59, zMin: -266, zMax: 28 });
    expect(boundsDepth(0, -100, bounds)).toBe(0);
    expect(boundsDepth(-61, -100, bounds)).toBe(2);
    expect(boundsDepth(10, -270, bounds)).toBe(4);
  });

  it('does nothing inside, and never pushes a body already heading back in faster than the return', () => {
    const push = { x: 1, z: 1 };
    expect(boundsPush(0, -100, 5, -3, bounds, STEP, push)).toBe(0);
    expect(push).toEqual({ x: 0, z: 0 });
    // 3 m past the +x bound, coming back in at 2 m/s (the return there is 1.2 m/s): left alone.
    expect(boundsPush(62, -100, -2, 0, bounds, STEP, push)).toBe(3);
    expect(push.x).toBe(0);
    // Past the −x bound, the same, mirrored.
    boundsPush(-62, -100, 2, 0, bounds, STEP, push);
    expect(push.x).toBe(0);
  });

  it('slows a body going out and draws it back, never moving it: it stops well short of the edge and comes back in', () => {
    for (const speed of [1.5, 5, 12]) {
      const run = coast(bounds.xMax, speed, 40);
      const past = run.farthest - bounds.xMax;
      // About 0.7 m past per m/s (a paddler 1 m, a fast rider 8 m), always well inside the 21 m margin.
      expect(past).toBeLessThan(0.75 * speed);
      expect(run.farthest).toBeLessThan(tank.xMax - 10);
      // Each step changes the velocity by a small share of it (a brake, not a jump): the position stays continuous.
      expect(run.largestKick).toBeLessThanOrEqual((speed + RIDER_BOUNDS.returnRate * past) * (1 - Math.exp(-RIDER_BOUNDS.brakeRate * STEP)) + 1e-9);
      // And it drifts back in no faster than the return at the deepest it went: the boundary holds, it never throws.
      expect(run.x - bounds.xMax).toBeLessThan(0.3);
      expect(run.v).toBeLessThanOrEqual(1e-9);
      expect(run.v).toBeGreaterThanOrEqual(-RIDER_BOUNDS.returnRate * past - 1e-9);
    }
    // The −x side and the offshore and shore sides act alike.
    const push = { x: 0, z: 0 };
    boundsPush(-60, -100, -1, 0, bounds, STEP, push);
    expect(push.x).toBeGreaterThan(0);
    boundsPush(0, -268, 0, -1, bounds, STEP, push);
    expect(push.z).toBeGreaterThan(0);
    boundsPush(0, 29, 0, 1, bounds, STEP, push);
    expect(push.z).toBeLessThan(0);
  });

  it('holds a paddler who keeps pushing out about a metre past, far from the edge', () => {
    const run = coast(bounds.xMax - 5, 1.5, 60, 0.5);
    // Coming in at 1.5 m/s it goes a little further, then settles back.
    expect(run.farthest - bounds.xMax).toBeLessThan(3);
    expect(run.x - bounds.xMax).toBeCloseTo(0.5 / (RIDER_BOUNDS.brakeRate * RIDER_BOUNDS.returnRate), 0);
  });

  it('keeps every spot’s take-off and lineup inside the bounds, at every size', () => {
    const spots: SpotName[] = ['beach', 'point', 'reef', 'canyon', 'padang', 'pool'];
    for (const spot of spots) {
      const swells = [practiceSwell(spot), ...(spot === 'pool' ? [] : (['small', 'medium', 'big'] as const).map((size) => swellChoice(spot, size)))];
      for (const swell of swells) {
        const config: SurfZoneConfig = {
          spot, seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0,
          spreading: swell.spreading ?? 150, tide: 0, ...(spot === 'padang' ? { dx: 2 } : {}),
        };
        const held = tankRiderBounds(config);
        const layout = tankLayout(config);
        expect(held.xMax - held.xMin).toBeCloseTo(alongShoreOf(config) - 2 * sideMargin(OPEN_EDGE_RAMP, config.dx ?? 1), 9);
        expect(held.zMin).toBeGreaterThan(layout.zoneInner);
        const takeOff = takeOffPoint(config);
        // The take-off, and the lineup 25 m seaward of it, with room to paddle around them.
        for (const z of [takeOff.z, takeOff.z - 25]) expect(boundsDepth(takeOff.x, z, held), `${spot} ${swell.significantHeight} m`).toBe(0);
        expect(takeOff.x - held.xMin, spot).toBeGreaterThanOrEqual(8);
        expect(held.xMax - takeOff.x, spot).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('holds the board and its rider by one velocity change, and the fallen surfer’s nodes by another, moving none', () => {
    const session = new RideSession();
    session.board.position.set(bounds.xMax + 2, 0, -100);
    session.board.velocity.set(3, 0.5, 1);
    session.rider.velocity.set(3.2, 0.4, 1.1);
    const before = { board: session.board.position.clone(), rider: session.rider.position.clone() };
    expect(session.holdInside(bounds, STEP)).toBeCloseTo(2, 9);
    const boardChange = session.board.velocity.x - 3;
    expect(boardChange).toBeLessThan(0);
    expect(session.rider.velocity.x - 3.2).toBeCloseTo(boardChange, 12);
    expect(session.board.velocity.y).toBe(0.5);
    expect(session.board.velocity.z).toBe(1);
    expect(session.board.position.equals(before.board)).toBe(true);
    expect(session.rider.position.equals(before.rider)).toBe(true);
    // Fallen: the surfer's nodes each take the same change, from the body's centre and its mean velocity.
    session.separate();
    session.surfer.start(session.rider.handoffState(session.handoff));
    session.surfer.active = true;
    const shift = bounds.xMax + 5 - session.surfer.centerOfMass().x;
    for (const node of session.surfer.nodes) {
      node.position.x += shift;
      node.velocity.set(2, 0, 0);
    }
    const positions = session.surfer.nodes.map((node) => node.position.clone());
    expect(session.holdInside(bounds, STEP)).toBeCloseTo(5, 6);
    const changes = session.surfer.nodes.map((node) => node.velocity.x - 2);
    expect(changes[0]).toBeLessThan(0);
    for (const change of changes) expect(change).toBeCloseTo(changes[0], 12);
    session.surfer.nodes.forEach((node, k) => expect(node.position.equals(positions[k])).toBe(true));
  });
});
