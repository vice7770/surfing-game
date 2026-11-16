import { describe, expect, it } from 'vitest';
import { eigenvalues, lateralCompliance, lateralMass } from './rollModel';
import { CONTROL_STEP, COST_CAPTURE_SCALE, COST_FEET_REACH, DEFAULT_WEIGHTS, PredictiveController, SCHEDULE_DEPTHS, SCHEDULE_RAILS, SCHEDULE_SPEEDS, add, bodyInertiaAt, captureOmega, captureRow, closedLoop, continuousPlant, costWeights, design, discretise, heelColumn, leastDamping, mul, plantAt, scheduledDesign, steadyTurn, type DesignWeights } from './predictiveBalance';

describe('predictive balance (step 3.2d, model only)', () => {
  it('discretises a first-order lag exactly', () => {
    const { phi, gamma } = discretise([[-2]], [[2]], 0.1);
    expect(phi[0][0]).toBeCloseTo(Math.exp(-0.2), 10);
    expect(gamma[0][0]).toBeCloseTo(1 - Math.exp(-0.2), 10);
  });

  it('keeps the gains\' own modes in the nominal loop with the delay (the predictor exact on its own model)', () => {
    const { y, t } = plantAt(7, 0);
    const d = design(y, t);
    const { a, b } = continuousPlant(y, t);
    const { phi, gamma } = discretise(a, b, CONTROL_STEP);
    const loop = eigenvalues(closedLoop(phi, gamma, d.steps, d), { balance: true, maxIterations: 400 });
    const own = eigenvalues(add(d.phi, mul(d.gamma, d.k), -1), { balance: true, maxIterations: 400 });
    // Away from the delay line's defective cluster at the origin (its computed eigenvalues spread there).
    for (const z of own) if (Math.hypot(z.re, z.im) > 0.1) expect(Math.min(...loop.map((w) => Math.hypot(w.re - z.re, w.im - z.im)))).toBeLessThan(1e-5);
    expect(leastDamping(loop).damping).toBeGreaterThan(0.05);
  });
});

describe('predictive balance in the game (step 3.2e, the runtime controller)', () => {
  const limits = { ankle: 10, twist: 1e4 };
  // Step 3.2p: the shipped design carries the board's heave and pitch (`DEFAULT_WEIGHTS.heaveSense`), so the plant the
  // runtime controller is checked against is the one it is designed on. Both sizes are exercised: the fourteen states
  // that ship, and the ten the design falls back to without the sense.
  const SENSED: DesignWeights = { ...DEFAULT_WEIGHTS, heaveSense: true, heaveGains: 'held' };
  const plant = (speed: number, depth: number, sink: boolean) => {
    const { y, t } = plantAt(speed, depth, { sink });
    const { a, b } = continuousPlant(y, t);
    return discretise(a, b, CONTROL_STEP);
  };
  const step = (phi: number[][], gamma: number[][], x: number[], u: readonly number[]) => phi.map((row, i) => row.reduce((s, v, j) => s + v * x[j], 0) + gamma[i][0] * u[0] + gamma[i][1] * u[1]);

  for (const [name, weights, sink] of [['ten states (what ships)', undefined, false], ['fourteen states, the board sensed', SENSED, true]] as [string, DesignWeights | undefined, boolean][]) {
    it(`runs the same loop as the analysis (\`closedLoop\`) at a table point: ${name}`, () => {
      const d = scheduledDesign(7, 0, 0, weights);
      const n = d.phi.length;
      expect(n).toBe(sink ? 14 : 10);
      expect(d.c.length).toBe(sink ? 9 : 7);
      const { phi, gamma } = plant(7, 0, sink);
      const m = closedLoop(phi, gamma, d.steps, d);
      let z = new Array<number>(m.length).fill(0);
      z[1] = 0.5;
      let x = z.slice(0, n);
      const ctl = new PredictiveController(weights);
      let worst = 0;
      for (let k = 0; k < 120; k += 1) {
        const u = ctl.tick(d.c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)), 7, 0, 0, 0, limits);
        x = step(phi, gamma, x, u);
        z = m.map((row) => row.reduce((s, v, j) => s + v * z[j], 0));
        for (let i = 0; i < n; i += 1) worst = Math.max(worst, Math.abs(x[i] - z[i]));
      }
      expect(worst).toBeLessThan(1e-9);
    });

    it(`holds the plant's own steady turn for the lean asked for, between the table's points: ${name}`, () => {
      const { phi, gamma } = plant(7.2, 0.1, sink);
      const ctl = new PredictiveController(weights);
      const c = scheduledDesign(7, 0, 0, weights).c;
      let x = new Array<number>(phi.length).fill(0);
      for (let k = 0; k < 600; k += 1) {
        const u = ctl.tick(c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)), 7.2, 0.1, 0.1, 0, limits);
        x = step(phi, gamma, x, u);
      }
      // The blended model is not the plant at 7.2 m/s exactly; the bias takes the difference, so the bank still comes to the ask.
      expect(Math.abs(x[2] - 0.1)).toBeLessThan(5e-3);
      const ref = steadyTurn(phi, gamma, 0.1, 0);
      expect(Math.abs(x[4] - ref.x[4])).toBeLessThan(0.02 * Math.abs(ref.x[4]) + 1e-3);
    });
  }
});

describe('the water\'s own heel datum (step 3.3p, `waterHeel`)', () => {
  // The three HEEL derivatives are the only ones that multiply the board's roll, so differencing the plant with them
  // zeroed must give exactly their column of A and leave every other column alone.
  it('isolates the three heel derivatives as the plant\'s first column, and nothing else', () => {
    const { y, t } = plantAt(7, 0);
    const col = heelColumn(y, t);
    const bare = continuousPlant({ ...y, heelRoll: 0, heelSide: 0, heelYaw: 0 }, t);
    const full = continuousPlant(y, t);
    for (let i = 0; i < col.length; i += 1) {
      expect(full.a[i][0]).toBeCloseTo(bare.a[i][0] + col[i], 12);
      // Every other column is untouched by the three, so the difference lives in column 0 alone.
      for (let j = 1; j < col.length; j += 1) expect(full.a[i][j]).toBe(bare.a[i][j]);
    }
    // And it is not a column of zeros: the heel derivatives reach the roll, the slip and the yaw rows.
    expect(Math.max(...col.map(Math.abs))).toBeGreaterThan(1);
  });

  // The tilt is an INPUT, not a state, so the design the flag changes is Γ_d alone: Φ, Γ, the LQR gain and the filter
  // are byte-for-byte the shipped ones. This is what makes the switch off-by-default free.
  it('leaves Phi, Gamma, K and L byte-identical and adds only the tilt\'s own column', () => {
    const { y, t } = plantAt(7, 0.195);
    const off = design(y, t);
    const on = design(y, t, { ...DEFAULT_WEIGHTS, waterHeel: 'both' });
    for (const key of ['phi', 'gamma', 'k', 'l', 'phiE', 'gammaE', 'phiN'] as const) {
      expect(on[key]).toEqual(off[key]);
    }
    expect(off.gammaD).toBeUndefined();
    expect(off.predD).toBeUndefined();
    expect(on.gammaD).toBeDefined();
    expect(on.predD).toHaveLength(on.steps);
    // Γ_d is the zero-order hold of −heelColumn over the same step, on the same A.
    const { a } = continuousPlant(y, t);
    const col = heelColumn(y, t);
    const want = discretise(a, col.map((v) => [-v]), CONTROL_STEP).gamma;
    for (let i = 0; i < want.length; i += 1) expect(on.gammaD![i][0]).toBeCloseTo(want[i][0], 14);
  });

  // The positive control on the switch: with the flag on and the tilt handed in as zero, the controller must send
  // exactly what it sends with the flag off, tick for tick. A difference would mean Γ_d leaks when there is no tilt.
  it('sends the same commands with the flag on and no tilt as with the flag off', () => {
    const run = (weights?: DesignWeights, tilt = 0) => {
      const c = new PredictiveController(weights);
      const sent: number[][] = [];
      for (let i = 0; i < 40; i += 1) {
        const sense = [0.02 * Math.sin(i / 5), 0.1 * Math.cos(i / 5), 0, 0, 0, 0.01 * Math.sin(i / 3), 0];
        sent.push([...c.tick(sense, 7, 0, 0, 0, { ankle: 0.25, twist: 30 }, 0, tilt)]);
      }
      return sent;
    };
    expect(run({ ...DEFAULT_WEIGHTS, waterHeel: 'both' }, 0)).toEqual(run(undefined, 0));
    expect(run({ ...DEFAULT_WEIGHTS, waterHeel: 'predict' }, 0)).toEqual(run(undefined, 0));
    // Step 3.4e's fourth cell takes the same control, and it is not vacuous either.
    expect(run({ ...DEFAULT_WEIGHTS, waterHeel: 'ref' }, 0)).toEqual(run(undefined, 0));
    // And with a tilt it does something: a 10 degree face must move the command.
    const moved = run({ ...DEFAULT_WEIGHTS, waterHeel: 'both' }, 10 * (Math.PI / 180));
    const still = run(undefined, 10 * (Math.PI / 180));
    expect(moved).not.toEqual(still);
    expect(run({ ...DEFAULT_WEIGHTS, waterHeel: 'ref' }, 10 * (Math.PI / 180))).not.toEqual(still);
  });

  // **Step 3.4e: the switch is the 2x2 of its two halves, and each value is exactly one row of it.** The two halves are
  // separable reads on the controller itself: the forward prediction is `predicted`, the trim is `reference`. So with a
  // tilt on, `'predict'` must move the prediction and leave the trim where the shipped one is; `'ref'` must move the
  // trim and leave the prediction where the shipped one is; `'both'` must agree with `'predict'` on the prediction and
  // with `'ref'` on the trim, at the same state and the same tilt.
  //
  // **Read at the FIRST tick, and the reason is a refutation of this test's own first draft.** Over forty ticks
  // `'ref'`'s prediction is NOT the shipped one: a moved trim sends different commands, and the commands enter `xh`
  // through `pred[jj]`, so the two halves are separable in the controller's own line and NOT separable along a
  // trajectory. At the first tick the sense line is shorter than the delay, the estimate is zero and no command has
  // been sent, so `xh` is exactly `Σ predD · tilt` — zero for the two values that do not propagate it — and the split
  // is an identity rather than an approximation.
  it('splits into the prediction and the reference, one half per value, as a 2x2', () => {
    const tilt = 10 * (Math.PI / 180);
    const at = (w?: DesignWeights) => {
      const c = new PredictiveController(w);
      const sense = [0.02, 0.1, 0, 0, 0, 0.01, 0];
      c.tick(sense, 7, 0, 0, 0, { ankle: 0.25, twist: 30 }, 0, tilt);
      return { x: [...c.predicted], ref: [...c.reference.x], refU: [...c.reference.u] };
    };
    const off = at(undefined);
    const pre = at({ ...DEFAULT_WEIGHTS, waterHeel: 'predict' });
    const ref = at({ ...DEFAULT_WEIGHTS, waterHeel: 'ref' });
    const both = at({ ...DEFAULT_WEIGHTS, waterHeel: 'both' });
    // The shipped trim is the board level with the WORLD, and on an unsteered tick it is exactly zero.
    expect(off.ref.every((v) => v === 0)).toBe(true);
    expect(pre.ref).toEqual(off.ref);
    expect(pre.refU).toEqual(off.refU);
    // `'ref'` moves the trim off the world's level, and by something the size of the face under the board.
    expect(Math.abs(ref.ref[0])).toBeGreaterThan(0.5 * tilt);
    expect(both.ref).toEqual(ref.ref);
    expect(both.refU).toEqual(ref.refU);
    // ... and leaves the forward prediction the shipped one, where `'predict'` and `'both'` move it and agree.
    expect(off.x.every((v) => v === 0)).toBe(true);
    expect(ref.x).toEqual(off.x);
    expect(pre.x).not.toEqual(off.x);
    expect(both.x).toEqual(pre.x);
  });
});

describe('the two-body rider as a plant (step 3.4a, `riderBody`)', () => {
  // **The positive control, and it is the step's own claim about the shipped plant.** The shipped `yawRows` eliminates
  // the body in closed form: `push = τ / h − m g θ`. That expression is exactly the constraint force of a body with no
  // inertia of its own about its own centre of mass — the feet's acceleration cancels identically — so the assembly
  // with `inertia: 0` and the shipped asymmetric coupling must reproduce the shipped plant entry for entry, at every
  // point of the schedule the game reads.
  it('reproduces the shipped plant exactly with the body\'s inertia at zero and the shipped coupling', () => {
    let worst = 0;
    let cells = 0;
    for (const v of SCHEDULE_SPEEDS) for (const d of SCHEDULE_DEPTHS) for (const rail of SCHEDULE_RAILS) {
      const base = continuousPlant(...Object.values(plantAt(v, d, { rail })) as [never, never]);
      const ctl = continuousPlant(...Object.values(plantAt(v, d, { rail, body: { inertia: 0, feetRoll: false } })) as [never, never]);
      cells += 1;
      for (let i = 0; i < base.a.length; i += 1) {
        let big = 1e-9;
        for (let j = 0; j < base.a.length; j += 1) big = Math.max(big, Math.abs(base.a[i][j]));
        for (let j = 0; j < base.a.length; j += 1) worst = Math.max(worst, Math.abs(base.a[i][j] - ctl.a[i][j]) / big);
      }
    }
    expect(cells).toBe(SCHEDULE_SPEEDS.length * SCHEDULE_DEPTHS.length * SCHEDULE_RAILS.length);
    expect(worst).toBeLessThan(1e-12);
  });

  // And the control is a control only because the two other variants are NOT the shipped plant: the body's own inertia
  // moves it, and so does the coupling on its own.
  it('is not vacuous: the sourced inertia and the consistent coupling each move the plant', () => {
    const base = plantAt(8, 0.195, { rail: 0 });
    const sym = plantAt(8, 0.195, { rail: 0, body: { inertia: 0 } });
    const two = plantAt(8, 0.195, { rail: 0, body: true });
    expect(continuousPlant(sym.y, sym.t).a).not.toEqual(continuousPlant(base.y, base.t).a);
    expect(continuousPlant(two.y, two.t).a).not.toEqual(continuousPlant(base.y, base.t).a);
    expect(two.y.body!.inertia).toBeCloseTo(0.1917 * 73 * 0.65 * 0.65, 9);
  });

  // **The shipped plant's coupling is half of a pair, and this is the entry that says so.** The feet sit `deckHeight`
  // over the board's centre of mass, so the board's roll moves them across — and the shipped `feet` row omits that
  // while its roll row still carries the same lever on the force. The mass matrix is therefore asymmetric by exactly
  // `m · deckHeight`, and with `feetRoll` on it is symmetric to machine precision.
  it('shows the shipped coupling asymmetric by m·deckHeight and the consistent one symmetric', () => {
    const { y } = plantAt(7, 0, { rail: 0 });
    const shipped = lateralMass(y);
    expect(Math.abs(shipped[0][3] - shipped[3][0])).toBeCloseTo(y.mass * y.deckHeight, 12);
    const consistent = lateralMass(y, { inertia: 5 });
    for (let i = 0; i < 4; i += 1) for (let j = 0; j < 4; j += 1) expect(consistent[i][j]).toBeCloseTo(consistent[j][i], 12);
    const c = lateralCompliance(y, { inertia: 5 });
    for (let i = 0; i < 4; i += 1) for (let j = 0; j < 4; j += 1) expect(c[i][j]).toBeCloseTo(c[j][i], 12);
  });

  // **The force at the feet, which is the thing this step deletes.** The commanded ankle rest `δ` reaches the plant
  // only through the ankle's own torque (`τ = k (θ − φ − δ) + c (θ̇ − φ̇)`), so the `δ` column of A is the ankle's
  // column of the generalised force put through the lateral solve. In the shipped plant the slip row's entry is
  // exactly `−k / (h m_b V)` — the horizontal force `τ / h` at the feet, divided by the dry board's mass. In the
  // assembly the ankle is a torque with its reaction, `(+1, −1, 0, 0)`, so the slip row's entry is the solve's own
  // `(c[3][0] − c[3][1]) (−k) / V` and `1 / h` appears nowhere.
  it('carries the ankle as a torque with its reaction, with no horizontal force at the feet', () => {
    // `feetForward: 0` so the feet's centre of pressure does not also put the ankle on the yaw row, which would mix
    // two effects in one assertion.
    const base = plantAt(7, 0, { rail: 0, feetScale: 0 });
    const two = plantAt(7, 0, { rail: 0, feetScale: 0, body: true });
    const k = base.y.ankleStiffness;
    const v = base.y.speed;
    // `continuousPlant`'s own order: [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a] — the slip row is 5, the rest is column 8.
    const SLIP = 5;
    const REST = 8;
    const shipped = continuousPlant(base.y, base.t).a;
    expect(shipped[SLIP][REST]).toBeCloseTo(-k / (base.y.height * base.y.boardMass * v), 9);
    const c = lateralCompliance(two.y, two.y.body);
    const assembled = continuousPlant(two.y, two.t).a;
    expect(assembled[SLIP][REST]).toBeCloseTo(((c[3][0] - c[3][1]) * -k) / v, 9);
    // And it is a different number: the invented force is not merely renamed.
    expect(Math.abs(assembled[SLIP][REST] / shipped[SLIP][REST])).toBeLessThan(0.5);
    // The ankle's own column on the four coordinates is (+1, −1, 0, 0) times its torque: the sway slot is zero, so a
    // unit of ankle torque reaches the board's sway only through the solve, never as a force of its own.
    for (const row of [0, 1, 2, 3]) {
      expect(assembled[row === 0 ? 1 : row === 1 ? 3 : row === 2 ? 4 : SLIP][REST])
        .toBeCloseTo(row === 3 ? ((c[3][0] - c[3][1]) * -k) / v : (c[row][0] - c[row][1]) * -k, 9);
    }
  });

  // The sourced inertia, read where the plant reads it: de Leva 1996 posed in the game's own three stances.
  it('takes the body\'s own frontal inertia from the sourced share at each stance', () => {
    expect(bodyInertiaAt(73, 0, 0.84)).toBeCloseTo(0.1685 * 73 * 0.84 * 0.84, 10);
    expect(bodyInertiaAt(73, 0.195, 0.65)).toBeCloseTo(0.1917 * 73 * 0.65 * 0.65, 10);
    expect(bodyInertiaAt(73, 0.3, 0.55)).toBeCloseTo(0.2099 * 73 * 0.55 * 0.55, 10);
    // Between the table's depths it interpolates, and outside it holds.
    expect(bodyInertiaAt(73, -1, 0.84)).toBe(bodyInertiaAt(73, 0, 0.84));
    expect(bodyInertiaAt(73, 9, 0.55)).toBe(bodyInertiaAt(73, 0.3, 0.55));
  });

  // The switch's own address: `'control'` must give the shipped design and `'two'` must not — otherwise the ridden
  // control proves nothing. **To twelve decimals, not byte for byte**, and the distinction is the honest one: the
  // assembly reaches the same plant through one 4×4 elimination instead of three divisions, so its A agrees to about
  // 1e-14 of each row's largest entry and the Riccati and Kalman iterations carry that into the last bits of K and L.
  // The ride is a separate and stronger fact: ridden, `control` matched the shipped rider on every fall column of
  // 102 runs (`docs/research/new-rider/3.4/README.md` §9).
  it('gives the shipped design to twelve decimals with `control` and a different one with `two`', () => {
    const off = scheduledDesign(7, 0.195, 0);
    const ctl = scheduledDesign(7, 0.195, 0, { ...DEFAULT_WEIGHTS, riderBody: 'control' });
    for (const key of ['phi', 'gamma', 'k', 'l', 'phiE', 'gammaE', 'phiN'] as const) {
      const a = off[key] as number[][];
      const b = ctl[key] as number[][];
      let big = 1e-9;
      for (const row of a) for (const x of row) big = Math.max(big, Math.abs(x));
      for (let i = 0; i < a.length; i += 1) for (let j = 0; j < a[i].length; j += 1) expect(Math.abs(b[i][j] - a[i][j]) / big).toBeLessThan(1e-12);
    }
    const two = scheduledDesign(7, 0.195, 0, { ...DEFAULT_WEIGHTS, riderBody: 'two' });
    expect(two.k).not.toEqual(off.k);
    expect(two.phi).not.toEqual(off.phi);
    const sym = scheduledDesign(7, 0.195, 0, { ...DEFAULT_WEIGHTS, riderBody: 'symmetric' });
    expect(sym.k).not.toEqual(off.k);
  });
});

describe('the cost function on the plant it is designed on (step 3.4b, `captureOmega`, `riderCost`)', () => {
  // **Neither of step 3.4a's two named point-mass constants is in the shipped cost function.** `captureRow`'s ω₀ is
  // read only when `captureScale` is set and the bank limit only when `feetReach` is, and `DEFAULT_WEIGHTS` sets
  // neither (3.2j and 3.2n each built one and did not keep it). So the round's own correction must be byte-identical
  // on the shipped weights at every point of the schedule the game reads — and must move every point once the two
  // weights are on, or the correction is vacuous.
  it('cannot move the shipped design, because the shipped design has neither weight', () => {
    expect('captureScale' in DEFAULT_WEIGHTS).toBe(false);
    expect('feetReach' in DEFAULT_WEIGHTS).toBe(false);
    let worst = 0;
    let smallest = Number.POSITIVE_INFINITY;
    let cells = 0;
    for (const v of SCHEDULE_SPEEDS) for (const d of SCHEDULE_DEPTHS) for (const rail of SCHEDULE_RAILS) {
      const { y, t } = plantAt(v, d, { rail });
      const base = design(y, t, DEFAULT_WEIGHTS);
      for (const mode of ['fixed', 'solved'] as const) {
        const same = design(y, t, { ...DEFAULT_WEIGHTS, captureOmega: mode });
        for (let i = 0; i < base.k.length; i += 1) for (let j = 0; j < base.k[i].length; j += 1) {
          worst = Math.max(worst, Math.abs(same.k[i][j] - base.k[i][j]));
        }
      }
      // Non-vacuity: with the two weights on, the same change must reach K at every point.
      const point = design(y, t, { ...DEFAULT_WEIGHTS, ...costWeights('point') });
      const plant = design(y, t, { ...DEFAULT_WEIGHTS, ...costWeights('plant') });
      let move = 0;
      let big = 1e-12;
      for (let i = 0; i < point.k.length; i += 1) for (let j = 0; j < point.k[i].length; j += 1) {
        move = Math.max(move, Math.abs(point.k[i][j] - plant.k[i][j]));
        big = Math.max(big, Math.abs(point.k[i][j]));
      }
      smallest = Math.min(smallest, move / big);
      cells += 1;
    }
    expect(cells).toBe(SCHEDULE_SPEEDS.length * SCHEDULE_DEPTHS.length * SCHEDULE_RAILS.length);
    expect(worst).toBe(0);
    expect(smallest).toBeGreaterThan(1e-3);
  });

  // The three definitions, each asserted from its own statement rather than from a number typed in beside it.
  // `'fixed'` is the bank coordinate's inertia with the other three lateral coordinates **held**, which is what a mass
  // matrix's diagonal honestly is — and that is the only quantity read off a diagonal here.
  it('is √(g/L) held and point-mass, the mass matrix\'s own diagonal held with a body, and the plant\'s own compliance free', () => {
    for (const d of SCHEDULE_DEPTHS) {
      const { y } = plantAt(7, d, {});
      const { y: two } = plantAt(7, d, { body: true });
      const m = y.mass;
      const h = y.height;
      // `'line'`: the point mass with its feet nailed down.
      expect(captureOmega(y, 9.81, 'line')).toBeCloseTo(Math.sqrt(9.81 / h), 12);
      // With no body at all the first two definitions are the same number, which is why the shipped row is `'line'`.
      expect(captureOmega(y, 9.81, 'fixed')).toBeCloseTo(captureOmega(y, 9.81, 'line'), 12);
      // `'fixed'` with a body is the mass matrix's own bank diagonal, `J + m h²`, held.
      const held = Math.sqrt((m * 9.81 * h) / lateralMass(two, two.body)[1][1]);
      expect(captureOmega(two, 9.81, 'fixed')).toBeCloseTo(held, 12);
      expect(captureOmega(two, 9.81, 'fixed')).toBeCloseTo(Math.sqrt((m * 9.81 * h) / ((two.body?.inertia ?? 0) + m * h * h)), 12);
      // `'solved'` is the plant's own compliance, which the bank ledger publishes — and on the SHIPPED plant it is
      // already several times `√(g/L)`, because the board is free to recoil under the feet.
      expect(captureOmega(y, 9.81, 'solved')).toBeCloseTo(Math.sqrt(lateralCompliance(y, { inertia: 0, feetRoll: false })[1][1] * m * 9.81 * h), 12);
      expect(captureOmega(y, 9.81, 'solved') / captureOmega(y, 9.81, 'line')).toBeGreaterThan(4);
      // The body's inertia slows the free reading by about √7 and the held one by under a tenth.
      expect(captureOmega(two, 9.81, 'solved') / captureOmega(y, 9.81, 'solved')).toBeLessThan(0.45);
      expect(captureOmega(two, 9.81, 'fixed') / captureOmega(y, 9.81, 'fixed')).toBeGreaterThan(0.9);
    }
  });

  // **The limit the second constant sets is kinematic.** The capture point's own θ coefficient is where the centre of
  // mass sits over the feet, `L`, and a rigid body's centre of mass sits at `L` whatever its own inertia is — so
  // `feetReach / L` is the same lean for a point mass and for a body, and of 3.4a's two named constants only ω₀ was
  // the point mass's. The θ̇ coefficient is the one that moves.
  it('keeps the capture point\'s own lean coefficient at L for every body, and moves only its rate coefficient', () => {
    for (const d of SCHEDULE_DEPTHS) {
      const { y: two } = plantAt(7, d, { body: true });
      const line = captureRow(two, 9.81, 10, 'line');
      for (const mode of ['line', 'fixed', 'solved'] as const) {
        const row = captureRow(two, 9.81, 10, mode);
        expect(row[2]).toBe(two.height);
        expect(row.filter((_, i) => i !== 2 && i !== 3)).toEqual(new Array<number>(8).fill(0));
        if (mode !== 'line') expect(row[3]).not.toBe(line[3]);
      }
      // Backward compatibility: the two-argument call is the shipped row, byte for byte.
      expect(captureRow(two, 9.81, 10)).toEqual(line);
    }
  });

  // The switch's own weights, at the values 3.2n and 3.2j measured and neither tuned here.
  it('turns on the two weights the shipped design has not, and sets only ω₀ between its three values', () => {
    expect(costWeights('point')).toEqual({ feetReach: COST_FEET_REACH, captureScale: COST_CAPTURE_SCALE, captureOmega: 'line' });
    expect(costWeights('fixed')).toEqual({ feetReach: COST_FEET_REACH, captureScale: COST_CAPTURE_SCALE, captureOmega: 'fixed' });
    expect(costWeights('plant')).toEqual({ feetReach: COST_FEET_REACH, captureScale: COST_CAPTURE_SCALE, captureOmega: 'solved' });
    expect(COST_FEET_REACH).toBe(0.13);
    expect(COST_CAPTURE_SCALE).toBe(0.013);
    // And the three designs are three designs, on the two-body plant as on the shipped one.
    for (const body of [undefined, 'two'] as const) {
      const w = { ...DEFAULT_WEIGHTS, ...(body ? { riderBody: body } : {}) } as DesignWeights;
      const off = scheduledDesign(7, 0.195, 0, w);
      const point = scheduledDesign(7, 0.195, 0, { ...w, ...costWeights('point') });
      const fixed = scheduledDesign(7, 0.195, 0, { ...w, ...costWeights('fixed') });
      const plant = scheduledDesign(7, 0.195, 0, { ...w, ...costWeights('plant') });
      expect(point.k).not.toEqual(off.k);
      expect(plant.k).not.toEqual(point.k);
      expect(plant.k).not.toEqual(fixed.k);
      // **And a control that falls out of the definitions**: with no body, `'fixed'` IS `'line'` — the held reading
      // only differs from the point mass's because the body has an inertia — so on the shipped plant the `fixed` arm
      // must be the `point` arm byte for byte, and on the two-body plant it must not be.
      if (body) expect(fixed.k).not.toEqual(point.k);
      else expect(fixed.k).toEqual(point.k);
      // The plant is untouched by the cost: Φ and Γ are the arm's own plant's, whatever the cost is.
      expect(point.phi).toEqual(off.phi);
      expect(plant.phi).toEqual(off.phi);
      expect(plant.gamma).toEqual(off.gamma);
    }
  });
});
