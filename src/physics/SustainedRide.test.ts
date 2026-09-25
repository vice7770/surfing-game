import { describe, expect, it } from 'vitest';
import { BoardPhysics } from './BoardPhysics';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from '../wave/WaveModel';

describe('sustained surf', () => {
  it('keeps an independently driven wave and board in play beyond the old 20 m finish', () => {
    const wave = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, sustained: true });
    const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 1 });
    let caught = false;
    let maxRide = 0;
    for (let frame = 0; frame < 3600; frame += 1) {
      const before = board.diagnostics();
      board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: 0,
        getUp: before.popUpAvailable,
      });
      caught ||= board.state === 'riding';
      maxRide = Math.max(maxRide, board.rideDistance);
      if (board.state === 'wipeout' || board.state === 'missed') break;
    }
    expect(caught).toBe(true);
    expect(board.state).toBe('riding');
    expect(maxRide).toBeGreaterThan(140);
    expect(wave.zMin).toBeGreaterThan(80);
    expect(Math.abs(wave.crestZ() - board.position.z)).toBeLessThan(12);
    expect(Math.abs(wave.heightAt(board.position.x, board.position.z))).toBeGreaterThan(0.1);
  }, 20_000);

  it('throws the rider free and lets the simulated water arrest the fall', () => {
    const wave = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, sustained: true });
    const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 2 });
    for (let frame = 0; frame < 1800 && board.state !== 'wipeout'; frame += 1) {
      const before = board.diagnostics();
      board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: board.state === 'riding' ? 1 : 0,
        getUp: before.popUpAvailable,
      });
    }
    expect(board.state).toBe('wipeout');
    expect(board.riderFall.active).toBe(true);
    const release = board.riderFall.position.clone();
    let enteredWater = false;
    for (let frame = 0; frame < 300; frame += 1) {
      board.step(1 / 60, { paddle: false, steer: 0, getUp: false });
      enteredWater ||= board.riderFall.submersion > 0.1;
    }
    expect(enteredWater).toBe(true);
    expect(board.riderFall.position.distanceTo(release)).toBeGreaterThan(0.5);
    expect(board.riderFall.position.y).toBeGreaterThan(wave.heightAt(
      board.riderFall.position.x, board.riderFall.position.z,
    ) - 0.43);
    expect(board.riderFall.velocity.length()).toBeLessThan(2);
  });

  it('restores the initial wave and rider state after the moving window has advanced', () => {
    const wave = new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS, sustained: true, shelfStrength: 0.65 });
    const initialCrest = wave.crestZ();
    const initialHeight = wave.heightAt(0, -18);
    const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 1 });
    for (let frame = 0; frame < 1800; frame += 1) {
      const before = board.diagnostics();
      board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: 0,
        getUp: before.popUpAvailable,
      });
      if (board.state === 'missed' || board.state === 'complete') break;
    }
    expect(wave.zMin).toBeGreaterThan(-32);
    board.reset();
    expect(wave.zMin).toBe(-32);
    expect(wave.crestZ()).toBe(initialCrest);
    expect(wave.heightAt(0, -18)).toBe(initialHeight);
    expect(board.riderFall.active).toBe(false);
  });

  it('ends a carve that loses the wave in a water-driven fall', () => {
    const board = new BoardPhysics(
      new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, sustained: true }),
      { paddleForce: 14, boardResponse: 1 },
    );
    for (let frame = 0; frame < 2400 && board.state !== 'wipeout'; frame += 1) {
      const before = board.diagnostics();
      board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: board.state === 'riding' ? Math.sin(board.time * 0.72) * 0.7 : 0,
        getUp: before.popUpAvailable,
      });
    }
    expect(board.state).toBe('wipeout');
    expect(board.rideDistance).toBeGreaterThan(8);
    expect(board.riderFall.active).toBe(true);
  });

  it.each([
    ['point', { height: 1.8, period: 9, speed: 3.3, shelfStrength: 0.25, currentX: -0.2 }],
    ['reef', { height: 2.2, period: 6.5, speed: 4, shelfStrength: 0.65, currentX: 0.5, windX: 0.05 }],
  ] as const)('keeps the %s preset catchable with a longer face', (_name, settings) => {
    const board = new BoardPhysics(
      new InteractiveWaterField(1, { ...settings, sustained: true }),
      { paddleForce: 14, boardResponse: 1 },
    );
    let caught = false;
    for (let frame = 0; frame < 1800 && board.state !== 'wipeout' && board.state !== 'missed'; frame += 1) {
      const before = board.diagnostics();
      board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: 0,
        getUp: before.popUpAvailable,
      });
      caught ||= board.state === 'riding';
    }
    expect(caught).toBe(true);
    expect(board.state).toBe('riding');
    expect(board.rideDistance).toBeGreaterThan(60);
    expect(Math.abs(board.wave.crestZ() - board.position.z)).toBeLessThan(board.wave.packetWidth * 2);
  });

  it('keeps seeded clean catches on the driven face', () => {
    for (const seed of [2, 3, 4]) {
      const board = new BoardPhysics(
        new InteractiveWaterField(seed, { ...DEFAULT_WAVE_SETTINGS, sustained: true }),
        { paddleForce: 14, boardResponse: 1 },
      );
      for (let frame = 0; frame < 1500 && !['wipeout', 'missed'].includes(board.state); frame += 1) {
        const before = board.diagnostics();
        board.step(1 / 60, {
          paddle: board.state === 'ready' || board.state === 'paddling',
          steer: 0,
          getUp: before.popUpAvailable,
        });
      }
      expect(board.state, `seed ${seed}`).toBe('riding');
      expect(board.rideDistance, `seed ${seed}`).toBeGreaterThan(60);
    }
  }, 20_000);

  it('allows a longer carved line before breaking water causes a fall', () => {
    const board = new BoardPhysics(
      new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, sustained: true }),
      { paddleForce: 14, boardResponse: 1 },
    );
    let maxLateral = 0;
    for (let frame = 0; frame < 1800 && !['wipeout', 'missed'].includes(board.state); frame += 1) {
      const before = board.diagnostics();
      board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: board.state === 'riding' ? Math.sin(board.time * 0.72) * 0.45 : 0,
        getUp: before.popUpAvailable,
      });
      maxLateral = Math.max(maxLateral, Math.abs(board.position.x));
    }
    expect(board.state).toBe('wipeout');
    expect(board.rideDistance).toBeGreaterThan(40);
    expect(maxLateral).toBeGreaterThan(0.5);
    expect(board.riderFall.active).toBe(true);
  });
});
