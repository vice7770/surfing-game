/**
 * C2 step 5f: every listed case's file decodes and its header's keys are the entry's, and what the whole set costs
 * to fetch. Run from the repository's root: `npx tsx docs/research/wave-strategy-alternatives/c2-step5f-keycheck.ts`.
 */
import { WAVE_CASES } from '../../../src/wave/library/libraryCases';
import { readWaveCases } from '../../../src/wave/library/nodeWaveCases';
import { decodeWaveCase } from '../../../src/wave/library/caseFormat';
import { WaveLibrary } from '../../../src/wave/library/WaveLibrary';

const bytes = readWaveCases();
let bad = 0;
let total = 0;
const groups = new Map<string, number[]>();
for (let i = 0; i < WAVE_CASES.length; i += 1) {
  const e = WAVE_CASES[i];
  const h = decodeWaveCase(bytes[i]).header;
  total += bytes[i].length;
  const ok = h.id === e.id && h.a0 === e.a0 && h.slope === e.slope && h.reefDepth === e.reefDepth;
  if (!ok) { bad += 1; console.log(`MISMATCH ${e.id}: header a0 ${h.a0} slope ${h.slope} HS/h0 ${h.reefDepth} id ${h.id}`); }
  const key = `${h.slope}/${h.reefDepth}`;
  (groups.get(key) ?? groups.set(key, []).get(key)!).push(h.a0);
}
const lib = new WaveLibrary(bytes.map(decodeWaveCase));
console.log(`${WAVE_CASES.length} cases listed, ${lib.cases.length} decoded, ${bad} key mismatches, ${(total / 1e6).toFixed(2)} MB fetched up front`);
for (const [key, a0s] of [...groups].sort()) console.log(`  bed ${key}: A0 ${a0s.sort((a, b) => a - b).map((v) => v.toFixed(4)).join(' ')} (${a0s.length} rows)`);
if (bad > 0) process.exit(1);
