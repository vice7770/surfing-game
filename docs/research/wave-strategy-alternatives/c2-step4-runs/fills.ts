/**
 * C2 step 4: how much of the game files' velocity the run itself gave, and how much the library fills from the nearest
 * point (`prepareFrames`): per case, and over all nine by the profile's pieces and by the phase.
 *   npx rolldown docs/research/wave-strategy-alternatives/c2-step4-runs/fills.ts -o <scratch>/fills.mjs --format esm --platform node
 *   node <scratch>/fills.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { decodeWaveCase, WAVE_LANDMARK, WAVE_POINTS } from '../../../../src/wave/library/caseFormat';
import { WaveLibrary } from '../../../../src/wave/library/WaveLibrary';

const dir = 'public/library';
const files = readdirSync(dir).filter((f) => f.endsWith('.bin')).sort();
const cases = files.map((f) => decodeWaveCase(new Uint8Array(readFileSync(`${dir}/${f}`))));
const lib = new WaveLibrary(cases);
const pieces: Array<[string, number, number]> = [
  ['back to crest', WAVE_LANDMARK.back, WAVE_LANDMARK.crest], ['crest to lip', WAVE_LANDMARK.crest, WAVE_LANDMARK.lip],
  ['lip to throat', WAVE_LANDMARK.lip, WAVE_LANDMARK.throat], ['throat to toe', WAVE_LANDMARK.throat, WAVE_LANDMARK.toe],
  ['toe to front', WAVE_LANDMARK.toe, WAVE_POINTS - 1],
];
const byPiece = pieces.map(() => [0, 0]);
const byPhase = [[0, 0], [0, 0]];
for (let n = 0; n < cases.length; n += 1) {
  const c = cases[n];
  const live = lib.cases[n];
  const nd = live.depths.length;
  const all = live.count * WAVE_POINTS * nd * 2;
  let filled = 0;
  for (let k = 0; k < live.count; k += 1) {
    const tau = live.tauStart + k * live.tauStep;
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      for (let j = 0; j < nd; j += 1) {
        for (let comp = 0; comp < 2; comp += 1) {
          const at = ((k * WAVE_POINTS + i) * nd + j) * 2 + comp;
          const missing = !(c.velocity[at] === c.velocity[at]);
          if (missing) filled += 1;
          const p = pieces.findIndex(([, a, b]) => i >= a && i < b);
          if (p >= 0) { byPiece[p][0] += missing ? 1 : 0; byPiece[p][1] += 1; }
          const ph = tau < 0 ? 0 : 1;
          byPhase[ph][0] += missing ? 1 : 0;
          byPhase[ph][1] += 1;
        }
      }
    }
  }
  console.log(`${live.id}: frames ${live.count}, frames rebuilt ${live.refilled}, velocity filled ${filled} of ${all} (${((100 * filled) / all).toFixed(2)} %)`);
}
console.log('\nover all nine cases, where the run gave no sample:');
pieces.forEach(([name], p) => console.log(`  ${name}: ${((100 * byPiece[p][0]) / Math.max(1, byPiece[p][1])).toFixed(2)} %`));
console.log(`  before the throw: ${((100 * byPhase[0][0]) / Math.max(1, byPhase[0][1])).toFixed(2)} %; from the throw: ${((100 * byPhase[1][0]) / Math.max(1, byPhase[1][1])).toFixed(2)} %`);
