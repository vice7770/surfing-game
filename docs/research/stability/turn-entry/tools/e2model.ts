import { scheduledDesign, PredictiveController, DEFAULT_WEIGHTS } from '/Users/vicentealmeida/Documents/Codex/surfing-game/.claude/worktrees/turn-entry/src/physics/predictiveBalance';
const w: any = { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6, stanceDeep: true };
const D = 180 / Math.PI;
const lim = { ankle: 0.25, twist: 100 };
function run(entry: any, depth: number, speed: number, tuning?: any) {
  const d = scheduledDesign(speed, depth, 0, w);
  const ctl = new PredictiveController(w, 'tan', undefined, tuning, entry);
  let x = new Array<number>(d.phi.length).fill(0);
  let lean = 0; const out: any = { th: [], ph: [], r: [], u0: [], sat: 0 };
  let minPh = 0, maxU = 0, hf = 0;
  for (let k = 0; k < 150; k++) {
    const t = k / 60;
    const target = t < 1.0 ? 40 / D : 0;
    lean += Math.max(-1.4 / 60, Math.min(1.4 / 60, target - lean));
    const sense = d.c.map((row: number[]) => row.reduce((s, v, j) => s + v * x[j], 0));
    const c = [...ctl.tick(sense, speed, depth, -lean, 0, lim, 0, 0, 0, undefined, true)];
    if (Math.abs(ctl.raw[0]) > 0.25) out.sat++;
    maxU = Math.max(maxU, Math.abs(c[0]));
    x = d.phi.map((row: number[], i: number) => row.reduce((s, v, j) => s + v * x[j], 0) + d.gamma[i][0] * c[0] + d.gamma[i][1] * c[1]);
    // model sign: bank asked -lean; report in rider sign (+ toward the lean)
    const th = -x[2] * D, ph = -x[0] * D, r = -x[4] * D;
    if (k < 60) minPh = Math.min(minPh, ph);
    if ([15, 30, 60, 89].includes(k)) out.th.push(th.toFixed(1)), out.ph.push(ph.toFixed(1)), out.r.push(r.toFixed(0));
  }
  return `bank ${out.th.join('/')} roll ${out.ph.join('/')} yaw ${out.r.join('/')} | least roll ${minPh.toFixed(1)} | max ankle ${maxU.toFixed(3)} raw>clamp ${out.sat} ticks`;
}
for (const [depth, speed] of [[0.3, 7.5], [0.45, 7], [0.3, 9.5], [0, 7.9]]) {
  console.log(`depth ${depth} speed ${speed} (times +0.25/+0.5/+1.0/+1.5 s; deg, deg/s, + toward the lean)`);
  for (const [name, e, tn] of [['off', undefined, undefined], ['E1', { aim: true }, undefined], ['E2 s0.5', { planBank: 0.5 }, undefined], ['E2 s0.25', { planBank: 0.25 }, undefined], ['E2 s0.15', { planBank: 0.15 }, undefined], ['E2 s0.1', { planBank: 0.1 }, undefined], ['E2 rho1', { planRho: 1 }, undefined], ['E12 s0.25', { aim: true, planBank: 0.25 }, undefined], ['N1', undefined, { notchQ: 1, scope: 'state' }], ['notch', undefined, { notchQ: 1 }]] as any[])
    console.log(`  ${name.padEnd(11)} ${run(e, depth, speed, tn)}`);
}
