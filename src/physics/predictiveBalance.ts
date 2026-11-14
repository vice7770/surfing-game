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
import { HEAVE_AT, N_HEAVE, boardDerivatives, twistRows, twistStateCount, type HeavePlant, type TwistPlant, type YawPlant } from './rollModel';

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

/**
 * The senses as rows over the state: the bank, its rate, the head's yaw rate, the twist, its rate, the ankle's angle
 * (θ − φ) and rate.
 *
 * **With the board's heave and pitch carried as states, two more (step 3.2p, ruling 29w item 1).** 3.2m found the
 * least damped mode of the whole loop is then the board's own 0.33–0.74 Hz heave and pitch, and that the balance runs
 * it **open-loop** because nothing in this matrix touches those states. A real rider has both senses:
 * - **the load through the feet**, which is the vertical specific force at the deck, m/s², + up. On this plant that is
 *   the heave's own acceleration row of A, so the caller passes it in (`load`); it carries h, the pitch, their rates
 *   and the four states the ten-state model already had, each at its measured weight. The soles and the Golgi organs
 *   sense force, not position, and this is the force they sense.
 * - **the board's nose-up pitch rate**, rad/s, which the canals sense directly as they sense the head's yaw rate, and
 *   which the legs feel as the deck's angle changing under the feet.
 * Neither is a new measurement in the game: `rider.contact.load` and the board's own spin are both already there. Both
 * arrive through the same 0.1 s sensing line as every other channel.
 */
export function senseMatrix(n = N_STATE, load?: readonly number[]): Mat {
  const rows = load && n > N_STATE ? N_SENSE + 2 : N_SENSE;
  const c = zeros(rows, n);
  c[0][2] = 1;
  c[1][3] = 1;
  c[2][7] = 1;
  c[3][6] = 1;
  c[4][7] = 1; c[4][4] = -1;
  c[5][2] = 1; c[5][0] = -1;
  c[6][3] = 1; c[6][1] = -1;
  if (rows > N_SENSE) {
    // The load through the feet: ẇ, the second heave row of A (h at N_STATE, ḣ at N_STATE + 1).
    for (let j = 0; j < n; j += 1) c[N_SENSE][j] = load![j];
    // The board's pitch rate, θ̇_b at N_STATE + 3.
    c[N_SENSE + 1][N_STATE + 3] = 1;
  }
  return c;
}

/**
 * The continuous plant (A, B) in this file's state order, from `YawPlant` and `TwistPlant`, with the muscles' lag.
 *
 * Ten states as before, or **fourteen** when the plant carries the board's heave and pitch (`YawPlant.heave`, ruling
 * 29t item 2): the four new states go on the end, so every index the game's controller uses stays where it was and a
 * plant without the block is byte-for-byte the plant it always was.
 */
export function continuousPlant(y: YawPlant, t: TwistPlant, lag = PREDICT_LAG, load = 1): { a: Mat; b: Mat } {
  const fixed = twistStateCount(y);
  const rows = twistRows(y, t, load, fixed);
  // twistRows' order: [φ, φ̇, θ, θ̇, r, β, δ, ι, θ_t, ω_u, τ_a, (h, ḣ, θ_b, θ̇_b)];
  // here [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a, (h, ḣ, θ_b, θ̇_b)].
  const map = fixed > HEAVE_AT ? [0, 1, 2, 3, 4, 5, 8, 9, 6, 10, 11, 12, 13, 14] : [0, 1, 2, 3, 4, 5, 8, 9, 6, 10];
  const n = map.length;
  const a = zeros(n, n);
  // Every row but the two muscle lags (8 and 9), which are the commands' own.
  for (let i = 0; i < n; i += 1) {
    if (i === 8 || i === 9) continue;
    for (let j = 0; j < n; j += 1) a[i][j] = rows[map[i]][map[j]];
  }
  a[8][8] = -1 / lag;
  a[9][9] = -1 / lag;
  const b = zeros(n, N_COMMAND);
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

/**
 * The water's derivatives at a HELD RAIL, **every hold shown settled** (ruling 29t item 1; step 3.2m). At 5, 7 and
 * 9 m/s and rails of 0, 10, 15, 20, 30 and 40°
 * (`../../docs/research/new-rider/rail-dig/settled.probe.ts` PART=free, `results/settled-long.jsonl`). At each point the
 * board is first held at that roll with its yaw and its sideslip free, so it settles into the turn that rail makes
 * (`trimYaw`, rad/s; `trimSlipDeg`, the path's angle in the level plane; `pull`, the turn's pull over what the rail's
 * own lean would balance). The twelve derivatives are then central differences about that trim, held.
 *
 * **This table replaces step 3.2f's, and the numbers are three to nine times smaller.** 3.2f held each perturbation
 * 0.6 s and averaged its last quarter-second. At a rail that lands on the overshoot of the board's own heave: a slide
 * at heel costs the flat bottom its lift, the board drops, and the drop takes one to two seconds and rings
 * (`docs/research/new-rider/rail-dig/README.md` §5.1, ruling 29t). Held until it stops moving, the side force per
 * radian of sideslip at 7 m/s runs +1409, +936, +406, −188, −800, −559 over 0 to 40° of rail, where 3.2f read +1398,
 * +825, —, −1387, −2610, −4143.
 *
 * What survives and what does not:
 * - **The sign change survives.** The side force per sideslip still crosses zero, at about 18° of rail at 7 and
 *   9 m/s. **At 5 m/s it does not cross at all** up to 20°, where 3.2f read −378.
 * - **"The plant past 15° cannot be stabilised by any controller" does not survive.** On this table a controller
 *   designed at the rail is positively damped at every point measured, 7 m/s at 40° included, where 3.2f's numbers
 *   gave −1 (`3.2/results/predict-railmodel-32m.jsonl`). That was the whole argument for ruling 29s, and for keeping
 *   `SCHEDULE_RAIL_CAP` at 5°.
 * - **The righting moment about the feet still turns over past about 18°, but by a twentieth of what was read**
 *   (K per roll at 7 m/s: −283, −121, −45, +40, +54, +70, against 3.2f's −285, −180, +250, +286, +435), and at 5 m/s
 *   it stays righting at every rail.
 *
 * **The standing rule this table is kept under (ruling 29t): a captive hold's number is not used until the hold is
 * shown settled.** Each number here is a whole second's mean at the end of a ten-second hold, and the probe prints a
 * ladder against how long the hold has run beside every one, so a reader can see it settled rather than be told. The
 * few cells that were still moving after ten seconds carry a comment saying so; they are the 30° and 40° rows whose
 * trim 3.2f had already flagged as the least steady.
 *
 * - **Measured:** every point here. 5 m/s at 30° and 40° is missing: the board does not hold a turn there (at 30° the
 *   run goes non-finite, at 40° it spins out to 71° of sideslip and sinks). At 5 m/s the rail is clamped to 20°.
 * - The 0° rows are **this method's own**, not `PLANT_SPEEDS`'. `railCorrection` adds the difference from the 0° row to
 *   `PLANT_SPEEDS`, so straight running is untouched and the rail's effect is internally consistent. Rail 0 reproduces
 *   `PLANT_SPEEDS` within 1 % on eleven of the twelve; the twelfth, the side force per yaw rate, differs because
 *   `PLANT_SPEEDS` takes it one-sided (46 against 63 at 7 m/s) and this is a central difference. That derivative is
 *   noticeably non-linear in the yaw rate even at no rail.
 * - A symmetric hull's derivatives are even in the rail (the mirror flips the state and the moments together), so the
 *   table is read at |rail|.
 */
export interface RailPlant { roll: number[]; slip: number[]; yaw: number[]; rate: number[]; trimYaw: number; trimSlipDeg: number; pull: number | null }
export const RAIL_PLANT: Record<string, RailPlant> = {
  '5|0': { roll: [-97.9,-360.7,-312.6], slip: [-28.5,712,-278.7], yaw: [-3.3,9.3,-7.7], rate: [-1.5,-14.1,-0.6], trimYaw: 0, trimSlipDeg: 0, pull: null },
  '5|10': { roll: [-31.8,-454.8,-80.6], slip: [-119.4,521,-167], yaw: [-5.5,9.8,-7.7], rate: [-0.8,-8.9,-3.3], trimYaw: -0.2925, trimSlipDeg: -3.513, pull: 0.845 },
  '5|15': { roll: [-105.9,-553,-67.8], slip: [-216.8,250.1,43.9], yaw: [-8.7,7.8,-7.4], rate: [3.1,-2.2,-3], trimYaw: -0.4527, trimSlipDeg: -5.286, pull: 0.861 },
  '5|20': { roll: [-171.3,-633.3,-81.8], slip: [-308,107.1,76], yaw: [-12.6,8.4,-8.4], rate: [0.9,1.9,-1.8], trimYaw: -0.5903, trimSlipDeg: -7.222, pull: 0.827 },
  '7|0': { roll: [-103.6,-408.8,-282.5], slip: [-296.2,1408.7,-539.5], yaw: [-13.1,46.1,-21], rate: [2.8,-19.8,-1.3], trimYaw: 0, trimSlipDeg: 0, pull: null },
  '7|10': { roll: [-86.2,-455.1,-134.1], slip: [-406.8,936.4,-212.5], yaw: [-17.7,28.3,-8.6], rate: [3.7,-12.8,-4.3], trimYaw: -0.2164, trimSlipDeg: -1.503, pull: 0.876 }, // held 10 s and still moving: roll, rate
  '7|15': { roll: [-105.5,-587.5,-44.9], slip: [-514.3,404.9,131], yaw: [-24.7,15.2,-7.2], rate: [5.5,-5.5,-6.2], trimYaw: -0.3213, trimSlipDeg: -2.286, pull: 0.856 },
  '7|20': { roll: [-173.5,-758.8,40.5], slip: [-647.1,-187.6,486.9], yaw: [-25.9,-11.3,12.9], rate: [9.8,-1.4,-4.9], trimYaw: -0.4309, trimSlipDeg: -3.314, pull: 0.845 },
  '7|30': { roll: [-312.9,-988.3,39.6], slip: [-888.6,-794.7,532.8], yaw: [-42.8,-7.8,-4.2], rate: [11.9,4.4,-3.6], trimYaw: -0.6778, trimSlipDeg: -5.636, pull: 0.838 },
  '7|40': { roll: [-223.4,-1151.2,60.3], slip: [-368.4,-576.1,422.5], yaw: [-38.9,-3.4,-5.6], rate: [5.3,6.2,-4.2], trimYaw: -0.9685, trimSlipDeg: -9.088, pull: 0.824 },
  '9|0': { roll: [-121.3,-417.2,-284.5], slip: [-600.3,2274.4,-833.6], yaw: [-23.5,71.5,-29.4], rate: [5.4,-24.6,-2.4], trimYaw: 0, trimSlipDeg: 0, pull: null }, // held 10 s and still moving: roll
  '9|10': { roll: [-94.5,-405.7,-146.3], slip: [-717.9,1581.8,-127.8], yaw: [-29.7,45.8,-9.7], rate: [6.7,-16.9,-6.6], trimYaw: -0.1663, trimSlipDeg: -0.895, pull: 0.865 }, // held 10 s and still moving: slip
  '9|15': { roll: [-151.4,-489.2,-84.6], slip: [-766.3,589.4,629.2], yaw: [-34,17.3,9.6], rate: [10.1,-10.4,-7.2], trimYaw: -0.2422, trimSlipDeg: -1.52, pull: 0.829 },
  '9|20': { roll: [-225.1,-656.8,20.7], slip: [-896,-151.6,740.5], yaw: [-39,-5.6,13.2], rate: [16.3,-5.4,-6.8], trimYaw: -0.3194, trimSlipDeg: -2.325, pull: 0.805 },
  '9|30': { roll: [-422.5,-985.3,76.6], slip: [-891.4,-547.5,525.8], yaw: [-46.4,-17.8,5.7], rate: [34.6,6.8,-6.2], trimYaw: -0.4878, trimSlipDeg: -4.737, pull: 0.775 }, // held 10 s and still moving: slip
  '9|40': { roll: [-488.9,-1247.6,47.4], slip: [-766,-537.2,314.5], yaw: [-52.5,-22.4,1.8], rate: [44.8,13.7,-4.8], trimYaw: -0.6924, trimSlipDeg: -7.919, pull: 0.757 },
};
export const RAIL_SPEEDS = [5, 7, 9];
export const RAIL_ANGLES = [0, 10, 15, 20, 30, 40];
/** The largest rail the table has at a speed, rad (5 m/s stalls above 20°). */
export function railLimit(speed: number): number {
  const most = speed < 6 ? 20 + ((speed - 5) / 1) * 20 : 40;
  return (Math.min(40, Math.max(10, most)) * Math.PI) / 180;
}
/**
 * The rail's correction to the twelve derivatives at a speed, as differences from the same method's 0° row: the straight
 * table (`PLANT_SPEEDS`, all 17 speeds) is left exactly as it was, and the rail only adds. Linear in the rail between
 * the table's angles and in the speed between 5, 7 and 9 m/s, held outside.
 */
export function railCorrection(speed: number, rail: number): { roll: number[]; slip: number[]; yaw: number[]; rate: number[] } {
  return correctionIn(RAIL_PLANT, speed, rail);
}
/** The twelve derivatives a rail table carries, in the lab's axes (`railCorrection`'s and `frozenCorrection`'s shape). */
type Twelve = { roll: number[]; slip: number[]; yaw: number[]; rate: number[] };
/**
 * `railCorrection`'s own body, over whichever table is given: the free one (`RAIL_PLANT`, the shipped ten-state plant)
 * or the held one (`FROZEN_PLANT`, the plant a controller that carries heave and pitch must read). The arithmetic is
 * unchanged, so the free path is bit-for-bit what it was.
 */
function correctionIn<T extends Twelve>(table: Record<string, T>, speed: number, rail: number): Twelve {
  const deg = (Math.min(railLimit(speed), Math.abs(rail)) * 180) / Math.PI;
  const zero = { roll: [0, 0, 0], slip: [0, 0, 0], yaw: [0, 0, 0], rate: [0, 0, 0] };
  if (deg <= 0) return zero;
  const v = Math.max(RAIL_SPEEDS[0], Math.min(RAIL_SPEEDS[RAIL_SPEEDS.length - 1], speed));
  let i = 0;
  while (i < RAIL_SPEEDS.length - 2 && v > RAIL_SPEEDS[i + 1]) i += 1;
  const fv = (v - RAIL_SPEEDS[i]) / (RAIL_SPEEDS[i + 1] - RAIL_SPEEDS[i]);
  let j = 0;
  while (j < RAIL_ANGLES.length - 2 && deg > RAIL_ANGLES[j + 1]) j += 1;
  const fa = (deg - RAIL_ANGLES[j]) / (RAIL_ANGLES[j + 1] - RAIL_ANGLES[j]);
  // At a speed whose row is missing (5 m/s above 20°), that speed's largest measured angle stands in.
  const pick = (sp: number, angle: number): T | undefined => {
    let a = angle;
    while (a > 0 && !table[`${sp}|${a}`]) a -= 10;
    return table[`${sp}|${a}`] ?? table[`${sp}|0`];
  };
  const at = (sp: number) => {
    const lo = pick(sp, RAIL_ANGLES[j])!;
    const hi = pick(sp, RAIL_ANGLES[j + 1])!;
    const base = table[`${sp}|0`];
    const mix = (k: 'roll' | 'slip' | 'yaw' | 'rate') => lo[k].map((x, q) => x + fa * (hi[k][q] - x) - base[k][q]);
    return { roll: mix('roll'), slip: mix('slip'), yaw: mix('yaw'), rate: mix('rate') };
  };
  const a = at(RAIL_SPEEDS[i]);
  const b = at(RAIL_SPEEDS[i + 1]);
  const mix = (k: 'roll' | 'slip' | 'yaw' | 'rate') => a[k].map((x, q) => x + fv * (b[k][q] - x));
  return { roll: mix('roll'), slip: mix('slip'), yaw: mix('yaw'), rate: mix('rate') };
}
/** The turn's pull over what the rail's own lean would balance (`pull`), at a speed and rail: 1 at no rail. */
export function railPull(speed: number, rail: number): number {
  const deg = (Math.min(railLimit(speed), Math.abs(rail)) * 180) / Math.PI;
  if (deg <= 0) return 1;
  const v = Math.max(RAIL_SPEEDS[0], Math.min(RAIL_SPEEDS[RAIL_SPEEDS.length - 1], speed));
  let i = 0;
  while (i < RAIL_SPEEDS.length - 2 && v > RAIL_SPEEDS[i + 1]) i += 1;
  const fv = (v - RAIL_SPEEDS[i]) / (RAIL_SPEEDS[i + 1] - RAIL_SPEEDS[i]);
  let j = 0;
  while (j < RAIL_ANGLES.length - 2 && deg > RAIL_ANGLES[j + 1]) j += 1;
  const fa = (deg - RAIL_ANGLES[j]) / (RAIL_ANGLES[j + 1] - RAIL_ANGLES[j]);
  const one = (sp: number, angle: number): number => {
    let a = Math.max(10, angle);
    while (a > 10 && !RAIL_PLANT[`${sp}|${a}`]) a -= 10;
    return RAIL_PLANT[`${sp}|${a}`]?.pull ?? 0.85;
  };
  const a = one(RAIL_SPEEDS[i], RAIL_ANGLES[j]) + fa * (one(RAIL_SPEEDS[i], RAIL_ANGLES[j + 1]) - one(RAIL_SPEEDS[i], RAIL_ANGLES[j]));
  const b = one(RAIL_SPEEDS[i + 1], RAIL_ANGLES[j]) + fa * (one(RAIL_SPEEDS[i + 1], RAIL_ANGLES[j + 1]) - one(RAIL_SPEEDS[i + 1], RAIL_ANGLES[j]));
  return a + fv * (b - a);
}

/**
 * **The water's derivatives with the board's heave and pitch HELD TOO** (step 3.2p; the `frozen` set of
 * `../../docs/research/new-rider/rail-dig/settled.probe.ts`, `results/settled.jsonl`, measured for step 3.2m).
 *
 * Same lab, same trim, same axes and the same settling rule as `RAIL_PLANT` above, with two more constraints: the
 * board's pitch and the centre of mass's height are held at the trim as well. That leaves the board no free degree of
 * freedom at all, so the water's force is a function of the state with no transient to wait for — **every number here
 * is constant to the digit from 0.35 s of hold to 4 s**, which is why the settling rule is trivially met (3.2m §2.3).
 *
 * **This is the table a controller that carries heave and pitch as states must read, and `RAIL_PLANT` is not.**
 * `RAIL_PLANT`'s numbers are the water's answer *plus* the board's whole re-trim, folded in as if it arrived at once;
 * carrying the states and reading the free table would count the re-trim twice. `HEAVE_PLANT` is the other half of the
 * same measurement — what the water does per metre of heave and per radian of pitch — which is what the folding threw
 * away, and 3.2m showed the folding is ill conditioned anyway (the free derivative is the residual of terms ten to
 * eighteen times its own size).
 *
 * As with `RAIL_PLANT`, 5 m/s has no 30° or 40° row: the board does not hold a turn there.
 * `pitchTrim` is the board's nose-up trim at that point, degrees — a read-out, nothing reads it.
 */
export const FROZEN_PLANT: Record<string, Twelve & { pitchTrim: number }> = {
  '5|0': { roll: [-101.8, -354.6, -328.1], slip: [-28.7, 712, -278.8], yaw: [-3.3, 9.3, -7.7], rate: [-1.5, -14.1, -0.6], pitchTrim: 19.33 },
  '5|10': { roll: [3.8, -367.4, -86.7], slip: [-29.1, 767.6, -175.3], yaw: [-4.7, 12.2, -7.2], rate: [-1.6, -10, -2.8], pitchTrim: 18.57 },
  '5|15': { roll: [47.7, -309.9, -86], slip: [-16.2, 827.2, -120.5], yaw: [-6.3, 13.5, -6.7], rate: [-2.1, -4.4, -4], pitchTrim: 18.77 },
  '5|20': { roll: [118.9, -110.7, -114.8], slip: [-8.2, 884.3, -51.7], yaw: [-8.4, 16.3, -6.1], rate: [-2.8, 0.4, -3], pitchTrim: 18.64 },
  '7|0': { roll: [-105.6, -404.3, -294.5], slip: [-296.4, 1408.9, -540], yaw: [-13.1, 46.1, -21], rate: [2.8, -19.8, -1.3], pitchTrim: 9.19 },
  '7|10': { roll: [-7.5, -104.3, -354.9], slip: [-279.8, 1542.4, -276.9], yaw: [-15.7, 45.3, -12.6], rate: [3.5, -12.9, -4.5], pitchTrim: 8.84 },
  '7|15': { roll: [118.7, -55.2, -125.6], slip: [-252.9, 1684.9, -107.2], yaw: [-18, 44.2, -7.8], rate: [4.2, -4.6, -6], pitchTrim: 8.84 },
  '7|20': { roll: [239.4, 386, -275.6], slip: [-220.4, 1816.1, 58.8], yaw: [-19, 43.1, -3.4], rate: [4.7, 4, -6.6], pitchTrim: 9.29 },
  '7|30': { roll: [243.1, 574.9, -37.5], slip: [-146.9, 2081.3, 201], yaw: [-24.1, 43.2, -2.1], rate: [4.5, 21.5, -5.7], pitchTrim: 9.97 },
  '7|40': { roll: [563.5, 1701.2, 15.3], slip: [-47.1, 2229.1, 253.5], yaw: [-31.3, 43.5, -3.2], rate: [2.9, 35.3, -4], pitchTrim: 10.55 },
  '9|0': { roll: [-89.8, -439.5, -169.7], slip: [-598.9, 2290.3, -871.5], yaw: [-23.5, 71.2, -30.4], rate: [5.4, -24.8, -1.9], pitchTrim: 5.84 },
  '9|10': { roll: [13.3, -9.4, -300.9], slip: [-565.2, 2469.3, -315.4], yaw: [-26.5, 67.8, -13.3], rate: [6.4, -16.3, -6.2], pitchTrim: 5.65 },
  '9|15': { roll: [108.8, 345.6, -255.8], slip: [-512.4, 2637.2, 95.9], yaw: [-27.6, 63.6, -2], rate: [7.1, -9, -8], pitchTrim: 6.03 },
  '9|20': { roll: [60.6, 800.6, -155], slip: [-439.3, 2699.8, 400.7], yaw: [-27.2, 57.6, 4.5], rate: [7.6, -3, -8], pitchTrim: 6.59 },
  '9|30': { roll: [276.9, 1695.7, 16.4], slip: [-289.8, 2723.2, 543.1], yaw: [-24.8, 47.5, 5.6], rate: [9, 2.9, -5.3], pitchTrim: 7.83 },
  '9|40': { roll: [34.5, 2888, 186.6], slip: [-167.6, 2699.2, 483.7], yaw: [-27.2, 44.3, 2.4], rate: [5.7, 18.3, -2.8], pitchTrim: 8.5 },
};
/**
 * **What the water does to the board's heave and pitch** (the same `frozen` rows): [N, Y, K, M, Z] per metre of heave
 * (+ up), per m/s of heave rate, per rad of pitch (nose up +) and per rad/s of pitch rate, in the **lab's** axes; and
 * `vert`, the [M, Z] the four states the ten-state model already carries make (per rad of roll, per rad of slip, per
 * rad/s of yaw rate, per rad/s of roll rate). `heavePlantAt` turns them into the model's axes.
 *
 * The two numbers that matter most, and they are why this block exists:
 * - **Z per metre of heave** is −701 / −3910 / −9065 N/m at 5 / 7 / 9 m/s: with the pair's 75.5 kg that is a heave
 *   stiffness of 9 / 52 / 120 s⁻², and Z per m/s of heave rate (−364 / −539 / −703) damps it at about half critical.
 * - **M per rad of pitch** is −1770 / −953 / −498 N·m/rad against a pitch inertia of about 52 kg·m², so the board's
 *   pitch is a 0.9 / 0.68 / 0.49 Hz pendulum — and **M per rad/s of pitch rate is only −8 to −48 N·m·s/rad**, a damping
 *   ratio of two to five per cent. That lightly damped pitch is the 0.33–0.74 Hz mode 3.2m found the loop running
 *   open, and it is the mode this step gives the rider a sense of.
 * - At no rail the cross terms are zero by the hull's own symmetry (a roll or a slide makes no net M or Z), as measured.
 */
export interface HeaveRow { heave: number[]; heaveRate: number[]; pitch: number[]; pitchRate: number[]; vert: { roll: number[]; slip: number[]; yaw: number[]; rate: number[] } }
export const HEAVE_PLANT: Record<string, HeaveRow> = {
  '5|0': {
    heave: [0, 0, 0, -1648.2, -701.2], heaveRate: [0, 0, 0, 7.4, -364.4],
    pitch: [0, 0, 0, -1769.7, 319.3], pitchRate: [0, 0, 0, -7.7, 72.8],
    vert: { roll: [0, 0], slip: [0, 0], yaw: [0, 0], rate: [0, 0] },
  },
  '5|10': {
    heave: [153.6, 386.2, -161.6, -1104.8, -582.5], heaveRate: [1.7, 39.3, 7.5, -6.6, -334.3],
    pitch: [42, 47.2, -40, -283.7, 556.9], pitchRate: [4.5, -19.1, 2.5, -11.9, 82.5],
    vert: { roll: [155.1, -628.1], slip: [407.4, -1516.7], yaw: [7.9, -26.4], rate: [-10.6, -1] },
  },
  '5|15': {
    heave: [339.7, 724.5, -196.3, -1371.1, -750.7], heaveRate: [0.9, 56.7, 6.6, -12.1, -294.9],
    pitch: [227.2, 192.9, 1.1, -593.8, 478.9], pitchRate: [6.8, -28.9, 2.2, -14.6, 96.4],
    vert: { roll: [34.5, -713.7], slip: [439.9, -1731.2], yaw: [9.2, -33], rate: [-13, -11.4] },
  },
  '5|20': {
    heave: [430.8, 861.4, -176.1, -1280.5, -815.6], heaveRate: [2.8, 70.1, 11.3, -18.5, -269.2],
    pitch: [258, 248.5, 0.7, -542.9, 308.5], pitchRate: [10.5, -37.8, 3.2, -19.9, 99.1],
    vert: { roll: [-164.2, -930.1], slip: [443.8, -1784.9], yaw: [13.4, -38.7], rate: [-11.9, -23.9] },
  },
  '7|0': {
    heave: [0, 0, 0, -1566.6, -3910.4], heaveRate: [0, 0, 0, -23.3, -538.5],
    pitch: [0, 0, 0, -953, -357.2], pitchRate: [0, 0, 0, -11.2, 17.3],
    vert: { roll: [0, 0], slip: [0, 0], yaw: [0, 0], rate: [0, 0] },
  },
  '7|10': {
    heave: [418, 1009.8, -302.8, -2108.7, -3478.6], heaveRate: [13.2, 70.2, 6.1, -31.8, -462.1],
    pitch: [53.4, 37.2, -183.2, -631.2, 900.7], pitchRate: [7, -10.1, 3.7, -16.2, 33.3],
    vert: { roll: [-323.4, -1042], slip: [750.7, -3038.4], yaw: [30.3, -86], rate: [-14.3, 0.5] },
  },
  '7|15': {
    heave: [465.7, 1370.4, -579.8, -1826.6, -1998.3], heaveRate: [17.1, 98.2, 7.9, -37.4, -410.2],
    pitch: [277.8, 67.8, -77, -907.9, 973.6], pitchRate: [11.1, -16.2, 4.5, -20.3, 45.1],
    vert: { roll: [-383.5, -1297.9], slip: [815.4, -3843.2], yaw: [35.3, -104.4], rate: [-17.2, -8.8] },
  },
  '7|20': {
    heave: [625.3, 1676.1, -466.9, -1822.3, -2157], heaveRate: [19.2, 116, 8.1, -38.5, -356.3],
    pitch: [304.8, 82.3, -78.8, -850.4, 814.2], pitchRate: [15.4, -23.6, 3.9, -25.6, 60.5],
    vert: { roll: [-628.8, -1656.5], slip: [808.7, -3986.6], yaw: [37.3, -101.3], rate: [-18.2, -22.7] },
  },
  '7|30': {
    heave: [915.7, 3008.6, -351.8, -1934.9, -3472.6], heaveRate: [20.5, 136.5, 9.6, -42.9, -271.6],
    pitch: [253.8, -321.3, -1.4, -495.3, 1043.4], pitchRate: [26, -39.6, 4.3, -37.5, 73],
    vert: { roll: [-385.3, -2008.4], slip: [640.5, -3577.5], yaw: [40.3, -81.1], rate: [-19.5, -44.5] },
  },
  '7|40': {
    heave: [357.6, 3989.4, -287.2, -816.8, -4030.8], heaveRate: [18.6, 142.9, 10.3, -41.4, -204.8],
    pitch: [614, 284.9, 39.9, -918.8, 253.5], pitchRate: [36.5, -53.8, 3.9, -48.3, 72.6],
    vert: { roll: [-795.9, -2903.3], slip: [417.9, -2866.6], yaw: [45.1, -61.3], rate: [-19.3, -52.6] },
  },
  '9|0': {
    heave: [0, 0, 0, -3535.9, -9064.7], heaveRate: [0, 0, 0, -33.5, -702.5],
    pitch: [0, 0, 0, -498.1, 2122.5], pitchRate: [0, 0, 0, -16.3, -4.7],
    vert: { roll: [0, 0], slip: [0, 0], yaw: [0, 0], rate: [0, 0] },
  },
  '9|10': {
    heave: [532.6, 1781.2, -625.7, -2848.3, -6540.9], heaveRate: [19.4, 92.2, 6.1, -36.1, -588.1],
    pitch: [168.8, -115.4, -55.7, -962.3, 1862.4], pitchRate: [9.2, -5.6, 5.7, -21.7, 13.8],
    vert: { roll: [-398.7, -1501.3], slip: [1090.8, -4470.6], yaw: [42, -113.9], rate: [-14.1, -6.5] },
  },
  '9|15': {
    heave: [541.6, 2525.4, -694.9, -2272.2, -6012.9], heaveRate: [23.5, 116.4, 11.3, -36.2, -506.4],
    pitch: [262.3, -171.5, -23.1, -1031.9, 1758.5], pitchRate: [14.5, -11.7, 6.7, -28.4, 29.8],
    vert: { roll: [-502.7, -2194.6], slip: [1266.6, -5825.6], yaw: [50.1, -140.2], rate: [-16.3, -11.9] },
  },
  '9|20': {
    heave: [553.9, 3289.9, -440, -1820.8, -6593.6], heaveRate: [24.5, 125.9, 16.2, -34.7, -424.2],
    pitch: [258.6, -607.9, 63.8, -827.9, 2155.7], pitchRate: [18.7, -18.6, 5.7, -33.8, 45.2],
    vert: { roll: [-272.1, -3045], slip: [1172.2, -6024.8], yaw: [49.1, -133], rate: [-16.8, -18.4] },
  },
  '9|30': {
    heave: [532.4, 4127.8, -59.9, -1203.5, -6264.6], heaveRate: [23.3, 117.9, 18.2, -34.6, -267.5],
    pitch: [684.5, -282.4, 66.8, -1386.3, 1225], pitchRate: [20.3, -31, 0.5, -30.9, 58.4],
    vert: { roll: [-523.7, -3899.9], slip: [887.5, -4962.8], yaw: [41.1, -92.2], rate: [-20.1, -20.1] },
  },
  '9|40': {
    heave: [683.7, 5509.2, 275.7, -1143.1, -6455.6], heaveRate: [16.5, 122.9, 16.1, -27.5, -194.7],
    pitch: [936.9, -258.4, -3.7, -1502.3, 1022.8], pitchRate: [27.3, -47, -0.6, -37.3, 64.1],
    vert: { roll: [-51.9, -4791.6], slip: [584.4, -3668.6], yaw: [39.8, -63.7], rate: [-16.1, -35.7] },
  },
};
/**
 * The held table's rail correction, in exactly the form `railCorrection` uses: the straight table (`PLANT_SPEEDS`) is
 * the anchor at no rail and the rail only adds, so straight running is untouched whichever table is read. At no rail
 * the two tables agree to within 2 % on every one of the twelve (the biggest gap at 7 m/s is the roll moment per rad of
 * roll, −294.5 against −282.5), which is what makes one anchor legitimate for both.
 */
export function frozenCorrection(speed: number, rail: number): Twelve {
  return correctionIn(FROZEN_PLANT, speed, rail);
}
/** The reference rider and board the heave block's inertia is built from: 73 kg on a 2.54 kg board, 0.60 kg·m² in pitch. */
const RIDER_MASS = 73;
const BOARD_MASS = 2.54;
const BOARD_PITCH_INERTIA = 0.6;
/**
 * The water's answer to the board's heave and pitch at a speed, rail and stance (`HEAVE_PLANT`), in the model's axes:
 * N and Y flip as every other N and Y does, K, M and Z keep, and the yaw rate's own variable flips so the [M, Z] it
 * makes flips with it (`boardDerivatives`' mapping, which is a half turn about the board's long axis). Linear in the
 * rail between the table's angles and in the speed between 5, 7 and 9 m/s, held outside, as the rail table is read.
 *
 * `mass` and `pitchInertia` are the **pair's**, about the deck under the rider: this model gives the rider no heave or
 * pitch freedom of its own, so the rider and the board move as one (step 3.2m's `heaveOf`, reproduced here).
 */
export function heavePlantAt(speed: number, rail: number, height: number): HeavePlant {
  const deg = (Math.min(railLimit(speed), Math.abs(rail)) * 180) / Math.PI;
  const v = Math.max(RAIL_SPEEDS[0], Math.min(RAIL_SPEEDS[RAIL_SPEEDS.length - 1], speed));
  let i = 0;
  while (i < RAIL_SPEEDS.length - 2 && v > RAIL_SPEEDS[i + 1]) i += 1;
  const fv = (v - RAIL_SPEEDS[i]) / (RAIL_SPEEDS[i + 1] - RAIL_SPEEDS[i]);
  let j = 0;
  while (j < RAIL_ANGLES.length - 2 && deg > RAIL_ANGLES[j + 1]) j += 1;
  const fa = (deg - RAIL_ANGLES[j]) / (RAIL_ANGLES[j + 1] - RAIL_ANGLES[j]);
  const pick = (sp: number, angle: number): HeaveRow => {
    let a = angle;
    while (a > 0 && !HEAVE_PLANT[`${sp}|${a}`]) a -= 10;
    return HEAVE_PLANT[`${sp}|${a}`] ?? HEAVE_PLANT[`${sp}|0`];
  };
  const at = (sp: number) => {
    const lo = pick(sp, RAIL_ANGLES[j]);
    const hi = pick(sp, RAIL_ANGLES[j + 1]);
    const five = (k: 'heave' | 'heaveRate' | 'pitch' | 'pitchRate') => lo[k].map((x, q) => x + fa * (hi[k][q] - x));
    const two = (k: 'roll' | 'slip' | 'yaw' | 'rate') => lo.vert[k].map((x, q) => x + fa * (hi.vert[k][q] - x));
    return {
      heave: five('heave'), heaveRate: five('heaveRate'), pitch: five('pitch'), pitchRate: five('pitchRate'),
      vert: { roll: two('roll'), slip: two('slip'), yaw: two('yaw'), rate: two('rate') },
    };
  };
  const a = at(RAIL_SPEEDS[i]);
  const b = at(RAIL_SPEEDS[i + 1]);
  const five = (k: 'heave' | 'heaveRate' | 'pitch' | 'pitchRate') => a[k].map((x, q) => x + fv * (b[k][q] - x));
  const two = (k: 'roll' | 'slip' | 'yaw' | 'rate') => a.vert[k].map((x, q) => x + fv * (b.vert[k][q] - x));
  // The model's axes: N and Y flip, K, M and Z keep.
  const flip = (d: number[]) => [-d[0], -d[1], d[2], d[3], d[4]];
  const yaw = two('yaw');
  return {
    mass: RIDER_MASS + BOARD_MASS,
    pitchInertia: RIDER_MASS * height * height + BOARD_PITCH_INERTIA + BOARD_MASS * 0.08 * 0.08,
    perHeave: flip(five('heave')), perHeaveRate: flip(five('heaveRate')),
    perPitch: flip(five('pitch')), perPitchRate: flip(five('pitchRate')),
    pitchVert: { roll: two('roll'), slip: two('slip'), yaw: [-yaw[0], -yaw[1]], rate: two('rate') },
  };
}

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
export function plantAt(speed: number, depth: number, opts: { rollInertia?: number; yawInertia?: number; twistStiffness?: number; twistDamping?: number; scales?: number[]; feetScale?: number; rail?: number; heave?: HeavePlant; sink?: boolean } = {}): { y: YawPlant; t: TwistPlant } {
  const lab = labAt(speed);
  const s = opts.scales ?? new Array<number>(12).fill(1);
  // Step 3.2f: the rail's own correction (`railCorrection`), so the schedule covers carving as it covers speed and stance.
  // Step 3.2p: `sink` reads the HELD table instead (`frozenCorrection`) and carries the board's heave and pitch as four
  // more states, which is the only consistent pair: the free table has the re-trim folded in already.
  const c = opts.sink ? frozenCorrection(speed, opts.rail ?? 0) : railCorrection(speed, opts.rail ?? 0);
  const scaled = { roll: lab.roll.map((x, k) => (x + c.roll[k]) * s[k]), slip: lab.slip.map((x, k) => (x + c.slip[k]) * s[3 + k]), yaw: lab.yaw.map((x, k) => (x + c.yaw[k]) * s[6 + k]), rate: lab.rate.map((x, k) => (x + c.rate[k]) * s[9 + k]) };
  const st = stanceAt(depth);
  const heave = opts.heave ?? (opts.sink ? heavePlantAt(speed, opts.rail ?? 0, st.height) : undefined);
  const board = boardInertiaAt(speed);
  const y: YawPlant = {
    speed, boardRollInertia: opts.rollInertia ?? board.roll, boardYawInertia: opts.yawInertia ?? board.yaw, riderYawInertia: st.lower, boardMass: 2.54,
    mass: 73, height: st.height, ankleStiffness: 800, ankleDamping: 80, ...boardDerivatives(scaled, speed, 0.236),
    feetForward: ((opts.feetScale ?? 1) * FEET_FORWARD_AT_7 * lab.drag) / DRAG_AT_7, feetStation: -0.244, deckHeight: 0.031,
    // The board's heave and pitch as states (ruling 29t item 2), when the caller supplies the water's answer to them or
    // asks for the measured one (`sink`, step 3.2p). Without either, the plant is the ten-state one it always was.
    ...(heave ? { heave } : {}),
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
  /**
   * **The largest acceptable capture point across, m** (step 3.2j, ruling 29n): the cost on where the body's weight
   * sits over its feet. Omitted or 0: none, which is what every design before 3.2j had.
   *
   * The capture point across is **not a new state** — on this plant the body is a point mass on its leg, so it is the
   * linear functional ξ = L (θ + θ̇/ω₀) of two states the loop already carries (`captureRow`). What the loop was missing
   * is not the measurement but the **cost**: a diagonal Q penalises θ² and θ̇² separately and never the cross term
   * 2 θ θ̇ / ω₀, and that cross term is the whole difference between a bank that is coming back and one that is going
   * over. Weighting ξ² adds it, as a rank-one term.
   */
  captureScale?: number;
  /**
   * **The feet's half-width, m** (step 3.2n, ruling 29w item 2; the owner's "the balance is too soft when lowered").
   * When given, the bank's own cost stops being one angle for every stance and becomes **each stance's own limit**.
   *
   * `stateScale[2]` is the largest acceptable bank, in radians, and one number served all three stances: 0.05 rad,
   * 2.9°. But the lean at which a stance runs out of feet is not an angle, it is a distance: the capture point
   * ξ = L (θ + θ̇/ω₀) leaves the feet at `feetReach`, so the lean that reaches the edge is `feetReach / L` and it is
   * **8.9° standing, 11.5° crouched and 13.5° in Compress** (`3.2/README.md` Part 12 §11.4). A single 2.9° told the
   * designer all three stances have the same room, when the lowest has 53 % more than the tallest — and the owner can
   * feel it: he reached for the stance that should save him and it dropped him.
   *
   * It also sets the capture point's own cost (`captureScale`) to the same metres unless that is given separately,
   * which is what carries the **cross term** between the bank and its rate at each stance's own ω₀ = √(g/L) — the
   * difference between a bank that is coming back and one that is going over. A low stance falls faster (ω₀ 4.22
   * against 3.42) and the fixed 0.1 s delay is a larger share of its time constant (0.42 against 0.34), so that is
   * exactly where the cross term matters most and where a diagonal cost in radians cannot express it.
   */
  feetReach?: number;
  /**
   * The largest acceptable heave, heave rate, pitch and pitch rate (m, m/s, rad, rad/s), used only when the plant
   * carries them as states (`YawPlant.heave`, ruling 29t item 2). **Omitted, and omitted by default, they carry no
   * cost at all** — the states are carried so their dynamics are right, and not steered, because this balance has no
   * command that reaches them (`design`, step 3.2p: a cost on them asks for a gain that cannot exist, and at no rail
   * at 5 and 9 m/s the Riccati equation answers with a non-finite one).
   */
  heaveScale?: number[];
  /** The process noise on the heave rate and the pitch rate per √s; the slip's by default. */
  heaveNoise?: number;
  /**
   * **The board's heave and pitch sensed** (step 3.2p, ruling 29w item 1). With this set, the plant carries the
   * board's heave and pitch as four more states (the held table, `plantAt`'s `sink`) **and the rider feels two of
   * them**: the load through the feet and the board's pitch rate (`senseMatrix`). Without it the four states are
   * carried but unsensed, which is what 3.2m measured and found worse than the ten-state loop — the loop runs the
   * board's own least damped mode open, and a frame of timing error takes it negative at almost every rail.
   *
   * It is not a switch over a tuning: with it the whole design changes, because the plant it is designed on changes.
   */
  heaveSense?: boolean;
  /**
   * The two new senses' noise: the load through the feet, m/s², and the board's pitch rate, rad/s.
   * `HEAVE_SENSE_NOISE` by default.
   */
  heaveSenseNoise?: number[];
  /**
   * **Which plant the LQR's gains are designed on** when the board's heave and pitch are carried (step 3.2p):
   * - `'free'` (the default): the **free** ten-state plant, which is the design that ships — `RAIL_PLANT`, the same
   *   numbers and the same gains 3.2m measured and the owner has ridden, padded with no gain on the four board states.
   * - `'held'`: the held fourteen-state plant the rest of the controller runs on.
   *
   * It is a split, and it is a measured one. The free derivatives are the water's answer **including** the board's own
   * re-trim; the held ones are its answer before the re-trim arrives. The re-trim is not slow compared with a turn:
   * the board's own heave-and-pitch mode is measured in the game at **1.0–1.4 Hz**, a period of 0.7–1.0 s, so by the
   * time a turn has developed it has happened. The gains act over that second; the predictor and the filter act over
   * the 0.1 s of the sensing delay, which is inside it. So each is designed on the plant it actually meets.
   *
   * Measured on the owner's test, which is why it is the default: designing the gains on the held plant makes the
   * rider fall at **0.55–0.93 s** (and 0.50–0.72 s with the senses on), against **1.10–3.43 s** for the gains that
   * ship. The difference is the plant, not the sense: it is the same either way with the senses switched off.
   */
  heaveGains?: 'free' | 'held';
}
/**
 * The two new senses' noise (step 3.2p):
 * - **the load, 1.1 m/s²** — measured, not chosen: the spread of the washed-out load the game hands the controller over
 *   a steady glide and a turn (`sink.probe.ts` PART=noise). The feet are a good force sense and a noisy one, because
 *   the hull's own patch sampling moves the load from substep to substep.
 * - **the pitch rate, 0.017 rad/s** — the same as the head's yaw rate already in `senseNoise`, because it is the same
 *   organ. (Benson, Hutt and Brown 1989 put the canals' threshold for an angular acceleration ramp at about 0.5–2 °/s²;
 *   this is the value the balance already uses for yaw and it is not re-derived here.)
 * Both are on the re-check list for two-way coupling.
 */
export const HEAVE_SENSE_NOISE = [1.1, 0.017];
export const DEFAULT_WEIGHTS: DesignWeights = {
  stateScale: [0.05, 0.5, 0.05, 0.25, 0.2, 0.02, 0.5, 1],
  // Step 3.2j (ruling 29n): the ankle's scale is its **actual range**, ANKLE_REST_RANGE 0.25 rad. It was 0.09 — 36 % of
  // the bound — and Bryson's rule is that the command's scale is the largest *acceptable* command, so the design was
  // being told the ankle may only give a third of what it has. That is why the loop asked for 3.8° at 11° of body bank
  // and reached its range only at about 40°, by which time the board was 50° over (`3.2/README.md` Part 9 §5).
  /**
   * The ankle's scale, rad. **It is 36 % of the ankle's actual range** (ANKLE_REST_RANGE 0.25), and Bryson's rule is
   * that a command's scale is the largest *acceptable* command — so the design is told the ankle may give a third of
   * what it has, which is why the loop asks 3.8° at 11° of body bank and reaches its range only near 40°, with the
   * board already 50° over (`3.2/README.md` Part 9 §5).
   *
   * Step 3.2j raised it to 0.25, with and without the capture point's cost, and **it is not kept**: on the model it buys
   * up to +65 % of disturbance margin at 5 m/s, and in the game **every variant that raises the ankle's gain collapses
   * the saved shove in the lower stances** — the crouch from 2.127 to 0.79–0.89 m/s and Compress from 2.326 to
   * 0.42–0.79, against a tall row that tolerates it. The model's own robustness warned (the delayed-sense damping at
   * 5 m/s −0.128 → −0.241), and the margin's gain comes from exactly the gain rise the shove bar refuses. Part 10 §4.
   */
  commandScale: [0.09, 30],
  rho: 10,
  // Step 3.2n: the feet's half-width, so the bank's cost is each stance's own limit rather than one 2.9 degrees for
  // all three (`feetReach`). 0.13 m is the half-width the rest of the rider already uses: the largest moment the feet
  // can apply is the load times it (`AttachedRider`'s note on LEAN_IN_RATE, m g d = 716 N x 0.13 m = 93 N.m), and it
  // is `bankAuthority`'s `footReach`. Measured: the gains fall most for the lowest stance (Compress -22 to -25 %
  // against tall's -10 %) and the margin against a frame of timing error rises at every one of the eighteen table
  // points, most for Compress (5 m/s, no rail: 0.036 to 0.052), with the nominal damping unchanged within 0.04.
  processNoise: [2, 1, 1, 0.2, 1],
  senseNoise: [0.017, 0.009, 0.017, 0.017, 0.05, 0.009, 0.02],
  bias: [0.01, 5],
  // Step 3.2p (ruling 29w item 1): the board's heave and pitch sensed - **built, measured, and OFF, because the plant
  // it needs is the wrong plant for this loop.** `heaveSense` is reachable as
  // BALANCE='{"weights":{"heaveSense":true}}'.
  //
  // What it buys, in the model: the four board states go from unobservable at no rail (rank 10 of 14, not
  // reconstructable at all) to rank 14 of 14 at every table point; the filter's error on the board's pitch falls from
  // 1.1-2.8 degrees to 0.18-0.35 and on its pitch rate from 5.7-11.4 deg/s to 1.7-1.9; and at the rails the schedule's
  // cap allows, a frame of timing error turns a growing mode into a decaying one (7 m/s, rail 10: -0.104 / -0.160 to
  // +0.016 / +0.058 tall). The pitch rate carries nearly all of that; the load alone barely helps.
  //
  // Why it is off: a sense is of a state, so the states have to be carried, and carrying them means reading the HELD
  // table (`FROZEN_PLANT`) - the free one has the re-trim folded in already. In the game the held table is worse in
  // every role it can take, measured on the owner's acceptance test: gains designed on it fall at 0.55-0.93 s, with
  // the senses 0.50-0.72 s, and with the shipped gains and the held plant only in the predictor and the filter
  // 0.47-1.68 s - against **1.10-3.43 s** for what ships. The cause is in the same measurement: the board's own
  // heave-and-pitch mode runs at **1.0-1.4 Hz in the game**, a period of 0.7-1.0 s, so a loop acting over a turn meets
  // the water's answer with the re-trim already in it, which is the free table. `3.2/README.md` Part 14.
  heaveSense: false,
  // The capture point's own cost is **off** (step 3.2j): 0.013 m is the tightest value at which the loop reaches the
  // ankle's bound at 5 m/s before the capture point leaves the feet, and the peak of the model's disturbance margin in
  // all three stances (tall 47.7 → 78.7 rad/s², crouch 48.2 → 78.9, Compress 48.4 → 73.1). In the game it costs the
  // crouch and Compress saved shove as above, so it stays a measured design and not the default. Part 10 §2 and §4.
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
/**
 * The capture point across as a row over the state, m per rad: ξ = L (θ + θ̇/ω₀) with L the centre of mass over the feet
 * and ω₀ = √(g/L) (Hof, Gazendam and Sinke 2005, on this plant's point-mass body). The feet can bring it back while it
 * is inside their half-width; past that the ankle has no authority left, whatever rest it is asked for.
 */
export function captureRow(y: YawPlant, gravity = 9.81, n = N_STATE): number[] {
  const row = new Array<number>(n).fill(0);
  row[2] = y.height;
  row[3] = y.height / Math.sqrt(gravity / y.height);
  return row;
}
export function design(y: YawPlant, t: TwistPlant, w: DesignWeights = DEFAULT_WEIGHTS, delay = PREDICT_DELAY, step = CONTROL_STEP): Design {
  const { a, b } = continuousPlant(y, t);
  const { phi, gamma } = discretise(a, b, step);
  // The state's size is the plant's, not this file's constant: ten as before, fourteen with the heave and pitch pair.
  const nState = a.length;
  const q = zeros(nState, nState);
  for (let i = 0; i < 8; i += 1) q[i][i] = 1 / (w.stateScale[i] * w.stateScale[i]);
  // The bank's cost as this stance's own limit, not one angle for every stance (`feetReach`): the lean at which the
  // capture point leaves the feet, feetReach / L.
  if (w.feetReach) {
    // **The ranking, not the level.** The physical limit is `feetReach / L`, which is 8.9 / 11.5 / 13.5 degrees for the
    // three stances against the one 2.9 degrees that served them all - but adopting those outright loosens every gain
    // three to five times and costs the standing stance its quarter-circle turn (measured: the held carve 2.13 s to
    // 1.12 s, and 90 degrees no longer reached). The level of `stateScale[2]` was set against the bars by earlier
    // rounds and is not what is wrong; what is wrong is that all three stances were given the same one. So the limit
    // keeps the tall stance's own value and scales with 1 / L from there, which is the same ratio the physics gives
    // (feetReach cancels) and leaves the tall design byte-identical.
    const bankLimit = w.stateScale[2] * (STANCE_TABLE[0].height / y.height);
    q[2][2] = 1 / (bankLimit * bankLimit);
  }
  // The heave and pitch states' own cost, when they are carried: **none by default, and that is not a loose weight,
  // it is the only weight the plant admits** (step 3.2p).
  //
  // This balance has two commands, the ankle across and the twist's torque. Neither can heave or pitch the board: in
  // the game the board's trim is held by a different loop, the pitch ankle (`StandingBody`), which is not part of
  // this controller. In the plant that shows up exactly: at no rail the hull's own symmetry makes a roll, a slide or a
  // yaw rate produce no net vertical force and no net pitching moment (measured, `HEAVE_PLANT`'s zero cross terms), so
  // **the four board states are uncontrollable there.** And the board's own heave-and-pitch pair is lightly unstable
  // at 5 m/s - measured in the game, 1.41 Hz growing at a damping ratio of −0.084, and the block agrees - so an
  // unstable mode no command reaches is not stabilisable. A cost on it asks the Riccati equation for a gain that
  // cannot exist, and it answers with a non-finite one: 3.2m's weight of 1 is why its own table reads `null` at 5 and
  // 9 m/s at no rail, and why the first build of this step dropped the rider in 0.2 s in straight running.
  //
  // With no cost on them the states are still carried, which is the whole point: the internal model predicts the
  // board sinking and pitching over the sensing delay, and the roll moment it feeds back depends on the heave at
  // −300 to −700 N·m per metre at a rail. The rider feels and anticipates the board; it does not pretend to steer it.
  // `heaveScale` remains for the sweep that measured this (`3.2/README.md` Part 14).
  if (nState > N_STATE && w.heaveScale) {
    const hs = w.heaveScale;
    for (let i = 0; i < nState - N_STATE; i += 1) q[N_STATE + i][N_STATE + i] = 1 / (hs[i] * hs[i]);
  }
  // The capture point's cost (step 3.2j): a rank-one term on ξ = L (θ + θ̇/ω₀), which is where the cross term between
  // the bank and its rate comes from. A diagonal Q cannot express it.
  // The capture point's cost, only when asked for outright: `feetReach` sets the bank's ranking and nothing else, so
  // that the tall stance's design does not move (step 3.2n).
  const capture = w.captureScale;
  if (capture) {
    const row = captureRow(y, 9.81, nState);
    const weight = 1 / (capture * capture);
    for (let i = 0; i < nState; i += 1) for (let j = 0; j < nState; j += 1) q[i][j] += weight * row[i] * row[j];
  }
  // The weights per step (the continuous cost sampled): Q T, R T.
  const qd = scale(q, step);
  const rd = [[(w.rho * step) / (w.commandScale[0] ** 2), 0], [0, (w.rho * step) / (w.commandScale[1] ** 2)]];
  const k = dlqr(phi, gamma, qd, rd);
  // The senses: seven, or nine when the plant carries the board's heave and pitch and the rider is given a sense of
  // them (step 3.2p). The load's row is the plant's own ẇ row, which is what the feet feel.
  const c = senseMatrix(nState, w.heaveSense && nState > N_STATE ? a[N_STATE + 1] : undefined);
  const nSense = c.length;
  const bias = w.bias.length === 2;
  const ne = bias ? nState + 2 : nState;
  // The estimate's model: the bias enters as the commands do, and stays.
  const phiE = zeros(ne, ne);
  const gammaE = zeros(ne, N_COMMAND);
  for (let i = 0; i < nState; i += 1) {
    for (let j = 0; j < nState; j += 1) phiE[i][j] = phi[i][j];
    for (let j = 0; j < N_COMMAND; j += 1) { gammaE[i][j] = gamma[i][j]; if (bias) phiE[i][nState + j] = gamma[i][j]; }
  }
  if (bias) { phiE[nState][nState] = 1; phiE[nState + 1][nState + 1] = 1; }
  const cE = c.map((row) => [...row, ...new Array<number>(ne - nState).fill(0)]);
  // The process noise enters the rates (φ̇, θ̇, r, β, ω_u), over a step; the bias as a random walk; the senses' noise as given.
  const g = zeros(ne, ne);
  const at = [1, 3, 4, 5, 7];
  for (let i = 0; i < at.length; i += 1) g[at[i]][at[i]] = w.processNoise[i] ** 2 * step;
  // The heave rate and the pitch rate take the same noise as the slip, so the filter does not trust them absolutely.
  if (nState > N_STATE) for (const i of [N_STATE + 1, N_STATE + 3]) g[i][i] = (w.heaveNoise ?? w.processNoise[3]) ** 2 * step;
  if (bias) { g[nState][nState] = w.bias[0] ** 2 * step; g[nState + 1][nState + 1] = w.bias[1] ** 2 * step; }
  for (let i = 0; i < ne; i += 1) g[i][i] += 1e-10;
  const v = zeros(nSense, nSense);
  const heaveNoise = w.heaveSenseNoise ?? HEAVE_SENSE_NOISE;
  for (let i = 0; i < nSense; i += 1) v[i][i] = (i < N_SENSE ? w.senseNoise[i] : heaveNoise[i - N_SENSE]) ** 2;
  const l = kalman(phiE, cE, g, v);
  const steps = Math.round(delay / step);
  let power = eye(nState);
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
  const n = truePhi.length; const p = d.c.length; const m = N_COMMAND;
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
/** Step 3.2f: the schedule's rails, rad (the measured table's angles). */
export const SCHEDULE_RAILS = RAIL_ANGLES.map((a) => (a * Math.PI) / 180);
const designCache = new Map<string, Design>();
/** The design at a table point (cached for the page; the default weights unless given). */
export function scheduledDesign(speed: number, depth: number, rail = 0, weights?: DesignWeights): Design {
  const key = `${speed}|${depth}|${r3(rail)}|${weights ? JSON.stringify(weights) : ''}`;
  let d = designCache.get(key);
  if (!d) {
    const w = weights ?? DEFAULT_WEIGHTS;
    // Step 3.2p: with the heave and pitch sensed, the plant the internal model, the filter and the predictor run on is
    // the held table with those four states carried. The two go together — the sense is of a state, so the state has
    // to be there.
    const { y, t } = plantAt(speed, depth, { rail, sink: w.heaveSense });
    d = design(y, t, w);
    if (w.heaveSense && (w.heaveGains ?? 'free') === 'free' && d.phi.length > N_STATE) {
      // The gains stay the shipped ones, designed on the free plant, with no gain on the four board states: the rider
      // feels and anticipates the board, and does not try to steer it. `DesignWeights.heaveGains` has the measurement.
      const ten = plantAt(speed, depth, { rail });
      const gains = design(ten.y, ten.t, { ...w, heaveSense: false });
      const pad = new Array<number>(d.phi.length - N_STATE).fill(0);
      d = { ...d, k: gains.k.map((row) => [...row, ...pad]) };
    }
    designCache.set(key, d);
  }
  return d;
}
const r3 = (x: number) => Math.round(x * 1000) / 1000;

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
  const n = phi.length;
  // With the board's heave and pitch carried (step 3.2p), the steady turn's own draft and trim are free as well: in a
  // banked turn the board sits at a different height and a different pitch, and the loop must not be made to fight it.
  // Their rates stay at nothing, as the roll's and the bank's do, because this is an equilibrium.
  const free = n > N_STATE ? [0, 4, 5, 7, 8, 9, N_STATE, N_STATE + 2] : [0, 4, 5, 7, 8, 9];
  const cols = free.length + N_COMMAND;
  const m = zeros(n, cols);
  const rhs = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    free.forEach((j, c) => { m[i][c] = phi[i][j] - (i === j ? 1 : 0); });
    for (let q = 0; q < N_COMMAND; q += 1) m[i][free.length + q] = gamma[i][q];
    rhs[i] = -((phi[i][2] - (i === 2 ? 1 : 0)) * bank + (phi[i][6] - (i === 6 ? 1 : 0)) * twist);
  }
  const ata = zeros(cols, cols);
  const atb = new Array<number>(cols).fill(0);
  for (let a = 0; a < cols; a += 1) {
    for (let b = 0; b < cols; b += 1) { let s = 0; for (let i = 0; i < n; i += 1) s += m[i][a] * m[i][b]; ata[a][b] = s; }
    let s = 0; for (let i = 0; i < n; i += 1) s += m[i][a] * rhs[i]; atb[a] = s;
  }
  const z = solveSmall(ata, atb);
  const x = new Array<number>(n).fill(0);
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
  /**
   * The latest prediction of the state now, the reference and the command sent (this file's signs; for probes). Held at
   * the largest the plant can be (fourteen with the board's heave and pitch, step 3.2p); only the first `n` are used.
   */
  readonly predicted = new Array<number>(N_STATE + N_HEAVE).fill(0);
  readonly reference = { x: new Array<number>(N_STATE + N_HEAVE).fill(0), u: [0, 0] };
  readonly sent = [0, 0];
  /** The command before the clamps (the hip takes what the ankle cannot). */
  readonly raw = [0, 0];
  /** The estimated bias on each command (rad, N·m). */
  readonly bias = [0, 0];
  /** Ticks run since the reset. */
  ticks = 0;

  /**
   * The reference's steady turn: the turn that balances the lean asked ('tan', the default since step 3.2f and ruling
   * 29j's correction: a rider's lean is held by a coordinated turn, and the linearised plant's steady turn is only its
   * small-angle shadow), or the linearised plant's own ('linear', 3.2e's; probes only).
   */
  private readonly turn: 'linear' | 'tan';

  constructor(weights?: DesignWeights, turn: 'linear' | 'tan' = 'tan') {
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

  /** The nearest designs blended at a speed, depth and rail (clamped to the table): step 3.2f makes it eight. */
  private blend(speed: number, depth: number, rail: number): Design {
    const v = Math.max(SCHEDULE_SPEEDS[0], Math.min(SCHEDULE_SPEEDS[SCHEDULE_SPEEDS.length - 1], speed));
    const v0 = Math.min(SCHEDULE_SPEEDS[SCHEDULE_SPEEDS.length - 2], Math.floor(v * 2) / 2);
    const fv = (v - v0) / 0.5;
    const dp = Math.max(0, Math.min(SCHEDULE_DEPTHS[2], depth));
    const i0 = dp <= SCHEDULE_DEPTHS[1] ? SCHEDULE_DEPTHS[0] : SCHEDULE_DEPTHS[1];
    const i1 = dp <= SCHEDULE_DEPTHS[1] ? SCHEDULE_DEPTHS[1] : SCHEDULE_DEPTHS[2];
    const fd = (dp - i0) / (i1 - i0);
    const rails = SCHEDULE_RAILS;
    const a = Math.max(0, Math.min(railLimit(v), Math.abs(rail)));
    let k = 0;
    while (k < rails.length - 2 && a > rails[k + 1]) k += 1;
    const fr = Math.max(0, Math.min(1, (a - rails[k]) / (rails[k + 1] - rails[k])));
    const r0 = rails[k];
    const r1 = rails[k + 1];
    const ds = [
      scheduledDesign(v0, i0, r0, this.weights), scheduledDesign(v0 + 0.5, i0, r0, this.weights), scheduledDesign(v0, i1, r0, this.weights), scheduledDesign(v0 + 0.5, i1, r0, this.weights),
      scheduledDesign(v0, i0, r1, this.weights), scheduledDesign(v0 + 0.5, i0, r1, this.weights), scheduledDesign(v0, i1, r1, this.weights), scheduledDesign(v0 + 0.5, i1, r1, this.weights),
    ];
    const ws = [(1 - fv) * (1 - fd) * (1 - fr), fv * (1 - fd) * (1 - fr), (1 - fv) * fd * (1 - fr), fv * fd * (1 - fr),
      (1 - fv) * (1 - fd) * fr, fv * (1 - fd) * fr, (1 - fv) * fd * fr, fv * fd * fr];
    const first = ds[0];
    let out = this.blendedDesign;
    if (!out) {
      const copy = (m: Mat) => m.map((row) => row.slice());
      out = { ...first, phi: copy(first.phi), gamma: copy(first.gamma), k: copy(first.k), phiE: copy(first.phiE), gammaE: copy(first.gammaE), l: copy(first.l), phiN: copy(first.phiN), pred: first.pred.map(copy) };
      this.blendedDesign = out;
    }
    const mix = (target: Mat, get: (d: Design) => Mat) => {
      const ms = ds.map(get);
      for (let i = 0; i < target.length; i += 1) {
        const row = target[i];
        for (let j = 0; j < row.length; j += 1) { let v2 = 0; for (let q = 0; q < ms.length; q += 1) v2 += ws[q] * ms[q][i][j]; row[j] = v2; }
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
  tick(sense: readonly number[], speed: number, depth: number, bankAsked: number, twistAsked: number, limits: ControlLimits, rail = 0): readonly number[] {
    const d = this.blend(speed, depth, rail);
    // The plant's own size: ten, or fourteen with the board's heave and pitch carried (step 3.2p).
    const n = d.phi.length;
    const p = d.c.length;
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
      const innov = new Array<number>(p);
      for (let i = 0; i < p; i += 1) {
        let s = yk[i];
        const row = d.cE[i];
        for (let j = 0; j < ne; j += 1) s -= row[j] * pred[j];
        innov[i] = s;
      }
      for (let i = 0; i < ne; i += 1) {
        let s = pred[i];
        const row = d.l[i];
        for (let j = 0; j < p; j += 1) s += row[j] * innov[j];
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
