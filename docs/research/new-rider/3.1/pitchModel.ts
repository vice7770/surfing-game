// The new surfer, step 3.1b (the advisor's ruling 29a): a linear model of the standing body's pitch on the board, to
// choose the active pitch ankle's gains before they go into the solve, as `src/physics/rollModel.ts` did for the bank.
// Linearised about a steady glide whose felt gravity is n g (the load factor), along the board, in the felt frame:
//
// - the body, a point mass m at the leg's length L over the feet; its lean off the felt vertical ψ = r / L, where r is
//   its centre of mass ahead of the feet. Gravity tips it: the force along the board on it is n m g ψ − τ / L;
// - the board, mass m_b, takes the opposite, and the water's drag on its speed, c_w (the light board's own drag);
// - the board's pitch ψ_b (its deck normal's lean, forward +) on the hull: I_b ψ̈_b = τ − K_h ψ_b − C_h ψ̇_b (the
//   ankle's torque moves the feet's pressure, which pitches the board);
// - the passive ankle, acting at once: τ = k (ψ − ψ_b − δ) + c (ψ̇ − ψ̇_b);
// - the felt vertical the reference reads: the feet's acceleration, low-passed twice (SPECIFIC_FORCE_TIME, then
//   PITCH_REFERENCE_TIME): ψ_sf = a_board / (n g) (a board speeding up tilts the felt "up" forward);
// - the balance's command, from the body's own lean and its rate, and the reference: δ_cmd = (ψ_ref − ψ_b) + G (ψ_ref − ψ)
//   − G_r ψ̇; it arrives after the delay (a Padé approximant here, exact in `simulate`) and the motor lag: δ̇ = (δ_cmd(t − d) − δ) / T_m.
//
// State: [r, ṙ, v_board, ψ_b, ψ̇_b, ref1, ref2, δ, pade…].
import { eigenvalues } from '../../../../src/physics/rollModel';

export interface PitchParams {
  /** The rider's mass, kg, its leg's length, m, the board's mass, kg, the load factor (felt gravity over g). */
  mass: number;
  length: number;
  boardMass: number;
  load: number;
  /** The water's drag on the board's speed along it, N·s/m (d drag / d v). */
  drag: number;
  /** The board's pitch inertia, kg·m², and the hull's pitch stiffness, N·m/rad, and damping, N·m·s/rad. */
  boardInertia: number;
  hullStiffness: number;
  hullDamping: number;
  /** The passive ankle: N·m/rad and N·m·s/rad. */
  ankleStiffness: number;
  ankleDamping: number;
  /** The reference's two low-passes, the delay and the motor lag, s. */
  feltTime: number;
  referenceTime: number;
  delay: number;
  motorLag: number;
  /** Diagnostics: the reference's share of the felt force (1 as built, 0 the face's normal alone), and of the deck's pitch in the command's feed-forward (1 as built). */
  felt?: number;
  deck?: number;
  /** The felt vertical's source: the board's acceleration ('board', 3.1's), or the body's own push through the feet ('body': the line from the centre of pressure to the centre of mass, ψ − τ / (n m g L)). */
  source?: 'board' | 'body';
}

export interface PitchGains {
  /** δ per rad of the lean's error off the reference, and per rad/s of lean rate (s). */
  lean: number;
  rate: number;
}

const G = 9.81;
const STATES = 8;

/** e^{−s d} ≈ N(s) / D(s), Padé (n, n): the controllable canonical form (A, B, C, D). */
function pade(order: number, delay: number): { a: number[][]; b: number[]; c: number[]; d: number } {
  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
  const coef = (k: number) => (fact(2 * order - k) * fact(order)) / (fact(2 * order) * fact(k) * fact(order - k));
  // D(s) = Σ c_k d^k s^k, N(s) = Σ c_k (−d)^k s^k.
  const den = Array.from({ length: order + 1 }, (_, k) => coef(k) * delay ** k);
  const num = Array.from({ length: order + 1 }, (_, k) => coef(k) * (-delay) ** k);
  const lead = den[order];
  const d = num[order] / lead;
  const a = Array.from({ length: order }, (_, i) => Array.from({ length: order }, (_, j) => (i < order - 1 ? (j === i + 1 ? 1 : 0) : -den[j] / lead)));
  const b = Array.from({ length: order }, (_, i) => (i === order - 1 ? 1 : 0));
  const c = Array.from({ length: order }, (_, k) => (num[k] - d * den[k]) / lead);
  return { a, b, c, d };
}

/** The ankle's torque as a row on the state, and the board's acceleration row (τ's and gravity's push, the drag). */
function rows(p: PitchParams, n: number): { torque: number[]; boardAccel: number[]; bodyAccel: number[] } {
  const torque = new Array<number>(n).fill(0);
  torque[0] = p.ankleStiffness / p.length;
  torque[1] = p.ankleDamping / p.length;
  torque[3] = -p.ankleStiffness;
  torque[4] = -p.ankleDamping;
  torque[7] = -p.ankleStiffness;
  // Force along the board on the body: n m g r / L − τ / L.
  const force = torque.map((v) => -v / p.length);
  force[0] += (p.load * p.mass * G) / p.length;
  const bodyAccel = force.map((v) => v / p.mass);
  const boardAccel = force.map((v) => -v / p.boardMass);
  boardAccel[2] -= p.drag / p.boardMass;
  return { torque, boardAccel, bodyAccel };
}

/** The closed loop ẋ = M x with the Padé delay of `order`. */
export function closedLoop(p: PitchParams, g: PitchGains, order = 5): number[][] {
  const pd = pade(order, p.delay);
  const n = STATES + order;
  const { torque, boardAccel, bodyAccel } = rows(p, n);
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  m[0][1] = 1;
  for (let j = 0; j < n; j += 1) m[1][j] = bodyAccel[j] - boardAccel[j];
  for (let j = 0; j < n; j += 1) m[2][j] = boardAccel[j];
  m[3][4] = 1;
  for (let j = 0; j < n; j += 1) m[4][j] = torque[j] / p.boardInertia;
  m[4][3] -= p.hullStiffness / p.boardInertia;
  m[4][4] -= p.hullDamping / p.boardInertia;
  // The felt vertical, low-passed twice.
  for (let j = 0; j < n; j += 1) {
    const sensed = p.source === 'body' ? (j === 0 ? 1 / p.length : 0) - torque[j] / (p.load * p.mass * G * p.length) : boardAccel[j] / (p.load * G);
    m[5][j] = ((p.felt ?? 1) * sensed) / p.feltTime;
  }
  m[5][5] -= 1 / p.feltTime;
  m[6][5] = 1 / p.referenceTime;
  m[6][6] = -1 / p.referenceTime;
  // The command u = (ref − ψ_b) + G (ref − r/L) − G_r ṙ/L, through the delay, then the motor lag.
  const u = new Array<number>(n).fill(0);
  u[6] = 1 + g.lean;
  u[3] = -(p.deck ?? 1);
  u[0] = -g.lean / p.length;
  u[1] = -g.rate / p.length;
  for (let i = 0; i < order; i += 1) {
    for (let k = 0; k < order; k += 1) m[STATES + i][STATES + k] = pd.a[i][k];
    for (let j = 0; j < n; j += 1) m[STATES + i][j] += pd.b[i] * u[j];
  }
  for (let j = 0; j < n; j += 1) m[7][j] = (pd.d * u[j]) / p.motorLag;
  for (let k = 0; k < order; k += 1) m[7][STATES + k] += pd.c[k] / p.motorLag;
  m[7][7] -= 1 / p.motorLag;
  return m;
}

/** The least damping ratio of the loop's modes and that mode's frequency, Hz (a negative ratio grows). */
export function leastDamped(p: PitchParams, g: PitchGains): { damping: number; frequency: number } {
  let damping = Infinity;
  let frequency = 0;
  for (const v of eigenvalues(closedLoop(p, g))) {
    const size = Math.hypot(v.re, v.im);
    const ratio = size > 0 ? -v.re / size : 1;
    if (ratio < damping) { damping = ratio; frequency = Math.abs(v.im) / (2 * Math.PI); }
  }
  return { damping, frequency };
}

/**
 * The same loop in time with the delay exact (a buffer at `h`): the body leaned `kick` rad at rest, for `seconds`.
 * Returns the lean's largest size after `settle` s over its first, and its log-decrement damping ratio.
 */
export function simulate(p: PitchParams, g: PitchGains, kick = 0.05, seconds = 8, h = 1 / 1920): { growth: number; damping: number } {
  const n = STATES;
  const { torque, boardAccel, bodyAccel } = rows(p, n);
  const x = new Array<number>(n).fill(0);
  x[0] = kick * p.length;
  const buffer: number[] = [];
  const lag = Math.max(1, Math.round(p.delay / h));
  const dot = (row: number[]) => row.reduce((s, v, j) => s + v * x[j], 0);
  const leans: number[] = [];
  for (let i = 0; i < Math.round(seconds / h); i += 1) {
    const u = (1 + g.lean) * x[6] - (p.deck ?? 1) * x[3] - (g.lean * x[0]) / p.length - (g.rate * x[1]) / p.length;
    buffer.push(u);
    const delayed = buffer.length > lag ? buffer.shift()! : buffer[0];
    const a = dot(bodyAccel) - dot(boardAccel);
    const ab = dot(boardAccel);
    const dx = [x[1], a, ab, x[4], (dot(torque) - p.hullStiffness * x[3] - p.hullDamping * x[4]) / p.boardInertia,
      (((p.felt ?? 1) * (p.source === 'body' ? x[0] / p.length - dot(torque) / (p.load * p.mass * G * p.length) : ab / (p.load * G))) - x[5]) / p.feltTime, (x[5] - x[6]) / p.referenceTime, (delayed - x[7]) / p.motorLag];
    for (let k = 0; k < n; k += 1) x[k] += h * dx[k];
    if (i % 16 === 0) leans.push(x[0] / p.length);
  }
  const step = 16 * h;
  const first = Math.max(...leans.slice(0, Math.round(1 / step)).map(Math.abs));
  const late = Math.max(...leans.slice(Math.round((seconds - 2) / step)).map(Math.abs));
  // Successive peaks of |lean| for a log decrement.
  const peaks: number[] = [];
  for (let i = 1; i < leans.length - 1; i += 1) if (Math.abs(leans[i]) > Math.abs(leans[i - 1]) && Math.abs(leans[i]) >= Math.abs(leans[i + 1]) && Math.abs(leans[i]) > 1e-9) peaks.push(Math.abs(leans[i]));
  let damping = Number.NaN;
  if (peaks.length >= 3) {
    // |lean| peaks every half period: two of them make one period.
    const decrement = Math.log(peaks[0] / peaks[2]);
    damping = decrement / Math.sqrt(4 * Math.PI * Math.PI + decrement * decrement);
  }
  return { growth: late / first, damping };
}
