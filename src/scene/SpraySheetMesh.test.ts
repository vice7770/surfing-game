import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createBoardSpraySheet, packBoardSheets } from '../physics/boardSpray';
import { SpraySheetMesh, curtainPoint } from './SpraySheetMesh';

/** A sheet leaving 0.6 m of rail along +z at (1, 0.1, 2), 2 m/s out, 3 up and 4 on, off a board doing 9 m/s on. */
const sheet = {
  ...createBoardSpraySheet(), x: 1, y: 0.1, z: 2, alongX: 0, alongZ: 1, length: 0.6, vx: 2, vy: 3, vz: 4, flux: 90, spread: 1,
  boardX: 0, boardY: 0, boardZ: 9, thickness: 0.02, fan: 0.3, breakup: 0.12,
};

describe('the spray\'s curtain (spray-sheet)', () => {
  it('stands from the root out to the tear, the water launched over the flight, relative to the board, fanned and falling', () => {
    const packed = packBoardSheets([sheet]);
    const point = new Vector3();
    // At the root: along the rail.
    expect(curtainPoint(packed, 0, 0, 0, point)).toBeCloseTo(0.02, 6);
    expect(point.toArray().map((v) => +v.toFixed(6))).toEqual([1, 0.1, 2]);
    curtainPoint(packed, 0, 1, 0, point);
    expect(point.z).toBeCloseTo(2.6, 6);
    // At the tear, mid-sheet: (v − v_board)·t − ½gt², t = 0.12 s.
    curtainPoint(packed, 0, 0.5, 1, point);
    expect(point.x).toBeCloseTo(1 + 2 * 0.12, 6);
    expect(point.y).toBeCloseTo(0.1 + 3 * 0.12 - 0.5 * 9.81 * 0.12 * 0.12, 6);
    expect(point.z).toBeCloseTo(2 + 0.3 + -5 * 0.12, 6);
    // Its edges fanned out by tan(fan)·|v − v_board|·t either side, and thinner for it.
    const speed = Math.hypot(2, 3, -5);
    const spread = 2 * Math.tan(0.3) * speed * 0.12;
    const thin = curtainPoint(packed, 0, 1, 1, point);
    expect(point.z).toBeCloseTo(2 + 0.6 + spread / 2 - 5 * 0.12, 6);
    expect(thin).toBeCloseTo((0.02 * 0.6) / (0.6 + spread), 6);
  });

  it('draws a curtain only for sheets that tear a way out, carried with the drawn board', () => {
    const mesh = new SpraySheetMesh();
    const offset = new Vector3(0.1, 0, -0.2);
    mesh.update(packBoardSheets([sheet, { ...sheet, breakup: 0 }]), 2, offset);
    expect(mesh.drawn).toBe(1);
    const positions = mesh.mesh.geometry.getAttribute('position');
    expect(positions.getX(0)).toBeCloseTo(1.1, 6);
    expect(positions.getZ(0)).toBeCloseTo(1.8, 6);
    // Other players' sheets as drawn, not moved.
    mesh.update(new Float32Array(0), 0, offset, packBoardSheets([sheet]));
    expect(mesh.drawn).toBe(1);
    expect(positions.getX(0)).toBeCloseTo(1, 6);
    mesh.update(new Float32Array(0), 0, offset);
    expect(mesh.drawn).toBe(0);
    expect(mesh.mesh.geometry.drawRange.count).toBe(0);
  });
});
