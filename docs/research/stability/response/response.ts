/**
 * **3.6d's reader of the game's twins** (README §0.4–§0.6): reads the `kick`, `kbase` and `weights` rows of the twin
 * runs and prints the controls, the stage table, the model against the measured, the closings, the reproduction and
 * the predictions (`analyse.ts`, the same code the known plant is read by).
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/response/response.ts --file <s>/response.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) node <s>/response.mjs <out.md> <q1.json|-> <twins run dir> [--controls-only]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DesignWeights } from '../../../../src/physics/predictiveBalance';
import { analyse, report } from './analyse';
import type { KBaseRow, KickRow } from './responseLib';

const [out, q1Path, dir, flag] = process.argv.slice(2);
const kicks: KickRow[] = [];
const kbases: KBaseRow[] = [];
let weights: DesignWeights | undefined;
const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
for (const f of files) {
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
    if (line.startsWith('{"kind":"kick"')) kicks.push(JSON.parse(line));
    else if (line.startsWith('{"kind":"kbase"')) kbases.push(JSON.parse(line));
    else if (line.startsWith('{"kind":"weights"') && !weights) weights = JSON.parse(line).weights;
  }
}
if (!weights) throw new Error('no weights row');
// Checks of the probe's map of the senses (README §0.5), on A's own tick channels over the kick windows: φ̇ (y1 − y6)
// against the board's roll rate p, and r (y2 − y4) against −Ω, as correlations and least-squares slopes.
const pairs = { phidot_p: [[], []] as number[][], r_minusOm: [[], []] as number[][] };
for (const k of kbases) {
  const a = k.abs;
  for (let i = 0; i < (a.y1?.length ?? 0); i += 1) {
    const y1 = a.y1[i], y6 = a.y6[i], p = a.p[i], y2 = a.y2[i], y4 = a.y4[i], om = a.Om[i];
    if ([y1, y6, p, y2, y4, om].some((x) => x === null || x === undefined)) continue;
    pairs.phidot_p[0].push((y1 as number) - (y6 as number)); pairs.phidot_p[1].push(p as number);
    pairs.r_minusOm[0].push((y2 as number) - (y4 as number)); pairs.r_minusOm[1].push(-(om as number));
  }
}
const corr = (x: number[], y: number[]) => {
  const n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i += 1) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return { n, corr: sxy / Math.sqrt(sxx * syy), slope: sxy / syy };
};
const senseMap = { phidotAgainstP: corr(pairs.phidot_p[0], pairs.phidot_p[1]), rAgainstMinusOmega: corr(pairs.r_minusOm[0], pairs.r_minusOm[1]) };
const q1 = q1Path && q1Path !== '-' ? JSON.parse(readFileSync(q1Path, 'utf8')) : undefined;
const res = analyse(kicks, kbases, weights, { closings: flag !== '--controls-only', log: (s) => console.error(s) });
const head = `# 3.6d: the board's response by kicked twins (${files.join(', ')}; ${kicks.length} kick rows, ${kbases.length} kbase rows)\n\n`
  + `The senses' map on A's own ticks (README §0.5): ${JSON.stringify(senseMap)}\n\n`;
const md = head + (flag === '--controls-only' ? '## Controls\n\n```\n' + JSON.stringify(res.controls, null, 1) + '\n```\n' : report(res, q1));
writeFileSync(out, md);
console.log(md);
