import { readFileSync } from 'node:fs';
import type { SpotName } from '../Bathymetry';
import { barrelCasesFor } from './barrelLibrary';
import { BARREL_CASES } from './barrelLibraryIndex';

/** The index's case files from public/, for node tests and probes (the page fetches them): one spot's, or all. */
export function readBarrelCases(spot?: SpotName): Uint8Array[] {
  return (spot ? barrelCasesFor(spot) : BARREL_CASES).map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
}
