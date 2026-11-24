/**
 * **Step 3.5x, offline: the delay check of `what-fails-first.md` §0.7.** MODEL ONLY; nothing under `src/` changes.
 *
 * For each arm (R shipped, A `plantFloor: 6`, B `plantSpeed: 'taper'`, on the owner's weights `DEFAULT_WEIGHTS` +
 * `riderBody: 'two'`), the controller that arm builds at a schedule speed v and depth (`PredictiveController.blend`,
 * rail 0, exactly as `tick` blends it) is closed on the plant at the TRUE speed (`plantAt(v, depth)` at rail 0 with the
 * two-body rider and the shipped ladder, as 3.5s's gate builds its truth) with the true sense delay of 6 ticks and a
 * frame off each way (5, 7), through the code's own `closedLoop`; the least damping (`leastDamping`) per cell.
 *
 * `TRUTH=table` (default): the shipped table read at v (below 4 m/s it is row '4', as the shipped lookup clamps).
 * `TRUTH=game`: 3.5w's measured flat-water rows at the ridden attitude (`results/35w/rows.jsonl`, tag `ride`, rows 3, 3.5,
 * 4, 4.5 replacing/adding, `plant-rows-gains.ts`' patch, in this process's memory only), patched AFTER every design is
 * built, so the designs stay the arms' own.
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/what-fails-first-model.ts -o <s>/m.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) ; env TRUTH=table node <s>/m.mjs > model-table.jsonl
 */
import { readFileSync } from 'node:fs';
import {
  CONTROL_STEP, DEFAULT_WEIGHTS, PLANT_SPEEDS, PredictiveController, closedLoop, continuousPlant, discretise, leastDamping, plantAt,
  type Design, type DesignWeights,
} from '../../../../src/physics/predictiveBalance';
import { eigenvalues } from '../../../../src/physics/rollModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const TRUTH = process.env.TRUTH ?? 'table';
const ROWS = process.env.ROWS ?? 'docs/research/new-rider/3.5/results/35w/rows.jsonl';
const SPEEDS = (process.env.SPEEDS ?? '3,3.25,3.5,3.75,4,4.25,4.5,4.75,5,5.25,5.5,5.75,6,6.5,7,7.5,8').split(',').map(Number);
const DEPTHS = (process.env.DEPTHS ?? '0,0.195,0.3,0.45').split(',').map(Number);
const ARMS: Record<string, DesignWeights> = {
  R: { ...DEFAULT_WEIGHTS, riderBody: 'two' },
  A: { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6 },
  B: { ...DEFAULT_WEIGHTS, riderBody: 'two', plantSpeed: 'taper' },
};
const f = (x: number, d = 3) => (Number.isFinite(x) ? Number(x.toFixed(d)) : null);
const emit = (o: unknown) => process.stdout.write(`${JSON.stringify(o)}\n`);
const copy = (m: number[][]) => m.map((row) => row.slice());
function snapshot(d: Any): Design {
  return {
    ...d, phi: copy(d.phi), gamma: copy(d.gamma), k: copy(d.k), phiE: copy(d.phiE), gammaE: copy(d.gammaE), l: copy(d.l), phiN: copy(d.phiN),
    pred: d.pred.map(copy), c: copy(d.c), cE: copy(d.cE),
  } as Design;
}

// 1. Every arm's design at every cell, built on the shipped table.
const designs = new Map<string, Design>();
for (const [arm, w] of Object.entries(ARMS)) {
  const ctl = new PredictiveController(w, 'tan') as Any;
  for (const depth of DEPTHS) for (const v of SPEEDS) designs.set(`${arm}|${v}|${depth}`, snapshot(ctl.blend(v, depth, 0)));
}
// 2. The truth.
if (TRUTH === 'game') {
  for (const line of readFileSync(ROWS, 'utf8').trim().split('\n')) {
    const d = JSON.parse(line);
    if (d.tag !== 'ride') continue;
    PLANT_SPEEDS[String(d.v)] = { roll: d.row.roll, slip: d.row.slip, yaw: d.row.yaw, rate: d.row.rate, drag: 0.2312 };
  }
}
emit({ truth: TRUTH, rows: Object.keys(PLANT_SPEEDS).map(Number).sort((a, b) => a - b).slice(0, 7), speeds: SPEEDS, depths: DEPTHS });
for (const depth of DEPTHS) for (const v of SPEEDS) {
  const { y, t } = plantAt(v, depth, { rail: 0, body: true, stanceDeep: true });
  const { a, b } = continuousPlant(y, t);
  const { phi, gamma } = discretise(a, b, CONTROL_STEP);
  const row: Record<string, unknown> = { v, depth };
  for (const arm of Object.keys(ARMS)) {
    const d = designs.get(`${arm}|${v}|${depth}`)!;
    if (d.phi.length !== phi.length) { row[arm] = { error: `n ${d.phi.length} vs ${phi.length}` }; continue; }
    const res: Record<string, unknown> = { steps: d.steps, kBank: f(d.k[0][2]), kBankDot: f(d.k[0][3]), kPhi: f(d.k[0][0]), kPhiDot: f(d.k[0][1]) };
    for (const Ts of [5, 6, 7]) {
      try {
        const m = leastDamping(eigenvalues(closedLoop(phi, gamma, Ts, d), { balance: true, maxIterations: 400 }));
        res[`d${Ts}`] = [f(m.damping), f(m.frequency, 2), f(m.radius, 4)];
      } catch (e) { res[`d${Ts}`] = String(e); }
    }
    // The growing mode (when the loop has a real eigenvalue outside the unit circle): its plant-state shape by power
    // iteration on the closed loop at the true delay (the largest-modulus eigenvalue is then that one), normalised.
    if (process.env.MODES === '1') {
      const M = closedLoop(phi, gamma, 6, d);
      let x = M.map((_, i) => 1 + 0.01 * i);
      let lam = 0;
      for (let it = 0; it < 3000; it += 1) {
        const y = M.map((row) => row.reduce((s, m, j) => s + m * x[j], 0));
        const norm = Math.hypot(...y);
        lam = y.reduce((s, v, i) => s + v * x[i], 0) / x.reduce((s, v) => s + v * v, 0);
        x = y.map((v) => v / norm);
      }
      const n = phi.length;
      const big = Math.max(...x.slice(0, n).map(Math.abs)) || 1;
      res.mode = { lambda: f(lam, 4), shape: x.slice(0, n).map((v) => f(v / big, 2)) };
    }
    // The design's own nominal loop (its own model as the truth, its own delay), for reference.
    try {
      const m = leastDamping(eigenvalues(closedLoop(d.phi, d.gamma, d.steps, d), { balance: true, maxIterations: 400 }));
      res.nominal = [f(m.damping), f(m.frequency, 2)];
    } catch (e) { res.nominal = String(e); }
    row[arm] = res;
  }
  emit(row);
}
