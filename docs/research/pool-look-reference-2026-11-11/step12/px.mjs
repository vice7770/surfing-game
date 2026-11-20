// Reads PNGs (8-bit RGB/RGBA, no interlace) with node's zlib. Usage:
//   node px.mjs diff a.png b.png            -> count of differing pixels, bounding box
//   node px.mjs rect file x0 y0 x1 y1       -> mean luma (Rec. 709 on the stored values) and mean RGB
//   node px.mjs col file x y0 y1            -> luma per row at column x (mean of x-2..x+2)
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
export function png(path) {
  const b = readFileSync(path); let o = 8, w, h, ct; const idat = [];
  while (o < b.length) { const n = b.readUInt32BE(o), t = b.toString('latin1', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0) throw new Error('unsupported png'); }
    if (t === 'IDAT') idat.push(d); o += 12 + n; }
  const c = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!c) throw new Error('colour type ' + ct);
  const raw = inflateSync(Buffer.concat(idat)), s = w * c, px = Buffer.alloc(h * s);
  for (let y = 0; y < h; y += 1) { const f = raw[y * (s + 1)];
    for (let x = 0; x < s; x += 1) { const v = raw[y * (s + 1) + 1 + x];
      const a = x >= c ? px[y * s + x - c] : 0, u = y ? px[(y - 1) * s + x] : 0, d = x >= c && y ? px[(y - 1) * s + x - c] : 0;
      let p = 0; if (f === 1) p = a; else if (f === 2) p = u; else if (f === 3) p = (a + u) >> 1;
      else if (f === 4) { const q = a + u - d, pa = Math.abs(q - a), pb = Math.abs(q - u), pc = Math.abs(q - d); p = pa <= pb && pa <= pc ? a : pb <= pc ? u : d; }
      px[y * s + x] = (v + p) & 255; } }
  return { w, h, c, px, at: (x, y) => [px[(y * w + x) * c], px[(y * w + x) * c + 1], px[(y * w + x) * c + 2]] };
}
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export function rect(im, x0, y0, x1, y1) { let n = 0, L = 0; const m = [0, 0, 0];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) { const p = im.at(x, y); L += luma(p); m[0] += p[0]; m[1] += p[1]; m[2] += p[2]; n += 1; }
  return { luma: L / n, rgb: m.map((v) => Math.round(v / n)) }; }
const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'diff') { const A = png(a[0]), B = png(a[1]); let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, max = 0;
  for (let y = 0; y < A.h; y += 1) for (let x = 0; x < A.w; x += 1) { const p = A.at(x, y), q = B.at(x, y); const d = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));
    if (d > 0) { n += 1; max = Math.max(max, d); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  console.log(`${A.w}x${A.h}: ${n} px differ, max ${max}, box ${x0},${y0}..${x1},${y1}`); }
if (cmd === 'rect') { const r = rect(png(a[0]), ...a.slice(1).map(Number)); console.log(a[0].split('/').slice(-2).join('/'), a.slice(1).join(','), 'luma', r.luma.toFixed(1), 'rgb', r.rgb.join(',')); }
if (cmd === 'col') { const im = png(a[0]); const [x, y0, y1] = a.slice(1).map(Number); const out = [];
  for (let y = y0; y <= y1; y += 1) out.push(`${y}:${rect(im, x - 2, y, x + 2, y).luma.toFixed(0)}`); console.log(out.join(' ')); }
