import { expect, it } from 'vitest';
import { BoardPhysics } from './BoardPhysics';
import { InteractiveWaterField } from '../wave/WaveModel';

it('keeps contact bounded and distinguishes clean rides from short failed catches across tuning extremes', () => {
  const settings = [
    {height:0.6,period:12,speed:1.5,expected:'complete'},
    {height:2.4,period:5,speed:5,expected:'missed'},
    {height:1.8,period:6,speed:4,expected:'complete'},
    {height:2.4,period:12,speed:1.5,expected:'complete'},
    {height:0.6,period:5,speed:5,expected:'missed'},
    {height:1.4,period:8,speed:3,expected:'complete'},
  ];
  for(const setting of settings) {
    const board = new BoardPhysics(new InteractiveWaterField(7,setting),{paddleForce:14,boardResponse:1});
    let maxPen=0; let sawAvailable=false;
    for(let frame=0;frame<2400&&!['complete','missed','wipeout'].includes(board.state);frame++) {
      const d=board.diagnostics(); sawAvailable ||= d.popUpAvailable;
      board.step(1/60,{paddle:board.state==='ready'||board.state==='paddling',steer:0,getUp:d.popUpAvailable});
      for(const p of board.contactPoints) maxPen=Math.max(maxPen,board.wave.sample(p.x,p.z).height-p.y);
    }
    expect(sawAvailable, JSON.stringify(setting)).toBe(true);
    expect(maxPen, JSON.stringify(setting)).toBeLessThan(0.2);
    expect(board.position.toArray().every(Number.isFinite), JSON.stringify(setting)).toBe(true);
    expect(board.state, JSON.stringify(setting)).toBe(setting.expected);
    if (setting.expected === 'complete') expect(board.rideDistance).toBeGreaterThanOrEqual(20);
  }
}, 60_000);

it('keeps the board and shared water bounded under opposite current and wind', () => {
  for (const direction of [-1, 1]) {
    const wave = new InteractiveWaterField(4, {
      height: 1.4, period: 8, speed: 3,
      currentX: direction * 0.8, windX: direction * 0.08,
    });
    const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 1 });
    for (let frame = 0; frame < 900 && !['complete', 'missed', 'wipeout'].includes(board.state); frame += 1) {
      const before = board.diagnostics();
      board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: 0, getUp: before.popUpAvailable,
      });
    }
    expect(board.position.toArray().every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(wave.totalEnergy())).toBe(true);
    expect(Math.abs(board.position.x)).toBeLessThan(23);
  }
}, 20_000);

it('allows a timed pop-up and sustained ride at each named surf spot', () => {
  const spots = [
    { name: 'Training Beach', height: 1.4, period: 8, speed: 3, shelfStrength: 0, currentX: 0, windX: 0 },
    { name: 'Glassy Point', height: 1.8, period: 9, speed: 3.3, shelfStrength: 0.25, currentX: -0.2, windX: 0 },
    { name: 'Windy Reef', height: 2.2, period: 6.5, speed: 4, shelfStrength: 0.65, currentX: 0.5, windX: 0.05 },
  ];
  for (const spot of spots) {
    const board = new BoardPhysics(new InteractiveWaterField(1, spot), { paddleForce: 14, boardResponse: 1 });
    let gotUp = false;
    for (let frame = 0; frame < 1600 && !['complete', 'missed', 'wipeout'].includes(board.state); frame += 1) {
      const before = board.diagnostics();
      gotUp ||= before.popUpAvailable;
      board.step(1 / 60, {
        paddle: board.state === 'ready' || board.state === 'paddling',
        steer: 0, getUp: before.popUpAvailable,
      });
    }
    expect(gotUp, spot.name).toBe(true);
    expect(board.state, spot.name).toBe('complete');
    expect(board.rideDistance, spot.name).toBeGreaterThanOrEqual(8);
  }
}, 20_000);

it('keeps an extreme wave and board finite over the steepest shelf', () => {
  const wave = new InteractiveWaterField(7, {
    height: 2.4, period: 5, speed: 5, shelfStrength: 1,
  });
  const board = new BoardPhysics(wave, { paddleForce: 14, boardResponse: 1 });
  let maxPenetration = 0;
  for (let frame = 0; frame < 1200 && !['complete', 'missed', 'wipeout'].includes(board.state); frame += 1) {
    const before = board.diagnostics();
    board.step(1 / 60, {
      paddle: board.state === 'ready' || board.state === 'paddling',
      steer: 0,
      getUp: before.popUpAvailable,
    });
    for (const point of board.contactPoints) {
      maxPenetration = Math.max(maxPenetration, wave.sample(point.x, point.z).height - point.y);
    }
    expect(Number.isFinite(wave.totalEnergy())).toBe(true);
  }
  expect(board.position.toArray().every(Number.isFinite)).toBe(true);
  expect(maxPenetration).toBeLessThan(0.2);
  expect(['complete', 'missed', 'wipeout']).toContain(board.state);
}, 20_000);
