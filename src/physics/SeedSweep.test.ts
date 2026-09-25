import { expect, it } from 'vitest';
import { BoardPhysics } from './BoardPhysics';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from '../wave/WaveModel';

it('carries the board 20 m after a timed pop-up across twelve generated waves', () => {
  for (let seed=1; seed<=12; seed++) {
    const board = new BoardPhysics(new InteractiveWaterField(seed, DEFAULT_WAVE_SETTINGS), {paddleForce:14,boardResponse:1});
    for(let frame=0;frame<1200&&!['complete','missed','wipeout'].includes(board.state);frame++) {
      const d=board.diagnostics();
      board.step(1/60,{paddle:board.state==='ready'||board.state==='paddling',steer:0,getUp:d.popUpAvailable});
    }
    expect(board.state, `seed ${seed}`).toBe('complete');
    expect(board.rideDistance, `seed ${seed}`).toBeGreaterThanOrEqual(20);
  }
}, 20_000);
