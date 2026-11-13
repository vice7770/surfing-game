// Step 3.2d (ruling 29h): balance by prediction on 3.2c's twist body (`src/physics/predictiveBalance.ts`), model only.
// One line per row ($OUT). From the repo root:
//   OUT=/tmp/p.jsonl PART=design,gate npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts predict.probe
// Parts: design (each table point: the nominal loop and the gains, for the schedule's smoothness), gate (item 4's
// robustness gate at each point), between (the interpolated controller on the interpolated plant at the quarter
// points), time (the worst cases in continuous time with the delay exact), and the weights' round: tune, pair, horizon,
// diag. Env: SPEEDS (default 4..12 by 0.5), DEPTHS (0,0.195,0.3), RHO, RANDOM (200), WEIGHTS (JSON of DesignWeights
// fields), WORST (a JSON list of cases for time), TUNE_POINTS, RHOS, PNS, QBANK, POINT, SET, PAIR.
import { it } from 'vitest';
import { eigenvalues } from '../../../../src/physics/rollModel';
import {
  CONTROL_STEP, DEFAULT_WEIGHTS, N_STATE, add, closedLoop, continuousPlant, design, discretise, leastDamping, mul, plantAt,
  type Design, type DesignWeights, type Mat,
} from '../../../../src/physics/predictiveBalance';
import { emit, r } from '../../board-in-water/lab';

const PARTS = (process.env.PART ?? 'design,gate').split(',');
const SPEEDS = process.env.SPEEDS ? process.env.SPEEDS.split(',').map(Number) : Array.from({ length: 17 }, (_, i) => 4 + 0.5 * i);
const DEPTHS = (process.env.DEPTHS ?? '0,0.195,0.3').split(',').map(Number);
const WEIGHTS: DesignWeights = { ...DEFAULT_WEIGHTS, ...(process.env.WEIGHTS ? JSON.parse(process.env.WEIGHTS) : {}), ...(process.env.RHO ? { rho: Number(process.env.RHO) } : {}) };
const STANCE = (d: number) => (d === 0 ? 'tall' : d < 0.25 ? 'crouch' : 'compress');

/** The least damping of the controller `d` on the true plant at a speed and depth with the options, its senses `trueDelay` s late. */
function check(d: Design, speed: number, depth: number, opts: Parameters<typeof plantAt>[2] = {}, trueDelay = 0.1) {
  const { y, t } = plantAt(speed, depth, opts);
  const { a, b } = continuousPlant(y, t);
  const { phi, gamma } = discretise(a, b, CONTROL_STEP);
  const m = closedLoop(phi, gamma, Math.round(trueDelay / CONTROL_STEP), d);
  try {
    return leastDamping(eigenvalues(m, { balance: true, maxIterations: 400 }));
  } catch {
    return { damping: -Infinity, frequency: 0, radius: 0 };
  }
}
const at = (speed: number, depth: number) => { const { y, t } = plantAt(speed, depth); return design(y, t, WEIGHTS); };

/** A seeded random number in [0, 1). */
let seed = 20261113;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const SPREAD = Number(process.env.SPREAD ?? 0.3);
const RANDOM_SETS = Array.from({ length: Number(process.env.RANDOM ?? 200) }, () => Array.from({ length: 12 }, () => 1 - SPREAD + 2 * SPREAD * rand()));
const NAMES = ['N/roll', 'Y/roll', 'K/roll', 'N/slip', 'Y/slip', 'K/slip', 'N/yaw', 'Y/yaw', 'K/yaw', 'N/rollRate', 'Y/rollRate', 'K/rollRate'];

/** The design's gains by name, for the smoothness table. */
function gains(d: Design) {
  const k = d.k;
  return {
    ankleBank: r(-k[0][2], 3), ankleBankRate: r(-k[0][3], 3), ankleYaw: r(-k[0][4], 3), ankleRoll: r(-k[0][0], 3),
    twistBank: r(-k[1][2], 1), twistBankRate: r(-k[1][3], 1), twistYaw: r(-k[1][4], 1), twistSlip: r(-k[1][5], 0), twistTwist: r(-k[1][6], 1), twistUpper: r(-k[1][7], 1),
  };
}

/** Bilinear interpolation of designs (the schedule as the game would read it). */
function blend(ds: Design[], ws: number[]): Design {
  const mix = (get: (d: Design) => Mat) => get(ds[0]).map((row, i) => row.map((_, j) => ds.reduce((s, d, q) => s + ws[q] * get(d)[i][j], 0)));
  return {
    phi: mix((d) => d.phi), gamma: mix((d) => d.gamma), c: ds[0].c, k: mix((d) => d.k), l: mix((d) => d.l), phiN: mix((d) => d.phiN),
    phiE: mix((d) => d.phiE), gammaE: mix((d) => d.gammaE), cE: ds[0].cE, bias: ds[0].bias,
    pred: ds[0].pred.map((_, j) => mix((d) => d.pred[j])), steps: ds[0].steps,
  };
}

/**
 * The continuous plant with the controller in time, the delay exact: Euler at 1/1920 s, the controller every frame on
 * the senses `trueDelay` s old. Start: the board's roll rate kicked 0.5 rad/s, or the body shoved 20 N·s across. Returns
 * the peaks (the ankle's torque, the twist's torque on the board and its angle, the bank) and the decay of the bank's
 * envelope over the last second against the first.
 */
function timeRun(d: Design, speed: number, depth: number, opts: Parameters<typeof plantAt>[2], trueDelay: number, start: 'kick' | 'shove', seconds = 4) {
  const { y, t } = plantAt(speed, depth, opts);
  const { a, b } = continuousPlant(y, t);
  const n = N_STATE;
  const x = new Array<number>(n).fill(0);
  if (start === 'kick') x[1] = 0.5; else x[3] = 20 / 73 / y.height;
  const h = 1 / 1920;
  const per = Math.round(CONTROL_STEP / h);
  const senses: number[][] = [];
  const commands: number[][] = [];
  const ne = d.phiE.length;
  let e = new Array<number>(ne).fill(0);
  let u = [0, 0];
  const trueSteps = Math.round(trueDelay / CONTROL_STEP);
  let peakAnkle = 0; let peakTorque = 0; let peakTwist = 0; let peakBank = 0; let early = 0; let late = 0;
  const steps = Math.round(seconds / h);
  for (let i = 0; i < steps; i += 1) {
    if (i % per === 0) {
      senses.push(d.c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)));
      if (senses.length > trueSteps) {
        const yk = senses[senses.length - 1 - trueSteps];
        const old = commands.length > d.steps ? commands[commands.length - 1 - d.steps] : [0, 0];
        const pred = d.phiE.map((row, ii) => row.reduce((s, v, j) => s + v * e[j], 0) + d.gammaE[ii][0] * old[0] + d.gammaE[ii][1] * old[1]);
        const innov = yk.map((v, ii) => v - d.cE[ii].reduce((s, c, j) => s + c * pred[j], 0));
        e = pred.map((v, ii) => v + d.l[ii].reduce((s, l, j) => s + l * innov[j], 0));
      }
      const bh = d.bias ? [e[n], e[n + 1]] : [0, 0];
      const xh = d.phiN.map((row) => row.reduce((s, v, j) => s + v * e[j], 0));
      for (let jj = 0; jj < d.steps; jj += 1) {
        const back = d.steps - jj;
        const uc = commands.length >= back ? commands[commands.length - back] : [0, 0];
        for (let ii = 0; ii < n; ii += 1) xh[ii] += d.pred[jj][ii][0] * (uc[0] + bh[0]) + d.pred[jj][ii][1] * (uc[1] + bh[1]);
      }
      u = d.k.map((row, q) => -row.reduce((s, v, j) => s + v * xh[j], 0) - bh[q]);
      commands.push(u);
    }
    const dx = a.map((row, ii) => row.reduce((s, v, j) => s + v * x[j], 0) + b[ii][0] * u[0] + b[ii][1] * u[1]);
    for (let k = 0; k < n; k += 1) x[k] += h * dx[k];
    peakAnkle = Math.max(peakAnkle, Math.abs(y.ankleStiffness * (x[2] - x[0] - x[8]) + y.ankleDamping * (x[3] - x[1])));
    peakTorque = Math.max(peakTorque, Math.abs(x[9] + t.stiffness * x[6] + t.damping * (x[7] - x[4])));
    peakTwist = Math.max(peakTwist, Math.abs(x[6]));
    peakBank = Math.max(peakBank, Math.abs(x[2]));
    if (i * h < 1) early = Math.max(early, Math.abs(x[2])); else if (i * h > seconds - 1) late = Math.max(late, Math.abs(x[2]));
    if (!Number.isFinite(x[2]) || Math.abs(x[2]) > 1) return { fell: r(i * h, 2) };
  }
  return { peakAnkleNm: r(peakAnkle, 1), peakTwistNm: r(peakTorque, 1), peakTwistDeg: r((peakTwist * 180) / Math.PI, 1), peakBankDeg: r((peakBank * 180) / Math.PI, 2), lateOverEarly: r(late / Math.max(early, 1e-12), 4) };
}

it('step 3.2d: balance by prediction', () => {
  if (PARTS.includes('design')) for (const depth of DEPTHS) for (const speed of SPEEDS) {
    const d = at(speed, depth);
    const m = check(d, speed, depth);
    emit({ part: 'design', speed, stance: STANCE(depth), nominal: [r(m.damping, 3), r(m.frequency, 2)], ...gains(d) });
  }
  if (PARTS.includes('gate')) {
    let worst = { damping: Infinity, at: '' };
    for (const depth of DEPTHS) for (const speed of SPEEDS) {
      const d = at(speed, depth);
      const row: Record<string, unknown> = { part: 'gate', speed, stance: STANCE(depth) };
      const nominal = check(d, speed, depth);
      row.nominal = [r(nominal.damping, 3), r(nominal.frequency, 2)];
      const delay = check(d, speed, depth, {}, 0.15);
      row.delay015 = [r(delay.damping, 3), r(delay.frequency, 2)];
      let single = { damping: Infinity, frequency: 0, which: '' };
      for (let k = 0; k < 12; k += 1) for (const f of [0.7, 1.3]) {
        const s = new Array<number>(12).fill(1); s[k] = f;
        const m = check(d, speed, depth, { scales: s });
        if (m.damping < single.damping) single = { damping: m.damping, frequency: m.frequency, which: `${NAMES[k]} ×${f}` };
      }
      row.single = [r(single.damping, 3), r(single.frequency, 2), single.which];
      let random = { damping: Infinity, frequency: 0, set: -1 };
      let failing = 0;
      RANDOM_SETS.forEach((s, i) => { const m = check(d, speed, depth, { scales: s }); if (m.damping < 0) failing += 1; if (m.damping < random.damping) random = { damping: m.damping, frequency: m.frequency, set: i }; });
      row.random = [r(random.damping, 3), r(random.frequency, 2), random.set];
      row.randomFailing = failing;
      let twist = { damping: Infinity, frequency: 0, k: 0 };
      for (const k of [5, 10, 40, 60]) { const m = check(d, speed, depth, { twistStiffness: k }); if (m.damping < twist.damping) twist = { damping: m.damping, frequency: m.frequency, k }; }
      row.twistK = [r(twist.damping, 3), r(twist.frequency, 2), twist.k];
      let roll = { damping: Infinity, frequency: 0, ib: 0 };
      for (const ib of [0.03, 0.3]) { const m = check(d, speed, depth, { rollInertia: ib }); if (m.damping < roll.damping) roll = { damping: m.damping, frequency: m.frequency, ib }; }
      row.rollInertia = [r(roll.damping, 3), r(roll.frequency, 2), roll.ib];
      const robust = Math.min(delay.damping, single.damping, random.damping, twist.damping, roll.damping);
      row.pass = nominal.damping >= 0.05 && robust >= 0;
      emit(row);
      const margin = Math.min(nominal.damping - 0.05, robust);
      if (margin < worst.damping) worst = { damping: margin, at: `${speed} m/s ${STANCE(depth)}` };
    }
    emit({ part: 'gate', worstMargin: r(worst.damping, 3), at: worst.at, weights: WEIGHTS });
  }
  if (PARTS.includes('tune')) {
    // The weights' round: ρ and the filter's process noise (×) at a few points (TUNE_POINTS speed,depth;...), each
    // against the delay at 0.15 s, the single scalings, RANDOM sets, the twist's stiffness and the roll inertia.
    const points = (process.env.TUNE_POINTS ?? '7,0;4,0;12,0.3').split(';').map((x) => x.split(',').map(Number));
    for (const rho of (process.env.RHOS ?? '10,100,1000').split(',').map(Number)) for (const pn of (process.env.PNS ?? '1').split(',').map(Number)) for (const qb of (process.env.QBANK ?? '1').split(',').map(Number)) {
      const w: DesignWeights = { ...WEIGHTS, rho, processNoise: WEIGHTS.processNoise.map((x) => x * pn), stateScale: WEIGHTS.stateScale.map((x, k) => (k === 2 || k === 3 ? x / qb : x)) };
      const row: Record<string, unknown> = { part: 'tune', rho, processNoise: pn, bankScale: qb };
      let all = Infinity;
      for (const [speed, depth] of points) {
        const { y, t } = plantAt(speed, depth);
        const d = design(y, t, w);
        const nominal = check(d, speed, depth).damping;
        const delay = check(d, speed, depth, {}, 0.15).damping;
        let single = Infinity; for (let k = 0; k < 12; k += 1) for (const f of [0.7, 1.3]) { const sc = new Array<number>(12).fill(1); sc[k] = f; single = Math.min(single, check(d, speed, depth, { scales: sc }).damping); }
        let random = Infinity; for (const sc of RANDOM_SETS) random = Math.min(random, check(d, speed, depth, { scales: sc }).damping);
        let other = Infinity; for (const k of [5, 60]) other = Math.min(other, check(d, speed, depth, { twistStiffness: k }).damping);
        for (const ib of [0.03, 0.3]) other = Math.min(other, check(d, speed, depth, { rollInertia: ib }).damping);
        row[`${speed},${depth}`] = [r(nominal, 3), r(delay, 3), r(single, 3), r(random, 3), r(other, 3)];
        all = Math.min(all, nominal - 0.05, delay, single, random, other);
      }
      row.margin = r(all, 3);
      emit(row);
    }
  }
  if (PARTS.includes('diag')) {
    // Which random sets (or single scalings) diverge at one point, how fast (the largest eigenvalue's growth, 1/s), and the open-loop plant's own.
    const [speed, depth] = (process.env.POINT ?? '7,0').split(',').map(Number);
    const { y, t } = plantAt(speed, depth);
    const d = design(y, t, WEIGHTS);
    const sets: { tag: string; sc: number[] }[] = RANDOM_SETS.map((sc, i) => ({ tag: `random ${i}`, sc }));
    for (let k = 0; k < 12; k += 1) for (const f of [0.7, 1.3]) { const sc = new Array<number>(12).fill(1); sc[k] = f; sets.push({ tag: `${NAMES[k]} ×${f}`, sc }); }
    for (const st of sets) {
      const p = plantAt(speed, depth, { scales: st.sc });
      const { a, b } = continuousPlant(p.y, p.t);
      const { phi, gamma } = discretise(a, b, CONTROL_STEP);
      const vals = eigenvalues(closedLoop(phi, gamma, 6, d), { balance: true, maxIterations: 400 });
      const grow = Math.max(...vals.map((z) => Math.log(Math.max(1e-300, Math.hypot(z.re, z.im))) / CONTROL_STEP));
      if (grow <= 0) continue;
      const open = Math.max(...eigenvalues(a, { balance: true, maxIterations: 400 }).map((z) => z.re));
      // The same gains on the true state, now (no filter, no delay): is it the gains or the estimate?
      const sf = add(phi, mul(gamma, d.k), -1);
      const full = Math.max(...eigenvalues(sf, { balance: true, maxIterations: 400 }).map((z) => Math.log(Math.max(1e-300, Math.hypot(z.re, z.im))) / CONTROL_STEP));
      // The estimate without the delay (the filter on the senses now, the gains on the estimate).
      const nd = closedLoop(phi, gamma, 1, { ...d, steps: 1, pred: [d.gamma], phiN: d.phi });
      const filt = Math.max(...eigenvalues(nd, { balance: true, maxIterations: 400 }).map((z) => Math.log(Math.max(1e-300, Math.hypot(z.re, z.im))) / CONTROL_STEP));
      emit({ part: 'diag', tag: st.tag, growthPerS: r(grow, 4), stateFeedbackGrowth: r(full, 4), filterOneFrameGrowth: r(filt, 4), openLoopLargestRe: r(open, 3), scales: st.sc.map((x) => r(x, 2)) });
    }
  }
  if (PARTS.includes('pair')) {
    // Two derivatives scaled together (PAIR=i,j; default the heel's yaw moment and side force) at one point, over ρ, the bank's weight and the delay.
    const [i0, j0] = (process.env.PAIR ?? '0,1').split(',').map(Number);
    const [speed, depth] = (process.env.POINT ?? '7,0').split(',').map(Number);
    for (const rho of (process.env.RHOS ?? '100').split(',').map(Number)) for (const qb of (process.env.QBANK ?? '1').split(',').map(Number)) for (const delay of [0.1, 0.05]) {
      const w: DesignWeights = { ...WEIGHTS, rho, stateScale: WEIGHTS.stateScale.map((x, k) => (k === 2 || k === 3 ? x / qb : x)) };
      const { y, t } = plantAt(speed, depth);
      const d = design(y, t, w, delay);
      const row: Record<string, unknown> = { part: 'pair', rho, bankWeight: qb * qb, delay };
      for (const f of [0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3]) { const sc = new Array<number>(12).fill(1); sc[i0] = f; sc[j0] = f; row[`x${f}`] = r(check(d, speed, depth, { scales: sc }, delay).damping, 3); }
      emit(row);
    }
  }
  if (PARTS.includes('horizon')) {
    // One scaled plant (SET: a random set's index) at one point, the delay (model and truth) 1..9 frames, and ρ.
    const [speed, depth] = (process.env.POINT ?? '7,0').split(',').map(Number);
    const sc = RANDOM_SETS[Number(process.env.SET ?? 132)];
    for (const rho of (process.env.RHOS ?? '100').split(',').map(Number)) {
      const row: Record<string, unknown> = { part: 'horizon', rho };
      const { y, t } = plantAt(speed, depth);
      for (const frames of [1, 2, 3, 4, 6, 9]) {
        const d = design(y, t, { ...WEIGHTS, rho }, frames * CONTROL_STEP);
        row[`f${frames}`] = r(check(d, speed, depth, { scales: sc }, frames * CONTROL_STEP).damping, 3);
      }
      emit(row);
    }
  }
  if (PARTS.includes('between')) {
    // The schedule as read between its points: the four nearest designs blended, on the plant at the point itself.
    let worst = { damping: Infinity, at: '' };
    const designs = new Map<string, Design>();
    const get = (v: number, dp: number) => { const key = `${v},${dp}`; if (!designs.has(key)) designs.set(key, at(v, dp)); return designs.get(key)!; };
    for (const depth of [0, 0.1, 0.195, 0.25, 0.3]) for (let speed = 4; speed <= 12.001; speed += 0.25) {
      const v0 = Math.min(11.5, Math.floor(speed * 2) / 2); const fv = (speed - v0) / 0.5;
      const i0 = depth <= 0.195 ? 0 : 0.195; const i1 = depth <= 0.195 ? 0.195 : 0.3; const fd = (depth - i0) / (i1 - i0);
      const d = blend([get(v0, i0), get(v0 + 0.5, i0), get(v0, i1), get(v0 + 0.5, i1)], [(1 - fv) * (1 - fd), fv * (1 - fd), (1 - fv) * fd, fv * fd]);
      const m = check(d, speed, depth);
      if (m.damping < worst.damping) worst = { damping: m.damping, at: `${r(speed, 2)} m/s depth ${depth} (${r(m.frequency, 2)} Hz)` };
    }
    emit({ part: 'between', worst: r(worst.damping, 3), at: worst.at });
  }
  if (PARTS.includes('time')) {
    const cases: { speed: number; depth: number; opts?: Parameters<typeof plantAt>[2]; delay?: number; set?: number }[] = process.env.WORST ? JSON.parse(process.env.WORST) : [{ speed: 7, depth: 0 }];
    for (const c of cases) {
      const d = at(c.speed, c.depth);
      const opts = { ...(c.opts ?? {}), ...(c.set !== undefined ? { scales: RANDOM_SETS[c.set] } : {}) };
      const m = check(d, c.speed, c.depth, opts, c.delay ?? 0.1);
      emit({ part: 'time', ...c, modes: [r(m.damping, 3), r(m.frequency, 2)], kick: timeRun(d, c.speed, c.depth, opts, c.delay ?? 0.1, 'kick'), shove: timeRun(d, c.speed, c.depth, opts, c.delay ?? 0.1, 'shove') });
    }
  }
});
