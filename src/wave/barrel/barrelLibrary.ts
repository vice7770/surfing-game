import type { SpotName } from '../Bathymetry';
import { BARREL_CASES } from './barrelLibraryIndex';
import { decodeCase } from './profileFormat';
import { ProfileLibrary } from './ProfileLibrary';

/** One case in the generated index: the spot whose transect it was run on, what it covers, and where its frames are (public/<asset>). */
export interface BarrelCaseEntry {
  id: string;
  spot: SpotName;
  slope: number;
  nonlinearity: number;
  flatDepth: number;
  asset: string;
}

/** The index's cases for one spot (Part B, PR 7): a spot loads only its own transect's cases. */
export function barrelCasesFor(spot: SpotName, cases: readonly BarrelCaseEntry[] = BARREL_CASES): BarrelCaseEntry[] {
  return cases.filter((entry) => entry.spot === spot);
}

/**
 * Every case's file in the list, fetched: the page draws from them and hands them to the surf zone for its contact
 * (the Padang Padang spec, Part B, PR 4). A node caller passes a fetcher that reads public/.
 */
export async function loadBarrelCaseBytes(
  cases: readonly BarrelCaseEntry[] = BARREL_CASES,
  fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<Uint8Array[]> {
  if (cases.length === 0) throw new Error('The barrel library has no cases; run npm run barrels');
  return Promise.all(cases.map(async (entry) => {
    const response = await fetcher(entry.asset);
    if (!response.ok) throw new Error(`The barrel case ${entry.asset} did not load (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }));
}

/**
 * How the swept barrel draws and collides its tubes (the owner, 2026-10-22: "draw tubes from our own simulations, not
 * the thin hand-made shape"):
 * - `basilisk`, the default: each case's own Basilisk frames, blended and scaled (`ProfileLibrary`'s raw path), so the
 *   lip's thickness, its tip's path and the void are the runs' own (docs/research/tube-from-basilisk-2026-10-22);
 * - `bounded-C`: the authored parameter-first C profile the game drew from 2026-10-05 (bc0b489f) to 2026-10-22, which
 *   takes only the crest, toe and their tangents from the cases (a lip 0.014–0.021 H thick). Kept for the
 *   `?tubeShape=c` A/B only (`SurfZoneConfig.tubeShape`).
 */
export type TubeShape = 'basilisk' | 'bounded-C';

/** Case files decoded into one library, drawn as `shape` says (`TubeShape`). */
export function libraryFromBytes(bytes: readonly Uint8Array[], shape: TubeShape = 'basilisk'): ProfileLibrary {
  const cases = bytes.map(decodeCase);
  if (shape !== 'bounded-C') return new ProfileLibrary(cases);
  // The bounded provider's explicitly evaluated domain is the shipped cases. General fixtures stay raw.
  const eligible = cases.every((c) => BARREL_CASES.some((entry) => entry.id === c.id));
  return new ProfileLibrary(cases, eligible ? { geometry: 'bounded-C' } : {});
}

/** Every case in the list, fetched and decoded into one library. */
export async function loadBarrelLibrary(
  cases: readonly BarrelCaseEntry[] = BARREL_CASES,
  fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  shape: TubeShape = 'basilisk',
): Promise<ProfileLibrary> {
  return libraryFromBytes(await loadBarrelCaseBytes(cases, fetcher), shape);
}
