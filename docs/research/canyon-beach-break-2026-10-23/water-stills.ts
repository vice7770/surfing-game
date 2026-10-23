/**
 * Top-down stills of the water over a window of the Canyon (canyon-beach-break; wave only, no riders): η shaded, the
 * solver's breaking white, the still depth's 1–6 m contours, the take-off red. Seaward up, x to the right, 2 px a metre.
 *   rolldown docs/research/canyon-beach-break-2026-10-23/water-stills.ts -o dist/scripts/water-stills.mjs --format esm --platform node \
 *     && node dist/scripts/water-stills.mjs --size medium --seed 1 --from 60 --to 90 --every 1 --x -190,-40 --z -220,0 \
 *        [--canyon key=value,...] [--bed old] --out <dir>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { SWELLS } from '../../../src/game/SurfConditions';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
const seed = Number(option('seed') ?? 1);
const from = Number(option('from') ?? 60);
const to = Number(option('to') ?? 90);
const every = Number(option('every') ?? 1);
const [x0, x1] = (option('x') ?? '-190,-40').split(',').map(Number);
const [z0, z1] = (option('z') ?? '-220,0').split(',').map(Number);
const out = option('out') ?? 'stills';
const SCALE = 2;
applyCanyonShape(option('canyon'));
mkdirSync(out, { recursive: true });
const sim = new SurfZoneSimulation({
  spot: 'canyon', seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0, spreading: swell.spreading ?? 150,
  tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(option('bed') === 'old' ? { canyonBed: 'old' } : {}),
} as unknown as SurfZoneConfig);
const { solver } = sim;
const take = sim.breakPoint();
const hs = swell.significantHeight;
function png(w: number, h: number, rgb: Buffer): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const table = new Int32Array(256).map((_, n) => { let v = n; for (let k = 0; k < 8; k += 1) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; return v; });
  const crc = (buf: Buffer) => { let v = -1; for (const byte of buf) v = table[(v ^ byte) & 0xff] ^ (v >>> 8); return (v ^ -1) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function still(path: string): void {
  const { nx } = solver;
  const i0 = Math.max(0, Math.round((x0 - solver.xCenters[0]) / solver.dx));
  const i1 = Math.min(nx - 1, Math.round((x1 - solver.xCenters[0]) / solver.dx));
  const j0 = solver.rowBelow(z0);
  const j1 = solver.rowBelow(z1);
  const w = i1 - i0 + 1;
  const h = j1 - j0 + 1;
  const W = w * SCALE;
  const H = h * SCALE;
  const rgb = Buffer.alloc(W * H * 3);
  for (let jj = 0; jj < h; jj += 1) for (let ii = 0; ii < w; ii += 1) {
    const k = (j0 + jj) * nx + i0 + ii;
    const depth = solver.restLevel - solver.bed[k];
    const e = solver.h[k] + solver.bed[k] - solver.restLevel;
    let r: number; let g: number; let b: number;
    if (solver.h[k] < 0.02) { r = 214; g = 196; b = 150; } else {
      const s = Math.max(-1, Math.min(1, e / hs));
      const base = 0.55 + 0.4 * s;
      r = 20 * base; g = 110 * base + 40 * Math.max(0, 1 - depth / 6); b = 170 * base + 40;
      const white = Math.min(1, sim.breaking.strength[k] * 1.5);
      r += (255 - r) * white; g += (255 - g) * white; b += (255 - b) * white;
    }
    const level = (kk: number) => Math.floor(solver.restLevel - solver.bed[kk]);
    if (depth > 0.5 && depth < 6.5 && ii + 1 < w && jj + 1 < h && (level(k) !== level(k + 1) || level(k) !== level(k + nx))) { r = r * 0.6 + 60; g = g * 0.6 + 40; b *= 0.6; }
    if (Math.abs(solver.xCenters[i0 + ii] - take.x) < 1.5 && Math.abs(solver.zCenters[j0 + jj] - take.z) < 1.5) { r = 230; g = 20; b = 20; }
    for (let dy = 0; dy < SCALE; dy += 1) for (let dx = 0; dx < SCALE; dx += 1) {
      const o = ((jj * SCALE + dy) * W + ii * SCALE + dx) * 3;
      rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
    }
  }
  writeFileSync(path, png(W, H, rgb));
}
const step = 1 / 30;
const stride = Math.round(every / step);
for (let n = 1; solver.time < to; n += 1) {
  sim.step(step);
  if (solver.time >= from && n % stride === 0) still(`${out}/${size}-s${seed}-t${solver.time.toFixed(1).padStart(6, '0')}.png`);
}
console.log(`stills of x ${x0}…${x1}, z ${z0}…${z1} from ${from} to ${to} s; take-off (${take.x}, ${take.z})`);
