import { describe, expect, it } from 'vitest';
import { encodeSurfZoneState } from '../../wave/surfZoneState';
import type { SurfZoneConfig } from '../../wave/SurfZoneSimulation';
import { LocalSurfZone } from '../SurfZoneHost';
import { lessonConfig, type LessonWave } from './lessonWave';
import { SchoolSession } from './SchoolSession';

/** A small Canyon, so the tests run in seconds; the lesson's own sea is the same code at full size. */
const small: Partial<SurfZoneConfig> = { alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, componentCount: 8 };
const wave: LessonWave = {
  stage: 2,
  config: { spot: 'canyon', seed: 5, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spreading: 24, tide: 0, windSpeed: 0, componentCount: 8 },
  assets: { pocket: 'p', caught: 'c', waiting: 'w' },
  placements: {
    pocket: { x: 0, z: -40, heading: 0.8, speed: 4, phase: 'standing' },
    caught: { x: 0, z: -42, heading: 0.2, speed: 3, phase: 'prone' },
    waiting: { x: 0, z: -30, heading: 0, speed: 0, phase: 'prone' },
  },
  provisional: true,
  checks: { pocket: '', caught: '', waiting: '' },
};
const configFor = () => ({ ...lessonConfig(wave), ...small, compute: 'cpu' as const });

async function recorded(): Promise<Uint8Array> {
  const sea = new LocalSurfZone({ ...configFor(), spinUpPeriods: 1 });
  sea.advance(30);
  return encodeSurfZoneState(sea.runner.simulation.exportState());
}

describe('SchoolSession', () => {
  it('restarts a lesson sea on the same wave every time, the rider placed for the start', async () => {
    const state = await recorded();
    const loads: string[] = [];
    const session = new SchoolSession({ waves: [wave], load: async (_wave, start) => { loads.push(start); return state; } });
    const { sea } = await session.prepare(2, 'pocket');
    const host = new LocalSurfZone(configFor(), { rider: true }, sea);
    const run = async () => {
      const placement = await session.restart(host, 'pocket');
      host.advance(1, { paddle: false, popUp: false, steer: 0, retry: false, place: placement });
      const board = host.runner.session!.board.position;
      expect(host.snapshot.status.ride!.phase).toBe('standing');
      expect(Math.hypot(board.x - placement.x, board.z - placement.z)).toBeLessThan(0.5);
      host.advance(60);
      return Array.from(host.snapshot.surface);
    };
    const first = await run();
    expect(await run()).toEqual(first);
    expect(loads).toEqual(['pocket']);
  });

  it('falls back when the wave will not load, keeping nothing', async () => {
    const session = new SchoolSession({ waves: [wave], load: async () => { throw new Error('The lesson wave p did not load (404)'); } });
    await expect(session.prepare(2, 'pocket')).rejects.toThrow(/did not load/);
    expect(session.wave).toBeUndefined();
  });
});
