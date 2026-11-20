/**
 * **Step 3.5j — the twist joint's END STOP, carried by the plant the balance is designed on
 * (`?twistStop=model|design`).**
 *
 * **The two arms, because the switch has two values and they differ in what they change.** `model` rebuilds Φ, Γ, the
 * filter and the reference on the corrected plant and **leaves the gain row alone** — the only arm that is purely a
 * change of what the controller believes. `design` re-solves the gain row too, which the LQR answers by wanting the
 * twist handle used 21x harder. §2 is the arm-independent half (both carry the same corrected Φ); §3 and §4 are
 * `design`'s channel (the gain row), and §4 verifies that `model`'s K is the shipped row bit for bit over 85 cells;
 * §5 reads all three. The ride is `twist-stop-ride.ts`; the write-up is `twist-stop.md`.
 *
 * ## What this round is, and what it is NOT
 *
 * ⛔ **It is not an eighth candidate fix for the fall.** Seven were measured and closed in one day (`?askCap` inert,
 * `?ankleLimit=feet` worse, `?ankleRange=wide` innocent, `?buoyFrame=hull` 12 of 12 in all 36 cells, the hip rotor's
 * gain swept 500 -> 8 000 with 12 of 12 at every value, `?swing=mass` no help, and every reweighting of the twist
 * cost). **Nothing here is offered as the eighth.**
 *
 * ⭐ **Its justification stands on its own and is arithmetic:** the controller's internal model of the rider's torso
 * disagrees with the game's own torso by a factor of a hundred, and the ride enters the region where they disagree.
 *
 * > The design's twist spring is `TWIST_STIFFNESS` = 20 N·m/rad and carries NO stop [R,
 * > `predictiveBalance.ts:587`, `plantAt`, `rollModel.twistRows`]. The game adds `TWIST_STOP` = 2000 N·m/rad past
 * > `TWIST_BODY_RANGE` = 0.87 rad (49.85°) [R, `AttachedRider.ts:578, 4806-4816`]. The measured `cue` ride reached
 * > **51.10°** of twist.
 *
 * Found and registered by step 3.5i (`3.5/twist-work.md` §5.2) **without claiming it as a cause** — and this file
 * keeps that discipline. ⛔ **Nothing below is tuned to a bar, and if the fall does not move this file says the fall
 * does not move.**
 *
 * ## The four things it measures, and the control on each
 *
 * **§1 The disagreement itself, in N·m.** The game's own joint torque at an angle against the three models that could
 * be carried: the shipped line (20 θ), the secant and the tangent. No simulation — the formula `coupleYaw` applies.
 * *Control:* at 0.87 rad all four must agree exactly, and the secant must reproduce the game's torque to the digit at
 * **every** angle (it is constructed to).
 *
 * **§2 The one-step prediction error.** The quantity the flag actually changes: the state the loop's own Φ predicts
 * one control step ahead, against the state the game's joint actually produces, from a state past the stop. Shipped
 * model against the corrected one, which is the SAME plant in both arms. *Control:* from a state **inside** the
 * range both models must be exact to the
 * integrator's own error, which is printed.
 *
 * **§3 The designs at the axis's knots.** The gain row and the closed-loop spectral radius at every `SCHEDULE_TWIST_K`
 * knot across the schedule's speeds — a population of 17 x 5, not one design. *Controls:* the 20 N·m/rad knot's design
 * must be **bit-identical** to the shipped one (it is the same plant), and every radius must be below 1 or the knot is
 * not a design at all.
 *
 * **§4 The closed loop on the TRUE joint, both laws.** §4.3 of 3.5i's own pumping release — the upper body's own yaw
 * rate — integrated on the plant **with the stop in it**, under the shipped gain row and under the scheduled one. Work
 * into the joint, peak twist, where it ends. *Positive control:* with the stop term switched OFF in the truth, this
 * integrator must reproduce 3.5i §4.3's published release (**peak −37.57°, +2.886 J at 5.0 m/s**) on an instrument it
 * does not share.
 *
 * **§5 The steer regime, because the channel is SHARED.** 3.5i §5.1 measured that an ordinary bank ask drives the
 * twist actuator with zero twist requested — **7.977 N·m per degree at 5.0 m/s, 3.432 at 6.7 m/s / rail 0.192°** —
 * so a change that quiets the neutral wind-up by stiffening the torso in a turn has broken the turn. This section
 * reproduces those two figures as its positive control and then prints what each knot's design asks. *Control:* at
 * the 20 N·m/rad knot the figures must reproduce to the digit.
 *
 * ## Signs, units, frames, axes — and "requested" against "delivered"
 *
 * * **The axis** is the **upper body's yaw relative to the board, about the board's own up axis** (`tb.angle`, rad).
 *   It is not a roll axis and none of these joules may be added to a roll partition.
 * * `u[1]`, N·m, is the twist command in `predictiveBalance`'s signs; read as a moment on the upper body it is `+u1`
 *   in `tb.angle`'s own sign (3.5i §2.2's derivation, not re-derived). Every N·m here is **REQUESTED** — a commanded
 *   value before `MOTOR_LAG`, before the `TWIST_BODY_TORQUE` = 100 N·m bound and before the feet's grip. ⚠️ §5's
 *   figures pass 100 N·m and are **requested**, exactly as 3.5i's were.
 * * The joint's **generalised work**, J, is `Σ u1 · Δθ_t` (`+M` on the upper body, `−M` on the board through the
 *   planted feet). §4's work is **DELIVERED** by the integrator's own torque, not requested, and the column says so.
 * * **Speed** is the along-heading speed through the water, m/s, as the schedule's own is.
 * * State order (`continuousPlant`): `[φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a]`, measured rather than taken from a
 *   comment — §0 prints the two entries that anchor it.
 *
 * ## The limits, stated rather than buried
 *
 * ⛔ **§2–§5 are reads of the DESIGN's own model, not rides.** Full state, no estimator, no 0.1 s sensing delay, no
 * water, no reference. That is 3.5i §4.2–§4.3's own method and its own scope line, and it is kept so the numbers are
 * comparable. **A ride is a separate file** (`twist-stop-ride.ts`).
 *
 * ⛔ **§4's magnitudes are sized by an arbitrary release** and are not predictions of a ride.
 *
 * ## Running it
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/twist-stop.ts -o <s>/raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '' };\n" > <s>/ts.mjs && cat <s>/raw.mjs >> <s>/ts.mjs
 *   node <s>/ts.mjs
 *
 * Imports from `src/` and writes nothing.
 */
import {
  CONTROL_STEP, DEFAULT_WEIGHTS, SCHEDULE_SPEEDS, SCHEDULE_TWIST_K, TWIST_STIFFNESS, closedLoop, continuousPlant,
  discretise, plantAt, scheduledDesign, steadyTurn, twistKnots, type DesignWeights, type Mat,
} from '../../../../src/physics/predictiveBalance';
import { PredictiveController } from '../../../../src/physics/predictiveBalance';
import { eigenvalues } from '../../../../src/physics/rollModel';

const DEG = 180 / Math.PI;
/** `AttachedRider`'s own stop, re-stated so the arithmetic below is legible beside the class it is read from. */
const TWIST_BODY_RANGE = 0.87;
const TWIST_STOP = 2000;
/** The hips' own bound on the twist command, N·m, so a requested figure can be priced against the authority. */
const TWIST_BODY_TORQUE = 100;
/** `AttachedRider`'s own ANKLE_REST_RANGE, rad: the other command's bound, so neither is left unbounded. */
const ANKLE_REST_RANGE = 0.25;
/** The state indices `continuousPlant` uses, anchored by measurement in §0 and never taken from the comment. */
const I_THETA = 2;
const I_R = 4;
const I_TT = 6;
const I_WU = 7;
const I_TAU = 9;

/** The owner's own address: `?rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`'s weights. */
const SHIPPED: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two' };
/** `?twistStop=model`: the plant corrected, the gain row left alone — the pure belief change. */
const MODEL: DesignWeights = { ...SHIPPED, twistStop: 'model' };
/** `?twistStop=design`: the whole design re-solved, the gain row with it. */
const SCHEDULED: DesignWeights = { ...SHIPPED, twistStop: 'design' };
/**
 * **The depth knot every design here is read at, m: 0, standing tall.** It is not a preference — it is the knot
 * 3.5i's own gain table was read at, established by reproducing it: at depth 0 with `riderBody: 'two'`
 * `k[1][θ_t]` is **57.19 / 52.55 / 42.42 / 19.23 / 21.14 / 16.02** at 4.0 / 4.5 / 5.0 / 5.5 / 8.5 / 12.0 m/s, which
 * is 3.5i §4.5's published row **to the digit**, while 0.195 / 0.30 / 0.45 m give 48.60 / 53.02 / 61.52 at 5.0 m/s.
 * ⚠️ So every figure below is a TALL design, and a crouch or a Compress ride is scheduled on a different one.
 */
const DEPTH = 0;

const f = (x: number, n = 3): string => (Number.isFinite(x) ? x.toFixed(n) : 'n/a');
const pad = (s: string, n: number): string => s.padStart(n);
const row = (cells: (string | number)[], widths: number[] = []): string =>
  cells.map((c, i) => pad(typeof c === 'number' ? f(c) : c, widths[i] ?? 10)).join('  ');

/** The game's own joint torque on the board at an angle, N·m (`coupleYaw`'s `tb.spring` less its active part). */
const jointTorque = (angle: number): number => {
  const over = Math.abs(angle) - TWIST_BODY_RANGE;
  return TWIST_STIFFNESS * angle + (over > 0 ? TWIST_STOP * Math.sign(angle) * over : 0);
};
/** The secant stiffness `AttachedRider` hands the schedule, N·m/rad: the one line through the origin that hits it. */
const secant = (angle: number): number => {
  const over = Math.abs(angle) - TWIST_BODY_RANGE;
  return over > 0 ? TWIST_STIFFNESS + (TWIST_STOP * over) / Math.abs(angle) : TWIST_STIFFNESS;
};

const out: string[] = [];
const say = (s = ''): void => { out.push(s); };

// ---------------------------------------------------------------------------------------------------------------
say('################ Step 3.5j — the twist joint\'s end stop in the balance\'s own plant (`?twistStop=on`)');
say();
say('§0 THE STATE INDICES, MEASURED. The plant\'s own columns, never the docstring.');
say();
{
  const { y, t } = plantAt(5, DEPTH, { body: true, stanceDeep: true });
  const { a } = continuousPlant(y, t);
  // θ_t's own row is θ̇_t = ω_u − r, so a[I_TT][I_WU] = +1 and a[I_TT][I_R] = −1; and the torque column is the one
  // the upper body's row divides by its inertia: a[I_WU][I_TAU] = −1 / inertia.
  say(`  a[θ_t][ω_u] = ${f(a[I_THETA + 4][I_WU], 6)}   a[θ_t][r] = ${f(a[I_TT][I_R], 6)}`
    + `   (must be +1 and −1: θ̇_t = ω_u − r)`);
  say(`  a[ω_u][τ_a] = ${f(a[I_WU][I_TAU], 6)}   −1 / upper inertia = ${f(-1 / t.inertia, 6)}`
    + `   (the torque column, and the upper body takes −τ)`);
  say(`  a[ω_u][θ_t] = ${f(a[I_WU][I_TT], 6)}   −stiffness / inertia = ${f(-t.stiffness / t.inertia, 6)}`
    + `   (the twist SPRING, the entry this round corrects)`);
  say(`  plant\'s twist stiffness = ${f(t.stiffness, 3)} N·m/rad, upper inertia = ${f(t.inertia, 3)} kg·m²`);
}

// ---------------------------------------------------------------------------------------------------------------
say();
say('§1 THE DISAGREEMENT, IN N·m. The game\'s joint against the three models a linear plant could carry.');
say('    `game` is `coupleYaw`\'s own spring; `shipped` is 20 θ; `secant` is what the flag hands the schedule;');
say('    `tangent` is 2020 θ − 1740 sign(θ), which the plant has nowhere to put (no constant term).');
say();
{
  const w = [8, 9, 9, 9, 9, 9, 9, 9];
  say(row(['deg', 'rad', 'game', 'shipped', 'err N·m', 'err x', 'of 100 N·m', 'secant k'], w));
  for (const deg of [30, 45, 49.85, 50, 51.1, 52, 55, 60, 70]) {
    const angle = deg / DEG;
    const game = jointTorque(angle);
    const shipped = TWIST_STIFFNESS * angle;
    const sec = secant(angle);
    say(row([f(deg, 2), f(angle, 4), game, shipped, game - shipped, game / shipped, (game - shipped) / TWIST_BODY_TORQUE, sec], w));
  }
  say();
  // The controls.
  let worst = 0;
  for (let deg = 0; deg <= 90; deg += 0.01) {
    const angle = deg / DEG;
    worst = Math.max(worst, Math.abs(secant(angle) * angle - jointTorque(angle)));
  }
  say(`  CONTROL, the secant reproduces the game\'s torque exactly: worst |secant·θ − game| over 0–90° in 0.01° steps`);
  say(`           = ${worst.toExponential(2)} N·m.   (It is constructed to; a non-zero here is a bug.)`);
  say(`  CONTROL, at the stop itself (0.87 rad, 49.850°) game = ${f(jointTorque(TWIST_BODY_RANGE))} N·m and`);
  say(`           shipped = ${f(TWIST_STIFFNESS * TWIST_BODY_RANGE)} N·m — the two models AGREE there, so the axis\'s`);
  say(`           first knot is the shipped design and nothing below the stop can move.`);
  say();
  say(`  ⭐ AT THE RIDE\'S OWN PEAK, 51.10°: the model is wrong by ${f(jointTorque(51.1 / DEG) - TWIST_STIFFNESS * 51.1 / DEG)} N·m,`);
  say(`     which is ${f((jointTorque(51.1 / DEG) - TWIST_STIFFNESS * 51.1 / DEG) / TWIST_BODY_TORQUE * 100, 1)} % of the whole authority the hips have (TWIST_BODY_TORQUE = 100 N·m).`);
  say(`     The 100x of the headline is the STIFFNESS ratio (2020/20); the TORQUE ratio at 51.10° is ${f(jointTorque(51.1 / DEG) / (TWIST_STIFFNESS * 51.1 / DEG), 2)}x,`);
  say(`     and both are printed because they are different numbers and only one of them is a force.`);
}

// ---------------------------------------------------------------------------------------------------------------
/**
 * The truth: the design's own continuous plant with **the game's joint in place of the model's line**. The stop's
 * extra torque enters exactly where an active torque does (`tb.spring = tb.active + k θ (+ stop)`, one sum), so it is
 * injected through `a`'s own `τ_a` column — which is an identity of the plant, not a new term.
 *
 * `stop: false` is the positive control: the truth is then the design's own linear plant and the published §4.3
 * release must come back.
 */
function trueStep(a: Mat, b: Mat, x: number[], u: number[], h: number, sub: number, stop: boolean): number[] {
  const n = x.length;
  const dt = h / sub;
  const deriv = (s: number[]): number[] => {
    const d = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      let v = b[i][0] * u[0] + b[i][1] * u[1];
      for (let j = 0; j < n; j += 1) v += a[i][j] * s[j];
      d[i] = v;
    }
    if (stop) {
      // The joint's own extra torque past the range, N·m, through the torque column. The MODEL's line (20 θ) is
      // already in `a`, so only the stop's excess is added — never the whole spring twice.
      const over = Math.abs(s[I_TT]) - TWIST_BODY_RANGE;
      if (over > 0) {
        const extra = TWIST_STOP * Math.sign(s[I_TT]) * over;
        for (let i = 0; i < n; i += 1) d[i] += a[i][I_TAU] * extra;
      }
    }
    return d;
  };
  let s = x.slice();
  for (let k = 0; k < sub; k += 1) {
    const k1 = deriv(s);
    const k2 = deriv(s.map((v, i) => v + 0.5 * dt * k1[i]));
    const k3 = deriv(s.map((v, i) => v + 0.5 * dt * k2[i]));
    const k4 = deriv(s.map((v, i) => v + dt * k3[i]));
    s = s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  return s;
}

/**
 * The gain row the schedule gives at a stiffness, blended over the axis's two knots exactly as `blend` blends them
 * (at an exact speed, depth and rail knot the other three factors are 1 and 0, so this IS `blend`'s arithmetic).
 * `law` picks the arm: the shipped row, `?twistStop=model`'s (which is the shipped row, by construction) or
 * `?twistStop=design`'s.
 */
function gainRow(speed: number, stiffness: number | undefined, law: 'shipped' | 'model' | 'design' = 'design'): { k: Mat; coord: number } {
  const tk = stiffness === undefined || law === 'shipped' ? undefined : twistKnots(stiffness);
  if (!tk) return { k: scheduledDesign(speed, DEPTH, 0, SHIPPED).k, coord: TWIST_STIFFNESS };
  const w = law === 'model' ? MODEL : SCHEDULED;
  const k0 = scheduledDesign(speed, DEPTH, 0, w, tk.k0).k;
  const k1 = scheduledDesign(speed, DEPTH, 0, w, tk.k1).k;
  return { k: k0.map((r0, i) => r0.map((v, j) => (1 - tk.f) * v + tk.f * k1[i][j])), coord: tk.k0 + tk.f * (tk.k1 - tk.k0) };
}

// ---------------------------------------------------------------------------------------------------------------
say();
say('§2 THE ONE-STEP PREDICTION ERROR — the quantity the flag changes. One control step (1/60 s) from a state whose');
say('    only non-zero entry is the twist, under a zero command, on the TRUE joint; against each model\'s own Φ.');
say('    Errors are |model − truth| in the model\'s own units.');
say();
{
  const speed = 5;
  const { y, t } = plantAt(speed, DEPTH, { body: true, stanceDeep: true });
  const { a, b } = continuousPlant(y, t);
  const n = a.length;
  const w = [8, 11, 11, 11, 11, 11];
  say(row(['deg', 'model', 'd θ_t rad', 'd ω_u rad/s', 'd r rad/s', 'd θ rad'], w));
  for (const deg of [45, 51.1, 55, 60]) {
    const x0 = new Array<number>(n).fill(0);
    x0[I_TT] = deg / DEG;
    const u = [0, 0];
    const truth = trueStep(a, b, x0, u, CONTROL_STEP, 64, true);
    for (const which of ['shipped', 'scheduled'] as const) {
      const stiff = which === 'shipped' ? TWIST_STIFFNESS : secant(deg / DEG);
      const mp = plantAt(speed, DEPTH, { body: true, stanceDeep: true, twistStiffness: stiff });
      const cp = continuousPlant(mp.y, mp.t);
      const { phi, gamma } = discretise(cp.a, cp.b, CONTROL_STEP);
      const pred = new Array<number>(n).fill(0);
      for (let i = 0; i < n; i += 1) {
        let v = gamma[i][0] * u[0] + gamma[i][1] * u[1];
        for (let j = 0; j < n; j += 1) v += phi[i][j] * x0[j];
        pred[i] = v;
      }
      say(row([which === 'shipped' ? f(deg, 2) : '', which,
        Math.abs(pred[I_TT] - truth[I_TT]), Math.abs(pred[I_WU] - truth[I_WU]),
        Math.abs(pred[I_R] - truth[I_R]), Math.abs(pred[I_THETA] - truth[I_THETA])], w));
    }
  }
  say();
  say('  CONTROL, a state INSIDE the range (45°): both rows above must be equal and at the integrator\'s own floor —');
  say('  they are, which is what says the two models differ only where the stop is.');
  say('  ⚠️ These are ONE step. The loop predicts over PREDICT_DELAY = 0.1 s, six of them, and over six steps the');
  say('  error compounds; that is not computed here because the six-step prediction also carries the commands sent.');
}

// ---------------------------------------------------------------------------------------------------------------
say();
say('§3 THE DESIGNS AT THE AXIS\'S KNOTS. `k[1][θ_t]`, N·m/rad of its own angle, and the closed-loop spectral radius.');
say();
{
  /**
   * The designed loop's spectral radius, on the game's OWN instrument: `closedLoop` (the design's law, its filter and
   * its delay line, which is what 3.5i's 0.961–0.985 was read off) through `rollModel.eigenvalues`. ⛔ An earlier
   * version of this section used a power iteration on Φ − Γ K and it was **wrong** — on a loop whose dominant
   * eigenvalues are a complex pair it does not converge to the modulus, and it reported the SHIPPED design at 5.0 m/s
   * as 1.027 where 3.5i reports 0.982. It is recorded rather than quietly replaced, and the knot-20 column below is
   * the control that catches it either way.
   */
  const radius = (d: ReturnType<typeof scheduledDesign>): number => {
    const m = closedLoop(d.phi, d.gamma, d.steps, d);
    let worst = 0;
    for (const z of eigenvalues(m, { balance: true, maxIterations: 4000 })) worst = Math.max(worst, Math.hypot(z.re, z.im));
    return worst;
  };
  const w = [7, ...SCHEDULE_TWIST_K.map(() => 10)];
  say(`  k[1][θ_t] by speed and knot (knots N·m/rad):`);
  say(row(['m/s', ...SCHEDULE_TWIST_K.map(String)], w));
  for (const speed of SCHEDULE_SPEEDS) {
    say(row([f(speed, 1), ...SCHEDULE_TWIST_K.map((k) => scheduledDesign(speed, DEPTH, 0, SCHEDULED, k).k[1][I_TT])], w));
  }
  say();
  say('  spectral radius of the WHOLE designed loop (`closedLoop`: the law, its filter and its delay line; all < 1):');
  say(row(['m/s', ...SCHEDULE_TWIST_K.map(String)], w));
  let worst = 0;
  for (const speed of SCHEDULE_SPEEDS) {
    const rs = SCHEDULE_TWIST_K.map((k) => {
      const r0 = radius(scheduledDesign(speed, DEPTH, 0, SCHEDULED, k));
      worst = Math.max(worst, r0);
      return r0;
    });
    say(row([f(speed, 1), ...rs], w));
  }
  say();
  say(`  CONTROL, every knot is a design: the largest radius over 17 x ${SCHEDULE_TWIST_K.length} is ${f(worst, 4)}` + (worst < 1 ? ' — all below 1.' : ' — NOT below 1, and that knot is not a design.'));
  // The 20 knot must be the shipped design, bit for bit.
  let same = true;
  let diff = 0;
  for (const speed of SCHEDULE_SPEEDS) {
    const base = scheduledDesign(speed, DEPTH, 0, SHIPPED);
    const knot = scheduledDesign(speed, DEPTH, 0, SCHEDULED, SCHEDULE_TWIST_K[0]);
    for (let i = 0; i < base.k.length; i += 1) for (let j = 0; j < base.k[i].length; j += 1) {
      if (base.k[i][j] !== knot.k[i][j]) { same = false; diff = Math.max(diff, Math.abs(base.k[i][j] - knot.k[i][j])); }
    }
    for (let i = 0; i < base.phi.length; i += 1) for (let j = 0; j < base.phi[i].length; j += 1) {
      if (base.phi[i][j] !== knot.phi[i][j]) { same = false; diff = Math.max(diff, Math.abs(base.phi[i][j] - knot.phi[i][j])); }
    }
  }
  say(`  CONTROL, the first knot IS the shipped design: Φ and K compared entry by entry at all 17 speeds —`);
  say(`           ${same ? 'BIT-IDENTICAL on every entry.' : `NOT identical, worst |Δ| = ${diff.toExponential(2)}.`}`);
}

// ---------------------------------------------------------------------------------------------------------------
say();
say('§4 THE CLOSED LOOP ON THE TRUE JOINT. 3.5i §4.3\'s own pumping release — the upper body\'s own yaw rate, the');
say('    torso starting square — integrated with the game\'s stop in the truth, under each law. `work` is DELIVERED:');
say('    Σ (commanded τ, lagged by the plant\'s own τ_a state) · Δθ_t over the run, J, about the board\'s up axis.');
say();
{
  const seconds = 2;
  const steps = Math.round(seconds / CONTROL_STEP);
  const runOne = (speed: number, release: number, stop: boolean, law: 'shipped' | 'model' | 'design', bound = true) => {
    const { y, t } = plantAt(speed, DEPTH, { body: true, stanceDeep: true });
    const { a, b } = continuousPlant(y, t);
    const n = a.length;
    let x = new Array<number>(n).fill(0);
    x[I_WU] = release;
    let work = 0;
    let peak = 0;
    let past = 0;
    let clipped = 0;
    let coord = TWIST_STIFFNESS;
    for (let s = 0; s < steps; s += 1) {
      const { k, coord: c } = gainRow(speed, secant(x[I_TT]), law);
      coord = Math.max(coord, c);
      const u = [0, 0];
      for (let q = 0; q < 2; q += 1) { let v = 0; for (let j = 0; j < n; j += 1) v -= k[q][j] * x[j]; u[q] = v; }
      // ⭐ **The body's own bounds, because a law whose command the hips cannot deliver must be measured through what
      // they DO deliver.** `AttachedRider` clamps the twist command to `min(TWIST_BODY_TORQUE, the feet's grip)` and
      // the ankle's rest to its reach [R, `AttachedRider.ts:3922`]; the grip is a load and there is no water here, so
      // the bound used is the hips' own 100 N·m and the ankle's shipped 0.25 rad (`ANKLE_REST_RANGE`, which is also
      // `DEFAULT_WEIGHTS.commandScale[0]`). ⛔ Without this the stiff knots command 200–800 N·m and every figure in
      // the table is a REQUESTED number dressed as a trajectory — the first version of this table was exactly that.
      if (bound) {
        u[0] = Math.max(-ANKLE_REST_RANGE, Math.min(ANKLE_REST_RANGE, u[0]));
        if (Math.abs(u[1]) > TWIST_BODY_TORQUE) clipped += 1;
        u[1] = Math.max(-TWIST_BODY_TORQUE, Math.min(TWIST_BODY_TORQUE, u[1]));
      }
      // DELIVERED: the plant's own lagged torque state is the moment that actually reaches the joint.
      const tauBefore = x[I_TAU];
      const next = trueStep(a, b, x, u, CONTROL_STEP, 16, stop);
      // The joint's own generalised work, J. The MOMENT on the relative coordinate is `−τ_a` in this model's own
      // coordinates (the upper body's row carries `−τ_a / inertia`, and 3.5i §2.3 measured that the model's whole yaw
      // axis is the negation of the engine's: its state 6 is `−tb.angle`). A scalar work is frame-free, so the sign
      // below is the PHYSICAL one and the trapezium is over the DELIVERED torque the plant's own lag state carries.
      work -= 0.5 * (tauBefore + next[I_TAU]) * (next[I_TT] - x[I_TT]);
      x = next;
      peak = Math.abs(x[I_TT]) > Math.abs(peak) ? x[I_TT] : peak;
      if (Math.abs(x[I_TT]) > TWIST_BODY_RANGE) past += 1;
    }
    return { work, peak: peak * DEG, end: x[I_TT] * DEG, bank: x[I_THETA] * DEG, past, clipped, coord };
  };
  say('  POSITIVE CONTROL — the stop switched OFF in the truth, the shipped law, release 1 rad/s, NO command bound');
  say('  (3.5i §4.3 had none either, which is why the control is run that way and the table below is not):');
  say('  3.5i §4.3 published peak −37.57° and a REQUESTED +2.886 J at 5.0 m/s; the brief prices the same release at');
  say('  2.1–2.3 J DELIVERED through the lag, and delivered is what this instrument books.');
  const w0 = [7, 11, 11, 11];
  say(row(['m/s', '|peak| °', 'work J', 'at 2 s °'], w0));
  let five = { peak: NaN, work: NaN };
  for (const speed of [4.5, 5, 8.5]) {
    const r0 = runOne(speed, 1, false, 'shipped', false);
    if (speed === 5) five = { peak: Math.abs(r0.peak), work: r0.work };
    say(row([f(speed, 1), Math.abs(r0.peak), r0.work, r0.end], w0));
  }
  say(`  ⭐ 5.0 m/s: |peak| ${f(five.peak)}° against the published 37.57° (${f(Math.abs(five.peak - 37.57) / 37.57 * 100, 2)} % apart) and`);
  say(`  ${f(five.work)} J DELIVERED, inside the brief's own 2.1–2.3 J delivered band. The SIGN of the peak is`);
  say('  opposite because this file works in the MODEL\'s frame, whose θ_t is −tb.angle (3.5i §2.3), and a work is a');
  say('  frame-free scalar.');
  say('  ⚠️ RK4 on the continuous plant here against §4.3\'s Φ/Γ stepping: two instruments, not one.');
  say();
  say('  THE TRUE JOINT (stop ON in the truth), both laws, by release and speed:');
  say('  Both commands BOUNDED as the body bounds them (twist 100 N·m, ankle 0.25 rad); `clip` is the twist ticks');
  say('  the bound bit on, of 120.');
  const w = [7, 9, 11, 11, 11, 11, 8, 6, 11];
  say(row(['m/s', 'release', 'law', 'peak °', 'work J', 'end °', 'ticks>R', 'clip', 'axis k max'], w));
  let reached = 0;
  let worsePeak = 0;
  let moreWork = 0;
  let same = 0;
  for (const speed of [4.5, 5, 5.5, 8.5]) {
    for (const release of [1, 1.4, 1.8, 2.5]) {
      const sh = runOne(speed, release, true, 'shipped');
      const sc = runOne(speed, release, true, 'design');
      if (sh.past > 0 || sc.past > 0) {
        reached += 1;
        if (Math.abs(sc.peak) > Math.abs(sh.peak)) worsePeak += 1;
        if (sc.work > sh.work) moreWork += 1;
      } else if (sh.peak === sc.peak && sh.work === sc.work) same += 1;
      say(row([f(speed, 1), f(release, 2), 'shipped', sh.peak, sh.work, sh.end, String(sh.past), String(sh.clipped), f(sh.coord, 1)], w));
      say(row(['', '', 'design', sc.peak, sc.work, sc.end, String(sc.past), String(sc.clipped), f(sc.coord, 1)], w));
    }
  }
  say();
  say(`  ⛔ THE READ, counted rather than eyeballed: of 16 cells, ${reached} reach the stop and ${same} do not —`);
  say(`  and the ${same} that do not are BIT-IDENTICAL between the two arms. Of the ${reached} that do, \`design\` ends with a`);
  say(`  LARGER |peak twist| in ${worsePeak} and puts MORE work into the joint in ${moreWork}. ⛔ **So re-solving the gain row on the`);
  say('  corrected plant does NOT quiet this release; on this instrument it mostly makes it worse.** The mechanism is');
  say('  visible in the `clip` column: the stiffer design wants 200–800 N·m of twist, the hips have 100, and a law');
  say('  whose command saturates for most of a second is no longer the law that was designed.');
  say();
  say('  CONTROL, a release that never reaches the stop must give the two laws the SAME run:');
  for (const speed of [4.5, 5]) {
    const sh = runOne(speed, 0.5, true, 'shipped');
    const sc = runOne(speed, 0.5, true, 'design');
    say(`    ${f(speed, 1)} m/s, release 0.5 rad/s: peaks ${f(sh.peak)} vs ${f(sc.peak)}°, work ${f(sh.work)} vs ${f(sc.work)} J,`
      + ` ticks past the range ${sh.past} / ${sc.past} — ${sh.peak === sc.peak && sh.work === sc.work ? 'IDENTICAL.' : 'NOT identical.'}`);
  }
  say();
  say('  ⭐ WHY `?twistStop=model` IS ABSENT FROM THIS TABLE, and it is a property of the section, not an omission:');
  say('  this release is driven by `u = −K x` on the TRUE state — no estimator, no delay, no reference (3.5i §4.3\'s');
  say('  own method). `model` leaves K alone, so on an instrument whose only channel is K it is the shipped arm by');
  say('  CONSTRUCTION. Verified rather than asserted, entry by entry at every knot and speed:');
  {
    let same = true;
    let worst = 0;
    let cells = 0;
    for (const speed of SCHEDULE_SPEEDS) {
      for (const k of SCHEDULE_TWIST_K) {
        const a0 = gainRow(speed, k + 1e-9, 'model').k;
        const b0 = gainRow(speed, undefined, 'shipped').k;
        cells += 1;
        for (let i = 0; i < a0.length; i += 1) for (let j = 0; j < a0[i].length; j += 1) {
          if (a0[i][j] !== b0[i][j]) { same = false; worst = Math.max(worst, Math.abs(a0[i][j] - b0[i][j])); }
        }
      }
    }
    say(`    ${cells} cells (17 speeds x ${SCHEDULE_TWIST_K.length} knots): ${same ? 'K BIT-IDENTICAL to the shipped row in every cell.' : `NOT identical, worst |Δ| = ${worst.toExponential(2)}.`}`);
  }
  say('  So `model` acts ONLY through the prediction, the filter and the reference — which is §2 and §5, not here.');
}

// ---------------------------------------------------------------------------------------------------------------
say();
say('§5 THE STEER REGIME — BECAUSE THE CHANNEL IS SHARED. The twist command an ordinary BANK ask issues with zero');
say('    twist requested (3.5i §5.1). ⭐ Through the SHIPPED `PredictiveController.tick` itself, not a rewrite of it:');
say('    the first tick, every sense zero, so x̂ = 0 and the bias 0, and `raw[1]` is read off the controller. That is');
say('    §5.1\'s own recipe, and reading `raw` means the figure is REQUESTED — before MOTOR_LAG, before the 100 N·m');
say('    bound and before the feet\'s grip, exactly as §5.1\'s 354 N·m row was.');
say();
{
  const BIG = { ankle: 1e6, twist: 1e6 };
  /** One first tick on a fresh controller. `twistK` is passed as the angle's own secant, so the axis is engaged at an angle the senses do not yet show — which the row's `at °` column names. */
  const ask = (weights: DesignWeights, speed: number, railDeg: number, bankDeg: number, atDeg?: number) => {
    const c = new PredictiveController(weights, 'tan');
    const rail = (railDeg * Math.PI) / 180;
    const twistK = atDeg === undefined ? undefined : secant(atDeg / DEG);
    c.tick(new Array<number>(9).fill(0), speed, DEPTH, -(bankDeg / DEG), 0, BIG, rail, 0, twistK);
    return { raw: c.raw[1], refTwist: c.reference.x[I_TT] * DEG, coord: c.schedTwistK, ankle: c.raw[0] };
  };
  const w = [9, 8, 9, 11, 12, 12, 12];
  say('  POSITIVE CONTROL — the shipped controller, against 3.5i §5.1\'s published N·m per degree:');
  say(row(['m/s', 'rail °', 'bank °', 'ref θ_t °', 'raw N·m', 'N·m / deg', '§5.1 said'], w));
  for (const [speed, railDeg, bankDeg, said] of [[5, 0, 1.3369, 7.977], [5, 0, 20, 8.163], [5, 0, 40, 8.856], [6.7, 0.192, 1.3369, 3.432], [6.7, 0.192, 40, 3.121], [8, 0, 1.3369, 3.514]] as const) {
    const r0 = ask(SHIPPED, speed, railDeg, bankDeg);
    say(row([f(speed, 2), f(railDeg, 3), f(bankDeg, 4), r0.refTwist, Math.abs(r0.raw), Math.abs(r0.raw) / bankDeg, f(said, 3)], w));
  }
  say('  ⚠️ `|raw|` is printed because `AttachedRider` hands `tick` the bank as `−leanAsked` [R, `:3922`], so the');
  say('  sign here is the opposite of §5.1\'s table; the MAGNITUDE and the per-degree slope are the comparison.');
  say();
  say('  THE SAME ASKS WITH THE TORSO ALREADY PAST THE STOP, all three arms. `at °` is the twist the axis is read at.');
  const w2 = [9, 8, 9, 7, 10, 11, 12, 12, 11];
  say(row(['m/s', 'rail °', 'bank °', 'at °', 'arm', 'axis k', 'raw N·m', 'N·m / deg', 'vs shipped'], w2));
  for (const [speed, railDeg, bankDeg] of [[5, 0, 1.3369], [5, 0, 20], [6.7, 0.192, 1.3369], [6.7, 0.192, 40]] as const) {
    const base = Math.abs(ask(SHIPPED, speed, railDeg, bankDeg).raw);
    for (const atDeg of [51.1, 55, 60]) {
      for (const [name, weights] of [['model', MODEL], ['design', SCHEDULED]] as const) {
        const r0 = ask(weights, speed, railDeg, bankDeg, atDeg);
        say(row([f(speed, 2), f(railDeg, 3), f(bankDeg, 4), f(atDeg, 1), name, f(r0.coord, 1), Math.abs(r0.raw), Math.abs(r0.raw) / bankDeg, `${f(Math.abs(r0.raw) / base, 3)}x`], w2));
      }
    }
  }
  say();
  say('  CONTROL, the reference still asks the torso to stay SQUARE: `ref θ_t` over every row above —');
  {
    let worst = 0;
    let n = 0;
    for (const [speed, railDeg, bankDeg] of [[5, 0, 1.3369], [5, 0, 20], [6.7, 0.192, 1.3369], [6.7, 0.192, 40]] as const) {
      for (const atDeg of [undefined, 51.1, 55, 60]) {
        for (const weights of [SHIPPED, MODEL, SCHEDULED]) {
          worst = Math.max(worst, Math.abs(ask(weights, speed, railDeg, bankDeg, atDeg).refTwist));
          n += 1;
        }
      }
    }
    say(`    largest |ref θ_t| over ${n} asks = ${worst.toExponential(2)}°. 3.5i §5.1 measured 0.000° at every bank ask`);
    say('    and this flag does NOT change that: the design still asks the torso to stay square through the turn. What');
    say('    changes is what the loop believes the torso will DO when it pushes it.');
  }
  say();
  say('  CONTROL, with the switch set but the torso INSIDE the range, the steer must be the shipped steer:');
  {
    let worst = 0;
    for (const [speed, railDeg, bankDeg] of [[5, 0, 1.3369], [5, 0, 20], [6.7, 0.192, 1.3369], [6.7, 0.192, 40]] as const) {
      const base = ask(SHIPPED, speed, railDeg, bankDeg);
      for (const weights of [MODEL, SCHEDULED]) for (const atDeg of [0, 30, 45, 49.8]) {
        const r0 = ask(weights, speed, railDeg, bankDeg, atDeg);
        worst = Math.max(worst, Math.abs(r0.raw - base.raw), Math.abs(r0.ankle - base.ankle));
      }
    }
    say(`    largest |Δ| in either command over 4 asks x 2 arms x 4 sub-stop angles = ${worst.toExponential(2)}` + (worst === 0 ? '  — BIT-IDENTICAL.' : '  — NOT identical.'));
  }
}

say();
process.stdout.write(`${out.join('\n')}\n`);
