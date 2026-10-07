/**
 * Draws crest-angle-report snapshots (`--snapshots`) as images: the surface above still water (red up, blue down,
 * white at ±`--range` m), the bed's depth contours (grey, every `--contour` m), the watched lines (dashed), and the
 * crests the report fitted at that moment (black, from `--points`). The sea is at the top, +x to the right. Writes one
 * BMP per snapshot (convert with `sips -s format png <file>.bmp --out <file>.png`).
 *
 *   rolldown scripts/crest-snapshot-image.ts -o dist/scripts/crest-snapshot-image.mjs --format esm --platform node \
 *     && node dist/scripts/crest-snapshot-image.mjs --snapshots snap.json --crests run.json --out <dir> [--scale 3] [--range 1.5]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSpot, type SpotName } from '../src/wave/Bathymetry';
import { SIDE_FEED_SPOTS, tankDepth, tankLayout, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from './canyonShape';
import { applyPadangShape } from './padangShape';
import { applyReefShape } from './reefShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
interface Snapshot { t: number; reason: string; x0: number; dx: number; nx: number; z: number[]; eta: (number | null)[] }
interface Diagnostics { reef?: string; padang?: string; canyon?: string; noSideFeed?: boolean; lines: { name: string; z: number }[] }
interface Crest { line: string; t: number; angle: number; left: number; right: number; points?: number[] }

const snapFile = option('snapshots');
const crestFile = option('crests');
const out = option('out') ?? '.';
if (!snapFile) throw new Error('--snapshots <file> is required');
const scale = Number(option('scale') ?? 3);
const range = Number(option('range') ?? 1.5);
const contour = Number(option('contour') ?? 2);
const { config, diagnostics, snapshots } = JSON.parse(readFileSync(snapFile, 'utf8')) as {
  config: SurfZoneConfig; diagnostics: Diagnostics; snapshots: Snapshot[];
};
const crests: Crest[] = crestFile ? (JSON.parse(readFileSync(crestFile, 'utf8')) as { crests: Crest[] }).crests : [];
applyReefShape(diagnostics.reef);
applyPadangShape(diagnostics.padang);
applyCanyonShape(diagnostics.canyon);
if (diagnostics.noSideFeed) (SIDE_FEED_SPOTS as SpotName[]).splice(0);
const spot = createSpot(config.spot, config.seed);
const tank = tankLayout(config);
mkdirSync(out, { recursive: true });

/** A 24-bit BMP of the RGB rows, top row first. */
function bmp(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const rowBytes = Math.ceil((width * 3) / 4) * 4;
  const buffer = Buffer.alloc(54 + rowBytes * height);
  buffer.write('BM', 0);
  buffer.writeUInt32LE(buffer.length, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(rowBytes * height, 34);
  for (let y = 0; y < height; y += 1) {
    const base = 54 + (height - 1 - y) * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y);
      buffer[base + x * 3] = b;
      buffer[base + x * 3 + 1] = g;
      buffer[base + x * 3 + 2] = r;
    }
  }
  return buffer;
}

snapshots.forEach((snap, index) => {
  const zMin = snap.z[0];
  const zMax = snap.z[snap.z.length - 1];
  const width = Math.round(snap.nx * snap.dx * scale);
  const height = Math.round((zMax - zMin) * scale);
  const xAt = (px: number) => snap.x0 - snap.dx / 2 + (px + 0.5) / scale;
  const zAt = (py: number) => zMin + (py + 0.5) / scale;
  // The nearest snapshot row to each pixel row.
  const rowOf = new Int32Array(height);
  for (let py = 0, row = 0; py < height; py += 1) {
    const z = zAt(py);
    while (row + 1 < snap.z.length && Math.abs(snap.z[row + 1] - z) <= Math.abs(snap.z[row] - z)) row += 1;
    rowOf[py] = row;
  }
  const depth = new Float64Array(width * height);
  for (let py = 0; py < height; py += 1) for (let px = 0; px < width; px += 1) depth[py * width + px] = tankDepth(spot, tank.edgeDepth, xAt(px), zAt(py), tank);
  const level = (d: number) => Math.floor(d / contour);
  const lineRows = new Set(diagnostics.lines.map((line) => Math.round((line.z - zMin) * scale)));
  // The crests fitted at this moment, as pixels.
  const marks = new Set<number>();
  for (const crest of crests) {
    if (Math.abs(crest.t - snap.t) > 1e-6 || !crest.points) continue;
    for (let i = 0; i < crest.points.length; i += 2) {
      const px = Math.round((crest.points[i] - (snap.x0 - snap.dx / 2)) * scale);
      const py = Math.round((crest.points[i + 1] - zMin) * scale);
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) marks.add((py + dy) * width + px + dx);
    }
  }
  const image = bmp(width, height, (px, py) => {
    if (marks.has(py * width + px)) return [0, 0, 0];
    if (lineRows.has(py) && Math.floor(px / 6) % 2 === 0) return [90, 90, 90];
    const d = depth[py * width + px];
    const right = px + 1 < width ? depth[py * width + px + 1] : d;
    const below = py + 1 < height ? depth[(py + 1) * width + px] : d;
    if (d > 0 && (level(d) !== level(right) || level(d) !== level(below))) return [120, 120, 120];
    const column = Math.min(snap.nx - 1, Math.max(0, Math.floor(px / (snap.dx * scale))));
    const value = snap.eta[rowOf[py] * snap.nx + column];
    if (value === null) return [205, 190, 150];
    const v = Math.max(-1, Math.min(1, value / range));
    // White at 0, red up, blue down.
    return v >= 0
      ? [255, Math.round(255 * (1 - v)), Math.round(255 * (1 - v))]
      : [Math.round(255 * (1 + v)), Math.round(255 * (1 + v)), 255];
  });
  const name = join(out, `${config.spot}-${String(index).padStart(2, '0')}-t${snap.t.toFixed(1)}.bmp`);
  writeFileSync(name, image);
  console.log(`${name}: ${snap.reason}; x ${snap.x0.toFixed(0)}…${(snap.x0 + (snap.nx - 1) * snap.dx).toFixed(0)}, z ${zMin.toFixed(0)}…${zMax.toFixed(0)} (sea at the top)`);
});
