import { readFileSync } from 'node:fs';
import type { SpotName } from '../Bathymetry';
import { barrelCaseNote, barrelCasesFor, type BarrelCaseEntry, type PoolTubeCase } from './barrelLibrary';
import { BARREL_CASES } from './barrelLibraryIndex';

/**
 * The index's case files from public/, for node tests and probes (the page fetches them): one spot's, or every spot's,
 * as the game draws them (`barrelCasesFor`: the cases kept but not drawn, `BARREL_CASE_NOTES`, left out; the Wave Pool's
 * default case, or `poolTubeCase`'s); or `entries` as given.
 */
export function readBarrelCases(spot?: SpotName, entries?: readonly BarrelCaseEntry[], poolTubeCase?: PoolTubeCase): Uint8Array[] {
  const chosen = spot ? barrelCasesFor(spot, entries, poolTubeCase) : entries ?? BARREL_CASES.filter((entry) => !barrelCaseNote(entry.id));
  return chosen.map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
}
