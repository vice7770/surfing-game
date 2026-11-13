/**
 * C2 step 3: the wave library's game files (public/library, `scripts/barrel-library.ts --format brl3 --game`), the pool
 * library's finished level-12 runs (docs/research/wave-strategy-alternatives/c2-step3.md, "The cases"). The keys are the
 * cases' own (their headers say the same); the matcher brackets them (`StateMatcher`). Read with `?wave=library` only.
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
  { id: 'periodic-pool-c2-b1-a2-l12', a0: 0.2503, slope: 0.036, reefDepth: 0.19, asset: 'library/periodic-pool-c2-b1-a2-l12.bin' },
  { id: 'periodic-pool-c2-b1-a3-l12', a0: 0.3553, slope: 0.036, reefDepth: 0.19, asset: 'library/periodic-pool-c2-b1-a3-l12.bin' },
  { id: 'periodic-pool-c2-b2-a2-l12', a0: 0.252, slope: 0.068, reefDepth: 0.205, asset: 'library/periodic-pool-c2-b2-a2-l12.bin' },
  { id: 'periodic-pool-c2-b2-a3-l12', a0: 0.3586, slope: 0.068, reefDepth: 0.205, asset: 'library/periodic-pool-c2-b2-a3-l12.bin' },
  { id: 'periodic-pool-c2-b3-a2-l12', a0: 0.2526, slope: 0.105, reefDepth: 0.3, asset: 'library/periodic-pool-c2-b3-a2-l12.bin' },
  { id: 'periodic-pool-c2-b3-a3-l12', a0: 0.3577, slope: 0.105, reefDepth: 0.3, asset: 'library/periodic-pool-c2-b3-a3-l12.bin' },
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
