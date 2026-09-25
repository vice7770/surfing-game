import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { PlungingSheet } from './PlungingSheet';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from './WaveModel';
import { PlungingSheetMesh } from '../scene/PlungingSheetMesh';
import { BoardPhysics } from '../physics/BoardPhysics';

function parcels(sheet: PlungingSheet): Array<[number, number, number, number, number]> {
  const found: Array<[number, number, number, number, number]> = [];
  sheet.forEachActive((index, x, y, z, strength) => found.push([index, x, y, z, strength]));
  return found;
}

describe('PlungingSheet', () => {
  it('spawns bounded 3D parcels from the break and replays deterministically', () => {
    const firstWave = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 0.65 });
    const secondWave = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 0.65 });
    const first = new PlungingSheet(firstWave);
    const second = new PlungingSheet(secondWave);
    let sawWater = false;
    let sawOverhang = false;
    for (let frame = 0; frame < 600; frame += 1) {
      firstWave.step(1 / 60);
      secondWave.step(1 / 60);
      first.step(1 / 60);
      second.step(1 / 60);
      const current = parcels(first);
      sawWater ||= current.length > 0;
      sawOverhang ||= current.some(([, x, y, z]) => y > firstWave.heightAt(x, z) + 0.15
        && z + first.reachZ > firstWave.crestZAt(x) + 0.4);
      expect(current.length).toBeLessThanOrEqual(first.columns * first.layers);
      expect(current.every(([, x, y, z]) => [x, y, z].every(Number.isFinite))).toBe(true);
    }
    expect(sawWater).toBe(true);
    expect(sawOverhang).toBe(true);
    const snapshot = parcels(first);
    expect(snapshot).toEqual(parcels(second));
    firstWave.reset();
    first.reset();
    expect(parcels(first)).toEqual([]);
    for (let frame = 0; frame < 600; frame += 1) {
      firstWave.step(1 / 60);
      first.step(1 / 60);
    }
    expect(parcels(first)).toEqual(snapshot);
  }, 20_000);

  it('uses the rendered parcel positions for bounded rider collision', () => {
    const wave = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS });
    const sheet = new PlungingSheet(wave);
    const renderer = new PlungingSheetMesh(sheet);
    let candidate: [number, number, number, number, number] | undefined;
    for (let frame = 0; frame < 600 && !candidate; frame += 1) {
      wave.step(1 / 60);
      sheet.step(1 / 60);
      renderer.update(sheet);
      if (renderer.mesh.visible) candidate = parcels(sheet).find(([, x, y, z]) => y > wave.heightAt(x, z) + 0.18);
    }
    expect(candidate).toBeDefined();
    if (!candidate) return;
    const [index, x, y, z] = candidate;
    const position = renderer.mesh.geometry.getAttribute('position');
    expect(position.getX(index)).toBeCloseTo(x, 5);
    expect(position.getY(index)).toBeCloseTo(y, 5);
    expect(position.getZ(index)).toBeCloseTo(z, 5);
    expect(position.getZ(index + sheet.columns * sheet.layers)).toBeCloseTo(z + sheet.reachZ, 5);
    expect(renderer.mesh.visible).toBe(true);
    const hit = sheet.resolveSphere(new Vector3(x, y + 0.1, z), 0.3, new Vector3());
    expect(hit).toBeDefined();
    expect(hit?.impulse.length()).toBeGreaterThan(0);
    expect(hit?.impulse.length()).toBeLessThanOrEqual(42);
    expect(hit?.normal.toArray().every(Number.isFinite)).toBe(true);
    const indices = renderer.mesh.geometry.getIndex();
    expect(indices).not.toBeNull();
    if (indices) {
      const a = indices.getX(0);
      const b = indices.getX(1);
      const c = indices.getX(2);
      const middle = new Vector3(
        (position.getX(a) + position.getX(b) + position.getX(c)) / 3,
        (position.getY(a) + position.getY(b) + position.getY(c)) / 3 - 0.05,
        (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3,
      );
      expect(sheet.resolveSphere(middle, 0.08, new Vector3())).toBeDefined();
    }
    renderer.dispose();
  }, 20_000);

  it('feeds a lip collision into the board state', () => {
    const wave = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS });
    const sheet = new PlungingSheet(wave);
    let target: [number, number, number, number, number] | undefined;
    for (let frame = 0; frame < 600 && !target; frame += 1) {
      wave.step(1 / 60);
      sheet.step(1 / 60);
      target = parcels(sheet).find(([, x, y, z]) => x >= wave.xMin + 2
        && y > wave.heightAt(x, z) + 0.25);
    }
    expect(target).toBeDefined();
    if (!target) return;
    const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 1 }, sheet);
    board.state = 'riding';
    board.position.set(target[1], target[2] - 0.75, target[3]);
    const before = board.diagnostics().balance;
    const after = board.step(1 / 60, { paddle: false, steer: 0, getUp: false });
    expect(after.lipImpact).toBeGreaterThan(0);
    expect(after.balance).toBeLessThan(before);
    expect(board.velocity.toArray().every(Number.isFinite)).toBe(true);
  }, 20_000);

  it('can make contact during a carved ride into the breaking section', () => {
    const wave = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS });
    const sheet = new PlungingSheet(wave);
    const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 1 }, sheet);
    let peakImpact = 0;
    let closest = Infinity;
    let closestParts = [Infinity, Infinity, Infinity];
    let closestTime = 0;
    let maxBreak = 0;
    for (let frame = 0; frame < 1200 && !['complete', 'missed', 'wipeout'].includes(board.state); frame += 1) {
      const before = board.diagnostics();
      const after = board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: board.state === 'riding' ? Math.sin(board.time * 0.72) * 0.7 : 0,
        getUp: before.popUpAvailable,
      });
      peakImpact = Math.max(peakImpact, after.lipImpact);
      maxBreak = Math.max(maxBreak, after.breaking);
      if (board.state === 'riding') {
        sheet.forEachActive((_index, x, y, z) => {
          const parts = [x - board.position.x, y - board.position.y - 0.75, z - board.position.z];
          const distance = Math.hypot(...parts);
          if (distance < closest) { closest = distance; closestParts = parts; closestTime = board.time; }
        });
      }
    }
    expect(peakImpact, `closest parcel ${closest.toFixed(2)} m at ${closestTime.toFixed(2)} s, offsets ${closestParts.map((v) => v.toFixed(2))}, max break ${maxBreak.toFixed(2)}`).toBeGreaterThan(0.03);
  }, 20_000);

  it('preserves clean catches on the default and reef waves', () => {
    const conditions = [
      { name: 'Training Beach', ...DEFAULT_WAVE_SETTINGS },
      { name: 'Windy Reef', height: 2.2, period: 6.5, speed: 4, shelfStrength: 0.65, currentX: 0.5, windX: 0.05 },
    ];
    for (const settings of conditions) {
      const wave = new InteractiveWaterField(1, settings);
      const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 1 }, new PlungingSheet(wave));
      let maximumPenetration = 0;
      for (let frame = 0; frame < 1400 && !['complete', 'missed', 'wipeout'].includes(board.state); frame += 1) {
        const before = board.diagnostics();
        board.step(1 / 60, {
          paddle: board.state === 'ready' || board.state === 'paddling',
          steer: 0,
          getUp: before.popUpAvailable,
        });
        for (const point of board.contactPoints) {
          maximumPenetration = Math.max(maximumPenetration, wave.heightAt(point.x, point.z) - point.y);
        }
      }
      expect(board.state, settings.name).toBe('complete');
      expect(maximumPenetration, settings.name).toBeLessThan(0.2);
    }
  }, 20_000);
});
