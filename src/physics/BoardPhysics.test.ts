import { describe, expect, it } from 'vitest';
import { BoardPhysics } from './BoardPhysics';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from '../wave/WaveModel';

const input = (paddle = false, steer = 0, getUp = false) => ({ paddle, steer, getUp });

function makeBoard(): BoardPhysics {
  return new BoardPhysics(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS }), { paddleForce: 14, boardResponse: 1 });
}

describe('BoardPhysics', () => {
  it('paddling builds speed and releasing paddle allows water-relative drag to slow the board', () => {
    const board = new BoardPhysics(new InteractiveWaterField(1, { height: 0, period: 8, speed: 0 }), { paddleForce: 14, boardResponse: 1 });
    // Isolate paddle propulsion/drag on still water; wave motion is validated
    // separately because it should accelerate the board after release.
    for (let frame = 0; frame < 120; frame += 1) board.step(1 / 60, input(true));
    const paddledSpeed = board.velocity.length();
    for (let frame = 0; frame < 180; frame += 1) board.step(1 / 60, input(false));
    expect(paddledSpeed).toBeGreaterThan(0.12);
    expect(board.velocity.length()).toBeLessThan(paddledSpeed);
  });

  it('requires an explicit Get Up input when the local wave window is available', () => {
    const board = makeBoard();
    let getUpAccepted = false;
    for (let frame = 0; frame < 900 && board.state !== 'missed'; frame += 1) {
      const diagnostics = board.step(1 / 60, input(true));
      expect(board.state).not.toBe('riding');
      if (diagnostics.popUpAvailable) {
        board.step(1 / 60, input(false, 0, true));
        getUpAccepted = board.state === 'catching';
        break;
      }
    }
    expect(getUpAccepted).toBe(true);
  });

  it('keeps the default paddle-and-pop-up flow reachable across generated seeds', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const board = new BoardPhysics(new InteractiveWaterField(seed, { ...DEFAULT_WAVE_SETTINGS }), { paddleForce: 14, boardResponse: 1 });
      for (let frame = 0; frame < 900 && board.state !== 'catching' && board.state !== 'missed'; frame += 1) {
        const d = board.diagnostics();
        board.step(1 / 60, input(!d.popUpAvailable, 0, d.popUpAvailable));
      }
      expect(board.state, `seed ${seed}`).toBe('catching');
    }
  });

  it('ignores premature Get Up input', () => {
    const board = makeBoard();
    board.step(1 / 60, input(false, 0, true));
    expect(board.state).toBe('ready');
  });

  it('moves board forward with the evolving water after a valid pop-up and paddle release', () => {
    const board = makeBoard();
    let requested = false;
    for (let frame = 0; frame < 900 && !requested && board.state !== 'missed'; frame += 1) {
      const diagnostics = board.step(1 / 60, input(true));
      if (diagnostics.popUpAvailable) {
        board.step(1 / 60, input(false, 0, true));
        requested = true;
      }
    }
    expect(requested).toBe(true);
    expect(board.state).toBe('catching');
    const startZ = board.position.z;
    for (let frame = 0; frame < 180 && board.state === 'catching'; frame += 1) board.step(1 / 60, input(false));
    expect(board.state).toBe('riding');
    const rideStartZ = board.position.z;
    const rideStartTime = board.time;
    for (let frame = 0; frame < 180 && board.state === 'riding'; frame += 1) board.step(1 / 60, input(false));
    expect(board.time - rideStartTime).toBeGreaterThan(2.99);
    expect(board.position.z - rideStartZ).toBeGreaterThan(0.8);
    expect(['riding', 'complete']).toContain(board.state);
    expect(rideStartZ).toBeGreaterThan(startZ);
    for (let frame = 0; frame < 1200 && board.state === 'riding'; frame += 1) board.step(1 / 60, input(false));
    expect(board.state).toBe('complete');
    expect(board.time - rideStartTime).toBeLessThan(20);
    expect(board.rideDistance).toBeGreaterThanOrEqual(20);
  });

  it('ends in missed when the player never paddles or pops up', () => {
    const board = makeBoard();
    for (let frame = 0; frame < 1200 && board.state !== 'missed'; frame += 1) board.step(1 / 60, input());
    expect(board.state).toBe('missed');
  });

  it('can wipe out from an unstable turn after popping up', () => {
    const board = new BoardPhysics(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS }), { paddleForce: 14, boardResponse: 2 });
    for (let frame = 0; frame < 1800 && !['wipeout', 'complete', 'missed'].includes(board.state); frame += 1) {
      const d = board.diagnostics();
      const paddle = !d.popUpAvailable && board.state !== 'catching' && board.state !== 'riding';
      board.step(1 / 60, input(paddle, board.state === 'riding' ? 1 : 0, d.popUpAvailable));
    }
    expect(board.state).toBe('wipeout');
  });

  it('replay reset restores both the board and the authoritative water field', () => {
    const board = makeBoard();
    for (let frame = 0; frame < 50; frame += 1) board.step(1 / 60, input(true, 0.2));
    board.reset();
    expect(board.time).toBe(0);
    expect(board.wave.time).toBe(0);
    expect(board.position.toArray()).toEqual([0, 0.05, 0]);
    expect(board.velocity.toArray()).toEqual([0, 0, 0]);
    expect(board.state).toBe('ready');
  });

  it('repeats the same trajectory for identical seed, settings, and inputs', () => {
    const first = makeBoard();
    const second = makeBoard();
    for (let frame = 0; frame < 360; frame += 1) {
      const diagnostics = first.diagnostics();
      const action = input(frame < 300, frame % 120 < 60 ? 0.15 : -0.15, diagnostics.popUpAvailable && frame % 3 === 0);
      first.step(1 / 60, action);
      second.step(1 / 60, action);
    }
    expect(first.position.toArray()).toEqual(second.position.toArray());
    expect(first.velocity.toArray()).toEqual(second.velocity.toArray());
    expect(first.state).toBe(second.state);
  });

  it('keeps board contact penetration bounded on a steep wave', () => {
    const wave = new InteractiveWaterField(88, { height: 2.4, period: 5, speed: 3 });
    const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 1 });
    let maxPenetration = 0;
    for (let frame = 0; frame < 900 && !['missed', 'wipeout', 'complete'].includes(board.state); frame += 1) {
      const d = board.diagnostics();
      board.step(1 / 60, input(board.state !== 'riding', 0, d.popUpAvailable));
      for (const point of board.contactPoints) maxPenetration = Math.max(maxPenetration, wave.sample(point.x, point.z).height - point.y);
    }
    expect(maxPenetration).toBeLessThan(0.2);
  });

  it('turns the board path through water rather than only rotating its mesh', () => {
    const settings = { height: 0, period: 8, speed: 0 };
    const straight = new BoardPhysics(new InteractiveWaterField(1, settings), { paddleForce: 14, boardResponse: 1 });
    const carving = new BoardPhysics(new InteractiveWaterField(1, settings), { paddleForce: 14, boardResponse: 1 });
    straight.velocity.z = 1.8;
    carving.velocity.z = 1.8;
    for (let frame = 0; frame < 90; frame += 1) {
      straight.step(1 / 60, input(false, 0));
      carving.step(1 / 60, input(false, 1));
    }
    expect(carving.position.x).toBeGreaterThan(straight.position.x + 0.08);
    expect(carving.rotation.y).toBeGreaterThan(straight.rotation.y);
    expect(carving.riderLean).toBeGreaterThan(0.8);
    carving.reset();
    expect(carving.riderLean).toBe(0);
  });

  it('loses lateral fin grip when the board is clear of the water', () => {
    const settings = { height: 0, period: 8, speed: 0 };
    const wet = new BoardPhysics(new InteractiveWaterField(1, settings), { paddleForce: 14, boardResponse: 1 });
    const dry = new BoardPhysics(new InteractiveWaterField(1, settings), { paddleForce: 14, boardResponse: 1 });
    wet.velocity.z = dry.velocity.z = 2;
    dry.position.y = 1.2;
    for (let frame = 0; frame < 15; frame += 1) {
      wet.step(1 / 60, input(false, 1));
      dry.step(1 / 60, input(false, 1));
    }
    expect(wet.position.x).toBeGreaterThan(dry.position.x + 0.001);
  });

  it('can carve into the peeling break and wipe out as balance falls', () => {
    const board = makeBoard();
    let maxBreaking = 0;
    let sawCarve = false;
    let sawFlow = false;
    for (let frame = 0; frame < 1200 && !['complete', 'missed', 'wipeout'].includes(board.state); frame += 1) {
      const before = board.diagnostics();
      const action = input(
        board.state === 'ready' || board.state === 'paddling',
        board.state === 'riding' ? Math.sin(board.time * 0.72) * 0.7 : 0,
        before.popUpAvailable,
      );
      const after = board.step(1 / 60, action);
      maxBreaking = Math.max(maxBreaking, after.breaking);
      sawCarve ||= after.maneuver === 'CARVE';
      sawFlow ||= after.flow > 0.4;
    }
    expect(board.state).toBe('wipeout');
    expect(board.rideDistance).toBeGreaterThan(8);
    expect(maxBreaking).toBeGreaterThan(0.5);
    expect(board.diagnostics().balance).toBeLessThan(0.95);
    expect(sawCarve).toBe(true);
    expect(sawFlow).toBe(true);
  });

  it('reports a carve and a snap only after physically steering on the wave', () => {
    const board = makeBoard();
    for (let frame = 0; frame < 900 && board.state !== 'riding'; frame += 1) {
      const d = board.diagnostics();
      board.step(1 / 60, input(board.state === 'ready' || board.state === 'paddling', 0, d.popUpAvailable));
    }
    expect(board.state).toBe('riding');
    let sawCarve = false;
    for (let frame = 0; frame < 60 && board.state === 'riding'; frame += 1) {
      const diagnostic = board.step(1 / 60, input(false, 0.55));
      sawCarve ||= diagnostic.maneuver === 'CARVE';
    }
    expect(sawCarve).toBe(true);
    const snap = board.step(1 / 60, input(false, -0.55));
    expect(snap.maneuver).toBe('SNAP');
    expect(board.position.x).not.toBe(0);
  });
});
