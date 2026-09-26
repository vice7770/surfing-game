import { SOUND_IDS, type SoundId } from './synth';

/**
 * Which recording each sound plays (S1): `public/assets/audio/sounds.json`.
 * Every candidate is CC0 and listed in docs/ASSETS.md; the sound check in the
 * Wave Lab auditions them, and `chosen` picks one. A sound with no candidates
 * plays its synthesised version.
 */
export interface SoundCandidate {
  file: string;
  source: string;
  author: string;
  licence: 'CC0';
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
  return typeof c.file === 'string' && c.file.length > 0 && typeof c.source === 'string' && typeof c.author === 'string' && c.licence === 'CC0';
}

/** Keep the known sounds with their valid CC0 candidates; a bad choice or gain falls back to 0 and 1. */
export function parseManifest(raw: unknown): SoundManifest {
  const sounds = record(record(raw).sounds);
  const manifest: SoundManifest = { sounds: {} };
  for (const id of SOUND_IDS) {
    if (!(id in sounds)) continue;
    const entry = record(sounds[id]);
    const candidates = Array.isArray(entry.candidates) ? entry.candidates.filter(validCandidate) : [];
    const chosen = Number.isInteger(entry.chosen) && (entry.chosen as number) >= 0 && (entry.chosen as number) < candidates.length ? entry.chosen as number : 0;
    const gain = typeof entry.gain === 'number' && entry.gain >= 0 && entry.gain <= 2 ? entry.gain : 1;
    manifest.sounds[id] = { candidates, chosen, gain };
  }
  return manifest;
}
