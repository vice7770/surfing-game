import { describe, expect, it } from 'vitest';
import { eigenvalues } from './rollModel';
import { CONTROL_STEP, DEFAULT_WEIGHTS, PredictiveController, add, closedLoop, continuousPlant, design, discretise, heelColumn, leastDamping, mul, plantAt, scheduledDesign, steadyTurn, type DesignWeights } from './predictiveBalance';

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
    // And with a tilt it does something: a 10 degree face must move the command.
    const moved = run({ ...DEFAULT_WEIGHTS, waterHeel: 'both' }, 10 * (Math.PI / 180));
    const still = run(undefined, 10 * (Math.PI / 180));
    expect(moved).not.toEqual(still);
  });
});
