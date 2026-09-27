import type { RiderPlacement } from '../../physics/RideSession';
import type { SurfZoneHost } from '../SurfZoneHost';
import { LESSON_WAVES } from './lessonWaves';
import { loadLessonSea, schoolWave, type LessonStart, type LessonWave } from './lessonWave';

export interface SchoolSessionOptions {
  /** The recordings to choose from (tests pass their own). */
  waves?: readonly LessonWave[];
  /** Fetch and inflate a start's recorded sea. */
  load?: (wave: LessonWave, start: LessonStart) => Promise<Uint8Array>;
}

/**
 * The Surf School's seas (spec L2): the stage 2 lesson wave on every machine,
 * each start's recorded state loaded once, and the restart that puts a host back
 * on it. Every restore gets its own copy, since a worker takes the bytes.
 */
export class SchoolSession {
  wave?: LessonWave;
  private readonly seas = new Map<LessonStart, Uint8Array>();
  private readonly waves: readonly LessonWave[];
  private readonly load: (wave: LessonWave, start: LessonStart) => Promise<Uint8Array>;

  constructor(options: SchoolSessionOptions = {}) {
    this.waves = options.waves ?? LESSON_WAVES;
    this.load = options.load ?? ((wave, start) => loadLessonSea(wave, start));
  }

  /** The school's wave and a start's sea, loading it the first time; rejects when it will not load. */
  async prepare(start: LessonStart): Promise<{ wave: LessonWave; sea: Uint8Array }> {
    const wave = schoolWave(this.waves);
    if (this.wave !== wave) {
      this.seas.clear();
      this.wave = undefined;
    }
    const sea = await this.sea(wave, start);
    this.wave = wave;
    return { wave, sea: sea.slice() };
  }

  /** Put the host back on a start's recorded sea; returns where the rider goes for it. */
  async restart(host: Pick<SurfZoneHost, 'restore'>, start: LessonStart): Promise<RiderPlacement> {
    const { wave } = this;
    if (!wave) throw new Error('No lesson wave prepared');
    host.restore((await this.sea(wave, start)).slice());
    return wave.placements[start];
  }

  private async sea(wave: LessonWave, start: LessonStart): Promise<Uint8Array> {
    const kept = this.seas.get(start);
    if (kept) return kept;
    const sea = await this.load(wave, start);
    this.seas.set(start, sea);
    return sea;
  }
}
