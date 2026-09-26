import type { SoundManifest } from './soundManifest';
import { synthesize, type SoundId } from './synth';

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
}

const defaultFetcher = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.arrayBuffer();
};

/**
 * Every sound as a buffer (S1): the synthesised one at once, replaced by its
 * chosen recording once that has loaded and decoded. A recording that fails
 * leaves the synthesised sound playing: the game is never silent for want of a file.
 */
export class SoundBank {
  readonly ready: Promise<void>;
  private readonly synthesised = new Map<SoundId, AudioBuffer>();
  private readonly recordings = new Map<SoundId, AudioBuffer>();
  private readonly fetcher: (url: string) => Promise<ArrayBuffer>;
  private readonly base: string;

  constructor(private readonly context: AudioContextLike, readonly manifest: SoundManifest, options: SoundBankOptions = {}) {
    this.fetcher = options.fetcher ?? defaultFetcher;
    this.base = options.base ?? '/assets/audio/';
    const loads = (Object.keys(manifest.sounds) as SoundId[]).map(async (id) => {
      const entry = manifest.sounds[id]!;
      const candidate = entry.candidates[entry.chosen];
      if (!candidate) return;
      const buffer = await this.load(candidate.file);
      if (buffer) this.recordings.set(id, buffer);
    });
    this.ready = Promise.all(loads).then(() => undefined);
  }

  buffer(id: SoundId): AudioBuffer {
    return this.recordings.get(id) ?? this.synthesisedBuffer(id);
  }

  recorded(id: SoundId): boolean {
    return this.recordings.has(id);
  }

  /** The recording's relative level from the manifest (1 for a synthesised sound). */
  gain(id: SoundId): number {
    return this.recorded(id) ? this.manifest.sounds[id]?.gain ?? 1 : 1;
  }

  /** A candidate's recording, for the sound check; undefined when it cannot load. */
  async candidate(id: SoundId, index: number): Promise<AudioBuffer | undefined> {
    const candidate = this.manifest.sounds[id]?.candidates[index];
    return candidate ? this.load(candidate.file) : undefined;
  }

  private async load(file: string): Promise<AudioBuffer | undefined> {
    try {
      return await this.context.decodeAudioData(await this.fetcher(`${this.base}${file}`));
    } catch (error) {
      console.warn(`Recording ${file} unavailable; keeping the synthesised sound.`, error);
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
