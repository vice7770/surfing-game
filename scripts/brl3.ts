/**
 * `npm run barrels -- --format brl3`: C2's case files (c2_library.py's `<run>_c2.json.gz`) packed as BRL3
 * (src/wave/library/caseFormat.ts), for `WaveLibrary` (C2 step 1b, docs/research/wave-strategy-alternatives/c2-step1b.md).
 * Nothing in the game reads them yet, so there is no default folder:
 *
 *   npm run barrels -- --format brl3 --assets DIR [--runs DIR] --run NAME … [--c2 FILE …] [--index FILE.json]
 *
 * --run NAME reads `<runs>/<NAME>_c2.json.gz` (runs: tools/basilisk/runs); --c2 FILE reads that file. Each case is written
 * to `<assets>/<id>.bin`, the id being the run's name in lower case with dashes; --index writes their entries as JSON.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { caseFromC2, type C2File } from '../src/wave/library/caseFromC2';
import { decodeWaveCase, encodeWaveCase } from '../src/wave/library/caseFormat';

export interface Brl3Entry { id: string; run: string; a0: number; slope: number; reefDepth: number; frames: number; bytes: number; asset: string }

export function packBrl3(options: (name: string) => string[]): Brl3Entry[] {
  const assets = options('assets')[0];
  const runsDir = options('runs')[0] ?? 'tools/basilisk/runs';
  const files = [...options('run').map((run) => `${runsDir}/${run}_c2.json.gz`), ...options('c2')];
  if (!assets || files.length === 0) {
    console.error('usage: npm run barrels -- --format brl3 --assets DIR [--runs DIR] --run NAME … [--c2 FILE …] [--index FILE.json]');
    process.exit(1);
  }
  mkdirSync(assets, { recursive: true });
  const entries: Brl3Entry[] = [];
  for (const file of files) {
    const raw = readFileSync(file);
    const c2 = JSON.parse((file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8')) as C2File;
    const id = c2.run.toLowerCase().replaceAll('_', '-');
    const bytes = encodeWaveCase(caseFromC2(c2, id));
    // The file must read back as written.
    const again = encodeWaveCase(decodeWaveCase(bytes));
    if (again.length !== bytes.length || again.some((b, i) => b !== bytes[i])) throw new Error(`${id}: BRL3 does not read back byte for byte`);
    writeFileSync(`${assets}/${id}.bin`, bytes);
    const h = decodeWaveCase(bytes).header;
    entries.push({ id, run: c2.run, a0: h.a0, slope: h.slope, reefDepth: h.reefDepth, frames: h.frames, bytes: bytes.length, asset: `${basename(assets)}/${id}.bin` });
    console.log(`${id}: ${h.frames} frames (own ${h.uses.own}, refill ${h.uses.refill}), A0 ${h.a0}, slope ${h.slope}, HS/h0 ${h.reefDepth}, ${(bytes.length / 1e6).toFixed(2)} MB`);
  }
  const index = options('index')[0];
  if (index) {
    mkdirSync(dirname(index), { recursive: true });
    writeFileSync(index, `${JSON.stringify(entries, null, 2)}\n`);
  }
  return entries;
}
