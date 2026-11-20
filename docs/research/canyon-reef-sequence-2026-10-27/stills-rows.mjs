// rows.mjs <out.png> <scale> <x0,x1 px> <y0,y1 px> <before dir> <after dir>: from frame-probe stills (solver | drawn panels),
// three rows over time: the solver's white, the drawn white before, the drawn white after; cropped and scaled.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
const [out, scaleArg, xs, ys, before, after] = process.argv.slice(2);
const scale = Number(scaleArg); const [cx0, cx1] = xs.split(',').map(Number); const [cy0, cy1] = ys.split(',').map(Number);
const read = (file) => {
  const buf = readFileSync(file); let p = 8; let w = 0, h = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8); const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } if (type === 'IDAT') idat.push(data); p += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)); const rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) raw.copy(rgb, y * w * 3, y * (w * 3 + 1) + 1, (y + 1) * (w * 3 + 1));
  return { w, h, rgb };
};
const files = readdirSync(before).filter((f) => f.endsWith('.png')).sort();
const pw = (cx1 - cx0) * scale, ph = (cy1 - cy0) * scale, gap = 4;
const OW = files.length * pw + (files.length - 1) * gap, OH = 3 * ph + 2 * gap;
const img = Buffer.alloc(OW * OH * 3, 255);
const put = (im, panel, col, row) => {
  const half = (im.w - 6) / 2; const ox0 = panel * (half + 6);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const sx = ox0 + cx0 + Math.floor(x / scale), sy = cy0 + Math.floor(y / scale);
    const o = ((row * (ph + gap) + y) * OW + col * (pw + gap) + x) * 3; const s = (sy * im.w + sx) * 3;
    img[o] = im.rgb[s]; img[o + 1] = im.rgb[s + 1]; img[o + 2] = im.rgb[s + 2];
  }
};
files.forEach((f, col) => { const b = read(`${before}/${f}`); const a = read(`${after}/${f}`); put(b, 0, col, 0); put(b, 1, col, 1); put(a, 1, col, 2); });
const raw = Buffer.alloc((OW * 3 + 1) * OH); for (let y = 0; y < OH; y++) img.copy(raw, y * (OW * 3 + 1) + 1, y * OW * 3, (y + 1) * OW * 3);
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = table[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(OW, 0); ihdr.writeUInt32BE(OH, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`${out}: ${OW}×${OH}, ${files.length} frames`);
