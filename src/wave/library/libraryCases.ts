/**
 * C2 step 3: the wave library's game files (public/library, `scripts/barrel-library.ts --format brl3 --game`), the pool
 * library's finished level-12 runs (docs/research/wave-strategy-alternatives/c2-step3.md, "The cases"). The keys are the
 * cases' own (their headers say the same); the matcher brackets them (`StateMatcher`). Read with `?wave=library` only.
 *
 * C2 step 5b: ruling 31's ten more runs are here too (`pool-c2-library-r31`), the nine of step 3 unchanged. They fill
 * the gaps the first nine clamped against: the A0 0.12 row on the three beds, the slopes 0.055 and 0.085, and slope
 * 0.105 at HS/h0 0.20, which makes HS/h0 a real key for the first time. `b1-a0` spills and `b3s-a3` never throws; both
 * are kept, because a slice near their corner of the keys should take their shape, not a plunger's.
 */
export interface WaveCaseEntry {
  id: string;
  /** The foot crest over the foot depth, the bed's slope, the reef crest's depth over h0. */
  a0: number;
  slope: number;
  reefDepth: number;
  /** Its file, from public/. */
  asset: string;
}

export const WAVE_CASES: readonly WaveCaseEntry[] = [
  { id: 'periodic-pool-c2-b1-a0-l12', a0: 0.1263, slope: 0.036, reefDepth: 0.19, asset: 'library/periodic-pool-c2-b1-a0-l12.bin' },
  { id: 'periodic-pool-c2-b1-a1-l12', a0: 0.1506, slope: 0.036, reefDepth: 0.19, asset: 'library/periodic-pool-c2-b1-a1-l12.bin' },
  { id: 'periodic-pool-c2-b1-a2-l12', a0: 0.2503, slope: 0.036, reefDepth: 0.19, asset: 'library/periodic-pool-c2-b1-a2-l12.bin' },
  { id: 'periodic-pool-c2-b1-a3-l12', a0: 0.3553, slope: 0.036, reefDepth: 0.19, asset: 'library/periodic-pool-c2-b1-a3-l12.bin' },
  { id: 'periodic-pool-c2-b15-a2-l12', a0: 0.251, slope: 0.055, reefDepth: 0.199, asset: 'library/periodic-pool-c2-b15-a2-l12.bin' },
  { id: 'periodic-pool-c2-b15-a3-l12', a0: 0.3569, slope: 0.055, reefDepth: 0.199, asset: 'library/periodic-pool-c2-b15-a3-l12.bin' },
  { id: 'periodic-pool-c2-b2-a0-l12', a0: 0.1278, slope: 0.068, reefDepth: 0.205, asset: 'library/periodic-pool-c2-b2-a0-l12.bin' },
  { id: 'periodic-pool-c2-b2-a1-l12', a0: 0.1519, slope: 0.068, reefDepth: 0.205, asset: 'library/periodic-pool-c2-b2-a1-l12.bin' },
  { id: 'periodic-pool-c2-b2-a2-l12', a0: 0.252, slope: 0.068, reefDepth: 0.205, asset: 'library/periodic-pool-c2-b2-a2-l12.bin' },
  { id: 'periodic-pool-c2-b2-a3-l12', a0: 0.3586, slope: 0.068, reefDepth: 0.205, asset: 'library/periodic-pool-c2-b2-a3-l12.bin' },
  { id: 'periodic-pool-c2-b25-a2-l12', a0: 0.2532, slope: 0.085, reefDepth: 0.249, asset: 'library/periodic-pool-c2-b25-a2-l12.bin' },
  { id: 'periodic-pool-c2-b25-a3-l12', a0: 0.3597, slope: 0.085, reefDepth: 0.249, asset: 'library/periodic-pool-c2-b25-a3-l12.bin' },
  { id: 'periodic-pool-c2-b3-a0-l12', a0: 0.1294, slope: 0.105, reefDepth: 0.3, asset: 'library/periodic-pool-c2-b3-a0-l12.bin' },
  { id: 'periodic-pool-c2-b3-a1-l12', a0: 0.1535, slope: 0.105, reefDepth: 0.3, asset: 'library/periodic-pool-c2-b3-a1-l12.bin' },
  { id: 'periodic-pool-c2-b3-a2-l12', a0: 0.2526, slope: 0.105, reefDepth: 0.3, asset: 'library/periodic-pool-c2-b3-a2-l12.bin' },
  { id: 'periodic-pool-c2-b3-a3-l12', a0: 0.3577, slope: 0.105, reefDepth: 0.3, asset: 'library/periodic-pool-c2-b3-a3-l12.bin' },
  { id: 'periodic-pool-c2-b3s-a1-l12', a0: 0.1545, slope: 0.105, reefDepth: 0.2, asset: 'library/periodic-pool-c2-b3s-a1-l12.bin' },
  { id: 'periodic-pool-c2-b3s-a2-l12', a0: 0.2546, slope: 0.105, reefDepth: 0.2, asset: 'library/periodic-pool-c2-b3s-a2-l12.bin' },
  { id: 'periodic-pool-c2-b3s-a3-l12', a0: 0.3611, slope: 0.105, reefDepth: 0.2, asset: 'library/periodic-pool-c2-b3s-a3-l12.bin' },
];

/** Every case's file, fetched (a node caller passes a fetcher that reads public/). */
export async function loadWaveCaseBytes(
  cases: readonly WaveCaseEntry[] = WAVE_CASES,
  fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<Uint8Array[]> {
  if (cases.length === 0) throw new Error('The wave library has no cases');
  return Promise.all(cases.map(async (entry) => {
    const response = await fetcher(entry.asset);
    if (!response.ok) throw new Error(`The wave case ${entry.asset} did not load (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }));
}
