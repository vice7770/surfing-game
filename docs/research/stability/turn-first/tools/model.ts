import { scheduledDesign, PredictiveController, DEFAULT_WEIGHTS, SCHEDULE_RAILS, steadyTurn } from '../../../../../src/physics/predictiveBalance';
const w: any = { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6 };
const D = 180 / Math.PI;
const lim = { ankle: 0.25, twist: 100 };
const RAIL = Number(process.env.RAILK ?? 0) ? SCHEDULE_RAILS[Number(process.env.RAILK)] : 0;
function run(mode: any, depth: number, speed: number) {
  const d = scheduledDesign(speed, depth, RAIL, w);
  const ctl: any = new PredictiveController(w, 'tan', undefined, undefined, undefined, mode);
  let x = new Array<number>(d.phi.length).fill(0);
  let lean = 0, tilt = 0; const rows: string[] = [];
  let minPh = 0, maxU = 0, sat = 0, late = 0;
  for (let k = 0; k < 600; k++) {
    const t = k / 60;
    const target = t < 1.0 ? 40 / D : 0;
    lean += Math.max(-1.4 / 60, Math.min(1.4 / 60, target - lean));
    const tt = t < 1.0 ? 0.25 : 0;
    tilt += Math.max(-1.4 / 60, Math.min(1.4 / 60, tt - tilt));
    const sense = d.c.map((row: number[]) => row.reduce((s, v, j) => s + v * x[j], 0));
    const felt = Math.atan(speed * x[4] / 9.81);
    const turn = mode ? { active: true, felt, tilt: -tilt, railCap: RAIL } : undefined;
    const bankAsked = mode === 'on' ? 0 : -lean;
    const c = [...ctl.tick(sense, speed, depth, bankAsked, 0, lim, RAIL, 0, 0, undefined, false, turn)];
    if (Math.abs(ctl.raw[0]) > 0.25) sat++;
    maxU = Math.max(maxU, Math.abs(c[0]));
    x = d.phi.map((row: number[], i: number) => row.reduce((s, v, j) => s + v * x[j], 0) + d.gamma[i][0] * c[0] + d.gamma[i][1] * c[1]);
    const th = -x[2] * D, ph = -x[0] * D, r = -x[4] * D;
    if (k < 60) minPh = Math.min(minPh, ph);
    if (k > 480) late = Math.max(late, Math.abs(x[2]) + Math.abs(x[0]) + Math.abs(x[4]));
    if ([15, 30, 60, 89].includes(k)) rows.push(`${th.toFixed(1)}/${ph.toFixed(1)}/${r.toFixed(0)}`);
  }
  return `bank/roll/yaw ${rows.join('  ')} | least roll ${minPh.toFixed(1)} | max ankle ${maxU.toFixed(3)} raw>clamp ${sat} | |state| 8-10 s ${late.toExponential(1)}`;
}
console.log('own-model loop; times +0.25/+0.5/+1.0/+1.5 s; deg, deg/s, + toward the steer; rail', (RAIL * D).toFixed(0));
for (const [depth, speed] of [[0.3, 7.5], [0.45, 7], [0.3, 9.5], [0, 7.9]]) {
  console.log(`depth ${depth} speed ${speed}`);
  for (const m of [undefined, 'aim', 'on']) console.log(`  ${String(m ?? 'off').padEnd(4)} ${run(m, depth, speed)}`);
}
// The feed-forward's sensitivity to the turn and the slip, and what it does to the model's yaw acceleration.
console.log('\nfeed-forward per unit of the estimate (rad/s of r with the upper body turning with it; rad of slip): du0, du1, and the yaw acceleration it adds (a48 du0 + a49 du1) against the open loop a44 / a45');
for (const [depth, speed] of [[0.3, 7.5], [0.45, 7], [0, 7.9], [0.3, 9.5]]) {
  for (const mode of ['aim', 'on']) {
    const ctl: any = new PredictiveController(w, 'tan', undefined, undefined, undefined, mode);
    const d = ctl.blend(speed, depth, RAIL, false, 'free');
    const a = d.a;
    const bank = -0.4, tilt = mode === 'on' ? -0.15 : undefined;
    const xh = [-0.45, 0, -0.4, 0, -0.6, 0.05, 0, -0.6, 0, 0];
    const r0 = ctl.freeReference(d, bank, tilt, 0, xh);
    const xr = xh.slice(); xr[4] += 0.01; xr[7] += 0.01;
    const r1 = ctl.freeReference(d, bank, tilt, 0, xr);
    const xb = xh.slice(); xb[5] += 0.001;
    const r2 = ctl.freeReference(d, bank, tilt, 0, xb);
    const du = [0, 1].map((q) => (r1.u[q] - r0.u[q]) / 0.01), db = [0, 1].map((q) => (r2.u[q] - r0.u[q]) / 0.001);
    const yr = a[4][8] * du[0] + a[4][9] * du[1], yb = a[4][8] * db[0] + a[4][9] * db[1];
    const dphi = mode === 'aim' ? ((r1.x[0] - r0.x[0]) / 0.01) : 0;
    console.log(`  depth ${depth} v ${speed} ${mode.padEnd(3)}: r: du0 ${du[0].toFixed(4)} du1 ${du[1].toFixed(2)} dphi_ref ${dphi.toFixed(3)} -> yaw acc ${yr.toFixed(2)} vs a44 ${a[4][4].toFixed(2)} | slip: du0 ${db[0].toFixed(3)} du1 ${db[1].toFixed(1)} -> yaw acc ${yb.toFixed(1)} vs a45 ${a[4][5].toFixed(1)}`);
  }
}
// The blend: 'aim' at the shipped steady turn between knots.
console.log('\naim against the shipped steady turn between the schedule knots (the board as the steady turn says); largest difference over x and u');
for (const [speed, depth, rail] of [[7.3, 0.25, 0.2], [8.2, 0.4, 0.13], [6.6, 0.1, 0.05]]) {
  const ctl: any = new PredictiveController(w, 'tan', undefined, undefined, undefined, 'aim');
  const d = ctl.blend(speed, depth, rail, false, 'free');
  const lean = -0.5;
  const t = steadyTurn(d.phi, d.gamma, Math.tan(lean), 0);
  const f = lean / Math.tan(lean);
  const sx = t.x.map((v: number, i: number) => (i === 0 || i === 2 || i === 8 ? v * f : v));
  const ref = ctl.freeReference(d, lean, undefined, 0, sx);
  const dx = Math.max(...sx.map((v: number, i: number) => Math.abs(v - ref.x[i])));
  console.log(`  v ${speed} depth ${depth} rail ${(rail * D).toFixed(1)}: |dx| ${dx.toExponential(2)} (roll ${((ref.x[0] - sx[0]) * D).toFixed(4)} deg), du0 ${(ref.u[0] - t.u[0] * f).toExponential(2)}, du1 ${(ref.u[1] - t.u[1]).toFixed(3)} N m`);
}
