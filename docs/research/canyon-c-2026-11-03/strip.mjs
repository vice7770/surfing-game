// canyon-c (2026-11-03): tiles the frame probe's top-view stills (its own PNGs: 8-bit RGB, one IDAT, no row filters) into
// one strip, `columns` across, a 6 px white gap between them; `--half solver|drawn` keeps one field of each still's two;
// `--mirror` mirrors each field along shore (the first Medium run's stills had +x on the left). Then
//   sips -s format jpeg -s formatOptions 80 <out.png> --out <out.jpg>
// Run: node strip.mjs <out.png> <columns> [--half solver|drawn] [--mirror] <still.png>…
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, v?.startsWith('--') || name === 'mirror' ? 1 : 2); return name === 'mirror' ? true : v; };
const half = flag('half');
const mirror = flag('mirror');
const [out, columnsText, ...files] = args;
const columns = Number(columnsText);

function read(path) {
  const buf = readFileSync(path);
  let o = 8; let w = 0; let h = 0; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o); const type = buf.toString('ascii', o + 4, o + 8); const data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y += 1) raw.copy(rgb, y * w * 3, y * (w * 3 + 1) + 1, (y + 1) * (w * 3 + 1));
  return { w, h, rgb };
}
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const table = new Int32Array(256).map((_, n) => { let v = n; for (let k = 0; k < 8; k += 1) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; return v; });
  const crc = (b) => { let v = -1; for (const byte of b) v = table[(v ^ byte) & 0xff] ^ (v >>> 8); return (v ^ -1) >>> 0; };
  const chunk = (type, data) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const GAP = 6;
const frames = files.map(read).map(({ w, h, rgb }) => {
  // A still is two fields side by side, GAP px apart: the solver's white, then the drawn white.
  const fw = (w - GAP) / 2;
  const fields = [0, 1].map((f) => {
    const out = Buffer.alloc(fw * h * 3);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < fw; x += 1) {
      const sx = mirror ? fw - 1 - x : x;
      rgb.copy(out, (y * fw + x) * 3, (y * w + f * (fw + GAP) + sx) * 3, (y * w + f * (fw + GAP) + sx) * 3 + 3);
    }
    return out;
  });
  if (half) return { w: fw, h, rgb: fields[half === 'drawn' ? 1 : 0] };
  const both = Buffer.alloc(w * h * 3, 255);
  for (let y = 0; y < h; y += 1) for (let f = 0; f < 2; f += 1) fields[f].copy(both, (y * w + f * (fw + GAP)) * 3, y * fw * 3, (y + 1) * fw * 3);
  return { w, h, rgb: both };
});
const { w, h } = frames[0];
const rows = Math.ceil(frames.length / columns);
const W = columns * w + (columns - 1) * GAP;
const H = rows * h + (rows - 1) * GAP;
const sheet = Buffer.alloc(W * H * 3, 255);
frames.forEach((frame, k) => {
  const x0 = (k % columns) * (w + GAP);
  const y0 = Math.floor(k / columns) * (h + GAP);
  for (let y = 0; y < h; y += 1) frame.rgb.copy(sheet, ((y0 + y) * W + x0) * 3, y * w * 3, (y + 1) * w * 3);
});
writeFileSync(out, png(W, H, sheet));
console.log(`${out}: ${frames.length} frames, ${W}×${H}`);
