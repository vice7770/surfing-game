/**
 * **3.6d, control 3 (README §0.7): each knob is what it says.** Read only; prints one JSON line per check.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/response/knobcheck.ts --file <s>/knobcheck.mjs --format esm --platform node && node <s>/knobcheck.mjs
 *
 * - `designDelay`: the scheduled design's `steps` and its predictor's length at 4 / 8; at 6, every matrix bit for bit
 *   the shipped design's (−1); a controller's estimate first moves on the tick 4 / 6 / 8 after a step in the bank's
 *   sense (3.6c's `senseShift` check, with the design moved instead of the sense).
 * - `captureDelay`: a `HumanBalance` stepped at the game's 1/960 s substeps with a step in the capture point past the
 *   feet at t = 0: the first substep `sensedCapturePast` reads it, at −1 (0.1 s), 4 and 8 ticks.
 */
import { HumanBalance } from '../../../../src/physics/humanBalance';
import { DEFAULT_WEIGHTS, PredictiveController, scheduledDesign } from '../../../../src/physics/predictiveBalance';
import { WOBBLE } from '../../../../src/physics/wobbleKnobs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const limits = { ankle: 10, twist: 1e4 };
const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantFloor: 6 };

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
WOBBLE.designDelay = -1;
const shipped = scheduledDesign(7, 0.3, 0, weights);
const at: Record<string, unknown> = {};
for (const ticks of [4, 6, 8]) {
  WOBBLE.designDelay = ticks;
  const d = scheduledDesign(7, 0.3, 0, weights);
  at[ticks] = {
    steps: d.steps, pred: d.pred.length,
    identicalToShipped: (['phi', 'gamma', 'c', 'k', 'phiE', 'gammaE', 'cE', 'l', 'phiN', 'pred'] as const).every((m) => same(d[m], shipped[m])),
    kDiffersFromShipped: !same(d.k, shipped.k), lDiffersFromShipped: !same(d.l, shipped.l),
  };
}
WOBBLE.designDelay = -1;
console.log(JSON.stringify({ check: 'designDelay, the design at 7 m/s, 0.30 m, rail 0', shippedSteps: shipped.steps, at }));

function firstMove(ticks: number): number {
  WOBBLE.designDelay = ticks;
  const c = new PredictiveController(weights) as Any;
  const zero = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let first = -1;
  let before: number[] = [];
  for (let k = 0; k < 20; k += 1) {
    c.tick(k === 0 ? [0.1, 0, 0, 0, 0, 0, 0, 0, 0] : zero, 7.5, 0, 0, 0, limits, 0);
    const e = (c.estimate as number[]).slice();
    if (first < 0 && before.length && e.some((x, i) => x !== before[i])) first = k;
    before = e;
  }
  WOBBLE.designDelay = -1;
  return first;
}
console.log(JSON.stringify({ check: 'designDelay, the tick the estimate first moves after a step in the sense at tick 0', firstEstimateMove: { '-1': firstMove(-1), 4: firstMove(4), 6: firstMove(6), 8: firstMove(8) } }));

function firstRead(ticks: number): number {
  WOBBLE.captureDelay = ticks;
  const hb = new HumanBalance() as Any;
  const h = 1 / 960;
  let first = -1;
  for (let i = 0; i < 400; i += 1) {
    hb.state.past = i >= 100 ? 0.05 : 0;
    hb.sense(h, 0);
    if (first < 0 && hb.sensedCapturePast > 0) first = i - 100;
  }
  WOBBLE.captureDelay = -1;
  return first;
}
const r = { '-1': firstRead(-1), 4: firstRead(4), 6: firstRead(6), 8: firstRead(8) };
console.log(JSON.stringify({ check: 'captureDelay, substeps (1/960 s) from a step in the capture point past the feet to sensedCapturePast moving', substeps: r, seconds: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v / 960])) }));
