// Writes false-colour PNGs of the mask fields (for looking): R = field A, G = field B, B = field C.
// node fieldpng.mjs <out dir> <tag> <dest dir>
import { png } from '../step12/px.mjs';
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
export function writePng(path, w, h, rgb) {
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y += 1) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
if (process.argv[1].endsWith('fieldpng.mjs')) {
  const [dir, tag, dest] = process.argv.slice(2);
  const L = (n) => png(`${dir}/${n}.png`);
  const m1 = L(`mask1-${tag}`), m0 = L(`mask0-${tag}`), misc = L(`t-misc-${tag}`), thr = L(`t-thr-${tag}`), geo = L(`t-geo-${tag}`);
  const out = Buffer.alloc(m1.w * m1.h * 3);
  for (let y = 0; y < m1.h; y += 1) for (let x = 0; x < m1.w; x += 1) {
    const i = (y * m1.w + x) * 3; if (m1.at(x, y)[2] - m0.at(x, y)[2] <= 200) continue;
    if (m1.at(x, y)[0] > 200) { out[i] = misc.at(x, y)[1]; out[i + 1] = thr.at(x, y)[0]; out[i + 2] = geo.at(x, y)[2]; } else { out[i] = 60; out[i + 1] = 60; out[i + 2] = geo.at(x, y)[2]; }
  }
  writePng(`${dest}/fields-${tag}.png`, m1.w, m1.h, out);
}
