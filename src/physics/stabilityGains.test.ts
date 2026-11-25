/**
 * **The gain lock (3.6a part 1, `docs/research/stability/README.md`).** The ride build's controller (his address with
 * `plantFloor` 6) has its gains listed in `docs/research/stability/gains.json`; this test fails if any of them moves, or if
 * a cell of the delay check's stability map at 5–8 m/s that is stable today becomes unstable.
 *
 * - The design's weights come from the game's own construction: a `RideSession` built with the ride build's rider options,
 *   its predictor's `weights`.
 * - The gains are the LQR rows `k` (2 × n, model signs) and the delay `steps`, at every schedule knot (`SCHEDULE_SPEEDS`,
 *   `SCHEDULE_DEPTHS_DEEP`, rail 0) through `scheduledDesign`, and through `PredictiveController.blend` (the runtime's
 *   read) at the same points, which must agree with the knots.
 * - The delay check is 3.5x's (`docs/research/new-rider/3.5/what-fails-first-model.ts`, `TRUTH=table`): the design blended
 *   at v and depth, closed on `plantAt(v, depth)` (rail 0, the two-body rider, the deep ladder) with the true 6-tick delay
 *   and a frame off each way, its least damping. Below 5 m/s the linear model does not describe the game (3.5x §8), so
 *   nothing is asserted there.
 *
 * `STABILITY_GAINS_WRITE=1 npx vitest run src/physics/stabilityGains` rewrites the fixture and its table (only when a
 * gain change is accepted on purpose).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RideSession } from './RideSession';
import { eigenvalues } from './rollModel';
import {
  CONTROL_STEP, PredictiveController, SCHEDULE_DEPTHS_DEEP, SCHEDULE_SPEEDS, closedLoop, continuousPlant, discretise, leastDamping, plantAt, scheduledDesign,
  type Design, type DesignWeights,
} from './predictiveBalance';

const FIXTURE = 'docs/research/stability/gains.json';
const TABLE = 'docs/research/stability/gains.md';
const WRITE = process.env.STABILITY_GAINS_WRITE === '1';
/** The ride build's rider options, as `surfZoneConfigFor` hands them to `RideSession` from his address plus `&plantFloor=6`. */
const RIDE_BUILD = { rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on', plantFloor: '6' } as const;
/** What every ride of the benchmark printed back from its predictor (`weights` row). */
const PRINTED_WEIGHTS = {
  stateScale: [0.05, 0.5, 0.05, 0.25, 0.2, 0.02, 0.5, 1], commandScale: [0.09, 30], rho: 10, processNoise: [2, 1, 1, 0.2, 1],
  senseNoise: [0.017, 0.009, 0.017, 0.017, 0.05, 0.009, 0.02], bias: [0.01, 5], heaveSense: false, stanceDeep: true, riderBody: 'two', plantFloor: 6,
};
const STANCES: Record<string, number> = { tall: 0, crouch: 0.195, compress: 0.3, tuck: 0.45 };
const MAP_SPEEDS = [5, 5.25, 5.5, 5.75, 6, 6.5, 7, 7.5, 8];
const DELAYS = [5, 6, 7];
/** Relative tolerance on a gain (and absolute below 1). */
const TOL = 1e-7;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
interface Fixture {
  weights: unknown;
  knots: { v: number; depth: number; steps: number; k: number[][] }[];
  map: { v: number; depth: number; d: Record<string, number> }[];
}

function rideBuildWeights(): DesignWeights {
  const session = new RideSession(RIDE_BUILD as unknown as ConstructorParameters<typeof RideSession>[0]);
  return (session.rider as Any).predictor.weights as DesignWeights;
}
const copyK = (d: Design): number[][] => d.k.map((row) => row.slice());
function blended(ctl: PredictiveController, v: number, depth: number): Design {
  const d = (ctl as Any).blend(v, depth, 0) as Design;
  return { ...d, phi: d.phi.map((r) => r.slice()), gamma: d.gamma.map((r) => r.slice()), k: copyK(d), phiE: d.phiE.map((r) => r.slice()), gammaE: d.gammaE.map((r) => r.slice()), l: d.l.map((r) => r.slice()), phiN: d.phiN.map((r) => r.slice()), pred: d.pred.map((m) => m.map((r) => r.slice())), c: d.c.map((r) => r.slice()), cE: d.cE.map((r) => r.slice()) };
}
function compute(weights: DesignWeights): Fixture {
  const knots: Fixture['knots'] = [];
  for (const depth of SCHEDULE_DEPTHS_DEEP) for (const v of SCHEDULE_SPEEDS) {
    const d = scheduledDesign(v, depth, 0, weights);
    knots.push({ v, depth, steps: d.steps, k: copyK(d) });
  }
  const ctl = new PredictiveController(weights, 'tan');
  const map: Fixture['map'] = [];
  for (const depth of Object.values(STANCES)) for (const v of MAP_SPEEDS) {
    const design = blended(ctl, v, depth);
    const { y, t } = plantAt(v, depth, { rail: 0, body: true, stanceDeep: true });
    const { a, b } = continuousPlant(y, t);
    const { phi, gamma } = discretise(a, b, CONTROL_STEP);
    const d: Record<string, number> = {};
    for (const Ts of DELAYS) d[String(Ts)] = leastDamping(eigenvalues(closedLoop(phi, gamma, Ts, design), { balance: true, maxIterations: 400 })).damping;
    map.push({ v, depth, d });
  }
  return { weights, knots, map };
}

const NAMES = ['φ (roll)', 'φ̇', 'θ (bank)', 'θ̇', 'r (yaw rate)', 'β (slip)', 'twist', 'twist rate', 'rest', 'twist torque'];
function table(fx: Fixture): string {
  const lines = [
    '# The ride build\'s controller gains (3.6a part 1)', '',
    '*Generated by `STABILITY_GAINS_WRITE=1 npx vitest run src/physics/stabilityGains` from the code\'s own `scheduledDesign` and',
    '`PredictiveController.blend` (rail 0), on the weights a `RideSession` builds for his address with `plantFloor` 6. The test',
    'fails if any value moves by more than 1e-7 (relative). Model signs: the command is u = u_ref − K (x̂ − x_ref) − b̂; row 1 is',
    'the ankle\'s rest (rad), row 2 the twist torque (N·m); the states are rad and rad/s.*', '',
    `Weights: \`${JSON.stringify(fx.weights)}\``, '',
    '## The ankle row K[0] at every schedule knot', '',
    `| depth (m) | v (m/s) | steps | ${NAMES.slice(0, fx.knots[0].k[0].length).join(' | ')} |`,
    `| --- | --- | --- | ${fx.knots[0].k[0].map(() => '---').join(' | ')} |`,
    ...fx.knots.map((k) => `| ${k.depth} | ${k.v} | ${k.steps} | ${k.k[0].map((x) => x.toPrecision(5)).join(' | ')} |`), '',
    '## The twist row K[1] at every schedule knot', '',
    `| depth (m) | v (m/s) | ${NAMES.slice(0, fx.knots[0].k[1].length).join(' | ')} |`,
    `| --- | --- | ${fx.knots[0].k[1].map(() => '---').join(' | ')} |`,
    ...fx.knots.map((k) => `| ${k.depth} | ${k.v} | ${k.k[1].map((x) => x.toPrecision(5)).join(' | ')} |`), '',
    '## The delay check at 5–8 m/s (table truth, rail 0): least damping at 5, 6 and 7 ticks of delay', '',
    'Positive is a decaying loop; −1 marks a real root outside the unit circle (3.5x\'s "div"). The test asserts that every',
    'cell positive here stays positive.', '',
    `| stance (depth, m) | ${MAP_SPEEDS.map((v) => `${v} m/s`).join(' | ')} |`, `| --- | ${MAP_SPEEDS.map(() => '---').join(' | ')} |`,
    ...Object.entries(STANCES).map(([name, depth]) => `| ${name} (${depth}) | ${MAP_SPEEDS.map((v) => {
      const c = fx.map.find((m) => m.v === v && m.depth === depth)!;
      return DELAYS.map((Ts) => c.d[String(Ts)].toFixed(2)).join(' / ');
    }).join(' | ')} |`), '',
    'Each cell: 5 / 6 / 7 ticks.', '',
  ];
  return lines.join('\n');
}

describe('the gain lock (3.6a part 1)', () => {
  const weights = rideBuildWeights();
  it('builds the ride build\'s weights from the game\'s own rider options', () => {
    expect(JSON.parse(JSON.stringify(weights))).toEqual(PRINTED_WEIGHTS);
  });

  const now = compute(weights);
  if (WRITE) {
    writeFileSync(FIXTURE, `${JSON.stringify(now)}\n`);
    writeFileSync(TABLE, table(now));
  }
  const fixture = existsSync(FIXTURE) ? (JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture) : undefined;

  it('lists every knot (17 speeds × 4 depths, rail 0) and every map cell', () => {
    expect(fixture).toBeDefined();
    expect(fixture!.knots.length).toBe(SCHEDULE_SPEEDS.length * SCHEDULE_DEPTHS_DEEP.length);
    expect(fixture!.map.length).toBe(MAP_SPEEDS.length * 4);
    expect(fixture!.weights).toEqual(PRINTED_WEIGHTS);
  });

  it('keeps every gain at every schedule knot', () => {
    const moved: string[] = [];
    for (const [i, k] of now.knots.entries()) {
      const was = fixture!.knots[i];
      expect([k.v, k.depth]).toEqual([was.v, was.depth]);
      expect(k.steps).toBe(was.steps);
      for (let row = 0; row < was.k.length; row += 1) for (let j = 0; j < was.k[row].length; j += 1) {
        const a = k.k[row][j];
        const b = was.k[row][j];
        if (!(Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b)))) moved.push(`v ${k.v} depth ${k.depth} K[${row}][${j}] ${b} -> ${a}`);
      }
    }
    expect(moved).toEqual([]);
  });

  it('reads the knots unchanged through the runtime blend (PredictiveController.blend)', () => {
    const ctl = new PredictiveController(weights, 'tan');
    const moved: string[] = [];
    for (const was of fixture!.knots) {
      const k = (ctl as Any).blend(was.v, was.depth, 0).k as number[][];
      for (let row = 0; row < was.k.length; row += 1) for (let j = 0; j < was.k[row].length; j += 1) {
        if (!(Math.abs(k[row][j] - was.k[row][j]) <= TOL * Math.max(1, Math.abs(was.k[row][j])))) moved.push(`v ${was.v} depth ${was.depth} K[${row}][${j}]`);
      }
    }
    expect(moved).toEqual([]);
  });

  it('keeps every stable cell of the delay check at 5–8 m/s stable', () => {
    const lost: string[] = [];
    for (const [i, c] of now.map.entries()) {
      const was = fixture!.map[i];
      expect([c.v, c.depth]).toEqual([was.v, was.depth]);
      for (const Ts of DELAYS) if (was.d[String(Ts)] > 0 && !(c.d[String(Ts)] > 0)) lost.push(`v ${c.v} depth ${c.depth} ${Ts} ticks: ${was.d[String(Ts)]} -> ${c.d[String(Ts)]}`);
    }
    expect(lost).toEqual([]);
  });
});
