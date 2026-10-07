/**
 * What else is in the water besides the incoming swell: for each crest-angle-report snapshot (`--snapshots`), the
 * solver's surface less the tank's own linear sea at the same sea time (`surfZoneSea`, the sea the relaxation zone
 * imposes, with the solver's wave numbers). Where the bed is level at the tank's edge depth (between the zone and the
 * spot's bed), that residual is what came back from the spot (reflected or scattered) or what the tank made, plus the
 * swell's bound harmonics. Prints, per snapshot and per band of rows, the rms of the surface, of the linear sea and of
 * the residual; with `--out`, draws the residual as images (as crest-snapshot-image.ts draws the surface).
 *
 *   rolldown scripts/crest-snapshot-residual.ts -o dist/scripts/crest-snapshot-residual.mjs --format esm --platform node \
 *     && node dist/scripts/crest-snapshot-residual.mjs --snapshots snap.json [--bands -260,-230,-200,-170,-140,-110,-80] [--out dir]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSpot, type SpotName } from '../src/wave/Bathymetry';
import { SIDE_FEED_SPOTS, surfZoneSea, tankDepth, tankLayout, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from './canyonShape';
import { applyPadangShape } from './padangShape';
import { applyReefShape } from './reefShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
interface Snapshot { t: number; reason: string; x0: number; dx: number; nx: number; z: number[]; eta: (number | null)[] }
interface Diagnostics { reef?: string; padang?: string; canyon?: string; noSideFeed?: boolean }

const snapFile = option('snapshots');
if (!snapFile) throw new Error('--snapshots <file> is required');
const out = option('out');
const scale = Number(option('scale') ?? 3);
const range = Number(option('range') ?? 0.4);
const { config, diagnostics, snapshots } = JSON.parse(readFileSync(snapFile, 'utf8')) as {
  config: SurfZoneConfig; diagnostics: Diagnostics; snapshots: Snapshot[];
};
applyReefShape(diagnostics.reef);
applyPadangShape(diagnostics.padang);
applyCanyonShape(diagnostics.canyon);
if (diagnostics.noSideFeed) (SIDE_FEED_SPOTS as SpotName[]).splice(0);
const sea = surfZoneSea(config);
const spot = createSpot(config.spot, config.seed);
const tank = tankLayout(config);
const zs = snapshots[0]?.z ?? [];
const bands = (option('bands') ?? '').split(',').filter((v) => v.trim() !== '').map(Number);
const edges = bands.length >= 2 ? bands : [zs[0], zs[zs.length - 1] + 1];
const rms = (values: number[]) => Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / Math.max(1, values.length));
console.log(`${config.spot}: Hs ${config.significantHeight} m, Tp ${config.peakPeriod} s, ${config.directionDegrees}°, s ${config.spreading}; tank edge ${tank.edgeDepth} m, zone inner z ${tank.zoneInner}, blend end z ${tank.blendEnd}.`);
console.log('| Snapshot | Rows z | Depth m | Surface rms m | Linear sea rms m | Residual rms m | Residual / linear |');
console.log('|---|---|---|---|---|---|---|');
if (out) mkdirSync(out, { recursive: true });
snapshots.forEach((snap, index) => {
  const residual = new Float64Array(snap.eta.length).fill(Number.NaN);
  for (let row = 0; row < snap.z.length; row += 1) {
    for (let column = 0; column < snap.nx; column += 1) {
      const value = snap.eta[row * snap.nx + column];
      if (value === null) continue;
      residual[row * snap.nx + column] = value - sea.elevation(snap.x0 + column * snap.dx, snap.z[row], snap.t);
    }
  }
  for (let b = 0; b + 1 < edges.length; b += 1) {
    const surface: number[] = [];
    const linear: number[] = [];
    const rest: number[] = [];
    const depths: number[] = [];
    for (let row = 0; row < snap.z.length; row += 1) {
      if (snap.z[row] < edges[b] || snap.z[row] >= edges[b + 1]) continue;
      for (let column = 0; column < snap.nx; column += 1) {
        const value = snap.eta[row * snap.nx + column];
        if (value === null) continue;
        const x = snap.x0 + column * snap.dx;
        surface.push(value);
        linear.push(sea.elevation(x, snap.z[row], snap.t));
        rest.push(residual[row * snap.nx + column]);
        depths.push(tankDepth(spot, tank.edgeDepth, x, snap.z[row], tank));
      }
    }
    if (!surface.length) continue;
    console.log(`| ${snap.t.toFixed(1)} s | ${edges[b]}…${edges[b + 1]} | ${Math.min(...depths).toFixed(1)}–${Math.max(...depths).toFixed(1)} | ${rms(surface).toFixed(3)} | ${rms(linear).toFixed(3)} `
      + `| ${rms(rest).toFixed(3)} | ${(rms(rest) / rms(linear)).toFixed(2)} |`);
  }
  if (!out) return;
  const zMin = snap.z[0];
  const zMax = snap.z[snap.z.length - 1];
  const width = Math.round(snap.nx * snap.dx * scale);
  const height = Math.round((zMax - zMin) * scale);
  const rowBytes = Math.ceil((width * 3) / 4) * 4;
  const image = Buffer.alloc(54 + rowBytes * height);
  image.write('BM', 0);
  image.writeUInt32LE(image.length, 2);
  image.writeUInt32LE(54, 10);
  image.writeUInt32LE(40, 14);
  image.writeInt32LE(width, 18);
  image.writeInt32LE(height, 22);
  image.writeUInt16LE(1, 26);
  image.writeUInt16LE(24, 28);
  image.writeUInt32LE(rowBytes * height, 34);
  for (let py = 0, row = 0; py < height; py += 1) {
    const z = zMin + (py + 0.5) / scale;
    while (row + 1 < snap.z.length && Math.abs(snap.z[row + 1] - z) <= Math.abs(snap.z[row] - z)) row += 1;
    const base = 54 + (height - 1 - py) * rowBytes;
    for (let px = 0; px < width; px += 1) {
      const column = Math.min(snap.nx - 1, Math.floor(px / (snap.dx * scale)));
      const value = residual[row * snap.nx + column];
      const v = Number.isFinite(value) ? Math.max(-1, Math.min(1, value / range)) : 0;
      const [r, g, bl] = !Number.isFinite(value) ? [205, 190, 150]
        : v >= 0 ? [255, Math.round(255 * (1 - v)), Math.round(255 * (1 - v))] : [Math.round(255 * (1 + v)), Math.round(255 * (1 + v)), 255];
      image[base + px * 3] = bl;
      image[base + px * 3 + 1] = g;
      image[base + px * 3 + 2] = r;
    }
  }
  const name = join(out, `${config.spot}-residual-${String(index).padStart(2, '0')}-t${snap.t.toFixed(1)}.bmp`);
  writeFileSync(name, image);
  console.log(`${name}: residual, ±${range} m full scale; x ${snap.x0.toFixed(0)}…, z ${zMin.toFixed(0)}…${zMax.toFixed(0)} (sea at the top)`);
});
