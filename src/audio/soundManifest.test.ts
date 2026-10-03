import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { SoundBank, type AudioContextLike } from './SoundBank';
import { parseManifest } from './soundManifest';
import type { SoundId } from './synth';

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

  it('keeps a generated candidate beside a CC0 one, and drops any other licence', () => {
    const generated = { file: 'roar-1.m4a', source: 'ElevenLabs Sound Effects, generated 2026-10-03', author: 'ElevenLabs 1', licence: 'generated' };
    const manifest = parseManifest({
      sounds: {
        roar: {
          candidates: [
            candidate,
            generated,
            { ...generated, licence: 'Generated' },
            { ...generated, licence: 'CC-BY' },
            { ...generated, licence: 'CC0 ' },
            { ...generated, licence: undefined },
          ],
          chosen: 1,
          gain: 1.14,
        },
      },
    });
    expect(manifest.sounds.roar).toEqual({ candidates: [candidate, generated], chosen: 1, gain: 1.14 });
  });
});

describe('the shipped manifest (public/assets/audio/sounds.json)', () => {
  const folder = 'public/assets/audio';
  const raw = JSON.parse(readFileSync(`${folder}/sounds.json`, 'utf8')) as {
    sounds: Record<string, { candidates: { file: string }[]; chosen: number; gain: number }>;
  };
  const manifest = parseManifest(raw);

  // parseManifest drops what it cannot read and resets a bad choice or gain, which would leave a sound quietly
  // synthesised; this catches a typo in the file that the game itself would never report.
  it('names only known sounds and loses no candidate, choice or gain to validation', () => {
    expect(Object.keys(manifest.sounds).sort()).toEqual(Object.keys(raw.sounds).sort());
    for (const [id, entry] of Object.entries(raw.sounds)) {
      const parsed = manifest.sounds[id as SoundId]!;
      expect(parsed.candidates, `${id} candidates`).toEqual(entry.candidates);
      expect(parsed.chosen, `${id} chosen`).toBe(entry.chosen);
      expect(parsed.gain, `${id} gain`).toBe(entry.gain);
    }
  });

  it('ships every recording it lists as AAC, once, and no recording it does not list', () => {
    const listed = Object.values(raw.sounds).flatMap((entry) => entry.candidates.map((c) => c.file));
    expect(new Set(listed).size).toBe(listed.length);
    for (const file of listed) {
      expect(file, file).toMatch(/\.m4a$/);
      expect(existsSync(`${folder}/${file}`), file).toBe(true);
    }
    const shipped = readdirSync(folder).filter((name) => name.endsWith('.m4a'));
    expect([...shipped].sort()).toEqual([...listed].sort());
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
