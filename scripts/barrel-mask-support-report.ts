/**
 * Bounded CPU audit of the ACTUAL mask texture versus ACTUAL indexed world geometry. No simulation/browser/GPU.
 * ./node_modules/.bin/rolldown scripts/barrel-mask-support-report.ts -o /private/tmp/barrel-mask-support.mjs --format esm --platform node
 * node /private/tmp/barrel-mask-support.mjs --input /private/tmp/held-mask-state.json --out /private/tmp/mask-support-report.json
 * Capture one held renderer state; regenerated mask bytes cannot detect stale/inactive texture contents.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SurfaceGrid } from '../src/scene/WaterSurface';
import { sampleCubicSurface } from '../src/scene/water/cubicSurface';

export interface MaskState { grid: SurfaceGrid; bytes: Uint8Array; active: boolean }
export interface IndexedWorldMesh { positions: Float32Array; indices: Uint32Array; start: number; count: number; visible: boolean }
export interface PhotoProbe {
  label: string;
  /** Coordinates being investigated; a picked seabed point is not necessarily the unmasked water fragment's xz. */
  xz: [number, number];
  fragCoord?: [number, number];
  /** Prefer a value read from an isolated shader diagnostic: CPU noise is only a nominal highp GLSL mirror. */
  shaderDither?: number;
  shaderDitherQuantization?: number;
  pickedObject?: string;
  pickedWorld?: [number, number, number];
  /** Same pixel's world point in a mask-disabled water-only pass, with the camera/viewport/state held exactly. */
  unmaskedWaterWorld?: [number, number, number];
  sceneBedY?: number;
}
export interface SupportInput {
  capture: { held: boolean; clocks: Record<string, number>; camera?: unknown; viewport?: unknown };
  mask: MaskState;
  mesh: IndexedWorldMesh;
  water?: { grid: SurfaceGrid; surface: Float32Array; bed: Float32Array; look: 'rich' | 'classic' };
  probes?: PhotoProbe[];
}

/** Exact node-centered linear-filter lookup in real texel bytes; ClampToEdge is the texture's default wrapping. */
export function maskAlphaAt(mask: MaskState, x: number, z: number): number {
  const g = mask.grid;
  const gx = Math.min(g.nx - 1, Math.max(0, (x - g.xMin) / g.spacing));
  const gz = Math.min(g.nz - 1, Math.max(0, (z - g.zMin) / g.spacing));
  const i = Math.min(g.nx - 2, Math.floor(gx));
  const k = Math.min(g.nz - 2, Math.floor(gz));
  const tx = gx - i, tz = gz - k, at = k * g.nx + i;
  const a = mask.bytes[at] * (1 - tx) + mask.bytes[at + 1] * tx;
  const b = mask.bytes[at + g.nx] * (1 - tx) + mask.bytes[at + g.nx + 1] * tx;
  return (a * (1 - tz) + b * tz) / 255;
}
const fract = (a: number) => a - Math.floor(a);
export function nominalShaderClip(mask: MaskState, x: number, z: number, fragCoord: [number, number], suppliedDither?: number) {
  const alpha = maskAlphaAt(mask, x, z);
  const dither = suppliedDither ?? fract(52.9829189 * fract(fragCoord[0] * 0.06711056 + fragCoord[1] * 0.00583715));
  return { alpha, dither, waterDiscard: mask.active && alpha > dither, sweptPass: alpha > dither,
    source: suppliedDither === undefined ? 'CPU nominal GLSL mirror; highp rounding is not GPU-pixel proof' : 'supplied shader dither',
    inactiveSweptPass: !mask.active && alpha > dither };
}

function triangleAt(mesh: IndexedWorldMesh, t: number, x: number, z: number): number | undefined {
  const p = mesh.positions;
  const a = 3 * mesh.indices[t], b = 3 * mesh.indices[t + 1], c = 3 * mesh.indices[t + 2];
  const ax = p[a], az = p[a + 2], bx = p[b], bz = p[b + 2], cx = p[c], cz = p[c + 2];
  const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
  if (area === 0) return undefined;
  const wb = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / area;
  const wc = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / area;
  const wa = 1 - wb - wc;
  if (wa < -1e-6 || wb < -1e-6 || wc < -1e-6) return undefined;
  return wa * p[a + 1] + wb * p[b + 1] + wc * p[c + 1];
}
function bilinear(data: Float32Array, grid: SurfaceGrid, x: number, z: number, stride: number): number {
  const gx = Math.min(grid.nx - 1, Math.max(0, (x - grid.xMin) / grid.spacing));
  const gz = Math.min(grid.nz - 1, Math.max(0, (z - grid.zMin) / grid.spacing));
  const i = Math.min(grid.nx - 2, Math.floor(gx)), k = Math.min(grid.nz - 2, Math.floor(gz));
  const tx = gx - i, tz = gz - k, at = stride * (k * grid.nx + i), row = stride * grid.nx;
  return (data[at] * (1 - tx) + data[at + stride] * tx) * (1 - tz)
    + (data[at + row] * (1 - tx) + data[at + row + stride] * tx) * tz;
}

export function reportMaskSupport(input: SupportInput, maxCells = 4096, samplesPerAxis = 4) {
  if (!Number.isInteger(maxCells) || maxCells < 1 || maxCells > 8192 || !Number.isInteger(samplesPerAxis)
    || samplesPerAxis < 1 || samplesPerAxis > 8) throw Error('Invalid bounded sample limits');
  const { mask, mesh } = input, g = mask.grid;
  const cells = new Set<number>();
  let positiveNodes = 0, truncated = false;
  for (let n = 0; n < mask.bytes.length; n++) {
    if (mask.bytes[n] === 0) continue;
    positiveNodes++;
    const i = n % g.nx, k = Math.floor(n / g.nx);
    for (const di of [-1, 0]) for (const dk of [-1, 0]) {
      const x = i + di, z = k + dk;
      if (x < 0 || z < 0 || x >= g.nx - 1 || z >= g.nz - 1) continue;
      const cell = z * g.nx + x;
      if (cells.has(cell)) continue;
      if (cells.size >= maxCells) { truncated = true; continue; }
      cells.add(cell);
    }
  }
  // Only sampled cells need a triangle bucket; no full-grid or full-front report allocation.
  const buckets = new Map<number, number[]>();
  for (const cell of cells) buckets.set(cell, []);
  let references = 0;
  if (mesh.visible) for (let t = mesh.start; t < mesh.start + mesh.count; t += 3) {
    const a = 3 * mesh.indices[t], b = 3 * mesh.indices[t + 1], c = 3 * mesh.indices[t + 2], p = mesh.positions;
    const i0 = Math.max(0, Math.floor((Math.min(p[a], p[b], p[c]) - g.xMin) / g.spacing));
    const i1 = Math.min(g.nx - 2, Math.floor((Math.max(p[a], p[b], p[c]) - g.xMin) / g.spacing));
    const k0 = Math.max(0, Math.floor((Math.min(p[a + 2], p[b + 2], p[c + 2]) - g.zMin) / g.spacing));
    const k1 = Math.min(g.nz - 2, Math.floor((Math.max(p[a + 2], p[b + 2], p[c + 2]) - g.zMin) / g.spacing));
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      const bucket = buckets.get(k * g.nx + i);
      if (!bucket) continue;
      if (++references > 1_000_000) throw Error('Triangle bucket bound exceeded; supply a smaller held region');
      bucket.push(t);
    }
  }
  let sampled = 0, positiveSamples = 0, outsideSamples = 0, maximumOutsideAlpha = 0, outsideAlphaArea = 0;
  const examples: { x: number; z: number; alpha: number }[] = [];
  for (const cell of cells) {
    const i = cell % g.nx, k = Math.floor(cell / g.nx), bucket = buckets.get(cell)!;
    for (let a = 0; a < samplesPerAxis; a++) for (let b = 0; b < samplesPerAxis; b++) {
      const x = g.xMin + (i + (a + 0.5) / samplesPerAxis) * g.spacing;
      const z = g.zMin + (k + (b + 0.5) / samplesPerAxis) * g.spacing;
      sampled++;
      const alpha = maskAlphaAt(mask, x, z);
      if (!(alpha > 0)) continue;
      positiveSamples++;
      if (bucket.some(t => triangleAt(mesh, t, x, z) !== undefined)) continue;
      outsideSamples++;
      maximumOutsideAlpha = Math.max(maximumOutsideAlpha, alpha);
      outsideAlphaArea += alpha * (g.spacing * g.spacing) / (samplesPerAxis * samplesPerAxis);
      if (examples.length < 12) examples.push({ x, z, alpha });
    }
  }
  const probes = (input.probes ?? []).slice(0, 32).map(probe => {
    const xz = probe.unmaskedWaterWorld ? [probe.unmaskedWaterWorld[0], probe.unmaskedWaterWorld[2]] : probe.xz;
    const [x, z] = xz;
    const heights: number[] = [];
    if (mesh.visible) for (let t = mesh.start; t < mesh.start + mesh.count; t += 3) {
      const y = triangleAt(mesh, t, x, z);
      if (y !== undefined) heights.push(y);
    }
    const clip = probe.fragCoord ? nominalShaderClip(mask, x, z, probe.fragCoord, probe.shaderDither) : undefined;
    const w = input.water;
    let water;
    if (w) {
      const withinSnapshotWindow = x >= w.grid.xMin && z >= w.grid.zMin
        && x <= w.grid.xMin + (w.grid.nx - 1) * w.grid.spacing && z <= w.grid.zMin + (w.grid.nz - 1) * w.grid.spacing;
      const surfaceY = w.look === 'rich' ? sampleCubicSurface(w.surface, w.grid, x, z).height : bilinear(w.surface, w.grid, x, z, 2);
      const shaderBedY = bilinear(w.bed, w.grid, x, z, 1);
      const i = Math.min(w.grid.nx - 2, Math.max(0, Math.floor((x - w.grid.xMin) / w.grid.spacing)));
      const k = Math.min(w.grid.nz - 2, Math.max(0, Math.floor((z - w.grid.zMin) / w.grid.spacing)));
      const nodes = [k * w.grid.nx + i, k * w.grid.nx + i + 1, (k + 1) * w.grid.nx + i, (k + 1) * w.grid.nx + i + 1];
      const packedDryNeighbors = nodes.filter(n => Math.abs(w.surface[2 * n] - (w.bed[n] - 0.05)) < 1e-5).length;
      water = { surfaceY, shaderBedY, shaderColumnMeters: surfaceY - shaderBedY, packedDryNeighbors, withinSnapshotWindow,
        surfaceEvidence: 'CPU height-field interpolation, not a raycast of shader-displaced triangles; actual water-fragment y is unmaskedWaterWorld[1] when provided. Outside-window queries clamp source data and do not prove water draw coverage.',
        sourceDryEvidence: 'Raw swept snapshot dry nodes are packed 5cm below bed; cubic interpolation is not solver h.',
        sceneBedY: probe.sceneBedY, waterBelowProvidedSceneBed: probe.sceneBedY === undefined || !withinSnapshotWindow ? undefined : surfaceY <= probe.sceneBedY };
    }
    return { ...probe, evaluatedXZ: xz, samePixelUnmaskedWaterPointProvided: Boolean(probe.unmaskedWaterWorld),
      suppliedShaderDitherHalfBin: probe.shaderDitherQuantization === undefined ? undefined : probe.shaderDitherQuantization / 2,
      alpha: maskAlphaAt(mask, x, z), indexedProjectionCount: heights.length,
      indexedHeights: heights.slice(0, 12), clip, water,
      classification: {
        filteredMaskOutsideIndexedProjection: maskAlphaAt(mask, x, z) > 0 && heights.length === 0,
        nominalWaterDiscardWithoutIndexedProjection: clip ? clip.waterDiscard && heights.length === 0 : undefined,
        maskedObjectID: probe.pickedObject ?? 'not supplied; image color is not object identification',
      } };
  });
  return { schema: 1, capture: input.capture, mask: { grid: g, active: mask.active, positiveNodes },
    mesh: { visible: mesh.visible, drawRange: { start: mesh.start, count: mesh.count } },
    method: 'Node-centered linear bytes versus active indexed xz projection; bounded midpoint samples. No rasterizer regeneration.',
    limitations: 'Positive outside alpha is potential water rejection, not camera-ray replacement proof. CPU dither is nominal unless shader value is supplied. Vertex finiteness/run-end/lift checks do not test this coverage. Photographed classification needs held object/world ID passes; cubic water must be reconstructed, not raycast as its flat CPU geometry. Truncated sampling is explicitly partial.',
    sampled: { cells: cells.size, samplesPerAxis, sampled, positiveSamples, outsideSamples, maximumOutsideAlpha,
      outsideAlphaAreaSquareMeters: outsideAlphaArea, activePotentialDiscardAreaSquareMeters: mask.active ? outsideAlphaArea : 0,
      truncated, examples }, probes };
}

function grid(value: SurfaceGrid): SurfaceGrid {
  if (!value || ![value.xMin, value.zMin, value.spacing, value.nx, value.nz].every(Number.isFinite)
    || value.spacing <= 0 || !Number.isInteger(value.nx) || !Number.isInteger(value.nz) || value.nx < 2 || value.nz < 2
    || value.nx * value.nz > 2_000_000) throw Error('Invalid or unbounded grid');
  return value;
}
function numbers(value: unknown, length?: number): number[] {
  if (!Array.isArray(value) || value.some(v => typeof v !== 'number' || !Number.isFinite(v))
    || (length !== undefined && value.length !== length)) throw Error('Invalid finite array');
  return value;
}
async function main() {
  const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
  const inputPath = option('input'), outputPath = option('out');
  if (!inputPath || !outputPath) throw Error('Require --input and --out');
  const bytes = readFileSync(inputPath), json = JSON.parse(bytes.toString());
  const maskGrid = grid(json.mask.grid), raw = numbers(json.mask.bytes, maskGrid.nx * maskGrid.nz);
  if (raw.some(v => !Number.isInteger(v) || v < 0 || v > 255) || typeof json.mask.active !== 'boolean') throw Error('Invalid mask bytes/active flag');
  const positions = numbers(json.mesh.positions), indices = numbers(json.mesh.indices);
  if (positions.length % 3 !== 0 || positions.length > 120_402 || indices.length > 240_000 || indices.some(v => !Number.isInteger(v) || v < 0 || v >= positions.length / 3)) throw Error('Invalid indexed geometry');
  const start = json.mesh.start ?? 0, count = json.mesh.count ?? indices.length;
  if (!Number.isInteger(start) || !Number.isInteger(count) || start < 0 || count < 0 || start % 3 || count % 3 || start + count > indices.length
    || typeof json.mesh.visible !== 'boolean') throw Error('Invalid actual draw range/visibility');
  if (!json.capture?.held || !json.capture.clocks || Object.values(json.capture.clocks).some(v => typeof v !== 'number' || !Number.isFinite(v))) throw Error('Require a held capture with finite field clocks');
  if (new Set(Object.values(json.capture.clocks)).size !== 1) throw Error('Captured fields differ in sea time');
  const input: SupportInput = { capture: json.capture, mask: { grid: maskGrid, bytes: Uint8Array.from(raw), active: json.mask.active },
    mesh: { positions: Float32Array.from(positions), indices: Uint32Array.from(indices), start, count, visible: json.mesh.visible }, probes: json.probes };
  if (json.water) {
    const g = grid(json.water.grid);
    if (!['rich', 'classic'].includes(json.water.look)) throw Error('Invalid water look');
    input.water = { grid: g, surface: Float32Array.from(numbers(json.water.surface, 2 * g.nx * g.nz)),
      bed: Float32Array.from(numbers(json.water.bed, g.nx * g.nz)), look: json.water.look };
  }
  const report = reportMaskSupport(input, Number(option('maxCells') ?? 4096), Number(option('samplesPerAxis') ?? 4));
  writeFileSync(outputPath, JSON.stringify({ ...report, input: { path: resolve(inputPath), sha256: createHash('sha256').update(bytes).digest('hex') } }, null, 2));
  process.stdout.write(JSON.stringify({ output: resolve(outputPath), cells: report.sampled.cells, outsideSamples: report.sampled.outsideSamples,
    outsideAlphaAreaSquareMeters: report.sampled.outsideAlphaAreaSquareMeters, truncated: report.sampled.truncated, probes: report.probes.length }) + '\n');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
