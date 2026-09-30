import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadBarrelLibrary, type BarrelCaseEntry } from './barrelLibrary';
import { caseFromLibrary, type LibraryJson } from './caseFromLibrary';
import { encodeCase } from './profileFormat';
import { PROFILE_POINTS } from './ProfileLibrary';

const sample = JSON.parse(readFileSync('docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json', 'utf8')) as LibraryJson;
const { barrel } = caseFromLibrary(sample, 'test', 0.1785714);
const entry: BarrelCaseEntry = { id: 'test', slope: barrel.slope, nonlinearity: barrel.nonlinearity, flatDepth: barrel.flatDepth, asset: 'barrels/test.bin' };

describe('loading the barrel library', () => {
  it('fetches and decodes each case into one library', async () => {
    const bytes = encodeCase(barrel);
    const fetcher = async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes.slice().buffer }) as unknown as Response;
    const library = await loadBarrelLibrary([entry], fetcher as typeof fetch);
    const out = new Float32Array(2 * PROFILE_POINTS);
    const lookup = library.profileAt({ slope: barrel.slope, nonlinearity: barrel.nonlinearity, height: 2, seconds: 0.2 }, out);
    expect(lookup).toMatchObject({ caseId: 'test', clamped: false, phase: 'open' });
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('names the case that did not load', async () => {
    const fetcher = async () => ({ ok: false, status: 404 }) as unknown as Response;
    await expect(loadBarrelLibrary([entry], fetcher as typeof fetch)).rejects.toThrow(/barrels\/test\.bin/);
  });
});
