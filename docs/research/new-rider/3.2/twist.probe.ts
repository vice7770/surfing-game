// Step 3.2c (ruling 29g): the delayed roll–yaw model with the rider's twist (`src/physics/rollModel.ts` `twistRows`,
// `humanTwistLoop`, `humanTwistModes`, `humanTwistKick`). One line per row ($OUT). From the repo root:
//   OUT=/tmp/twist.jsonl PART=check,lqr npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts twist.probe
// Parts: check (the model against 3.2b's), lqr (item 4: the upper bound, full state, no delay), search (item 5: a
// human law on the delayed model), margins (the chosen law over the margins), kick (the chosen law in time, the delay
// exact), passive (the twist's own stiffness and damping swept). Env: LAW=bank,bankRate,yawRate,twist,twistRate (the
// twist law, N·m per rad, rad/s; for margins and kick), ANKLE=bank,rate (the ankle law; default 3.2's 0, 0.1 s),
// KT, CT (the twist's own stiffness and damping), SAMPLES, SEED.
//
// The plant is `yaw.probe.ts`'s (the water's 12 captive derivatives, the feet's forward force and station, the deck),
// with the rider's yaw inertia split (`inertia.probe.ts`, PART split, the twist about the vertical through the centre of
// mass, the arms in the riding pose): with the board 1.37 / 1.37 / 1.24 kg·m², the upper body 1.44 / 1.68 / 1.96 (tall,
// the pumping crouch, Compress).
import { it } from 'vitest';
import { boardDerivatives, eigenvalues, humanTwistKick, humanTwistModes, humanYawModes, twistRows, type HumanRollGains, type TwistGains, type TwistPlant, type YawPlant } from '../../../../src/physics/rollModel';
import { emit, r } from '../../board-in-water/lab';
import { lqr, mul, add, zeros, type Mat } from './lqr';

const PARTS = (process.env.PART ?? 'check,lqr').split(',');
const DELAY = 0.1;
const LAG = 0.05;

/** The lab's captive derivatives (as `yaw.probe.ts`). */
const LAB: Record<number, { roll: number[]; slip: number[]; yaw: number[]; rate: number[] }> = {
  5: { roll: [-98.0, -361.0, -310.0], slip: [-28.6, 704.7, -272.7], yaw: [-3.3, 37.0, -30.0], rate: [-1.65, -13.9, -0.85] },
  7: { roll: [-104.9, -412.5, -285.3], slip: [-296.2, 1398.0, -530.6], yaw: [-13.1, 63.0, -34.5], rate: [2.65, -19.5, -1.5] },
  9: { roll: [-122.0, -418.3, -326.6], slip: [-573.0, 2234.5, -775.2], yaw: [-21.5, 86.0, -40.7], rate: [4.9, -24.0, -2.6] },
};
const DRAG: Record<number, number> = { 5: Math.sin((13.37 * Math.PI) / 180), 7: Math.sin((11.01 * Math.PI) / 180), 9: Math.sin((10.37 * Math.PI) / 180) };

/** The stances: the body over its feet, m; the yaw inertia with the board and on the twist, kg·m² (`inertia.probe.ts`). */
const STANCES = {
  tall: { height: 0.84, lower: 1.37, upper: 1.44, whole: 2.81 },
  crouch: { height: 0.65, lower: 1.37, upper: 1.68, whole: 3.05 },
  compress: { height: 0.55, lower: 1.24, upper: 1.96, whole: 3.2 },
} as const;
type Stance = keyof typeof STANCES;
/** The twist's own (undelayed) stiffness and damping, N·m/rad and N·m·s/rad (README Part 3, section 3). */
const KT = Number(process.env.KT ?? 20);
const CT = Number(process.env.CT ?? 3);

/** The lab's derivatives and the drag between the measured speeds, linearly (for the schedule's checks at 6 and 8 m/s). */
function labAt(speed: number) {
  if (LAB[speed]) return { lab: LAB[speed], drag: DRAG[speed] };
  const lo = speed < 7 ? 5 : 7;
  const f = (speed - lo) / 2;
  const mix = (a: number[], b: number[]) => a.map((x, i) => x + f * (b[i] - x));
  const A = LAB[lo]; const B = LAB[lo + 2];
  return { lab: { roll: mix(A.roll, B.roll), slip: mix(A.slip, B.slip), yaw: mix(A.yaw, B.yaw), rate: mix(A.rate, B.rate) }, drag: DRAG[lo] + f * (DRAG[lo + 2] - DRAG[lo]) };
}
function yawPlant(speed: number, stance: Stance, rollInertia: number, riderYaw = STANCES[stance].lower): YawPlant {
  const { lab, drag } = labAt(speed);
  return {
    speed, boardRollInertia: rollInertia, boardYawInertia: 0.449, riderYawInertia: riderYaw, boardMass: 2.54,
    mass: 73, height: STANCES[stance].height, ankleStiffness: 800, ankleDamping: 80, ...boardDerivatives(lab, speed, 0.236),
    feetForward: (150 * drag) / DRAG[7], feetStation: -0.244, deckHeight: 0.031,
  };
}
const twist = (stance: Stance, k = KT, c = CT): TwistPlant => ({ inertia: STANCES[stance].upper, stiffness: k, damping: c });

const G32: HumanRollGains = { bank: 0, bankRate: 0.1 };
const NONE: TwistGains = { bank: 0, bankRate: 0, yawRate: 0, twist: 0, twistRate: 0 };
const parseLaw = (s: string | undefined, d: TwistGains): TwistGains => {
  if (!s) return d;
  const [bank, bankRate, yawRate, tw, twistRate] = s.split(',').map(Number);
  return { bank, bankRate, yawRate, twist: tw, twistRate };
};
const ANKLE: HumanRollGains = process.env.ANKLE ? { bank: Number(process.env.ANKLE.split(',')[0]), bankRate: Number(process.env.ANKLE.split(',')[1]) } : G32;

interface Case { stance: Stance; speed: number; ib: number }
const CASES: Case[] = [];
for (const speed of [5, 7, 9]) for (const stance of ['tall', 'compress'] as Stance[]) for (const ib of [0.03, 0.3]) CASES.push({ stance, speed, ib });

const least = (y: YawPlant, t: TwistPlant, g: HumanRollGains, gt: TwistGains, delay = DELAY) => {
  try {
    const m = humanTwistModes(y, t, { delay, motorLag: LAG }, g, gt)[0];
    return m ?? { damping: 1, frequency: 0 };
  } catch {
    return { damping: -Infinity, frequency: 0 };
  }
};

// ---------- item 4: the upper bound (full state, no delay) ----------
/** The plant states (no commands): φ, φ̇, θ, θ̇, r, β, θ_t, ω_u; their indices in `twistRows`. */
const PS = [0, 1, 2, 3, 4, 5, 8, 9];
/** Bryson's scales: the largest state and command we would accept (rad, rad/s; the ankle's rest, rad; the twist, N·m). */
const XMAX = [0.05, 0.5, 0.05, 0.25, 0.2, 0.02, 0.5, 1];
/** The ankle's rest that moves the centre of pressure 0.09 m (72 N·m at 800 N·m/rad), and the hip rotators of both legs, 100 N·m. */
const UMAX = [0.09, 100];
const LIMITS = { ankle: 72, twistTorque: 100, twist: 0.87 };

function openLoop(y: YawPlant, t: TwistPlant, both: boolean, lag: boolean): { a: Mat; b: Mat; nx: number } {
  const rows = twistRows(y, t, 1, 11);
  const a8 = PS.map((i) => PS.map((j) => rows[i][j]));
  const bd = PS.map((i) => rows[i][6]);
  const bt = PS.map((i) => rows[i][10]);
  if (!lag) return { a: a8, b: PS.map((_, i) => (both ? [bd[i], bt[i]] : [bd[i]])), nx: 8 };
  // The commands through the motor lag: the rest δ and the twist torque τ_a become states.
  const n = both ? 10 : 9;
  const a = zeros(n, n);
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) a[i][j] = a8[i][j];
    a[i][8] = bd[i];
    if (both) a[i][9] = bt[i];
  }
  a[8][8] = -1 / LAG;
  if (both) a[9][9] = -1 / LAG;
  const b = zeros(n, both ? 2 : 1);
  b[8][0] = 1 / LAG;
  if (both) b[9][1] = 1 / LAG;
  return { a, b, nx: 8 };
}

function leastOf(m: Mat) {
  let w = { damping: Infinity, frequency: 0 };
  for (const v of eigenvalues(m)) {
    if (v.im < 0) continue;
    const size = Math.hypot(v.re, v.im);
    const d = size > 1e-12 ? -v.re / size : 1;
    if (d < w.damping) w = { damping: d, frequency: Math.abs(v.im) / (2 * Math.PI) };
  }
  return w;
}

/** The closed loop's efforts in time (RK4): a roll-rate kick of the board, or a shove of the body across (N·s). */
function efforts(cl: Mat, k: Mat, y: YawPlant, t: TwistPlant, both: boolean, lag: boolean, start: number[]) {
  let x = start.slice();
  const f = (s: number[]) => cl.map((row) => row.reduce((acc, v, j) => acc + v * s[j], 0));
  const dt = 1 / 1920;
  let ankle = 0; let torque = 0; let tw = 0;
  for (let i = 0; i < 1920 * 3; i += 1) {
    const k1 = f(x); const k2 = f(x.map((v, j) => v + (dt / 2) * k1[j])); const k3 = f(x.map((v, j) => v + (dt / 2) * k2[j])); const k4 = f(x.map((v, j) => v + dt * k3[j]));
    x = x.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    const u = k.map((row) => -row.reduce((acc, v, j) => acc + v * x[j], 0));
    const delta = lag ? x[8] : u[0];
    const ta = both ? (lag ? x[9] : u[1]) : 0;
    ankle = Math.max(ankle, Math.abs(y.ankleStiffness * (x[2] - x[0] - delta) + y.ankleDamping * (x[3] - x[1])));
    torque = Math.max(torque, Math.abs(ta + t.stiffness * x[6] + t.damping * (x[7] - x[4])));
    tw = Math.max(tw, Math.abs(x[6]));
  }
  return { ankle, torque, twist: tw };
}

function lqrScan(y: YawPlant, t: TwistPlant, both: boolean, lag: boolean) {
  const { a, b } = openLoop(y, t, both, lag);
  const n = a.length;
  const nu = b[0].length;
  let best = { damping: -Infinity, frequency: 0, rho: 0, emphasis: 0, ankle: 0, torque: 0, twist: 0 };
  let free = { damping: -Infinity, frequency: 0, rho: 0, emphasis: 0 };
  for (const emphasis of [1, 10, 100]) for (let e = -4; e <= 4.001; e += 0.5) {
    const rho = 10 ** e;
    const q = zeros(n, n);
    for (let i = 0; i < 8; i += 1) q[i][i] = (i === 2 || i === 3 ? emphasis : 1) / (XMAX[i] * XMAX[i]);
    const rr = zeros(nu, nu);
    for (let i = 0; i < nu; i += 1) rr[i][i] = rho / (UMAX[i] * UMAX[i]);
    let k: Mat;
    try {
      const sol = lqr(a, b, q, rr);
      if (!(sol.residual < 1e-6)) continue;
      k = sol.k;
    } catch { continue; }
    const cl = add(a, mul(b, k), -1);
    const m = leastOf(cl);
    if (m.damping > free.damping) free = { damping: m.damping, frequency: m.frequency, rho, emphasis };
    // The efforts: the bars' kick (0.5 rad/s of the board's roll rate) and a shove of 20 N·s across the body (3.2b's tall save).
    const kick = new Array<number>(n).fill(0); kick[1] = 0.5;
    const shove = new Array<number>(n).fill(0); shove[3] = 20 / 73 / y.height;
    const e1 = efforts(cl, k, y, t, both, lag, kick);
    const e2 = efforts(cl, k, y, t, both, lag, shove);
    const ef = { ankle: Math.max(e1.ankle, e2.ankle), torque: Math.max(e1.torque, e2.torque), twist: Math.max(e1.twist, e2.twist) };
    if (ef.ankle <= LIMITS.ankle && ef.torque <= LIMITS.twistTorque && ef.twist <= LIMITS.twist && m.damping > best.damping) {
      best = { damping: m.damping, frequency: m.frequency, rho, emphasis, ...ef };
    }
  }
  return { best, free };
}

/** The eight gains as a vector: the ankle's bank, bank rate, yaw rate; the twist's bank, bank rate, yaw rate, twist, twist rate. */
const toGains = (v: number[]): { g: HumanRollGains; gt: TwistGains } => ({ g: { bank: v[0], bankRate: v[1], yawRate: v[2] }, gt: { bank: v[3], bankRate: v[4], yawRate: v[5], twist: v[6], twistRate: v[7] } });
const BASE_SCALES = (process.env.SCALES ?? "0.25,0.05,0.1,50,10,10,10,2").split(",").map(Number);
let SCALES = BASE_SCALES;
/**
 * A pattern search (Hooke and Jeeves) on a worst-case score, from `start`, moving only the gains in `free` (indices);
 * the step starts at SCALES and halves when no move helps, down to 1/64.
 */
function patternSearch(score: (v: number[]) => number, start: number[], free: number[]): { v: number[]; s: number } {
  let v = start.slice();
  let best = score(v);
  const step = SCALES.map((x) => x);
  for (let round = 0; round < 400; round += 1) {
    let moved = false;
    for (const i of free) for (const sgn of [1, -1]) {
      const w = v.slice();
      w[i] += sgn * step[i];
      const s = score(w);
      if (s > best + 1e-6) { best = s; v = w; moved = true; break; }
    }
    if (!moved) {
      for (const i of free) step[i] /= 2;
      if (free.every((i) => step[i] < SCALES[i] / 64)) break;
    }
  }
  return { v, s: best };
}
/**
 * The gains at a speed and a body height from a vector: 8 entries (one law), 16 (the law at 7 m/s and its change per
 * m/s), or 24 (and its change per m of the body's height below tall).
 */
function gainsAt(v: number[], speed: number, height: number): number[] {
  const base = v.slice(0, 8);
  if (v.length >= 16) for (let k = 0; k < 8; k += 1) base[k] += v[8 + k] * (speed - 7);
  if (v.length >= 24) for (let k = 0; k < 8; k += 1) base[k] += v[16 + k] * (STANCES.tall.height - height);
  return base;
}
/** BRACE=1: the vector's last two entries are the twist's own stiffness and damping (the rider's bracing), inside the sourced box. */
const BRACE = process.env.BRACE === '1';
const BRACE_BOX = { k: [5, 150], c: [1, 15] };
/** The worst least damping over `cases`, the gain factors and the delays. */
function worstOver(v: number[], cases: Case[], factors: number[], delays: number[], floor = -Infinity): { w: number; at: string } {
  let w = Infinity; let at = '';
  const brace = BRACE ? v.slice(-2) : [KT, CT];
  if (brace[0] < BRACE_BOX.k[0] || brace[0] > BRACE_BOX.k[1] || brace[1] < BRACE_BOX.c[0] || brace[1] > BRACE_BOX.c[1]) return { w: -Infinity, at: 'outside the bracing box' };
  const gains = BRACE ? v.slice(0, -2) : v;
  for (const delay of delays) for (const f of factors) for (const c of cases) {
    const { g, gt } = toGains(gainsAt(gains, c.speed, STANCES[c.stance].height).map((x) => x * f));
    const m = least(yawPlant(c.speed, c.stance, c.ib), twist(c.stance, brace[0], brace[1]), g, gt, delay);
    if (m.damping < w) { w = m.damping; at = `${c.speed} m/s ${c.stance} Ib ${c.ib} ×${f} d ${delay} (${r(m.frequency, 2)} Hz)`; }
    if (w <= floor) return { w, at };
  }
  return { w, at };
}

it('step 3.2c: the twist in the model', () => {
  if (PARTS.includes('opt')) {
    // Item 5 by pattern search. FREE picks the gains (indices into toGains' vector); CASESET=one runs each case alone.
    // DIMS: 8 (one law), 16 (linear in speed), 24 (and in the body's height); CASE_SPEEDS and CASE_STANCES set the cases.
    const dims = Number(process.env.DIMS ?? 8);
    SCALES = [...BASE_SCALES, ...BASE_SCALES.map((x) => x / 2), ...BASE_SCALES.map((x) => x * 2)].slice(0, dims);
    if (BRACE) SCALES = [...SCALES, 20, 3];
    const free = (process.env.FREE ?? Array.from({ length: dims }, (_, i) => i).join(',')).split(',').map(Number);
    if (BRACE) free.push(dims, dims + 1);
    const g0 = [0, 0.1, 0, 0, 0, 0, 0, 0, ...new Array<number>(dims - 8).fill(0), ...(BRACE ? [KT, CT] : [])];
    if (process.env.CASE_SPEEDS) {
      CASES.length = 0;
      for (const speed of process.env.CASE_SPEEDS.split(',').map(Number)) for (const stance of (process.env.CASE_STANCES ?? 'tall,compress').split(',') as Stance[]) for (const ib of [0.03, 0.3]) CASES.push({ stance, speed, ib });
    }
    const nominal = process.env.NOMINAL === '1';
    const factors = nominal ? [1] : [1, 0.75, 1.33];
    const delays = nominal ? [DELAY] : [DELAY, 0.15];
    // CASESET: 'one' (each case alone), 'speed-stance' (the gains scheduled by speed and stance, both roll inertias together), 'speed' (by speed, both stances), or all.
    const groups = (key: (c: Case) => string) => [...new Set(CASES.map(key))].map((tag) => ({ tag, cases: CASES.filter((c) => key(c) === tag) }));
    const sets: { tag: string; cases: Case[] }[] = process.env.CASESET === 'one' ? groups((c) => `${c.speed} ${c.stance} ${c.ib}`)
      : process.env.CASESET === 'speed-stance' ? groups((c) => `${c.speed} ${c.stance}`)
        : process.env.CASESET === 'speed' ? groups((c) => `${c.speed}`) : [{ tag: 'all', cases: CASES }];
    const starts: number[][] = [g0];
    if (process.env.STARTS) for (const st of process.env.STARTS.split(';')) {
      const v = st.split(',').map(Number);
      const n = dims + (BRACE ? 2 : 0);
      while (v.length < n) v.push(v.length >= dims ? (v.length === dims ? KT : CT) : 0);
      starts.push(v.slice(0, n));
    }
    for (const set of sets) {
      let best = { v: g0, s: -Infinity };
      for (const st of starts) {
        const res = patternSearch((v) => worstOver(v, set.cases, factors, delays).w, st, free);
        if (res.s > best.s) best = res;
      }
      const w = worstOver(best.v, set.cases, factors, delays);
      emit({ part: 'opt', set: set.tag, free, nominal, worst: r(w.w, 3), at: w.at, gains: best.v.map((x) => r(x, 3)) });
    }
  }
  if (PARTS.includes('check')) {
    // 1. A stiff twist is 3.2b's rigid coupling (the whole 2.81 kg·m² with the board): 3.2b's model gave -0.266 at 0.59 Hz (7 m/s, tall, Ib 0.1, 3.2's gains).
    for (const speed of [5, 7, 9]) {
      const rigid = humanYawModes(yawPlant(speed, 'tall', 0.1, 2.81), { delay: DELAY, motorLag: LAG }, G32)[0];
      const stiff = least(yawPlant(speed, 'tall', 0.1), twist('tall', 1e4, 300), G32, NONE);
      const passive = least(yawPlant(speed, 'tall', 0.1), twist('tall'), G32, NONE);
      const freeUpper = least(yawPlant(speed, 'tall', 0.1), twist('tall', 0, 0), G32, NONE);
      const noRider = humanYawModes(yawPlant(speed, 'tall', 0.1, 0), { delay: DELAY, motorLag: LAG }, G32)[0];
      emit({
        part: 'check', speed, note: "3.2's ankle gains (0, 0.1 s), no twist law, tall, Ib 0.1",
        rigid32b: [r(rigid.damping, 3), r(rigid.frequency, 2)], stiffTwist: [r(stiff.damping, 3), r(stiff.frequency, 2)],
        passiveTwist: [r(passive.damping, 3), r(passive.frequency, 2)], upperFree: [r(freeUpper.damping, 3), r(freeUpper.frequency, 2)],
        noRiderInertia32: [r(noRider.damping, 3), r(noRider.frequency, 2)],
      });
    }
  }
  if (PARTS.includes('lqr')) {
    // Item 4: full-state LQR, no delay. (a) the ankle alone (the twist passive), (b) the ankle and the twist; (a0) 3.2b's
    // rigid coupling, the ankle alone. Each plant gets its own gains; the best least damping over Bryson weights
    // (ρ 1e-4..1e4, the bank's weight ×1, 10, 100), with the efforts within the limits for the bars' kick and a 20 N·s
    // shove. Without the motor lag (the commands act at once) and with it (0.05 s).
    for (const lag of [false, true]) for (const speed of [5, 7, 9]) {
      const row: Record<string, unknown> = { part: 'lqr', lag: lag ? LAG : 0, speed };
      for (const [name, both, rigid] of [['a0 rigid', false, true], ['a ankle', false, false], ['b ankle+twist', true, false]] as const) {
        let worst = { damping: Infinity } as Record<string, number>;
        let worstFree = { damping: Infinity } as Record<string, number>;
        let at = '';
        for (const stance of ['tall', 'compress'] as Stance[]) for (const ib of [0.03, 0.3]) {
          const y = rigid ? yawPlant(speed, stance, ib, STANCES[stance].whole) : yawPlant(speed, stance, ib);
          const t = rigid ? twist(stance, 1e4, 300) : twist(stance);
          const s = lqrScan(y, t, both, lag);
          if (s.best.damping < worst.damping) { worst = s.best; at = `${stance}, Ib ${ib}`; }
          if (s.free.damping < worstFree.damping) worstFree = s.free;
        }
        row[name] = { withinLimits: r(worst.damping, 3), hz: r(worst.frequency, 2), rho: worst.rho, bankWeight: worst.emphasis, ankleNm: r(worst.ankle, 0), twistNm: r(worst.torque, 0), twistRad: r(worst.twist, 2), at, noLimit: r(worstFree.damping, 3) };
      }
      emit(row);
    }
  }
  if (PARTS.includes('lqrgain')) {
    // The LQR gains of (b) (with the motor lag) at one case and ρ, in the human's senses: the twist command and the
    // ankle's rest on [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a]; then the same with the board's roll, roll rate and slip
    // dropped (what a human cannot sense), undelayed and with the delay (the delay approximated by the loop's Padé).
    const [sp, st, ib] = (process.env.MAP_CASE ?? '7,tall,0.1').split(',');
    const y = yawPlant(Number(sp), st as Stance, Number(ib));
    const t = twist(st as Stance);
    const { a, b } = openLoop(y, t, true, true);
    for (const rho of (process.env.RHOS ?? '1,10,100').split(',').map(Number)) {
      const q = zeros(10, 10);
      for (let i = 0; i < 8; i += 1) q[i][i] = 1 / (XMAX[i] * XMAX[i]);
      const rr = [[rho / (UMAX[0] * UMAX[0]), 0], [0, rho / (UMAX[1] * UMAX[1])]];
      const { k } = lqr(a, b, q, rr);
      const full = leastOf(add(a, mul(b, k), -1));
      const ks = k.map((row) => row.map((v, j) => ([0, 1, 5].includes(j) ? 0 : v)));
      const sensed = leastOf(add(a, mul(b, ks), -1));
      // In the human law's terms (u = −K x): the ankle's rest per bank −K[0][2], per bank rate −K[0][3]; the twist torque per bank −K[1][2], …
      emit({ part: 'lqrgain', rho, full: [r(full.damping, 3), r(full.frequency, 2)], sensedOnly: [r(sensed.damping, 3), r(sensed.frequency, 2)],
        ankle: k[0].map((v) => r(-v, 3)), twist: k[1].map((v) => r(-v, 2)) });
    }
  }
  if (PARTS.includes('map')) {
    // The landscape of one law family at one case: MAP_X and MAP_Y name two of the eight gains (indices), their ranges
    // MAP_XS and MAP_YS (from,to,steps); the rest from MAP_BASE; MAP_CASE speed,stance,ib; MAP_DELAY.
    const xi = Number(process.env.MAP_X ?? 3); const yi = Number(process.env.MAP_Y ?? 4);
    const [x0, x1, nx] = (process.env.MAP_XS ?? '-200,400,13').split(',').map(Number);
    const [y0, y1, ny] = (process.env.MAP_YS ?? '-50,150,9').split(',').map(Number);
    const base = (process.env.MAP_BASE ?? '0,0.1,0,0,0,0,0,0').split(',').map(Number);
    const [sp, st, ib] = (process.env.MAP_CASE ?? '7,tall,0.1').split(',');
    const delay = Number(process.env.MAP_DELAY ?? DELAY);
    const y = yawPlant(Number(sp), st as Stance, Number(ib));
    for (let j = 0; j < ny; j += 1) {
      const row: (number | null)[] = [];
      const yv = y0 + ((y1 - y0) * j) / (ny - 1);
      for (let i = 0; i < nx; i += 1) {
        const v = base.slice(); v[xi] = x0 + ((x1 - x0) * i) / (nx - 1); v[yi] = yv;
        const { g, gt } = toGains(v);
        row.push(r(least(y, twist(st as Stance), g, gt, delay).damping, 2));
      }
      emit({ part: 'map', y: r(yv, 2), row });
    }
  }
  if (PARTS.includes('passive')) {
    // The twist's own stiffness and damping swept, 3.2's ankle gains, no twist law (7 m/s, tall, Ib 0.1).
    for (const k of [0, 5, 10, 20, 40, 80, 150, 400]) for (const c of [0, 2, 5, 10, 20]) {
      const m = least(yawPlant(7, 'tall', 0.1), twist('tall', k, c), G32, NONE);
      emit({ part: 'passive', k, c, damping: r(m.damping, 3), hz: r(m.frequency, 2) });
    }
  }
  if (PARTS.includes('search')) {
    // Item 5: a human law. The ankle's and the twist's gains, delay 0.1 s and lag 0.05 s on both; each candidate's worst
    // over 5, 7, 9 m/s, tall and Compress, the board's roll inertia 0.03 and 0.3, the gains ×0.75, 1 and 1.33, and the
    // delay 0.1 and 0.15 s. A seeded random search, then a local one around the best.
    let seed = Number(process.env.SEED ?? 11);
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const span = (a: number, b: number) => a + (b - a) * rand();
    const score = (g: HumanRollGains, gt: TwistGains, floor = -Infinity) => {
      let w = Infinity; let at = '';
      const nominal = process.env.NOMINAL === '1';
      for (const delay of nominal ? [DELAY] : [DELAY, 0.15]) for (const f of nominal ? [1] : [1, 0.75, 1.33]) for (const c of CASES) {
        const gs = { bank: g.bank * f, bankRate: g.bankRate * f, yawRate: (g.yawRate ?? 0) * f };
        const ts: TwistGains = { bank: gt.bank * f, bankRate: gt.bankRate * f, yawRate: gt.yawRate * f, twist: gt.twist * f, twistRate: gt.twistRate * f };
        const m = least(yawPlant(c.speed, c.stance, c.ib), twist(c.stance), gs, ts, delay);
        if (m.damping < w) { w = m.damping; at = `${c.speed} m/s ${c.stance} Ib ${c.ib} ×${f} d ${delay} (${r(m.frequency, 2)} Hz)`; }
        if (w <= floor) return { w, at };
      }
      return { w, at };
    };
    const laws: { name: string; draw: () => { g: HumanRollGains; gt: TwistGains } }[] = [
      // Steer into the fall: the twist on the bank's angle and rate (N·m per rad, per rad/s), with the twist's own centring.
      { name: 'into the fall', draw: () => ({ g: G32, gt: { bank: span(0, 400), bankRate: span(0, 150), yawRate: 0, twist: span(-60, 0), twistRate: span(-15, 0) } }) },
      // The yaw rate's damping (the canals) with the twist's centring.
      { name: 'yaw-rate damping', draw: () => ({ g: G32, gt: { bank: 0, bankRate: 0, yawRate: span(-80, 0), twist: span(-60, 0), twistRate: span(-15, 0) } }) },
      // Both, and the ankle free.
      { name: 'both, ankle free', draw: () => ({ g: { bank: span(-0.5, 1), bankRate: span(0, 0.3) }, gt: { bank: span(0, 400), bankRate: span(0, 150), yawRate: span(-80, 20), twist: span(-60, 0), twistRate: span(-15, 0) } }) },
      // For comparison, the twist passive: the canals' yaw rate into the ankle (rad of rest per rad/s), with the bank and its rate.
      { name: 'ankle on the yaw rate', draw: () => ({ g: { bank: span(-0.5, 1), bankRate: span(-0.1, 0.4), yawRate: span(-0.6, 0.6) }, gt: NONE }) },
    ];
    const only = process.env.LAWS?.split(',');
    for (const law of laws.filter((l) => !only || only.includes(l.name))) {
      let best = { w: -Infinity, at: '', g: G32 as HumanRollGains, gt: NONE };
      for (let i = 0; i < Number(process.env.SAMPLES ?? 300); i += 1) {
        const { g, gt } = law.draw();
        const s = score(g, gt, best.w);
        if (s.w > best.w) best = { ...s, g, gt };
      }
      // Local: shrink a box around the best.
      let size = 0.3;
      for (let i = 0; i < Number(process.env.LOCAL ?? 200); i += 1) {
        const j = (v: number, s: number) => v + s * (2 * rand() - 1);
        const g: HumanRollGains = { bank: j(best.g.bank, 0.3 * size), bankRate: j(best.g.bankRate, 0.1 * size), yawRate: j(best.g.yawRate ?? 0, 0.2 * size) };
        if (law.name !== 'ankle on the yaw rate') g.yawRate = 0;
        if (law.name === 'into the fall' || law.name === 'yaw-rate damping') { g.bank = best.g.bank; g.bankRate = best.g.bankRate; }
        if (law.name === 'ankle on the yaw rate') {
          const s = score(g, NONE, best.w);
          if (s.w > best.w) best = { ...s, g, gt: NONE };
          if (i % 50 === 49) size *= 0.6;
          continue;
        }
        const gt: TwistGains = {
          bank: law.name === 'yaw-rate damping' ? 0 : j(best.gt.bank, 150 * size), bankRate: law.name === 'yaw-rate damping' ? 0 : j(best.gt.bankRate, 50 * size),
          yawRate: law.name === 'into the fall' ? 0 : j(best.gt.yawRate, 30 * size), twist: j(best.gt.twist, 20 * size), twistRate: j(best.gt.twistRate, 5 * size),
        };
        const s = score(g, gt, best.w);
        if (s.w > best.w) best = { ...s, g, gt };
        if (i % 50 === 49) size *= 0.6;
      }
      const round = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r(v, 3)]));
      emit({ part: 'search', law: law.name, worst: r(best.w, 3), at: best.at, ankle: round(best.g as unknown as Record<string, number>), twist: round(best.gt as unknown as Record<string, number>) });
    }
  }
  if (PARTS.includes('percase')) {
    // Each case alone (delay 0.1 s, no margins): the best law over all eight gains, a seeded random then local search.
    // If a case cannot be damped by any law, no single law passes.
    let seed = Number(process.env.SEED ?? 5);
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const span = (a: number, b: number) => a + (b - a) * rand();
    for (const c of CASES) {
      const y = yawPlant(c.speed, c.stance, c.ib);
      const t = twist(c.stance);
      const passive = least(y, t, G32, NONE);
      const run = (twistOn: boolean) => {
        let best = { w: -Infinity, f: 0, g: G32 as HumanRollGains, gt: NONE };
        const tryIt = (g: HumanRollGains, gt: TwistGains) => { const m = least(y, t, g, gt); if (m.damping > best.w) best = { w: m.damping, f: m.frequency, g, gt }; };
        for (let i = 0; i < Number(process.env.SAMPLES ?? 400); i += 1) {
          tryIt({ bank: span(-0.5, 1), bankRate: span(-0.1, 0.4), yawRate: span(-0.6, 0.6) },
            twistOn ? { bank: span(-100, 400), bankRate: span(-50, 150), yawRate: span(-80, 40), twist: span(-80, 10), twistRate: span(-20, 5) } : NONE);
        }
        let size = 0.3;
        for (let i = 0; i < Number(process.env.LOCAL ?? 300); i += 1) {
          const j = (v: number, sz: number) => v + sz * (2 * rand() - 1);
          const g = { bank: j(best.g.bank, 0.3 * size), bankRate: j(best.g.bankRate, 0.1 * size), yawRate: j(best.g.yawRate ?? 0, 0.2 * size) };
          const gt = twistOn ? { bank: j(best.gt.bank, 150 * size), bankRate: j(best.gt.bankRate, 50 * size), yawRate: j(best.gt.yawRate, 30 * size), twist: j(best.gt.twist, 20 * size), twistRate: j(best.gt.twistRate, 5 * size) } : NONE;
          tryIt(g, gt);
          if (i % 60 === 59) size *= 0.6;
        }
        const round = (o: object) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r(v as number, 3)]));
        return { best: [r(best.w, 3), r(best.f, 2)], ankle: round(best.g), twist: round(best.gt) };
      };
      emit({ part: 'percase', ...c, passive: [r(passive.damping, 3), r(passive.frequency, 2)], ankleOnly: run(false), withTwist: run(true) });
    }
  }
  if (PARTS.includes('schedule')) {
    // The gains scheduled by speed and stance (SCHEDULE: six vectors, 5 tall; 5 compress; 7 tall; 7 compress; 9 tall;
    // 9 compress), linear between the speeds and between the stances by the body's height; checked at 5–9 m/s every
    // 0.5 m/s, tall, the crouch and Compress, both roll inertias, the margins.
    const rows = (process.env.SCHEDULE ?? '').split(';').map((x) => x.split(',').map(Number));
    if (rows.length !== 6) throw new Error('SCHEDULE needs six vectors');
    const at = (speed: number, height: number) => {
      const v = Math.max(5, Math.min(9, speed));
      const lo = v < 7 ? 0 : 2;
      const fs = (v - (lo === 0 ? 5 : 7)) / 2;
      const ft = Math.max(0, Math.min(1, (STANCES.tall.height - height) / (STANCES.tall.height - STANCES.compress.height)));
      const pick = (i: number) => rows[i].map((x, k) => x + ft * (rows[i + 1][k] - x));
      const a = pick(lo); const b = pick(lo + 2);
      return a.map((x, k) => x + fs * (b[k] - x));
    };
    let worst = { w: Infinity, at: '' };
    for (let speed = 5; speed <= 9.001; speed += 0.5) for (const stance of ['tall', 'crouch', 'compress'] as Stance[]) {
      const v = at(speed, STANCES[stance].height);
      let w = Infinity; let where = '';
      for (const delay of [0.08, DELAY, 0.125, 0.15]) for (const f of [0.75, 1, 1.33]) for (const ib of [0.03, 0.1, 0.3]) {
        const { g, gt } = toGains(v.map((x) => x * f));
        const m = least(yawPlant(speed, stance, ib), twist(stance), g, gt, delay);
        if (m.damping < w) { w = m.damping; where = `Ib ${ib} ×${f} d ${delay} (${r(m.frequency, 2)} Hz)`; }
      }
      const nominal = least(yawPlant(speed, stance, 0.1), twist(stance), toGains(v).g, toGains(v).gt);
      emit({ part: 'schedule', speed, stance, nominal: [r(nominal.damping, 3), r(nominal.frequency, 2)], worst: r(w, 3), at: where, gains: v.map((x) => r(x, 3)) });
      if (w < worst.w) worst = { w, at: `${speed} m/s ${stance} ${where}` };
    }
    emit({ part: 'schedule', worst: r(worst.w, 3), at: worst.at });
  }
  const law = parseLaw(process.env.LAW, NONE);
  if (PARTS.includes('margins')) {
    for (const c of CASES) {
      const row: Record<string, unknown> = { part: 'margins', speed: c.speed, stance: c.stance, ib: c.ib };
      for (const delay of [0.08, 0.1, 0.125, 0.15]) for (const f of [0.75, 1, 1.33]) {
        const m = least(yawPlant(c.speed, c.stance, c.ib), twist(c.stance), { bank: ANKLE.bank * f, bankRate: ANKLE.bankRate * f },
          { bank: law.bank * f, bankRate: law.bankRate * f, yawRate: law.yawRate * f, twist: law.twist * f, twistRate: law.twistRate * f }, delay);
        row[`d${delay}x${f}`] = [r(m.damping, 3), r(m.frequency, 2)];
      }
      emit(row);
    }
  }
  if (PARTS.includes('kick')) {
    for (const speed of [5, 7, 9]) for (const stance of ['tall', 'compress'] as Stance[]) {
      const y = yawPlant(speed, stance, 0.1);
      const k = humanTwistKick(y, twist(stance), { delay: DELAY, motorLag: LAG }, ANKLE, law);
      const m = least(y, twist(stance), ANKLE, law);
      emit({ part: 'kick', speed, stance, damping: r(m.damping, 3), hz: r(m.frequency, 2), decayPerCycle: r(k.decay, 2), peakBankDeg: r((k.peakBank * 180) / Math.PI, 2), peakTwistDeg: r((k.peakTwist * 180) / Math.PI, 2), peakAnkleNm: r(k.peakAnkle, 1), peakTwistNm: r(k.peakTwistTorque, 1) });
    }
  }
});
