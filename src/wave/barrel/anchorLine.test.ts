import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { CrashCurve } from './crashCurve';
import { smoothPlaces, tubeFaceOf, type TubeFace } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { recordCurve, SweptLoft } from './sweptLoft';
import { lipCase, tubeCase } from './toyCase';

/**
 * Ruling 18's build 1 (`TubeFace.anchorLine`, `?anchorLine=smooth`; docs/research/pool-look-reference-2026-11-11/
 * ruling-18.md, section 1): the kept shifts' places smoothed along the crest once more into a field of its own, which
 * the records carry; the loft's records joined by a C1 curve.
 */
describe('the smooth anchor line: the switch', () => {
  it('is off unless asked, and is read with the continuity and the crest line alone', () => {
    expect(tubeFaceOf(true, {})).not.toHaveProperty('anchorLine');
    expect(tubeFaceOf(true, { crestLine: 'top' })).not.toHaveProperty('anchorLine');
    expect(tubeFaceOf(true, { anchorLine: 'smooth' })).not.toHaveProperty('anchorLine');
    expect(tubeFaceOf(true, { crestLine: 'top', anchorLine: 'smooth' })).toMatchObject({ anchorLine: true, crestLine: 'top', continuity: true });
    expect(tubeFaceOf(true, { tubeForm: 'early', tubeSeam: 'blend', crestLine: 'top', anchorLine: 'smooth' })).toMatchObject({ anchorLine: true });
    expect(tubeFaceOf(true, { crestLine: 'top', anchorLine: 'smooth', tubeAnchor: 'old' })).not.toHaveProperty('anchorLine');
    expect(tubeFaceOf(true, { crestLine: 'top', anchorLine: 'smooth', sweptCrash: false })).not.toHaveProperty('anchorLine');
    expect(tubeFaceOf(true, { crestLine: 'top', anchorLine: 'smooth', tubeFrom: 'piece' })).not.toHaveProperty('anchorLine');
    expect(tubeFaceOf(false, { crestLine: 'top', anchorLine: 'smooth' })).toBeUndefined();
    // The rest of the face is as without it.
    const { anchorLine: _on, ...rest } = tubeFaceOf(true, { crestLine: 'top', anchorLine: 'smooth' })!;
    expect(rest).toEqual(tubeFaceOf(true, { crestLine: 'top' }));
  });
});

describe('the smooth anchor line: a C1 curve through the records (`recordCurve`)', () => {
  const sigma = [0, 1.25, 2.4, 3.9, 5.0, 6.3];
  const curve = (values: number[], monotone = false) => (s: number): number => {
    let k = 0;
    while (k < sigma.length - 2 && sigma[k + 1] <= s) k += 1;
    return recordCurve((j) => sigma[j] ?? Number.NaN, (j) => values[j] ?? Number.NaN, k, s, monotone);
  };

  it('passes through each record, and is a straight line through records on one', () => {
    const rough = [0.3, 0.5, 0.2, 0.6, 0.55, 0.1];
    const at = curve(rough);
    sigma.forEach((s, k) => { if (k < sigma.length - 1) expect(at(s)).toBeCloseTo(rough[k], 12); });
    expect(at(sigma[5] - 1e-12)).toBeCloseTo(rough[5], 9);
    const line = curve(sigma.map((s) => 0.2 + 0.07 * s));
    for (let s = 0; s < 6.3; s += 0.11) expect(line(s)).toBeCloseTo(0.2 + 0.07 * s, 12);
  });

  it('follows a parabola exactly between inner records', () => {
    const f = (s: number) => 0.4 - 0.3 * s + 0.05 * s * s;
    const at = curve(sigma.map(f));
    for (let s = sigma[1]; s < sigma[4]; s += 0.07) expect(at(s)).toBeCloseTo(f(s), 12);
  });

  it('has no corner at a record: its slope is the same on both sides, where straight lines turn', () => {
    const rough = [0.3, 0.5, 0.2, 0.6, 0.55, 0.1];
    const at = curve(rough);
    const e = 1e-6;
    for (let k = 1; k < sigma.length - 1; k += 1) {
      const before = (at(sigma[k]) - at(sigma[k] - e)) / e;
      const after = (at(sigma[k] + e) - at(sigma[k])) / e;
      expect(Math.abs(after - before)).toBeLessThan(1e-4);
      const turn = Math.abs((rough[k + 1] - rough[k]) / (sigma[k + 1] - sigma[k]) - (rough[k] - rough[k - 1]) / (sigma[k] - sigma[k - 1]));
      expect(turn).toBeGreaterThan(0.1);
    }
  });

  it('keeps a clock that rises along the records rising between them, and never past a record’s value', () => {
    // A step: flat, a jump, flat. The plain curve overshoots it; the monotone one does not.
    const clock = [-1.5, -1.49, -1.48, -0.4, -0.39, -0.38];
    const plain = curve(clock);
    const kept = curve(clock, true);
    let overshoot = 0;
    let last = -Infinity;
    for (let s = 0; s <= 6.3; s += 0.01) {
      const v = kept(s);
      expect(v).toBeGreaterThanOrEqual(last - 1e-12);
      expect(v).toBeGreaterThanOrEqual(clock[0] - 1e-12);
      expect(v).toBeLessThanOrEqual(clock[5] + 1e-12);
      last = v;
      overshoot = Math.max(overshoot, clock[2] - plain(s), plain(s) - clock[3]);
    }
    expect(overshoot).toBeGreaterThan(0.01);
    // Still through the records, with one slope at each.
    sigma.forEach((s, k) => { if (k < sigma.length - 1) expect(kept(s)).toBeCloseTo(clock[k], 12); });
    const e = 1e-6;
    for (let k = 1; k < sigma.length - 1; k += 1) expect(Math.abs((kept(sigma[k] + e) - kept(sigma[k])) / e - (kept(sigma[k]) - kept(sigma[k] - e)) / e)).toBeLessThan(1e-4);
  });

  it('takes its one segment’s slope at a record whose neighbour has no value, and a zero-length segment’s first value', () => {
    const at = (s: number) => recordCurve((j) => [0, 1, 2, 3][j] ?? Number.NaN, (j) => [Number.NaN, 0.2, 0.5, Number.NaN][j] ?? Number.NaN, 1, s, false);
    for (const s of [1, 1.25, 1.5, 1.9]) expect(at(s)).toBeCloseTo(0.2 + 0.3 * (s - 1), 12);
    expect(recordCurve(() => 2, (j) => j, 3, 2, false)).toBe(3);
  });
});

describe('the smooth anchor line: the records', () => {
  const point = (k: number, over: Partial<FrontPoint> = {}): FrontPoint => ({
    id: k, front: 1, column: k, sigma: 1.25 * k, x: k + 0.5, z: -100, b: 0, height: 2, joined: 0, depth: 3, throwDepth: 2.5, crestDepth: 2,
    thrown: null, throwZ: null, footHeight: 2.1, footDepth: 7, broke: 0, tau: -0.5, fresh: null, seen: 0, ...over,
  });

  it('carry the smoothed place where the build made one, else the kept shift, else none', () => {
    const out = new Float32Array(3 * FRONT_STRIDE);
    writeFrontRecords([point(0, { anchorShift: 0.4 }), point(1, { anchorShift: 0.4, anchorDrawn: 0.25 }), point(2)], out);
    expect(out[FRONT_FIELD.anchor]).toBeCloseTo(0.4, 6);
    expect(out[FRONT_STRIDE + FRONT_FIELD.anchor]).toBeCloseTo(0.25, 6);
    expect(out[2 * FRONT_STRIDE + FRONT_FIELD.anchor]).toBeNaN();
  });

  /** A front along a slanted crest whose points each kept a rough shift (held on a miss this step: no crossing on flat water). */
  const kept = [0.42, 0.55, 0.38, 0.61, 0.47, 0.52, 0.35, 0.58, 0.44, 0.5, 0.41, 0.57];
  const held = (): FrontPoint[] => kept.map((shift, k) => point(k, {
    z: -100 + 0.6 * k + (k % 2 ? 0.3 : -0.3), dirX: 0, dirZ: 1, crestSpeed: 5,
    anchorShift: shift, anchorRate: 5, anchorTime: 10, anchorGood: 10, anchorX: k + 0.5, anchorZ: -100 + 0.6 * k + (k % 2 ? 0.3 : -0.3),
  }));
  const library = () => new ProfileLibrary([tubeCase(0.2), tubeCase(0.4)]);
  const flat = () => 0;

  it('smooths the kept places along the crest into `anchorDrawn`, and leaves the kept shift and the crash’s slices alone', () => {
    const on = held();
    const off = held();
    const n = kept.length;
    const outOn = new Float64Array(n);
    const outOff = new Float64Array(n);
    new CrashCurve(library(), 0.05, tubeFaceOf(true, { crestLine: 'top', anchorLine: 'smooth' })).prepareAnchors(on, 0, n, flat, undefined, 10, outOn);
    new CrashCurve(library(), 0.05, tubeFaceOf(true, { crestLine: 'top' })).prepareAnchors(off, 0, n, flat, undefined, 10, outOff);
    // Without the switch: no new field, the build as before.
    for (const p of off) expect(p).not.toHaveProperty('anchorDrawn');
    // The kept shift is the cap's own state: the same with and without.
    expect(on.map((p) => p.anchorShift)).toEqual(off.map((p) => p.anchorShift));
    on.forEach((p, k) => expect(p.anchorShift).toBeCloseTo(kept[k], 12));
    // The drawn place is the kept places' smooth along the crest, each along its own ray.
    const expected = new Float64Array(n);
    smoothPlaces(on.map((p) => p.sigma), on.map((p) => p.x), on.map((p) => p.z), on.map((p) => p.anchorShift!), on.map((p) => p.anchorRayX!), on.map((p) => p.anchorRayZ!), n, expected);
    on.forEach((p, k) => expect(p.anchorDrawn).toBeCloseTo(expected[k], 12));
    // The crash's own slices stay where they were: the jets' volumes and places are the front's, not the drawing's.
    expect([...outOn]).toEqual([...outOff]);
    // The places are smoother along the crest: the middle of three off the line through its neighbours.
    const off3 = (shift: (p: FrontPoint) => number) => {
      let worst = 0;
      for (let k = 1; k < n - 1; k += 1) {
        const place = (j: number) => (on[j].x - on[k].x) * on[k].anchorRayX! + (on[j].z - on[k].z) * on[k].anchorRayZ! + shift(on[j]);
        worst = Math.max(worst, Math.abs(place(k) - 0.5 * (place(k - 1) + place(k + 1))));
      }
      return worst;
    };
    expect(off3((p) => p.anchorShift!)).toBeGreaterThan(0.3);
    expect(off3((p) => p.anchorDrawn!)).toBeLessThan(0.1 * off3((p) => p.anchorShift!));
  });

  it('gives a point still on the crest anchor no drawn place, and does not smooth one in from its neighbours', () => {
    const points = held();
    for (const key of ['anchorShift', 'anchorRate', 'anchorTime', 'anchorGood', 'anchorX', 'anchorZ'] as const) delete points[5][key];
    points[5].anchorDrawn = 0.3;
    const out = new Float64Array(kept.length);
    new CrashCurve(library(), 0.05, tubeFaceOf(true, { crestLine: 'top', anchorLine: 'smooth' })).prepareAnchors(points, 0, kept.length, flat, undefined, 10, out);
    expect(points[5]).not.toHaveProperty('anchorDrawn');
    expect(out[5]).toBeNaN();
    expect(points[4].anchorDrawn).toBeDefined();
    const records = new Float32Array(kept.length * FRONT_STRIDE);
    writeFrontRecords(points, records);
    expect(records[5 * FRONT_STRIDE + FRONT_FIELD.anchor]).toBeNaN();
    expect(records[4 * FRONT_STRIDE + FRONT_FIELD.anchor]).toBeCloseTo(points[4].anchorDrawn!, 6);
  });
});

describe('the smooth anchor line: the loft joins its records with a C1 curve', () => {
  const face = (over: Partial<TubeFace>): TubeFace => ({
    anchor: true, union: false, lag: false, clockRate: 2, thrownEnds: false, continuity: true, distance: false, contour: false, wallFlow: false,
    contact: false, cap: false, merge: false, guard: false, track: false, inertia: false, retire: false, buoy: false, drop: false, ...over,
  });
  const N = 14;
  const STILL = 0.5;
  /** A front along +x, records 1.25 m apart, each with a clock, a foot height and an anchor of its own; `hop`: its z steps. */
  function records(anchor: (k: number) => number, hop: (k: number) => number = () => 0, tau: (k: number) => number = (k) => 0.1 + 0.012 * k): Float32Array {
    const out = new Float32Array(N * FRONT_STRIDE);
    for (let k = 0; k < N; k += 1) {
      const o = k * FRONT_STRIDE;
      out[o + FRONT_FIELD.x] = 1.25 * k;
      out[o + FRONT_FIELD.z] = -100 + hop(k);
      out[o + FRONT_FIELD.front] = 1;
      out[o + FRONT_FIELD.sigma] = 1.25 * k;
      out[o + FRONT_FIELD.tau] = tau(k);
      out[o + FRONT_FIELD.footHeight] = 2.1 + 0.02 * Math.sin(k);
      out[o + FRONT_FIELD.footDepth] = 7;
      out[o + FRONT_FIELD.throwZ] = -100;
      out[o + FRONT_FIELD.anchor] = anchor(k) - hop(k);
      for (const f of [FRONT_FIELD.pace, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
    }
    return out;
  }
  const library = () => new ProfileLibrary([lipCase(0.3, 0.04)]);
  const build = (r: Float32Array, anchorLine: boolean) =>
    new SweptLoft(library(), 0.05, { contact: true, face: face(anchorLine ? { anchorLine: true } : {}) }).build(r, N, STILL, () => STILL);
  /** Per slice inside the front: σ, the clock, and where its shift puts the case's crest along +z (the slices' ray here). */
  const read = (loft: ReturnType<typeof build>, r: Float32Array) => {
    const rows: { sigma: number; tau: number; place: number; shift: number }[] = [];
    for (let s = 0; s < loft.sliceCount; s += 1) {
      const sigma = loft.sliceSigma[s];
      if (sigma < 1.25 || sigma > 1.25 * (N - 2)) continue;
      const k = Math.min(N - 2, Math.floor(sigma / 1.25));
      const t = sigma / 1.25 - k;
      const z = r[k * FRONT_STRIDE + FRONT_FIELD.z] + t * (r[(k + 1) * FRONT_STRIDE + FRONT_FIELD.z] - r[k * FRONT_STRIDE + FRONT_FIELD.z]);
      rows.push({ sigma, tau: loft.sliceTau[s], shift: loft.sliceShift[s], place: z + 100 + loft.sliceShift[s] });
    }
    return rows;
  };
  /** The largest turn of a reading between neighbouring slice pairs: its second difference over the slices' spacing. */
  const turn = (rows: { sigma: number }[], value: (row: never) => number) => {
    let worst = 0;
    for (let i = 1; i < rows.length - 1; i += 1) {
      const a = value(rows[i - 1] as never); const b = value(rows[i] as never); const c = value(rows[i + 1] as never);
      const h0 = rows[i].sigma - rows[i - 1].sigma; const h1 = rows[i + 1].sigma - rows[i].sigma;
      worst = Math.max(worst, Math.abs((c - b) / h1 - (b - a) / h0));
    }
    return worst;
  };
  const rough = (k: number) => 0.5 + 0.12 * Math.sin(1.7 * k) + 0.05 * Math.cos(2.9 * k);

  /** A crest line that bends slowly along the crest, as the smoothed places do (0.3 m over about 8 m). */
  const bend = (sigma: number) => 0.5 + 0.3 * Math.sin(0.4 * sigma);

  it('is the build as before without the switch; with it the drawn line turns less at the records and lies nearer the bend', () => {
    const r = records((k) => bend(1.25 * k));
    const old = build(r, false);
    const again = new SweptLoft(library(), 0.05, { contact: true, face: face({}) }).build(r, N, STILL, () => STILL);
    expect([...old.positions.subarray(0, 3 * old.vertexCount)]).toEqual([...again.positions.subarray(0, 3 * again.vertexCount)]);
    const smooth = build(r, true);
    expect(smooth.sliceCount).toBe(old.sliceCount);
    const a = read(old, r);
    const b = read(smooth, r);
    // The straight lines' corner at a record is a turn of the slope in one slice step; the curve spreads it over its slices.
    const place = (row: { place: number }) => row.place;
    expect(turn(a, place)).toBeGreaterThan(0.04);
    expect(turn(b, place)).toBeLessThan(0.6 * turn(a, place));
    // At a record's own σ both stand on the record.
    for (const row of b) {
      const k = row.sigma / 1.25;
      if (Math.abs(k - Math.round(k)) < 1e-6) expect(row.shift).toBeCloseTo(bend(row.sigma), 5);
    }
    // Between records the curve lies on the bend; the straight lines cut its corners.
    const off = (rows: { sigma: number; place: number }[]) => Math.max(...rows.map((row) => Math.abs(row.place - bend(row.sigma))));
    expect(off(a)).toBeGreaterThan(0.005);
    expect(off(b)).toBeLessThan(0.3 * off(a));
  });

  it('through rough records it stays near the straight lines (no wild swing)', () => {
    const r = records(rough);
    const a = read(build(r, false), r);
    const b = read(build(r, true), r);
    b.forEach((row, i) => expect(Math.abs(row.place - a[i].place)).toBeLessThan(0.08));
  });

  it('keeps a record’s step along its column out of the curve: the same places drawn with and without the steps', () => {
    const hop = (k: number) => (k % 3 === 0 ? 0.6 : k % 3 === 1 ? -0.4 : 0.1);
    const plain = read(build(records(rough), true), records(rough));
    const hopped = read(build(records(rough, hop), true), records(rough, hop));
    expect(hopped.length).toBe(plain.length);
    // (The steps tilt the front's planned rays a little: a fraction of a millimetre.)
    hopped.forEach((row, i) => expect(row.place).toBeCloseTo(plain[i].place, 3));
  });

  it('runs the clock on a curve that never turns back between two records', () => {
    const tau = (k: number) => (k < 6 ? 0.1 + 0.002 * k : 0.3 + 0.002 * k);
    const r = records(rough, () => 0, tau);
    const rows = read(build(r, true), r);
    for (let i = 1; i < rows.length; i += 1) expect(rows[i].tau).toBeGreaterThanOrEqual(rows[i - 1].tau - 1e-6);
    for (const row of rows) {
      expect(row.tau).toBeGreaterThanOrEqual(tau(1) - 1e-6);
      expect(row.tau).toBeLessThanOrEqual(tau(N - 2) + 1e-6);
    }
  });

  it('falls back to the straight line across a record with no shift', () => {
    const gap = (k: number) => (k === 6 ? Number.NaN : rough(k));
    const r = records(gap);
    const a = read(build(r, false), r);
    const b = read(build(r, true), r);
    b.forEach((row, i) => { if (row.sigma > 1.25 * 5 && row.sigma < 1.25 * 7) expect(row.shift).toBeCloseTo(a[i].shift, 6); });
  });
});
