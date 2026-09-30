import { BARREL_CASES } from './barrelLibraryIndex';
import { decodeCase } from './profileFormat';
import { ProfileLibrary } from './ProfileLibrary';

/** One case in the generated index: what it covers, and where its frames are (public/<asset>). */
export interface BarrelCaseEntry {
  id: string;
  slope: number;
  nonlinearity: number;
  flatDepth: number;
  asset: string;
}

/** Every case in the index, fetched and decoded into one library. A node caller passes a fetcher that reads public/. */
export async function loadBarrelLibrary(
  cases: readonly BarrelCaseEntry[] = BARREL_CASES,
  fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<ProfileLibrary> {
  if (cases.length === 0) throw new Error('The barrel library has no cases; run npm run barrels');
  const decoded = await Promise.all(cases.map(async (entry) => {
    const response = await fetcher(entry.asset);
    if (!response.ok) throw new Error(`The barrel case ${entry.asset} did not load (${response.status})`);
    return decodeCase(new Uint8Array(await response.arrayBuffer()));
  }));
  return new ProfileLibrary(decoded);
}
