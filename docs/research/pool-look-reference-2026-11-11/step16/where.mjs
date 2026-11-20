import { png } from '../step12/px.mjs';
const [dir, view, a, b, x0, y0, x1, y1] = process.argv.slice(2);
const A = png(a), B = png(b), P = png(`${dir}/maskP-${view}.png`), M1 = png(`${dir}/mask1-${view}.png`), MS = png(`${dir}/maskS-${view}.png`);
const L = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
const hist = {}; let n = 0, ch = 0, thin = 0;
for (let y = +y0; y < +y1; y++) for (let x = +x0; x < +x1; x++) { const d = L(A.at(x, y)) - L(B.at(x, y)); if (Math.abs(d) < 6) continue; ch++; const q = Math.round(128 * P.at(x, y)[0] / 255 / 4) * 4; hist[q] = (hist[q] || 0) + 1; if (MS.at(x, y)[1] > 0) thin++; }
console.log('changed', ch, 'thin', thin, JSON.stringify(hist));
