/**
 * C2 step 3b (ruling 32, point 2): does the A0 polyline's nearest segment switch between neighbouring lanes, and do the
 * case weights jump there? Reads the bars probe's `--states` file (each blended slice's lane, wave and hand-over state),
 * matches every state with step 3's rule (`a0Switch = 0`, the nearest segment alone) and step 3b's (`A0_SWITCH`), and
 * compares neighbouring lanes of one wave: the share of pairs on different segments, and the case weights' step
 * (Σ |Δw| over the cases) there and elsewhere.
 *   npx rolldown docs/research/wave-strategy-alternatives/c2-step3b-a0-segments.ts -o <scratch>/a0.mjs --format esm --platform node
 *   node <scratch>/a0.mjs --cases public/library --states <states.json>
 */
import { readFileSync, readdirSync } from 'node:fs';
import { decodeWaveCase } from '../../../src/wave/library/caseFormat';
import { A0_SWITCH, WaveLibrary, type HandoverState } from '../../../src/wave/library/WaveLibrary';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const CASES = option('cases') ?? 'public/library';
const files = readdirSync(CASES).filter((f) => f.endsWith('.bin')).sort();
const library = new WaveLibrary(files.map((f) => decodeWaveCase(new Uint8Array(readFileSync(`${CASES}/${f}`)))));
const rows = JSON.parse(readFileSync(option('states')!, 'utf8')) as Array<{ lane: number; wave: number; tH: number; state: HandoverState }>;
const matcher = library.matcher;
const n = library.cases.length;
const weightsOf = (state: HandoverState) => {
  const w = new Float64Array(n);
  for (const c of matcher.match(state).cases) w[c.case] += c.weight;
  return w;
};
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const f = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : '–');
const line = (v: number[]) => `median ${f(q(v, 0.5))}, 90 % ${f(q(v, 0.9))}, 99 % ${f(q(v, 0.99))}, most ${f(q(v, 1))} (${v.length})`;
// The cases' A0 rows by bed: a pair's segment differs where one weighs a case the other's bed segment leaves out.
const ids = library.cases.map((c) => c.id);
for (const [label, band] of [['step 3 (nearest segment alone)', 0], [`step 3b (A0_SWITCH ${A0_SWITCH})`, A0_SWITCH]] as const) {
  matcher.a0Switch = band;
  const weights = rows.map((r) => weightsOf(r.state));
  const switched: number[] = [];
  const same: number[] = [];
  let pairs = 0;
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = 0; j < rows.length; j += 1) {
      if (rows[j].lane !== rows[i].lane + 1 || rows[j].wave !== rows[i].wave) continue;
      pairs += 1;
      let step = 0;
      let swap = false;
      for (let c = 0; c < n; c += 1) {
        step += Math.abs(weights[i][c] - weights[j][c]);
        // A case one weighs and the other does not, where its bed is weighed by both: the segment moved.
        if ((weights[i][c] > 0) !== (weights[j][c] > 0)) {
          const bed = ids[c].replace(/-a\d.*/, '');
          let both = false;
          for (let m = 0; m < n; m += 1) if (m !== c && ids[m].startsWith(bed) && weights[i][m] > 0 && weights[j][m] > 0) both = true;
          if (both) swap = true;
        }
      }
      (swap ? switched : same).push(step);
    }
  }
  console.log(`${label}: ${rows.length} slices, ${pairs} neighbouring pairs of one wave; on another segment ${switched.length} (${f((100 * switched.length) / Math.max(1, pairs))} %)`);
  console.log(`   the weights' step Σ|Δw| where the segment moved: ${line(switched)}`);
  console.log(`   … where it did not: ${line(same)}`);
}
