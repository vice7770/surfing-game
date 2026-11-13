// The big-rail plant, re-measured with every hold SHOWN SETTLED (ruling 29t item 1). The roll-plant lab's rail sweep,
// but each derivative is held for HOLD s (4 by default) and reported as a LADDER against how long the hold has run, so
// a reader can see it settled instead of being told. Two sets at each point:
//
// - `free`: roll, slip and yaw rate held at the trim, the pitch and the heave free, as 3.2f measured it. This is the
//   plant the model uses. Its 0.6 s reading lands on the heave's overshoot (`../rail-dig/README.md` §5.1), which is why
//   this is remeasured.
// - `frozen`: the same with the pitch and the centre of mass's height held at the trim, PLUS the heave and pitch
//   derivatives themselves (per metre, per m/s, per rad, per rad/s). These are the four extra plant columns and two
//   extra rows the balance model needs if it is to carry heave and pitch as states (ruling 29t item 2).
//
// Generalised force each time: N (yaw moment about world up, + toward the board's left), Y (side force along its level
// left), K (roll moment about the deck under the rider, along the board's long axis), M (pitch moment about the same
// deck point, nose up +), Z (vertical force, + up).
//
//   PART=free,frozen   RAILS=0,10,15,20,30,40   SPEEDS=5,7,9   HOLD=4   TRIM=8
//
// Reads src/ and ../roll-plant/plant.ts; changes nothing there. Not part of the suite.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Vector3 } from 'three';
import { DEG, Flat, G, GROUPS, Lab, STEP, euler, r, sum, type Hold, type Ledger } from '../roll-plant/plant';

const PART = (process.env.PART ?? 'free,frozen').split(',');
const SPEEDS = (process.env.SPEEDS ?? '5,7,9').split(',').map(Number);
const RAILS = (process.env.RAILS ?? '0,10,15,20,30,40').split(',').map(Number);
const TRIM = Number(process.env.TRIM ?? 8);
const HOLD = Number(process.env.HOLD ?? 4);
const BACK = Number(process.env.BACK ?? 0.8);
/** The window averaged at each rung of the ladder, s. */
const WINDOW = Number(process.env.WINDOW ?? 0.25);
/**
 * The window averaged for the number that is kept, s, and the half-window the settling test compares. A rail's heave
 * rings for a second or two (`../rail-dig/README.md` §5.1) and at 30° and 40° it does not stop ringing, so the kept
 * number is a whole second's mean, not a quarter's, and a point that still moves over the last two half-seconds is
 * marked `settled: false` rather than quietly averaged.
 */
const KEEP = Number(process.env.KEEP ?? 1);
/** The rungs, s since the perturbation went on. 0.6 is 3.2f's reading; 4 is this one's. */
const LADDER = (process.env.LADDER ?? '0.35,0.6,1,1.5,2,3,4').split(',').map(Number);
const DECK = { x: 0, y: 0.07, z: -0.30 };
const water = new Flat();

function emit(line: unknown): void {
  const out = process.env.OUT;
  if (out) appendFileSync(out, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

function settled(v: number): Lab {
  const lab = new Lab(water, 'point');
  lab.place(v);
  lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0 };
  for (let i = 0; i < Math.round(2.5 / STEP); i += 1) lab.frame();
  return lab;
}

/**
 * The generalised force [N, Y, K, M, Z] of one frame's ledger, in the lab's axes and **the plant table's reference
 * points**: N about the board's centre of mass (as `PLANT_SPEEDS` and `RAIL_PLANT` carry it), K and M about the deck
 * under the rider (as the roll plant's `Kdeck` and the pitch plant's M carry them), Y and Z forces.
 *
 * The distinction matters: at a trimmed board the arm from the deck to the centre of mass leans back, so moving N to
 * the deck shifts it by about 0.14 m times the side force — 190 N·m per radian of slip at 7 m/s, which is two thirds
 * of the number itself.
 */
function force(lab: Lab, book: Ledger): number[] {
  const { fwd, left } = lab.axes();
  const levelLeft = left.clone().setY(0).normalize();
  const deck = lab.board.toWorld(DECK, new Vector3());
  const arm = lab.board.centerOfMass.clone().sub(deck);
  const F = sum(book.force, GROUPS.all);
  const about = sum(book.moment, GROUPS.all);
  const atDeck = about.clone().add(arm.clone().cross(F));
  return [about.y, F.dot(levelLeft), atDeck.dot(fwd), -atDeck.dot(left), F.y];
}

/** The same split three ways, for the record: the hull's pressure, the fins and the rails' side faces. */
function parts(lab: Lab, book: Ledger): Record<string, number[]> {
  const { fwd, left } = lab.axes();
  const levelLeft = left.clone().setY(0).normalize();
  const out: Record<string, number[]> = {};
  for (const name of ['pressure', 'fins', 'rails', 'friction'] as const) {
    const F = sum(book.force, GROUPS[name]);
    const M = sum(book.moment, GROUPS[name]);
    out[name] = [r(M.y, 1)!, r(F.dot(levelLeft), 1)!, r(M.dot(fwd), 1)!, r(F.y, 1)!];
  }
  return out;
}

/** A mean over the `width` s of frames ending at `endSeconds`. */
function windowMean(trace: number[][], endSeconds: number, width = WINDOW): number[] {
  const end = Math.min(trace.length, Math.round(endSeconds / STEP));
  const start = Math.max(0, end - Math.round(width / STEP));
  const out = [0, 0, 0, 0, 0];
  for (let i = start; i < end; i += 1) for (let k = 0; k < 5; k += 1) out[k] += trace[i][k] / (end - start);
  return out;
}

interface Point { trim: Record<string, number | null>; r0: number; b0: number; pitch0: number; y0: number }

/** Settle at the rail with the yaw and the slip free; the trim it makes. */
function trimAt(lab: Lab, v: number, rail: number): Point | null {
  lab.hold = { speed: v, roll: rail / DEG };
  const reads: ReturnType<Lab['read']>[] = [];
  const levels: number[] = [];
  const heights: number[] = [];
  const n = Math.round(TRIM / STEP);
  for (let i = 0; i < n; i += 1) {
    lab.frame();
    if (i >= n - Math.round(2 / STEP)) {
      reads.push(lab.read()); heights.push(lab.board.centerOfMass.y);
      const d = euler(lab.board.orientation).heading - Math.atan2(lab.board.velocity.x, lab.board.velocity.z);
      levels.push(d - 2 * Math.PI * Math.round(d / (2 * Math.PI)));
    }
  }
  const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
  const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
  const r0 = mean(reads.map((x) => x.yawRate));
  const b0 = mean(levels);
  if (!Number.isFinite(r0) || !Number.isFinite(b0) || Math.abs(b0 * DEG) > 20) return null;
  return {
    r0, b0, pitch0: mean(reads.map((x) => x.pitch)) / DEG, y0: mean(heights),
    trim: {
      roll: rail, yawRate: r(r0, 4), slipDeg: r(b0 * DEG, 3), pitch: r(mean(reads.map((x) => x.pitch)), 2),
      draft: r(mean(reads.map((x) => x.draft)), 4), heightM: r(mean(heights), 4),
      yawSpread: r(spread(reads.map((x) => x.yawRate)), 4), pitchSpread: r(spread(reads.map((x) => x.pitch)), 3),
      pull: rail > 0 ? r(Math.abs(v * r0) / (G * Math.tan(rail / DEG)), 3) : null,
    },
  };
}

/**
 * One derivative, as a ladder. The base hold runs BACK s, then `h` goes on for HOLD s and the generalised force is
 * traced every frame. Done for the low and the high perturbation, and the central difference taken at each rung.
 * `settled` compares the last two half-windows of the hold: true when they agree within 2 % of the value or 3 units.
 */
function ladder(lab: Lab, base: Hold, lo: Hold, hi: Hold, step: number, hold = HOLD, judge = 3) {
  const run = (h: Hold) => {
    lab.hold = base;
    for (let i = 0; i < Math.round(BACK / STEP); i += 1) lab.frame();
    lab.hold = { ...base, ...h };
    const trace: number[][] = [];
    const ps: Record<string, number[]>[] = [];
    const n = Math.round(hold / STEP);
    for (let i = 0; i < n; i += 1) {
      const b = lab.frame();
      trace.push(force(lab, b));
      if (i >= n - Math.round(WINDOW / STEP)) ps.push(parts(lab, b));
    }
    return { trace, ps };
  };
  const a = run(lo);
  const b = run(hi);
  const at = (t: number, width = WINDOW) => {
    const x = windowMean(a.trace, t, width);
    const y = windowMean(b.trace, t, width);
    return y.map((v, k) => r((v - x[k]) / step, 1)!);
  };
  const rungs = LADDER.filter((t) => t <= hold + 1e-9).map((t) => [t, ...at(t)]);
  // The number kept is the whole last KEEP s; the settling test compares its two halves. Only the components the
  // table uses are judged (N, Y, K, and M and Z for the frozen set): the vertical force rings about zero on a free
  // trim, and a ring about zero is not a number anyone reads.
  const keep = Math.min(KEEP, hold);
  const end = at(hold, keep);
  const first = at(hold - keep / 2, keep / 2);
  const second = at(hold, keep / 2);
  const ok = first.slice(0, judge).every((v, k) => Math.abs(second[k] - v) <= Math.max(3, 0.03 * Math.abs(end[k])));
  const move = first.slice(0, judge).map((v, k) => r(second[k] - v, 1)!);
  // The three-way split at the end of the hold, same central difference.
  const splitEnd: Record<string, number[]> = {};
  for (const name of Object.keys(a.ps[0])) {
    splitEnd[name] = a.ps[0][name].map((_, k) => {
      const x = a.ps.reduce((s, p) => s + p[name][k], 0) / a.ps.length;
      const y = b.ps.reduce((s, p) => s + p[name][k], 0) / b.ps.length;
      return r((y - x) / step, 1)!;
    });
  }
  return { rungs, settled: end, ok, move, split: splitEnd };
}

/** The twelve (free) or twenty (frozen) derivatives at every rail and speed, each one a ladder. */
function sweep(frozen: boolean): void {
  for (const v of SPEEDS) for (const rail of RAILS) {
    const lab = settled(v);
    const point = trimAt(lab, v, rail);
    if (!point) { emit({ part: frozen ? 'frozen' : 'free', v, rail, stalled: true }); continue; }
    const { r0, b0, pitch0, y0 } = point;
    const base: Hold = { speed: v, roll: rail / DEG, yawRate: r0, slip: b0, ...(frozen ? { pitch: pitch0, height: y0 } : {}) };
    const out: Record<string, unknown> = { part: frozen ? 'frozen' : 'free', v, rail, trim: point.trim, hold: HOLD };
    // The free set's twelve derivatives are [N, Y, K]; the frozen set's rows also carry M and Z.
    const judge = frozen ? 5 : 3;
    const one = (name: string, lo: Hold, hi: Hold, step: number, seconds = HOLD) => {
      const l = ladder(lab, base, lo, hi, step, seconds, judge);
      out[name] = { per: l.settled, settled: l.ok, moveOverLastHalf: l.move, ladder: l.rungs, split: l.split };
    };
    one('roll', { roll: (rail - 1) / DEG }, { roll: (rail + 1) / DEG }, 2 / DEG);
    one('slip', { slip: b0 - 1 / DEG }, { slip: b0 + 1 / DEG }, 2 / DEG);
    one('yaw', { yawRate: r0 - 0.1 }, { yawRate: r0 + 0.1 }, 0.2);
    // The roll angle is pinned each substep before the rate is imposed (`plant.ts` constrain), so the board does not
    // drift off its rail and this can be held as long as the others.
    one('rate', { rollRate: -0.2, rollAxis: DECK }, { rollRate: 0.2, rollAxis: DECK }, 0.4);
    if (frozen) {
      one('heave', { height: y0 - 0.02 }, { height: y0 + 0.02 }, 0.04);
      one('heaveRate', { heaveRate: -0.2 }, { heaveRate: 0.2 }, 0.4);
      one('pitch', { pitch: pitch0 - 1 / DEG }, { pitch: pitch0 + 1 / DEG }, 2 / DEG);
      one('pitchRate', { pitchRate: -0.2 }, { pitchRate: 0.2 }, 0.4);
    }
    // The base measured again at the end of the point: how far the trim drifted over all those holds.
    const drift = ladder(lab, base, {}, {}, 1, 0.5, judge);
    out.baseDrift = drift.settled;
    emit(out);
  }
}

it('the big-rail plant with the pitch and the heave free, every hold shown settled', () => {
  if (PART.includes('free')) sweep(false);
});

it('the big-rail plant with the trim held, and the heave and pitch derivatives the model needs', () => {
  if (PART.includes('frozen')) sweep(true);
});
