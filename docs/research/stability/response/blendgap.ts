/** 3.6d, a check written after the model table was read (README §3 item 4): the blend against plantAt at the exact kick-tick speed, depth and rail, by speed. `node blendgap.mjs <twins dir>` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { design, plantAt } from '../../../../src/physics/predictiveBalance';
import { maxRel, modelOpen, SENSE_ROWS } from './responseLib';
const dir = process.argv[2];
let weights: any;
const out: [number, number, string][] = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
  if (line.startsWith('{"kind":"weights"') && !weights) weights = JSON.parse(line).weights;
  if (!line.startsWith('{"kind":"kbase"')) continue;
  const k = JSON.parse(line); if (!k.design) continue;
  const v = k.args.speed[8], d = k.args.depth[8], r = k.args.rail[8];
  const p = plantAt(v, d, { rail: r, body: true, plantFloor: 6, stanceDeep: true });
  const e = design(p.y, p.t, weights);
  const g = Math.max(...[0, 1].map((c) => maxRel(modelOpen(e.phi, e.gamma, e.c, c as 0 | 1), modelOpen(k.design.phi, k.design.gamma, k.design.c, c as 0 | 1), SENSE_ROWS)));
  out.push([g, v, k.script]);
}
out.sort((a, b) => b[0] - a[0]);
console.log('top gaps', out.slice(0, 12).map((x) => `${x[0].toFixed(3)}@${x[1].toFixed(2)}m/s ${x[2]}`).join('; '));
console.log('gaps at speed >= 4: max', Math.max(...out.filter((x) => x[1] >= 4).map((x) => x[0])).toFixed(4), 'n', out.filter((x) => x[1] >= 4).length, '; below 4: min', Math.min(...out.filter((x) => x[1] < 4).map((x) => x[0])).toFixed(3), 'n', out.filter((x) => x[1] < 4).length);
