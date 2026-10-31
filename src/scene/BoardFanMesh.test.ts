import type { BufferAttribute } from 'three';
import { describe, expect, it } from 'vitest';
import { createBoardSpraySheet, packBoardSheets } from '../physics/boardSpray';
import { FAN } from '../wave/boardFan';
import { BoardFanMesh, CARVE_LINE } from './BoardFanMesh';

const flat = () => 0.1;

/** A board running along +z at `speed` m/s, its side's sheet throwing `flux` kg/s, `t` s in. */
function sheetAt(t: number, flux: number, speed = 8, x = 0) {
  return packBoardSheets([{
    ...createBoardSpraySheet(), x, y: 0.1, z: speed * t, alongX: 0, alongZ: 1, length: 0.5, vx: 3, vy: 4, vz: speed * 0.5, flux, spread: 0.4,
    boardX: 0, boardY: 0, boardZ: speed,
  }]);
}

describe('the boards\' spray fan drawn (spray-rework)', () => {
  it('throws drops as the sea\'s time runs, none while it stands still, and fewer at a lower Particles setting', () => {
    const fan = new BoardFanMesh();
    fan.update(0, sheetAt(0, 60), 1, undefined, flat);
    fan.update(0, sheetAt(0, 60), 1, undefined, flat);
    expect(fan.thrown).toBe(0);
    for (let n = 1; n <= 30; n += 1) fan.update(n / 60, sheetAt(n / 60, 60), 1, undefined, flat);
    const high = fan.thrown;
    expect(high).toBeGreaterThan(0.8 * 60 * 0.5 * FAN.perKg * (1 - FAN.mistShare));
    const low = new BoardFanMesh();
    low.setLevel('low');
    for (let n = 0; n <= 30; n += 1) low.update(n / 60, sheetAt(n / 60, 60), 1, undefined, flat);
    expect(low.thrown).toBeLessThan(0.35 * high);
    expect(low.live(30 / 60).streaks).toBeLessThanOrEqual(Math.floor(FAN.pool * 0.25));
  });

  it('lays a carve line on the water behind a rail that throws enough, and starts a new one when the board jumps', () => {
    const fan = new BoardFanMesh();
    for (let n = 0; n <= 60; n += 1) fan.update(n / 60, sheetAt(n / 60, 60), 1, undefined, flat);
    const geometry = (fan as unknown as { lineMesh: { geometry: { drawRange: { count: number }; getAttribute(name: string): BufferAttribute } } }).lineMesh.geometry;
    const drawn = geometry.drawRange.count;
    expect(drawn).toBeGreaterThan(6 * 20);
    // On the water (its height read where it lies), a little over it.
    expect(geometry.getAttribute('position').getY(0)).toBeCloseTo(0.1 + CARVE_LINE.lift, 5);
    // The board put 30 m away: the old line stays to fade, and no segment joins them visibly.
    for (let n = 61; n <= 90; n += 1) fan.update(n / 60, sheetAt(n / 60, 60, 8, 30), 1, undefined, flat);
    const lines = (fan as unknown as { lines: Map<string, unknown> }).lines;
    expect(lines.size).toBe(2);
    const data = geometry.getAttribute('line');
    const position = geometry.getAttribute('position');
    for (let v = 2; v < geometry.drawRange.count / 3; v += 2) {
      const jump = Math.abs(position.getX(v) - position.getX(v - 2));
      if (jump > 10) expect(data.getZ(v) * data.getZ(v - 2)).toBe(0);
    }
  });

  it('lays no line for a light trim, and lets the line fade out after its life', () => {
    const fan = new BoardFanMesh();
    for (let n = 0; n <= 60; n += 1) fan.update(n / 60, sheetAt(n / 60, CARVE_LINE.least / 2), 1, undefined, flat);
    const lines = (fan as unknown as { lines: Map<string, unknown> }).lines;
    expect(lines.size).toBe(0);
    for (let n = 0; n <= 60; n += 1) fan.update(1 + n / 60, sheetAt(1 + n / 60, 60), 1, undefined, flat);
    expect(lines.size).toBe(1);
    fan.update(2 + CARVE_LINE.life + 0.5, sheetAt(0, 0), 1, undefined, flat);
    fan.update(2 + CARVE_LINE.life + 0.6, sheetAt(0, 0), 1, undefined, flat);
    expect(lines.size).toBe(0);
  });
});
