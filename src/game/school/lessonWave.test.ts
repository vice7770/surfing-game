import { describe, expect, it } from 'vitest';
import { compress } from '../../wave/surfZoneState';
import { INSIDE, lessonConfig, loadLessonSea, recordedStart, schoolWave, startPlacement, type LessonWave } from './lessonWave';
import { LESSON_WAVES } from './lessonWaves';

const wave: LessonWave = {
  stage: 2,
  config: { spot: 'canyon', seed: 7, significantHeight: 1.3, peakPeriod: 11, directionDegrees: 5, spreading: 30, bandwidth: 0.1, tide: 0, windSpeed: 0, componentCount: 64 },
  assets: { pocket: 'lessons/test-pocket.sea', caught: 'lessons/test-caught.sea', waiting: 'lessons/test-waiting.sea' },
  placements: {
    pocket: { x: 1, z: -40, heading: 1.1, speed: 7, phase: 'standing' },
    caught: { x: 3, z: -41, heading: 0.4, speed: 6, phase: 'prone' },
    waiting: { x: 9, z: -30, heading: 0, speed: 0, phase: 'prone' },
  },
  provisional: true,
  checks: { pocket: '', caught: '', waiting: '' },
};

describe('lesson wave', () => {
  // The wipeout spec: the Duck-dive lesson starts on the inside, on the waiting start's recorded sea.
  it('starts the inside lying further in on the waiting sea, heading out to sea', () => {
    expect(recordedStart('inside')).toBe('waiting');
    expect(recordedStart('pocket')).toBe('pocket');
    const inside = startPlacement(wave, 'inside');
    const travel = { x: Math.sin((5 * Math.PI) / 180), z: Math.cos((5 * Math.PI) / 180) };
    const along = (inside.x - wave.placements.waiting.x) * travel.x + (inside.z - wave.placements.waiting.z) * travel.z;
    expect(along).toBeCloseTo(INSIDE.along, 6);
    expect(Math.sin(inside.heading) * travel.x + Math.cos(inside.heading) * travel.z).toBeCloseTo(-1, 6);
    expect(inside).toMatchObject({ speed: 0, phase: 'prone' });
    expect(startPlacement(wave, 'caught')).toBe(wave.placements.caught);
  });

  // The riding work will change the practice swell; a recording must keep its own.
  it('builds its sea from the recorded swell, with no spin-up', () => {
    const config = lessonConfig(wave);
    expect(config).toMatchObject({
      spot: 'canyon', seed: 7, significantHeight: 1.3, peakPeriod: 11, spreading: 30, bandwidth: 0.1, stage: 2, componentCount: 64, spinUpPeriods: 0,
    });
  });

  // 2026-09-27, the user's call: stage 1's recording could not be caught, so the school runs stage 2 on every machine
  // (on the GPU where there is one, else on the CPU, slower than real time on a slow one).
  it('runs the school on stage 2 whatever else is recorded', () => {
    expect(schoolWave([{ ...wave, stage: 1 }, wave])).toBe(wave);
    expect(schoolWave().stage).toBe(2);
    expect(lessonConfig(schoolWave())).toMatchObject({ stage: 2, compute: 'auto' });
    expect(LESSON_WAVES.map((recorded) => recorded.stage)).toEqual([2]);
  });

  it('loads and inflates its recorded sea', async () => {
    const raw = new Uint8Array([1, 2, 3, 4, 5, 250]);
    const { bytes } = await compress(raw);
    const fetcher = async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes.slice().buffer }) as unknown as Response;
    expect(Array.from(await loadLessonSea(wave, 'pocket', fetcher as typeof fetch))).toEqual(Array.from(raw));
  });

  it('falls back when the wave will not load', async () => {
    const fetcher = async () => ({ ok: false, status: 404 }) as unknown as Response;
    await expect(loadLessonSea(wave, 'caught', fetcher as typeof fetch)).rejects.toThrow(/lessons\/test-caught\.sea/);
  });
});
