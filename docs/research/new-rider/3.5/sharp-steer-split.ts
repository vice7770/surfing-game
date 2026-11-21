/**
 * **Step 3.5o, the frozen-state split: is the first large correction the REFERENCE or the GAINS?**
 *
 * `sharp-steer.ts` logs, at every controller tick, the predicted state `x̂`, the reference `x_ref`/`u_ref`, the bias and
 * the gain row `K[0]` the shipped rider used. This file re-reads those ticks and recomputes the ankle command four
 * ways at the SAME state, the shipped blend against `plantFloor: 4.5`'s, one factor at a time:
 *
 *     raw(K, ref) = u_ref − b − K · (x̂ − x_ref)
 *
 * `(K_ship, ref_ship)` must reproduce the logged command (`check`), which is this file's proof that it is the
 * controller's own arithmetic. `(K_ship, ref_floor)` swaps the reference alone; `(K_floor, ref_ship)` the gains alone.
 * The state is the shipped ride's own, so this is a counterfactual on one tick and not a ride: the estimate a floored
 * controller would have built is not here (3.4m's "state held" method). **MEASUREMENT ONLY.**
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/sharp-steer-split.ts -o <s>/split.mjs --format esm --platform node
 *     node <s>/split.mjs <probe.jsonl> [wave] [script] [from] [to]
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_WEIGHTS, PredictiveController, steadyTurn } from '../../../../src/physics/predictiveBalance';

const DEG = 180 / Math.PI;
const [path, waveArg, scriptArg, fromArg, toArg] = process.argv.slice(2);
const wave = waveArg ? Number(waveArg) : undefined;
const script = scriptArg && scriptArg !== '*' ? scriptArg : undefined;
const from = fromArg ? Number(fromArg) : 0.3;
const to = toArg ? Number(toArg) : 1.3;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const ship = new PredictiveController({ ...DEFAULT_WEIGHTS, riderBody: 'two' }, 'tan') as Any;
const floor = new PredictiveController({ ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 4.5 }, 'tan') as Any;

function reference(d: Any, lean: number): { x: number[]; u: number[] } {
  const bankAsked = -lean;
  let ref = steadyTurn(d.phi, d.gamma, bankAsked, 0);
  if (Math.abs(bankAsked) > 1e-6) {
    const t = steadyTurn(d.phi, d.gamma, Math.tan(bankAsked), 0);
    const f = bankAsked / Math.tan(bankAsked);
    ref = { x: t.x.map((x, i) => (i === 0 || i === 2 || i === 8 ? x * f : x)), u: [t.u[0] * f, t.u[1]] };
  }
  return ref;
}
const raw = (k: number[], ref: { x: number[]; u: number[] }, xh: number[], bias: number): number => {
  let s = ref.u[0] - bias;
  for (let j = 0; j < xh.length; j += 1) s -= k[j] * (xh[j] - ref.x[j]);
  return s;
};

// The depth each frame ran at, from the frame rows (`depth`, m), keyed by wave/script/frame end.
const depthAt = new Map<string, number>();
const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
for (const q of lines) if (q.kind === 'row' && typeof q.depth === 'number') depthAt.set(`${q.wave}|${q.script}|${Math.round(q.tStand * 60)}`, q.depth);
for (const q of lines) {
  if (q.kind !== 'sub' || q.ticked !== 1 || !q.ctl) continue;
  if (wave !== undefined && q.wave !== wave) continue;
  if (script !== undefined && q.script !== script) continue;
  if (q.t < from || q.t > to) continue;
  const c = q.ctl;
  const n = c.xh.length;
  const xh = c.xh as number[];
  const bias = c.bias / DEG;
  const lean = q.lean / DEG;
  const rail = q.sched / DEG;
  const speed = q.speedThrough as number;
  // The frame this tick belongs to ends at the next 1/60 boundary; its row carries the depth.
  const depth = depthAt.get(`${q.wave}|${q.script}|${Math.round(Math.ceil(q.t * 60 - 1e-6))}`) ?? 0;
  const ds = ship.blend(speed, depth, rail);
  const ks = (ds.k[0] as number[]).slice(0, n);
  const rs = reference(ds, lean);
  const df = floor.blend(speed, depth, rail);
  const kf = (df.k[0] as number[]).slice(0, n);
  const rf = reference(df, lean);
  const ss = raw(ks, rs, xh, bias) * DEG;
  process.stdout.write(`${JSON.stringify({
    wave: q.wave, script: q.script, t: q.t, speed, depth, leanDeg: q.lean,
    logged: c.raw, check: Number((ss - c.raw).toFixed(3)),
    shipShip: Number(ss.toFixed(2)), shipGainsFloorRef: Number((raw(ks, rf, xh, bias) * DEG).toFixed(2)),
    floorGainsShipRef: Number((raw(kf, rs, xh, bias) * DEG).toFixed(2)), floorFloor: Number((raw(kf, rf, xh, bias) * DEG).toFixed(2)),
    betaRefShip: Number((rs.x[5] * DEG).toFixed(2)), betaRefFloor: Number((rf.x[5] * DEG).toFixed(2)),
  })}\n`);
}
