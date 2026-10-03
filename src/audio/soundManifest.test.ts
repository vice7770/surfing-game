import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { SoundBank, type AudioContextLike } from './SoundBank';
import { MAX_POOL, RECORDING_RATE, candidateFiles, parseManifest } from './soundManifest';
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

describe('a candidate that is a pool', () => {
  const generated = { file: 'lipJet-1a.m4a', source: 'ElevenLabs Sound Effects, generated 2026-10-03', author: 'ElevenLabs 1', licence: 'generated' };

  it('keeps its other recordings in order, and its own level', () => {
    const pooled = { ...generated, variants: ['lipJet-1b.m4a', 'lipJet-1c.m4a'], level: 0.68 };
    const manifest = parseManifest({ sounds: { lipJet: { candidates: [pooled, generated], chosen: 0, gain: 1.3 } } });
    expect(manifest.sounds.lipJet!.candidates).toEqual([pooled, generated]);
    expect(candidateFiles(manifest.sounds.lipJet!.candidates[0])).toEqual(['lipJet-1a.m4a', 'lipJet-1b.m4a', 'lipJet-1c.m4a']);
    expect(candidateFiles(manifest.sounds.lipJet!.candidates[1])).toEqual(['lipJet-1a.m4a']);
  });

  it('drops what cannot be a recording of the pool, and a level out of range', () => {
    const messy = { ...generated, variants: ['lipJet-1b.m4a', 'lipJet-1b.m4a', '', 7, 'lipJet-1a.m4a', 'lipJet-1c.m4a'], level: 3 };
    const [candidate] = parseManifest({ sounds: { lipJet: { candidates: [messy], chosen: 0, gain: 1 } } }).sounds.lipJet!.candidates;
    expect(candidate.variants).toEqual(['lipJet-1b.m4a', 'lipJet-1c.m4a']);
    expect(candidate.level).toBeUndefined();
    const lone = { ...generated, variants: [], level: -1 };
    const [plain] = parseManifest({ sounds: { lipJet: { candidates: [lone], chosen: 0, gain: 1 } } }).sounds.lipJet!.candidates;
    expect(plain.variants).toBeUndefined();
    expect(plain.level).toBeUndefined();
    const notAList = { ...generated, variants: 'lipJet-1b.m4a' };
    expect(parseManifest({ sounds: { lipJet: { candidates: [notAList], chosen: 0, gain: 1 } } }).sounds.lipJet!.candidates[0].variants).toBeUndefined();
  });

  it('pools no more than the most it may', () => {
    const many = { ...generated, variants: Array.from({ length: 40 }, (_, i) => `lipJet-1-${i}.m4a`) };
    const [candidate] = parseManifest({ sounds: { lipJet: { candidates: [many], chosen: 0, gain: 1 } } }).sounds.lipJet!.candidates;
    expect(candidateFiles(candidate)).toHaveLength(MAX_POOL);
  });
});

describe('the shipped manifest (public/assets/audio/sounds.json)', () => {
  const folder = 'public/assets/audio';
  const raw = JSON.parse(readFileSync(`${folder}/sounds.json`, 'utf8')) as {
    sounds: Record<string, { candidates: { file: string; variants?: string[] }[]; chosen: number; gain: number }>;
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
    const listed = Object.values(raw.sounds).flatMap((entry) => entry.candidates.flatMap((c) => [c.file, ...(c.variants ?? [])]));
    expect(new Set(listed).size).toBe(listed.length);
    for (const file of listed) {
      expect(file, file).toMatch(/\.m4a$/);
      expect(existsSync(`${folder}/${file}`), file).toBe(true);
    }
    const shipped = readdirSync(folder).filter((name) => name.endsWith('.m4a'));
    expect([...shipped].sort()).toEqual([...listed].sort());
  });

  // The engine runs at the recordings' rate, so decodeAudioData never resamples one (a resampled loop's wrap has edges).
  it('ships every recording at the engine\'s rate', () => {
    for (const file of readdirSync(folder).filter((name) => name.endsWith('.m4a'))) {
      const bytes = readFileSync(`${folder}/${file}`);
      const at = bytes.indexOf('mdhd');
      expect(at, file).toBeGreaterThan(0);
      // The media header's timescale: after its version, flags and two times (32-bit in version 0, 64-bit in 1).
      expect(bytes.readUInt32BE(at + (bytes[at + 4] === 1 ? 24 : 16)), file).toBe(RECORDING_RATE);
    }
  });
});

/** Enough of a Web Audio context for the bank: buffers, and a decoder that can fail. */
function fakeContext(decode: (data: ArrayBuffer) => Promise<unknown>): AudioContextLike {
  return {
    sampleRate: 22050,
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length);
      return { numberOfChannels: channels, length, sampleRate, getChannelData: () => data, copyToChannel: (source: Float32Array) => data.set(source) } as unknown as AudioBuffer;
    },
    decodeAudioData: (data: ArrayBuffer) => decode(data) as Promise<AudioBuffer>,
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

  // A file's recording is told apart by the length of what the fetcher returned for it.
  const pooled = (files: string[], overrides: Record<string, unknown> = {}) => parseManifest({
    sounds: { paddle: { candidates: [{ ...candidate, file: files[0], variants: files.slice(1), ...overrides }], chosen: 0, gain: 1.2 } },
  });
  const fetchByName = (names: string[], failing: string[] = []) => vi.fn(async (url: string) => {
    const name = url.split('/').pop()!;
    if (failing.includes(name)) throw new Error('offline');
    return new ArrayBuffer(8 * (names.indexOf(name) + 1));
  });
  const decodeByLength = async (data: ArrayBuffer) => ({ length: data.byteLength / 8 }) as unknown as AudioBuffer;

  it('loads every recording of a pool and plays them in turn, never the same one twice running', async () => {
    const names = ['p1.m4a', 'p2.m4a', 'p3.m4a', 'p4.m4a'];
    const fetcher = fetchByName(names);
    const bank = new SoundBank(fakeContext(decodeByLength), pooled(names), { fetcher, base: '/a/', random: () => 0.3 });
    await bank.ready;
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(bank.poolSize('paddle')).toBe(4);
    // The first recording stays the sound's buffer, whatever the pool has played.
    expect(bank.buffer('paddle').length).toBe(1);
    let previous = 0;
    const seen = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      const length = bank.variant('paddle').length;
      expect(length).not.toBe(previous);
      previous = length;
      seen.add(length);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
    expect(bank.buffer('paddle').length).toBe(1);
  });

  it('keeps the rest of a pool when one file fails, and falls back to the synthesised sound when all do', async () => {
    const names = ['p1.m4a', 'p2.m4a', 'p3.m4a'];
    const some = new SoundBank(fakeContext(decodeByLength), pooled(names), { fetcher: fetchByName(names, ['p1.m4a']), base: '/a/' });
    await some.ready;
    expect(some.poolSize('paddle')).toBe(2);
    expect([some.variant('paddle').length, some.variant('paddle').length].sort()).toEqual([2, 3]);
    const none = new SoundBank(fakeContext(decodeByLength), pooled(names), { fetcher: fetchByName(names, names), base: '/a/' });
    await none.ready;
    expect(none.recorded('paddle')).toBe(false);
    expect(none.variant('paddle')).toBe(none.buffer('paddle'));
    expect(none.gain('paddle')).toBe(1);
  });

  it('gives a single recording the same buffer every time', async () => {
    const bank = new SoundBank(fakeContext(decodeByLength), pooled(['p1.m4a']), { fetcher: fetchByName(['p1.m4a']), base: '/a/' });
    await bank.ready;
    expect(bank.poolSize('paddle')).toBe(1);
    expect(bank.variant('paddle')).toBe(bank.buffer('paddle'));
    expect(bank.variant('paddle')).toBe(bank.buffer('paddle'));
  });

  it('scales the sound\'s gain by the chosen candidate\'s level, and offers each candidate\'s level to the sound check', async () => {
    const manifest = parseManifest({
      sounds: {
        lipJet: {
          candidates: [{ ...candidate, file: 'a.m4a' }, { ...candidate, file: 'b.m4a', level: 0.5 }],
          chosen: 1, gain: 1.4,
        },
      },
    });
    const bank = new SoundBank(fakeContext(decodeByLength), manifest, { fetcher: fetchByName(['a.m4a', 'b.m4a']), base: '/a/' });
    await bank.ready;
    expect(bank.gain('lipJet')).toBeCloseTo(0.7, 9);
    expect(bank.candidateLevel('lipJet', 0)).toBe(1);
    expect(bank.candidateLevel('lipJet', 1)).toBe(0.5);
    expect(bank.candidateLevel('lipJet', 9)).toBe(1);
  });

  it('hands the sound check a pooled candidate\'s recordings in turn, loading each file once', async () => {
    const names = ['p1.m4a', 'p2.m4a', 'p3.m4a'];
    const fetcher = fetchByName(names);
    const bank = new SoundBank(fakeContext(decodeByLength), pooled(names), { fetcher, base: '/a/', random: () => 0.7 });
    await bank.ready;
    fetcher.mockClear();
    const heard: number[] = [];
    for (let i = 0; i < 6; i += 1) heard.push((await bank.candidate('paddle', 0))!.length);
    expect(fetcher).not.toHaveBeenCalled();
    expect(heard.slice(0, 3).sort()).toEqual([1, 2, 3]);
    expect(heard.slice(3).sort()).toEqual([1, 2, 3]);
    expect(await bank.candidate('paddle', 4)).toBeUndefined();
  });
});
