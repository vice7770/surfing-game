import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { libraryFromBytes, loadBarrelCaseBytes, loadBarrelLibrary, type BarrelCaseEntry } from './barrelLibrary';
import { BARREL_CASES } from './barrelLibraryIndex';
import { caseFromLibrary, type LibraryJson } from './caseFromLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { encodeCase } from './profileFormat';
import { PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';

const sample = JSON.parse(readFileSync('docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json', 'utf8')) as LibraryJson;
const { barrel } = caseFromLibrary(sample, 'test', 0.1785714);
const entry: BarrelCaseEntry = { id: 'test', slope: barrel.slope, nonlinearity: barrel.nonlinearity, flatDepth: barrel.flatDepth, asset: 'barrels/test.bin' };

describe('loading the barrel library', () => {
  it('fetches and decodes each case into one library', async () => {
    const bytes = encodeCase(barrel);
    const fetcher = async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes.slice().buffer }) as unknown as Response;
    const library = await loadBarrelLibrary([entry], fetcher as typeof fetch);
    const out = new Float32Array(2 * PROFILE_POINTS);
    const lookup = library.profileAt({ slope: barrel.slope, footHeight: barrel.nonlinearity * 7, footDepth: 7, seconds: 0.2 }, out);
    expect(lookup).toMatchObject({ caseId: 'test', clamped: false, phase: 'open' });
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('fetches the case bytes, which build the same library (the page shares them with the worker)', async () => {
    const bytes = encodeCase(barrel);
    const fetcher = async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes.slice().buffer }) as unknown as Response;
    const loaded = await loadBarrelCaseBytes([entry], fetcher as typeof fetch);
    expect(Array.from(loaded[0])).toEqual(Array.from(bytes));
    const out = new Float32Array(2 * PROFILE_POINTS);
    expect(libraryFromBytes(loaded).profileAt({ slope: barrel.slope, footHeight: barrel.nonlinearity * 7, footDepth: 7, seconds: 0.2 }, out).caseId).toBe('test');
  });

  it('reads the index’s case files in node', () => {
    const cases = readBarrelCases();
    expect(cases.length).toBe(BARREL_CASES.length);
    expect(libraryFromBytes(cases)).toBeInstanceOf(ProfileLibrary);
  });

  it('names the case that did not load', async () => {
    const fetcher = async () => ({ ok: false, status: 404 }) as unknown as Response;
    await expect(loadBarrelLibrary([entry], fetcher as typeof fetch)).rejects.toThrow(/barrels\/test\.bin/);
  });
});
