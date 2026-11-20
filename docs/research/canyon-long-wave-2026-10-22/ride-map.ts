/**
 * A still of one Canyon crest's break running along the reef (canyon-long-wave, 2026-10-22), from a size report's onsets
 * (`scripts/canyon-size-report.ts --json <file>`), no new simulation: the bed seen from above, seaward up, shaded by depth
 * with its 1–6 m contours (the arm's crest line, 1 m, darkest), and the crest's breaks as dots coloured by when they came
 * after its first (blue, then green, yellow and red at 20 s and later); the beach face's shore break grey. The crests are
 * the size report's (each onset's phase, one density peak per crest); the one drawn starts nearest `--t`.
 *
 *   rolldown docs/research/canyon-long-wave-2026-10-22/ride-map.ts -o dist/scripts/ride-map.mjs --format esm --platform node \
 *     && node dist/scripts/ride-map.mjs <run.json>[,<run.json>…] --seed 1 --t 146 --out <file.png> [--scale 3]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { CANYON, canyonPeelAt, canyonReefEndX, canyonShape, createSpot, type CanyonBed } from '../../../src/wave/Bathymetry';
import { GRAVITY } from '../../../src/wave/dispersion';
import { alongShoreOf, tankDepth, tankLayout, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

interface Onset { seed: number; t: number; x: number; z: number; face: number; depth: number }
interface Run { size: string; hs: number; tp: number; canyon: Record<string, number>; bed?: CanyonBed; records: { seed: number; start: number; end: number }[]; onsets: Onset[] }

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const [run, ...others] = process.argv[2].split(',').map((file) => JSON.parse(readFileSync(file, 'utf8')) as Run);
for (const other of others) { run.records.push(...other.records); run.onsets.push(...other.onsets); }
const bed = run.bed ?? 'reef';
// A run from before canyon-long-wave has no `runOn`: its arm tapered past the line's end.
if (bed === 'reef') Object.assign(CANYON, { runOn: 0 }, run.canyon);
const c = canyonShape(bed);
const seed = Number(option('seed') ?? 1);
const at = Number(option('t') ?? 0);
const scale = Number(option('scale') ?? 3);
const config = { spot: 'canyon', seed: 1, significantHeight: run.hs, peakPeriod: run.tp, directionDegrees: 0, spreading: 150, tide: 0, canyonBed: bed } as SurfZoneConfig;
const tank = tankLayout(config);
const spot = createSpot('canyon', 1, { canyonBed: bed });
const depthAt = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank);
const window = alongShoreOf(config);

// The size report's crests: each onset's phase (its time less its crest's travel time down its column at
// √(g (h + 0.3 min(h, Hs)))), one density peak per crest.
const xMin = -window / 2;
const rows = Math.ceil(tank.shore - tank.zoneInner) + 1;
const travel = new Float64Array((window + 1) * rows);
for (let col = 0; col <= window; col += 1) {
  let tau = 0;
  for (let r = 1; r < rows; r += 1) {
    const h = Math.max(0.2, depthAt(xMin + col, tank.zoneInner + r - 0.5));
    tau += 1 / Math.sqrt(GRAVITY * (h + 0.3 * Math.min(h, run.hs)));
    travel[col * rows + r] = tau;
  }
}
const phaseOf = (o: Onset) => o.t - travel[Math.min(window, Math.max(0, Math.round(o.x - xMin))) * rows + Math.min(rows - 1, Math.max(0, Math.round(o.z - tank.zoneInner)))];
const mine = run.onsets.filter((o) => o.seed === seed).map((o) => ({ ...o, phase: phaseOf(o) })).sort((a, b) => a.phase - b.phase);
const sigma = 0.1 * run.tp;
const lo = mine[0].phase - 3 * sigma;
const n = Math.ceil((mine[mine.length - 1].phase + 3 * sigma - lo) / 0.1) + 1;
const density = new Float64Array(n);
for (const o of mine) for (let k = Math.max(0, Math.floor((o.phase - 3 * sigma - lo) / 0.1)); k <= Math.min(n - 1, Math.ceil((o.phase + 3 * sigma - lo) / 0.1)); k += 1) density[k] += Math.exp(-0.5 * ((lo + k * 0.1 - o.phase) / sigma) ** 2);
const peaks: { phase: number; height: number }[] = [];
for (let k = 1; k < n - 1; k += 1) if (density[k] > density[k - 1] && density[k] >= density[k + 1]) peaks.push({ phase: lo + k * 0.1, height: density[k] });
peaks.sort((a, b) => b.height - a.height);
const kept: number[] = [];
for (const peak of peaks) if (kept.every((q) => Math.abs(q - peak.phase) >= 0.5 * run.tp)) kept.push(peak.phase);
const groups = kept.map((phase) => mine.filter((o) => Math.abs(o.phase - phase) <= 0.5 * run.tp && kept.every((q) => Math.abs(o.phase - q) >= Math.abs(o.phase - phase))));
const starts = groups.map((g) => Math.min(...g.filter((o) => canyonPeelAt(o.x, o.z, c)).map((o) => o.t)));
let pick = 0;
for (let k = 1; k < groups.length; k += 1) if (Math.abs(starts[k] - at) < Math.abs(starts[pick] - at)) pick = k;
const crest = groups[pick];
const t0 = starts[pick];

// The picture: x from the reef's upcoast end − 30 to its end + 40, z from 200 m seaward of the line at the peak to the beach.
const x0 = Math.floor(c.peakX - (c.shelfDepth - c.crestDepth) / c.endSlope - 30);
const x1 = Math.ceil(canyonReefEndX(c) + c.endTaper + 30);
const z0 = Math.floor(c.peakZ - 120);
const z1 = 5;
const w = (x1 - x0) * scale;
const h = (z1 - z0) * scale;
const rgb = Buffer.alloc(w * h * 3);
for (let py = 0; py < h; py += 1) {
  for (let px = 0; px < w; px += 1) {
    const x = x0 + px / scale;
    const z = z0 + py / scale;
    const d = depthAt(x, z);
    const o = (py * w + px) * 3;
    if (d <= 0) { rgb[o] = 214; rgb[o + 1] = 196; rgb[o + 2] = 150; continue; }
    const s = Math.min(1, d / 6);
    let r = 120 - 100 * s; let g = 190 - 110 * s; let b = 200 - 40 * s;
    const step = 1 / scale;
    const near = [0, 1, 2, 3, 4, 5, 6].find((k) => (depthAt(x, z) - k) * (depthAt(x + step, z + step) - k) <= 0 && k >= 1);
    if (near !== undefined) { const dark = near === 1 ? 0.35 : 0.65; r *= dark; g *= dark; b *= dark; }
    rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
  }
}
const colourOf = (dt: number): [number, number, number] => {
  const f = Math.max(0, Math.min(1, dt / 20));
  const stops: [number, number, number][] = [[40, 90, 255], [30, 200, 90], [250, 220, 40], [230, 40, 30]];
  const p = f * (stops.length - 1);
  const k = Math.min(stops.length - 2, Math.floor(p));
  const u = p - k;
  return [0, 1, 2].map((i) => stops[k][i] + (stops[k + 1][i] - stops[k][i]) * u) as [number, number, number];
};
let drawn = 0;
for (const o of crest) {
  const reef = canyonPeelAt(o.x, o.z, c);
  const [r, g, b] = reef ? colourOf(o.t - t0) : [150, 150, 150];
  const cx = Math.round((o.x - x0) * scale);
  const cy = Math.round((o.z - z0) * scale);
  for (let dy = -scale; dy <= scale; dy += 1) for (let dx = -scale; dx <= scale; dx += 1) {
    if (dx * dx + dy * dy > scale * scale) continue;
    const px = cx + dx; const py = cy + dy;
    if (px < 0 || py < 0 || px >= w || py >= h) continue;
    const o2 = (py * w + px) * 3;
    rgb[o2] = r; rgb[o2 + 1] = g; rgb[o2 + 2] = b;
  }
  if (reef) drawn += 1;
}
const reefOnsets = crest.filter((o) => canyonPeelAt(o.x, o.z, c));
const last = Math.max(...reefOnsets.map((o) => o.t));
console.log(`${run.size} seed ${seed}: crest starting ${t0.toFixed(1)} s at x ${reefOnsets.find((o) => o.t === t0)!.x.toFixed(0)}; ${drawn} breaks on the reef over ${(last - t0).toFixed(1)} s, `
  + `x ${Math.min(...reefOnsets.map((o) => o.x)).toFixed(0)}…${Math.max(...reefOnsets.map((o) => o.x)).toFixed(0)}; picture x ${x0}…${x1}, z ${z0}…${z1}`);

const raw = Buffer.alloc((w * 3 + 1) * h);
for (let y = 0; y < h; y += 1) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
const table = new Int32Array(256).map((_, k) => { let v = k; for (let i = 0; i < 8; i += 1) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; return v; });
const crc = (buf: Buffer) => { let v = -1; for (const byte of buf) v = table[(v ^ byte) & 0xff] ^ (v >>> 8); return (v ^ -1) >>> 0; };
const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([length, body, sum]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(w, 0); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2;
writeFileSync(option('out') ?? 'ride-map.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
