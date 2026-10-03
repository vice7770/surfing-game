import { SOUND_IDS, type SoundId } from './synth';

/**
 * Which recording each sound plays (S1): `public/assets/audio/sounds.json`.
 * Every candidate is listed in docs/ASSETS.md with its licence: `CC0` (a
 * public-domain file) or `generated` (made with a sound model under the owner's
 * plan, its prompt recorded there). The sound check in the Wave Lab auditions
 * them, and `chosen` picks one. A sound with no candidates plays its
 * synthesised version.
 */
export type SoundLicence = 'CC0' | 'generated';
const LICENCES: readonly SoundLicence[] = ['CC0', 'generated'];

/** Most recordings one candidate may pool. */
export const MAX_POOL = 16;

/**
 * The rate every recording is made at, Hz. The engine runs its context at it, so a browser never resamples a
 * recording as it decodes it (see `openContext` in AudioEngine.ts).
 */
export const RECORDING_RATE = 44100;

export interface SoundCandidate {
  file: string;
  /**
   * More recordings of the same sound, played in turn with `file` (a pool), so a
   * sound that fires many times a second in one place does not machine-gun one
   * file. Only one-shots use the pool: a loop plays `file`.
   */
  variants?: string[];
  /**
   * This candidate's level against the sound's `gain`, 0–2 (1 when absent). It
   * matches the candidates of one sound in loudness, so the sound check's A/B does
   * not favour the louder file. Provisional: measured (docs/ASSETS.md), not heard.
   */
  level?: number;
  /** Where it came from: the file's URL for CC0, or for a generated one the generator and date. */
  source: string;
  /** Who made it; the sound check labels the candidate's button with this. */
  author: string;
  licence: SoundLicence;
}

export interface SoundEntry {
  candidates: SoundCandidate[];
  chosen: number;
  /** Relative level of the recording, 0–2. */
  gain: number;
}

export interface SoundManifest {
  sounds: Partial<Record<SoundId, SoundEntry>>;
}

type Loose = Record<string, unknown>;
const record = (value: unknown): Loose => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Loose : {});

function validCandidate(value: unknown): value is SoundCandidate {
  const c = record(value);
  return typeof c.file === 'string' && c.file.length > 0 && typeof c.source === 'string' && typeof c.author === 'string' && LICENCES.includes(c.licence as SoundLicence);
}

/** A candidate as the game reads it: the pool keeps its usable file names, an unusable level is dropped. */
function cleanCandidate(candidate: SoundCandidate): SoundCandidate {
  const { variants, level, ...rest } = candidate;
  const clean: SoundCandidate = { ...rest };
  if (Array.isArray(variants)) {
    const pool = variants.filter((file, i) => typeof file === 'string' && file.length > 0 && file !== candidate.file && variants.indexOf(file) === i);
    if (pool.length > 0) clean.variants = pool.slice(0, MAX_POOL - 1);
  }
  if (typeof level === 'number' && level >= 0 && level <= 2) clean.level = level;
  return clean;
}

/** Keep the known sounds with their valid candidates (licence `CC0` or `generated`); a bad choice or gain falls back to 0 and 1. */
export function parseManifest(raw: unknown): SoundManifest {
  const sounds = record(record(raw).sounds);
  const manifest: SoundManifest = { sounds: {} };
  for (const id of SOUND_IDS) {
    if (!(id in sounds)) continue;
    const entry = record(sounds[id]);
    const candidates = Array.isArray(entry.candidates) ? entry.candidates.filter(validCandidate).map(cleanCandidate) : [];
    const chosen = Number.isInteger(entry.chosen) && (entry.chosen as number) >= 0 && (entry.chosen as number) < candidates.length ? entry.chosen as number : 0;
    const gain = typeof entry.gain === 'number' && entry.gain >= 0 && entry.gain <= 2 ? entry.gain : 1;
    manifest.sounds[id] = { candidates, chosen, gain };
  }
  return manifest;
}

/** Every file a candidate plays, the pool in its listed order. */
export function candidateFiles(candidate: SoundCandidate): string[] {
  return [candidate.file, ...(candidate.variants ?? [])];
}
