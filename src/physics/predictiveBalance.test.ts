import { describe, expect, it } from 'vitest';
import { eigenvalues, lateralCompliance, lateralMass } from './rollModel';
import { CONTROL_STEP, COST_CAPTURE_SCALE, COST_FEET_REACH, DEFAULT_WEIGHTS, PredictiveController, SCHEDULE_DEPTHS, SCHEDULE_RAILS, SCHEDULE_SPEEDS, add, bodyInertiaAt, captureOmega, captureRow, closedLoop, continuousPlant, costWeights, design, discretise, STANCE_TABLE, STANCE_TABLE_DEEP, STANCE_TUCK, BODY_FRONTAL_SHARE_TUCK, SCHEDULE_DEPTHS_DEEP, stanceAt, heelColumn, faceColumn, faceSupport, faceTrimPoint, HOLD_LINE_RATE, HOLD_LINE_TIME, leastDamping, mul, plantAt, scheduledDesign, steadyTurn, wobbleHz, DRIFT_FULL_DEPTH, type CommandTuning, type DesignWeights, type EntryTuning } from './predictiveBalance';

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

describe('the face in the balance\'s own model (step 3.5r, `faceTrim`)', () => {
  const tilt = 12 * (Math.PI / 180);
  const run = (weights?: DesignWeights, face = 0, ticks = 40) => {
    const c = new PredictiveController(weights);
    const sent: number[][] = [];
    for (let i = 0; i < ticks; i += 1) {
      const sense = [0.02 * Math.sin(i / 5), 0.1 * Math.cos(i / 5), 0, 0, 0, 0.01 * Math.sin(i / 3), 0];
      sent.push([...c.tick(sense, 6.5, 0, 0, 0, { ankle: 0.25, twist: 30 }, 0, 0, face)]);
    }
    return { sent, c };
  };

  // The positive control: the face is an input, not a state, so Φ, Γ, K and L are the shipped ones and with no tilt the
  // controller sends exactly the shipped commands, tick for tick; with a tilt it does not.
  it('leaves the design byte-identical, and sends the shipped commands when the tilt is zero', () => {
    const { y, t } = plantAt(6.5, 0, { body: true });
    const off = design(y, t, { ...DEFAULT_WEIGHTS, riderBody: 'two' });
    const on = design(y, t, { ...DEFAULT_WEIGHTS, riderBody: 'two', faceTrim: 'on' });
    for (const key of ['phi', 'gamma', 'k', 'phiE', 'gammaE', 'l', 'phiN'] as const) expect(on[key]).toEqual(off[key]);
    expect(off.gammaF).toBeUndefined();
    expect(on.gammaF).toBeDefined();
    const shipped = run(undefined).sent;
    expect(run({ ...DEFAULT_WEIGHTS, faceTrim: 'on' }).sent).toEqual(shipped);
    expect(run({ ...DEFAULT_WEIGHTS, faceTrim: 'model' }).sent).toEqual(shipped);
    expect(run({ ...DEFAULT_WEIGHTS, faceTrim: 'on' }, tilt).sent).not.toEqual(run(undefined, tilt).sent);
    expect(run({ ...DEFAULT_WEIGHTS, faceTrim: 'model' }, tilt).sent).not.toEqual(run({ ...DEFAULT_WEIGHTS, faceTrim: 'on' }, tilt).sent);
  });

  // The face's column is the heel datum plus the support turned through the face, and the support term is not small:
  // it turns the column's sign on the body's bank, the yaw and the slip against `waterHeel`'s (face-trim.md §4).
  it('is the heel datum plus the support turned through the face, of the other sign from waterHeel on bank, yaw and slip', () => {
    const { y, t } = plantAt(6.5, 0, { body: true });
    const face = faceColumn(y, t);
    const heel = heelColumn(y, t).map((h) => -h);
    expect(faceSupport(y)).toBeCloseTo((73 + 2.54) * 9.81, 6);
    for (const i of [3, 4, 5]) expect(Math.sign(face[i])).toBe(-Math.sign(heel[i]));
    // A level board on a 12-degree face is pushed DOWN it: (S - Y_phi) tau > 0.
    expect((faceSupport(y) - y.heelSide) * tilt).toBeGreaterThan(60);
  });

  // The neutral trim balances the board's sway and roll with no ankle torque, so a plumb body holds it.
  it('puts the reference at a trim that balances the sway and the roll with the ankle unloaded', () => {
    for (const v of [5, 6.5, 8]) {
      const { y } = plantAt(v, 0, { body: true });
      const p = faceTrimPoint(y);
      const psi = (p.roll - 1) * tilt;
      const slip = p.slip * tilt;
      expect(Math.abs(y.heelSide * psi + y.slipSide * slip + faceSupport(y) * tilt)).toBeLessThan(1e-9);
      expect(Math.abs(y.heelRoll * psi + y.slipRoll * slip)).toBeLessThan(1e-9);
      expect(p.rest).toBe(-p.roll);
      // Railed into the face (between level and flush) and slipping down it.
      expect(p.roll).toBeGreaterThan(0);
      expect(p.roll).toBeLessThan(1);
      expect(p.slip).toBeGreaterThan(0);
    }
    // On the controller: `'on'` moves the reference by the sensed tilt once the line has filled, `'model'` never does.
    const on = run({ ...DEFAULT_WEIGHTS, faceTrim: 'on' }, tilt, 8).c;
    const model = run({ ...DEFAULT_WEIGHTS, faceTrim: 'model' }, tilt, 8).c;
    expect(on.faceSensed).toBe(tilt);
    expect(on.reference.x[0]).toBeGreaterThan(0);
    expect(on.reference.x[0]).toBeLessThan(tilt);
    expect(on.reference.x[2]).toBe(0);
    expect(model.reference.x.every((v) => v === 0)).toBe(true);
    // Before the line fills the tilt is not yet sensed.
    expect(run({ ...DEFAULT_WEIGHTS, faceTrim: 'on' }, tilt, 3).c.faceSensed).toBe(0);
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

  // Step 3.5b: the ladder's fourth rung, the tube tuck's 0.45 m, read only when it is asked for (`?stanceDeep=on`).
  // The three shipped rows and the 0.30 m clamp must be untouched without the flag — that is what "default
  // byte-identical" means here — and with it the ladder must reach the tuck's measured row rather than clamp.
  it('reads the tuck\'s fourth row only with `deep`, and leaves the three shipped rows and the 0.30 m clamp alone', () => {
    // The row itself, as `3.2/inertia.probe.ts` measured it at the tuck posture (arms in the game's own pose).
    expect(STANCE_TUCK).toEqual({ depth: 0.45, height: 0.4, lower: 0.857, upper: 2.44 });
    expect(STANCE_TABLE_DEEP.length).toBe(4);
    expect(STANCE_TABLE.length).toBe(3);
    expect(BODY_FRONTAL_SHARE_TUCK).toBe(0.2624);
    // Off: identical to the three-row lookup at and below Compress, and clamped onto Compress past it.
    for (const d of [0, 0.1, 0.195, 0.25, 0.3, 0.35, 0.45, 2]) {
      expect(stanceAt(d), `depth ${d}`).toEqual(stanceAt(Math.min(0.3, Math.max(0, d))));
    }
    expect(stanceAt(0.45)).toEqual({ height: 0.55, lower: 1.24, upper: 1.96 });
    expect(stanceAt(0.33)).toEqual({ height: 0.55, lower: 1.24, upper: 1.96 });
    // On: the same at and below Compress, the tuck's own row at 0.45, and interpolated between.
    for (const d of [0, 0.1, 0.195, 0.25, 0.3]) expect(stanceAt(d, true), `depth ${d}`).toEqual(stanceAt(d));
    expect(stanceAt(0.45, true)).toEqual({ height: 0.4, lower: 0.857, upper: 2.44 });
    expect(stanceAt(9, true)).toEqual(stanceAt(0.45, true));
    const mid = stanceAt(0.375, true);
    expect(mid.height).toBeCloseTo(0.475, 12);
    expect(mid.lower).toBeCloseTo((1.24 + 0.857) / 2, 12);
    expect(mid.upper).toBeCloseTo((1.96 + 2.44) / 2, 12);
    // The achieved depth Compress actually reaches on `?rider=new` (step 3.3f: up to 0.044 m over the command), which
    // is why the row is not purely additive: off it is clamped onto Compress, on it is already off that row.
    expect(stanceAt(0.344).height).toBe(0.55);
    expect(stanceAt(0.344, true).height).toBeLessThan(0.55);
    // The body's frontal share takes the same two readings.
    expect(bodyInertiaAt(73, 0.45, 0.4)).toBeCloseTo(0.2099 * 73 * 0.4 * 0.4, 10);
    expect(bodyInertiaAt(73, 0.45, 0.4, true)).toBeCloseTo(0.2624 * 73 * 0.4 * 0.4, 10);
    expect(bodyInertiaAt(73, 0.3, 0.55, true)).toBe(bodyInertiaAt(73, 0.3, 0.55));
    // The gain schedule's own knots: a SECOND clamp on the same quantity, so the row needs the knot to reach a gain.
    expect(SCHEDULE_DEPTHS).toEqual([0, 0.195, 0.3]);
    expect(SCHEDULE_DEPTHS_DEEP).toEqual([0, 0.195, 0.3, 0.45]);
  });

  // **Step 3.5c (the owner's ruling D of 2026-11-17, "keep the row"): the fourth rung is now the DEFAULT.**
  // The two lookups above take an explicit `deep` flag and are unchanged; what this test pins is the POLICY — the
  // two places that decide what `undefined` means. Both must read the row, so that a rider built with no options and
  // a weights object that never heard of the field both get the measured plant, and only an explicit `false` goes
  // back to the three rows. Without this test the flip is invisible: every lookup test above passes either way.
  it('ships the tuck row by default, and reaches the old three-row plant only on an explicit false (step 3.5c)', () => {
    // The shipped value, said out loud in one place.
    expect(DEFAULT_WEIGHTS.stanceDeep).toBe(true);
    // Read site 1 — `scheduledDesign`'s plant. `undefined` weights, and a partial object without the field, must both
    // give the row; `false` must give the clamped plant, and the two must actually differ at a deep depth.
    // (`rail` is the THIRD argument and the weights the fourth — passing the weights third silently makes `rail` an
    // object and every gain NaN, which is what this test's own first draft did.)
    const shipped = scheduledDesign(7, 0.45, 0);
    const spelled = scheduledDesign(7, 0.45, 0, { ...DEFAULT_WEIGHTS, stanceDeep: true });
    const omitted = scheduledDesign(7, 0.45, 0, { ...DEFAULT_WEIGHTS, stanceDeep: undefined });
    const old = scheduledDesign(7, 0.45, 0, { ...DEFAULT_WEIGHTS, stanceDeep: false });
    expect(Number.isFinite(shipped.k[0][0])).toBe(true);
    expect(shipped.k).toEqual(spelled.k);
    expect(shipped.k).toEqual(omitted.k);
    expect(shipped.k).not.toEqual(old.k);
    // The shipped leg IS the tuck's plant, and the old leg IS the clamped one, both to the last bit.
    const tuck = plantAt(7, 0.45, { stanceDeep: true });
    const clamped = plantAt(7, 0.45, { stanceDeep: false });
    expect(tuck.y.height).toBe(0.4);
    expect(clamped.y.height).toBe(0.55);
    expect(shipped.k).toEqual(design(tuck.y, tuck.t, { ...DEFAULT_WEIGHTS, stanceDeep: true }).k);
    expect(old.k).toEqual(design(clamped.y, clamped.t, { ...DEFAULT_WEIGHTS, stanceDeep: false }).k);
    // Read site 2 — the gain schedule's knots inside `PredictiveController.blend`, reached through the public tick.
    // The fourth knot is what lets a design be built at 0.45 at all (step 3.5b's second clamp), so a controller with
    // no weights must send what the explicit-`true` one sends and not what the `false` one sends.
    const limits = { ankle: 0.25, twist: 30 };
    const run = (w?: DesignWeights): number[][] => {
      const c = new PredictiveController(w);
      const sense = [0.02, 0, 0.05, 0, 0, 0, 0, 0];
      const o: number[][] = [];
      for (let i = 0; i < 6; i += 1) o.push([...c.tick(sense, 7, 0.45, 0.05, 0, limits)]);
      return o;
    };
    const shipTick = run(undefined);
    expect(run({ ...DEFAULT_WEIGHTS, stanceDeep: true })).toEqual(shipTick);
    expect(run({ ...DEFAULT_WEIGHTS })).toEqual(shipTick);
    const oldTick = run({ ...DEFAULT_WEIGHTS, stanceDeep: false });
    expect(oldTick).not.toEqual(shipTick);
    // At and below Compress the knots pick the same two designs either way, so the default moves nothing there —
    // the row's whole effect is on the ticks that were being clamped onto 0.30 m.
    const atDepth = (d: number, w?: DesignWeights): number[][] => {
      const c = new PredictiveController(w);
      const sense = [0.02, 0, 0.05, 0, 0, 0, 0, 0];
      const o: number[][] = [];
      for (let i = 0; i < 6; i += 1) o.push([...c.tick(sense, 7, d, 0.05, 0, limits)]);
      return o;
    };
    for (const d of [0, 0.195, 0.3]) {
      expect(atDepth(d, undefined), `depth ${d}`).toEqual(atDepth(d, { ...DEFAULT_WEIGHTS, stanceDeep: false }));
    }
  });

  // Step 3.5b: the plant the tuck's row gives, against the plant Compress's row gives at the same depth — the cost of
  // the missing row, stated as numbers rather than asserted. Both legs are the same call with one flag.
  it('shortens the pendulum, raises the lean rate and lightens the plant at the tuck (step 3.5b)', () => {
    const shipped = plantAt(7, 0.45);
    const deep = plantAt(7, 0.45, { stanceDeep: true });
    expect(shipped.y.height).toBe(0.55);
    expect(deep.y.height).toBe(0.4);
    // The pendulum 37.5 % high without the row, omega0 = sqrt(g/L) 15 % low, the point mass's inertia 1.89x.
    expect(shipped.y.height / deep.y.height).toBeCloseTo(1.375, 10);
    expect(Math.sqrt(9.81 / deep.y.height) / Math.sqrt(9.81 / shipped.y.height)).toBeCloseTo(1.1726, 3);
    expect((shipped.y.mass * shipped.y.height ** 2) / (deep.y.mass * deep.y.height ** 2)).toBeCloseTo(1.8906, 3);
    // The rider's yaw inertia on the board FALLS at the tuck and the twist rotor's RISES: the thighs' share moves from
    // the board onto the twist as the knees fold (`3.2/inertia.probe.ts`'s `yawSplit`).
    expect(deep.y.riderYawInertia).toBeLessThan(shipped.y.riderYawInertia);
    expect(deep.t.inertia).toBeGreaterThan(shipped.t.inertia);
    expect(deep.y.riderYawInertia / shipped.y.riderYawInertia).toBeCloseTo(0.691, 3);
    expect(deep.t.inertia / shipped.t.inertia).toBeCloseTo(1.245, 3);
    // At and below Compress nothing moves at all.
    for (const d of [0, 0.195, 0.3]) {
      expect(plantAt(7, d, { stanceDeep: true }).y.height, `depth ${d}`).toBe(plantAt(7, d).y.height);
      expect(plantAt(7, d, { stanceDeep: true }).y.riderYawInertia, `depth ${d}`).toBe(plantAt(7, d).y.riderYawInertia);
    }
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

describe('the line held with the stick centred (step 3.5s, `holdLine`)', () => {
  const tilt = 12 * (Math.PI / 180);
  const ON: DesignWeights = { ...DEFAULT_WEIGHTS, faceTrim: 'on' };
  const HOLD: DesignWeights = { ...DEFAULT_WEIGHTS, faceTrim: 'on', holdLine: 'ref' };
  const run = (weights: DesignWeights | undefined, hold?: (i: number) => { heading: number; cap: number } | undefined, ticks = 40, speed = 6.5) => {
    const c = new PredictiveController(weights);
    const sent: number[][] = [];
    for (let i = 0; i < ticks; i += 1) {
      const sense = [0.02 * Math.sin(i / 5), 0.1 * Math.cos(i / 5), 0, 0, 0, 0.01 * Math.sin(i / 3), 0];
      sent.push([...c.tick(sense, speed, 0, 0, 0, { ankle: 0.25, twist: 30 }, 0, 0, tilt, hold?.(i))]);
    }
    return { sent, c };
  };

  // The positive control: with no line latched the hold adds exactly nothing, so the controller is `faceTrim: 'on'`'s
  // tick for tick (the stick off centre, the hand in use, or before the line latches).
  it('sends exactly the commands of the controller without it while no line is held', () => {
    const on = run(ON).sent;
    expect(run(HOLD).sent).toEqual(on);
    expect(run(HOLD, () => ({ heading: Number.NaN, cap: 1 })).sent).toEqual(on);
    // A line held, the weight off: nothing reads it.
    expect(run(ON, () => ({ heading: 0.2, cap: 1 })).sent).toEqual(on);
    // The design is untouched by the weight.
    const { y, t } = plantAt(6.5, 0, { body: true });
    const off = design(y, t, ON);
    const held = design(y, t, HOLD);
    for (const key of ['phi', 'gamma', 'k', 'phiE', 'gammaE', 'l', 'phiN', 'trimX', 'trimU'] as const) expect(held[key]).toEqual(off[key]);
  });

  // The nose turned right of the line (+) is answered, once the heading has come through the sense line, by the
  // coordinated lean of the turn back (left, −), and only then; the turn rate asked is bounded and the lean is within
  // the cap the caller hands in.
  it('asks the coordinated lean of the turn back to the line, sensed through the delay, within the rate bound and the cap', () => {
    const psi = 0.05;
    const early = run(HOLD, () => ({ heading: psi, cap: 1 }), 6).c;
    expect(early.holdBank).toBe(0);
    const { c } = run(HOLD, () => ({ heading: psi, cap: 1 }), 12);
    expect(c.holdBank).toBeLessThan(0);
    expect(c.reference.x[2]).toBeLessThan(0);
    // The coordinated lean of r = −ψ̂ / T at this speed (ψ̂ the sensed heading brought forward over the delay).
    const rate = Math.max(-HOLD_LINE_RATE, Math.min(HOLD_LINE_RATE, -c.holdHeading / HOLD_LINE_TIME));
    expect(c.holdBank).toBeCloseTo(Math.atan((6.5 * rate) / 9.81), 12);
    expect(Math.abs(c.holdHeading - psi)).toBeLessThan(0.05);
    // Far off the line the rate is bounded; the cap bounds the lean; a zero cap (not planing) asks nothing.
    const far = run(HOLD, () => ({ heading: 1, cap: 1 }), 12).c;
    expect(far.holdBank).toBeCloseTo(Math.atan((6.5 * -HOLD_LINE_RATE) / 9.81), 12);
    expect(run(HOLD, () => ({ heading: 1, cap: 0.05 }), 12).c.holdBank).toBe(-0.05);
    expect(run(HOLD, () => ({ heading: 1, cap: 0 }), 12).c.holdBank).toBe(0);
    // The line dropped (the stick moved): the hold stops at once.
    const dropped = run(HOLD, (i) => (i < 11 ? { heading: psi, cap: 1 } : undefined), 12);
    expect(dropped.c.holdBank).toBe(0);
  });
});

// Step 3.6b (`?turnGains=firm`): the turn weights' gains act only while a lean is asked; with none asked the command is
// the shipped design's bit for bit, and the estimate runs on the same model either way.
describe('the turn weights (step 3.6b)', () => {
  const weights = { ...DEFAULT_WEIGHTS };
  const firm = { ...DEFAULT_WEIGHTS, rho: 5 };
  const lim = { ankle: 0.25, twist: 100 };
  const run = (turn: DesignWeights | undefined, ask: (k: number) => number): number[][] => {
    const d = scheduledDesign(7, 0.3, 0, weights);
    const { phi, gamma } = { phi: d.phi, gamma: d.gamma };
    const ctl = new PredictiveController(weights, 'tan', turn);
    let x = new Array<number>(phi.length).fill(0);
    x[1] = 0.2;
    const out: number[][] = [];
    for (let k = 0; k < 90; k += 1) {
      const u = [...ctl.tick(d.c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)), 7, 0.3, ask(k), 0, lim)];
      out.push(u);
      x = phi.map((row, i) => row.reduce((s, v, j) => s + v * x[j], 0) + gamma[i][0] * u[0] + gamma[i][1] * u[1]);
    }
    return out;
  };
  it('sends the shipped command bit for bit with no lean asked', () => {
    expect(run(firm, () => 0)).toEqual(run(undefined, () => 0));
  });
  it('sends a different command while a lean is asked, and the shipped one again once none is', () => {
    const ask = (k: number) => (k >= 10 && k < 40 ? -0.3 : 0);
    const a = run(firm, ask);
    const b = run(undefined, ask);
    expect(a.slice(0, 10)).toEqual(b.slice(0, 10));
    expect(a[20][0]).not.toBe(b[20][0]);
  });
});

// Step 3.6h (`?pushAnkle`, `?pushTwist`, `?wobbleNotch`; `docs/research/stability/drift/README.md`): the command path's
// tuning. Off (undefined), the controller is the shipped one; on, it acts in proportion to the depth and leaves the
// controller's own model loop decaying.
describe('the command tuning (step 3.6h)', () => {
  const weights = { ...DEFAULT_WEIGHTS };
  const lim = { ankle: 0.25, twist: 100 };
  const run = (tuning: CommandTuning | undefined, depth: number, ticks = 90, speed = 7): { u: number[][]; x: number[][] } => {
    const d = scheduledDesign(speed, depth, 0, weights);
    const ctl = new PredictiveController(weights, 'tan', undefined, tuning);
    let x = new Array<number>(d.phi.length).fill(0);
    x[1] = 0.2;
    const u: number[][] = [];
    const xs: number[][] = [];
    for (let k = 0; k < ticks; k += 1) {
      const c = [...ctl.tick(d.c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)), speed, depth, 0, 0, lim)];
      u.push(c);
      x = d.phi.map((row, i) => row.reduce((s, v, j) => s + v * x[j], 0) + d.gamma[i][0] * c[0] + d.gamma[i][1] * c[1]);
      xs.push(x);
    }
    return { u, x: xs };
  };
  const tunings: CommandTuning[] = [{ ankle: 0.75 }, { ankle: 0.5 }, { ankle: 0.35 }, { ankle: 0.25 }, { twist: 0.5 }, { twist: 0.25 }, { notchQ: 2 }, { notchQ: 1 }, { ankle: 0.5, notchQ: 2 }];
  it('acts on nothing standing tall (depth 0): the shipped command to rounding', () => {
    const off = run(undefined, 0).u;
    for (const t of tunings) {
      const on = run(t, 0).u;
      for (let k = 0; k < off.length; k += 1) for (let q = 0; q < 2; q += 1) expect(Math.abs(on[k][q] - off[k][q]), JSON.stringify(t)).toBeLessThan(1e-9);
    }
  });
  it('changes the command in Compress (depth 0.30 m)', () => {
    const off = run(undefined, 0.3).u;
    for (const t of tunings) expect(run(t, 0.3).u[20][0], JSON.stringify(t)).not.toBeCloseTo(off[20][0], 6);
  });
  it('keeps the controller\'s own model loop decaying in Compress and the tuck', () => {
    for (const depth of [0.3, 0.45]) for (const speed of [5.5, 7, 9, 11]) {
      const size = (x: number[]) => Math.hypot(...x);
      const base = run(undefined, depth, 600, speed).x;
      for (const t of tunings) {
        const xs = run(t, depth, 600, speed).x;
        expect(size(xs[599]), `${depth} ${speed} ${JSON.stringify(t)}`).toBeLessThan(0.05 * Math.max(...xs.slice(0, 60).map(size)));
        expect(Number.isFinite(size(xs[599]))).toBe(true);
      }
      expect(size(base[599])).toBeLessThan(0.05 * Math.max(...base.slice(0, 60).map(size)));
    }
  });
  it('places the notch on 3.6c\'s measured swing by depth', () => {
    expect(wobbleHz(0)).toBeCloseTo(2.31, 9);
    expect(wobbleHz(0.3)).toBeCloseTo(2.67, 9);
    expect(wobbleHz(0.45)).toBeCloseTo(2.9, 9);
    expect(wobbleHz(0.6)).toBeCloseTo(2.9, 9);
    expect(DRIFT_FULL_DEPTH).toBe(0.3);
  });
  it('forgets the notch\'s history on a reset', () => {
    const d = scheduledDesign(7, 0.3, 0, weights);
    const ctl = new PredictiveController(weights, 'tan', undefined, { notchQ: 2 });
    const sense = d.c.map((row) => row[1] * 0.2);
    const first = [...ctl.tick(sense, 7, 0.3, 0, 0, lim)];
    for (let k = 0; k < 30; k += 1) ctl.tick(sense, 7, 0.3, 0, 0, lim);
    ctl.reset();
    expect([...ctl.tick(sense, 7, 0.3, 0, 0, lim)]).toEqual(first);
  });
});

describe('the entry tuning and the notch variants (step 3.6i)', () => {
  const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantFloor: 6, stanceDeep: true };
  const lim = { ankle: 0.25, twist: 100 };
  const DEG = Math.PI / 180;
  /** The controller on its own model; the lean asked ramps at 1.4 rad/s to 40° from tick 0, back to 0 from +1.0 s. */
  const run = (entry: EntryTuning | undefined, tuning: CommandTuning | undefined, depth: number, speed: number, on: boolean, ticks = 600) => {
    const d = scheduledDesign(speed, depth, 0, weights);
    const ctl = new PredictiveController(weights, 'tan', undefined, tuning, entry);
    let x = new Array<number>(d.phi.length).fill(0);
    let lean = 0;
    const u: number[][] = [];
    const xs: number[][] = [];
    for (let k = 0; k < ticks; k += 1) {
      lean += Math.max(-1.4 / 60, Math.min(1.4 / 60, (k < 60 ? 40 * DEG : 0) - lean));
      const c = [...ctl.tick(d.c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)), speed, depth, -lean, 0, lim, 0, 0, 0, undefined, on)];
      u.push(c);
      x = d.phi.map((row, i) => row.reduce((s, v, j) => s + v * x[j], 0) + d.gamma[i][0] * c[0] + d.gamma[i][1] * c[1]);
      xs.push(x);
    }
    return { u, x: xs, ctl };
  };
  const entries: EntryTuning[] = [{ aim: true }, { planBank: 0.5 }, { planBank: 0.25 }, { planBank: 0.15 }, { aim: true, planBank: 0.25 }];
  it('with the entry mark off, the command as it ships, bit for bit', () => {
    const off = run(undefined, undefined, 0.3, 7.5, false).u;
    for (const e of entries) expect(run(e, undefined, 0.3, 7.5, false).u, JSON.stringify(e)).toEqual(off);
    const notch = run(undefined, { notchQ: 1 }, 0.3, 7.5, false).u;
    expect(run(undefined, { notchQ: 1, scope: 'stance' }, 0.3, 7.5, false).u).toEqual(off);
    expect(run(undefined, { notchQ: 1, scope: 'stance' }, 0.3, 7.5, true).u).toEqual(notch);
  });
  it('the aim standing tall is the shipped reference at depth 0', () => {
    const off = run(undefined, undefined, 0, 7.9, true).u;
    const on = run({ aim: true }, undefined, 0, 7.9, true).u;
    for (let k = 0; k < off.length; k += 1) for (let q = 0; q < 2; q += 1) expect(Math.abs(on[k][q] - off[k][q])).toBeLessThan(1e-9);
  });
  it('the planned lean leans the model body further by +0.5 s, within the clamps, and the loop settles', () => {
    for (const [depth, speed] of [[0.3, 7.5], [0.45, 7], [0.3, 9.5]]) {
      const off = run(undefined, undefined, depth, speed, true);
      const plan = run({ planBank: 0.25 }, undefined, depth, speed, true);
      expect(-plan.x[29][2], `${depth} ${speed}`).toBeGreaterThan(-off.x[29][2] + 5 * DEG);
      for (const c of plan.u) expect(Math.abs(c[0])).toBeLessThanOrEqual(0.25);
      const size = (x: number[]) => Math.hypot(...x);
      expect(size(plan.x[599])).toBeLessThan(0.05 * Math.max(...plan.x.slice(0, 120).map(size)));
      expect(plan.ctl.plan.on).toBe(false);
    }
  });
  it('N1 filters the state\'s part only: with x̂ at the reference, the ankle row\'s feedback is nothing', () => {
    // On the controller's own model the shipped notch and N1 differ while the reference moves, and agree with it still.
    const a = run(undefined, { notchQ: 1 }, 0.3, 7.5, true).u;
    const b = run(undefined, { notchQ: 1, scope: 'state' }, 0.3, 7.5, true).u;
    expect(Math.max(...a.slice(0, 60).map((c, k) => Math.abs(c[0] - b[k][0])))).toBeGreaterThan(1e-4);
    const size = (x: number[]) => Math.hypot(...x);
    const xs = run(undefined, { notchQ: 1, scope: 'state' }, 0.3, 7.5, true).x;
    expect(size(xs[599])).toBeLessThan(0.05 * Math.max(...xs.slice(0, 120).map(size)));
  });
  it('forgets the plan on a reset', () => {
    const { ctl } = run({ planBank: 0.25 }, undefined, 0.3, 7.5, true, 30);
    expect(ctl.plan.on).toBe(true);
    ctl.reset();
    expect(ctl.plan.on).toBe(false);
  });
});


describe('turn first (step 3.6j)', () => {
  // His weights (`riderBody=two&plantFloor=6`); the senses of a still rider, a little perturbed, the same for every controller.
  const w: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6 };
  const lim = { ankle: 0.25, twist: 100 };
  const senses = (k: number) => [0.01 * Math.sin(k / 7), 0.02 * Math.cos(k / 5), 0.03 * Math.sin(k / 3), 0.01, 0.005 * Math.cos(k / 4), 0.004 * Math.sin(k / 6), 0.01 * Math.cos(k / 9), 0, 0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Any = any;

  it('is the shipped controller bit for bit while it does not act (Snap held), whatever felt lean and tilt ride its line', () => {
    for (const mode of ['aim', 'on'] as const) {
      const ship = new PredictiveController(w, 'tan');
      const tf = new PredictiveController(w, 'tan', undefined, undefined, undefined, mode);
      for (let k = 0; k < 120; k += 1) {
        const a = [...ship.tick(senses(k), 7.5, 0.3, -0.3, 0, lim, 0.2)];
        const b = [...tf.tick(senses(k), 7.5, 0.3, -0.3, 0, lim, 0.2, 0, 0, undefined, false, { active: false, felt: 0.1 * Math.sin(k), tilt: -0.2, railCap: 0.21 })];
        expect(b).toEqual(a);
      }
    }
  });

  it("'aim': with the board turning and slipping as the shipped steady turn says, the free reference is that steady turn", () => {
    // At the schedule's knots, where nothing is blended (between them the blend of the discrete designs and of the continuous
    // plants differ a little, and so do their equilibria: the README reports by how much).
    for (const [speed, depth, rail, lean] of [[7.5, 0.3, SCHEDULE_RAILS[1], -0.5], [7, 0.45, SCHEDULE_RAILS[2], 0.4], [8, 0, 0, -0.6], [9.5, 0.3, SCHEDULE_RAILS[1], 0.3]]) {
      const ctl = new PredictiveController(w, 'tan', undefined, undefined, undefined, 'aim') as Any;
      const d = ctl.blend(speed, depth, rail, false, 'free');
      const t = steadyTurn(d.phi, d.gamma, Math.tan(lean), 0.05);
      const f = lean / Math.tan(lean);
      const ship = { x: t.x.map((v, i) => (i === 0 || i === 2 || i === 8 ? v * f : v)), u: [t.u[0] * f, t.u[1]] };
      const xh = ship.x.slice();
      const ref = ctl.freeReference(d, lean, undefined, 0.05, xh);
      for (let i = 0; i < 10; i += 1) expect(ref.x[i]).toBeCloseTo(ship.x[i], 8);
      expect(ref.u[0]).toBeCloseTo(ship.u[0], 8);
      expect(ref.u[1]).toBeCloseTo(ship.u[1], 6);
    }
  });

  it('weighs neither the yaw rate nor the slip in its designs, and only those', () => {
    const { y, t } = plantAt(7.5, 0.3, { body: true, plantFloor: 6, stanceDeep: true });
    const ship = design(y, t, w);
    const free = design(y, t, { ...w, turnFree: true });
    expect(free.phi).toEqual(ship.phi);
    expect(free.l).toEqual(ship.l);
    expect(free.k).not.toEqual(ship.k);
    expect(ship.a).toBeUndefined();
    expect(free.a).toEqual(continuousPlant(y, t).a);
  });

  it('no aim: on the controller\'s own model, the turn rate and the slip reach the command only through the hold of the lean and the tilt', () => {
    for (const mode of ['aim', 'on'] as const) {
      const ctl = new PredictiveController(w, 'tan', undefined, undefined, undefined, mode) as Any;
      const d = ctl.blend(7.5, 0.3, 0.2, false, 'free');
      const bank = -0.4;
      const tilt = mode === 'on' ? -0.15 : undefined;
      const base = [-0.45, 0.1, -0.38, 0.05, -0.6, 0.05, 0.02, -0.62, 0.03, 1.5];
      const command = (xh: number[]) => {
        const ref = ctl.freeReference(d, bank, tilt, 0.02, xh);
        return { u: [0, 1].map((q) => ref.u[q] - d.k[q].reduce((s: number, kq: number, j: number) => s + kq * (xh[j] - ref.x[j]), 0)), ref };
      };
      const c0 = command(base);
      // The board's yaw rate with the upper body turning with it (the twist rate unchanged), and the slip.
      const moved = base.slice();
      moved[4] += 0.3; moved[7] += 0.3; moved[5] -= 0.04;
      const c1 = command(moved);
      // The reference takes the turn and slip as they are: their errors, and the twist rate's, are the same.
      for (const j of [4, 5]) expect(moved[j] - c1.ref.x[j]).toBe(0);
      expect(moved[7] - c1.ref.x[7]).toBeCloseTo(base[7] - c0.ref.x[7], 12);
      // What changed is the feed-forward's hold, and the lags' reference at it (x_ref[8], x_ref[9] are the commands).
      // (Every reference entry but the turn's, the slip's and the upper body's yaw rate, which moved with the estimate.)
      const du = [0, 1].map((q) => c1.ref.u[q] - c0.ref.u[q]
        + [0, 1, 2, 3, 6, 8, 9].reduce((s, j) => s + d.k[q][j] * (c1.ref.x[j] - c0.ref.x[j]), 0));
      for (const q of [0, 1]) expect(c1.u[q] - c0.u[q]).toBeCloseTo(du[q], 9);
      // The hold: at the new turn the three held accelerations are nothing (exactly with 'aim'; least squares with 'on').
      const a = d.a as number[][];
      const f = bank / Math.tan(bank);
      const xs = c1.ref.x.map((v: number, i: number) => (i === 0 || i === 2 || i === 8 ? v / f : v));
      const acc = [1, 3, 7].map((i) => a[i].reduce((s, v, j) => s + v * xs[j], 0));
      if (mode === 'aim') for (const v of acc) expect(Math.abs(v)).toBeLessThan(1e-9);
      else expect(Math.abs(acc[2])).toBeLessThan(1e-9);
    }
  });

  it("'on': the bank is the felt lean read CONTROL_STEP × steps late, the roll that bank plus the tilt asked", () => {
    const ctl = new PredictiveController(w, 'tan', undefined, undefined, undefined, 'on');
    const lag = Math.round(0.1 / CONTROL_STEP);
    for (let k = 0; k < 30; k += 1) {
      const felt = k >= 10 ? -0.2 : 0;
      ctl.tick(senses(k), 7.5, 0.3, 0, 0, lim, 0, 0, 0, undefined, false, { active: true, felt, tilt: 0.1, railCap: 0.21 });
      const sensed = k >= 10 + lag ? -0.2 : 0;
      expect(ctl.feltSensed).toBe(sensed);
      expect(ctl.reference.x[2]).toBe(sensed);
      // The tilt in this file's sign is φ − θ: the rider's roll − bank is its negative.
      expect(ctl.reference.x[0] - ctl.reference.x[2]).toBeCloseTo(0.1, 12);
    }
    ctl.reset();
    expect(ctl.feltSensed).toBe(0);
  });
});
