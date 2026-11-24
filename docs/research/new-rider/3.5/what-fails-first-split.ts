/**
 * **Step 3.5x, offline: the frozen-state split on the climb** (`what-fails-first.md` §0.6; 3.5o's `sharp-steer-split.ts`
 * method on `what-fails-first.ts`'s `x35` ticks). MEASUREMENT ONLY.
 *
 * At every logged controller tick of one rider, at the arm's OWN predicted state x̂ (as logged), the raw ankle command is
 * recomputed four ways, `raw(K, ref) = u_ref − b − K · (x̂ − x_ref)`:
 *   (arm K, arm ref) — must reproduce the logged raw (`check`, deg);
 *   (arm K, R ref)   — R's (shipped) reference at the same lean, speed, depth and rail, the arm's gains;
 *   (R K, arm ref)   — R's gains, the arm's reference;
 *   (R K, R ref).
 * The arm's design and R's are `PredictiveController.blend` on the weights the stand row printed, with and without the
 * arm's `plantFloor` / `plantSpeed`. The state is the arm's ride's own: a counterfactual on one tick, not a ride.
 * Model signs: the model's φ is −roll and θ is −bank; a command's board-frame sign is minus this.
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/what-fails-first-split.ts -o <s>/split.mjs --format esm --platform node
 *   node <s>/split.mjs <run.jsonl> <script> <wave> [from] [to]
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { PredictiveController, steadyTurn } from '../../../../src/physics/predictiveBalance';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const DEG = 180 / Math.PI;
const [path, script, waveArg, fromArg, toArg] = process.argv.slice(2);
const wave = Number(waveArg);
const from = fromArg ? Number(fromArg) : 1.0;
const to = toArg ? Number(toArg) : 5;
const text = path.endsWith('.gz') ? gunzipSync(readFileSync(path)).toString('utf8') : readFileSync(path, 'utf8');
const rows = text.trim().split('\n').map((l) => JSON.parse(l));
const stand = rows.find((x) => x.kind === 'stand' && x.script === script && x.wave === wave);
if (!stand?.weights) throw new Error('no stand row with weights');
const armW = stand.weights;
const { plantFloor: _pf, plantSpeed: _ps, ...shipW } = armW;
void _pf; void _ps;
const arm = new PredictiveController(armW, 'tan') as Any;
const ship = new PredictiveController(shipW, 'tan') as Any;

function reference(d: Any, bank: number, twist: number): { x: number[]; u: number[] } {
  let ref = steadyTurn(d.phi, d.gamma, bank, twist);
  if (Math.abs(bank) > 1e-6) {
    const t = steadyTurn(d.phi, d.gamma, Math.tan(bank), twist);
    const f = bank / Math.tan(bank);
    ref = { x: t.x.map((v, i) => (i === 0 || i === 2 || i === 8 ? v * f : v)), u: [t.u[0] * f, t.u[1]] };
  }
  return ref;
}
const copyK = (d: Any) => (d.k[0] as number[]).slice();
const NAMES = ['phi', 'phiDot', 'bank', 'bankDot', 'yawRate', 'slip', 'twist', 'twistRate', 'rest', 'twistT', 'h', 'hDot', 'pitch', 'pitchDot'];
let prev = -1;
const out = (o: unknown) => process.stdout.write(`${JSON.stringify(o)}\n`);
out({ path, script, wave, weights: armW, ship: shipW });
for (const x of rows) {
  if (x.kind !== 'f' || x.script !== script || x.wave !== wave || x.tS === null || x.tS < from || x.tS > to || !x.x35?.args || !x.ctl) continue;
  if (x.x35.tick === prev) continue;
  prev = x.x35.tick;
  const [depth, bankD, twistD, railD] = x.x35.args as number[];
  const speed = x.ctl.speed as number;
  const bank = bankD / DEG; const twist = twistD / DEG; const rail = railD / DEG;
  const xh = (x.x35.xh as number[]).map((v) => v / DEG);
  const bias = (x.ctl.bias as number) / DEG;
  const dA = arm.blend(speed, depth, rail); const kA = copyK(dA); const rA = reference(dA, bank, twist);
  const dR = ship.blend(speed, depth, rail); const kR = copyK(dR); const rR = reference(dR, bank, twist);
  const n = kA.length;
  const raw = (k: number[], ref: { x: number[]; u: number[] }) => {
    let s = ref.u[0] - bias;
    for (let j = 0; j < n; j += 1) s -= k[j] * (xh[j] - ref.x[j]);
    return s * DEG;
  };
  const terms = (k: number[], ref: { x: number[] }) => {
    const o: Record<string, number> = {};
    for (let j = 0; j < n; j += 1) o[NAMES[j]] = Number((-k[j] * (xh[j] - ref.x[j]) * DEG).toFixed(2));
    return o;
  };
  const r2 = (v: number) => Number(v.toFixed(2));
  out({
    t: x.tS, vW: x.vW, sched: speed, lean: x.x35.lean, rollS: x.x35.rollS, yawRate: x.x35.yawRate, logged: x.ctl.raw,
    check: r2(raw(kA, rA) - x.ctl.raw),
    AA: r2(raw(kA, rA)), AR: r2(raw(kA, rR)), RA: r2(raw(kR, rA)), RR: r2(raw(kR, rR)),
    refA: { roll: r2(-rA.x[0] * DEG), bank: r2(-rA.x[2] * DEG), yaw: r2(rA.x[4] * DEG), slip: r2(rA.x[5] * DEG), u: r2(rA.u[0] * DEG) },
    refR: { roll: r2(-rR.x[0] * DEG), bank: r2(-rR.x[2] * DEG), yaw: r2(rR.x[4] * DEG), slip: r2(rR.x[5] * DEG), u: r2(rR.u[0] * DEG) },
    kA: kA.slice(0, 8).map(r2), kR: kR.slice(0, 8).map((v) => Number(v.toFixed(3))),
    termsA: terms(kA, rA), termsRK: terms(kR, rA),
  });
}
