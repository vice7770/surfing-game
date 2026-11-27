import { scheduledDesign, PredictiveController, DEFAULT_WEIGHTS, SCHEDULE_RAILS } from '../../../../../src/physics/predictiveBalance';
const w: any = { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6 };
const D = 180 / Math.PI;
const lim = { ankle: 0.25, twist: 100 };
const RAIL = Number(process.env.RAILK ?? 0) ? SCHEDULE_RAILS[Number(process.env.RAILK)] : 0;
function variant(v: string) {
  return function (this: any, d: any, bank: number, tilt: number | undefined, twist: number, xh: number[]) {
    const n = d.phi.length, a = d.a;
    const f = Math.abs(bank) > 1e-6 ? bank / Math.tan(bank) : 1;
    const x = new Array<number>(n).fill(0);
    x[2] = bank / f; x[6] = twist;
    const turnR = v === 'L3' ? 0 : xh[4], turnB = v === 'L3' ? 0 : xh[5];
    x[4] = turnR; x[5] = turnB; x[7] = turnR;
    x[0] = (bank + (tilt ?? 0)) / f;
    const known = [1, 3, 7].map((i) => a[i].reduce((s: number, c: number, j: number) => s + c * x[j], 0));
    const u1 = -known[2] / a[7][9];
    let u0;
    const r1 = known[0] + a[1][9] * u1, r3 = known[1] + a[3][9] * u1;
    if (v === 'L1') u0 = -r1 / a[1][8];
    else if (v === 'L2') u0 = -r3 / a[3][8];
    else { const q1 = 4, q3 = 16; u0 = -(q1 * a[1][8] * r1 + q3 * a[3][8] * r3) / (q1 * a[1][8] ** 2 + q3 * a[3][8] ** 2); }
    x[4] = xh[4]; x[5] = xh[5]; x[7] = xh[4];
    x[0] *= f; x[2] = bank; x[8] = u0 * f; x[9] = u1;
    return { x, u: [u0 * f, u1] };
  };
}
function run(v: string, depth: number, speed: number, T: number, felt: string, kick = 0.3) {
  const d = scheduledDesign(speed, depth, RAIL, w);
  const ctl: any = new PredictiveController(w, 'tan', undefined, undefined, undefined, 'on');
  if (v !== 'LS') ctl.freeReference = variant(v);
  let x = new Array<number>(d.phi.length).fill(0); x[1] = kick;
  let sat = 0, peak = 0, late = 0; let tilt = 0; const at: string[] = [];
  for (let k = 0; k < 600; k++) {
    const t = k / 60;
    tilt += Math.max(-1.4 / 60, Math.min(1.4 / 60, (t < 1 ? T : 0) - tilt));
    const sense = d.c.map((row: number[]) => row.reduce((s, vv, j) => s + vv * x[j], 0));
    const f = felt === 'zero' ? 0 : Math.atan(speed * x[4] / 9.81);
    const c = [...ctl.tick(sense, speed, depth, 0, 0, lim, RAIL, 0, 0, undefined, false, { active: true, felt: f, tilt: -tilt, railCap: RAIL })];
    if (Math.abs(ctl.raw[0]) > 0.25) sat++;
    x = d.phi.map((row: number[], i: number) => row.reduce((s, vv, j) => s + vv * x[j], 0) + d.gamma[i][0] * c[0] + d.gamma[i][1] * c[1]);
    peak = Math.max(peak, Math.abs(x[2]));
    if ([30, 60, 90].includes(k)) at.push(`${(-x[2] * D).toFixed(1)}/${(-x[0] * D).toFixed(1)}/${(-x[4] * D).toFixed(0)}`);
    if (k > 480) late = Math.max(late, Math.abs(x[2]) + Math.abs(x[0]) + Math.abs(x[4]));
  }
  return `b/r/y +0.5/1/1.5 ${at.join(' ')} sat ${sat} peak ${(peak * D).toFixed(1)} late ${late.toExponential(1)}`;
}
for (const [depth, speed] of [[0.3, 7.5], [0.45, 7], [0, 7.9]]) for (const v of ['LS', 'L1', 'L2', 'L3']) for (const [T, f] of [[0, 'zero'], [0.25, 'zero'], [0.25, 'full']] as any[])
  console.log(depth, speed, v, T, f, run(v, depth, speed, T, f));
