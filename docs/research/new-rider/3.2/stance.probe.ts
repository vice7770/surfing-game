// Step 3.2m, the owner's three points from riding 3.2L (the coordinator's second message). Model only; no game, no
// water. One line per row ($OUT).
//
// - `stance` (the owner's point 3, "the balance is too soft, the surfer should not fall so much when lowered"): what
//   the schedule is doing for Compress TODAY, before anything is changed. Per stance: whether it is a schedule corner
//   or an interpolation, the gains it is designed with, the closed loop's least damping nominal and with a frame of
//   timing error, the body's own falling rate ω₀ = √(g/L), the share of that time constant the fixed 0.1 s sensing
//   delay takes, and the lean at which the capture point reaches the feet's edge.
// - `counter` (point 2, "the body adjusts as the turn happens compensating to the opposite side"): where the
//   counter-steer comes from. Two candidates, separated. (a) The REFERENCE: `steadyTurn` solves for the steady state
//   that holds the lean asked, and `ref.x[0]` is the board's roll in it — if that has the opposite sign to the lean,
//   the reference itself asks for the wrong rail. (b) The LQR's own transient: the ideal closed loop (no delay, exact
//   state) stepped to that reference, and whether the board's roll goes the wrong way first and by how much. If (a) is
//   same-signed and (b) undershoots, the counter-steer is the design's, not the reference's.
//
//   PART=stance,counter   SPEEDS=5,7,9   DEPTHS=0,0.195,0.3   RAILS=0,12   LEAN=30 (degrees asked)
import { it } from 'vitest';
import { eigenvalues } from '../../../../src/physics/rollModel';
import {
  CONTROL_STEP, DEFAULT_WEIGHTS, N_STATE, PREDICT_DELAY, SCHEDULE_DEPTHS, captureRow, closedLoop, continuousPlant,
  design, discretise, leastDamping, plantAt, stanceAt, steadyTurn, type Design, type DesignWeights,
} from '../../../../src/physics/predictiveBalance';
import { emit, r } from '../../board-in-water/lab';

const PARTS = (process.env.PART ?? 'stance,counter').split(',');
const SPEEDS = (process.env.SPEEDS ?? '5,7,9').split(',').map(Number);
const DEPTHS = (process.env.DEPTHS ?? '0,0.195,0.3').split(',').map(Number);
const RAILS = (process.env.RAILS ?? '0,12').split(',').map(Number);
const LEAN = Number(process.env.LEAN ?? 30);
const WEIGHTS: DesignWeights = { ...DEFAULT_WEIGHTS, ...(process.env.WEIGHTS ? JSON.parse(process.env.WEIGHTS) : {}) };
const DEG = 180 / Math.PI;
const GRAVITY = 9.81;
const STANCE = (d: number) => (d === 0 ? 'tall' : d < 0.25 ? 'crouch' : 'compress');
/** Half the feet's width, m: how far the centre of pressure can move across (`AttachedRider`'s footReach). */
const FOOT_REACH = 0.13;

function check(d: Design, speed: number, depth: number, rail: number, trueDelay = PREDICT_DELAY) {
  const { y, t } = plantAt(speed, depth, { rail: (rail * Math.PI) / 180 });
  const { a, b } = continuousPlant(y, t);
  const { phi, gamma } = discretise(a, b, CONTROL_STEP);
  try {
    return leastDamping(eigenvalues(closedLoop(phi, gamma, Math.round(trueDelay / CONTROL_STEP), d), { balance: true, maxIterations: 400 }));
  } catch {
    return { damping: -Infinity, frequency: 0, radius: 0 };
  }
}

it('what the schedule does for each stance today (the owner\'s point 3)', () => {
  if (!PARTS.includes('stance')) return;
  for (const speed of SPEEDS) for (const depth of DEPTHS) for (const rail of RAILS) {
    const st = stanceAt(depth);
    const { y, t } = plantAt(speed, depth, { rail: (rail * Math.PI) / 180 });
    const d = design(y, t, WEIGHTS);
    const own = check(d, speed, depth, rail);
    const early = check(d, speed, depth, rail, 5 * CONTROL_STEP);
    const late = check(d, speed, depth, rail, 7 * CONTROL_STEP);
    // The body's own falling rate and the delay's share of its time constant.
    const omega0 = Math.sqrt(GRAVITY / st.height);
    // The capture point ξ = L (θ + θ̇/ω₀) reaches the feet's edge at this lean, standing still (θ̇ = 0).
    const leanAtEdge = (FOOT_REACH / st.height) * DEG;
    const cap = captureRow(y);
    emit({
      part: 'stance', speed, stance: STANCE(depth), depth, rail,
      // Is this stance a corner of the schedule, or a blend of two?
      corner: SCHEDULE_DEPTHS.includes(depth),
      heightM: r(st.height, 3), omega0: r(omega0, 3), timeConstantS: r(1 / omega0, 3),
      delayShare: r(PREDICT_DELAY * omega0, 3), leanAtFootEdgeDeg: r(leanAtEdge, 2),
      captureRow: [r(cap[2], 3), r(cap[3], 3)],
      // The gains the design comes out with. The ankle's are rad of rest per rad (or rad/s) of state.
      gains: {
        ankleRoll: r(-d.k[0][0], 3), ankleRollRate: r(-d.k[0][1], 3), ankleBank: r(-d.k[0][2], 3), ankleBankRate: r(-d.k[0][3], 3),
        ankleYaw: r(-d.k[0][4], 3), ankleSlip: r(-d.k[0][5], 2),
        twistBank: r(-d.k[1][2], 1), twistBankRate: r(-d.k[1][3], 1), twistYaw: r(-d.k[1][4], 1),
      },
      nominal: [r(own.damping, 3), r(own.frequency, 2)],
      timing: [r(early.damping, 3), r(late.damping, 3)],
      // What the gains do per degree of bank, in degrees of ankle rest: what the feet are actually asked for.
      restPerBankDeg: r(-d.k[0][2], 3),
      // And the moment that rest commands through the ankle (k = 800 N·m/rad), against what the feet can hold
      // (the load times FOOT_REACH). Over 1 the command cannot be delivered.
      restMomentAt10Deg: r((800 * -d.k[0][2] * 10) / DEG, 1),
      feetCanHold: r(y.mass * GRAVITY * FOOT_REACH, 1),
    });
  }
});

/**
 * The counter-steer (point 2). The reference first: `steadyTurn` for the lean asked, as `Predictor.tick` builds it
 * (including the `turn: 'tan'` correction, which is the default). Then the ideal closed loop stepped to it:
 * x_{k+1} = (Φ − ΓK) x_k + Γ (u_ref + K x_ref), with the board's roll traced. No delay and no estimator, so anything
 * that goes the wrong way here is the design's own doing and not the delay's.
 */
it('where the counter-steer comes from (the owner\'s point 2)', () => {
  if (!PARTS.includes('counter')) return;
  for (const speed of SPEEDS) for (const depth of DEPTHS) for (const rail of RAILS) {
    const { y, t } = plantAt(speed, depth, { rail: (rail * Math.PI) / 180 });
    const d = design(y, t, WEIGHTS);
    const bank = LEAN / DEG;
    // (a) The reference, exactly as `tick` makes it with turn: 'tan'.
    const plain = steadyTurn(d.phi, d.gamma, bank, 0);
    const tanRef = (() => {
      const s = steadyTurn(d.phi, d.gamma, Math.tan(bank), 0);
      const f = bank / Math.tan(bank);
      return { x: s.x.map((v, i) => (i === 0 || i === 2 || i === 8 ? v * f : v)), u: [s.u[0] * f, s.u[1]] };
    })();
    // (b) The ideal closed loop to that reference.
    const n = N_STATE;
    const kx = Array.from({ length: 2 }, (_, q) => tanRef.x.reduce((s, v, j) => s + d.k[q][j] * v, 0));
    const feed = [tanRef.u[0] + kx[0], tanRef.u[1] + kx[1]];
    let x = new Array<number>(n).fill(0);
    const trace: number[][] = [];
    let firstWrong = 0;
    let railAt = Number.NaN;
    for (let step = 0; step < Math.round(1.5 / CONTROL_STEP); step += 1) {
      const u = feed.map((f, q) => f - d.k[q].reduce((s, v, j) => s + v * x[j], 0));
      const next = new Array<number>(n).fill(0);
      for (let i = 0; i < n; i += 1) {
        let s = 0;
        for (let j = 0; j < n; j += 1) s += d.phi[i][j] * x[j];
        for (let q = 0; q < 2; q += 1) s += d.gamma[i][q] * u[q];
        next[i] = s;
      }
      x = next;
      const t2 = (step + 1) * CONTROL_STEP;
      // The rail (x[0]) against the lean asked: the wrong way is the opposite sign to the reference's rail.
      const wrongWay = Math.sign(tanRef.x[0]) * x[0] < 0 ? Math.abs(x[0]) : 0;
      firstWrong = Math.max(firstWrong, wrongWay);
      if (Number.isNaN(railAt) && Math.sign(tanRef.x[0]) * x[0] >= 0.9 * Math.abs(tanRef.x[0])) railAt = t2;
      if ([0.017, 0.05, 0.1, 0.167, 0.25, 0.35, 0.5, 0.75, 1, 1.5].some((m) => Math.abs(t2 - m) < CONTROL_STEP / 2)) {
        trace.push([r(t2, 3)!, r(x[0] * DEG, 3)!, r(x[2] * DEG, 3)!, r(x[8] * DEG, 3)!]);
      }
    }
    emit({
      part: 'counter', speed, stance: STANCE(depth), rail, leanAskedDeg: LEAN,
      // The reference: the board's roll, the bank and the ankle's rest it asks for, in degrees.
      refRailDeg: r(tanRef.x[0] * DEG, 3), refBankDeg: r(tanRef.x[2] * DEG, 3), refRestDeg: r(tanRef.x[8] * DEG, 3),
      refYawRate: r(tanRef.x[4], 4), refSlipDeg: r(tanRef.x[5] * DEG, 3),
      plainRefRailDeg: r(plain.x[0] * DEG, 3),
      // Does the reference itself ask for the opposite rail to the lean?
      referenceIsOpposite: Math.sign(tanRef.x[0]) !== Math.sign(bank),
      // The ideal loop: the largest wrong-way rail, and when the rail reaches 90 % of the reference.
      wrongWayRailDeg: r(firstWrong * DEG, 3), wrongWayShare: r(firstWrong / Math.max(1e-9, Math.abs(tanRef.x[0])), 3),
      railReaches90At: r(railAt, 3),
      // t, rail°, bank°, ankle rest°
      trace,
    });
  }
});
