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
