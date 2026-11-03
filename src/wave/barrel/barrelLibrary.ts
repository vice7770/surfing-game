import type { SpotName } from '../Bathymetry';
import { BARREL_CASES } from './barrelLibraryIndex';
import { decodeCase } from './profileFormat';
import { ProfileLibrary } from './ProfileLibrary';
import { BARREL_SPOTS } from './barrelSpots';

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

/**
 * The Wave Pool's straight Barrel's tube cases, by id (pool-barrel-drawing, T5: the pool loads only its own): the owner's
 * level-13 runs on its reef's ray (pool-tube-runs, the M4 Pro, 2026-11-02; docs/research/pool-tube-runs/report.md),
 * `pool_straight_small` (A0 0.271, the 1.5 m faces) and `pool_straight_big` (A0 0.355, the 1.8 m faces), read as one
 * family by A0 (`BarrelSpot.family`: one reef at two sizes; the advisor, 2026-11-01). Both throw a tube (the big one's
 * nearly closed: a void of 0.20 × 0.04 m), so both are drawn.
 */
export const POOL_TUBE_CASES: readonly string[] = ['periodic-pool-straight-small-l13', 'periodic-pool-straight-big-l13'];

/**
 * The pool's provisional stand-in before its own runs (pool-barrel-drawing, 2026-11-01): the Canyon's a38 alone,
 * Froude-scaled by each slice's foot crest (it drew within about 10 % of the meter's face at the foot crests the game
 * measures). Kept for the `?poolTubeCase=a38` A/B (`SurfZoneConfig.poolTubeCase`); online rooms run the default.
 */
export const POOL_TUBE_STAND_IN: readonly string[] = ['periodic-canyon23-a38-l13'];

/** Which cases the pool's tube is drawn and felt from: its own (the default) or the stand-in, `'a38'`. */
export type PoolTubeCase = 'a38';

/**
 * The index's cases for one spot (Part B, PR 7): a spot loads only its own transect's cases, and only those it draws; the
 * Wave Pool, its own list (`POOL_TUBE_CASES`), or the stand-in's (`poolTubeCase` 'a38').
 */
export function barrelCasesFor(spot: SpotName, cases: readonly BarrelCaseEntry[] = BARREL_CASES, poolTubeCase?: PoolTubeCase): BarrelCaseEntry[] {
  if (spot === 'pool') {
    const ids = poolTubeCase === 'a38' ? POOL_TUBE_STAND_IN : POOL_TUBE_CASES;
    return cases.filter((entry) => ids.includes(entry.id));
  }
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
 * Point's. The Canyon's and the Wave Pool's cases came after it, so the `?tubeShape=c` A/B draws them raw.
 */
export const BOUNDED_C_CASES: readonly BarrelCaseEntry[] = BARREL_CASES.filter((entry) => entry.spot !== 'canyon' && entry.spot !== 'pool');

/**
 * Case files decoded into one library, drawn as `shape` says (`TubeShape`). At a spot whose cases are one family
 * (`BarrelSpot.family`: one floor at several sizes), every case takes the spot's slope, so a slice blends them by its A0
 * alone; each case's own slope along its ray stays in its file and notes.
 */
export function libraryFromBytes(bytes: readonly Uint8Array[], shape: TubeShape = 'basilisk', spot?: SpotName): ProfileLibrary {
  const family = spot !== undefined && BARREL_SPOTS[spot]?.family ? BARREL_SPOTS[spot]!.slope : undefined;
  const cases = bytes.map(decodeCase).map((c) => (family === undefined ? c : { ...c, slope: family }));
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
  spot?: SpotName,
): Promise<ProfileLibrary> {
  return libraryFromBytes(await loadBarrelCaseBytes(cases, fetcher), shape, spot);
}
