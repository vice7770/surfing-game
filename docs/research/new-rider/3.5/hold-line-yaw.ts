/**
 * **Step 3.5s, the game's own yaw on the face, before the hold is built** (`hold-line.md` §1). Reads frame rows with
 * the board's yaw ledger (`straight-fall.ts` with `LEDGER=1`) and sets the water's delivered yaw moment beside what the
 * balance's internal model expects from the same frame: its flat-water derivatives (`plantAt`, the lab's captive
 * table) at the frame's speed, read at the heel against the face (`faceColumn`'s datum), with the frame's slip, yaw
 * rate and roll rate. The face's own yaw (what the model's face column has no row for) is the residual.
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/hold-line-yaw.ts -o <s>/hly.mjs --format esm --platform node
 *     node <s>/hly.mjs on=<frames.jsonl[.gz]> old=<...> ...
 *
 * Model signs throughout: N + turns the nose to the board's right (down this face), β + downhill, ψ (the rail against
 * the face) + the board's right rail down, τ + the face falling to the right. The ledger's water entries are every
 * source but the rider's residual and the gyroscopic term; `suction` reads 0 on this address.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { plantAt } from '../../../../src/physics/predictiveBalance';

const D = Math.PI / 180;
const WATER = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth'];
const T0 = Number(process.env.FROM ?? 0.3);
const VMIN = Number(process.env.VMIN ?? 4.5);
const f = (x: number, n = 1) => Number(x.toFixed(n));
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
for (const arg of process.argv.slice(2)) {
  const [name, path] = arg.split('=');
  const raw = readFileSync(path);
  const text = path.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
  const rows = text.split('\n').filter((l) => l.includes('"frame"') && l.includes('yawLedger')).map((l) => JSON.parse(l));
  const game: number[] = []; const model: number[] = []; const resid: number[] = []; const tau: number[] = []; const slip: number[] = [];
  const parts: Record<string, number[]> = {}; const terms = { psi: [] as number[], beta: [] as number[], r: [] as number[], p: [] as number[] };
  const byTau: Record<string, number[]> = {};
  for (const fr of rows) {
    if (fr.t < T0 || !fr.attached || fr.speedThrough < VMIN) continue;
    const { y } = plantAt(fr.speedThrough, 0, { rail: 0 });
    const N = -WATER.reduce((s, k) => s + fr.yawLedger[k], 0);
    const beta = -fr.slip * D; const psi = -fr.rail * D; const t = -fr.faceTilt * D; const r = -fr.yawRate * D; const p = -fr.rollRate * D;
    const m = { psi: y.heelYaw * psi, beta: y.slipYaw * beta, r: y.yawDamping * r, p: y.rollRateYaw * p };
    const M = m.psi + m.beta + m.r + m.p;
    game.push(N); model.push(M); resid.push(N - M); tau.push(t); slip.push(beta);
    for (const k of Object.keys(m) as (keyof typeof m)[]) terms[k].push(m[k]);
    for (const k of WATER) (parts[k] ??= []).push(-fr.yawLedger[k]);
    const bin = String(Math.round((t / D) / 4) * 4);
    (byTau[bin] ??= []).push(N - M);
  }
  // The residual's slope on the tilt (through the origin and with an offset), N·m per rad.
  const sxx = tau.reduce((s, x) => s + x * x, 0); const sxy = tau.reduce((s, x, i) => s + x * resid[i], 0);
  const mt = mean(tau); const mr = mean(resid);
  const slope = tau.reduce((s, x, i) => s + (x - mt) * (resid[i] - mr), 0) / tau.reduce((s, x) => s + (x - mt) ** 2, 0);
  process.stdout.write(`${JSON.stringify({
    arm: name, frames: game.length, from: T0, vmin: VMIN,
    meanTauDeg: f(mt / D, 2), meanSlipDeg: f(mean(slip) / D, 2),
    water: { mean: f(mean(game)), median: f(med(game)) }, model: { mean: f(mean(model)), median: f(med(model)), terms: Object.fromEntries(Object.entries(terms).map(([k, v]) => [k, f(mean(v))])) },
    residual: { mean: f(mr), median: f(med(resid)), perRadTauThroughOrigin: f(sxy / sxx, 0), perRadTauSlope: f(slope, 0) },
    sources: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, f(mean(v))])),
    residualByTau: Object.fromEntries(Object.entries(byTau).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => [k, { n: v.length, median: f(med(v)) }])),
  })}\n`);
}

/**
 * `POOL=1`: every file's frames pooled, the residual (game − model) regressed on the tilt and the slip together
 * (least squares, with and without an offset), so a face term and a slip-derivative error can be told apart: the
 * `on` arm rides near flush with little slip, the old rider slips 3–12° with the board level.
 */
if (process.env.POOL === '1') {
  const X: number[][] = []; const Y: number[] = [];
  for (const arg of process.argv.slice(2)) {
    const path = arg.split('=')[1];
    const raw = readFileSync(path);
    const text = path.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    for (const l of text.split('\n')) {
      if (!l.includes('"frame"') || !l.includes('yawLedger')) continue;
      const fr = JSON.parse(l);
      if (fr.t < T0 || !fr.attached || fr.speedThrough < VMIN) continue;
      const { y } = plantAt(fr.speedThrough, 0, { rail: 0 });
      const N = -WATER.reduce((s, k) => s + fr.yawLedger[k], 0);
      const beta = -fr.slip * D; const psi = -fr.rail * D; const t = -fr.faceTilt * D; const r = -fr.yawRate * D; const p = -fr.rollRate * D;
      const M = y.heelYaw * psi + y.slipYaw * beta + y.yawDamping * r + y.rollRateYaw * p;
      X.push([t, beta * y.slipYaw / 1, 1]); Y.push(N - M);
    }
  }
  const solve = (cols: number[]) => {
    const A = cols.map((i) => cols.map((j) => X.reduce((s, x) => s + x[i] * x[j], 0)));
    const b = cols.map((i) => X.reduce((s, x, k) => s + x[i] * Y[k], 0));
    const n = cols.length;
    for (let c = 0; c < n; c += 1) for (let r2 = c + 1; r2 < n; r2 += 1) { const k = A[r2][c] / A[c][c]; for (let q = c; q < n; q += 1) A[r2][q] -= k * A[c][q]; b[r2] -= k * b[c]; }
    const z = new Array<number>(n).fill(0);
    for (let r2 = n - 1; r2 >= 0; r2 -= 1) { let s = b[r2]; for (let q = r2 + 1; q < n; q += 1) s -= A[r2][q] * z[q]; z[r2] = s / A[r2][r2]; }
    const pred = X.map((x) => cols.reduce((s, i, k) => s + x[i] * z[k], 0));
    const m = mean(Y);
    const r2v = 1 - Y.reduce((s, yv, k) => s + (yv - pred[k]) ** 2, 0) / Y.reduce((s, yv) => s + (yv - m) ** 2, 0);
    return { coef: z.map((v) => f(v, 3)), r2: f(r2v, 3) };
  };
  // Columns: τ (N·m per rad of tilt), the lab's own N_β β scaled (so its coefficient is the share of the lab's N_β the
  // game is missing: −1 = none of it), the offset.
  process.stdout.write(`${JSON.stringify({ pooled: X.length, tauOnly: solve([0]), tauAndSlipShare: solve([0, 1]), withOffset: solve([0, 1, 2]) })}\n`);
}
