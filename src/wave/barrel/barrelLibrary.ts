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

/**
 * Cases kept in the index but not drawn, by their run's name (any level: a rerun keeps its note), and why (the
 * water-physics advisor, 2026-10-22, docs/research/canyon-tube-runs). A spot never blends a tube case with a curl case:
 * the library draws tubes, and where its physics only curls or folds the spot's own look draws the white.
 */
export const BARREL_CASE_NOTES: Readonly<Record<string, { drawn: false; note: string }>> = {
  'periodic-canyon23-a49': {
    drawn: false,
    note: "The Canyon's Big sets (A0 0.42, 14 s): a fold at the crest, not a tube (A_O 0.03 H_I², ξ_b 0.38); their curl stays the spilling lip's",
  },
  'periodic-canyon23-a29': {
    drawn: false,
    note: "The Canyon's Medium sets (A0 0.21, 11 s): a curl, under-resolved (1.6 cells across the lip), a lower bound; provisional",
  },
};

/** A case's note (`BARREL_CASE_NOTES`), by its id less its level (`-l12`, `-l13`, …). */
export function barrelCaseNote(id: string): { drawn: false; note: string } | undefined {
  return BARREL_CASE_NOTES[id.replace(/-l\d+$/, '')];
}

/** The index's cases for one spot (Part B, PR 7): a spot loads only its own transect's cases, and only those it draws. */
export function barrelCasesFor(spot: SpotName, cases: readonly BarrelCaseEntry[] = BARREL_CASES): BarrelCaseEntry[] {
  return cases.filter((entry) => entry.spot === spot && !barrelCaseNote(entry.id));
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

/**
 * The bounded-C's evaluated domain (bc0b489f): the eight cases shipped with it, Padang Padang's, the Reef's and the
 * Point's. The Canyon's cases came after it, so the `?tubeShape=c` A/B draws them raw.
 */
export const BOUNDED_C_CASES: readonly BarrelCaseEntry[] = BARREL_CASES.filter((entry) => entry.spot !== 'canyon');

/** Case files decoded into one library, drawn as `shape` says (`TubeShape`). */
export function libraryFromBytes(bytes: readonly Uint8Array[], shape: TubeShape = 'basilisk'): ProfileLibrary {
  const cases = bytes.map(decodeCase);
  if (shape !== 'bounded-C') return new ProfileLibrary(cases);
  // The bounded provider's explicitly evaluated domain is the cases shipped with it. General fixtures stay raw.
  const eligible = cases.every((c) => BOUNDED_C_CASES.some((entry) => entry.id === c.id));
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
