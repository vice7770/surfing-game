import { describe, expect, it, vi } from 'vitest';
import { SoundBank, type AudioContextLike } from './SoundBank';
import { parseManifest } from './soundManifest';

const candidate = { file: 'roar.m4a', source: 'https://freesound.org/s/1/', author: 'someone', licence: 'CC0' };

describe('parseManifest', () => {
  it('keeps valid sounds and drops bad entries', () => {
    const manifest = parseManifest({
      sounds: {
        roar: { candidates: [candidate, { ...candidate, licence: 'CC-BY' }, { file: 3 }], chosen: 0, gain: 0.8 },
        wind: { candidates: [], chosen: 0, gain: 1 },
        nonsense: { candidates: [candidate], chosen: 0, gain: 1 },
        paddle: { candidates: [candidate], chosen: 5, gain: 9 },
      },
    });
    expect(manifest.sounds.roar).toEqual({ candidates: [candidate], chosen: 0, gain: 0.8 });
    expect(manifest.sounds.wind).toEqual({ candidates: [], chosen: 0, gain: 1 });
    expect((manifest.sounds as Record<string, unknown>).nonsense).toBeUndefined();
    expect(manifest.sounds.paddle).toEqual({ candidates: [candidate], chosen: 0, gain: 1 });
    expect(parseManifest('not a manifest')).toEqual({ sounds: {} });
  });
});

/** Enough of a Web Audio context for the bank: buffers, and a decoder that can fail. */
function fakeContext(decode: () => Promise<unknown>): AudioContextLike {
  return {
    sampleRate: 22050,
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length);
      return { numberOfChannels: channels, length, sampleRate, getChannelData: () => data, copyToChannel: (source: Float32Array) => data.set(source) } as unknown as AudioBuffer;
    },
    decodeAudioData: () => decode() as Promise<AudioBuffer>,
  };
}

describe('SoundBank', () => {
  it('offers the synthesised sound at once, and keeps it when the recording fails to load', async () => {
    const manifest = parseManifest({ sounds: { roar: { candidates: [candidate], chosen: 0, gain: 1 } } });
    const fetcher = vi.fn(async () => { throw new Error('offline'); });
    const bank = new SoundBank(fakeContext(async () => ({})), manifest, { fetcher, base: '/assets/audio/' });
    const synthesised = bank.buffer('roar');
    expect(synthesised.length).toBeGreaterThan(0);
    await bank.ready;
    expect(fetcher).toHaveBeenCalledWith('/assets/audio/roar.m4a');
    expect(bank.buffer('roar')).toBe(synthesised);
    expect(bank.recorded('roar')).toBe(false);
  });

  it('swaps in a recording once it decodes', async () => {
    const manifest = parseManifest({ sounds: { wind: { candidates: [{ ...candidate, file: 'wind.m4a' }], chosen: 0, gain: 1 } } });
    const recording = { length: 44100 } as AudioBuffer;
    const bank = new SoundBank(fakeContext(async () => recording), manifest, { fetcher: async () => new ArrayBuffer(8), base: '/a/' });
    await bank.ready;
    expect(bank.buffer('wind')).toBe(recording);
    expect(bank.recorded('wind')).toBe(true);
  });
});
