import { plantAt, continuousPlant, scheduledDesign, steadyTurn, DEFAULT_WEIGHTS } from '../../../../../src/physics/predictiveBalance';
const w: any = { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6 };
const D = 180 / Math.PI;
for (const [depth, speed, rail] of [[0.3, 7.5, 0.35], [0.45, 7, 0.35], [0, 7.9, 0.35]]) {
  const { y, t } = plantAt(speed, depth, { rail, body: true, plantFloor: 6, stanceDeep: true });
  const { a, b } = continuousPlant(y, t);
  console.log('depth', depth, 'speed', speed, 'rail', rail);
  const names = ['phi', 'phid', 'th', 'thd', 'r', 'beta', 'tw', 'wu', 'del', 'tau'];
  for (const i of [1, 3, 4, 5, 7]) console.log('  row', names[i], a[i].map((v: number) => v.toFixed(2)).join(' '));
  const d = scheduledDesign(speed, depth, rail, w);
  console.log('  K0', d.k[0].map((v: number) => v.toFixed(3)).join(' '));
  console.log('  K1', d.k[1].map((v: number) => v.toFixed(2)).join(' '));
  const lean = Math.tan(-30 / D);
  const s = steadyTurn(d.phi, d.gamma, lean, 0);
  console.log('  steady 30deg (tan space): x', s.x.map((v: number) => v.toFixed(3)).join(' '), 'u', s.u.map((v: number) => v.toFixed(3)).join(' '));
}
