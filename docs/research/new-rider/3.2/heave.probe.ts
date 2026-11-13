// Step 3.2m (ruling 29t item 2): the balance model with the board's HEAVE and PITCH as states, on the captive plant,
// against the ten-state model on the free plant. Model only; no game, no water.
//
// The question: 3.2f concluded that past about 15° of rail the plant cannot be stabilised by any controller. That
// conclusion came from the side force per sideslip changing sign — and ruling 29t showed that sign change is the
// board's own re-trim in heave and pitch, folded into a three-state plant as if it were instant. It is not instant: it
// takes one to two seconds and it rings. So:
//
// - `free`: the ten-state model on the settled free plant (`../rail-dig/results/settled.jsonl`, part `free`). This is
//   what the game would use with the corrected table.
// - `heave`: the fourteen-state model on the captive plant (part `frozen`) with the four heave and pitch states
//   carrying what the free plant folded in. Same water, told the truth about when it arrives.
// - `free06`: the ten-state model on 3.2f's own numbers (`RAIL_PLANT` as shipped), for the comparison.
//
// Also `check`: the quasi-static elimination of the two new states, against the measured free derivative — whether
// condensing them is even well conditioned.
//
//   PART=modes,check   RAILS=0,10,15,20,30,40   SPEEDS=5,7,9   DEPTHS=0,0.3
import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { boardDerivatives, eigenvalues, type HeavePlant, type TwistPlant, type YawPlant } from '../../../../src/physics/rollModel';
import {
  CONTROL_STEP, DEFAULT_WEIGHTS, N_STATE, RAIL_PLANT, boardInertiaAt, closedLoop, continuousPlant, design, discretise, leastDamping, plantAt, stanceAt,
  type Design, type DesignWeights,
} from '../../../../src/physics/predictiveBalance';
import { emit, r } from '../../board-in-water/lab';

const PARTS = (process.env.PART ?? 'modes,check').split(',');
const SPEEDS = (process.env.SPEEDS ?? '5,7,9').split(',').map(Number);
const RAILS = (process.env.RAILS ?? '0,10,15,20,30,40').split(',').map(Number);
const DEPTHS = (process.env.DEPTHS ?? '0,0.3').split(',').map(Number);
const WEIGHTS: DesignWeights = { ...DEFAULT_WEIGHTS, ...(process.env.WEIGHTS ? JSON.parse(process.env.WEIGHTS) : {}) };
const STANCE = (d: number) => (d === 0 ? 'tall' : d < 0.25 ? 'crouch' : 'compress');
const DEG = 180 / Math.PI;

/** The settled sweep (`../rail-dig/settled.probe.ts`): one row per speed, rail and set. */
interface Row {
  part: string; v: number; rail: number; stalled?: boolean;
  trim: Record<string, number | null>;
  roll: Deriv; slip: Deriv; yaw: Deriv; rate: Deriv;
  heave?: Deriv; heaveRate?: Deriv; pitch?: Deriv; pitchRate?: Deriv;
}
interface Deriv { per: number[]; settled: boolean }
// The free rows come from the ten-second holds (`settled-long.jsonl`, the table `RAIL_PLANT` now carries); the frozen
// rows and the heave and pitch derivatives from the four-second sweep, where they are constant to the digit from the
// first rung of the ladder because that hold leaves the board no free degree of freedom at all.
const rows: Row[] = [
  ...readFileSync(new URL('../rail-dig/results/settled-long.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Row).filter((x) => x.part === 'free'),
  ...readFileSync(new URL('../rail-dig/results/settled.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Row).filter((x) => x.part === 'frozen'),
];
const row = (part: string, v: number, rail: number) => rows.find((x) => x.part === part && x.v === v && x.rail === rail);

/**
 * The lab's [N, Y, K] in the model's axes, as `boardDerivatives` does it: N and Y flip, K keeps, and the yaw rate's
 * own variable flips too (so its row keeps its sign). The reference point's shift forward is left to
 * `boardDerivatives`; this only hands it the lab table.
 */
function labOf(x: Row): { roll: number[]; slip: number[]; yaw: number[]; rate: number[] } {
  const three = (d: Deriv) => [d.per[0], d.per[1], d.per[2]];
  return { roll: three(x.roll), slip: three(x.slip), yaw: three(x.yaw), rate: three(x.rate) };
}

/**
 * The heave block from the frozen row. The lab's M and Z are already in the model's sense (Z up, M nose up, h up,
 * pitch nose up); the N and Y of the heave and pitch columns flip as every other N and Y does, and K keeps.
 *
 * The mass and the pitch inertia are the board's and the rider's together about the deck under the rider: the rider
 * (73 kg) stands `height` over its feet and the board's own pitch inertia and mass are the reference board's
 * (2.54 kg, 0.60 kg·m² about its own centre, 0.845 m under the rider's). This model gives the rider no heave or pitch
 * freedom of its own, so they move as one.
 */
function heaveOf(x: Row, depth: number): HeavePlant {
  const flip = (d: Deriv) => [-d.per[0], -d.per[1], d.per[2], d.per[3], d.per[4]];
  const h = stanceAt(depth).height;
  const mass = 73 + 2.54;
  // The rider as a point at `h` over the deck, plus the board's own about the deck.
  const pitchInertia = 73 * h * h + 0.60 + 2.54 * 0.08 * 0.08;
  return {
    mass, pitchInertia,
    perHeave: flip(x.heave!), perHeaveRate: flip(x.heaveRate!), perPitch: flip(x.pitch!), perPitchRate: flip(x.pitchRate!),
    pitchVert: {
      roll: [x.roll.per[3], x.roll.per[4]], slip: [x.slip.per[3], x.slip.per[4]],
      // The yaw rate's variable flips, so the M and Z it makes flip with it.
      yaw: [-x.yaw.per[3], -x.yaw.per[4]], rate: [x.rate.per[3], x.rate.per[4]],
    },
  };
}

/**
 * `plantAt`'s plant with the twelve derivatives replaced by a measured row, and the heave block added when given.
 * `boardDerivatives` makes the same axis change and reference shift the shipped table goes through (0.236 m forward).
 */
function plantFrom(x: Row, speed: number, depth: number, heave?: HeavePlant): { y: YawPlant; t: TwistPlant } {
  const { y, t } = plantAt(speed, depth);
  const board = boardInertiaAt(speed);
  const out: YawPlant = {
    ...y, boardRollInertia: board.roll, boardYawInertia: board.yaw,
    ...boardDerivatives(labOf(x), speed, 0.236), ...(heave ? { heave } : {}),
  };
  return { y: out, t };
}

/** The least damping of a controller on a plant, its senses `trueDelay` s late. */
function check(d: Design, y: YawPlant, t: TwistPlant, trueDelay = 0.1) {
  const { a, b } = continuousPlant(y, t);
  const { phi, gamma } = discretise(a, b, CONTROL_STEP);
  const m = closedLoop(phi, gamma, Math.round(trueDelay / CONTROL_STEP), d);
  try {
    return leastDamping(eigenvalues(m, { balance: true, maxIterations: 4000 }));
  } catch {
    return { damping: -Infinity, frequency: 0, radius: 0 };
  }
}

it('the model with heave and pitch as states, against the ten-state model on the free plant', () => {
  if (!PARTS.includes('modes')) return;
  for (const depth of DEPTHS) for (const v of SPEEDS) for (const deg of RAILS) {
    const free = row('free', v, deg);
    const frozen = row('frozen', v, deg);
    const out: Record<string, unknown> = { part: 'modes', speed: v, stance: STANCE(depth), rail: deg };
    if (!free || free.stalled || !frozen || frozen.stalled) { emit({ ...out, stalled: true }); continue; }
    out.trim = free.trim;
    out.settled = { roll: free.roll.settled, slip: free.slip.settled, yaw: free.yaw.settled, rate: free.rate.settled };
    // 1. The ten-state model on the settled free plant.
    {
      const { y, t } = plantFrom(free, v, depth);
      const d = design(y, t, WEIGHTS);
      const own = check(d, y, t);
      const early = check(d, y, t, 5 * CONTROL_STEP);
      const late = check(d, y, t, 7 * CONTROL_STEP);
      out.free = [r(own.damping, 3), r(own.frequency, 2)];
      out.freeTiming = [r(early.damping, 3), r(late.damping, 3)];
      out.states = y.heave ? 14 : N_STATE;
    }
    // 2. The fourteen-state model on the captive plant with heave and pitch carried.
    {
      const heave = heaveOf(frozen, depth);
      const { y, t } = plantFrom(frozen, v, depth, heave);
      const d = design(y, t, WEIGHTS);
      const own = check(d, y, t);
      const early = check(d, y, t, 5 * CONTROL_STEP);
      const late = check(d, y, t, 7 * CONTROL_STEP);
      out.heave = [r(own.damping, 3), r(own.frequency, 2)];
      out.heaveTiming = [r(early.damping, 3), r(late.damping, 3)];
      // The straight design (rail 0) on this rail's plant: what the rider does when the schedule is capped.
      const zero = row('frozen', v, 0)!;
      const flat = design(plantFrom(zero, v, depth, heaveOf(zero, depth)).y, t, WEIGHTS);
      const wrong = check(flat, y, t);
      out.heaveStraightDesign = [r(wrong.damping, 3), r(wrong.frequency, 2)];
    }
    // 3. 3.2f's shipped numbers, for the comparison.
    {
      const shipped = RAIL_PLANT[`${v}|${deg}`];
      if (shipped) {
        const { y, t } = plantFrom({ ...free, roll: { per: [...shipped.roll, 0, 0], settled: false }, slip: { per: [...shipped.slip, 0, 0], settled: false }, yaw: { per: [...shipped.yaw, 0, 0], settled: false }, rate: { per: [...shipped.rate, 0, 0], settled: false } }, v, depth);
        const d = design(y, t, WEIGHTS);
        out.shipped = [r(check(d, y, t).damping, 3), r(check(d, y, t).frequency, 2)];
      }
    }
    // The straight design on the free plant at this rail (3.2f's own "straightDesign" column).
    {
      const zero = row('free', v, 0)!;
      const { y, t } = plantFrom(free, v, depth);
      const flat = design(plantFrom(zero, v, depth).y, t, WEIGHTS);
      out.freeStraightDesign = [r(check(flat, y, t).damping, 3)];
    }
    emit(out);
  }
});

/**
 * Is condensing the heave and the pitch even well conditioned? The quasi-static elimination says
 * `[Z_h Z_θ; M_h M_θ] [dh; dθ] = −[Z_β; M_β]` and then `Y_β,free ≈ Y_β,frozen + Y_h dh + Y_θ dθ`. This compares that
 * prediction with the measured free derivative, and reports the size of the two terms that cancel.
 */
it('the quasi-static elimination against the measured free derivative', () => {
  if (!PARTS.includes('check')) return;
  for (const v of SPEEDS) for (const deg of RAILS) {
    const free = row('free', v, deg);
    const frozen = row('frozen', v, deg);
    if (!free || free.stalled || !frozen || frozen.stalled) continue;
    const Zh = frozen.heave!.per[4]; const Zp = frozen.pitch!.per[4];
    const Mh = frozen.heave!.per[3]; const Mp = frozen.pitch!.per[3];
    const det = Zh * Mp - Zp * Mh;
    const out: Record<string, unknown> = { part: 'check', v, rail: deg, det: r(det, 0) };
    for (const [name, k] of [['N', 0], ['Y', 1], ['K', 2]] as const) {
      const Zb = frozen.slip!.per[4]; const Mb = frozen.slip!.per[3];
      const dh = (-Zb * Mp + Zp * Mb) / det;
      const dp = (-Mb * Zh + Mh * Zb) / det;
      const captive = frozen.slip!.per[k];
      const viaHeave = frozen.heave!.per[k] * dh;
      const viaPitch = frozen.pitch!.per[k] * dp;
      out[name] = {
        captive: r(captive, 1), viaHeave: r(viaHeave, 1), viaPitch: r(viaPitch, 1),
        predicted: r(captive + viaHeave + viaPitch, 1), measured: r(free.slip!.per[k], 1),
        error: r(captive + viaHeave + viaPitch - free.slip!.per[k], 1),
        // How much cancellation: the biggest term over the answer.
        cancellation: r(Math.max(Math.abs(captive), Math.abs(viaHeave), Math.abs(viaPitch)) / Math.max(1, Math.abs(free.slip!.per[k])), 1),
      };
      if (name === 'Y') { out.dHeightPerRad = r(dh, 4); out.dPitchPerRad = r(dp, 4); }
    }
    emit(out);
  }
});
