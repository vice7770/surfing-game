import { readFileSync } from 'node:fs';
import { BARREL_CASES } from './barrelLibraryIndex';

/** The index's case files from public/, for node tests and probes (the page fetches them). */
export function readBarrelCases(): Uint8Array[] {
  return BARREL_CASES.map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
}
