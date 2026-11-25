/**
 * **3.6c, control 3 (README §0.6): each knob is what it says.** Read only; prints one JSON line per check.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/wobble/knobcheck.ts --file <s>/knobcheck.mjs --format esm --platform node && node <s>/knobcheck.mjs
 *
 * - `twistGain`, `ankleGain`: one controller, the same senses ticked twice from a reset (same estimate), the feedback
 *   part (raw command − reference − bias... i.e. raw − (ref.u − bias)) at gain 1.3 over gain 1.
 * - `senseShift`: a step in the bank's sense at tick 0; the first tick whose estimate moves, at shift 0, −2 and +2.
 * - `fins`: one bare board stepped one step with a sideslip; the fins' mean force at fins 1.3 over fins 1.
 */
import { Quaternion, Vector3 } from 'three';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PlaneWater } from '../../../../src/physics/PlaneWater';
import { DEFAULT_WEIGHTS, PredictiveController } from '../../../../src/physics/predictiveBalance';
import { WOBBLE } from '../../../../src/physics/wobbleKnobs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const limits = { ankle: 10, twist: 1e4 };
const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantFloor: 6 };

function feedback(gainKey: 'twistGain' | 'ankleGain', g: number): number[] {
  WOBBLE[gainKey] = g;
  const c = new PredictiveController(weights) as Any;
  let raw = [0, 0];
  for (let k = 0; k < 20; k += 1) {
    const sense = [0.05 * Math.sin(k / 3), 0.1, 0.2 * Math.cos(k / 4), 0.1, -0.05, 0.02, 0.01, 0, 0];
    c.tick(sense, 7.5, 0.3, 0.1, 0, limits, 0.12);
    raw = [c.raw[0] - (c.reference.u[0] - c.bias[0]), c.raw[1] - (c.reference.u[1] - c.bias[1])];
  }
  WOBBLE[gainKey] = 1;
  return raw;
}
// The gain changes the commands, which changes the estimate the next tick; so compare the last tick's feedback from
// controllers whose history is the same: tick 19 times at gain 1, then once at each gain.
function lastTick(gainKey: 'twistGain' | 'ankleGain', g: number): number[] {
  const c = new PredictiveController(weights) as Any;
  for (let k = 0; k < 20; k += 1) {
    if (k === 19) WOBBLE[gainKey] = g;
    const sense = [0.05 * Math.sin(k / 3), 0.1, 0.2 * Math.cos(k / 4), 0.1, -0.05, 0.02, 0.01, 0, 0];
    c.tick(sense, 7.5, 0.3, 0.1, 0, limits, 0.12);
  }
  WOBBLE[gainKey] = 1;
  return [c.raw[0] - (c.reference.u[0] - c.bias[0]), c.raw[1] - (c.reference.u[1] - c.bias[1])];
}
for (const key of ['twistGain', 'ankleGain'] as const) {
  const one = lastTick(key, 1);
  const hi = lastTick(key, 1.3);
  const lo = lastTick(key, 0.7);
  console.log(JSON.stringify({ check: key, feedbackAt1: one, ratio13: [hi[0] / one[0], hi[1] / one[1]], ratio07: [lo[0] / one[0], lo[1] / one[1]] }));
}
void feedback;

function firstMove(shift: number): number {
  WOBBLE.senseShift = shift;
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
  WOBBLE.senseShift = 0;
  return first;
}
console.log(JSON.stringify({ check: 'senseShift', firstEstimateMove: { '-2': firstMove(-2), '0': firstMove(0), '+2': firstMove(2) } }));

function fins(f: number): number {
  WOBBLE.fins = f;
  const board = new BoardBody({});
  const water = new PlaneWater({});
  board.place(new Vector3(0, board.shape.centerOfMass.y - 0.02, 0), new Quaternion(), new Vector3(0.6, 0, 6), new Vector3());
  board.step(1 / 60, water);
  WOBBLE.fins = 1;
  return board.forces.fins.length();
}
const f1 = fins(1);
console.log(JSON.stringify({ check: 'fins, one step (the slip itself changes within the step)', force1: f1, ratio13: fins(1.3) / f1, ratio07: fins(0.7) / f1 }));
// At the same slip: the fins' explicit force and implicit damping from one call of `applyFoils` on the placed board.
function finsAt(f: number): { force: number; damping: number } {
  WOBBLE.fins = f;
  const board = new BoardBody({}) as Any;
  const water = new PlaneWater({});
  board.place(new Vector3(0, board.shape.centerOfMass.y - 0.02, 0), new Quaternion(), new Vector3(0.6, 0, 6), new Vector3());
  board.updateRotation();
  board.applyFoils(1 / 960, water, new Float64Array(36));
  const ft = board.foilTotals;
  let damping = 0;
  for (let k = 0; k < board.foils.length; k += 1) if (board.foils[k].kind === 'fin') damping += board.foilDamping[k];
  WOBBLE.fins = 1;
  return { force: Math.hypot(ft[0], ft[1], ft[2]), damping };
}
const a1 = finsAt(1), a13 = finsAt(1.3), a07 = finsAt(0.7);
console.log(JSON.stringify({ check: 'fins, at the same slip', force1: a1.force, forceRatio13: a13.force / a1.force, forceRatio07: a07.force / a1.force, dampingRatio13: a13.damping / a1.damping, dampingRatio07: a07.damping / a1.damping }));
