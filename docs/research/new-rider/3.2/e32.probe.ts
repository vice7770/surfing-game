// Step 3.2e (ruling 29i items 3 and 5): balance by prediction in the game, against the model. One line per row ($OUT).
// From the repo root:
//   OUT=/tmp/e.jsonl RIDER=new PART=compare npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts e32
// Parts:
// - trace: one run frame by frame from a steady glide (the bars' start: the terminal plane, SETTLE s), then a kick (the
//   board's roll rate +0.5 rad/s, as the Mode B bar) or a shove (the body's velocity across, 20 N·s), the controller's
//   state with it. Env: SPEED (7), DEPTH stance (tall|crouch|compress), START (kick|shove|none), DUR (3 s; zsh owns SECONDS), CHOP (seed), STEER, TRACE_SETTLE.
// - compare: the 20 N·s shove at 7 m/s tall and the kick at 5, 7 and 9 m/s, in the game and in the model (3.2d's time
//   run, the delay exact): the bank's peak, the twist's peak, the twist's torque peak, the decay and the yaw rate's mode.
// - kicktrace: the Mode B kick's peaks at 5, 7 and 9 m/s (ruling 29j item 4), beside the fitted damping.
// - inertia: the roll and yaw inertia the board meets in its own solve (its own and the water's implicit share), by speed
//   and stance (STANCES), from a steady glide: the internal model's BOARD_INERTIA.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { dampedMode } from '../../../../src/dev/carveMetrics';
import { CONTROL_STEP, N_STATE, continuousPlant, plantAt, scheduledDesign, type Design } from '../../../../src/physics/predictiveBalance';
import { Chop, OnFace, STEP, Slope, emit, place, r, state, type Rig } from '../../board-in-water/lab';
import type { SurfWater } from '../../../../src/physics/SurfWater';

const PARTS = (process.env.PART ?? 'compare').split(',');
const SETTLE = Number(process.env.SETTLE ?? 2.5);
const DEG = 180 / Math.PI;
type Stance = 'tall' | 'crouch' | 'compress';
const DEPTH: Record<Stance, number> = { tall: 0, crouch: 0.195, compress: 0.3 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inner = any;
/** The bars' terminal planes (`bars.probe.ts`). */
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
function hold(rig: Rig, stance: Stance): void {
  rig.rider!.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rig.rider!.compress = stance === 'compress' ? 1 : 0;
}
function steady(speed: number, stance: Stance, chop = 0, each?: (rig: Rig, q: Inner, t: number) => void): { rig: Rig; water: SurfWater; t: number; fell: string } {
  const water: SurfWater = chop > 0 ? new OnFace(terminalAngle(speed), new Chop(chop)) : new Slope(terminalAngle(speed));
  const rig = place(water, 0, 0, speed, 'standing');
  hold(rig, stance);
  let t = 0;
  for (let i = 0; i < Math.round(SETTLE / STEP); i += 1) {
    t = (i + 1) * STEP;
    (water as { advance?: (dt: number) => void }).advance?.(STEP);
    rig.board.step(STEP, water);
    const s = state(rig, water, t);
    each?.(rig, rig.rider as unknown as Inner, t);
    if (s.fell) return { rig, water, t, fell: s.fell };
  }
  return { rig, water, t, fell: '' };
}
const forwardOf = (rig: Rig) => new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation);
const sideOf = (rig: Rig) => new Vector3(1, 0, 0).applyQuaternion(rig.board.orientation).setY(0).normalize();

/** One game run from a steady glide: the frames' bank, twist, torques and yaw rate (the model's signs: + right). */
function gameRun(speed: number, stance: Stance, start: 'kick' | 'shove' | 'none', seconds: number, each?: (rig: Rig, q: Inner, t: number) => void, chop = 0, traceSettle = false) {
  const st = steady(speed, stance, chop, traceSettle ? each : undefined);
  const { rig, water } = st;
  const q = rig.rider as unknown as Inner;
  const out = { fell: st.fell ? `settling: ${st.fell}` : '', bank: [] as number[], twist: [] as number[], torque: [] as number[], active: [] as number[], ankle: [] as number[], yaw: [] as number[], roll: [] as number[], bank0: 0, twist0: 0, torque0: 0, yaw0: 0 };
  if (out.fell) return out;
  out.bank0 = -q.bank.angle; out.twist0 = -q.twistBody.angle; out.torque0 = -q.twistBody.torque; out.yaw0 = -rig.board.angularVelocity.dot(q.up);
  if (start === 'kick') rig.board.angularVelocity.addScaledVector(forwardOf(rig), 0.5);
  // The model's shove: the body's bank rate 20 N·s / (m h) toward its right (here −x).
  else if (start === 'shove') rig.rider!.velocity.addScaledVector(sideOf(rig), -(process.env.SHOVE ? Number(process.env.SHOVE) : 20 / 73));
  // STEER=s: the stick held from the start (the held carve's, 1).
  if (process.env.STEER) rig.rider!.steer = Number(process.env.STEER);
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    const t = st.t + (i + 1) * STEP;
    (water as { advance?: (dt: number) => void }).advance?.(STEP);
    rig.board.step(STEP, water);
    const s = state(rig, water, t);
    out.bank.push(-q.bank.angle); out.twist.push(-q.twistBody.angle); out.torque.push(-q.twistBody.torque); out.active.push(-q.twistBody.active);
    out.ankle.push(-q.ankleTorque); out.yaw.push(-rig.board.angularVelocity.dot(q.up));
    out.roll.push(rig.board.angularVelocity.dot(forwardOf(rig)));
    each?.(rig, q, t);
    if (s.fell) { out.fell = s.fell; break; }
  }
  return out;
}

/** 3.2d's time run (`predict.probe.ts` timeRun), the delay exact, with the series kept at each frame. */
function modelRun(d: Design, speed: number, depth: number, start: 'kick' | 'shove', seconds: number) {
  const { y, t } = plantAt(speed, depth);
  const { a, b } = continuousPlant(y, t);
  const n = N_STATE;
  const x = new Array<number>(n).fill(0);
  if (start === 'kick') x[1] = 0.5; else x[3] = 20 / 73 / y.height;
  const h = 1 / 1920;
  const per = Math.round(CONTROL_STEP / h);
  const senses: number[][] = []; const commands: number[][] = [];
  const ne = d.phiE.length;
  let e = new Array<number>(ne).fill(0);
  let u = [0, 0];
  const out = { bank: [] as number[], twist: [] as number[], torque: [] as number[], active: [] as number[], ankle: [] as number[], yaw: [] as number[], roll: [] as number[] };
  for (let i = 0; i < Math.round(seconds / h); i += 1) {
    if (i % per === 0) {
      senses.push(d.c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)));
      if (senses.length > d.steps) {
        const yk = senses[senses.length - 1 - d.steps];
        const old = commands.length > d.steps ? commands[commands.length - 1 - d.steps] : [0, 0];
        const pred = d.phiE.map((row, ii) => row.reduce((s, v, j) => s + v * e[j], 0) + d.gammaE[ii][0] * old[0] + d.gammaE[ii][1] * old[1]);
        const innov = yk.map((v, ii) => v - d.cE[ii].reduce((s, c, j) => s + c * pred[j], 0));
        e = pred.map((v, ii) => v + d.l[ii].reduce((s, l, j) => s + l * innov[j], 0));
      }
      const bh = d.bias ? [e[n], e[n + 1]] : [0, 0];
      const xh = d.phiN.map((row) => row.reduce((s, v, j) => s + v * e[j], 0));
      for (let jj = 0; jj < d.steps; jj += 1) {
        const back = d.steps - jj;
        const uc = commands.length >= back ? commands[commands.length - back] : [0, 0];
        for (let ii = 0; ii < n; ii += 1) xh[ii] += d.pred[jj][ii][0] * (uc[0] + bh[0]) + d.pred[jj][ii][1] * (uc[1] + bh[1]);
      }
      u = d.k.map((row, q) => -row.reduce((s, v, j) => s + v * xh[j], 0) - bh[q]);
      commands.push(u);
    }
    const dx = a.map((row, ii) => row.reduce((s, v, j) => s + v * x[j], 0) + b[ii][0] * u[0] + b[ii][1] * u[1]);
    for (let k = 0; k < n; k += 1) x[k] += h * dx[k];
    if ((i + 1) % per === 0) {
      out.bank.push(x[2]); out.twist.push(x[6]); out.torque.push(x[9] + t.stiffness * x[6] + t.damping * (x[7] - x[4])); out.active.push(x[9]);
      out.ankle.push(y.ankleStiffness * (x[2] - x[0] - x[8]) + y.ankleDamping * (x[3] - x[1])); out.yaw.push(x[4]); out.roll.push(x[1]);
    }
  }
  return out;
}

/** The peaks (deg, N·m), the bank's envelope over its last second against its first, and the yaw rate's mode. */
function summary(run: { bank: number[]; twist: number[]; torque: number[]; ankle: number[]; yaw: number[]; roll: number[] }, base = { bank: 0, twist: 0, torque: 0 }) {
  const peak = (xs: number[], b: number) => xs.reduce((m, v) => Math.max(m, Math.abs(v - b)), 0);
  const n = run.bank.length;
  const per = Math.round(1 / STEP);
  const early = run.bank.slice(0, per).reduce((m, v) => Math.max(m, Math.abs(v - base.bank)), 0);
  const late = run.bank.slice(Math.max(per, n - per)).reduce((m, v) => Math.max(m, Math.abs(v - base.bank)), 0);
  const mode = dampedMode(run.yaw, STEP);
  const bankMode = dampedMode(run.bank, STEP);
  return {
    bankPeakDeg: r(peak(run.bank, base.bank) * DEG, 2), twistPeakDeg: r(peak(run.twist, base.twist) * DEG, 2), twistTorquePeakNm: r(peak(run.torque, base.torque), 1),
    anklePeakNm: r(peak(run.ankle, 0), 1), lateOverEarly: r(late / Math.max(early, 1e-12), 3),
    yawMode: mode ? [r(mode.frequency, 2), r(mode.damping, 3)] : null, bankMode: bankMode ? [r(bankMode.frequency, 2), r(bankMode.damping, 3)] : null,
  };
}

it('step 3.2e: the game against the model', () => {
  if (PARTS.includes('trace')) {
    const speed = Number(process.env.SPEED ?? 7);
    const stance = (process.env.DEPTH ?? 'tall') as Stance;
    const start = (process.env.START ?? 'kick') as 'kick' | 'shove' | 'none';
    let frame = 0;
    const flat = new Slope(0);
    const run = gameRun(speed, stance, start, Number(process.env.DUR ?? 3), (rig, q, t) => {
      frame += 1;
      const p = q.predictor;
      const c = q.human?.state ?? {};
      emit({
        pitch: r(state(rig, flat, t).pitch, 1), pAnk: r(q.standingBody.pitch.angle * DEG, 1), capX: r(c.across, 3), capZ: r(c.along, 3), past: r(c.past, 3), load: r(q.contact.load, 2), legExt: r(q.leg.extension, 3),
        dOff: [r(q.position.x - q.target.x, 3), r(q.position.y - q.target.y, 3), r(q.position.z - q.target.z, 3)], legF: r(q.leg.force, 0), legRate: r(q.leg.rate, 2), legRest: r(q.leg.rest, 3), lLoad: r(q.legLoad, 0),
        sway: r(Math.hypot(q.sway.x, q.sway.z), 3), pErr: r(q.postureError, 3), flight: r(q.flightTime, 3), fallen: q.human?.fallen ? 1 : 0,
        reach: r(c.reach, 3), beyond: c.beyond ? 1 : 0, wPast: c.weightPast ? 1 : 0, margin: r(c.margin, 3), om: r(c.omega, 3), feltG: r(q.pairFelt ? Math.hypot(q.pairFelt.x, q.pairFelt.y, q.pairFelt.z) : 0, 2), frozen: q.human?.frozen ? 1 : 0, pX: r(c.pointAcross, 3), vX: r(c.speedAcross, 3),
        t: r(t, 3), v: r(rig.board.velocity.length(), 2), bank: r(-q.bank.angle * DEG, 2), roll: r(-state(rig, new Slope(0), t).roll, 2),
        yaw: r(-rig.board.angularVelocity.dot(q.up), 3), twist: r(-q.twistBody.angle * DEG, 2), tT: r(-q.twistBody.torque, 1), tA: r(-q.twistBody.active, 1),
        rest: r(-q.ankleRest * DEG, 2), aT: r(-q.ankleTorque, 1), swing: r(q.swing.angle * DEG, 1),
        xhBank: r(p.predicted[2] * DEG, 2), xhTwist: r(p.predicted[6] * DEG, 2), xhYaw: r(p.predicted[4], 3), xhSlip: r(p.predicted[5] * DEG, 2), xhRoll: r(p.predicted[0] * DEG, 2),
        refBank: r(p.reference.x[2] * DEG, 2), refRoll: r(p.reference.x[0] * DEG, 2), refYaw: r(p.reference.x[4], 3), refU: [r(p.reference.u[0] * DEG, 2), r(p.reference.u[1], 1)], asked: r(-q.leanAsked * DEG, 1), bias: [r(p.bias[0] * DEG, 2), r(p.bias[1], 1)], sent: [r(p.sent[0] * DEG, 2), r(p.sent[1], 1)], frame,
      });
    }, Number(process.env.CHOP ?? 0), process.env.TRACE_SETTLE === '1');
    emit({ end: true, fell: run.fell });
  }
  if (PARTS.includes('chopfall')) {
    // Step 3.2h: where each chop glide ends, and what the state was at the fall (the stop rule's trace). The bars' own
    // run: a steady start on the terminal plane under a seeded chop, SETTLE s, then 3 s.
    for (const chop of [1, 2, 3]) for (const speed of [5, 7, 9, 12]) {
      const ring: Record<string, unknown>[] = [];
      let fell = '';
      let at = Number.NaN;
      let frozenFor = 0;
      let lightLongest = 0;
      const st = steady(speed, 'tall', chop, (rig, q, t) => {
        const c = q.human?.state ?? {};
        if (q.human?.frozen) frozenFor += STEP;
        lightLongest = Math.max(lightLongest, q.human?.lightLongest ?? 0);
        ring.push({ t: r(t, 3), roll: r(-state(rig, new Slope(0), t).roll, 1), pitch: r(state(rig, new Slope(0), t).pitch, 1), bank: r(-q.bank.angle * DEG, 1), swing: r(q.swing.angle * DEG, 1), capX: r(c.across, 3), capZ: r(c.along, 3), past: r(c.past, 3), reach: r(c.reach, 3), by: c.beyond ? 1 : 0, wp: c.weightPast ? 1 : 0, frz: q.human?.frozen ? 1 : 0, load: r(q.captureLoad, 2), om: r(c.omega, 2), pErr: r(q.postureError, 3), flight: r(q.flightTime, 2), legExt: r(q.leg.extension, 3), legF: r(q.leg.force, 0) });
        if (ring.length > 8) ring.shift();
      });
      const { rig, water } = st;
      let t = st.t;
      fell = st.fell ? `settling: ${st.fell}` : '';
      if (fell) at = t;
      const q = rig.rider as unknown as Inner;
      if (!fell) for (let i = 0; i < Math.round(3 / STEP); i += 1) {
        t = st.t + (i + 1) * STEP;
        (water as { advance?: (dt: number) => void }).advance?.(STEP);
        rig.board.step(STEP, water);
        const c = q.human?.state ?? {};
        if (q.human?.frozen) frozenFor += STEP;
        lightLongest = Math.max(lightLongest, q.human?.lightLongest ?? 0);
        ring.push({ t: r(t - st.t, 3), roll: r(-state(rig, new Slope(0), t).roll, 1), pitch: r(state(rig, new Slope(0), t).pitch, 1), bank: r(-q.bank.angle * DEG, 1), swing: r(q.swing.angle * DEG, 1), capX: r(c.across, 3), capZ: r(c.along, 3), past: r(c.past, 3), reach: r(c.reach, 3), by: c.beyond ? 1 : 0, wp: c.weightPast ? 1 : 0, frz: q.human?.frozen ? 1 : 0, load: r(q.captureLoad, 2), om: r(c.omega, 2), pErr: r(q.postureError, 3), flight: r(q.flightTime, 2), legExt: r(q.leg.extension, 3), legF: r(q.leg.force, 0) });
        if (ring.length > 8) ring.shift();
        const sN = state(rig, water, t);
        if (sN.fell) { fell = sN.fell; at = t - st.t; break; }
      }
      emit({ part: 'chopfall', chop, speed, fell, at: r(at, 2), frozenS: r(frozenFor, 3), lightLongestS: r(lightLongest, 3), tail: ring });
    }
  }
  if (PARTS.includes('inertia')) {
    // The inertia the board meets in its own solve (its own and the water's implicit share: the added mass, the implicit
    // damping times the substep), about its centre of mass, in roll (its forward axis) and yaw (its normal), the mean
    // over one frame's substeps after a steady glide (SETTLE s on the terminal plane, held below 5 m/s), by stance.
    for (const stance of (process.env.STANCES ?? 'tall').split(',') as Stance[]) for (let v = 4; v <= 12.001; v += 0.5) {
      const st = steady(v, stance);
      if (st.fell) { emit({ part: 'inertia', speed: v, stance, fell: st.fell }); continue; }
      const q = st.rig.rider as unknown as Inner;
      const orig = q.coupleYaw.bind(q);
      let roll = 0; let yaw = 0; let own = 0; let count = 0;
      q.coupleYaw = (system: Float64Array, rhs: Float64Array, board: Inner) => {
        const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); const n = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
        const fv = [f.x, f.y, f.z]; const nv = [n.x, n.y, n.z];
        const I = board.worldInertia;
        for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) { roll += fv[i] * system[(3 + i) * 6 + 3 + j] * fv[j]; yaw += nv[i] * system[(3 + i) * 6 + 3 + j] * nv[j]; own += fv[i] * I[i * 3 + j] * fv[j]; }
        count += 1;
        orig(system, rhs, board);
      };
      st.rig.board.step(STEP, st.water);
      emit({ part: 'inertia', speed: v, stance, roll: r(roll / count, 3), yaw: r(yaw / count, 3), ownRoll: r(own / count, 3), substeps: count });
    }
  }
  if (PARTS.includes('kicktrace')) {
    // Step 3.2f (ruling 29j item 4): the kick's trace beside the fitted damping. The Mode B bar fits a damped mode to
    // the yaw rate; this reports the peaks themselves, so the reader can see whether the kick dies within two cycles.
    for (const speed of [5, 7, 9]) {
      const g = gameRun(speed, 'tall', 'kick', 3);
      const peaks = (xs: number[], base = 0) => {
        const out: { t: number; v: number }[] = [];
        for (let i = 1; i < xs.length - 1; i += 1) {
          const a = xs[i] - base;
          if (Math.abs(a) >= Math.abs(xs[i - 1] - base) && Math.abs(a) > Math.abs(xs[i + 1] - base) && Math.abs(a) > 1e-5) out.push({ t: r(i * STEP, 3)!, v: r(a, 4)! });
        }
        return out;
      };
      const yawPeaks = peaks(g.yaw, g.yaw0);
      const bankPeaks = peaks(g.bank, g.bank0);
      const first = Math.abs(yawPeaks[0]?.v ?? 0);
      // Two cycles of the fitted mode: four peaks on. The envelope then, over the first.
      const after = Math.abs(yawPeaks[4]?.v ?? 0);
      emit({
        part: 'kicktrace', speed, fell: g.fell,
        yawPeaks: yawPeaks.slice(0, 10).map((x) => [x.t, x.v]), bankPeaksDeg: bankPeaks.slice(0, 8).map((x) => [x.t, r((x.v * 180) / Math.PI, 3)]),
        twistPeaksDeg: peaks(g.twist, g.twist0).slice(0, 6).map((x) => [x.t, r((x.v * 180) / Math.PI, 2)]),
        overTwoCycles: r(after / Math.max(first, 1e-9), 3), ...summary(g, { bank: g.bank0, twist: g.twist0, torque: g.torque0 }),
      });
    }
  }
  if (PARTS.includes('compare')) {
    const cases: { speed: number; stance: Stance; start: 'kick' | 'shove' }[] = [
      { speed: 7, stance: 'tall', start: 'shove' }, { speed: 5, stance: 'tall', start: 'kick' }, { speed: 7, stance: 'tall', start: 'kick' }, { speed: 9, stance: 'tall', start: 'kick' },
    ];
    for (const c of cases) {
      const g = gameRun(c.speed, c.stance, c.start, 4);
      const m = modelRun(scheduledDesign(c.speed, DEPTH[c.stance]), c.speed, DEPTH[c.stance], c.start, 4);
      if (process.env.SERIES === '1') for (let i = 0; i < Math.min(g.bank.length, m.bank.length); i += 3) emit({ part: 'series', ...c, t: r(i * STEP, 3), bank: [r(g.bank[i] * DEG, 3), r(m.bank[i] * DEG, 3)], twist: [r(g.twist[i] * DEG, 2), r(m.twist[i] * DEG, 2)], yaw: [r(g.yaw[i], 4), r(m.yaw[i], 4)], torque: [r(g.torque[i], 2), r(m.torque[i], 2)], ankle: [r(g.ankle[i], 1), r(m.ankle[i], 1)] });
      emit({ part: 'compare', ...c, game: g.fell ? { fell: g.fell, after: r(g.bank.length * STEP, 2), ...summary(g, { bank: g.bank0, twist: g.twist0, torque: g.torque0 }) } : summary(g, { bank: g.bank0, twist: g.twist0, torque: g.torque0 }), model: summary(m) });
    }
  }
});
