/**
 * The new surfer, step 3.2d (the advisor's ruling 29h; docs/research/new-rider/3.2, Part 4): balance by prediction.
 *
 * The plant is step 3.2c's (`rollModel.ts` `twistRows`): the board's roll, sway and yaw on the water's measured captive
 * derivatives, the body a point mass on its leg over the feet, the upper body a second yaw body on the legs' twist, and
 * the two commands (the ankle's rest and the twist's torque) through the muscles' 0.05 s lag. The human:
 * - senses the body's bank and its rate (the vestibular organs), the head's yaw rate (the canals; the head turns with
 *   the upper body), the twist's angle and rate, and the ankle's own angle and rate (the legs' own sense). Not the slip,
 *   and not the board's roll except through the ankle and the bank. Everything sensed arrives `delay` s late;
 * - keeps an internal model of the plant: a steady Kalman filter estimates the whole state as it was `delay` ago, and a
 *   predictor runs the model forward over the delay with the commands already sent, to now (Kuo 2005; Miall, Weir,
 *   Wolpert and Stein 1993: a Smith predictor; recalled);
 * - acts on the prediction with LQR gains (both channels). A surprise is still answered `delay` s late.
 * Everything runs at the frame's rate (`CONTROL_STEP`), the commands held over each frame. Gains and the model are
 * designed at each speed and stance of a table and interpolated between them.
 *
 * State order here: [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a] (the board's roll and its rate, the body's bank and its rate,
 * the board's yaw rate, its slip, the twist and the upper body's yaw rate, the ankle's lagged rest and the twist's
 * lagged torque); commands [u_a, u_t].
 */
import { boardDerivatives, twistRows, type TwistPlant, type YawPlant } from './rollModel';

export type Mat = number[][];
export const zeros = (r: number, c: number): Mat => Array.from({ length: r }, () => new Array<number>(c).fill(0));
export const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export const transpose = (a: Mat): Mat => a[0].map((_, j) => a.map((row) => row[j]));
export function mul(a: Mat, b: Mat): Mat {
  const out = zeros(a.length, b[0].length);
  for (let i = 0; i < a.length; i += 1) for (let k = 0; k < b.length; k += 1) {
    const v = a[i][k];
    if (v === 0) continue;
    const bk = b[k];
    const oi = out[i];
    for (let j = 0; j < bk.length; j += 1) oi[j] += v * bk[j];
  }
  return out;
}
export const add = (a: Mat, b: Mat, s = 1): Mat => a.map((row, i) => row.map((v, j) => v + s * b[i][j]));
export const scale = (a: Mat, s: number): Mat => a.map((row) => row.map((v) => v * s));
const norm1 = (a: Mat) => a.reduce((s, row) => s + row.reduce((t, v) => t + Math.abs(v), 0), 0);
export function inverse(a: Mat): Mat {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (m[p][c] === 0) throw new Error('singular');
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    for (let j = 0; j < 2 * n; j += 1) m[c][j] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = m[r][c];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j += 1) m[r][j] -= f * m[c][j];
    }
  }
  return m.map((row) => row.slice(n));
}
/** e^A by scaling and squaring with a Taylor series (the matrices here are small). */
export function expm(a: Mat): Mat {
  const n = a.length;
  const size = norm1(a) / n;
  const s = Math.max(0, Math.ceil(Math.log2(Math.max(size, 1e-12) / 0.25)));
  const as = scale(a, 2 ** -s);
  let term = eye(n);
  let sum = eye(n);
  for (let k = 1; k <= 14; k += 1) {
    term = scale(mul(term, as), 1 / k);
    sum = add(sum, term);
  }
  for (let i = 0; i < s; i += 1) sum = mul(sum, sum);
  return sum;
}
/** The zero-order-hold discretisation over `t`: Φ = e^{A t}, Γ = ∫₀ᵗ e^{A s} ds B. */
export function discretise(a: Mat, b: Mat, t: number): { phi: Mat; gamma: Mat } {
  const n = a.length;
  const m = b[0].length;
  const big = zeros(n + m, n + m);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) big[i][j] = a[i][j] * t;
    for (let j = 0; j < m; j += 1) big[i][n + j] = b[i][j] * t;
  }
  const e = expm(big);
  return { phi: e.slice(0, n).map((row) => row.slice(0, n)), gamma: e.slice(0, n).map((row) => row.slice(n)) };
}
/**
 * The discrete algebraic Riccati equation X = AᵀXA − AᵀXB (R + BᵀXB)⁻¹ BᵀXA + Q by the structure-preserving doubling
 * algorithm (Chu, Fan, Lin and Wang 2004); returns X.
 */
export function dare(a: Mat, b: Mat, q: Mat, r: Mat): Mat {
  const n = a.length;
  let A = a;
  let G = mul(mul(b, inverse(r)), transpose(b));
  let H = q;
  for (let it = 0; it < 80; it += 1) {
    const w = inverse(add(eye(n), mul(G, H)));
    const aw = mul(A, w);
    const nextA = mul(aw, A);
    const nextG = add(G, mul(mul(aw, G), transpose(A)));
    const nextH = add(H, mul(mul(mul(transpose(A), H), w), A));
    const change = norm1(add(nextH, H, -1));
    A = nextA; G = nextG; H = nextH;
    if (change <= 1e-12 * Math.max(1, norm1(H))) break;
  }
  return H.map((row, i) => row.map((v, j) => (v + H[j][i]) / 2));
}
/** The discrete LQR gain (u = −K x). */
export function dlqr(phi: Mat, gamma: Mat, q: Mat, r: Mat): Mat {
  const x = dare(phi, gamma, q, r);
  const gt = transpose(gamma);
  return mul(inverse(add(r, mul(mul(gt, x), gamma))), mul(mul(gt, x), phi));
}
/** The steady Kalman filter's gain in the current form (x̂ = x̂⁻ + L (y − C x̂⁻)) for process noise W and sensor noise V. */
export function kalman(phi: Mat, c: Mat, w: Mat, v: Mat): Mat {
  const p = dare(transpose(phi), transpose(c), w, v);
  const ct = transpose(c);
  return mul(mul(p, ct), inverse(add(mul(mul(c, p), ct), v)));
}

/** Indices of the state, and the sizes. */
export const N_STATE = 10;
export const N_SENSE = 7;
export const N_COMMAND = 2;
/** The frame: the controller's step, s. */
export const CONTROL_STEP = 1 / 60;
/** The sensing delay the internal model assumes, s (as 3.2's `BALANCE_DELAY`), and the muscles' lag. */
export const PREDICT_DELAY = 0.1;
export const PREDICT_LAG = 0.05;

/** The senses as rows over the state: the bank, its rate, the head's yaw rate, the twist, its rate, the ankle's angle (θ − φ) and rate. */
export function senseMatrix(): Mat {
  const c = zeros(N_SENSE, N_STATE);
  c[0][2] = 1;
  c[1][3] = 1;
  c[2][7] = 1;
  c[3][6] = 1;
  c[4][7] = 1; c[4][4] = -1;
  c[5][2] = 1; c[5][0] = -1;
  c[6][3] = 1; c[6][1] = -1;
  return c;
}

/** The continuous plant (A, B) in this file's state order, from `YawPlant` and `TwistPlant`, with the muscles' lag. */
export function continuousPlant(y: YawPlant, t: TwistPlant, lag = PREDICT_LAG, load = 1): { a: Mat; b: Mat } {
  const rows = twistRows(y, t, load, 11);
  // twistRows' order: [φ, φ̇, θ, θ̇, r, β, δ, ι, θ_t, ω_u, τ_a]; here [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a].
  const map = [0, 1, 2, 3, 4, 5, 8, 9, 6, 10];
  const a = zeros(N_STATE, N_STATE);
  for (let i = 0; i < 8; i += 1) for (let j = 0; j < N_STATE; j += 1) a[i][j] = rows[map[i]][map[j]];
  a[8][8] = -1 / lag;
  a[9][9] = -1 / lag;
  const b = zeros(N_STATE, N_COMMAND);
  b[8][0] = 1 / lag;
  b[9][1] = 1 / lag;
  return { a, b };
}

/**
 * The water's captive derivatives with the rigid point rider (docs/research/new-rider/roll-plant `plant.ts`, part
 * `captive`): [N, Y, K] per rad of roll, per rad of slip, per rad/s of yaw rate and per rad/s of roll rate about the
 * deck, in the lab's axes. 5, 7 and 9 m/s from the roll-plant study (`results/plant-point.jsonl`); the other speeds
 * measured the same way for step 3.2d (`3.2/results/plant-speeds.jsonl`); the roll rate's is the mean of 0.2 and
 * 0.5 rad/s. Below 5 m/s the board does not plane (it trims 26° at 4.5 m/s, 46° at 4). `drag` is the terminal plane's sine (the
 * feet carry the hull's drag forward; `bars.probe.ts`'s TERMINAL at 5, 7, 9 and 12 m/s, linear between, held below 5).
 */
export interface LabPlant { roll: number[]; slip: number[]; yaw: number[]; rate: number[]; drag: number }
export const PLANT_SPEEDS: Record<string, LabPlant> = {
  '4': { roll: [-37.2, -177.6, -268.7], slip: [143.8, 343.8, -63.0], yaw: [-18.7, 43.0, -61.3], rate: [-7.69, -8.0, -4.33], drag: 0.2312 }, // trim 46.4°, draft 0.513 m
  '4.5': { roll: [-98.0, -326.6, -322.0], slip: [41.3, 550.0, -191.4], yaw: [-3.8, 31.0, -32.5], rate: [-3.52, -12.0, -1.51], drag: 0.2312 }, // trim 25.9°, draft 0.293 m
  '5': { roll: [-98.0, -361.0, -310.0], slip: [-28.6, 704.7, -272.7], yaw: [-3.3, 37.0, -30.0], rate: [-1.63, -13.9, -0.84], drag: 0.2312 }, // trim 19.3°, draft 0.215 m
  '5.5': { roll: [-98.5, -383.9, -299.7], slip: [-95.1, 865.2, -354.1], yaw: [-5.1, 43.0, -30.7], rate: [-0.27, -15.55, -0.43], drag: 0.2212 }, // trim 15.3°, draft 0.166 m
  '6': { roll: [-105.4, -395.3, -296.8], slip: [-161.0, 1031.3, -411.4], yaw: [-7.6, 50.0, -31.7], rate: [0.87, -17.0, -0.62], drag: 0.2112 }, // trim 12.6°, draft 0.133 m
  '6.5': { roll: [-107.7, -401.1, -296.2], slip: [-226.3, 1203.2, -458.9], yaw: [-10.3, 56.0, -32.6], rate: [1.79, -18.35, -1.24], drag: 0.2011 }, // trim 10.7°, draft 0.109 m
  '7': { roll: [-104.9, -412.5, -285.3], slip: [-296.2, 1398.0, -530.6], yaw: [-13.1, 63.0, -34.5], rate: [2.63, -19.55, -1.52], drag: 0.191 }, // trim 9.2°, draft 0.091 m
  '7.5': { roll: [-68.8, -429.7, -143.2], slip: [-369.0, 1627.2, -641.7], yaw: [-16.2, 70.0, -38.2], rate: [3.31, -21.1, -1.28], drag: 0.1882 }, // trim 8.8°, draft 0.085 m
  '8': { roll: [-98.5, -401.1, -227.5], slip: [-452.6, 1776.2, -662.9], yaw: [-19.3, 75.0, -37.5], rate: [4.27, -21.55, -2.19], drag: 0.1855 }, // trim 5.6°, draft 0.056 m
  '8.5': { roll: [-112.3, -441.2, -229.2], slip: [-536.9, 2079.8, -829.6], yaw: [-22.2, 83.0, -43.6], rate: [4.92, -23.9, -1.43], drag: 0.1828 }, // trim 7.3°, draft 0.07 m
  '9': { roll: [-122.0, -418.3, -326.6], slip: [-573.0, 2234.5, -775.2], yaw: [-21.5, 86.0, -40.7], rate: [4.92, -24.0, -2.62], drag: 0.18 }, // trim 5.7°, draft 0.045 m
  '9.5': { roll: [-143.8, -401.1, -318.0], slip: [-702.4, 2475.2, -842.2], yaw: [-26.9, 92.0, -41.3], rate: [6.14, -25.1, -3.99], drag: 0.1821 }, // trim 4.8°, draft 0.042 m
  '10': { roll: [-140.9, -441.2, -283.0], slip: [-781.5, 2790.3, -1020.4], yaw: [-28.7, 99.0, -47.4], rate: [6.5, -26.9, -3.0], drag: 0.1842 }, // trim 5.7°, draft 0.047 m
  '10.5': { roll: [-135.8, -406.8, -350.1], slip: [-833.7, 2962.2, -930.5], yaw: [-28.3, 102.0, -43.5], rate: [6.58, -27.45, -4.12], drag: 0.1863 }, // trim 4.3°, draft 0.027 m
  '11': { roll: [-157.0, -401.1, -357.0], slip: [-966.6, 3242.9, -998.1], yaw: [-33.1, 108.0, -44.0], rate: [7.57, -28.45, -5.56], drag: 0.1884 }, // trim 4.4°, draft 0.034 m
  '11.5': { roll: [-165.6, -424.0, -387.9], slip: [-1038.8, 3558.1, -1127.6], yaw: [-33.6, 114.0, -48.3], rate: [7.68, -29.9, -4.89], drag: 0.1904 }, // trim 4.8°, draft 0.03 m
  '12': { roll: [-161.0, -395.3, -448.6], slip: [-1115.5, 3741.4, -1006.1], yaw: [-34.4, 117.0, -43.3], rate: [8.01, -30.1, -6.15], drag: 0.1925 }, // trim 2.9°, draft 0.017 m
};

/** The stances (3.2c's split; the body over its feet as 3.2b's model read the traces): by the leg's depth, m. */
export const STANCE_TABLE = [
  { depth: 0, height: 0.84, lower: 1.37, upper: 1.44 },
  { depth: 0.195, height: 0.65, lower: 1.37, upper: 1.68 },
  { depth: 0.3, height: 0.55, lower: 1.24, upper: 1.96 },
] as const;
export const TWIST_STIFFNESS = 20;
export const TWIST_DAMPING = 3;
/** 3.2d's guess at the board's roll inertia with the water's, kg·m² (the gate's range 0.03–0.3). Step 3.2e uses the game's own (BOARD_INERTIA). */
export const BOARD_ROLL_INERTIA = 0.1;
/**
 * The board's roll and yaw inertia as its own solve meets them, kg·m² about its centre of mass: its own (0.026 and
 * 0.449) and the water's implicit share (the hull's added mass, mostly), by speed (step 3.2e, docs/research/new-rider/3.2
 * `e32.probe.ts` PART=inertia: the new rider standing tall, a steady glide on the terminal plane, 16 substeps; crouch
 * and Compress within 0.15 above 4.5 m/s). The internal model uses the game's own values (ruling 29i).
 */
export const BOARD_INERTIA: Record<string, [number, number]> = {
  '4': [1.396, 0.697], '4.5': [1.218, 0.589], '5': [1.071, 0.559], '5.5': [1.049, 0.559], '6': [1.055, 0.56], '6.5': [1.056, 0.56],
  '7': [0.933, 0.552], '7.5': [0.991, 0.561], '8': [0.737, 0.566], '8.5': [0.756, 0.559], '9': [0.766, 0.562], '9.5': [0.755, 0.569],
  '10': [0.728, 0.576], '10.5': [0.638, 0.582], '11': [0.596, 0.586], '11.5': [0.579, 0.591], '12': [0.552, 0.596],
};
/** The board's roll and yaw inertia (BOARD_INERTIA) at a speed, linear between the table's speeds, held at its ends. */
export function boardInertiaAt(speed: number): { roll: number; yaw: number } {
  const speeds = Object.keys(BOARD_INERTIA).map(Number).sort((x, y) => x - y);
  const v = Math.max(speeds[0], Math.min(speeds[speeds.length - 1], speed));
  let i = 0;
  while (i < speeds.length - 2 && v > speeds[i + 1]) i += 1;
  const lo = BOARD_INERTIA[String(speeds[i])];
  const hi = BOARD_INERTIA[String(speeds[i + 1])];
  const f = (v - speeds[i]) / (speeds[i + 1] - speeds[i]);
  return { roll: lo[0] + f * (hi[0] - lo[0]), yaw: lo[1] + f * (hi[1] - lo[1]) };
}

export function stanceAt(depth: number): { height: number; lower: number; upper: number } {
  const d = Math.max(0, Math.min(STANCE_TABLE[2].depth, depth));
  const i = d <= STANCE_TABLE[1].depth ? 0 : 1;
  const a = STANCE_TABLE[i];
  const b = STANCE_TABLE[i + 1];
  const f = (d - a.depth) / (b.depth - a.depth);
  return { height: a.height + f * (b.height - a.height), lower: a.lower + f * (b.lower - a.lower), upper: a.upper + f * (b.upper - a.upper) };
}
/** The lab's plant at any speed in the table's range, linear between its speeds. */
export function labAt(speed: number): LabPlant {
  const speeds = Object.keys(PLANT_SPEEDS).map(Number).sort((x, y) => x - y);
  if (speeds.length === 0) throw new Error('no plant table');
  const v = Math.max(speeds[0], Math.min(speeds[speeds.length - 1], speed));
  let i = 0;
  while (i < speeds.length - 2 && v > speeds[i + 1]) i += 1;
  const lo = PLANT_SPEEDS[String(speeds[i])];
  const hi = PLANT_SPEEDS[String(speeds[i + 1])];
  const f = speeds[i + 1] === speeds[i] ? 0 : (v - speeds[i]) / (speeds[i + 1] - speeds[i]);
  const mix = (a: number[], b: number[]) => a.map((x, k) => x + f * (b[k] - x));
  return { roll: mix(lo.roll, hi.roll), slip: mix(lo.slip, hi.slip), yaw: mix(lo.yaw, hi.yaw), rate: mix(lo.rate, hi.rate), drag: lo.drag + f * (hi.drag - lo.drag) };
}
/** The drag a 7 m/s glide's feet carry forward, N (the roll-plant study: about 0.2 g; 1.5 N·m per cm of offset). */
const FEET_FORWARD_AT_7 = 150;
const DRAG_AT_7 = Math.sin((11.01 * Math.PI) / 180);

/**
 * 3.2c's plant at a speed and stance: `YawPlant` and `TwistPlant`. `scales` multiplies the water's twelve derivatives
 * (the robustness gate); `feetScale` the along-board force the feet carry (step 3.2e's errors by contributor).
 */
export function plantAt(speed: number, depth: number, opts: { rollInertia?: number; yawInertia?: number; twistStiffness?: number; twistDamping?: number; scales?: number[]; feetScale?: number } = {}): { y: YawPlant; t: TwistPlant } {
  const lab = labAt(speed);
  const s = opts.scales ?? new Array<number>(12).fill(1);
  const scaled = { roll: lab.roll.map((x, k) => x * s[k]), slip: lab.slip.map((x, k) => x * s[3 + k]), yaw: lab.yaw.map((x, k) => x * s[6 + k]), rate: lab.rate.map((x, k) => x * s[9 + k]) };
  const st = stanceAt(depth);
  const board = boardInertiaAt(speed);
  const y: YawPlant = {
    speed, boardRollInertia: opts.rollInertia ?? board.roll, boardYawInertia: opts.yawInertia ?? board.yaw, riderYawInertia: st.lower, boardMass: 2.54,
    mass: 73, height: st.height, ankleStiffness: 800, ankleDamping: 80, ...boardDerivatives(scaled, speed, 0.236),
    feetForward: ((opts.feetScale ?? 1) * FEET_FORWARD_AT_7 * lab.drag) / DRAG_AT_7, feetStation: -0.244, deckHeight: 0.031,
  };
  return { y, t: { inertia: st.upper, stiffness: opts.twistStiffness ?? TWIST_STIFFNESS, damping: opts.twistDamping ?? TWIST_DAMPING } };
}

/** The design's weights: LQR (Bryson's scales of the state and the commands, ρ) and the filter's noises. */
export interface DesignWeights {
  /** The largest acceptable state, [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u] (rad, rad/s). */
  stateScale: number[];
  /** The largest acceptable commands: the ankle's rest (rad) and the twist torque (N·m), and ρ on both. */
  commandScale: number[];
  rho: number;
  /** The process noise's standard deviations per √s on [φ̇, θ̇, r, β, ω_u] (rad/s², or rad/s for the slip) and the senses' noise. */
  processNoise: number[];
  senseNoise: number[];
  /**
   * The muscles' slow bias, a random walk per √s on each command (the ankle's rest, rad; the twist, N·m), which the
   * internal model estimates and the commands cancel (offset-free control). Empty: none.
   */
  bias: number[];
}
export const DEFAULT_WEIGHTS: DesignWeights = {
  stateScale: [0.05, 0.5, 0.05, 0.25, 0.2, 0.02, 0.5, 1],
  commandScale: [0.09, 30],
  rho: 10,
  processNoise: [2, 1, 1, 0.2, 1],
  senseNoise: [0.017, 0.009, 0.017, 0.017, 0.05, 0.009, 0.02],
  bias: [0.01, 5],
};

/**
 * One design: the internal model (Φ, Γ, the senses; with the bias, the estimate's model has the two bias states after
 * the ten), the LQR gain on the ten, the filter's gain and the predictor's terms over `steps` frames.
 */
export interface Design {
  phi: Mat;
  gamma: Mat;
  c: Mat;
  k: Mat;
  /** The estimate's model (ne = 10, or 12 with the bias): Φe, Γe, Ce, and the filter's gain L (ne × 7). */
  phiE: Mat;
  gammaE: Mat;
  cE: Mat;
  l: Mat;
  /** Φ^N and Φ^{N−1−j} Γ, j = 0..N−1. */
  phiN: Mat;
  pred: Mat[];
  steps: number;
  /** The bias states are estimated (the commands add −b̂). */
  bias: boolean;
}
export function design(y: YawPlant, t: TwistPlant, w: DesignWeights = DEFAULT_WEIGHTS, delay = PREDICT_DELAY, step = CONTROL_STEP): Design {
  const { a, b } = continuousPlant(y, t);
  const { phi, gamma } = discretise(a, b, step);
  const q = zeros(N_STATE, N_STATE);
  for (let i = 0; i < 8; i += 1) q[i][i] = 1 / (w.stateScale[i] * w.stateScale[i]);
  // The weights per step (the continuous cost sampled): Q T, R T.
  const qd = scale(q, step);
  const rd = [[(w.rho * step) / (w.commandScale[0] ** 2), 0], [0, (w.rho * step) / (w.commandScale[1] ** 2)]];
  const k = dlqr(phi, gamma, qd, rd);
  const c = senseMatrix();
  const bias = w.bias.length === 2;
  const ne = bias ? N_STATE + 2 : N_STATE;
  // The estimate's model: the bias enters as the commands do, and stays.
  const phiE = zeros(ne, ne);
  const gammaE = zeros(ne, N_COMMAND);
  for (let i = 0; i < N_STATE; i += 1) {
    for (let j = 0; j < N_STATE; j += 1) phiE[i][j] = phi[i][j];
    for (let j = 0; j < N_COMMAND; j += 1) { gammaE[i][j] = gamma[i][j]; if (bias) phiE[i][N_STATE + j] = gamma[i][j]; }
  }
  if (bias) { phiE[N_STATE][N_STATE] = 1; phiE[N_STATE + 1][N_STATE + 1] = 1; }
  const cE = c.map((row) => [...row, ...new Array<number>(ne - N_STATE).fill(0)]);
  // The process noise enters the rates (φ̇, θ̇, r, β, ω_u), over a step; the bias as a random walk; the senses' noise as given.
  const g = zeros(ne, ne);
  const at = [1, 3, 4, 5, 7];
  for (let i = 0; i < at.length; i += 1) g[at[i]][at[i]] = w.processNoise[i] ** 2 * step;
  if (bias) { g[N_STATE][N_STATE] = w.bias[0] ** 2 * step; g[N_STATE + 1][N_STATE + 1] = w.bias[1] ** 2 * step; }
  for (let i = 0; i < ne; i += 1) g[i][i] += 1e-10;
  const v = zeros(N_SENSE, N_SENSE);
  for (let i = 0; i < N_SENSE; i += 1) v[i][i] = w.senseNoise[i] ** 2;
  const l = kalman(phiE, cE, g, v);
  const steps = Math.round(delay / step);
  let power = eye(N_STATE);
  const pred: Mat[] = new Array<Mat>(steps);
  for (let j = steps - 1; j >= 0; j -= 1) {
    pred[j] = mul(power, gamma);
    power = mul(power, phi);
  }
  return { phi, gamma, c, k, phiE, gammaE, cE, l, phiN: power, pred, steps, bias };
}

/**
 * The closed loop of the true plant (`truePhi`, `trueGamma`, its senses `trueSteps` frames late) with a controller
 * (`d`): the augmented state [x, the senses' line (7 × trueSteps), the estimate of the state `d.steps` frames ago (and
 * the bias), the commands sent over the last d.steps + 1 frames]. Returns M with z' = M z. The controller each frame:
 * - the estimate: pred = Φe ê + Γe u_{k−N−1}; ê = pred + L (y − Ce pred), y the senses `trueSteps` frames old;
 * - the prediction: x̂ = Φ^N x̂_{k−N} + Σ_j Φ^{N−1−j} Γ (u_{k−N+j} + b̂);
 * - the command: u = −K x̂ − b̂.
 */
export function closedLoop(truePhi: Mat, trueGamma: Mat, trueSteps: number, d: Design): Mat {
  const n = N_STATE; const p = N_SENSE; const m = N_COMMAND;
  const ne = d.phiE.length;
  const N = d.steps;
  const ox = 0; const os = n; const oe = n + p * trueSteps; const ou = oe + ne;
  const D = ou + m * (N + 1);
  const predMap = zeros(ne, D);
  for (let i = 0; i < ne; i += 1) {
    for (let j = 0; j < ne; j += 1) predMap[i][oe + j] = d.phiE[i][j];
    for (let j = 0; j < m; j += 1) predMap[i][ou + m * N + j] = d.gammaE[i][j];
  }
  const eMap = mul(add(eye(ne), mul(d.l, d.cE), -1), predMap);
  for (let i = 0; i < ne; i += 1) for (let j = 0; j < p; j += 1) eMap[i][os + p * (trueSteps - 1) + j] += d.l[i][j];
  // The estimated bias, as a map (2 × D), or nothing.
  const bMap = d.bias ? [eMap[n], eMap[n + 1]] : [new Array<number>(D).fill(0), new Array<number>(D).fill(0)];
  const xMap = mul(d.phiN, eMap.slice(0, n));
  const predSum = zeros(n, m);
  for (let jj = 0; jj < N; jj += 1) {
    const slot = N - 1 - jj;
    for (let i = 0; i < n; i += 1) for (let j = 0; j < m; j += 1) { xMap[i][ou + m * slot + j] += d.pred[jj][i][j]; predSum[i][j] += d.pred[jj][i][j]; }
  }
  // The bias acts through the whole delay too.
  const xPlus = add(xMap, mul(predSum, bMap));
  const uMap = add(scale(mul(d.k, xPlus), -1), bMap, -1);
  const M = zeros(D, D);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) M[ox + i][ox + j] = truePhi[i][j];
    for (let j = 0; j < D; j += 1) for (let q = 0; q < m; q += 1) M[ox + i][j] += trueGamma[i][q] * uMap[q][j];
  }
  const c = d.c;
  for (let i = 0; i < p; i += 1) for (let j = 0; j < n; j += 1) M[os + i][ox + j] = c[i][j];
  for (let s2 = 1; s2 < trueSteps; s2 += 1) for (let i = 0; i < p; i += 1) M[os + p * s2 + i][os + p * (s2 - 1) + i] = 1;
  for (let i = 0; i < ne; i += 1) for (let j = 0; j < D; j += 1) M[oe + i][j] = eMap[i][j];
  for (let q = 0; q < m; q += 1) for (let j = 0; j < D; j += 1) M[ou + q][j] = uMap[q][j];
  for (let s2 = 1; s2 <= N; s2 += 1) for (let q = 0; q < m; q += 1) M[ou + m * s2 + q][ou + m * (s2 - 1) + q] = 1;
  return M;
}

/** The least damping ratio of a discrete closed loop at `step` (each eigenvalue z as s = ln z / step), and its frequency, Hz. */
export function leastDamping(values: readonly { re: number; im: number }[], step = CONTROL_STEP): { damping: number; frequency: number; radius: number } {
  let w = { damping: Infinity, frequency: 0, radius: 0 };
  for (const z of values) {
    const radius = Math.hypot(z.re, z.im);
    if (radius < 1e-9) continue;
    const re = Math.log(radius) / step;
    const im = Math.atan2(z.im, z.re) / step;
    if (im < 0) continue;
    const size = Math.hypot(re, im);
    const damping = size > 0 ? -re / size : 1;
    if (damping < w.damping) w = { damping, frequency: im / (2 * Math.PI), radius };
  }
  return w;
}

/**
 * Step 3.2e (the advisor's ruling 29i): the controller above, run in the game (`AttachedRider` under `rider: 'new'`).
 * The design's table (4–12 m/s every 0.5, the three stances) is made lazily, once per page, and read between its points
 * as 3.2d's `between` read it: the four nearest designs blended. Each tick (CONTROL_STEP of simulated time, the commands
 * held between) it does what `closedLoop` and 3.2d's time runs do:
 * - the senses (this file's order and signs: the body's bank and its rate, the head's yaw rate, the twist and its rate,
 *   the ankle's angle and rate) go into a line and come out `steps` ticks later;
 * - the filter updates the estimate of the state as it was then (and the commands' bias);
 * - the predictor runs the internal model over the delay with the commands already sent, to now;
 * - the command is the reference's plus the LQR gains on the error, less the bias: u = u_ref − K (x̂ − x_ref) − b̂.
 * The reference is the plant's own steady turn for the lean asked for (and the twist asked for), from the same blended
 * model: (Φ − I) x + Γ u = 0 with the bank and the twist set, the rates nothing. The commands are clamped to what the
 * body can give (the ankle's reach, the twist's torque), and the predictor is fed what was sent.
 */
export const SCHEDULE_SPEEDS = Array.from({ length: 17 }, (_, i) => 4 + 0.5 * i);
export const SCHEDULE_DEPTHS = [0, 0.195, 0.3];
const designCache = new Map<string, Design>();
/** The design at a table point (cached for the page; the default weights unless given). */
export function scheduledDesign(speed: number, depth: number, weights?: DesignWeights): Design {
  const key = `${speed}|${depth}|${weights ? JSON.stringify(weights) : ''}`;
  let d = designCache.get(key);
  if (!d) {
    const { y, t } = plantAt(speed, depth);
    d = design(y, t, weights ?? DEFAULT_WEIGHTS);
    designCache.set(key, d);
  }
  return d;
}

/** Solves the small dense system a x = b in place (Gaussian elimination with partial pivoting); returns x. */
function solveSmall(a: number[][], b: number[]): number[] {
  const n = b.length;
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (p !== c) { const t = a[p]; a[p] = a[c]; a[c] = t; const u = b[p]; b[p] = b[c]; b[c] = u; }
    const piv = a[c][c];
    if (Math.abs(piv) < 1e-14) continue;
    for (let r = c + 1; r < n; r += 1) {
      const f = a[r][c] / piv;
      if (f === 0) continue;
      for (let k = c; k < n; k += 1) a[r][k] -= f * a[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r -= 1) {
    let s = b[r];
    for (let k = r + 1; k < n; k += 1) s -= a[r][k] * x[k];
    x[r] = Math.abs(a[r][r]) < 1e-14 ? 0 : s / a[r][r];
  }
  return x;
}

/**
 * The steady state of a discrete model (Φ, Γ) with the bank (x[2]) and the twist (x[6]) set and the rates φ̇, θ̇
 * nothing: (Φ − I) x + Γ u = 0 solved for the rest of x and u, by least squares (the ten rows are consistent).
 */
export function steadyTurn(phi: Mat, gamma: Mat, bank: number, twist: number): { x: number[]; u: number[] } {
  const free = [0, 4, 5, 7, 8, 9];
  const cols = free.length + N_COMMAND;
  const m = zeros(N_STATE, cols);
  const rhs = new Array<number>(N_STATE).fill(0);
  for (let i = 0; i < N_STATE; i += 1) {
    free.forEach((j, c) => { m[i][c] = phi[i][j] - (i === j ? 1 : 0); });
    for (let q = 0; q < N_COMMAND; q += 1) m[i][free.length + q] = gamma[i][q];
    rhs[i] = -((phi[i][2] - (i === 2 ? 1 : 0)) * bank + (phi[i][6] - (i === 6 ? 1 : 0)) * twist);
  }
  const ata = zeros(cols, cols);
  const atb = new Array<number>(cols).fill(0);
  for (let a = 0; a < cols; a += 1) {
    for (let b = 0; b < cols; b += 1) { let s = 0; for (let i = 0; i < N_STATE; i += 1) s += m[i][a] * m[i][b]; ata[a][b] = s; }
    let s = 0; for (let i = 0; i < N_STATE; i += 1) s += m[i][a] * rhs[i]; atb[a] = s;
  }
  const z = solveSmall(ata, atb);
  const x = new Array<number>(N_STATE).fill(0);
  free.forEach((j, c) => { x[j] = z[c]; });
  x[2] = bank;
  x[6] = twist;
  return { x, u: [z[free.length], z[free.length + 1]] };
}

/** The controller's limits on what it sends: the ankle's rest, rad (± or [least, most]), and the twist's torque, N·m (±). */
export interface ControlLimits { ankle: number | readonly [number, number]; twist: number }

export class PredictiveController {
  private readonly weights?: DesignWeights;
  /** The senses' line (newest last) and the commands sent (newest last), at most steps + 1 of each. */
  private readonly senses: number[][] = [];
  private readonly commands: number[][] = [];
  /** The estimate of the state `steps` ticks ago (and the bias). */
  private estimate: number[] = [];
  /** The blended design (scratch, refilled each tick). */
  private blendedDesign?: Design;
  /** The latest prediction of the state now, the reference and the command sent (this file's signs; for probes). */
  readonly predicted = new Array<number>(N_STATE).fill(0);
  readonly reference = { x: new Array<number>(N_STATE).fill(0), u: [0, 0] };
  readonly sent = [0, 0];
  /** The command before the clamps (the hip takes what the ankle cannot). */
  readonly raw = [0, 0];
  /** The estimated bias on each command (rad, N·m). */
  readonly bias = [0, 0];
  /** Ticks run since the reset. */
  ticks = 0;

  /** The reference's steady turn: the linear model's for the lean asked ('linear', ruling 29i), or the turn that balances it ('tan'; probes only). */
  private readonly turn: 'linear' | 'tan';

  constructor(weights?: DesignWeights, turn: 'linear' | 'tan' = 'linear') {
    this.weights = weights;
    this.turn = turn;
  }

  reset(): void {
    this.senses.length = 0;
    this.commands.length = 0;
    this.estimate = [];
    this.ticks = 0;
    this.sent[0] = 0; this.sent[1] = 0;
    this.raw[0] = 0; this.raw[1] = 0;
    this.bias[0] = 0; this.bias[1] = 0;
  }

  /** The four nearest designs blended at a speed and depth (clamped to the table). */
  private blend(speed: number, depth: number): Design {
    const v = Math.max(SCHEDULE_SPEEDS[0], Math.min(SCHEDULE_SPEEDS[SCHEDULE_SPEEDS.length - 1], speed));
    const v0 = Math.min(SCHEDULE_SPEEDS[SCHEDULE_SPEEDS.length - 2], Math.floor(v * 2) / 2);
    const fv = (v - v0) / 0.5;
    const dp = Math.max(0, Math.min(SCHEDULE_DEPTHS[2], depth));
    const i0 = dp <= SCHEDULE_DEPTHS[1] ? SCHEDULE_DEPTHS[0] : SCHEDULE_DEPTHS[1];
    const i1 = dp <= SCHEDULE_DEPTHS[1] ? SCHEDULE_DEPTHS[1] : SCHEDULE_DEPTHS[2];
    const fd = (dp - i0) / (i1 - i0);
    const ds = [scheduledDesign(v0, i0, this.weights), scheduledDesign(v0 + 0.5, i0, this.weights), scheduledDesign(v0, i1, this.weights), scheduledDesign(v0 + 0.5, i1, this.weights)];
    const ws = [(1 - fv) * (1 - fd), fv * (1 - fd), (1 - fv) * fd, fv * fd];
    const first = ds[0];
    let out = this.blendedDesign;
    if (!out) {
      const copy = (m: Mat) => m.map((row) => row.slice());
      out = { ...first, phi: copy(first.phi), gamma: copy(first.gamma), k: copy(first.k), phiE: copy(first.phiE), gammaE: copy(first.gammaE), l: copy(first.l), phiN: copy(first.phiN), pred: first.pred.map(copy) };
      this.blendedDesign = out;
    }
    const mix = (target: Mat, get: (d: Design) => Mat) => {
      for (let i = 0; i < target.length; i += 1) {
        const row = target[i];
        for (let j = 0; j < row.length; j += 1) row[j] = ws[0] * get(ds[0])[i][j] + ws[1] * get(ds[1])[i][j] + ws[2] * get(ds[2])[i][j] + ws[3] * get(ds[3])[i][j];
      }
    };
    mix(out.phi, (d) => d.phi); mix(out.gamma, (d) => d.gamma); mix(out.k, (d) => d.k);
    mix(out.phiE, (d) => d.phiE); mix(out.gammaE, (d) => d.gammaE); mix(out.l, (d) => d.l); mix(out.phiN, (d) => d.phiN);
    for (let j = 0; j < out.pred.length; j += 1) mix(out.pred[j], (d) => d.pred[j]);
    return out;
  }

  /**
   * One tick: `sense` now (this file's order and signs), the board's speed through the water, m/s, the leg's depth, m,
   * and the bank and twist asked for (rad, this file's signs). Returns the commands to hold until the next tick
   * [the ankle's rest, rad; the twist's torque, N·m], clamped to `limits`.
   */
  tick(sense: readonly number[], speed: number, depth: number, bankAsked: number, twistAsked: number, limits: ControlLimits): readonly number[] {
    const d = this.blend(speed, depth);
    const n = N_STATE;
    const N = d.steps;
    const ne = d.phiE.length;
    if (this.estimate.length !== ne) this.estimate = new Array<number>(ne).fill(0);
    this.senses.push(sense.slice());
    if (this.senses.length > N + 1) this.senses.shift();
    const e = this.estimate;
    if (this.senses.length > N) {
      const yk = this.senses[this.senses.length - 1 - N];
      const old = this.commands.length > N ? this.commands[this.commands.length - 1 - N] : [0, 0];
      const pred = new Array<number>(ne);
      for (let i = 0; i < ne; i += 1) {
        let s = d.gammaE[i][0] * old[0] + d.gammaE[i][1] * old[1];
        const row = d.phiE[i];
        for (let j = 0; j < ne; j += 1) s += row[j] * e[j];
        pred[i] = s;
      }
      const innov = new Array<number>(N_SENSE);
      for (let i = 0; i < N_SENSE; i += 1) {
        let s = yk[i];
        const row = d.cE[i];
        for (let j = 0; j < ne; j += 1) s -= row[j] * pred[j];
        innov[i] = s;
      }
      for (let i = 0; i < ne; i += 1) {
        let s = pred[i];
        const row = d.l[i];
        for (let j = 0; j < N_SENSE; j += 1) s += row[j] * innov[j];
        e[i] = s;
      }
    }
    const b0 = d.bias ? e[n] : 0;
    const b1 = d.bias ? e[n + 1] : 0;
    const xh = this.predicted;
    for (let i = 0; i < n; i += 1) {
      let s = 0;
      const row = d.phiN[i];
      for (let j = 0; j < n; j += 1) s += row[j] * e[j];
      xh[i] = s;
    }
    for (let jj = 0; jj < N; jj += 1) {
      const back = N - jj;
      const uc = this.commands.length >= back ? this.commands[this.commands.length - back] : [0, 0];
      const p = d.pred[jj];
      for (let i = 0; i < n; i += 1) xh[i] += p[i][0] * (uc[0] + b0) + p[i][1] * (uc[1] + b1);
    }
    let ref = steadyTurn(d.phi, d.gamma, bankAsked, twistAsked);
    if (this.turn === 'tan' && Math.abs(bankAsked) > 1e-6) {
      // The turn that balances the lean asked (the linear model's bank is the lean's tangent in the body's balance), its
      // angles (the board's roll, the bank, the ankle's rest) brought back to the lean asked.
      const t = steadyTurn(d.phi, d.gamma, Math.tan(bankAsked), twistAsked);
      const f = bankAsked / Math.tan(bankAsked);
      ref = { x: t.x.map((v, i) => (i === 0 || i === 2 || i === 8 ? v * f : v)), u: [t.u[0] * f, t.u[1]] };
    }
    for (let i = 0; i < n; i += 1) this.reference.x[i] = ref.x[i];
    this.reference.u[0] = ref.u[0]; this.reference.u[1] = ref.u[1];
    const u = [0, 0];
    for (let q = 0; q < N_COMMAND; q += 1) {
      let s = ref.u[q] - (q === 0 ? b0 : b1);
      const row = d.k[q];
      for (let j = 0; j < n; j += 1) s -= row[j] * (xh[j] - ref.x[j]);
      u[q] = s;
    }
    this.raw[0] = u[0]; this.raw[1] = u[1];
    const [least, most] = typeof limits.ankle === 'number' ? [-limits.ankle, limits.ankle] : limits.ankle;
    u[0] = Math.max(least, Math.min(most, u[0]));
    u[1] = Math.max(-limits.twist, Math.min(limits.twist, u[1]));
    this.commands.push(u);
    if (this.commands.length > N + 1) this.commands.shift();
    this.sent[0] = u[0]; this.sent[1] = u[1];
    this.bias[0] = b0; this.bias[1] = b1;
    this.ticks += 1;
    return this.sent;
  }
}
