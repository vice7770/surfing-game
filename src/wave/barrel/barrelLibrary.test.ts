import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { barrelCaseNote, barrelCasesFor, libraryFromBytes, loadBarrelCaseBytes, loadBarrelLibrary, type BarrelCaseEntry } from './barrelLibrary';
import { BARREL_CASES } from './barrelLibraryIndex';
import { caseFromLibrary, type LibraryJson } from './caseFromLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { encodeCase } from './profileFormat';
import { PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';

const sample = JSON.parse(readFileSync('docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json', 'utf8')) as LibraryJson;
const { barrel } = caseFromLibrary(sample, 'test', 0.1785714);
const entry: BarrelCaseEntry = { id: 'test', spot: 'padang', slope: barrel.slope, nonlinearity: barrel.nonlinearity, flatDepth: barrel.flatDepth, asset: 'barrels/test.bin' };

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

  it('reads the index’s case files in node: every case a spot draws, or the entries asked for', () => {
    const cases = readBarrelCases();
    expect(cases.length).toBe(BARREL_CASES.filter((entry) => !barrelCaseNote(entry.id)).length);
    expect(readBarrelCases(undefined, BARREL_CASES).length).toBe(BARREL_CASES.length);
    expect(libraryFromBytes(cases)).toBeInstanceOf(ProfileLibrary);
  });

  it('keeps the Canyon’s fold and curl cases in the index, labelled, and draws its tube case alone (2026-10-22)', () => {
    const canyon = BARREL_CASES.filter((entry) => entry.spot === 'canyon').map((entry) => entry.id);
    expect(canyon.map((id) => id.replace(/-l\d+$/, '')).sort()).toEqual(['periodic-canyon23-a29', 'periodic-canyon23-a38', 'periodic-canyon23-a49']);
    expect(barrelCasesFor('canyon').map((entry) => entry.id.replace(/-l\d+$/, ''))).toEqual(['periodic-canyon23-a38']);
    expect(barrelCaseNote('periodic-canyon23-a49-l13')?.note).toMatch(/fold/);
    expect(barrelCaseNote('periodic-canyon23-a29-l14')?.note).toMatch(/provisional/);
    // canyon23f74_a38 is never staged (the advisor, 2026-10-22).
    expect(BARREL_CASES.some((entry) => entry.id.startsWith('periodic-canyon23f74'))).toBe(false);
    // The bounded-C A/B never reads a Canyon case: they came after it.
    expect(libraryFromBytes(readBarrelCases('canyon'), 'bounded-C').options.geometry).toBeUndefined();
  });

  // PR 7: each spot loads only its own transect's cases.
  it('picks a spot’s own cases from the index', () => {
    const reef: BarrelCaseEntry = { ...entry, id: 'reef-test', spot: 'reef', asset: 'barrels/reef-test.bin' };
    expect(barrelCasesFor('reef', [entry, reef])).toEqual([reef]);
    expect(barrelCasesFor('canyon', [entry, reef])).toEqual([]);
    const padang = barrelCasesFor('padang');
    expect(padang.length).toBeGreaterThan(0);
    expect(padang.every((c) => c.spot === 'padang')).toBe(true);
    expect(readBarrelCases('padang').length).toBe(padang.length);
  });

  it('names the case that did not load', async () => {
    const fetcher = async () => ({ ok: false, status: 404 }) as unknown as Response;
    await expect(loadBarrelLibrary([entry], fetcher as typeof fetch)).rejects.toThrow(/barrels\/test\.bin/);
  });
});
