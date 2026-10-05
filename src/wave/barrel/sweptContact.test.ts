import { describe, expect, it, vi } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { CONTACT, createContactHit, SweptContact, tubeState } from './sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';
import { tubeCase } from './toyCase';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';
import type { TubeApproachRequest } from './tubeApproach';

const STILL = 0.5;
const flat = () => STILL;
const H0 = 7;
const UNIT = Math.sqrt(H0 / 9.81);
/** A straight front along +x at z = −100, thrown there (so the tube stands on z = −100 + along). */
function records(n: number, tau: number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7;
    out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
  }
  return out;
}
const library = () => new ProfileLibrary([tubeCase(0.3)]);
const contactAt = (tau: number) => {
  const contact = new SweptContact(library(), 0.05);
  contact.update(records(21, tau), 21, STILL, flat);
  return contact;
};
// The toy at x = 1 h0 (along 7 m, z = −93): the flat, the underside and the top.
const UNDER = STILL + (0.7 - 1 / 6) * H0;
const TOP = STILL + 0.55 * H0;

/** Observe preparation separately from public query results; the fully prepared twin is the eager reference. */
type BucketState = {
  stripReady: Uint8Array;
  nextBucket: number;
  nextEntry: number;
  cellStrips: Int32Array;
  found: number;
  count: number;
  ensureBucket(s: number): void;
  heldByAnother(loft: NonNullable<SweptContact['last']>, strip: number, x: number, z: number): boolean;
};
const bucketState = (contact: SweptContact) => contact as unknown as BucketState;
const prepareAll = (contact: SweptContact) => {
  const loft = contact.last!;
  for (let s = 0; s + 1 < loft.sliceCount; s += 1) if (loft.sliceJoined[s] === 1) bucketState(contact).ensureBucket(s);
};

describe('ordinary bounded-C approach answers', () => {
  it('matches eager geometry through deferred, changed and empty generations without preparing normals or publishing lofts', () => {
    const cases = readBarrelCases().map(decodeCase), c = cases.find(value => value.id === 'pad19-a30-l12')!;
    const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
    const base = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 }, profile = new Float32Array(2 * PROFILE_POINTS);
    library.profileAt({ ...base, seconds: library.profileTimes(base).clearSeconds }, profile);
    const scale = 3 / (profile[2 * LANDMARK.crest + 1] - profile[2 * LANDMARK.toe + 1]);
    const query = { slope: c.slope, footHeight: base.footHeight * scale, footDepth: base.footDepth * scale };
    const times = library.profileTimes(query), packet = new Float32Array(9 * FRONT_STRIDE);
    for (let k = 0; k < 9; k++) {
      const o = k * FRONT_STRIDE;
      packet[o + FRONT_FIELD.x] = k + 0.5; packet[o + FRONT_FIELD.z] = -100;
      packet[o + FRONT_FIELD.front] = 9; packet[o + FRONT_FIELD.sigma] = k;
      packet[o + FRONT_FIELD.footHeight] = query.footHeight; packet[o + FRONT_FIELD.footDepth] = query.footDepth;
      packet[o + FRONT_FIELD.tau] = times.clearSeconds; packet[o + FRONT_FIELD.throwZ] = -100; packet[o + FRONT_FIELD.pace] = 0;
    }
    const solver = new ShallowWaterSolver({ nx: 48, xMin: -12, dx: 1, zEdges: uniformEdges(-130, -70, 60) }, () => 7, { waterLevel: STILL });
    const water = new PhysicalSurfWater(solver, { peakPeriod: 18, nodeSpacing: 2 });
    let deferred: { normalDemand: boolean; heightReady: Uint8Array; normalReady: Uint8Array } | undefined;
    const build = SweptLoft.prototype.build;
    const spy = vi.spyOn(SweptLoft.prototype, 'build').mockImplementation(function (this: SweptLoft, ...args) {
      const result = build.apply(this, args);
      const state = this as unknown as NonNullable<typeof deferred>;
      if (state.normalDemand) deferred = state;
      return result;
    });
    try {
      const owner = SweptContact.forOrdinaryWorker(library, c.slope), eager = new SweptContact(library, c.slope);
      const update = (data: Float32Array) => {
        owner.updateFromPlainSurface(data, data.length / FRONT_STRIDE, STILL, water);
        water.withSurfaceNodeCache(() => eager.update(data, data.length / FRONT_STRIDE, STILL, (x, z) => water.plainSurfaceAt(x, z)));
      };
      update(packet);
      expect(Object.keys(owner).sort()).toEqual(['queries', 'updateFromPlainSurface']);
      expect(Object.keys(owner.queries).sort()).toEqual(['approachNear', 'floorAt', 'query']);
      expect(Object.isFrozen(owner.queries)).toBe(true);
      expect(deferred!.heightReady.some(Boolean)).toBe(false); expect(deferred!.normalReady.some(Boolean)).toBe(false);
      const loft = eager.last!, row = Array.from(loft.sliceSigma.subarray(0, loft.sliceCount)).indexOf(4);
      const cap = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
      const request: TubeApproachRequest = { x: 4.371, z: loft.positions[cap + 2] + 0.6, seaTime: 23,
        bodyHeight: 1, halfWidth: 0.15, halfDepth: 0.2, envelopeRayX: 1, envelopeRayZ: 0, body: [], reach: 3 };
      const expected = eager.approachNear(request), actual = owner.queries.approachNear(request);
      expect(expected).toBeDefined(); expect(actual).toEqual(expected);
      expect(actual!.frontId).toBe(9); expect(actual!.geometryStep).toBe(1);
      expect(deferred!.heightReady.some(Boolean)).toBe(true); expect(deferred!.normalReady.some(Boolean)).toBe(false);
      const retained = { ...actual!, mouth: { ...actual!.mouth }, inside: { ...actual!.inside } };
      const changed = packet.slice();
      for (let k = 0; k < 9; k++) changed[k * FRONT_STRIDE + FRONT_FIELD.z] += 0.2;
      update(changed);
      const next = owner.queries.approachNear({ ...request, z: request.z + 0.2, seaTime: 24 });
      expect(next).toEqual(eager.approachNear({ ...request, z: request.z + 0.2, seaTime: 24 }));
      expect(next!.geometryStep).toBe(2); expect(actual).toEqual(retained);
      update(new Float32Array(0));
      expect(owner.queries.approachNear(request)).toBeUndefined();
      expect(deferred!.heightReady.some(Boolean)).toBe(false); expect(deferred!.normalReady.some(Boolean)).toBe(false);
      expect(actual).toEqual(retained);
    } finally { spy.mockRestore(); }
  });

  it('leaves raw contact and invalid requests without a C guide', () => {
    const contact = contactAt(0.1);
    const request: TubeApproachRequest = { x: 10.3, z: -93, seaTime: 0, bodyHeight: 1, halfWidth: 0.2, halfDepth: 0.15, body: [] };
    expect(contact.approachNear(request)).toBeUndefined();
    expect(contact.approachNear({ ...request, bodyHeight: Infinity })).toBeUndefined();
  });
});

type GridState = BucketState & {
  loft: SweptLoft;
  x0: number; z0: number; nx: number; nz: number;
  boxes: Int32Array;
  cellStart: Int32Array;
};

/** The original full vertex scan, independent of the captured per-slice bounds. */
function scanIndex(loft: NonNullable<SweptContact['last']>) {
  if (!loft.sliceJoined.subarray(0, Math.max(0, loft.sliceCount - 1)).some((joined) => joined === 1)) return { nx: 0 };
  const p = loft.positions;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let v = 0; v < loft.sliceCount * LOFT_SAMPLES; v += 1) {
    x0 = Math.min(x0, p[3 * v]); x1 = Math.max(x1, p[3 * v]);
    z0 = Math.min(z0, p[3 * v + 2]); z1 = Math.max(z1, p[3 * v + 2]);
  }
  const nx = Math.floor((x1 - x0) / CONTACT.cell) + 1;
  const nz = Math.floor((z1 - z0) / CONTACT.cell) + 1;
  const cells: number[][] = Array.from({ length: nx * nz }, () => []);
  const boxes: number[][] = [];
  for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
    if (loft.sliceJoined[s] !== 1) continue;
    let lowX = Infinity, highX = -Infinity, lowZ = Infinity, highZ = -Infinity;
    for (let v = s * LOFT_SAMPLES; v < (s + 2) * LOFT_SAMPLES; v += 1) {
      lowX = Math.min(lowX, p[3 * v]); highX = Math.max(highX, p[3 * v]);
      lowZ = Math.min(lowZ, p[3 * v + 2]); highZ = Math.max(highZ, p[3 * v + 2]);
    }
    const box = [Math.floor((lowX - x0) / CONTACT.cell), Math.floor((highX - x0) / CONTACT.cell),
      Math.floor((lowZ - z0) / CONTACT.cell), Math.floor((highZ - z0) / CONTACT.cell)];
    boxes.push([s, ...box]);
    for (let cz = box[2]; cz <= box[3]; cz += 1) for (let cx = box[0]; cx <= box[1]; cx += 1) cells[cz * nx + cx].push(s);
  }
  const starts = [0];
  for (const cell of cells) starts.push(starts[starts.length - 1] + cell.length);
  return { x0, z0, nx, nz, boxes, starts, strips: cells.flat() };
}

function capturedIndex(contact: SweptContact) {
  const state = contact as unknown as GridState;
  if (state.nx === 0) return { nx: 0 };
  const cells = state.nx * state.nz;
  const loft = contact.last!;
  const boxes: number[][] = [];
  for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
    if (loft.sliceJoined[s] === 1) boxes.push([s, ...state.boxes.subarray(4 * s, 4 * s + 4)]);
  }
  return { x0: state.x0, z0: state.z0, nx: state.nx, nz: state.nz, boxes,
    starts: Array.from(state.cellStart.subarray(0, cells + 1)),
    strips: Array.from(state.cellStrips.subarray(0, state.cellStart[cells])) };
}

describe('the swept contact', () => {
  it('keeps the full-scan grid and strip order through isolated, changed, resized and empty slices', () => {
    const contact = contactAt(0.1);
    const state = contact as unknown as GridState;
    const template = contact.last!;
    const make = (count: number, shift: number) => {
      const loft = { ...template, sliceCount: count, vertexCount: count * LOFT_SAMPLES,
        positions: template.positions.slice(0, 3 * (count + 2) * LOFT_SAMPLES), sliceJoined: template.sliceJoined.slice() };
      loft.sliceJoined.fill(0, Math.max(0, count - 1));
      for (let v = 0; v < loft.vertexCount; v += 1) {
        loft.positions[3 * v] += shift;
        loft.positions[3 * v + 2] -= 2 * shift;
      }
      if (count >= 4) {
        // These unused slices still determine the global grid bounds, even though neither belongs to a strip.
        loft.sliceJoined[0] = 0;
        loft.sliceJoined[count - 2] = 0;
        for (const [s, offset] of [[0, -13], [count - 1, 19]]) {
          for (let j = 0; j < LOFT_SAMPLES; j += 1) {
            const v = s * LOFT_SAMPLES + j;
            loft.positions[3 * v] += offset;
            loft.positions[3 * v + 2] += offset;
          }
        }
      }
      return loft;
    };
    const build = vi.spyOn(state.loft, 'build');
    for (const loft of [make(7, 0), make(7, 0.375), make(19, -4.125), make(0, 0), make(5, 0.125)]) {
      build.mockReturnValue(loft);
      const positions = loft.positions.slice();
      contact.update(new Float32Array(0), 0, STILL, flat);
      expect(capturedIndex(contact)).toEqual(scanIndex(loft));
      expect(loft.positions).toEqual(positions);
      expect(state.stripReady.every((ready) => ready === 0)).toBe(true);
      expect([state.nextBucket, state.nextEntry]).toEqual([0, 0]);
    }
  });

  it('reads the tube’s air as air, over the face, under the lip', () => {
    const hit = createContactHit();
    expect(contactAt(0.1).query(10.3, 2.5, -93, hit)).toBe(true);
    expect(hit.inWater).toBe(false);
    expect(hit.surfaceY).toBeCloseTo(STILL, 4);
    expect(hit.ceilingY).toBeCloseTo(UNDER, 3);
    expect(hit.ceilingTopY).toBeCloseTo(TOP, 3);
    expect(hit.floorY).toBeCloseTo(STILL, 4);
    expect(hit.normalY).toBeCloseTo(1, 4);
  });

  it('reads the lip as water with air beneath it, ramped toward the tip’s flow', () => {
    const hit = createContactHit();
    contactAt(0.1).query(10.3, (UNDER + TOP) / 2, -93, hit);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(TOP, 3);
    expect(hit.waterFloorY).toBeCloseTo(UNDER, 3);
    // The top crosses x = 1 h0 at profile index 32 + 32 / 1.2: 5/6 of the way from the crest to the tip.
    expect(hit.lipShare).toBeCloseTo(5 / 6, 2);
    expect(hit.lipVZ).toBeCloseTo(0.9 * Math.sqrt(9.81 * H0), 2);
    expect(hit.lipVY).toBeCloseTo(-0.3 * Math.sqrt(9.81 * H0), 2);
    expect(hit.tangentX).toBeCloseTo(1, 6);
  });

  it('lowers the held lip by the fade through the collapse, and weighs its flow by the same (the advisor, 2026-09-30)', () => {
    const times = library().profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 });
    const contact = contactAt(times.touchdownSeconds + times.collapseSeconds / 2);
    const hit = createContactHit();
    // Halfway through: the underside and the top at half their heights over the still water.
    const under = STILL + (UNDER - STILL) / 2;
    const top = STILL + (TOP - STILL) / 2;
    expect(contact.query(10.3, (under + top) / 2, -93, hit)).toBe(true);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(top, 3);
    expect(hit.waterFloorY).toBeCloseTo(under, 3);
    expect(hit.lipShare).toBeCloseTo(5 / 6, 2);
    expect(hit.lipWeight).toBeCloseTo(0.5, 5);
    // The held frame's jet keeps its velocity: the water is still coming down.
    expect(hit.lipVZ).toBeCloseTo(0.9 * Math.sqrt(9.81 * H0), 2);
    expect(tubeState(hit.life)).toBe('closed');
    // Under the lowered lip, the tube's air over the face.
    contact.query(10.3, (STILL + under) / 2, -93, hit);
    expect(hit.inWater).toBe(false);
    expect(hit.ceilingY).toBeCloseTo(under, 3);
  });

  it('reads under the face as water, and over the lip as air resting on its top', () => {
    const contact = contactAt(0.1);
    const hit = createContactHit();
    contact.query(10.3, 0, -93, hit);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(STILL, 4);
    expect(hit.waterFloorY).toBeNaN();
    contact.query(10.3, 9, -93, hit);
    expect(hit.inWater).toBe(false);
    expect(hit.surfaceY).toBeCloseTo(TOP, 3);
    expect(hit.ceilingY).toBeNaN();
    expect(contact.floorAt(10.3, -93)).toBeCloseTo(STILL, 4);
  });

  it('leaves the water alone beyond the loft', () => {
    const contact = contactAt(0.1);
    const hit = createContactHit();
    expect(contact.query(10.3, 0, -150, hit)).toBe(false);
    expect(contact.query(60, 0, -93, hit)).toBe(false);
    expect(contact.floorAt(60, -93)).toBeNaN();
  });

  it('agrees with the drawing: just above and below each drawn triangle, parity flips there', () => {
    const drawn = new SweptLoft(library(), 0.05).build(records(21, 0.1), 21, STILL, flat);
    const contact = contactAt(0.1);
    const hit = createContactHit();
    const p = drawn.positions;
    let checked = 0;
    for (let t = 0; t < drawn.indexCount; t += 3) {
      const [a, b, c] = [drawn.indices[t], drawn.indices[t + 1], drawn.indices[t + 2]];
      const slice = Math.floor(a / LOFT_SAMPLES);
      if (drawn.sliceWeight[slice] !== 1 || drawn.sliceWeight[slice + 1] !== 1) continue;
      // The tip's fold, where the lip is thinner than the probe's step, is left out.
      const j = (a % LOFT_SAMPLES) - LOFT.extensionSamples;
      if (Math.abs(j - 64) <= 1) continue;
      const area = (p[3 * b] - p[3 * a]) * (p[3 * c + 2] - p[3 * a + 2]) - (p[3 * b + 2] - p[3 * a + 2]) * (p[3 * c] - p[3 * a]);
      if (Math.abs(area) < 1e-6) continue;
      const x = (p[3 * a] + p[3 * b] + p[3 * c]) / 3;
      const y = (p[3 * a + 1] + p[3 * b + 1] + p[3 * c + 1]) / 3;
      const z = (p[3 * a + 2] + p[3 * b + 2] + p[3 * c + 2]) / 3;
      expect(contact.query(x, y + 1e-4, z, hit)).toBe(true);
      const above = hit.inWater;
      expect(contact.query(x, y - 1e-4, z, hit)).toBe(true);
      expect(hit.inWater).toBe(!above);
      const nearest = hit.inWater ? hit.surfaceY : hit.ceilingY;
      expect(nearest).toBeCloseTo(y, 3);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('counts a point on an edge two triangles share once, and keeps parity on the fold', () => {
    const contact = contactAt(0.1);
    const loft = contact.last!;
    const hit = createContactHit();
    // The shared diagonal of a face quad (v00 + 1 → v10) under the lip, at its midpoint: below it the face's water,
    // under three crossings (counted once, the face is one of them); just above it the tube's air.
    const slice = Math.floor(loft.sliceCount / 2);
    const v00 = slice * LOFT_SAMPLES + LOFT.extensionSamples + 100;
    const v10 = v00 + LOFT_SAMPLES;
    const x = (loft.positions[3 * (v00 + 1)] + loft.positions[3 * v10]) / 2;
    const z = (loft.positions[3 * (v00 + 1) + 2] + loft.positions[3 * v10 + 2]) / 2;
    const y = (loft.positions[3 * (v00 + 1) + 1] + loft.positions[3 * v10 + 1]) / 2;
    contact.query(x, y - 1, z, hit);
    expect(hit.inWater).toBe(true);
    contact.query(x, y + 0.01, z, hit);
    expect(hit.inWater).toBe(false);
    // On the fold: the tip's edge between two slices, shared by the lip's top and underside. Below it the tube's air
    // (the fold counts both or neither), above it air over the lip.
    const tip = slice * LOFT_SAMPLES + LOFT.extensionSamples + 64;
    const next = tip + LOFT_SAMPLES;
    const mid = (k: number) => (loft.positions[3 * tip + k] + loft.positions[3 * next + k]) / 2;
    contact.query(mid(0), mid(1) - 0.5, mid(2), hit);
    expect(hit.inWater).toBe(false);
    contact.query(mid(0), mid(1) + 0.5, mid(2), hit);
    expect(hit.inWater).toBe(false);
  });

  it('finds every layer over a point on a vertex row, though the quads’ ranges are stored rounded', () => {
    // The toy at h0 3 m: its face's samples every 2.5 cm along the ray, so z 2.1 and 2.2 lie on rows (as 32-bit floats
    // they round a hair away from the point, and a range check on them missed the face).
    const n = 17;
    const recs = new Float32Array(n * FRONT_STRIDE);
    for (let k = 0; k < n; k += 1) {
      const o = k * FRONT_STRIDE;
      recs[o + FRONT_FIELD.x] = k - 8; recs[o + FRONT_FIELD.z] = 0; recs[o + FRONT_FIELD.front] = 1; recs[o + FRONT_FIELD.sigma] = k;
      recs[o + FRONT_FIELD.tau] = 0.05; recs[o + FRONT_FIELD.footHeight] = 0.9; recs[o + FRONT_FIELD.footDepth] = 3;
      recs[o + FRONT_FIELD.throwZ] = 0;
    }
    const contact = new SweptContact(library(), 0.05);
    contact.update(recs, n, 0, () => 0);
    const hit = createContactHit();
    for (const x of [0, 0.25]) {
      for (const [z, face, under] of [[2.1, 0.9, 1.75], [2.2, 0.6, 1.7333]]) {
        // In the tube's air over the face, under the lip.
        expect(contact.query(x, 1.0, z, hit)).toBe(true);
        expect(hit.inWater).toBe(false);
        expect(hit.surfaceY).toBeCloseTo(face, 3);
        expect(hit.ceilingY).toBeCloseTo(under, 3);
      }
    }
    expect(contact.stats.anomalies).toBe(0);
  });

  it('reads a point exactly on a slice’s ray as the strip it opens (the ray’s own edges included)', () => {
    const contact = contactAt(0.1);
    const on = createContactHit();
    const beside = createContactHit();
    // Slices every half metre from σ −1.5: x = σ + 0.5, so x = 10 is slice σ 9.5's ray.
    for (const y of [0, 2.5, (UNDER + TOP) / 2, 9]) {
      expect(contact.query(10, y, -93, on)).toBe(true);
      contact.query(10.001, y, -93, beside);
      expect(on.inWater).toBe(beside.inWater);
      expect(on.surfaceY).toBeCloseTo(beside.surfaceY, 3);
    }
  });

  it('gives the tube’s state from its clock, and none before the throw', () => {
    expect(tubeState(Number.NaN)).toBeUndefined();
    expect(tubeState(0.2)).toBe('open');
    expect(tubeState(CONTACT.closing)).toBe('closing');
    expect(tubeState(1)).toBe('closed');
    const hit = createContactHit();
    contactAt(0.1).query(10.3, 2.5, -93, hit);
    expect(hit.life).toBeCloseTo(0.1 / (0.5 * UNIT), 3);
    // τ −0.3 s is −0.36 in the toy's units: between its two tent frames.
    contactAt(-0.3).query(10.3, 0, -100, hit);
    expect(hit.life).toBeNaN();
  });

  describe('the quads’ buckets along each strip’s ray (the advisor, 2026-09-30)', () => {
    /** A fixed sequence (a linear congruential generator), so reruns draw the same points. */
    const sequence = (seed: number) => () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    it('prepares only reached strips, once, with exact answers after out-of-order storage growth', () => {
      const lazy = new SweptContact(library(), 0.05);
      const eager = new SweptContact(library(), 0.05);
      const recs = records(321, 0.1);
      for (const contact of [lazy, eager]) contact.update(recs, 321, STILL, flat);
      prepareAll(eager);
      const state = bucketState(lazy);
      const a = createContactHit();
      const b = createContactHit();
      expect(state.nextBucket).toBe(0);
      expect(state.nextEntry).toBe(0);
      expect(lazy.query(160.3, 2.5, -150, a)).toBe(false);
      expect(state.nextBucket).toBe(0);
      // Visit strips far apart, including earlier strips after later ones have grown the shared storage.
      for (const x of [160.3, 300.3, 20.3, 240.3, 80.3, 160.3]) {
        for (const y of [0, 2.5, (UNDER + TOP) / 2, 9]) {
          expect(lazy.query(x, y, -93, a)).toBe(eager.query(x, y, -93, b));
          expect(a).toEqual(b);
        }
        expect(lazy.floorAt(x, -93)).toBe(eager.floorAt(x, -93));
      }
      expect(state.stripReady.reduce((sum, ready) => sum + ready, 0)).toBe(5);
      const prepared = [state.nextBucket, state.nextEntry];
      lazy.query(160.3, 2.5, -93, a);
      expect([state.nextBucket, state.nextEntry]).toEqual(prepared);
      expect(state.nextEntry).toBeLessThan(bucketState(eager).nextEntry / 50);
    });

    it('discards preparation on every update, through reused, resized and empty lofts', () => {
      const reused = contactAt(0.1);
      const a = createContactHit();
      const b = createContactHit();
      reused.query(10.3, 2.5, -93, a);
      for (const [n, tau] of [[21, 0.3], [41, -0.3], [0, 0.1], [21, 0.1]]) {
        const fresh = new SweptContact(library(), 0.05);
        const recs = records(n, tau);
        reused.update(recs, n, STILL, flat);
        fresh.update(recs, n, STILL, flat);
        expect(bucketState(reused).nextBucket).toBe(0);
        expect(bucketState(reused).nextEntry).toBe(0);
        expect(bucketState(reused).stripReady.every(ready => ready === 0)).toBe(true);
        for (const [x, y, z] of [[10.3, 2.5, -93], [5.2, 4.1, -92.5], [12.7, 0.1, -95]]) {
          const hit = reused.query(x, y, z, a);
          expect(hit).toBe(fresh.query(x, y, z, b));
          if (hit) expect(a).toEqual(b);
        }
      }
    });

    it('uses projections captured during update when the public loft is mutated before its first query', () => {
      const lazy = contactAt(0.1);
      const eager = contactAt(0.1);
      prepareAll(eager);
      for (const contact of [lazy, eager]) {
        const loft = contact.last!;
        for (let v = 0; v < loft.vertexCount; v += 1) {
          loft.positions[3 * v + 1] += 0.125;
          loft.positions[3 * v + 2] += 0.037;
        }
        // The eager index already selected its strips; laziness must not consult changed topology to prepare them.
        loft.sliceJoined.fill(0);
        loft.sliceCount = 0;
      }
      const a = createContactHit();
      const b = createContactHit();
      for (const x of [15.3, 5.2, 10.3]) for (const y of [0.1, 2.5, 4.4, 9]) {
        expect(lazy.query(x, y, -93 + 0.037, a)).toBe(true);
        expect(eager.query(x, y, -93 + 0.037, b)).toBe(true);
        expect(a).toEqual(b);
      }
      expect(lazy.stats).toEqual(eager.stats);
    });

    it('prepares later overlap candidates without replacing the found strip’s crossings', () => {
      const lazy = contactAt(0.1);
      const eager = contactAt(0.1);
      prepareAll(eager);
      const hit = createContactHit();
      for (const contact of [lazy, eager]) expect(contact.query(10.3, 2.5, -93, hit)).toBe(true);
      const state = bucketState(lazy);
      const first = state.cellStrips[state.found];
      const later = first + 1;
      expect(state.stripReady[later]).toBe(0);
      // A mutable loft can place a later, already indexed strip over the found one. The backstop must prepare that
      // candidate too, while retaining the found strip's crossing state for the public query's layer selection.
      for (const contact of [lazy, eager]) {
        const loft = contact.last!;
        loft.sliceFront[later] = 2;
        for (let v = later * LOFT_SAMPLES; v < (later + 2) * LOFT_SAMPLES; v += 1) loft.positions[3 * v] -= 0.5;
      }
      const crossings = state.count;
      expect(state.heldByAnother(lazy.last!, first, 10.3, -93)).toBe(true);
      expect(bucketState(eager).heldByAnother(eager.last!, first, 10.3, -93)).toBe(true);
      expect(state.stripReady[later]).toBe(1);
      expect(state.count).toBe(crossings);
    });

    it('answers exactly as a scan of every quad, through the tube, its lip, its edges and folds', () => {
      const bucketed = contactAt(0.1);
      const scanned = new SweptContact(library(), 0.05, { bucket: Infinity });
      scanned.update(records(21, 0.1), 21, STILL, flat);
      const loft = bucketed.last!;
      const random = sequence(99);
      const points: number[][] = [];
      for (let k = 0; k < 4000; k += 1) points.push([-2 + 25 * random(), -1 + 8 * random(), -118 + 36 * random()]);
      // On the loft's own vertices (the rays, the shared edges, the tip's fold), just above and below them.
      for (let v = 0; v < loft.vertexCount; v += 7) {
        for (const dy of [-0.01, 0, 0.01]) points.push([loft.positions[3 * v], loft.positions[3 * v + 1] + dy, loft.positions[3 * v + 2]]);
      }
      const a = createContactHit();
      const b = createContactHit();
      let answered = 0;
      for (const [x, y, z] of points) {
        const hit = bucketed.query(x, y, z, a);
        expect(hit).toBe(scanned.query(x, y, z, b));
        if (hit) {
          expect(a).toEqual(b);
          answered += 1;
        }
      }
      expect(answered).toBeGreaterThan(3000);
      expect(bucketed.stats).toMatchObject({ queries: scanned.stats.queries, hits: scanned.stats.hits, anomalies: scanned.stats.anomalies });
      // The scan tests all 133 quads of every strip it looks in; the buckets a handful.
      expect(10 * bucketed.stats.quads).toBeLessThan(scanned.stats.quads);
    });

    it('tests a few quads a layer through the tube, and none for a point outside every front’s footprint', () => {
      const contact = contactAt(0.1);
      const hit = createContactHit();
      expect(contact.query(10.3, 0, -150, hit)).toBe(false);
      expect(contact.query(60, 0, -93, hit)).toBe(false);
      expect(contact.stats.quads).toBe(0);
      // Three layers over x = 1 h0 (the face, the underside, the top); the quads run about 0.2–0.3 m along the ray there.
      for (const y of [0, 2.5, (UNDER + TOP) / 2, 9]) expect(contact.query(10.3, y, -93, hit)).toBe(true);
      expect(contact.stats.quads / 4).toBeLessThanOrEqual(12);
    });
  });

  it('answers from the first of two overlapping fronts, as drawn, with nothing left for the backstop (the advisor, 2026-09-30)', () => {
    // The first front over x 0.5–20.5 at τ 0.1 s, the second from x 10 at τ 0.2 s: its strips over the first's are dropped.
    const n = 21;
    const both = new Float32Array(2 * n * FRONT_STRIDE);
    for (let f = 0; f < 2; f += 1) {
      both.set(records(n, f === 0 ? 0.1 : 0.2), f * n * FRONT_STRIDE);
      for (let k = 0; k < n; k += 1) {
        both[(f * n + k) * FRONT_STRIDE + FRONT_FIELD.front] = f + 1;
        both[(f * n + k) * FRONT_STRIDE + FRONT_FIELD.x] = (f === 0 ? 0.5 : 10) + k;
      }
    }
    const contact = new SweptContact(library(), 0.05);
    contact.update(both, 2 * n, STILL, flat);
    expect(contact.last!.overlaps).toBeGreaterThan(0);
    const hit = createContactHit();
    // In the overlap the first front's tube, at its clock; past it the second's.
    expect(contact.query(15.3, 2.5, -93, hit)).toBe(true);
    expect(hit.life).toBeCloseTo(0.1 / (0.5 * UNIT), 3);
    expect(contact.query(26.3, 2.5, -93, hit)).toBe(true);
    expect(hit.life).toBeCloseTo(0.2 / (0.5 * UNIT), 3);
    for (let x = 8; x < 24; x += 0.37) for (let y = -0.5; y < 7; y += 0.41) contact.query(x, y, -93, hit);
    expect(contact.stats.overlaps).toBe(0);
  });

  it('holds no state of its own: the same records answer the same in a fresh contact', () => {
    const a = contactAt(0.3);
    const b = contactAt(0.1);
    b.update(records(21, 0.3), 21, STILL, flat);
    const ha = createContactHit();
    const hb = createContactHit();
    for (const [x, y, z] of [[10.3, 2.5, -93], [5.2, 4.1, -92.5], [12.7, 0.1, -95]]) {
      expect(a.query(x, y, z, ha)).toBe(b.query(x, y, z, hb));
      expect(hb).toEqual(ha);
    }
  });
});
