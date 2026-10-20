import { describe, expect, it } from 'vitest';
import { EDGE_MARGIN, SPAWN_CLEARANCE, SPAWN_OUT, SPAWN_REACH, chooseSpawn } from './spawn';
import { RIDE_LINEUP_OFFSET } from '../wave/SurfZoneSimulation';
import { sideMargin } from '../physics/riderBounds';
import { OPEN_EDGE_RAMP } from '../wave/ShallowWaterSolver';

const area = { focusX: 20, focusZ: -100, xMin: -80, xMax: 80 };

describe('chooseSpawn', () => {
  it('spawns near the take-off, 11–35 m outside the break line, in an empty lineup', () => {
    const spot = chooseSpawn(area, [], () => 0.5);
    expect(Math.abs(spot.x - 20)).toBeLessThanOrEqual(30);
    expect(spot.z).toBeLessThanOrEqual(-111);
    expect(spot.z).toBeGreaterThanOrEqual(-135);
  });

  it('starts the band at the ride\'s own start, and moves it with a nearer start (the Canyon\'s Big)', () => {
    expect(SPAWN_OUT).toEqual({ near: RIDE_LINEUP_OFFSET, far: RIDE_LINEUP_OFFSET + SPAWN_REACH });
    expect(SPAWN_OUT).toEqual({ near: 11, far: 35 });
    for (const near of [0, 4.5]) {
      const outs = [0, 0.3, 0.6, 0.99].map((r) => area.focusZ - chooseSpawn({ ...area, near }, [], () => r).z);
      for (const out of outs) {
        expect(out).toBeGreaterThanOrEqual(near - 1e-9);
        expect(out).toBeLessThanOrEqual(near + SPAWN_REACH + 1e-9);
      }
      // Nearest the ride's start in an empty lineup, as at 11 m.
      expect(Math.min(...outs)).toBeCloseTo(near, 9);
    }
  });

  it('keeps clear of other surfers', () => {
    const others = [{ x: 20, z: -111 }, { x: 20, z: -115 }, { x: 23, z: -111 }, { x: 17, z: -111 }];
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const spot = chooseSpawn(area, others, () => r);
      for (const other of others) expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThanOrEqual(SPAWN_CLEARANCE);
    }
  });

  it('stays inside the window, within the rider’s bounds', () => {
    for (const r of [0, 0.5, 0.99]) {
      const spot = chooseSpawn({ ...area, focusX: 78 }, [], () => r);
      expect(spot.x).toBeLessThanOrEqual(80 - EDGE_MARGIN);
      expect(80 - spot.x).toBeGreaterThanOrEqual(sideMargin(OPEN_EDGE_RAMP, 2));
    }
  });

  it('picks the most open spot in a packed lineup', () => {
    const others: { x: number; z: number }[] = [];
    for (let x = -10; x <= 50; x += 2) for (let z = -135; z <= -111; z += 2) others.push({ x, z });
    const spot = chooseSpawn(area, others, () => 0.5);
    const clearance = Math.min(...others.map((other) => Math.hypot(spot.x - other.x, spot.z - other.z)));
    expect(clearance).toBeGreaterThanOrEqual(1);
  });
});
