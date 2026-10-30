import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SheetHistory, createBoardSpraySheet, packBoardSheets } from '../physics/boardSpray';
import { SpraySheetMesh, curtainPoint, fingersPerMetre } from './SpraySheetMesh';

/** A sheet leaving 0.6 m of rail along +z from (x, 0.1, 2), 2 m/s out, 3 up and 4 on, off a board doing 9 m/s on. */
const sheet = (x = 1) => ({
  ...createBoardSpraySheet(), x, y: 0.1, z: 2, alongX: 0, alongZ: 1, length: 0.6, vx: 2, vy: 3, vz: 4, flux: 90, spread: 1,
  boardX: 0, boardY: 0, boardZ: 9, thickness: 0.02, breakup: 0.12, side: 1, source: 0,
});

describe('the spray\'s curtain (spray-sheet)', () => {
  it('stands where the water each root line launched has flown: from where the hull was then, falling since', () => {
    const history = new SheetHistory();
    // The board moves 0.15 m along +z a step: its root lines a step apart.
    for (let n = 0; n <= 12; n += 1) history.push('0:1', n / 60, { ...sheet(1), z: 2 + 0.15 * n });
    const now = 12 / 60;
    const point = new Vector3();
    // Just launched: on the root line now.
    expect(curtainPoint(history, '0:1', now, 0, 0, point)).toBe(true);
    expect(point.toArray().map((v) => +v.toFixed(6))).toEqual([1, 0.1, 3.8]);
    // Launched 0.1 s (6 steps) ago from where the root was then, flown since.
    curtainPoint(history, '0:1', now, 0.5, 0.1, point);
    expect(point.x).toBeCloseTo(1 + 2 * 0.1, 6);
    expect(point.y).toBeCloseTo(0.1 + 3 * 0.1 - 0.5 * 9.81 * 0.01, 6);
    expect(point.z).toBeCloseTo(2 + 0.15 * 6 + 0.3 + 4 * 0.1, 6);
    expect(curtainPoint(history, '1:1', now, 0, 0, point)).toBe(false);
  });

  it('tears into fingers λ_f = 10πσ/(ρ_a U²) apart, clamped', () => {
    expect(fingersPerMetre(7.5)).toBeCloseTo((1.2 * 7.5 * 7.5) / (10 * Math.PI * 0.072), 6);
    expect(fingersPerMetre(2)).toBe(8);
    expect(fingersPerMetre(20)).toBe(60);
  });

  it('draws a curtain for each board side that tears a way out, the player\'s carried with the drawn board', () => {
    const mesh = new SpraySheetMesh();
    const offset = new Vector3(0.1, 0, -0.2);
    mesh.update(0, packBoardSheets([sheet(), { ...sheet(), side: -1, breakup: 0 }]), 2, offset);
    expect(mesh.drawn).toBe(1);
    const positions = mesh.mesh.geometry.getAttribute('position');
    expect(positions.getX(0)).toBeCloseTo(1.1, 6);
    expect(positions.getZ(0)).toBeCloseTo(1.8, 6);
    // Another player's, as drawn, not moved; a board that tears within a few centimetres draws none.
    mesh.update(1 / 60, new Float32Array(0), 0, offset, packBoardSheets([{ ...sheet(), source: 3 }]));
    expect(mesh.drawn).toBe(1);
    expect(positions.getX(0)).toBeCloseTo(1, 6);
    mesh.update(2 / 60, new Float32Array(0), 0, offset, packBoardSheets([{ ...sheet(), source: 3, breakup: 0.01 }]));
    expect(mesh.drawn).toBe(0);
    expect(mesh.mesh.geometry.drawRange.count).toBe(0);
  });
});
