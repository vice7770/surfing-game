/**
 * Rebuild drawing and contact on frozen physical captures, without a solver or browser.
 *
 * ./node_modules/.bin/rolldown scripts/tube-geometry-regression-report.ts -o /private/tmp/tube-geometry-regression.mjs --format esm --platform node
 * node /private/tmp/tube-geometry-regression.mjs --baseline /private/tmp/tube-rays-before/geometry-baseline.mjs --out /private/tmp/tube-geometry-before.json
 * A failed geometric invariant exits 1. Use --report-only to retain a known-bad baseline report.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { SurfaceGrid } from '../src/scene/WaterSurface';
import { rasterizeBarrelMask } from '../src/scene/barrel/barrelMask';
import { sampleCubicSurface } from '../src/scene/water/cubicSurface';
import { barrelCasesFor, libraryFromBytes } from '../src/wave/barrel/barrelLibrary';
import { FRONT_FIELD, FRONT_STRIDE } from '../src/wave/barrel/frontRecords';
import { LANDMARK } from '../src/wave/barrel/ProfileLibrary';
import { createContactHit, SweptContact, type ContactHit } from '../src/wave/barrel/sweptContact';
import { BARREL_SLOPE, LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from '../src/wave/barrel/sweptLoft';

const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const E = LOFT.extensionSamples;
const S = LOFT_SAMPLES;
type HeightAt = (x: number, z: number) => number;
type Point = { x: number; z: number };
type Layer = 'back' | 'roofTop' | 'roofUnder' | 'face' | 'front' | 'extension';
type ArrayField = ArrayLike<number>;
type Summary = { count: number; min: number | null; max: number | null; mean: number | null };

function summary(values: readonly number[]): Summary {
  return { count: values.length, min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null };
}

function layerAt(j: number): Layer {
  const i = j - E;
  return i < 0 || i > LANDMARK.front ? 'extension' : i < LANDMARK.crest ? 'back'
    : i < LANDMARK.lip ? 'roofTop' : i < LANDMARK.throat ? 'roofUnder' : i < LANDMARK.toe ? 'face' : 'front';
}

/**
 * Signed progress from row A to the corresponding row B, at BOTH endpoint tangents.
 * The along-ray direction can reverse to form a curl. This across-front direction cannot reverse
 * without neighbouring rays folding over one another. A normal-Y or xz triangle-area test would
 * instead mistake the intended underside/vertical face for a fault.
 */
export function rowProgress(loft: LoftResult, strip: number, j: number): [number, number] {
  const a = 3 * (strip * S + j);
  const b = a + 3 * S;
  const dx = loft.positions[b] - loft.positions[a];
  const dz = loft.positions[b + 2] - loft.positions[a + 2];
  return [dx * loft.sliceRayZ[strip] - dz * loft.sliceRayX[strip],
    dx * loft.sliceRayZ[strip + 1] - dz * loft.sliceRayX[strip + 1]];
}

/** Exact active prefixes only: reusable array padding is not geometry. */
export function geometryHash(loft: LoftResult): string {
  const hash = createHash('sha256');
  for (const [name, count] of fieldLengths(loft)) {
    const values = (loft as unknown as Record<string, ArrayField>)[name];
    if (!values) continue;
    hash.update(name);
    const copy = new Float64Array(count);
    for (let i = 0; i < count; i++) copy[i] = values[i];
    hash.update(new Uint8Array(copy.buffer));
  }
  hash.update(JSON.stringify([loft.vertexCount, loft.indexCount, loft.sliceCount]));
  return hash.digest('hex');
}

function fieldLengths(loft: LoftResult): [string, number][] {
  const n = loft.vertexCount;
  const slices = loft.sliceCount;
  return [
    ...['positions', 'normals'].map((name) => [name, n * 3] as [string, number]),
    ...['mask', 'lift', 'sheet', 'sheetWeight', 'sheetBack'].map((name) => [name, n] as [string, number]),
    ['throat', n * 4], ['indices', loft.indexCount],
    ...['sliceFront', 'sliceSigma', 'sliceTau', 'slicePhase', 'sliceLife', 'sliceCollapse', 'sliceFade', 'sliceTipGap',
      'sliceRestHold', 'sliceRestEnd', 'sliceRestClimb', 'sliceToeClimb', 'sliceJoined', 'sliceRayX', 'sliceRayZ', 'sliceWeight',
      'sliceOverturned', 'sliceTipAlong', 'sliceTipUp', 'sliceTipTransportAlong', 'sliceTipTransportUp', 'sliceAnchorVX',
      'sliceAnchorVZ', 'sliceFormed', 'sliceTipX', 'sliceTipY', 'sliceTipZ', 'sliceMouth']
      .map((name) => [name, slices] as [string, number]),
  ];
}

export function assessLoft(loft: LoftResult, heightAt?: HeightAt, grid?: SurfaceGrid) {
  const failures: string[] = [];
  const invalidFields: { field: string; count: number; first: number }[] = [];
  const fields = loft as unknown as Record<string, ArrayField>;
  for (const [name, count] of fieldLengths(loft)) {
    const values = fields[name];
    if (!values) continue; // Captures predating transport fields omit them; current builds include them.
    let invalid = 0;
    let first = -1;
    for (let i = 0; i < count; i++) {
      const value = values[i];
      const allowedNaN = name === 'sliceLife' && loft.sliceTau[i] < 0
        || (name === 'sliceRestClimb' || name === 'sliceToeClimb') && !(loft.sliceWeight[i] > 0);
      if (!Number.isFinite(value) && !(allowedNaN && Number.isNaN(value))) {
        invalid++;
        if (first < 0) first = i;
      }
    }
    if (invalid) invalidFields.push({ field: name, count: invalid, first });
  }
  if (invalidFields.length) failures.push('Nonfinite active geometry or required slice fields');
  if (loft.vertexCount !== loft.sliceCount * S) failures.push('Slice/vertex count mismatch');

  const part = () => ({ rows: 0, negativeRows: 0, zeroRows: 0, min: null as number | null, maxHorizontalSpan: 0, max3DSpan: 0 });
  const parts: Record<Layer, ReturnType<typeof part>> = {
    back: part(), roofTop: part(), roofUnder: part(), face: part(), front: part(), extension: part(),
  };
  const worstRows: { strip: number; front: number; sigma: number; row: number; layer: Layer; a: number; b: number }[] = [];
  let joined = 0, negativeRows = 0, zeroRows = 0, maxHorizontalSpan = 0, max3DSpan = 0;
  let alongRayReverseSegments = 0;
  let invalidRay = 0;
  const p = loft.positions;
  for (let s = 0; s < loft.sliceCount; s++) {
    const rayLength = Math.hypot(loft.sliceRayX[s], loft.sliceRayZ[s]);
    if (!(rayLength > 0) || !Number.isFinite(rayLength)) invalidRay++;
    for (let j = 0; j + 1 < S; j++) {
      const a = 3 * (s * S + j), b = a + 3;
      if ((p[b] - p[a]) * loft.sliceRayX[s] + (p[b + 2] - p[a + 2]) * loft.sliceRayZ[s] < 0) alongRayReverseSegments++;
    }
    if (s + 1 >= loft.sliceCount || loft.sliceJoined[s] !== 1) continue;
    joined++;
    if (loft.sliceFront[s] !== loft.sliceFront[s + 1] || !(loft.sliceSigma[s + 1] > loft.sliceSigma[s])) {
      failures.push(`Joined strip ${s} changes front or does not advance sigma`);
    }
    for (let j = 0; j < S; j++) {
      const [a, b] = rowProgress(loft, s, j);
      const width = Math.min(a, b);
      const layer = layerAt(j), part = parts[layer];
      part.rows++;
      part.min = part.min === null ? width : Math.min(part.min, width);
      if (width < 0) { negativeRows++; part.negativeRows++; }
      if (width === 0) { zeroRows++; part.zeroRows++; }
      const v0 = 3 * (s * S + j), v1 = v0 + 3 * S;
      const dx = p[v1] - p[v0], dy = p[v1 + 1] - p[v0 + 1], dz = p[v1 + 2] - p[v0 + 2];
      const horizontal = Math.hypot(dx, dz), span = Math.hypot(dx, dy, dz);
      maxHorizontalSpan = Math.max(maxHorizontalSpan, horizontal);
      max3DSpan = Math.max(max3DSpan, span);
      part.maxHorizontalSpan = Math.max(part.maxHorizontalSpan, horizontal);
      part.max3DSpan = Math.max(part.max3DSpan, span);
      if (width < 0) {
        worstRows.push({ strip: s, front: loft.sliceFront[s], sigma: loft.sliceSigma[s], row: j, layer, a, b });
        worstRows.sort((x, y) => Math.min(x.a, x.b) - Math.min(y.a, y.b));
        if (worstRows.length > 8) worstRows.pop();
      }
    }
  }
  if (invalidRay) failures.push('Invalid slice ray');
  if (negativeRows) failures.push(`${negativeRows} rows reverse across the front`);
  if (zeroRows) failures.push(`${zeroRows} rows have zero across-front width`);

  let topologyFaults = 0, cursor = 0;
  for (let s = 0; s + 1 < loft.sliceCount; s++) {
    if (loft.sliceJoined[s] !== 1) continue;
    for (let j = 0; j + 1 < S; j++) {
      const a = s * S + j, b = a + S;
      const expected = [a, b, a + 1, a + 1, b, b + 1];
      if (expected.some((v, k) => loft.indices[cursor + k] !== v)) topologyFaults++;
      cursor += 6;
    }
  }
  let indexFaults = 0, zeroArea3D = 0, zeroAreaLiftedRoofFace = 0, collapsedProfileTriangles = 0, minTwiceArea3D = Infinity;
  for (let t = 0; t < loft.indexCount; t += 3) {
    const ids = [loft.indices[t], loft.indices[t + 1], loft.indices[t + 2]];
    if (ids.some((v) => !Number.isInteger(v) || v < 0 || v >= loft.vertexCount)) { indexFaults++; continue; }
    const [a, b, c] = ids.map((v) => 3 * v);
    const ax = p[b] - p[a], ay = p[b + 1] - p[a + 1], az = p[b + 2] - p[a + 2];
    const bx = p[c] - p[a], by = p[c + 1] - p[a + 1], bz = p[c + 2] - p[a + 2];
    const area = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
    minTwiceArea3D = Math.min(minTwiceArea3D, area);
    if (area === 0) {
      zeroArea3D++;
      // Before an underside forms, the library represents its rows by the same lip point. A collapsed
      // profile edge creates an intentional triangle fan, not a missing across-front patch.
      const same = (u: number, v: number) => [0, 1, 2].every((axis) => p[3 * u + axis] === p[3 * v + axis]);
      const collapsedProfile = ids.some((u, i) => ids.slice(i + 1).some((v) => Math.floor(u / S) === Math.floor(v / S) && same(u, v)));
      if (collapsedProfile) collapsedProfileTriangles++;
      const layer = layerAt(Math.min(...ids.map((v) => v % S)));
      if (!collapsedProfile && ids.some((v) => loft.lift[v] > 0) && ['roofTop', 'roofUnder', 'face'].includes(layer)) zeroAreaLiftedRoofFace++;
    }
  }
  if (indexFaults || topologyFaults || loft.indexCount !== 6 * joined * (S - 1)) failures.push('Invalid or missing active triangles');
  if (zeroAreaLiftedRoofFace) failures.push('Lifted roof/face contains zero-area 3D triangles');

  let maskOutOfRange = 0, liftOutOfRange = 0, unsupportedLift = 0;
  const restingErrors: number[] = [];
  const endErrors: number[] = [];
  let liftedRunEnds = 0, maskedRunEnds = 0, runs = 0;
  for (let v = 0; v < loft.vertexCount; v++) {
    if (!(loft.mask[v] >= 0 && loft.mask[v] <= 1)) maskOutOfRange++;
    if (!(loft.lift[v] >= 0 && loft.lift[v] <= 1)) liftOutOfRange++;
    if (loft.lift[v] > 0 && !(loft.mask[v] > 0)) unsupportedLift++;
    if (heightAt && loft.lift[v] === 0) restingErrors.push(Math.abs(p[3 * v + 1] - heightAt(p[3 * v], p[3 * v + 2])));
  }
  for (let s = 0; s < loft.sliceCount; s++) {
    const opens = loft.sliceJoined[s] === 1 && (s === 0 || loft.sliceJoined[s - 1] !== 1);
    const closes = s > 0 && loft.sliceJoined[s - 1] === 1 && loft.sliceJoined[s] !== 1;
    if (opens) runs++;
    if (!opens && !closes) continue;
    for (let j = 0; j < S; j++) {
      const v = s * S + j;
      if (loft.lift[v] > 0) liftedRunEnds++;
      if (loft.mask[v] > 0) maskedRunEnds++;
      if (heightAt) endErrors.push(Math.abs(p[3 * v + 1] - heightAt(p[3 * v], p[3 * v + 2])));
    }
  }
  if (maskOutOfRange || liftOutOfRange || unsupportedLift) failures.push('Invalid mask/lift support');
  if (liftedRunEnds) failures.push('A surviving run ends above the water');
  // Original natural ends may carry a mask band while resting on water. New cuts retire it; report both.
  let maskNodes: number | undefined, maskHash: string | undefined;
  if (grid) {
    const mask = new Uint8Array(grid.nx * grid.nz);
    maskNodes = rasterizeBarrelMask(loft, grid, mask);
    maskHash = sha256(mask);
  }
  return { pass: failures.length === 0, failures, hash: geometryHash(loft),
    counts: { slices: loft.sliceCount, vertices: loft.vertexCount, triangles: loft.indexCount / 3, joinedStrips: joined, runs,
      overturnedSlices: Array.from(loft.sliceOverturned).slice(0, loft.sliceCount).filter((v) => v === 1).length },
    finite: { invalidFields }, acrossFront: { negativeRows, zeroRows, invalidRay, parts, worstRows, maxHorizontalSpan, max3DSpan },
    alongRay: { reverseSegments: alongRayReverseSegments, interpretation: 'Expected for an overturned profile; does not fail the harness.' },
    triangles: { indexFaults, topologyFaults, zeroArea3D, collapsedProfileTriangles, zeroAreaLiftedRoofFace,
      minTwiceArea3D: Number.isFinite(minTwiceArea3D) ? minTwiceArea3D : null },
    seam: { unsupportedLift, maskOutOfRange, liftOutOfRange, liftedRunEnds, maskedRunEnds,
      restingHeightErrorMeters: summary(restingErrors), runEndHeightErrorMeters: summary(endErrors), maskNodes, maskHash,
      interpretation: 'Height residuals include Float32 xyz rounding and cubic heightAt evaluation; no visual threshold is imposed.' },
    dropped: { strips: loft.overlaps, openStrips: loft.overlapsOpen, openWeight: loft.overlapOpenWeight } };
}

/** Lower-index edge calculation makes shared edges exact opposites, without a spatial bucket. */
function edge(p: Float32Array, u: number, v: number, x: number, z: number): number {
  const lo = Math.min(u, v), hi = Math.max(u, v);
  const e = (p[3 * hi] - p[3 * lo]) * (z - p[3 * lo + 2]) - (p[3 * hi + 2] - p[3 * lo + 2]) * (x - p[3 * lo]);
  return u < v ? e : -e;
}

export function triangleCrossing(p: Float32Array, a: number, b: number, c: number, x: number, z: number): number | undefined {
  const area = edge(p, a, b, p[3 * c], p[3 * c + 2]);
  if (area === 0) return undefined; // Vertical faces have zero projected area, not a geometric hole.
  const sign = area > 0 ? 1 : -1;
  const inside = (w: number, u: number, v: number) => w * sign > 0 || w === 0 && (sign > 0) === (u < v);
  const wa = edge(p, b, c, x, z), wb = edge(p, c, a, x, z), wc = edge(p, a, b, x, z);
  if (!inside(wa, b, c) || !inside(wb, c, a) || !inside(wc, a, b)) return undefined;
  return (wa * p[3 * a + 1] + wb * p[3 * b + 1] + wc * p[3 * c + 1]) / area;
}

function stripCrossings(loft: LoftResult, strip: number, x: number, z: number) {
  const crossings: { y: number; layer: Layer; row: number }[] = [];
  for (let j = 0; j + 1 < S; j++) {
    const a = strip * S + j, b = a + S;
    for (const [u, v, w] of [[a, b, a + 1], [a + 1, b, b + 1]]) {
      const y = triangleCrossing(loft.positions, u, v, w, x, z);
      if (y !== undefined) crossings.push({ y, layer: layerAt(j), row: j });
    }
  }
  crossings.sort((a, b) => a.y - b.y);
  return crossings;
}

/** First half-open strip wins. Independent full triangle scan; no contact index, bucket or crossing cap. */
function column(loft: LoftResult, x: number, z: number) {
  const p = loft.positions;
  for (let s = 0; s + 1 < loft.sliceCount; s++) {
    if (loft.sliceJoined[s] !== 1) continue;
    const a = 3 * s * S, b = a + 3 * S;
    const sideA = (x - p[a]) * loft.sliceRayZ[s] - (z - p[a + 2]) * loft.sliceRayX[s];
    const sideB = (x - p[b]) * loft.sliceRayZ[s + 1] - (z - p[b + 2]) * loft.sliceRayX[s + 1];
    if (sideA < 0 || sideB >= 0) continue;
    // The public contact nudges a ray-owned tie one nanometre into its half-open strip.
    const nudge = sideA === 0 ? 1e-9 : 0;
    const crossings = stripCrossings(loft, s, x + nudge * loft.sliceRayZ[s], z - nudge * loft.sliceRayX[s]);
    if (crossings.length) return { strip: s, crossings };
  }
  return undefined;
}

function pointOn(loft: LoftResult, strip: number, across: number, along: number): Point {
  const p = loft.positions;
  const throat = E + LANDMARK.throat, tip = E + LANDMARK.lip;
  const on = (slice: number, axis: number) => {
    const a = 3 * (slice * S + throat) + axis, b = 3 * (slice * S + tip) + axis;
    return p[a] + along * (p[b] - p[a]);
  };
  return { x: on(strip, 0) + across * (on(strip + 1, 0) - on(strip, 0)),
    z: on(strip, 2) + across * (on(strip + 1, 2) - on(strip, 2)) };
}

function sameHit(a: ContactHit, b: ContactHit): boolean {
  return Object.keys(a).every((k) => Object.is(a[k as keyof ContactHit], b[k as keyof ContactHit]));
}

export function assessContact(contact: SweptContact, fullScan: SweptContact) {
  const loft = contact.last!;
  const failures: string[] = [];
  let points = 0, columns = 0, queries = 0, ties = 0, noColumn = 0, evenColumns = 0, evenInteriorColumns = 0, evenTieColumns = 0;
  let mismatches = 0, nondeterministic = 0, nonfiniteHits = 0;
  let layerColumns = 0, swappedColumns = 0, maxLayerSwap = -Infinity;
  const firstIssues: unknown[] = [];
  const recordIssue = (value: unknown) => { if (firstIssues.length < 8) firstIssues.push(value); };
  const check = (point: Point, tie: boolean) => {
    points++;
    if (tie) ties++;
    const found = column(loft, point.x, point.z);
    const gotFloor = contact.floorAt(point.x, point.z);
    const scanFloor = fullScan.floorAt(point.x, point.z);
    if (!Object.is(gotFloor, scanFloor) || !Object.is(gotFloor, contact.floorAt(point.x, point.z))) nondeterministic++;
    if (!found) {
      noColumn++;
      if (!Number.isNaN(gotFloor)) { mismatches++; recordIssue({ point, reason: 'Contact found a floor outside the geometric column oracle' }); }
      return;
    }
    columns++;
    const ys = found.crossings.map((c) => c.y);
    if (ys.length % 2 === 0) {
      evenColumns++;
      if (tie) evenTieColumns++; else evenInteriorColumns++;
      recordIssue({ point, strip: found.strip, tie, reason: 'Even crossings over a column', ys });
    }
    if (!Object.is(gotFloor, ys[0])) { mismatches++; recordIssue({ point, reason: 'Floor differs from full geometric scan', gotFloor, expected: ys[0] }); }
    const layers = ['face', 'front', 'roofUnder', 'roofTop'].map((layer) => found.crossings.filter((v) => v.layer === layer).map((v) => v.y));
    const lower = [...layers[0], ...layers[1]], under = layers[2], top = layers[3];
    if (lower.length && under.length && top.length) {
      layerColumns++;
      const swap = Math.max(Math.max(...lower) - Math.min(...under), Math.max(...under) - Math.min(...top));
      maxLayerSwap = Math.max(maxLayerSwap, swap);
      if (swap > 0) swappedColumns++;
    }
    const probes = [ys[0] - 1, ys.at(-1)! + 1, ...ys];
    for (let i = 0; i + 1 < ys.length; i++) probes.push((ys[i] + ys[i + 1]) / 2);
    for (const y of probes) {
      queries++;
      const a = createContactHit(), b = createContactHit(), c = createContactHit();
      const got = contact.query(point.x, y, point.z, a);
      const repeated = contact.query(point.x, y, point.z, b);
      const scanned = fullScan.query(point.x, y, point.z, c);
      if (got !== repeated || got !== scanned || got && (!sameHit(a, b) || !sameHit(a, c))) nondeterministic++;
      const above = ys.filter((v) => v > y).length, below = ys.length - above;
      const inWater = (above & 1) === 1;
      const expected = inWater || below > 0;
      const index = inWater ? below : below - 1;
      if (got !== expected || got && (a.inWater !== inWater || !Object.is(a.surfaceY, ys[index])
        || !Object.is(a.floorY, ys[0]) || !Object.is(a.waterFloorY, inWater && below > 0 ? ys[below - 1] : Number.NaN)
        || !Object.is(a.ceilingY, !inWater && above >= 2 ? ys[below] : Number.NaN)
        || !Object.is(a.ceilingTopY, !inWater && above >= 2 ? ys[below + 1] : Number.NaN))) {
        mismatches++; recordIssue({ point, y, reason: 'Parity/order/tie differs from full geometric scan', ys, got, hit: a });
      }
      if (got) {
        const required: (keyof ContactHit)[] = ['surfaceY', 'floorY', 'normalX', 'normalY', 'normalZ', 'lipShare', 'lipVX', 'lipVY', 'lipVZ', 'lipWeight', 'tangentX', 'tangentZ'];
        if (required.some((k) => !Number.isFinite(a[k] as number))) nonfiniteHits++;
        if (Number.isFinite(a.ceilingY) && !(a.floorY <= a.ceilingY && a.ceilingY <= a.ceilingTopY)) mismatches++;
      }
    }
  };
  for (let s = 0; s + 1 < loft.sliceCount; s++) {
    if (loft.sliceJoined[s] !== 1) continue;
    for (const across of [.21, .5, .79]) for (const along of [.11, .37, .67, .89]) check(pointOn(loft, s, across, along), false);
    // F32 origins/rays + a dyadic along distance retain an exactly zero edge product in double arithmetic.
    // This exercises ray ownership on slanted real fronts, rather than only axis-aligned toy tubes.
    const p = loft.positions, o = 3 * s * S, q = pointOn(loft, s, 0, .5);
    const distance = Math.round(4 * ((q.x - p[o]) * loft.sliceRayX[s] + (q.z - p[o + 2]) * loft.sliceRayZ[s])) / 4;
    const onRay = { x: p[o] + distance * loft.sliceRayX[s], z: p[o + 2] + distance * loft.sliceRayZ[s] };
    const side = (onRay.x - p[o]) * loft.sliceRayZ[s] - (onRay.z - p[o + 2]) * loft.sliceRayX[s];
    if (side !== 0) throw new Error('The exact ray tie fixture lost its dyadic arithmetic');
    check(onRay, true);
    // Exactly on slice ray and at shared profile rows: full-scan checks enforce the half-open ownership rule.
    if (loft.sliceRayX[s] === 0 || loft.sliceRayZ[s] === 0) {
      for (const j of [E + LANDMARK.crest, E + LANDMARK.lip, E + LANDMARK.throat, E + LANDMARK.toe]) {
        const a = 3 * (s * S + j);
        check({ x: loft.positions[a], z: loft.positions[a + 2] }, true);
      }
    }
  }
  if (nondeterministic) failures.push('Lazy/repeated/full-scan contact queries differ');
  if (mismatches) failures.push('Contact differs from full geometric parity/order/tie oracle');
  if (nonfiniteHits) failures.push('Successful contact queries contain nonfinite required fields');
  if (evenInteriorColumns) failures.push('Sampled interior contact columns have even crossing parity (no closed lower water)');
  return { pass: failures.length === 0, failures, points, columns, noColumn, queries, exactRayAndRowTies: ties,
    nondeterministic, mismatches, nonfiniteHits, evenColumns, evenInteriorColumns, evenTieColumns,
    tieInterpretation: 'The half-open full geometric oracle also validates exact ray/row ties. Both-or-neither at a boundary fold may have even parity and fall back to water; only interior even columns fail closure.',
    layers: { columns: layerColumns, swappedColumns, maxSwapMeters: Number.isFinite(maxLayerSwap) ? maxLayerSwap : null,
      interpretation: 'Raw landmark-layer separation; numeric sign is recorded without a visual tolerance.' }, firstIssues };
}

type Runtime = {
  SweptLoft: typeof SweptLoft; SweptContact: typeof SweptContact; libraryFromBytes: typeof libraryFromBytes;
};
const currentRuntime: Runtime = { SweptLoft, SweptContact, libraryFromBytes };

function metadataHashes(loft: LoftResult) {
  const fields = loft as unknown as Record<string, ArrayField>;
  const hashes: Record<string, string> = {};
  for (const name of ['sliceFront', 'sliceSigma', 'sliceTau', 'slicePhase', 'sliceLife', 'sliceCollapse', 'sliceFade']) {
    const values = new Float64Array(loft.sliceCount);
    for (let i = 0; i < values.length; i++) values[i] = fields[name][i];
    hashes[name] = sha256(new Uint8Array(values.buffer));
  }
  const crest = new Float32Array(2 * loft.sliceCount);
  for (let s = 0; s < loft.sliceCount; s++) {
    const v = 3 * (s * S + E + LANDMARK.crest);
    crest[2 * s] = loft.positions[v];
    crest[2 * s + 1] = loft.positions[v + 2];
  }
  hashes.crestXZ = sha256(new Uint8Array(crest.buffer));
  return hashes;
}

function restoreLoft(data: Record<string, unknown>): LoftResult {
  const restored: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    restored[key] = Array.isArray(value) ? (key === 'indices' ? Uint32Array.from(value) : Float32Array.from(value, (v) => v === null ? Number.NaN : v)) : value;
  }
  return restored as unknown as LoftResult;
}

/** Only active prefixes are serialized; JSON null represents the contract's optional NaN slice values. */
function geometryPayload(loft: LoftResult, grid: SurfaceGrid) {
  const lengths = new Map(fieldLengths(loft));
  const data: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(loft)) {
    data[name] = ArrayBuffer.isView(value)
      ? Array.from(value as unknown as ArrayLike<number>).slice(0, lengths.get(name) ?? value.byteLength / 4)
      : value;
  }
  const mask = new Uint8Array(grid.nx * grid.nz);
  const maskNodes = rasterizeBarrelMask(loft, grid, mask);
  return { loft: data, maskGrid: grid, mask: Array.from(mask), maskNodes,
    serialization: 'Active array prefixes only. Restore null entries in Float32 slice fields to NaN, not zero.' };
}

async function main() {
  const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
  const input = option('input') ?? '/private/tmp/tube-live-original';
  const frames = (option('frames') ?? '10,20').split(',').map(Number);
  const geometryDir = option('geometry-dir');
  if (geometryDir) mkdirSync(geometryDir, { recursive: true });
  const baselinePath = option('baseline');
  const baselineOnly = process.argv.includes('--baseline-only');
  if (baselineOnly && !baselinePath) throw new Error('--baseline-only requires an immutable --baseline runtime');
  const baseline: Runtime | undefined = baselinePath ? await import(pathToFileURL(resolve(baselinePath)).href) : undefined;
  const cases = barrelCasesFor('padang');
  const caseBytes = cases.map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
  const runs = [];
  for (const at of frames) {
    const name = `at-${at}.json`, bytes = readFileSync(resolve(input, name));
    const data = JSON.parse(bytes.toString('utf8'));
    if (data.front.length !== data.frontCount * FRONT_STRIDE) throw new Error(`${name}: front count mismatch`);
    // JSON encodes NaN throwZ/pace as null. Restoring null as zero would create a different physical fixture.
    const front = Float32Array.from(data.front as (number | null)[], (v) => v === null ? Number.NaN : v);
    for (let k = 0; k < data.frontCount; k++) for (const field of ['x', 'z', 'front', 'sigma', 'tau', 'footHeight', 'footDepth'] as const) {
      if (!Number.isFinite(front[k * FRONT_STRIDE + FRONT_FIELD[field]])) throw new Error(`${name}: invalid front ${k}/${field}`);
    }
    const grid: SurfaceGrid = data.waterGrid;
    const surface = Float32Array.from(data.surfaceData as number[]);
    if (surface.length !== 2 * grid.nx * grid.nz || !surface.every(Number.isFinite)) throw new Error(`${name}: invalid water snapshot`);
    const heightAt = (x: number, z: number) => sampleCubicSurface(surface, grid, x, z).height;
    const stillLevel = data.config.tide;
    const physicalInputHash = () => sha256(Buffer.concat([Buffer.from(front.buffer), Buffer.from(surface.buffer)]));
    const frozenInputHash = physicalInputHash();
    const measure = (runtime: Runtime, mode: 'baseline' | 'current') => {
      const library = runtime.libraryFromBytes(caseBytes);
      const drawing = new runtime.SweptLoft(library, BARREL_SLOPE.padang!);
      const drawn = drawing.build(front, data.frontCount, stillLevel, heightAt);
      const drawingMetrics = assessLoft(drawn, heightAt, grid);
      const metadata = metadataHashes(drawn);
      let geometry: { path: string; sha256: string; bytes: number } | undefined;
      if (geometryDir) {
        const path = resolve(geometryDir, `at-${at}.${mode}.json`);
        const text = `${JSON.stringify({ fixture: { name, sha256: sha256(bytes), seaTime: data.status.seaTime },
          mode, sourceRuntime: { path: mode === 'baseline' ? resolve(baselinePath!) : resolve(process.argv[1]),
            sha256: sha256(readFileSync(mode === 'baseline' ? baselinePath! : process.argv[1])) },
          geometryHash: drawingMetrics.hash, ...geometryPayload(drawn, grid) })}\n`;
        writeFileSync(path, text);
        geometry = { path, sha256: sha256(text), bytes: Buffer.byteLength(text) };
      }
      const repeatHash = geometryHash(drawing.build(front, data.frontCount, stillLevel, heightAt));
      const contact = new runtime.SweptContact(library, BARREL_SLOPE.padang!);
      const scan = new runtime.SweptContact(library, BARREL_SLOPE.padang!, { bucket: Infinity });
      contact.update(front, data.frontCount, stillLevel, heightAt);
      scan.update(front, data.frontCount, stillLevel, heightAt);
      const contactMetrics = assessLoft(contact.last!, heightAt);
      const queries = assessContact(contact, scan);
      const inputUnchanged = physicalInputHash() === frozenInputHash;
      return { pass: drawingMetrics.pass && contactMetrics.pass && queries.pass && drawingMetrics.hash === repeatHash && inputUnchanged,
        drawing: drawingMetrics, contact: contactMetrics, queries, geometry, metadata,
        repeatedDrawingExact: drawingMetrics.hash === repeatHash, physicalInputUnchanged: inputUnchanged };
    };
    const before = baseline ? measure(baseline, 'baseline') : undefined;
    const current = baselineOnly ? undefined : measure(currentRuntime, 'current');
    const metadataComparison = before && current ? Object.fromEntries(Object.keys(before.metadata)
      .map((field) => [field, before.metadata[field] === current.metadata[field]])) : undefined;
    runs.push({ fixture: { name, sha256: sha256(bytes), capturedAt: data.capturedAt, seaTime: data.status.seaTime,
      frontCount: data.frontCount, config: data.config, init: data.init, grid },
      capturedDrawing: data.loft ? assessLoft(restoreLoft(data.loft), heightAt, grid)
        : { available: false, note: 'Original captured drawing omitted; baseline/current runtime geometry rebuilt from the retained physical inputs.' },
      baseline: before, current, metadataComparison });
  }
  const report = { schema: 1, label: option('label') ?? 'current-working-geometry', pass: runs.every((run) => (run.current ?? run.baseline)!.pass),
    method: 'Frozen Float32 front records and 1 m cubic water snapshot. Restore JSON null to NaN. Rebuild actual drawing and held contact, no physics advance.',
    invariants: 'Active finite fields; strictly positive corresponding-row progress on BOTH slice tangents; valid triangles; mask/lift support; surviving run ends rest on water; repeatability; full geometric scan of contact with half-open edge and y ties. Negative progress is an across-front fold, independent of intentional along-ray overhang.',
    limitations: 'Two Hs4m/T10s mixed-sea snapshots. Contact uses the captured cubic 1 m water surface as heightAt, rather than uncaptured Float64 solver cells. Original captured drawing is also measured; the frozen baseline runtime is independently rebuilt. Seam residuals and landmark-layer swaps are raw diagnostics, without visual thresholds. No FPS claim.',
    runtime: { bundle: { name: basename(process.argv[1]), sha256: sha256(readFileSync(process.argv[1])) },
      baseline: baselinePath ? { name: basename(baselinePath), sha256: sha256(readFileSync(baselinePath)) } : undefined },
    cases: cases.map((entry, i) => ({ ...entry, sha256: sha256(caseBytes[i]), bytes: caseBytes[i].byteLength })), runs };
  const out = option('out');
  if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ pass: report.pass, out, runs: runs.map((run) => {
    const measured = (run.current ?? run.baseline)!;
    return { fixture: run.fixture.name, mode: run.current ? 'current' : 'baseline',
      pass: measured.pass, drawingFailures: measured.drawing.failures, contactFailures: measured.contact.failures,
      queryFailures: measured.queries.failures, drawingNegativeRows: measured.drawing.acrossFront.negativeRows,
      contactNegativeRows: measured.contact.acrossFront.negativeRows };
  }) }, null, 2));
  if (!report.pass && !process.argv.includes('--report-only')) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
