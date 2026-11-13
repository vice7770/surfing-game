import { readFileSync } from 'node:fs';
import { WAVE_CASES, type WaveCaseEntry } from './libraryCases';

/** The wave library's game files from public/, for node tests and probes (the page fetches them). */
export function readWaveCases(entries: readonly WaveCaseEntry[] = WAVE_CASES): Uint8Array[] {
  return entries.map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
}
