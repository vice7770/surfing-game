// Step 3.2p (ruling 29w item 1): **give the balance a sense of the board's heave and pitch.** Model only; no game, no
// water.
//
// 3.2m carried the board's heave and pitch as four more states and found that the least damped mode of the whole loop
// is then the board's own 0.33-0.74 Hz heave and pitch, and that the loop runs it OPEN: `senseMatrix` has no row for
// those states, so a frame of timing error takes the mode negative at almost every rail. 3.2n's trace in the game is
// what that looks like from outside - the rail peaks at +24 degrees and unwinds to +4 while the bank stalls at 25
// against the 50 asked, with nothing saturating.
//
// This probe is the design step, before any game change. Three controllers, and the first two differ ONLY by the two
// sense rows, on the same plant:
// - `blind`: the fourteen-state held plant, heave and pitch carried, seven senses. 3.2m's case.
// - `sensed`: the same plant and the same weights, NINE senses - the load through the feet (the plant's own vertical
//   acceleration row, which is what the soles feel) and the board's nose-up pitch rate (the canals').
// - `ten`: the shipped ten-state design on the shipped free plant, as context, on its own plant (it cannot be run on
//   the fourteen-state plant: the predictor's own state would have to be padded, and there is no honest way to do it).
//
//   PART=repro,obs,modes,time,noise
//   OUT=/tmp/s.jsonl npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts sink
import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { boardDerivatives, eigenvalues, type HeavePlant, type TwistPlant, type YawPlant } from '../../../../src/physics/rollModel';
import {
  CONTROL_STEP, DEFAULT_WEIGHTS, N_STATE, RAIL_PLANT, boardInertiaAt, closedLoop, continuousPlant, dare, design, discretise, heavePlantAt,
  leastDamping, plantAt, stanceAt, steadyTurn, transpose, zeros, HEAVE_SENSE_NOISE,
  type Design, type DesignWeights, type Mat,
} from '../../../../src/physics/predictiveBalance';
import { emit, r } from '../../board-in-water/lab';

const PARTS = (process.env.PART ?? 'repro,obs,modes,time').split(',');
const SPEEDS = (process.env.SPEEDS ?? '5,7,9').split(',').map(Number);
const RAILS = (process.env.RAILS ?? '0,10,15,20,30,40').split(',').map(Number);
const DEPTHS = (process.env.DEPTHS ?? '0,0.3').split(',').map(Number);
const WEIGHTS: DesignWeights = { ...DEFAULT_WEIGHTS, ...(process.env.WEIGHTS ? JSON.parse(process.env.WEIGHTS) : {}) };
const STANCE = (d: number) => (d === 0 ? 'tall' : d < 0.25 ? 'crouch' : 'compress');
const DEG = 180 / Math.PI;
/** The lean a time run asks for, degrees (the hold probe's own stick asks about 50). */
const LEAN = Number(process.env.LEAN ?? 50);
/** The rate the reference is brought in at, rad/s (`LEAN_IN_RATE`, as the game eases it). */
const LEAN_RATE = Number(process.env.LEAN_RATE ?? 1.4);

/** A row of the settled sweep (`../rail-dig/settled.probe.ts`), for the reproduction check. */
interface Row {
  part: string; v: number; rail: number; stalled?: boolean;
  roll: Deriv; slip: Deriv; yaw: Deriv; rate: Deriv;
  heave?: Deriv; heaveRate?: Deriv; pitch?: Deriv; pitchRate?: Deriv;
}
interface Deriv { per: number[]; settled: boolean }
const rows: Row[] = readFileSync(new URL('../rail-dig/results/settled.jsonl', import.meta.url), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l) as Row).filter((x) => x.part === 'frozen');
const row = (v: number, rail: number) => rows.find((x) => x.v === v && x.rail === rail);

/** 3.2m's `heaveOf`, kept here so `heavePlantAt` can be checked against the hand-built block it reproduces. */
function heaveOf(x: Row, depth: number): HeavePlant {
  const flip = (d: Deriv) => [-d.per[0], -d.per[1], d.per[2], d.per[3], d.per[4]];
  const h = stanceAt(depth).height;
  return {
    mass: 73 + 2.54, pitchInertia: 73 * h * h + 0.60 + 2.54 * 0.08 * 0.08,
    perHeave: flip(x.heave!), perHeaveRate: flip(x.heaveRate!), perPitch: flip(x.pitch!), perPitchRate: flip(x.pitchRate!),
    pitchVert: {
      roll: [x.roll.per[3], x.roll.per[4]], slip: [x.slip.per[3], x.slip.per[4]],
      yaw: [-x.yaw.per[3], -x.yaw.per[4]], rate: [x.rate.per[3], x.rate.per[4]],
    },
  };
}
/** 3.2m's `plantFrom`: the twelve replaced by a measured row outright, rather than as a correction on `PLANT_SPEEDS`. */
function plantFrom(x: Row, speed: number, depth: number, heave?: HeavePlant): { y: YawPlant; t: TwistPlant } {
  const { y, t } = plantAt(speed, depth);
  const board = boardInertiaAt(speed);
  const lab = { roll: x.roll.per.slice(0, 3), slip: x.slip.per.slice(0, 3), yaw: x.yaw.per.slice(0, 3), rate: x.rate.per.slice(0, 3) };
  return { y: { ...y, boardRollInertia: board.roll, boardYawInertia: board.yaw, ...boardDerivatives(lab, speed, 0.236), ...(heave ? { heave } : {}) }, t };
}

/** The least damping of a controller on a plant, its senses `trueDelay` s late. */
function check(d: Design, y: YawPlant, t: TwistPlant, trueDelay = 0.1) {
  const { a, b } = continuousPlant(y, t);
  const { phi, gamma } = discretise(a, b, CONTROL_STEP);
  const m = closedLoop(phi, gamma, Math.round(trueDelay / CONTROL_STEP), d);
  try {
    return leastDamping(eigenvalues(m, { balance: true, maxIterations: 4000 }));
  } catch {
    return { damping: Number.NaN, frequency: 0, radius: 0 };
  }
}
/** The plant this step designs on: the held table with the heave and pitch block, as the game will read it. */
const sunk = (speed: number, depth: number, rail: number) => plantAt(speed, depth, { rail: (rail * Math.PI) / 180, sink: true });
/** What ships: the free table, ten states. */
const flat = (speed: number, depth: number, rail: number) => plantAt(speed, depth, { rail: (rail * Math.PI) / 180 });

/**
 * The filter's own steady error on each state: the covariance the Kalman gain is built from (`kalman`'s `dare`), with
 * the same process and sense noise `design` uses. The square root of its diagonal is "how well the rider knows this
 * state", in the state's own units.
 */
function filterError(d: Design, w: DesignWeights, nState: number): number[] {
  const ne = d.phiE.length;
  const p = d.c.length;
  const g = zeros(ne, ne);
  const at = [1, 3, 4, 5, 7];
  for (let i = 0; i < at.length; i += 1) g[at[i]][at[i]] = w.processNoise[i] ** 2 * CONTROL_STEP;
  if (nState > N_STATE) for (const i of [N_STATE + 1, N_STATE + 3]) g[i][i] = (w.heaveNoise ?? w.processNoise[3]) ** 2 * CONTROL_STEP;
  if (d.bias) { g[nState][nState] = w.bias[0] ** 2 * CONTROL_STEP; g[nState + 1][nState + 1] = w.bias[1] ** 2 * CONTROL_STEP; }
  for (let i = 0; i < ne; i += 1) g[i][i] += 1e-10;
  const v = zeros(p, p);
  const hn = w.heaveSenseNoise ?? HEAVE_SENSE_NOISE;
  for (let i = 0; i < p; i += 1) v[i][i] = (i < 7 ? w.senseNoise[i] : hn[i - 7]) ** 2;
  const cov = dare(transpose(d.phiE), transpose(d.cE), g, v);
  return cov.map((rowI, i) => Math.sqrt(Math.max(0, rowI[i])));
}

/** The rank of the observability matrix [C; CΦ; …] by Gaussian elimination with a relative tolerance. */
function observableRank(phi: Mat, c: Mat): { rank: number; of: number } {
  const n = phi.length;
  const rowsO: number[][] = [];
  let power: Mat = c;
  for (let k = 0; k < n; k += 1) {
    for (const rr of power) rowsO.push(rr.slice());
    power = mulMat(power, phi);
  }
  // Row-echelon with partial pivoting, scaled by the largest entry.
  let big = 0;
  for (const rr of rowsO) for (const v of rr) big = Math.max(big, Math.abs(v));
  const tol = 1e-9 * Math.max(big, 1);
  let rank = 0;
  for (let col = 0; col < n; col += 1) {
    let p = -1;
    let best = tol;
    for (let i = rank; i < rowsO.length; i += 1) if (Math.abs(rowsO[i][col]) > best) { best = Math.abs(rowsO[i][col]); p = i; }
    if (p < 0) continue;
    [rowsO[rank], rowsO[p]] = [rowsO[p], rowsO[rank]];
    const piv = rowsO[rank][col];
    for (let i = rank + 1; i < rowsO.length; i += 1) {
      const f = rowsO[i][col] / piv;
      if (f === 0) continue;
      for (let j = col; j < n; j += 1) rowsO[i][j] -= f * rowsO[rank][j];
    }
    rank += 1;
  }
  return { rank, of: n };
}
const mulMat = (a: Mat, b: Mat): Mat => a.map((rowI) => b[0].map((_, j) => rowI.reduce((s, v, k) => s + v * b[k][j], 0)));

/**
 * The plant with the controller in time, the delay exact (`predict.probe.ts`'s `timeRun`, generalised over the plant's
 * size and given a REFERENCE): Euler at 1/1920 s, the controller every frame on the senses `trueDelay` s old, the lean
 * asked for brought in at LEAN_RATE as the game eases it, and the commands the reference's plus the gains on the error.
 *
 * Returns the board's roll and the body's bank at the marks, the roll's peak and where it ends, and the ripple left on
 * the roll over the last second (the 0.33-0.74 Hz mode's own signature).
 */
function leanRun(d: Design, y: YawPlant, t: TwistPlant, trueDelay: number, seconds = 3, lean = LEAN / DEG) {
  const { a, b } = continuousPlant(y, t);
  const n = a.length;
  const x = new Array<number>(n).fill(0);
  const h = 1 / 1920;
  const per = Math.round(CONTROL_STEP / h);
  const senses: number[][] = [];
  const commands: number[][] = [];
  const ne = d.phiE.length;
  let e = new Array<number>(ne).fill(0);
  let u = [0, 0];
  const trueSteps = Math.round(trueDelay / CONTROL_STEP);
  const steps = Math.round(seconds / h);
  const marks = [0.3, 0.5, 0.9, 1.3, 1.8, 2.5];
  const trace: Record<string, number[]> = {};
  let peakRoll = 0;
  let asked = 0;
  const lateRoll: number[] = [];
  for (let i = 0; i < steps; i += 1) {
    const tNow = i * h;
    asked = Math.min(lean, LEAN_RATE * tNow);
    if (i % per === 0) {
      senses.push(d.c.map((rowI) => rowI.reduce((s, v, j) => s + v * x[j], 0)));
      if (senses.length > trueSteps) {
        const yk = senses[senses.length - 1 - trueSteps];
        const old = commands.length > d.steps ? commands[commands.length - 1 - d.steps] : [0, 0];
        const pred = d.phiE.map((rowI, ii) => rowI.reduce((s, v, j) => s + v * e[j], 0) + d.gammaE[ii][0] * old[0] + d.gammaE[ii][1] * old[1]);
        const innov = yk.map((v, ii) => v - d.cE[ii].reduce((s, cc, j) => s + cc * pred[j], 0));
        e = pred.map((v, ii) => v + d.l[ii].reduce((s, l, j) => s + l * innov[j], 0));
      }
      const bh = d.bias ? [e[n], e[n + 1]] : [0, 0];
      const xh = d.phiN.map((rowI) => rowI.reduce((s, v, j) => s + v * e[j], 0));
      for (let jj = 0; jj < d.steps; jj += 1) {
        const back = d.steps - jj;
        const uc = commands.length >= back ? commands[commands.length - back] : [0, 0];
        for (let ii = 0; ii < n; ii += 1) xh[ii] += d.pred[jj][ii][0] * (uc[0] + bh[0]) + d.pred[jj][ii][1] * (uc[1] + bh[1]);
      }
      // The reference: the turn that balances the lean asked, as `PredictiveController` reads it ('tan').
      const tt = steadyTurn(d.phi, d.gamma, Math.tan(asked), 0);
      const f = asked === 0 ? 1 : asked / Math.tan(asked);
      const ref = { x: tt.x.map((v, ii) => (ii === 0 || ii === 2 || ii === 8 ? v * f : v)), u: [tt.u[0] * f, tt.u[1]] };
      u = d.k.map((rowI, q) => ref.u[q] - bh[q] - rowI.reduce((s, v, j) => s + v * (xh[j] - ref.x[j]), 0));
      commands.push(u);
    }
    const dx = a.map((rowI, ii) => rowI.reduce((s, v, j) => s + v * x[j], 0) + b[ii][0] * u[0] + b[ii][1] * u[1]);
    for (let k = 0; k < n; k += 1) x[k] += h * dx[k];
    if (!Number.isFinite(x[0]) || Math.abs(x[0]) > 3) return { blewUp: r(tNow, 2) };
    peakRoll = Math.max(peakRoll, Math.abs(x[0]));
    for (const mk of marks) if (Math.abs(tNow - mk) < h / 2) trace[String(mk)] = [r(x[0] * DEG, 1)!, r(x[2] * DEG, 1)!, ...(n > N_STATE ? [r(x[N_STATE] * 1000, 1)!, r(x[N_STATE + 2] * DEG, 2)!] : [])];
    if (tNow > seconds - 1) lateRoll.push(x[0]);
  }
  // The ripple on the roll over the last second: half the peak-to-peak about its own mean.
  const mean = lateRoll.reduce((s, v) => s + v, 0) / Math.max(1, lateRoll.length);
  const ripple = (Math.max(...lateRoll) - Math.min(...lateRoll)) / 2;
  return {
    askedDeg: r(asked * DEG, 1), railAskedDeg: r(Math.abs(steadyTurn(d.phi, d.gamma, Math.tan(asked), 0).x[0] * (asked / Math.tan(asked))) * DEG, 1),
    peakRollDeg: r(peakRoll * DEG, 1), endRollDeg: r(mean * DEG, 1), rippleDeg: r(ripple * DEG, 2),
    marks: trace,
  };
}

it('step 3.2p: heavePlantAt against the block 3.2m built by hand, and the two plant constructions', () => {
  if (!PARTS.includes('repro')) return;
  for (const depth of DEPTHS) for (const v of SPEEDS) for (const deg of RAILS) {
    const x = row(v, deg);
    if (!x || x.stalled) { emit({ part: 'repro', speed: v, stance: STANCE(depth), rail: deg, stalled: true }); continue; }
    const mine = heavePlantAt(v, (deg * Math.PI) / 180, stanceAt(depth).height);
    const hand = heaveOf(x, depth);
    const gap = (p: keyof HeavePlant) => {
      const m = mine[p] as number[];
      const hh = hand[p] as number[];
      return Math.max(...m.map((q, i) => Math.abs(q - hh[i])));
    };
    const vertGap = Math.max(...(['roll', 'slip', 'yaw', 'rate'] as const).map((k) => Math.max(...mine.pitchVert[k].map((q, i) => Math.abs(q - hand.pitchVert[k][i])))));
    // The two ways to build the twelve: 3.2m's outright replacement, and this step's correction on `PLANT_SPEEDS`.
    const absolute = plantFrom(x, v, depth, hand);
    const correction = sunk(v, depth, deg);
    const dAbs = design(absolute.y, absolute.t, { ...WEIGHTS, heaveSense: true });
    const dCor = design(correction.y, correction.t, { ...WEIGHTS, heaveSense: true });
    emit({
      part: 'repro', speed: v, stance: STANCE(depth), rail: deg,
      blockGap: [r(gap('perHeave'), 6), r(gap('perHeaveRate'), 6), r(gap('perPitch'), 6), r(gap('perPitchRate'), 6), r(vertGap, 6)],
      massGap: r(Math.abs(mine.mass - hand.mass), 6), inertiaGap: r(Math.abs(mine.pitchInertia - hand.pitchInertia), 6),
      absoluteDamping: r(check(dAbs, absolute.y, absolute.t).damping, 3), correctionDamping: r(check(dCor, correction.y, correction.t).damping, 3),
      gainGap: r(Math.max(...dAbs.k.map((rowI, q) => Math.max(...rowI.map((q2, j) => Math.abs(q2 - dCor.k[q][j]))))), 3),
    });
  }
});

it('step 3.2p: what the rider can know about the board, with the sense and without', () => {
  if (!PARTS.includes('obs')) return;
  for (const depth of DEPTHS) for (const v of SPEEDS) for (const deg of RAILS) {
    const x = row(v, deg);
    if (!x || x.stalled) continue;
    const { y, t } = sunk(v, depth, deg);
    const out: Record<string, unknown> = { part: 'obs', speed: v, stance: STANCE(depth), rail: deg };
    for (const [name, w] of [['blind', { ...WEIGHTS }], ['sensed', { ...WEIGHTS, heaveSense: true }],
      ['loadOnly', { ...WEIGHTS, heaveSense: true, heaveSenseNoise: [HEAVE_SENSE_NOISE[0], 1e6] }],
      ['pitchOnly', { ...WEIGHTS, heaveSense: true, heaveSenseNoise: [1e6, HEAVE_SENSE_NOISE[1]] }]] as [string, DesignWeights][]) {
      const d = design(y, t, w);
      const err = filterError(d, w, d.phi.length);
      const rank = observableRank(d.phi, d.c);
      out[name] = {
        senses: d.c.length, rank: rank.rank, of: rank.of,
        heaveMm: r(err[N_STATE] * 1000, 1), heaveRateMms: r(err[N_STATE + 1] * 1000, 1),
        pitchDeg: r(err[N_STATE + 2] * DEG, 3), pitchRateDeg: r(err[N_STATE + 3] * DEG, 3),
        bankDeg: r(err[2] * DEG, 3), rollDeg: r(err[0] * DEG, 3),
      };
    }
    emit(out);
  }
});

it('step 3.2p: the loop with the sense, without it, and the ten-state one that ships', () => {
  if (!PARTS.includes('modes')) return;
  const sets: [string, DesignWeights][] = [
    ['blind', { ...WEIGHTS }],
    ['sensed', { ...WEIGHTS, heaveSense: true }],
    ['loadOnly', { ...WEIGHTS, heaveSense: true, heaveSenseNoise: [HEAVE_SENSE_NOISE[0], 1e6] }],
    ['pitchOnly', { ...WEIGHTS, heaveSense: true, heaveSenseNoise: [1e6, HEAVE_SENSE_NOISE[1]] }],
    ...(process.env.NOISES ?? '').split(',').filter(Boolean).map((q) => [`load${q}`, { ...WEIGHTS, heaveSense: true, heaveSenseNoise: [Number(q), HEAVE_SENSE_NOISE[1]] }] as [string, DesignWeights]),
    // The COST on the board's own motion, which is the other half of the pair: the sense makes the mode visible, and
    // this is what makes the loop act on it. `QPITCH` is the largest acceptable board pitch, degrees (the heave's own
    // cost follows it at the deck's own scale, 0.03 m per degree of pitch over the board's half length).
    ...(process.env.QPITCH ?? '').split(',').filter(Boolean).flatMap((q) => {
      const pitch = Number(q) / DEG;
      const heave = (Number(q) / DEG) * 0.75;
      const scale = [heave, heave * 4, pitch, pitch * 4];
      return [
        [`qPitch${q}`, { ...WEIGHTS, heaveSense: true, heaveScale: scale }] as [string, DesignWeights],
        [`qPitch${q}Blind`, { ...WEIGHTS, heaveScale: scale }] as [string, DesignWeights],
      ];
    }),
  ];
  for (const depth of DEPTHS) for (const v of SPEEDS) for (const deg of RAILS) {
    const x = row(v, deg);
    if (!x || x.stalled) { emit({ part: 'modes', speed: v, stance: STANCE(depth), rail: deg, stalled: true }); continue; }
    const { y, t } = sunk(v, depth, deg);
    const out: Record<string, unknown> = { part: 'modes', speed: v, stance: STANCE(depth), rail: deg };
    for (const [name, w] of sets) {
      const d = design(y, t, w);
      const own = check(d, y, t);
      const early = check(d, y, t, 5 * CONTROL_STEP);
      const late = check(d, y, t, 7 * CONTROL_STEP);
      out[name] = [r(own.damping, 3), r(own.frequency, 2), r(early.damping, 3), r(late.damping, 3)];
    }
    // Context: the shipped ten-state design on the shipped free plant, its own numbers.
    if (RAIL_PLANT[`${v}|${deg}`]) {
      const ten = flat(v, depth, deg);
      const d = design(ten.y, ten.t, WEIGHTS);
      const own = check(d, ten.y, ten.t);
      out.ten = [r(own.damping, 3), r(own.frequency, 2), r(check(d, ten.y, ten.t, 5 * CONTROL_STEP).damping, 3), r(check(d, ten.y, ten.t, 7 * CONTROL_STEP).damping, 3)];
    }
    emit(out);
  }
});

it('step 3.2p: a lean put over and held, in the model', () => {
  if (!PARTS.includes('time')) return;
  for (const depth of DEPTHS) for (const v of SPEEDS) for (const deg of RAILS) {
    const x = row(v, deg);
    if (!x || x.stalled) continue;
    const out: Record<string, unknown> = { part: 'time', speed: v, stance: STANCE(depth), rail: deg, leanDeg: LEAN };
    const { y, t } = sunk(v, depth, deg);
    out.blind = leanRun(design(y, t, WEIGHTS), y, t, 0.1);
    out.sensed = leanRun(design(y, t, { ...WEIGHTS, heaveSense: true }), y, t, 0.1);
    // A frame of timing error, which is where the blind loop goes negative.
    out.blindEarly = leanRun(design(y, t, WEIGHTS), y, t, 5 * CONTROL_STEP);
    out.sensedEarly = leanRun(design(y, t, { ...WEIGHTS, heaveSense: true }), y, t, 5 * CONTROL_STEP);
    const ten = flat(v, depth, deg);
    out.ten = leanRun(design(ten.y, ten.t, WEIGHTS), ten.y, ten.t, 0.1);
    emit(out);
  }
});
