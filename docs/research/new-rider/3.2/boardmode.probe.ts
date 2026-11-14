// Step 3.2p: **the board's own heave and pitch mode, measured in the game**, against what the captive block says it is.
//
// Why this probe exists. 3.2m carried the board's heave and pitch as four states built from the lab's CAPTIVE
// derivatives (`HEAVE_PLANT`), and found the whole loop's least damped mode was then the board's own, at 0.33-0.74 Hz.
// Designing on that block, step 3.2p found something 3.2m's own results file already contained and did not name: at
// no rail, 5, 9 and 12 m/s, the **design has no solution**. At no rail the block is uncoupled from the other ten
// states - the hull's own symmetry makes a roll or a slide produce no net pitching moment or vertical force, as
// measured - so no command reaches it; and there the block's own pair is UNSTABLE (+0.39 /s at 5 m/s, +0.57 at 9 and
// 12, a flutter at 0.8-0.95 Hz between the heave and the pitch). An unstable mode no command reaches is not
// stabilisable, so the Riccati equation has no stabilising solution and the gain comes back non-finite. 3.2m's
// `heave-32m.jsonl` has `null` at exactly those cells and recorded it as the eigensolver not converging.
//
// So before anything is designed on that block, the standing rule of this folder applies to it: **a captive hold's
// number is not used until it is checked.** The block says the board, with its rider, porpoises at 5, 9 and 12 m/s in
// straight running. The game's glide bars say the board holds a steady glide at all four speeds. This probe measures
// which is true, by kicking the board's pitch in a steady glide and watching it come back.
//
//   OUT=/tmp/b.jsonl RIDER=new npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts boardmode
import { it } from 'vitest';
import { Vector3 } from 'three';
import { eigenvalues } from '../../../../src/physics/rollModel';
import { continuousPlant, plantAt, stanceAt } from '../../../../src/physics/predictiveBalance';
import { STEP, Slope, emit, place, r, state, type Rig } from '../../board-in-water/lab';

/**
 * The face whose slope balances the board's drag at a speed, degrees (`bars.probe.ts`'s own TERMINAL, copied rather
 * than imported: importing a probe file runs its suite).
 */
const TERMINAL: [number, number][] = [[5, 13.37], [7, 11.01], [9, 10.37], [12, 11.07]];
function terminalAngle(v: number): number {
  if (v <= TERMINAL[0][0]) return TERMINAL[0][1];
  for (let i = 1; i < TERMINAL.length; i += 1) {
    const [v1, a1] = TERMINAL[i];
    const [v0, a0] = TERMINAL[i - 1];
    if (v <= v1) return a0 + ((a1 - a0) * (v - v0)) / (v1 - v0);
  }
  return TERMINAL[TERMINAL.length - 1][1];
}

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const SPEEDS = (process.env.SPEEDS ?? '5,7,9,12').split(',').map(Number);
/** The pitch rate the board is kicked with, rad/s, and how long it is then watched, s. */
const KICK = Number(process.env.KICK ?? 0.5);
const WATCH = Number(process.env.WATCH ?? 4);
const SETTLE = Number(process.env.SETTLE ?? 3);
const DEG = 180 / Math.PI;

/** The board's nose-up angle over the water's surface, rad, as `AttachedRider` reads the rail across. */
function noseUp(rig: Rig, slope: number): number {
  const up = new Vector3(0, 1, 0).applyQuaternion(rig.board.orientation);
  const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation).setY(0).normalize();
  return Math.atan2(-up.dot(f), up.y) - -slope / DEG;
}
/** The board's own nose-up pitch rate, rad/s (the sense step 3.2p gives the balance). */
/** One frame: the water on, the board's step, the state (`bars.probe.ts`'s). */
function frame(rig: Rig, water: Slope, t: number) {
  (water as { advance?: (dt: number) => void }).advance?.(STEP);
  rig.board.step(STEP, water);
  return state(rig, water, t);
}
function pitchRate(rig: Rig): number {
  const axis = new Vector3(-1, 0, 0).applyQuaternion(rig.board.orientation);
  axis.setY(0).normalize();
  return rig.board.angularVelocity.dot(axis);
}

/**
 * A damped mode from a trace: the frequency from the mean interval between sign changes, the damping from the decay of
 * successive same-sign peaks. Returns null when there is not enough ring to read.
 */
function dampedMode(series: number[], step: number): { frequency: number; damping: number; decay: number } | null {
  const peaks: { i: number; v: number }[] = [];
  for (let i = 1; i < series.length - 1; i += 1) {
    const a = Math.abs(series[i]);
    if (a >= Math.abs(series[i - 1]) && a > Math.abs(series[i + 1]) && a > 1e-5) peaks.push({ i, v: series[i] });
  }
  if (peaks.length < 3) return null;
  const same: number[] = [];
  const gaps: number[] = [];
  for (let i = 0; i + 2 < peaks.length; i += 1) {
    if (Math.sign(peaks[i].v) !== Math.sign(peaks[i + 2].v)) continue;
    same.push(Math.abs(peaks[i + 2].v / peaks[i].v));
    gaps.push((peaks[i + 2].i - peaks[i].i) * step);
  }
  if (!same.length) return null;
  const period = gaps.reduce((s, v) => s + v, 0) / gaps.length;
  const ratio = same.reduce((s, v) => s + v, 0) / same.length;
  const frequency = 1 / period;
  // ratio = exp(-2 pi zeta / sqrt(1 - zeta^2)); solve for zeta.
  const lg = -Math.log(Math.max(ratio, 1e-9));
  const damping = lg / Math.sqrt(4 * Math.PI * Math.PI + lg * lg);
  return { frequency, damping, decay: ratio };
}

it("the board's own heave and pitch mode in the game, against the captive block's", () => {
  for (const v of SPEEDS) {
    const slope = terminalAngle(v);
    const water = new Slope(slope);
    const rig = place(water, 0, 0, v, 'standing');
    rig.rider!.crouch = 0;
    rig.rider!.compress = 0;
    let t = 0;
    let fell = '';
    for (let i = 0; i < Math.round(SETTLE / STEP); i += 1) {
      t = (i + 1) * STEP;
      const s = frame(rig, water, t);
      if (s.fell) { fell = `settling: ${s.fell}`; break; }
    }
    const out: Record<string, unknown> = { bar: 'boardMode', rider: RIDER, speed: v, faceDeg: r(slope, 1) };
    // What the block says, on its own: the four states' eigenvalues with every other state held, which is exactly the
    // condition the derivatives were measured under.
    {
      const { y, t: tw } = plantAt(v, 0, { rail: 0, sink: true });
      const { a } = continuousPlant(y, tw);
      const block = [10, 11, 12, 13].map((i) => [10, 11, 12, 13].map((j) => a[i][j]));
      const eig = eigenvalues(block, { balance: true, maxIterations: 4000 });
      out.blockModes = eig.filter((z) => z.im >= 0).map((z) => [r(z.re, 3), r(z.im / (2 * Math.PI), 3)]);
      out.blockWorst = r(Math.max(...eig.map((z) => z.re)), 3);
      out.pairMass = r(y.heave!.mass, 2);
      out.pairPitchInertia = r(y.heave!.pitchInertia, 3);
      // The same block with the BOARD's own inertia instead of the rigid pair's, which is the other end of the
      // modelling choice `HeavePlant` records ("the rider has no heave or pitch freedom of its own").
      const boardOnly = { ...y, heave: { ...y.heave!, mass: 2.54, pitchInertia: 0.6 } };
      const { a: a2 } = continuousPlant(boardOnly, tw);
      const b2 = [10, 11, 12, 13].map((i) => [10, 11, 12, 13].map((j) => a2[i][j]));
      const e2 = eigenvalues(b2, { balance: true, maxIterations: 4000 });
      out.boardOnlyModes = e2.filter((z) => z.im >= 0).map((z) => [r(z.re, 3), r(z.im / (2 * Math.PI), 3)]);
      out.boardOnlyWorst = r(Math.max(...e2.map((z) => z.re)), 3);
      out.stanceHeight = r(stanceAt(0).height, 3);
    }
    if (fell) { emit({ ...out, fell }); continue; }
    // The steady trim, then the kick.
    const trim0 = noseUp(rig, slope);
    rig.board.angularVelocity.addScaledVector(new Vector3(-1, 0, 0).applyQuaternion(rig.board.orientation), KICK);
    const pitches: number[] = [];
    const rates: number[] = [];
    const heights: number[] = [];
    const loads: number[] = [];
    for (let i = 0; i < Math.round(WATCH / STEP); i += 1) {
      t += STEP;
      const s = frame(rig, water, t);
      pitches.push(noseUp(rig, slope) - trim0);
      rates.push(pitchRate(rig));
      // The heave is the board's draft against the water under it, not its world height: a glide descends the face.
      heights.push(s.draft);
      const q = rig.rider as unknown as { loadSense?: number } | undefined;
      if (q && q.loadSense !== undefined) loads.push(q.loadSense);
      if (s.fell) { fell = s.fell; break; }
    }
    const mode = dampedMode(rates, STEP);
    const late = pitches.slice(Math.round(pitches.length * 0.75));
    emit({
      ...out, fell,
      trimDeg: r(trim0 * DEG, 2), kickRad: KICK,
      peakPitchDeg: r(Math.max(...pitches.map(Math.abs)) * DEG, 2),
      endPitchDeg: r((late.reduce((s, x) => s + x, 0) / late.length) * DEG, 3),
      gameFrequencyHz: mode ? r(mode.frequency, 2) : null,
      gameDamping: mode ? r(mode.damping, 3) : null,
      gameDecayPer2Cycles: mode ? r(mode.decay, 3) : null,
      heaveSpanMm: r((Math.max(...heights) - Math.min(...heights)) * 1000, 1),
      draftCm: r((heights.reduce((s2, x) => s2 + x, 0) / heights.length) * 100, 2),
      // The load sense the balance is given, for `HEAVE_SENSE_NOISE`: its spread over the watch.
      loadRms: loads.length ? r(Math.sqrt(loads.reduce((s, x) => s + x * x, 0) / loads.length), 3) : null,
      loadPeak: loads.length ? r(Math.max(...loads.map(Math.abs)), 3) : null,
    });
  }
});
