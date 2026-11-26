/**
 * **3.6e's time-varying known-plant variant** (README §0.3, reported, no pass line): the known plant (p*, and the
 * unperturbed plant) re-evaluated at each tick's own speed, depth and rail along the fitting set's own kick windows
 * (A's `kbase` arguments), its open-loop responses (for a linear plant the twins' difference is exactly the plant's
 * time-varying impulse response, whatever the controller), fitted by **the same LTI fit** at the kick tick's speed. The
 * parameters' errors are what the speed's change inside a window costs the LTI fit.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/board-fit/knownltv.ts --file <s>/knownltv.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) node <s>/knownltv.mjs <stance script> <fit dir> <twins dir> <out.json>
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARGS_PRE, FIT_MODE, NESTED, SPEED_FLOOR, W_OPEN, binOf, disc, fitOn, fitSets, loadRuns, scalesOf, type FitSet, type Mult } from './fitLib';

const [script, fitDir, dir, outPath] = process.argv.slice(2);
// Amendment 3: `--ltv` fits with the speed-following fit; `--held` makes the truth follow the speed only (the depth and
// the rail held at the kick tick's, as the speed-following fit does), so its recovery is a control of that fit's code.
FIT_MODE.ltv = process.argv.includes('--ltv');
const HELD = process.argv.includes('--held');
const LABEL: Record<string, string> = { 'compress:straight': 'Compress', 'none:straight': 'tall', 'crouch:straight': 'tuck' };
const fit = JSON.parse(readFileSync(join(fitDir, `fit-${LABEL[script]}.json`), 'utf8'));
const P_STAR: Mult = { rollN: 1.6, rollY: 0.7, rollK: 2.2, slipN: 0.5, slipY: 1.4, slipK: 0.8, yawN: 1.9, yawY: 0.6, yawK: 1.3, rateN: 0.75, rateY: 1.5, rateK: 2.5, Ix: 2.0, Iz: 0.8, J: 1.3, kt: 0.7, ct: 1.5, lower: 0.9, upper: 1.2 };
const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort().map((f) => join(dir, f));
const runs = loadRuns(files, false);
runs.kicks = runs.kicks.filter((k) => k.script === script);
runs.kbases = runs.kbases.filter((k) => k.script === script);
const open = fitSets(runs).all.filter((s) => s.mode === 'open' && s.set.pass60 && s.v >= SPEED_FLOOR);
/** The time-varying response of a plant with multipliers `pm` along the set's own arguments. */
function ltv(s: FitSet, pm: Mult): Float64Array[] {
  const at = (m: number) => { const i = Math.max(0, Math.min(s.kb.args.speed.length - 1, ARGS_PRE + m)); return { v: s.kb.args.speed[i] as number, d: HELD ? s.depth : s.kb.args.depth[i] as number, r: HELD ? s.rail : s.kb.args.rail[i] as number }; };
  const out: Float64Array[] = [new Float64Array(10)];
  const a0 = at(0);
  let x = Float64Array.from(disc(a0.v, a0.d, a0.r, pm).gamma.map((row) => row[s.channel]));
  for (let m = 1; m <= W_OPEN; m += 1) {
    out.push(x);
    const a = at(m);
    const d = disc(a.v, a.d, a.r, pm);
    const nx = new Float64Array(10);
    for (let i = 0; i < 10; i += 1) { let sum = 0; for (let j = 0; j < 10; j += 1) sum += d.phi[i][j] * x[j]; nx[i] = sum; }
    x = nx;
  }
  return out;
}
const res: Record<string, unknown> = { script, ltvFit: FIT_MODE.ltv, heldTruth: HELD, sets: open.length, speedChange: open.map((s) => (s.kb.args.speed[ARGS_PRE + W_OPEN] as number) - s.v) };
for (const [name, truth] of [['unperturbed', {} as Mult], ['p*', P_STAR]] as const) {
  const synth = open.map((s) => ({ ...s, x: ltv(s, truth) }));
  const per: unknown[] = [];
  for (let b = 0; b < 3; b += 1) {
    const gs = synth.filter((s) => binOf(s.v, fit.edges) === b);
    const sig = scalesOf(gs);
    for (const which of ['a', 'b', 'c']) {
      const names = NESTED[which];
      const want = (k: string) => (name === 'p*' && which !== 'c' && !NESTED[which].includes(k) ? 1 : (truth[k] ?? 1));
      // For (a) and (b) the known plant is p* restricted to the set's own parameters (the others at 1), as in knownfit.
      const sub: Mult = name === 'p*' ? Object.fromEntries(names.map((k) => [k, truth[k]])) : {};
      const gs2 = name === 'p*' ? gs.map((s) => ({ ...s, x: ltv(s, sub) })) : gs;
      const sig2 = name === 'p*' ? scalesOf(gs2) : sig;
      const f = fitOn(gs2, names, sig2, [{}], { maxIter: 200 });
      let den = 0;
      for (const s of gs2) for (let m = 1; m <= W_OPEN; m += 1) for (let o = 0; o < 8; o += 1) den += (s.x[m][o] / sig2[s.channel][o]) ** 2;
      const err = names.map((k) => [k, f.mult[k], want(k), Math.abs(f.mult[k] - want(k)) / Math.abs(want(k))] as [string, number, number, number]);
      const worst = err.reduce((x, y) => (y[3] > x[3] ? y : x));
      per.push({ bin: b, set: which, n: gs.length, relResidual: Math.sqrt(f.cost / den), worst, err });
      console.error(`${LABEL[script]} ${name} bin ${b} (${which}): ${gs.length} sets, residual ${Math.sqrt(f.cost / den).toExponential(2)}, worst ${worst[0]} ${worst[1].toPrecision(4)} vs ${worst[2]} (rel ${worst[3].toFixed(3)})`);
    }
  }
  res[name] = per;
}
writeFileSync(outPath, JSON.stringify(res, null, 1));
