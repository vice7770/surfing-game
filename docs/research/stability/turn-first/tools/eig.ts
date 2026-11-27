import { scheduledDesign, DEFAULT_WEIGHTS, SCHEDULE_RAILS, mul, add } from '../../../../../src/physics/predictiveBalance';
import { eigenvalues } from '../../../../../src/physics/rollModel';
const w: any = { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6 };
const rad = (m: number[][]) => Math.max(...eigenvalues(m, { balance: true, maxIterations: 400 }).map((z: any) => Math.hypot(z.re, z.im)));
for (const [v, dep] of [[7.5, 0.3], [7, 0.45], [7.9, 0], [9.5, 0.3], [6, 0.3], [6, 0.45]]) for (const rail of [0, SCHEDULE_RAILS[1]]) {
  const s = scheduledDesign(v, dep, rail, w), f = scheduledDesign(v, dep, rail, { ...w, turnFree: true });
  const cut = (k: number[][]) => k.map((row) => row.map((x, j) => (j === 4 || j === 5 ? 0 : x)));
  const cl = (k: number[][]) => rad(add(s.phi, mul(s.gamma, k), -1));
  console.log(`v ${v} depth ${dep} rail ${(rail * 57.3).toFixed(0)}: open ${rad(s.phi).toFixed(4)} | shipped K ${cl(s.k).toFixed(4)} | free K ${cl(f.k).toFixed(4)} | free K without r,beta columns ${cl(cut(f.k)).toFixed(4)} | shipped K without ${cl(cut(s.k)).toFixed(4)}`);
}
