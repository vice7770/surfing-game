// Stacks the same crop of several stills into one PNG (then `sips` makes the JPEG), with a 4 px dark gap between rows.
// node rows.mjs <dest.png> x0 y0 x1 y1 a.png b.png ...
import { png } from '../step12/px.mjs';
import { writePng } from './fieldpng.mjs';
const [dest, x0, y0, x1, y1, ...files] = process.argv.slice(2);
const [X0, Y0, X1, Y1] = [x0, y0, x1, y1].map(Number); const w = X1 - X0, h = Y1 - Y0, gap = 4;
const H = files.length * h + (files.length - 1) * gap; const out = Buffer.alloc(w * H * 3, 20);
files.forEach((f, k) => { const im = png(f); for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) { const p = im.at(X0 + x, Y0 + y); const i = ((k * (h + gap) + y) * w + x) * 3; out[i] = p[0]; out[i + 1] = p[1]; out[i + 2] = p[2]; } });
writePng(dest, w, H, out);
