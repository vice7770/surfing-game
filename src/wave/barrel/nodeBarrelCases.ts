import { readFileSync } from 'node:fs';
import type { SpotName } from '../Bathymetry';
import { barrelCaseNote, barrelCasesFor, type BarrelCaseEntry } from './barrelLibrary';
import { BARREL_CASES } from './barrelLibraryIndex';

/**
 * The index's case files from public/, for node tests and probes (the page fetches them): one spot's, or every spot's,
 * as the game draws them (`barrelCasesFor`: the cases kept but not drawn, `BARREL_CASE_NOTES`, left out); or `entries`
 * as given.
 */
export function readBarrelCases(spot?: SpotName, entries?: readonly BarrelCaseEntry[]): Uint8Array[] {
  const chosen = spot ? barrelCasesFor(spot, entries) : entries ?? BARREL_CASES.filter((entry) => !barrelCaseNote(entry.id));
  return chosen.map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
}
