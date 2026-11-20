// Side by side: node compose.mjs <left.png> <right.png> <out.png> — for the wall probe's own PNGs (RGB, filter 0, one IDAT).
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
function read(path) {
  const b = readFileSync(path);
  const w = b.readUInt32BE(16); const h = b.readUInt32BE(20);
  let o = 8; const idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o); const type = b.toString('ascii', o + 4, o + 8); if (type === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + len)); o += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat));
  const rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y += 1) raw.copy(rgb, y * w * 3, y * (w * 3 + 1) + 1, (y + 1) * (w * 3 + 1));
  return { w, h, rgb };
}
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const table = new Int32Array(256).map((_, n) => { let v = n; for (let k = 0; k < 8; k += 1) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; return v; });
  const crc = (buf) => { let v = -1; for (const byte of buf) v = table[(v ^ byte) & 0xff] ^ (v >>> 8); return (v ^ -1) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const s = Buffer.alloc(4); s.writeUInt32BE(crc(body)); return Buffer.concat([l, body, s]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const [a, b, out] = process.argv.slice(2).map((p) => p);
const L = read(a); const R = read(b);
const gap = 8; const W = L.w + gap + R.w; const H = Math.max(L.h, R.h);
const rgb = Buffer.alloc(W * H * 3, 255);
for (let y = 0; y < L.h; y += 1) L.rgb.copy(rgb, y * W * 3, y * L.w * 3, (y + 1) * L.w * 3);
for (let y = 0; y < R.h; y += 1) R.rgb.copy(rgb, (y * W + L.w + gap) * 3, y * R.w * 3, (y + 1) * R.w * 3);
writeFileSync(out, png(W, H, rgb));
