// Step 13 reader. Usage: node px13.mjs <png>...  Fixed rectangles on the 1280x720 curl-front still at 90 s:
// the lip's outer face (crest third, tip third) and one row at mid-lip. "White" = every channel >= 200.
import { png } from '../step12/px.mjs';
const white = (p) => Math.min(p[0], p[1], p[2]) >= 200;
const share = (im, x0, y0, x1, y1) => { let n = 0, w = 0, m = [0, 0, 0];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) { const p = im.at(x, y); n += 1; w += white(p) ? 1 : 0; m = m.map((v, i) => v + p[i]); }
  return `${(100 * w / n).toFixed(0)} % white, mean rgb ${m.map((v) => Math.round(v / n)).join(',')}`; };
for (const f of process.argv.slice(2)) { const im = png(f);
  console.log(f.split('/').slice(-2).join('/'));
  console.log('  face  (600..740, 345..360):', share(im, 600, 345, 740, 360));
  console.log('  crest third (600..740, 342..347):', share(im, 600, 342, 740, 347));
  console.log('  tip third   (600..660, 356..361):', share(im, 600, 356, 660, 361));
  let runs = 0, on = false; for (let x = 600; x <= 740; x += 1) { const w = white(im.at(x, 352)); if (w && !on) runs += 1; on = w; }
  console.log('  row y=352, x 600..740: white runs', runs); }
