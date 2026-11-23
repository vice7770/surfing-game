/**
 * **Step 3.5s, model side only: the line hold's steady states, its authority and its model gate** (`hold-line.md`
 * §2-§3). Nothing is ridden. Off the code's own functions (`plantAt`, `continuousPlant`, `faceColumn`,
 * `faceTrimPoint`, `scheduledDesign`, `closedLoop`'s arithmetic) on the owner's design (`riderBody: 'two'`,
 * `faceTrim: 'on'`, the shipped ladder).
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/hold-line-model.ts -o <s>/hlm.mjs --format esm --platform node
 *     env PART=trim node <s>/hlm.mjs          # the steady states and their authority (§2)
 *     env PART=gate node <s>/hlm.mjs          # the closed loop with the hold, the true delay a frame off (§3)
 *
 * Env: `TILT` deg (12); `LEVER` m, the face's yaw lever measured in §1 (0.40); `HOLD_TIME` s, variant A's heading time
 * (1.0); `COUPLE` the face's tilt per radian of heading (−0.15, the test wave's: τ falls as the nose turns down).
 *
 * Model signs: x forward, y right, the face falling to the right (τ > 0); r + the nose right (down the face); the
 * heading ψ + the nose right of the line.
 */
import { eigenvalues } from '../../../../src/physics/rollModel';
import {
  CONTROL_STEP, DEFAULT_WEIGHTS, N_COMMAND, N_STATE, add, continuousPlant, discretise, eye, faceColumn, faceSupport, faceTrimPoint,
  leastDamping, mul, plantAt, scale, scheduledDesign, steadyTurn, type Design, type DesignWeights, type Mat,
} from '../../../../src/physics/predictiveBalance';

const DEG = 180 / Math.PI;
const env = process.env;
const PART = env.PART ?? 'trim';
const TILT = Number(env.TILT ?? 12) / DEG;
const LEVER = Number(env.LEVER ?? 0.4);
const HOLD_TIME = Number(env.HOLD_TIME ?? 1.0);
/**
 * Variant A's integral time on the heading, s, or none (the default, and the variant built): a PI hold with
 * `INTEGRAL_TIME=<s>` was tried before the build and fails this gate at 5 m/s (hold-line.md §3).
 */
const INTEGRAL_TIME = env.INTEGRAL_TIME ? Number(env.INTEGRAL_TIME) : undefined;
/** Variant A's largest turn rate asked, rad/s. */
const RATE_MAX = Number(env.RATE_MAX ?? 0.2);
const COUPLE = Number(env.COUPLE ?? -0.15);
const WEIGHTS: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two', faceTrim: 'on' };
const f = (x: number, d = 2) => (Number.isFinite(x) ? Number(x.toFixed(d)) : null);
const emit = (o: unknown) => process.stdout.write(`${JSON.stringify(o)}\n`);
const STANCE = (d: number) => (d === 0 ? 'tall' : d < 0.25 ? 'crouch' : d < 0.4 ? 'compress' : 'tuck');

/** The water's yaw moment on the board per N·m, as a column of A (differencing `continuousPlant`, as `faceColumn` does). */
function yawUnitColumn(y: ReturnType<typeof plantAt>['y'], t: ReturnType<typeof plantAt>['t']): number[] {
  const bare = { ...y, heelRoll: 0, heelSide: 0, heelYaw: 0 };
  const base = continuousPlant(bare, t).a;
  const unit = continuousPlant({ ...bare, heelYaw: 1 }, t).a;
  return base.map((row, i) => unit[i][0] - row[0]);
}
/** The face's column with the face's own yaw (the support turned through the face, acting `lever` aft of the centre of mass). */
function faceColumnYaw(y: ReturnType<typeof plantAt>['y'], t: ReturnType<typeof plantAt>['t'], lever: number): number[] {
  const col = faceColumn(y, t);
  const yaw = yawUnitColumn(y, t);
  const n = -faceSupport(y) * lever;
  return col.map((c, i) => c + n * yaw[i]);
}
const discCol = (a: Mat, col: number[]) => discretise(a, col.map((x) => [x]), CONTROL_STEP).gamma.map((r) => r[0]);

/**
 * The steady state with the TURN RATE pinned (x[4] = rate) and the twist pinned, the bank free: (Φ − I) x + Γ u + drive = 0,
 * least squares over every row, as `steadyTurn` but with the yaw row's own unknown given and the bank solved.
 */
function steadyHold(phi: Mat, gamma: Mat, rate: number, twist: number, drive?: readonly number[]): { x: number[]; u: number[] } {
  const n = phi.length;
  const free = n > N_STATE ? [0, 2, 5, 7, 8, 9, N_STATE, N_STATE + 2] : [0, 2, 5, 7, 8, 9];
  const cols = free.length + N_COMMAND;
  const m: Mat = Array.from({ length: n }, () => new Array<number>(cols).fill(0));
  const rhs = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    free.forEach((j, c) => { m[i][c] = phi[i][j] - (i === j ? 1 : 0); });
    for (let q = 0; q < N_COMMAND; q += 1) m[i][free.length + q] = gamma[i][q];
    rhs[i] = -((phi[i][4] - (i === 4 ? 1 : 0)) * rate + (phi[i][6] - (i === 6 ? 1 : 0)) * twist) - (drive ? drive[i] : 0);
  }
  const mt = m[0].map((_, j) => m.map((row) => row[j]));
  const ata = mul(mt, m);
  const atb = mul(mt, rhs.map((v) => [v])).map((r) => r[0]);
  // Gaussian elimination
  const A = ata.map((r) => r.slice()); const b = atb.slice();
  for (let c = 0; c < cols; c += 1) {
    let p = c; for (let r = c + 1; r < cols; r += 1) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[p], A[c]] = [A[c], A[p]]; [b[p], b[c]] = [b[c], b[p]];
    for (let r = c + 1; r < cols; r += 1) { const k = A[r][c] / A[c][c]; for (let q = c; q < cols; q += 1) A[r][q] -= k * A[c][q]; b[r] -= k * b[c]; }
  }
  const z = new Array<number>(cols).fill(0);
  for (let r = cols - 1; r >= 0; r -= 1) { let s = b[r]; for (let q = r + 1; q < cols; q += 1) s -= A[r][q] * z[q]; z[r] = s / A[r][r]; }
  const x = new Array<number>(n).fill(0);
  free.forEach((j, c) => { x[j] = z[c]; });
  x[4] = rate; x[6] = twist;
  return { x, u: [z[free.length], z[free.length + 1]] };
}
/** The ankle's torque on the body at a state (N·m), the twist's torque, and how the state reads in degrees. */
function describe(y: ReturnType<typeof plantAt>['y'], x: number[], u: number[], tau: number) {
  return {
    railDeg: f((x[0] - tau) * DEG, 1), rollDeg: f(x[0] * DEG, 1), bankDeg: f(x[2] * DEG, 1), rDegS: f(x[4] * DEG, 1), slipDeg: f(x[5] * DEG, 1),
    restDeg: f(u[0] * DEG, 1), ankleNm: f(y.ankleStiffness * (x[2] - x[0] - x[8]), 0), twistNm: f(u[1], 1),
  };
}

if (PART === 'trim') {
  // §2: on a 12° face, the steady states the controller could be asked to hold, and the authority each needs.
  for (const depth of (env.DEPTHS ?? '0,0.195,0.3').split(',').map(Number)) for (const v of (env.SPEEDS ?? '5,6,6.5,7,8,9').split(',').map(Number)) {
    const { y, t } = plantAt(v, depth, { rail: 0, body: true, stanceDeep: true });
    const d = scheduledDesign(v, depth, 0, WEIGHTS);
    const { a } = continuousPlant(y, t);
    const n = a.length;
    const p = faceTrimPoint(y);
    const neutral = new Array<number>(n).fill(0); neutral[0] = p.roll * TILT; neutral[5] = p.slip * TILT; neutral[8] = p.rest * TILT;
    const yawAcc = (col: number[], x: number[], u: number[]) => {
      // ṙ at the state with the face's input and the commands (continuous; the lag rows read the commands).
      const { b } = continuousPlant(y, t);
      return a[4].reduce((s, q, j) => s + q * x[j], 0) + b[4][0] * u[0] + b[4][1] * u[1] + col[4] * TILT;
    };
    const out: Record<string, unknown> = { depth, stance: STANCE(depth), v, tiltDeg: f(TILT * DEG, 1), support: f(faceSupport(y), 0), lever: LEVER, faceYawNmPerRad: f(-faceSupport(y) * LEVER, 0), Nbeta: f(y.slipYaw, 0) };
    for (const [name, lever] of [['model35r', 0], ['measured', LEVER]] as const) {
      const col = lever ? faceColumnYaw(y, t, lever) : faceColumn(y, t);
      const drive = discCol(a, col).map((x) => x * TILT);
      const hold = steadyHold(d.phi, d.gamma, 0, 0, drive);
      const turn = steadyTurn(d.phi, d.gamma, 0, 0, drive);
      out[name] = {
        neutralYawAccDegS2: f(yawAcc(col, neutral, [p.rest * TILT, 0]) * DEG, 1),
        holdLine: describe(y, hold.x, hold.u, TILT),
        freeTurn: describe(y, turn.x, turn.u, TILT),
      };
    }
    // Variant A's reference: 'on's neutral trim at this tilt plus the flat model's steady state at ±RATE_MAX (the
    // hold's largest ask), and at the flat coordinated turn of a body at plumb (r 0: the trim itself).
    for (const rate of [-RATE_MAX, RATE_MAX]) {
      const lean = Math.atan((v * rate) / 9.81);
      const tt = steadyTurn(d.phi, d.gamma, Math.tan(lean), 0);
      const k = lean / Math.tan(lean);
      const h = { x: tt.x.map((q, i) => (i === 0 || i === 2 || i === 8 ? q * k : q)), u: [tt.u[0] * k, tt.u[1]] };
      out[`modelYawRow_rate${f(rate * DEG, 1)}_bankDeg`] = f(steadyHold(d.phi, d.gamma, rate, 0).x[2] * DEG, 1);
      const x = h.x.map((v2, i) => v2 + d.trimX![i][0] * TILT);
      const u = [h.u[0] + d.trimU![0][0] * TILT, h.u[1] + d.trimU![1][0] * TILT];
      out[`holdA_rate${f(rate * DEG, 1)}`] = describe(y, x, u, TILT);
    }
    out.holdA_trim = describe(y, d.trimX!.map((r) => r[0] * TILT), [d.trimU![0][0] * TILT, d.trimU![1][0] * TILT], TILT);
    emit(out);
  }
}

/**
 * §3: the closed loop of `closedLoop` with the heading and the hold added. z = [x (n), the senses' line (p × Ts), the
 * estimate (ne), the commands' line (m × (N + 1)), ψ, ψ's line (Ts + 1), (B) the smoothed yaw rate, the lean asked].
 * - The true plant: x' = Φ x + Γ u + Γ_F,true τ(ψ), ψ' = ψ + T r; τ(ψ) = COUPLE · ψ (the face's tilt as the heading turns;
 *   the constant part is an input and moves no eigenvalue).
 * - The controller: `closedLoop`'s filter and predictor, with the face sensed as the heading's tilt `Ts` (and `Ts + 1`)
 *   frames late through Γ_FE and P_F as `tick` does, and the reference:
 *   - **A**: the steady state at the turn rate r_cmd = −ψ̂ / HOLD_TIME on this face (`steadyHold`, the face's column with its
 *     yaw), ψ̂ the heading sensed `Ts` frames late brought forward over the predictor's N frames by the mean of the
 *     estimate's and the prediction's yaw rate;
 *   - **B**: the old rider's `holdLine` (the TRUE heading now and its yaw rate smoothed over 0.25 s, full lean of
 *     HOLD_BANK × 0.5 at 5°, the lean asked eased over REFERENCE_TIME) as the bank asked, through `steadyTurn` and the
 *     neutral trim (`'on'`'s reference).
 * - `none`: the same augmented loop with no hold (the heading free): the shipped `on` design's own gate on this plant.
 */
function holdLoop(truePhi: Mat, trueGamma: Mat, trueFace: number[], Ts: number, d: Design, variant: 'A' | 'B' | 'none', hx: { sx: number[]; su: number[]; bx: number[]; bu: number[] }): Mat {
  const n = truePhi.length; const p = d.c.length; const m = N_COMMAND; const ne = d.phiE.length; const N = d.steps;
  const ox = 0; const os = n; const oe = n + p * Ts; const ou = oe + ne; const oh = ou + m * (N + 1); const ol = oh + 1; const ob = ol + Ts + 1;
  const D = ob + (variant === 'B' ? 2 : variant === 'A' && INTEGRAL_TIME ? 1 : 0);
  const zero = () => new Array<number>(D).fill(0);
  // The face sensed: the newest the controller holds (`sensedFace`, Ts late) and the one before (`stepFace`).
  const sensedFace = zero(); sensedFace[ol + Ts - 1] = COUPLE;
  const stepFace = zero(); stepFace[ol + Ts] = COUPLE;
  // The filter's update, with the face's one-step input.
  const predMap: Mat = Array.from({ length: ne }, () => zero());
  for (let i = 0; i < ne; i += 1) {
    for (let j = 0; j < ne; j += 1) predMap[i][oe + j] = d.phiE[i][j];
    for (let j = 0; j < m; j += 1) predMap[i][ou + m * N + j] = d.gammaE[i][j];
    for (let j = 0; j < D; j += 1) predMap[i][j] += d.gammaFE![i][0] * stepFace[j];
  }
  const eMap = mul(add(eye(ne), mul(d.l, d.cE), -1), predMap);
  for (let i = 0; i < ne; i += 1) for (let j = 0; j < p; j += 1) eMap[i][os + p * (Ts - 1) + j] += d.l[i][j];
  const bMap = d.bias ? [eMap[n], eMap[n + 1]] : [zero(), zero()];
  const xMap = mul(d.phiN, eMap.slice(0, n));
  const predSum: Mat = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let jj = 0; jj < N; jj += 1) {
    const slot = N - 1 - jj;
    for (let i = 0; i < n; i += 1) for (let j = 0; j < m; j += 1) { xMap[i][ou + m * slot + j] += d.pred[jj][i][j]; predSum[i][j] += d.pred[jj][i][j]; }
  }
  const xPlus = add(xMap, mul(predSum, bMap));
  for (let i = 0; i < n; i += 1) for (let j = 0; j < D; j += 1) xPlus[i][j] += d.predF![i][0] * sensedFace[j];
  // The reference, as rows over z.
  const xRef: Mat = Array.from({ length: n }, () => zero());
  const uRef: Mat = Array.from({ length: m }, () => zero());
  const addRef = (gx: number[], gu: number[], row: number[]) => {
    for (let i = 0; i < n; i += 1) for (let j = 0; j < D; j += 1) xRef[i][j] += gx[i] * row[j];
    for (let q = 0; q < m; q += 1) for (let j = 0; j < D; j += 1) uRef[q][j] += gu[q] * row[j];
  };
  if (variant === 'A') {
    // 'on's neutral trim, plus the flat model's steady state at the turn rate r_cmd = −(ψ̂ + I) / HOLD_TIME.
    addRef(d.trimX!.map((r) => r[0]), d.trimU!.map((r) => r[0]), sensedFace);
    const rcmd = psiHatRow(D, Ts, N, eMap, xPlus, ol).map((v) => -v / HOLD_TIME);
    if (INTEGRAL_TIME) rcmd[ob] -= 1 / HOLD_TIME;
    addRef(hx.sx, hx.su, rcmd);
  } else {
    // 'on': the neutral trim moves with the sensed tilt; B adds the lean asked's steady turn.
    addRef(d.trimX!.map((r) => r[0]), d.trimU!.map((r) => r[0]), sensedFace);
    if (variant === 'B') { const lean = zero(); lean[ob + 1] = -1; addRef(hx.bx, hx.bu, lean); }
  }
  // u = u_ref − K (x̂ − x_ref) − b̂.
  const uMap = add(add(scale(mul(d.k, add(xPlus, xRef, -1)), -1), bMap, -1), uRef);
  const M: Mat = Array.from({ length: D }, () => zero());
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) M[ox + i][ox + j] = truePhi[i][j];
    for (let j = 0; j < D; j += 1) for (let q = 0; q < m; q += 1) M[ox + i][j] += trueGamma[i][q] * uMap[q][j];
    M[ox + i][oh] += trueFace[i] * COUPLE;
  }
  for (let i = 0; i < p; i += 1) for (let j = 0; j < n; j += 1) M[os + i][ox + j] = d.c[i][j];
  for (let s2 = 1; s2 < Ts; s2 += 1) for (let i = 0; i < p; i += 1) M[os + p * s2 + i][os + p * (s2 - 1) + i] = 1;
  for (let i = 0; i < ne; i += 1) for (let j = 0; j < D; j += 1) M[oe + i][j] = eMap[i][j];
  for (let q = 0; q < m; q += 1) for (let j = 0; j < D; j += 1) M[ou + q][j] = uMap[q][j];
  for (let s2 = 1; s2 <= N; s2 += 1) for (let q = 0; q < m; q += 1) M[ou + m * s2 + q][ou + m * (s2 - 1) + q] = 1;
  // The heading and its sensed line.
  M[oh][oh] = 1; M[oh][ox + 4] = CONTROL_STEP;
  M[ol][oh] = 1;
  for (let s2 = 1; s2 <= Ts; s2 += 1) M[ol + s2][ol + s2 - 1] = 1;
  if (variant === 'A' && INTEGRAL_TIME) {
    // The heading's integral: I' = I + T ψ̂ / INTEGRAL_TIME.
    const psiHat = psiHatRow(D, Ts, N, eMap, xPlus, ol);
    for (let j = 0; j < D; j += 1) M[ob][j] = (CONTROL_STEP * psiHat[j]) / INTEGRAL_TIME;
    M[ob][ob] += 1;
  }
  if (variant === 'B') {
    // holdLine in model signs: the smoothed rate hr' = hr + a (r − hr); the hold's lean (game sign, + left) is
    // HOLD_BANK × (ψ + 0.5 hr) / 5°, unclamped here, eased: lean' = lean + b (target − lean); the bank asked = −lean.
    const a = 1 - Math.exp(-CONTROL_STEP / 0.25); const b = 1 - Math.exp(-CONTROL_STEP / 0.05);
    const g = 0.1 / (5 / DEG);
    M[ob][ob] = 1 - a; M[ob][ox + 4] = a;
    M[ob + 1][ob + 1] = 1 - b; M[ob + 1][oh] = b * g; M[ob + 1][ob] = b * g * 0.5;
  }
  return M;
}

/** ψ̂: the heading sensed Ts frames late, brought forward over the predictor's N frames by the mean of the estimate's and the prediction's yaw rate. */
function psiHatRow(D: number, Ts: number, N: number, eMap: Mat, xPlus: Mat, ol: number): number[] {
  const row = new Array<number>(D).fill(0);
  row[ol + Ts - 1] = 1;
  for (let j = 0; j < D; j += 1) row[j] += (N * CONTROL_STEP * (eMap[4][j] + xPlus[4][j])) / 2;
  return row;
}

if (PART === 'gate') {
  const speeds = (env.SPEEDS ?? Array.from({ length: 17 }, (_, i) => 4 + 0.5 * i).join(',')).split(',').map(Number);
  const depths = (env.DEPTHS ?? '0,0.195,0.3,0.45').split(',').map(Number);
  const variants = (env.VARIANTS ?? 'none,A,B').split(',') as ('none' | 'A' | 'B')[];
  const worst: Record<string, { damping: number; at: string }> = {};
  for (const depth of depths) for (const v of speeds) {
    const { y, t } = plantAt(v, depth, { rail: 0, body: true, stanceDeep: true });
    const { a, b } = continuousPlant(y, t);
    const { phi, gamma } = discretise(a, b, CONTROL_STEP);
    const d = scheduledDesign(v, depth, 0, WEIGHTS);
    const trueFace = discCol(a, faceColumn(y, t));
    const unit = steadyHold(d.phi, d.gamma, 1, 0);
    const bank = steadyTurn(d.phi, d.gamma, 1, 0);
    // A asks the COORDINATED lean for its turn rate (bank = v r / g, linearised), through the same steady turn the
    // stick's lean goes through; B asks a lean outright.
    const c = v / 9.81;
    const hx = { sx: bank.x.map((q) => q * c), su: bank.u.map((q) => q * c), bx: bank.x, bu: bank.u };
    const row: Record<string, unknown> = { v, depth, stance: STANCE(depth), holdTime: HOLD_TIME, integralTime: INTEGRAL_TIME ?? null, couple: COUPLE, bankPerRateModel: f(unit.x[2], 3), bankPerRateCoordinated: f(v / 9.81, 3) };
    for (const variant of variants) {
      const res: Record<string, unknown> = {};
      for (const Ts of [5, 6, 7]) {
        let m: { damping: number; frequency: number };
        // The heading's own integrator (no hold, no coupling) sits at z = 1 exactly; computed, it lands within 1e-6 of it
        // on either side, which `leastDamping` would read as −1. It is set aside and the real eigenvalue farthest
        // outside the unit circle is reported beside the damping (`slowest`, its radius).
        let slowest = 0;
        try {
          const all = eigenvalues(holdLoop(phi, gamma, trueFace, Ts, d, variant, hx), { balance: true, maxIterations: 400 });
          const kept = all.filter((z) => !(Math.abs(z.im) < 1e-9 && Math.abs(z.re - 1) < 1e-6));
          for (const z of kept) if (Math.abs(z.im) < 1e-9) slowest = Math.max(slowest, Math.abs(z.re));
          m = leastDamping(kept);
        } catch { m = { damping: -Infinity, frequency: 0 }; }
        res[Ts === 5 ? 'd083' : Ts === 6 ? 'd100' : 'd117'] = [f(m.damping, 3), f(m.frequency, 2), f(slowest, 6)];
        if (Ts !== 6 && depth <= 0.3) {
          const key = variant;
          if (!worst[key] || m.damping < worst[key].damping) worst[key] = { damping: m.damping, at: `${v} m/s ${STANCE(depth)} Ts ${Ts} (${f(m.frequency, 2)} Hz)` };
        }
      }
      row[variant] = res;
    }
    emit(row);
  }
  emit({ part: 'worst (three stances, 4-12 m/s, delay one frame off)', ...Object.fromEntries(Object.entries(worst).map(([k, w]) => [k, { damping: f(w.damping, 3), at: w.at, pass: w.damping >= 0.029 }])) });
}
