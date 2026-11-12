// Mean linear value (x4 /255) of debug term stills over the outer face / roof of the mask, for curl-lip.
import { png } from '../step12/px.mjs';
const [dir, view, prefix] = process.argv.slice(2);
const m1 = png(`${dir}/mask1-${view}.png`), m0 = png(`${dir}/mask0-${view}.png`);
const regions = { outer: [], tipThird: [], roof: [] };
for (let y = 0; y < m1.h; y += 1) for (let x = 0; x < m1.w; x += 1) {
  if (m1.at(x, y)[2] - m0.at(x, y)[2] <= 200) continue; const c = m1.at(x, y)[0] / 255, i = m1.at(x, y)[1] / 255;
  if (c <= 0.004) continue; if (i < 0.5) { regions.outer.push([x, y]); if (c > 0.467) regions.tipThird.push([x, y]); } else regions.roof.push([x, y]); }
for (const k of ['alb', 'dd', 'id', 'sp', 'em', 'out', 'ndl']) {
  const im = png(`${dir}/${prefix}-${k}-${view.replace('curl-', '')}.png`);
  const line = Object.entries(regions).map(([r, px]) => { const s = [0, 0, 0]; for (const [x, y] of px) { const p = im.at(x, y); for (let j = 0; j < 3; j += 1) s[j] += p[j]; }
    return `${r} ${s.map((v) => (4 * v / px.length / 255).toFixed(3)).join(' ')}`; });
  console.log(k.padEnd(4), line.join(' | '));
}
console.log('px', Object.fromEntries(Object.entries(regions).map(([k, v]) => [k, v.length])));
