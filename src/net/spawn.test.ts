import { describe, expect, it } from 'vitest';
import { EDGE_MARGIN, SPAWN_CLEARANCE, chooseSpawn } from './spawn';
import { sideMargin } from '../physics/riderBounds';
import { OPEN_EDGE_RAMP } from '../wave/ShallowWaterSolver';

const area = { focusX: 20, focusZ: -100, xMin: -80, xMax: 80 };

describe('chooseSpawn', () => {
  it('spawns near the take-off, 6–30 m outside the break line, in an empty lineup', () => {
    const spot = chooseSpawn(area, [], () => 0.5);
    expect(Math.abs(spot.x - 20)).toBeLessThanOrEqual(30);
    expect(spot.z).toBeLessThanOrEqual(-106);
    expect(spot.z).toBeGreaterThanOrEqual(-130);
  });

  it('keeps clear of other surfers', () => {
    const others = [{ x: 20, z: -106 }, { x: 20, z: -110 }, { x: 23, z: -106 }, { x: 17, z: -106 }];
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
    for (let x = -10; x <= 50; x += 2) for (let z = -130; z <= -106; z += 2) others.push({ x, z });
    const spot = chooseSpawn(area, others, () => 0.5);
    const clearance = Math.min(...others.map((other) => Math.hypot(spot.x - other.x, spot.z - other.z)));
    expect(clearance).toBeGreaterThanOrEqual(1);
  });
});
