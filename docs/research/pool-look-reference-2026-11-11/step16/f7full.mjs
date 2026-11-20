import { png } from '../step12/px.mjs';
const [gate, a, b] = process.argv.slice(2); const G = png(gate), A = png(a), B = png(b);
const L = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
const c = { full: [0, 0, 0], part: [0, 0, 0] };
for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) { const g = G.at(x, y)[0]; if (!g) continue; const k = g === 255 ? 'full' : 'part'; c[k][0]++; const d = L(B.at(x, y)) - L(A.at(x, y)); if (d > 2) { c[k][1]++; c[k][2] = Math.max(c[k][2], d); } }
console.log(`all samples thin: ${c.full[1]} of ${c.full[0]} darker by >2 (worst ${c.full[2].toFixed(1)}); edge pixels with some samples thin: ${c.part[1]} of ${c.part[0]} (worst ${c.part[2].toFixed(1)})`);
