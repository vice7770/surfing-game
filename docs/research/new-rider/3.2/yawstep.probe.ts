// Step 3.2b (ruling 29f), the bar "the board's yaw time constant for a 1 cm centre-of-pressure step at 7 m/s": from a
// steady glide (`bars.probe.ts`'s terminal plane, SETTLE s), a step couple about the board's normal of the feet's
// forward force times 1 cm (m g times the plane's drag over weight, 0.01 m: 1.37 N·m at 7 m/s) is added to the board's
// solve each substep (as the feet's centre of pressure moved 1 cm across would add it). The board's yaw rate about its
// normal, less its mean over the 0.1 s before: its first peak, when, the time to 63 % of that peak (the time constant
// read from the rise), and the yaw acceleration over the first 10 ms (the inertia it meets: couple / acceleration).
// RIDER=new; YAW_SCALE=0 is 3.2's point mass. One line per speed ($OUT).
import { it } from 'vitest';
import { Vector3 } from 'three';
import { STEP, Slope, emit, place, r, state, type Rig } from '../../board-in-water/lab';

/** `bars.probe.ts`'s terminal planes (copied: importing it would run its bars too). */
const TERMINAL: [number, number][] = [[5, 13.37], [7, 11.01], [9, 10.37], [12, 11.07]];
function terminalAngle(v: number): number {
  for (let i = 1; i < TERMINAL.length; i += 1) if (v <= TERMINAL[i][0]) { const [v0, a0] = TERMINAL[i - 1]; const [v1, a1] = TERMINAL[i]; return v <= v0 ? a0 : a0 + ((a1 - a0) * (v - v0)) / (v1 - v0); }
  return TERMINAL[TERMINAL.length - 1][1];
}

const SETTLE = Number(process.env.SETTLE ?? 2.5);
const CM = Number(process.env.CM ?? 1);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inner = any;

it('the board yaw answer to a 1 cm centre-of-pressure step', () => {
  for (const v of (process.env.SPEEDS ?? '5,7,9').split(',').map(Number)) {
    const water = new Slope(terminalAngle(v));
    const rig: Rig = place(water, 0, 0, v, 'standing');
    const q = rig.rider as unknown as Inner;
    const couple = 73 * 9.81 * Math.sin((terminalAngle(v) * Math.PI) / 180) * CM * 0.01;
    let on = false;
    let h = 0;
    const prepare = q.prepare.bind(q);
    q.prepare = (step: number, b: unknown, w: unknown) => { h = step; prepare(step, b, w); };
    const coupleYaw = q.coupleYaw.bind(q);
    q.coupleYaw = (system: Float64Array, rhs: Float64Array, board: Rig['board']) => {
      coupleYaw(system, rhs, board);
      if (!on) return;
      const n = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
      rhs[3] += h * couple * n.x; rhs[4] += h * couple * n.y; rhs[5] += h * couple * n.z;
    };
    let t = 0; let fell = '';
    for (let i = 0; i < Math.round(SETTLE / STEP); i += 1) { t = (i + 1) * STEP; rig.board.step(STEP, water); const s = state(rig, water, t); if (s.fell) { fell = s.fell; break; } }
    const yaw = () => rig.board.angularVelocity.dot(new Vector3(0, 1, 0).applyQuaternion(rig.board.orientation));
    const before: number[] = [];
    // The baseline over the last 0.1 s, substep by substep through the frames.
    for (let i = 0; i < 6 && !fell; i += 1) { rig.board.step(STEP, water); before.push(yaw()); }
    const base = before.reduce((a, b) => a + b, 0) / Math.max(1, before.length);
    // Substep resolution: read the yaw rate at each rider finish.
    const trace: { t: number; w: number }[] = [];
    let clock = 0;
    const finish = q.finish.bind(q);
    q.finish = (step: number, b: unknown) => { finish(step, b); clock += step; trace.push({ t: clock, w: yaw() - base }); };
    on = true;
    for (let i = 0; i < Math.round(0.8 / STEP) && !fell; i += 1) { rig.board.step(STEP, water); const s = state(rig, water, t + 0.1 + (i + 1) * STEP); if (s.fell) fell = s.fell; }
    let peak = 0;
    for (let i = 0; i < trace.length; i += 1) {
      if (Math.abs(trace[i].w) > Math.abs(trace[peak].w)) peak = i;
      else if (Math.abs(trace[i].w) < 0.9 * Math.abs(trace[peak].w) && trace[i].t > 0.03) break;
    }
    const p = trace[peak];
    const rise = trace.find((x) => Math.abs(x.w) >= 0.63 * Math.abs(p.w));
    const early = trace.find((x) => x.t >= 0.01);
    emit({ bar: 'yaw step', rider: process.env.RIDER ?? 'old', yawScale: process.env.YAW_SCALE ?? '1', v, coupleNm: r(couple, 3), fell, yawInertia: r(q.yawInertia ?? 0, 2), peak: r(p?.w ?? Number.NaN, 4), peakAtS: r(p?.t ?? Number.NaN, 3), rise63S: r(rise?.t ?? Number.NaN, 3), inertiaMet: early ? r((couple * early.t) / early.w, 2) : null, at: [0.05, 0.1, 0.2, 0.3, 0.5].map((s) => r(trace.find((x) => x.t >= s)?.w ?? Number.NaN, 4)) });
  }
});
