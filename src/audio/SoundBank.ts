import { candidateFiles, type SoundManifest } from './soundManifest';
import { synthesize, type SoundId } from './synth';
import { VariantCycle } from './variants';

/** The part of a Web Audio context the bank uses; tests pass a stand-in. */
export interface AudioContextLike {
  readonly sampleRate: number;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>;
}

export interface SoundBankOptions {
  fetcher?: (url: string) => Promise<ArrayBuffer>;
  /** Where the recordings are served, ending in a slash. */
  base?: string;
  /** Uniform in [0, 1): shuffles the pools; tests pass a seeded one. */
  random?: () => number;
}

const defaultFetcher = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.arrayBuffer();
};

/**
 * Every sound as a buffer (S1): the synthesised one at once, replaced by its
 * chosen recording once that has loaded and decoded. A candidate may be a pool
 * of recordings: all of its files load, and `variant` hands them out in turn, so
 * a sound that fires often does not repeat one file. A recording that fails
 * leaves the rest of its pool, or the synthesised sound, playing: the game is
 * never silent for want of a file.
 */
export class SoundBank {
  readonly ready: Promise<void>;
  private readonly synthesised = new Map<SoundId, AudioBuffer>();
  private readonly recordings = new Map<SoundId, AudioBuffer[]>();
  private readonly cycles = new Map<string, VariantCycle>();
  private readonly candidates = new Map<string, Promise<AudioBuffer[]>>();
  private readonly fetcher: (url: string) => Promise<ArrayBuffer>;
  private readonly base: string;
  private readonly random: () => number;

  constructor(private readonly context: AudioContextLike, readonly manifest: SoundManifest, options: SoundBankOptions = {}) {
    this.fetcher = options.fetcher ?? defaultFetcher;
    this.base = options.base ?? 'assets/audio/';
    this.random = options.random ?? Math.random;
    const loads = (Object.keys(manifest.sounds) as SoundId[]).map(async (id) => {
      const entry = manifest.sounds[id]!;
      if (!entry.candidates[entry.chosen]) return;
      const buffers = await this.pool(id, entry.chosen);
      if (buffers.length > 0) this.recordings.set(id, buffers);
    });
    this.ready = Promise.all(loads).then(() => undefined);
  }

  /** The sound's first recording (a loop's, and the one-shots' fallback), or its synthesised version. */
  buffer(id: SoundId): AudioBuffer {
    return this.recordings.get(id)?.[0] ?? this.synthesisedBuffer(id);
  }

  /** The next recording of the sound's pool, never the one just played; the synthesised sound when there is none. */
  variant(id: SoundId): AudioBuffer {
    const pool = this.recordings.get(id);
    if (!pool) return this.synthesisedBuffer(id);
    return pool[this.cycle(`${id}`, pool.length).next()];
  }

  /** How many recordings the sound plays in turn (0 while it is synthesised). */
  poolSize(id: SoundId): number {
    return this.recordings.get(id)?.length ?? 0;
  }

  recorded(id: SoundId): boolean {
    return this.recordings.has(id);
  }

  /** The recording's relative level: the sound's, times the chosen candidate's own (1 for a synthesised sound). */
  gain(id: SoundId): number {
    if (!this.recorded(id)) return 1;
    const entry = this.manifest.sounds[id];
    return (entry?.gain ?? 1) * (entry?.candidates[entry.chosen]?.level ?? 1);
  }

  /** A candidate's level against the sound's gain, for the sound check. */
  candidateLevel(id: SoundId, index: number): number {
    return this.manifest.sounds[id]?.candidates[index]?.level ?? 1;
  }

  /**
   * A candidate's recording for the sound check, loading it on first use; a pool
   * hands out its next recording each time. Undefined when none of it can load.
   */
  async candidate(id: SoundId, index: number): Promise<AudioBuffer | undefined> {
    const pool = await this.pool(id, index);
    return pool.length > 0 ? pool[this.cycle(`${id}:${index}`, pool.length).next()] : undefined;
  }

  private pool(id: SoundId, index: number): Promise<AudioBuffer[]> {
    const key = `${id}:${index}`;
    let pool = this.candidates.get(key);
    if (!pool) {
      const candidate = this.manifest.sounds[id]?.candidates[index];
      pool = candidate ? this.loadAll(candidateFiles(candidate)) : Promise.resolve([]);
      this.candidates.set(key, pool);
    }
    return pool;
  }

  private cycle(key: string, count: number): VariantCycle {
    let cycle = this.cycles.get(key);
    if (!cycle) {
      cycle = new VariantCycle(count, this.random);
      this.cycles.set(key, cycle);
    }
    return cycle;
  }

  private async loadAll(files: string[]): Promise<AudioBuffer[]> {
    const loaded = await Promise.all(files.map((file) => this.load(file)));
    return loaded.filter((buffer): buffer is AudioBuffer => buffer !== undefined);
  }

  private async load(file: string): Promise<AudioBuffer | undefined> {
    try {
      return await this.context.decodeAudioData(await this.fetcher(`${this.base}${file}`));
    } catch (error) {
      console.warn(`Recording ${file} unavailable; keeping the rest of its sound.`, error);
      return undefined;
    }
  }

  private synthesisedBuffer(id: SoundId): AudioBuffer {
    let buffer = this.synthesised.get(id);
    if (!buffer) {
      const samples = synthesize(id, this.context.sampleRate);
      buffer = this.context.createBuffer(1, samples.length, this.context.sampleRate);
      buffer.copyToChannel(samples, 0);
      this.synthesised.set(id, buffer);
    }
    return buffer;
  }
}
