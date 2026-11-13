/**
 * A linear model of the board's roll and a standing rider's bank (turn
 * redesign, Task 2), to choose the ankle's stiffness and damping and the
 * balance's gains before they go into the solve. Linearised about riding
 * straight, with x = [φ, φ̇, θ, θ̇, a]: the board's roll, the body's bank (both
 * rad, positive toward the same rail) and the turn's pull a = a_lat / g.
 *
 * - The board: I_b φ̈ = −K_h (φ − θ) − C_h φ̇ + τ. The hull rights the board
 *   toward the line the rider loads it along, so a board rolled as far as the
 *   body leans carries it without a moment (a coordinated turn).
 * - The body, an inverted pendulum on the feet: m h² θ̈ = m g h (θ − a) − τ.
 *   Gravity topples it, and the turn's pull holds it up once the turn matches.
 * - The turn builds behind the rail: ȧ = (φ − a) / T.
 * - The ankle and knee: τ = k (θ − φ − δ) + c (θ̇ − φ̇). They reach the board as
 *   the centre of pressure across the feet, τ / N, so |τ| is capped near
 *   0.13 m of the load.
 * - The balance, full-state feedback: δ = −(K · x) + K_ref θ_ref. A capture-point
 *   law on the bank alone topples the rider: the pull builds behind the rail,
 *   and a body banking ahead of it falls inward (`captureGains`).
 */
export interface RollParams {
  /** The board's roll inertia, kg·m². */
  boardInertia: number;
  /** The hull's roll stiffness about the load line, N·m/rad, and damping, N·m·s/rad. */
  hullStiffness: number;
  hullDamping: number;
  /** The rider's mass, kg, and its centre of mass's height over the feet, m. */
  mass: number;
  height: number;
  /** The ankle and knee in roll: N·m/rad and N·m·s/rad. */
  ankleStiffness: number;
  ankleDamping: number;
  /** How long the turn's pull takes to follow the rail, s. */
  turnLag: number;
}

/** The balance's gains on [φ, φ̇, θ, θ̇, a] (rad of δ per unit), and on the steer's reference bank. */
export interface RollGains {
  roll: number;
  rollRate: number;
  bank: number;
  bankRate: number;
  pull: number;
  reference: number;
}

const GRAVITY = 9.81;

/** The model without the balance (δ = 0): ẋ = A x. */
export function plantMatrix(p: RollParams): number[][] {
  const inertia = p.mass * p.height * p.height;
  const topple = p.mass * GRAVITY * p.height;
  const k = p.ankleStiffness;
  const c = p.ankleDamping;
  const ib = p.boardInertia;
  return [
    [0, 1, 0, 0, 0],
    [-(p.hullStiffness + k) / ib, -(p.hullDamping + c) / ib, (p.hullStiffness + k) / ib, c / ib, 0],
    [0, 0, 0, 1, 0],
    [k / inertia, c / inertia, (topple - k) / inertia, -c / inertia, -topple / inertia],
    [1 / p.turnLag, 0, 0, 0, -1 / p.turnLag],
  ];
}

/** How δ enters: τ gains −k δ, which rolls the board back and the body forward. */
export function ankleColumn(p: RollParams): number[] {
  return [0, -p.ankleStiffness / p.boardInertia, 0, p.ankleStiffness / (p.mass * p.height * p.height), 0];
}

const gainVector = (g: RollGains) => [g.roll, g.rollRate, g.bank, g.bankRate, g.pull];

/** With the balance on: ẋ = (A − B K) x + B K_ref θ_ref. */
export function closedLoopMatrix(p: RollParams, gains: RollGains): number[][] {
  const a = plantMatrix(p);
  const b = ankleColumn(p);
  const k = gainVector(gains);
  return a.map((row, i) => row.map((v, j) => v - b[i] * k[j]));
}

/** The plan's first balance: δ = −G (θ − θ_ref) − (G / r) θ̇. */
export function captureGains(gain: number, rate: number): RollGains {
  return { roll: 0, rollRate: 0, bank: gain, bankRate: gain / rate, pull: 0, reference: gain };
}

/** The slowest decay rate (1/s; negative if a mode grows) and the least damping ratio of a set of eigenvalues. */
export function modes(values: readonly { re: number; im: number }[]): { slowest: number; leastDamping: number } {
  let slowest = Infinity;
  let leastDamping = Infinity;
  for (const v of values) {
    slowest = Math.min(slowest, -v.re);
    const size = Math.hypot(v.re, v.im);
    leastDamping = Math.min(leastDamping, size > 0 ? -v.re / size : 1);
  }
  return { slowest, leastDamping };
}

/**
 * The response to a reference bank ramped to `command` over `ramp` s: where the
 * rail and the bank end after `seconds`, when the rail first reaches 90 % of the
 * command, and the ankle torque's largest size, N·m (explicit Euler at 1 ms).
 */
export function stepResponse(p: RollParams, gains: RollGains, command: number, ramp: number, seconds: number) {
  const a = closedLoopMatrix(p, gains);
  const b = ankleColumn(p);
  const k = gainVector(gains);
  let x = [0, 0, 0, 0, 0];
  let rise = Infinity;
  let peakTorque = 0;
  const h = 1e-3;
  for (let t = 0; t < seconds; t += h) {
    const reference = command * Math.min(1, t / ramp);
    const delta = -k.reduce((s, v, j) => s + v * x[j], 0) + gains.reference * reference;
    peakTorque = Math.max(peakTorque, Math.abs(p.ankleStiffness * (x[2] - x[0] - delta) + p.ankleDamping * (x[3] - x[1])));
    const dx = a.map((row, i) => row.reduce((s, v, j) => s + v * x[j], 0) + b[i] * gains.reference * reference);
    x = x.map((v, i) => v + h * dx[i]);
    if (rise === Infinity && Math.abs(x[0]) >= 0.9 * Math.abs(command)) rise = t;
  }
  return { rail: x[0], bank: x[2], rise, peakTorque };
}

/**
 * The reference gain that puts the steady rail on the command: the steady state
 * of the balanced model for a unit of reference, solved by Gaussian elimination.
 */
export function referenceGain(p: RollParams, gains: Omit<RollGains, 'reference'>): number {
  const a = closedLoopMatrix(p, { ...gains, reference: 0 });
  const b = ankleColumn(p);
  const n = a.length;
  const m = a.map((row, i) => [...row, -b[i]]);
  for (let c = 0; c < n; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let j = c; j <= n; j += 1) m[r][j] -= f * m[c][j];
    }
  }
  return 1 / (m[0][n] / m[0][0]);
}

/**
 * The design (turn redesign, Task 2): the carve lab's hull at 7 m/s (roll
 * stiffness ~100 N·m/rad from a prone rider's kick; its damping taken as 5,
 * the kick's own reading being slightly negative with the paddler's reflex in
 * it), a 75 kg rider 1 m over its feet, a 0.3 s turn lag (provisional), and an
 * ankle and knee of 800 N·m/rad and 80 N·m·s/rad. The gains came from a search
 * for the quickest slowest mode with every mode damped at least 0.4 and the
 * ankle torque under 150 N·m on a 40° rail ramped in over 0.5 s: slowest
 * 8.4/s, damping 0.95, 40° in 0.54 s at 95 N·m. The reference gain comes from
 * the steady state (`referenceGain`), since the steady rail is sensitive to the
 * other gains.
 *
 * It did not carry into the solve (Task 3's findings): its roll and pull
 * feedbacks fed the board's 3–5 Hz roll–yaw mode, which this model leaves out,
 * and the carve lab's plant then showed a planing hull far stiffer than the
 * prone kick's (850–1,700 N·m/rad about the rider's load line) with a turn
 * that follows the rail within 0.03 s. The rider keeps the ankle's k and c and
 * the reference rule, and balances on its bank alone within `bankAuthority`.
 */
const DESIGN_PARAMS: RollParams = {
  boardInertia: 0.03, hullStiffness: 100, hullDamping: 5, mass: 75, height: 1,
  ankleStiffness: 800, ankleDamping: 80, turnLag: 0.3,
};
const DESIGN_FEEDBACK = { roll: 0.715, rollRate: 0.09, bank: 2.797, bankRate: 0.944, pull: -1.123 };
export const ROLL_DESIGN: { params: RollParams; gains: RollGains } = {
  params: DESIGN_PARAMS,
  gains: { ...DESIGN_FEEDBACK, reference: referenceGain(DESIGN_PARAMS, DESIGN_FEEDBACK) },
};

/**
 * What the feet can do to the body's bank on the carve lab's plant (turn
 * redesign, Task 3b). The planing board rights about the rider's load line with
 * `hullStiffness`, N·m/rad, so the ankle's rest δ reaches the body through the
 * ankle and the hull in series (`series`, N·m/rad) and rolls the board against
 * the body by `share` of itself, which the turn follows within about 0.03 s.
 * Then the body's bank answers the rest like a double integrator. `restRange`
 * is the rest, rad, at which the feet's pressure reaches their edges
 * (`footReach`, m, out from the middle, under one body weight), and
 * `acceleration` the body's bank acceleration there, rad/s².
 */
export function bankAuthority(p: { mass: number; height: number; ankleStiffness: number; hullStiffness: number; footReach: number }) {
  const k = p.ankleStiffness;
  const series = (k * p.hullStiffness) / (k + p.hullStiffness);
  const share = k / (k + p.hullStiffness);
  const weight = p.mass * GRAVITY;
  const restRange = (p.footReach * weight) / series;
  const acceleration = ((weight * p.height * share + series) * restRange) / (p.mass * p.height * p.height);
  return { series, share, restRange, acceleration };
}

/** The steady carve for a turn pulling aLat, m/s²: the body banks to where gravity and the pull balance, and the rail with it. */
export function steadyCarve(aLat: number): { bank: number; rail: number } {
  const bank = Math.atan2(aLat, GRAVITY);
  return { bank, rail: bank };
}

/**
 * The new surfer, step 3.2 (the advisor's ruling 29, item 5; docs/research/new-rider/3.2): the roll model with a human
 * balance. The plant is `plantMatrix`'s with the carve lab's numbers (the hull rights the board about the rider's load
 * line, 850–1,700 N·m/rad; the rail settles in about 0.05 s; the turn's pull follows the rail within 0.03–0.04 s, at
 * `turnGain` times the rail, 1.3–1.6 measured: `carve-lab.md`, "The plant"), and the felt gravity `load` times g (a
 * carve's). The balance is a human's:
 * - it reads only the body's own bank and bank rate (the vestibular sense; the don't-retry list: never the board's
 *   roll or the felt force);
 * - what it reads arrives `delay` s late (leg postural responses start at about 90–100 ms; Nashner 1977), and the
 *   muscles follow the command through a first-order `motorLag`;
 * - the player's lean asked for (`reference`) is not sensed, so it is not delayed, only lagged.
 * So δ̇ = (K_ref θ_ref + u(t − d) − δ) / T_m, u = −G θ − G_r θ̇. The passive ankle, τ = k (θ − φ − δ) + c (θ̇ − φ̇),
 * acts at once. The delay is a Padé approximant of `order` here; `humanRollKick` checks it with the delay exact.
 *
 * State: [φ, φ̇, θ, θ̇, a, δ, ι, padé…], ι the integral's own state (ι̇ = −K_i θ, inside the command before the delay).
 */
export interface HumanRoll {
  /** The sensing delay and the motor lag, s. */
  delay: number;
  motorLag: number;
  /** The felt gravity over g (1 riding straight). */
  load?: number;
  /** The turn's pull per rad of rail (1 in `plantMatrix`; the carve lab measured 1.3–1.6 planing). */
  turnGain?: number;
}

/**
 * The human balance's gains: rad of ankle rest per rad of the body's bank off the reference, per rad/s of its rate
 * (s), and per rad·s of the bank's error integrated (1/s; the slow trim that finds the rest a steady carve needs).
 */
export interface HumanRollGains {
  bank: number;
  bankRate: number;
  integral?: number;
  /** Step 3.2c's model only: rad of ankle rest per rad/s of the head's yaw rate (the canals), in `humanTwistLoop`. */
  yawRate?: number;
}

/** e^{−s d} ≈ N(s) / D(s), Padé (n, n), in controllable canonical form (A, B, C, D). */
export function padeDelay(order: number, delay: number): { a: number[][]; b: number[]; c: number[]; d: number } {
  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
  const coef = (k: number) => (fact(2 * order - k) * fact(order)) / (fact(2 * order) * fact(k) * fact(order - k));
  const den = Array.from({ length: order + 1 }, (_, k) => coef(k) * delay ** k);
  const num = Array.from({ length: order + 1 }, (_, k) => coef(k) * (-delay) ** k);
  const lead = den[order];
  const d = num[order] / lead;
  const a = Array.from({ length: order }, (_, i) => Array.from({ length: order }, (_, j) => (i < order - 1 ? (j === i + 1 ? 1 : 0) : -den[j] / lead)));
  const b = Array.from({ length: order }, (_, i) => (i === order - 1 ? 1 : 0));
  const c = Array.from({ length: order }, (_, k) => (num[k] - d * den[k]) / lead);
  return { a, b, c, d };
}

/** The plant's rows with the rest δ as a sixth state: the ankle's torque row, and ẋ for the first five states. */
function humanPlant(p: RollParams, h: HumanRoll, n: number): { torque: number[]; rows: number[][] } {
  const k = p.ankleStiffness;
  const c = p.ankleDamping;
  const ib = p.boardInertia;
  const inertia = p.mass * p.height * p.height;
  const topple = (h.load ?? 1) * p.mass * GRAVITY * p.height;
  const gain = h.turnGain ?? 1;
  const torque = new Array<number>(n).fill(0);
  torque[0] = -k;
  torque[1] = -c;
  torque[2] = k;
  torque[3] = c;
  torque[5] = -k;
  const rows = Array.from({ length: 5 }, () => new Array<number>(n).fill(0));
  rows[0][1] = 1;
  for (let j = 0; j < n; j += 1) rows[1][j] = torque[j] / ib;
  rows[1][0] -= p.hullStiffness / ib;
  rows[1][2] += p.hullStiffness / ib;
  rows[1][1] -= p.hullDamping / ib;
  rows[2][3] = 1;
  for (let j = 0; j < n; j += 1) rows[3][j] = -torque[j] / inertia;
  rows[3][2] += topple / inertia;
  rows[3][4] -= topple / inertia;
  rows[4][0] = gain / p.turnLag;
  rows[4][4] = -1 / p.turnLag;
  return { torque, rows };
}

/** The closed loop with the human balance: ẋ = M x (the reference held at nothing). */
export function humanRollLoop(p: RollParams, h: HumanRoll, g: HumanRollGains, order = 5): number[][] {
  const pd = padeDelay(order, h.delay);
  const n = 7 + order;
  const { rows } = humanPlant(p, h, n);
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < 5; i += 1) m[i] = rows[i];
  const u = new Array<number>(n).fill(0);
  u[2] = -g.bank;
  u[3] = -g.bankRate;
  u[6] = 1;
  m[6][2] = -(g.integral ?? 0);
  for (let i = 0; i < order; i += 1) {
    for (let k = 0; k < order; k += 1) m[7 + i][7 + k] = pd.a[i][k];
    for (let j = 0; j < n; j += 1) m[7 + i][j] += pd.b[i] * u[j];
  }
  for (let j = 0; j < n; j += 1) m[5][j] = (pd.d * u[j]) / h.motorLag;
  for (let k = 0; k < order; k += 1) m[5][7 + k] += pd.c[k] / h.motorLag;
  m[5][5] -= 1 / h.motorLag;
  return m;
}

/** Every mode of the human loop: its frequency, Hz, and damping ratio (a negative ratio grows), slowest-damped first. */
export function humanRollModes(p: RollParams, h: HumanRoll, g: HumanRollGains): { frequency: number; damping: number }[] {
  return eigenvalues(humanRollLoop(p, h, g))
    // The integral's own pole at the origin when it is off (no gain): not a mode of the body.
    .filter((v) => v.im >= 0 && !(g.integral === undefined || g.integral === 0 ? Math.hypot(v.re, v.im) < 1e-9 : false))
    .map((v) => {
      const size = Math.hypot(v.re, v.im);
      return { frequency: Math.abs(v.im) / (2 * Math.PI), damping: size > 0 ? -v.re / size : 1 };
    })
    .sort((a, b) => a.damping - b.damping);
}

/**
 * The human loop in time with the delay exact (a buffer at `step`): the board's roll rate kicked by `kick`, rad/s (the
 * carve lab's `wobble`), for `seconds`. Returns the roll rate's decay per cycle (successive peaks of one sign, their
 * mean ratio over the first three cycles, as the bars probe reads it), the body's largest bank, rad, and whether the
 * bank ends within a tenth of its peak.
 */
export function humanRollKick(p: RollParams, h: HumanRoll, g: HumanRollGains, kick = 0.5, seconds = 3, step = 1 / 1920): { decay: number; peakBank: number; settled: boolean } {
  const n = 6;
  const { rows } = humanPlant(p, h, n);
  const x = new Array<number>(n).fill(0);
  x[1] = kick;
  const buffer: number[] = [];
  const lag = Math.max(1, Math.round(h.delay / step));
  const rates: number[] = [];
  let peakBank = 0;
  let late = 0;
  for (let i = 0; i < Math.round(seconds / step); i += 1) {
    buffer.push(-g.bank * x[2] - g.bankRate * x[3]);
    const delayed = buffer.length > lag ? buffer.shift()! : 0;
    const dx = rows.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
    dx.push((delayed - x[5]) / h.motorLag);
    for (let k = 0; k < n; k += 1) x[k] += step * dx[k];
    if (i % 32 === 0) rates.push(x[1]);
    peakBank = Math.max(peakBank, Math.abs(x[2]));
    if (i * step > seconds - 0.5) late = Math.max(late, Math.abs(x[2]));
  }
  const peaks: number[] = [];
  for (let i = 1; i < rates.length - 1; i += 1) {
    if (Math.abs(rates[i]) >= Math.abs(rates[i - 1]) && Math.abs(rates[i]) > Math.abs(rates[i + 1]) && Math.abs(rates[i]) > 1e-4) peaks.push(rates[i]);
  }
  const ratios: number[] = [];
  for (let i = 0; i + 2 < peaks.length && ratios.length < 3; i += 1) if (Math.sign(peaks[i]) === Math.sign(peaks[i + 2])) ratios.push(Math.abs(peaks[i + 2] / peaks[i]));
  const decay = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
  return { decay, peakBank, settled: late <= 0.1 * Math.max(peakBank, 1e-9) };
}

/**
 * The reference gain K_ref that puts the human loop's steady bank on the lean asked for (the steady state of the plant
 * with δ = K_ref θ_ref − G θ, the delay and lag gone at steady state), by Gaussian elimination as `referenceGain`.
 */
export function humanReferenceGain(p: RollParams, h: HumanRoll, g: HumanRollGains): number {
  const n = 6;
  const { rows } = humanPlant(p, h, n);
  // Unknowns x (6) and the steady δ row: δ − (K θ_ref − G θ) = 0 with θ_ref = 1 and K unknown: solve for x with δ
  // free, then K = δ + G θ at θ = 1, by linearity solve for a unit δ input and scale.
  const a = rows.map((row) => row.slice(0, 5));
  const b = rows.map((row) => -row[5]);
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 5; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < 5; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < 5; r += 1) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let j = c; j <= 5; j += 1) m[r][j] -= f * m[c][j];
    }
  }
  // The steady bank per unit of steady rest; the rest that holds a unit bank is its inverse.
  const bankPerRest = m[2][5] / m[2][2];
  return 1 / bankPerRest + g.bank;
}

/**
 * Step 3.2b (the advisor's ruling 29f; docs/research/new-rider/3.2, Part 2): the human roll loop on the board's own
 * lateral motion (roll, sway and yaw) with the feet's centre-of-pressure steering and the rider's yaw inertia. 3.2's
 * model has no yaw: the turn's pull is a lag behind the rail, and the hull rights the board about the body's load line.
 * The roll-plant diagnosis (docs/research/new-rider/roll-plant) found the over-response in the feet's coupling: the
 * along-board force the feet carry (the hull's drag, carried by the body) acts at their centre of pressure off the
 * stringer and yaws a board whose yaw only its fins resist. Here the board is a body of its own on the water's measured
 * captive derivatives, the body a point mass on its leg over the feet, and the pull is the feet's own acceleration.
 *
 * Axes as an aircraft's (x forward, y right, z down): the board's roll φ and the body's bank θ are + toward the right
 * (the right rail down), the yaw rate r + turns the nose right, the slip β (the board's sway speed over V at its centre
 * of mass) + slides right. Small motions about riding straight at V; the felt gravity g_e = `load` g, the body N = m g_e
 * on its feet. About the board's own centre of mass:
 * - the ankle: τ = k (θ − φ − δ) + c (θ̇ − φ̇); the centre of pressure across y_c = τ / N;
 * - the body's push on the board across, at the feet (a point mass on its leg, the ankle pushing it back): F = −N θ + τ / h;
 * - roll: I_x φ̈ = K_φ φ + K_β β + K_r r + K_p φ̇ + τ + z_d F (the water's roll moment, the feet's load at y_c, the push
 *   at the deck z_d over the centre of mass);
 * - sway: m_b V (β̇ + r) = Y_φ φ + Y_β β + Y_r r + Y_p φ̇ + F;
 * - yaw, the rider's own yaw inertia I_r turning with the board through the planted feet (rigid):
 *   (I_z + I_r) ṙ = N_φ φ + N_β β + N_r r + N_p φ̇ − F_x y_c + x_f F,
 *   F_x the along-board force the feet carry forward, x_f their station from the board's centre of mass (+ forward);
 * - the body, an inverted pendulum on the feet: m h² θ̈ = m g_e h θ − τ − m h a_f, a_f = V (β̇ + r) + x_f ṙ the feet's
 *   lateral acceleration (the turn's pull).
 * The balance as `humanRollLoop`: δ̇ = (u(t − d) − δ) / T_m, u = −G θ − G_r θ̇ + ι, on the body's own bank and rate.
 *
 * State: [φ, φ̇, θ, θ̇, r, β, δ, ι, padé…].
 */
export interface YawPlant {
  /** The board's speed, m/s. */
  speed: number;
  /** The board's roll inertia with the water's, its own yaw inertia and the rider's coupled through the feet (0: 3.2's point mass), kg·m²; its mass, kg. */
  boardRollInertia: number;
  boardYawInertia: number;
  riderYawInertia: number;
  boardMass: number;
  /** The rider: mass, kg; its centre of mass over the feet, m; the ankle across, N·m/rad and N·m·s/rad. */
  mass: number;
  height: number;
  ankleStiffness: number;
  ankleDamping: number;
  /** The water's derivatives about the board's centre of mass, these axes: per rad of roll, the yaw moment, side force and roll moment (N·m, N, N·m). */
  heelYaw: number;
  heelSide: number;
  heelRoll: number;
  /** Per rad of slip. */
  slipYaw: number;
  slipSide: number;
  slipRoll: number;
  /** Per rad/s of yaw rate. */
  yawDamping: number;
  yawSide: number;
  yawRoll: number;
  /** Per rad/s of roll rate. */
  rollRateYaw: number;
  rollRateSide: number;
  rollDamping: number;
  /** The along-board force the feet carry forward, N; their station along from the board's centre of mass, m (+ forward); the deck over the centre of mass, m. */
  feetForward: number;
  feetStation: number;
  deckHeight: number;
  /**
   * A hull cross-flow damping (ruling 29f's reserve lever, unsourced): each metre of the wetted hull from `from` to `to`
   * (m along from the board's centre of mass, + forward) resists its own lateral speed with `c`, N·s/m per m.
   */
  crossFlow?: { c: number; from: number; to: number };
  /** The hip across taking a share of the ankle's lagged rest: τ_h = −`hip` δ, N·m/rad (pushes the body across, no load moment on the board). */
  hip?: number;
}

/**
 * The rows of [φ, φ̇, θ, θ̇, r, β] for `YawPlant` before the balance, as linear functions of the n-state. `yawExtra`, a
 * further yaw moment on the board (N·m, as a row over the n-state: step 3.2c's twist), enters before the feet's
 * acceleration, so the body feels it.
 */
function yawRows(y: YawPlant, load: number, n: number, yawExtra?: readonly number[]): number[][] {
  const g = load * GRAVITY;
  const m = y.mass;
  const hh = y.height;
  const v = y.speed;
  const row = () => new Array<number>(n).fill(0);
  const torque = row();
  torque[0] = -y.ankleStiffness;
  torque[1] = -y.ankleDamping;
  torque[2] = y.ankleStiffness;
  torque[3] = y.ankleDamping;
  torque[6] = -y.ankleStiffness;
  const push = torque.map((t) => t / hh);
  push[2] -= m * g;
  const water = (phi: number, slip: number, yaw: number, rate: number) => {
    const w = row();
    w[0] = phi;
    w[5] = slip;
    w[4] = yaw;
    w[1] = rate;
    return w;
  };
  const flow = y.crossFlow;
  const c1 = flow ? flow.c * (flow.to - flow.from) : 0;
  const c2 = flow ? (flow.c * (flow.to * flow.to - flow.from * flow.from)) / 2 : 0;
  const c3 = flow ? (flow.c * (flow.to ** 3 - flow.from ** 3)) / 3 : 0;
  const yawMoment = water(y.heelYaw, y.slipYaw - c2 * v, y.yawDamping - c3, y.rollRateYaw);
  if (yawExtra) for (let j = 0; j < n; j += 1) yawMoment[j] += yawExtra[j];
  const side = water(y.heelSide, y.slipSide - c1 * v, y.yawSide - c2, y.rollRateSide);
  // The hip's push across (a share of the lagged rest), and the centre of pressure it moves with it.
  const hip = y.hip ?? 0;
  push[6] += -hip / hh;
  const cop = torque.slice();
  cop[6] += -hip;
  const roll = water(y.heelRoll, y.slipRoll, y.yawRoll, y.rollDamping);
  const iz = y.boardYawInertia + y.riderYawInertia;
  const yawAcc = yawMoment.map((w, j) => (w - (y.feetForward * cop[j]) / (m * g) + y.feetStation * push[j]) / iz);
  const slipAcc = side.map((w, j) => (w + push[j]) / (y.boardMass * v));
  slipAcc[4] -= 1;
  const feet = slipAcc.map((s, j) => v * s + y.feetStation * yawAcc[j]);
  feet[4] += v;
  const bankAcc = cop.map((t, j) => (-t - m * hh * feet[j]) / (m * hh * hh));
  bankAcc[2] += g / hh;
  const rollAcc = roll.map((w, j) => (w + torque[j] + y.deckHeight * push[j]) / y.boardRollInertia);
  const rows = [row(), rollAcc, row(), bankAcc, yawAcc, slipAcc];
  rows[0][1] = 1;
  rows[2][3] = 1;
  return rows;
}

/** The closed loop of `YawPlant` with the human balance: ẋ = M x (the reference held at nothing). */
export function humanYawLoop(y: YawPlant, h: HumanRoll, g: HumanRollGains, order = 5): number[][] {
  const pd = padeDelay(order, h.delay);
  const n = 8 + order;
  const rows = yawRows(y, h.load ?? 1, n);
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < 6; i += 1) m[i] = rows[i];
  const u = new Array<number>(n).fill(0);
  u[2] = -g.bank;
  u[3] = -g.bankRate;
  u[7] = 1;
  m[7][2] = -(g.integral ?? 0);
  for (let i = 0; i < order; i += 1) {
    for (let k = 0; k < order; k += 1) m[8 + i][8 + k] = pd.a[i][k];
    for (let j = 0; j < n; j += 1) m[8 + i][j] += pd.b[i] * u[j];
  }
  for (let j = 0; j < n; j += 1) m[6][j] = (pd.d * u[j]) / h.motorLag;
  for (let k = 0; k < order; k += 1) m[6][8 + k] += pd.c[k] / h.motorLag;
  m[6][6] -= 1 / h.motorLag;
  return m;
}

/**
 * Every mode of `humanYawLoop`: frequency, Hz, and damping ratio, least damped first. The Padé approximant's own poles
 * (well damped, above 3.5 Hz) and the integral's pole at the origin when it is off are left out.
 */
export function humanYawModes(y: YawPlant, h: HumanRoll, g: HumanRollGains): { frequency: number; damping: number }[] {
  return eigenvalues(humanYawLoop(y, h, g))
    .filter((v) => v.im >= 0 && Math.hypot(v.re, v.im) > 1e-9)
    .map((v) => {
      const size = Math.hypot(v.re, v.im);
      return { frequency: Math.abs(v.im) / (2 * Math.PI), damping: size > 0 ? -v.re / size : 1 };
    })
    .filter((mode) => !(mode.damping > 0.5 && mode.frequency > 3.5))
    .sort((a, b) => a.damping - b.damping);
}

/**
 * `YawPlant` in time with the delay exact (a buffer at `step`): the board's roll rate kicked by `kick`, rad/s, for
 * `seconds`, as the bars probe's Mode B kick. Returns the roll rate's decay per cycle (as `humanRollKick`), the body's
 * largest bank, rad, and the roll and yaw rates every `every` steps.
 */
export function humanYawKick(y: YawPlant, h: HumanRoll, g: HumanRollGains, kick = 0.5, seconds = 3, step = 1 / 1920, every = 32): { decay: number; peakBank: number; yawRates: number[]; rollRates: number[] } {
  const n = 8;
  const rows = yawRows(y, h.load ?? 1, n);
  const x = new Array<number>(n).fill(0);
  x[1] = kick;
  const buffer: number[] = [];
  const lag = Math.max(1, Math.round(h.delay / step));
  const rollRates: number[] = [];
  const yawRates: number[] = [];
  let peakBank = 0;
  for (let i = 0; i < Math.round(seconds / step); i += 1) {
    buffer.push(-g.bank * x[2] - g.bankRate * x[3] + x[7]);
    const delayed = buffer.length > lag ? buffer.shift()! : 0;
    const dx = rows.map((r) => r.reduce((s, v, j) => s + v * x[j], 0));
    dx.push((delayed - x[6]) / h.motorLag);
    dx.push(-(g.integral ?? 0) * x[2]);
    for (let k = 0; k < n; k += 1) x[k] += step * dx[k];
    if (i % every === 0) {
      rollRates.push(x[1]);
      yawRates.push(x[4]);
    }
    peakBank = Math.max(peakBank, Math.abs(x[2]));
  }
  const peaks: number[] = [];
  for (let i = 1; i < rollRates.length - 1; i += 1) {
    const a = Math.abs(rollRates[i]);
    if (a >= Math.abs(rollRates[i - 1]) && a > Math.abs(rollRates[i + 1]) && a > 1e-4) peaks.push(rollRates[i]);
  }
  const ratios: number[] = [];
  for (let i = 0; i + 2 < peaks.length && ratios.length < 3; i += 1) if (Math.sign(peaks[i]) === Math.sign(peaks[i + 2])) ratios.push(Math.abs(peaks[i + 2] / peaks[i]));
  const decay = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
  return { decay, peakBank, yawRates, rollRates };
}

/**
 * Step 3.2c (the advisor's ruling 29g; docs/research/new-rider/3.2, Part 3): the rider's twist as a second channel. The
 * rider's yaw inertia is split by where it sits: the feet, the shanks and the thighs' share that stays with them turn
 * with the board (`YawPlant.riderYawInertia`, now that share), and the pelvis, trunk, arms and head turn as one upper
 * body of `inertia`, kg·m², about the same vertical. Between them the legs (and the trunk) twist:
 * - the twist θ_t = ψ_u − ψ_b, the upper body's yaw less the board's (+ as r, nose right), its rate θ̇_t = ω_u − r;
 * - the legs' torque on the board τ_b = τ_a + k_t θ_t + c_t θ̇_t (+ nose right): the active twist τ_a and the legs'
 *   own (undelayed) stiffness and damping, `stiffness` and `damping`; the upper body takes −τ_b. A limb's force and its
 *   reaction: the two feet push across the board in opposite directions (the feet's couple), and the hips turn the
 *   upper body the other way.
 * - (I_z + I_L) ṙ = … + τ_b (in `yawRows`, so the feet's acceleration and the body's bank feel it); I_U ω̇_u = −τ_b.
 * The human loop gets a second command, the twist torque, delayed and lagged as the ankle's:
 * u_t = K_b θ + K_br θ̇ + K_r ω_u + K_t θ_t + K_tr θ̇_t, on the body's bank and its rate (the vestibular sense), the
 * head's yaw rate ω_u (the canals: the head turns with the upper body) and the twist and its rate (the legs' own sense).
 *
 * State: [φ, φ̇, θ, θ̇, r, β, δ, ι, θ_t, ω_u, τ_a, padé (ankle)…, padé (twist)…].
 */
export interface TwistPlant {
  /** The upper body's yaw inertia (pelvis, trunk, arms, head, the thighs' turning share), kg·m². */
  inertia: number;
  /** The legs' and trunk's own axial stiffness and damping between the upper body and the board, N·m/rad, N·m·s/rad. */
  stiffness: number;
  damping: number;
}
/** The twist command's gains, N·m on the board (+ nose right): per rad and rad/s of the bank, of the head's yaw rate, of the twist and its rate. */
export interface TwistGains {
  bank: number;
  bankRate: number;
  yawRate: number;
  twist: number;
  twistRate: number;
}
/** The plant's rows for the first 11 states ([φ, φ̇, θ, θ̇, r, β, δ, ι, θ_t, ω_u, τ_a]); rows 6, 7 and 10 (the commands' lags and the integral) are left empty. */
export function twistRows(y: YawPlant, t: TwistPlant, load: number, n: number): number[][] {
  const extra = new Array<number>(n).fill(0);
  extra[8] = t.stiffness;
  extra[9] = t.damping;
  extra[4] = -t.damping;
  extra[10] = 1;
  const rows = yawRows(y, load, n, extra);
  const twist = new Array<number>(n).fill(0);
  twist[9] = 1;
  twist[4] = -1;
  const upper = extra.map((e) => -e / t.inertia);
  const empty = () => new Array<number>(n).fill(0);
  return [...rows, empty(), empty(), twist, upper, empty()];
}
/** The twist command as a row over the state (before its delay). */
function twistCommand(gt: TwistGains, n: number): number[] {
  const u = new Array<number>(n).fill(0);
  u[2] = gt.bank;
  u[3] = gt.bankRate;
  u[9] = gt.yawRate + gt.twistRate;
  u[4] = -gt.twistRate;
  u[8] = gt.twist;
  return u;
}
/** The closed loop of `YawPlant` with the twist and the human balance on both channels: ẋ = M x. */
export function humanTwistLoop(y: YawPlant, t: TwistPlant, h: HumanRoll, g: HumanRollGains, gt: TwistGains, order = 5): number[][] {
  const pd = padeDelay(order, h.delay);
  const n = 11 + 2 * order;
  const m = twistRows(y, t, h.load ?? 1, n);
  while (m.length < n) m.push(new Array<number>(n).fill(0));
  const ua = new Array<number>(n).fill(0);
  ua[2] = -g.bank;
  ua[3] = -g.bankRate;
  ua[9] = -(g.yawRate ?? 0);
  ua[7] = 1;
  m[7][2] = -(g.integral ?? 0);
  const ut = twistCommand(gt, n);
  for (const [u, at, lagRow] of [[ua, 11, 6], [ut, 11 + order, 10]] as const) {
    for (let i = 0; i < order; i += 1) {
      for (let k = 0; k < order; k += 1) m[at + i][at + k] = pd.a[i][k];
      for (let j = 0; j < n; j += 1) m[at + i][j] += pd.b[i] * u[j];
    }
    for (let j = 0; j < n; j += 1) m[lagRow][j] = (pd.d * u[j]) / h.motorLag;
    for (let k = 0; k < order; k += 1) m[lagRow][at + k] += pd.c[k] / h.motorLag;
    m[lagRow][lagRow] -= 1 / h.motorLag;
  }
  return m;
}
/** Every mode of `humanTwistLoop`, least damped first (the Padé poles and the idle integral's left out, as `humanYawModes`). */
export function humanTwistModes(y: YawPlant, t: TwistPlant, h: HumanRoll, g: HumanRollGains, gt: TwistGains): { frequency: number; damping: number }[] {
  return eigenvalues(humanTwistLoop(y, t, h, g, gt))
    .filter((v) => v.im >= 0 && Math.hypot(v.re, v.im) > 1e-9)
    .map((v) => {
      const size = Math.hypot(v.re, v.im);
      return { frequency: Math.abs(v.im) / (2 * Math.PI), damping: size > 0 ? -v.re / size : 1 };
    })
    .filter((mode) => !(mode.damping > 0.5 && mode.frequency > 3.5))
    .sort((a, b) => a.damping - b.damping);
}
/**
 * `humanTwistLoop` in time with the delay exact (as `humanYawKick`): the board's roll rate kicked by `kick`, rad/s.
 * Returns the roll rate's decay per cycle, the body's largest bank and twist, rad, and the largest torques, N·m: the
 * ankle's (k (θ − φ − δ) + c (θ̇ − φ̇)) and the legs' twist on the board (τ_b).
 */
export function humanTwistKick(y: YawPlant, t: TwistPlant, h: HumanRoll, g: HumanRollGains, gt: TwistGains, kick = 0.5, seconds = 3, step = 1 / 1920, every = 32): { decay: number; peakBank: number; peakTwist: number; peakAnkle: number; peakTwistTorque: number; rollRates: number[]; yawRates: number[]; twists: number[] } {
  const n = 11;
  const rows = twistRows(y, t, h.load ?? 1, n);
  const ut = twistCommand(gt, n);
  const x = new Array<number>(n).fill(0);
  x[1] = kick;
  const ba: number[] = [];
  const bt: number[] = [];
  const lag = Math.max(1, Math.round(h.delay / step));
  const rollRates: number[] = [];
  const yawRates: number[] = [];
  const twists: number[] = [];
  let peakBank = 0;
  let peakTwist = 0;
  let peakAnkle = 0;
  let peakTwistTorque = 0;
  for (let i = 0; i < Math.round(seconds / step); i += 1) {
    ba.push(-g.bank * x[2] - g.bankRate * x[3] - (g.yawRate ?? 0) * x[9] + x[7]);
    bt.push(ut.reduce((s, v, j) => s + v * x[j], 0));
    const da = ba.length > lag ? ba.shift()! : 0;
    const dt = bt.length > lag ? bt.shift()! : 0;
    const dx = rows.map((r) => r.reduce((s, v, j) => s + v * x[j], 0));
    dx[6] = (da - x[6]) / h.motorLag;
    dx[7] = -(g.integral ?? 0) * x[2];
    dx[10] = (dt - x[10]) / h.motorLag;
    for (let k = 0; k < n; k += 1) x[k] += step * dx[k];
    if (i % every === 0) {
      rollRates.push(x[1]);
      yawRates.push(x[4]);
      twists.push(x[8]);
    }
    peakBank = Math.max(peakBank, Math.abs(x[2]));
    peakTwist = Math.max(peakTwist, Math.abs(x[8]));
    peakAnkle = Math.max(peakAnkle, Math.abs(y.ankleStiffness * (x[2] - x[0] - x[6]) + y.ankleDamping * (x[3] - x[1])));
    peakTwistTorque = Math.max(peakTwistTorque, Math.abs(x[10] + t.stiffness * x[8] + t.damping * (x[9] - x[4])));
  }
  const peaks: number[] = [];
  for (let i = 1; i < rollRates.length - 1; i += 1) {
    const a = Math.abs(rollRates[i]);
    if (a >= Math.abs(rollRates[i - 1]) && a > Math.abs(rollRates[i + 1]) && a > 1e-4) peaks.push(rollRates[i]);
  }
  const ratios: number[] = [];
  for (let i = 0; i + 2 < peaks.length && ratios.length < 3; i += 1) if (Math.sign(peaks[i]) === Math.sign(peaks[i + 2])) ratios.push(Math.abs(peaks[i + 2] / peaks[i]));
  const decay = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
  return { decay, peakBank, peakTwist, peakAnkle, peakTwistTorque, rollRates, yawRates, twists };
}

/**
 * The water's captive derivatives of the board with the rigid point rider (docs/research/new-rider/roll-plant README
 * 3.2 and results/plant-point.jsonl; the lab's axes: + toward the board's left, yaw + to the left, roll + the left
 * rail up, slip + sliding right), turned into `YawPlant`'s axes and moved to the board's own centre of mass `ahead` m
 * ahead of the lab's (the composite's, over the feet). The yaw moments and side forces were about the composite centre
 * of mass, the roll moments about the deck under the rider: N_B = N_C − ahead · Y, β_C = β_B − ahead · r / V.
 */
export function boardDerivatives(lab: { roll: number[]; slip: number[]; yaw: number[]; rate: number[] }, speed: number, ahead: number):
  Pick<YawPlant, 'heelYaw' | 'heelSide' | 'heelRoll' | 'slipYaw' | 'slipSide' | 'slipRoll' | 'yawDamping' | 'yawSide' | 'yawRoll' | 'rollRateYaw' | 'rollRateSide' | 'rollDamping'> {
  // These axes: N and Y flip, K keeps; per yaw rate the variable flips as well.
  const at = { N: -lab.roll[0], Y: -lab.roll[1], K: lab.roll[2] };
  const sl = { N: -lab.slip[0], Y: -lab.slip[1], K: lab.slip[2] };
  const yw = { N: lab.yaw[0], Y: lab.yaw[1], K: -lab.yaw[2] };
  const rr = { N: -lab.rate[0], Y: -lab.rate[1], K: lab.rate[2] };
  // The slip at the composite is the board's less the yaw's sweep over `ahead`.
  const shift = (d: { N: number; Y: number; K: number }, slip = 0) => ({ N: d.N - (ahead * sl.N * slip) / speed, Y: d.Y - (ahead * sl.Y * slip) / speed, K: d.K - (ahead * sl.K * slip) / speed });
  const yawB = shift(yw, 1);
  const move = (d: { N: number; Y: number; K: number }) => ({ N: d.N - ahead * d.Y, Y: d.Y, K: d.K });
  const a = move(at);
  const s = move(sl);
  const w = move(yawB);
  const q = move(rr);
  return {
    heelYaw: a.N, heelSide: a.Y, heelRoll: a.K, slipYaw: s.N, slipSide: s.Y, slipRoll: s.K,
    yawDamping: w.N, yawSide: w.Y, yawRoll: w.K, rollRateYaw: q.N, rollRateSide: q.Y, rollDamping: q.K,
  };
}

/**
 * The eigenvalues of a real square matrix: reduction to Hessenberg form by
 * elimination, then the shifted QR iteration (Numerical Recipes' elmhes and
 * hqr, 1-based as there).
 */
export function eigenvalues(matrix: readonly (readonly number[])[]): { re: number; im: number }[] {
  const n = matrix.length;
  const a: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i > 0 && j > 0 ? matrix[i - 1][j - 1] : 0)));
  // Hessenberg form.
  for (let m = 2; m < n; m += 1) {
    let x = 0;
    let i = m;
    for (let j = m; j <= n; j += 1) {
      if (Math.abs(a[j][m - 1]) > Math.abs(x)) {
        x = a[j][m - 1];
        i = j;
      }
    }
    if (i !== m) {
      for (let j = m - 1; j <= n; j += 1) [a[i][j], a[m][j]] = [a[m][j], a[i][j]];
      for (let j = 1; j <= n; j += 1) [a[j][i], a[j][m]] = [a[j][m], a[j][i]];
    }
    if (x !== 0) {
      for (i = m + 1; i <= n; i += 1) {
        let y = a[i][m - 1];
        if (y !== 0) {
          y /= x;
          a[i][m - 1] = y;
          for (let j = m; j <= n; j += 1) a[i][j] -= y * a[m][j];
          for (let j = 1; j <= n; j += 1) a[j][m] += y * a[j][i];
        }
      }
    }
  }
  for (let i = 1; i <= n; i += 1) for (let j = 1; j < i - 1; j += 1) a[i][j] = 0;

  const wr = new Array<number>(n + 1).fill(0);
  const wi = new Array<number>(n + 1).fill(0);
  let anorm = 0;
  for (let i = 1; i <= n; i += 1) for (let j = Math.max(i - 1, 1); j <= n; j += 1) anorm += Math.abs(a[i][j]);
  let nn = n;
  let t = 0;
  const sign = (value: number, s: number) => (s >= 0 ? Math.abs(value) : -Math.abs(value));
  while (nn >= 1) {
    let its = 0;
    let l: number;
    do {
      for (l = nn; l >= 2; l -= 1) {
        let s = Math.abs(a[l - 1][l - 1]) + Math.abs(a[l][l]);
        if (s === 0) s = anorm;
        if (Math.abs(a[l][l - 1]) <= Number.EPSILON * s) {
          a[l][l - 1] = 0;
          break;
        }
      }
      let x = a[nn][nn];
      if (l === nn) {
        wr[nn] = x + t;
        wi[nn] = 0;
        nn -= 1;
      } else {
        let y = a[nn - 1][nn - 1];
        let w = a[nn][nn - 1] * a[nn - 1][nn];
        if (l === nn - 1) {
          const p = 0.5 * (y - x);
          const q = p * p + w;
          let z = Math.sqrt(Math.abs(q));
          x += t;
          if (q >= 0) {
            z = p + sign(z, p);
            wr[nn - 1] = wr[nn] = x + z;
            if (z) wr[nn] = x - w / z;
            wi[nn - 1] = wi[nn] = 0;
          } else {
            wr[nn - 1] = wr[nn] = x + p;
            wi[nn - 1] = -z;
            wi[nn] = z;
          }
          nn -= 2;
        } else {
          if (its === 60) throw new Error('eigenvalues: no convergence');
          if (its === 10 || its === 20) {
            t += x;
            for (let i = 1; i <= nn; i += 1) a[i][i] -= x;
            const s = Math.abs(a[nn][nn - 1]) + Math.abs(a[nn - 1][nn - 2]);
            y = x = 0.75 * s;
            w = -0.4375 * s * s;
          }
          its += 1;
          let m: number;
          let p = 0;
          let q = 0;
          let r = 0;
          let z = 0;
          for (m = nn - 2; m >= l; m -= 1) {
            z = a[m][m];
            r = x - z;
            const s0 = y - z;
            p = (r * s0 - w) / a[m + 1][m] + a[m][m + 1];
            q = a[m + 1][m + 1] - z - r - s0;
            r = a[m + 2][m + 1];
            const s = Math.abs(p) + Math.abs(q) + Math.abs(r);
            p /= s;
            q /= s;
            r /= s;
            if (m === l) break;
            const u = Math.abs(a[m][m - 1]) * (Math.abs(q) + Math.abs(r));
            const v = Math.abs(p) * (Math.abs(a[m - 1][m - 1]) + Math.abs(z) + Math.abs(a[m + 1][m + 1]));
            if (u <= Number.EPSILON * v) break;
          }
          for (let i = m + 2; i <= nn; i += 1) {
            a[i][i - 2] = 0;
            if (i !== m + 2) a[i][i - 3] = 0;
          }
          for (let k = m; k <= nn - 1; k += 1) {
            if (k !== m) {
              p = a[k][k - 1];
              q = a[k + 1][k - 1];
              r = 0;
              if (k !== nn - 1) r = a[k + 2][k - 1];
              x = Math.abs(p) + Math.abs(q) + Math.abs(r);
              if (x !== 0) {
                p /= x;
                q /= x;
                r /= x;
              }
            }
            const s = sign(Math.sqrt(p * p + q * q + r * r), p);
            if (s !== 0) {
              if (k === m) {
                if (l !== m) a[k][k - 1] = -a[k][k - 1];
              } else {
                a[k][k - 1] = -s * x;
              }
              p += s;
              x = p / s;
              y = q / s;
              z = r / s;
              q /= p;
              r /= p;
              for (let j = k; j <= nn; j += 1) {
                p = a[k][j] + q * a[k + 1][j];
                if (k !== nn - 1) {
                  p += r * a[k + 2][j];
                  a[k + 2][j] -= p * z;
                }
                a[k + 1][j] -= p * y;
                a[k][j] -= p * x;
              }
              const mmin = nn < k + 3 ? nn : k + 3;
              for (let i = l; i <= mmin; i += 1) {
                p = x * a[i][k] + y * a[i][k + 1];
                if (k !== nn - 1) {
                  p += z * a[i][k + 2];
                  a[i][k + 2] -= p * r;
                }
                a[i][k + 1] -= p * q;
                a[i][k] -= p;
              }
            }
          }
        }
      }
    } while (l < nn - 1);
  }
  return Array.from({ length: n }, (_, i) => ({ re: wr[i + 1], im: wi[i + 1] }));
}
