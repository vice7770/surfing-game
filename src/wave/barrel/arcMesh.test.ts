import { describe, expect, it } from 'vitest';
import { arcPlaces, arcRespace, jetLength, lipShare } from './arcMesh';
import { tubeFaceOf, type TubeFace } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type BarrelCase } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';

/**
 * Ruling 18's build 2 (`TubeFace.arcMesh`, `?loftMesh=arc`; docs/research/pool-look-reference-2026-11-11/ruling-18.md,
 * sections 1 and 3): before the throw the loft's vertices stand at fixed shares of the crest-to-toe arc, on the profile's
 * own polyline; the lip's and throat's marks enter at the throw.
 */

const { crest, lip, throat, toe, front } = LANDMARK;
/** The throw's own share of the crest-to-toe arc in the test's case: where its lip mark stands from clock 0 on. */
const THROW_SHARE = 0.3;

/** The test profile's curve from the crest to the toe by its arc share: a quarter circle (radius 0.2) then a straight face. */
function faceCurve(u: number, steep: number): [number, number] {
  const radius = 0.2;
  const bend = (Math.PI / 2) * radius;
  const run = Math.hypot(0.1 + steep, 0.3);
  const s = u * (bend + run);
  if (s <= bend) {
    const angle = Math.PI / 2 - s / radius;
    return [radius * Math.cos(angle), 0.3 + radius * Math.sin(angle)];
  }
  const t = (s - bend) / run;
  return [0.2 + t * (0.1 + steep), 0.3 - 0.3 * t];
}

/** One frame: the lip mark at `share` of the crest-to-toe arc, its lip-to-throat points all there (or a jet `jet` long). */
function frame(share: number, steep: number, jet = 0): Float32Array {
  const out = new Float32Array(2 * PROFILE_POINTS);
  const put = (i: number, p: [number, number]) => { out[2 * i] = p[0]; out[2 * i + 1] = p[1]; };
  for (let i = 0; i < PROFILE_POINTS; i += 1) {
    if (i <= crest) put(i, [-2 + (2 * i) / crest, (0.5 * i) / crest]);
    else if (i <= lip) put(i, faceCurve((share * (i - crest)) / (lip - crest), steep));
    else if (i <= throat) {
      // A jet: out along +x from the mark and back (a thin tongue), so the lip-to-throat arc has length.
      const p = faceCurve(share, steep);
      const t = (i - lip) / (throat - lip);
      put(i, [p[0] + jet * (i === lip ? 0 : 0.5 * (1 - t)), p[1] - 0.2 * jet * t]);
    } else if (i <= toe) put(i, faceCurve(share + ((1 - share) * (i - throat)) / (toe - throat), steep));
    else put(i, [0.3 + steep + (1.7 * (i - toe)) / (front - toe), 0]);
  }
  if (jet > 0) put(lip, [faceCurve(share, steep)[0] + 0.5 * jet, faceCurve(share, steep)[1]]);
  return out;
}

/**
 * A case whose lip mark slides before the throw, as the library's does (the face's steepest point): frames 0.1 apart from
 * τ = −1; before τ = 0 the mark stands at a share of its own each frame, from τ = 0 at `THROW_SHARE`. The face's foot
 * runs forward slowly with the clock, so the curve changes smoothly.
 */
function slideCase(): BarrelCase {
  const frames = 15;
  const data = new Float32Array(frames * 2 * PROFILE_POINTS);
  const slides = [0.62, 0.08, 0.45, 0.15, 0.7, 0.1, 0.55, 0.2, 0.66, 0.12];
  for (let f = 0; f < frames; f += 1) data.set(frame(f < 10 ? slides[f] : THROW_SHARE, 0.01 * f), f * 2 * PROFILE_POINTS);
  return {
    id: 'slide', slope: 0.05, nonlinearity: 0.3, flatDepth: 0.18, breakerHeight: 0.5, tauStep: 0.1, tauStart: -1, touchdown: 0.4,
    frames: data, tipVelocity: new Float32Array(2 * frames),
  };
}

describe('the arc mesh: the switch', () => {
  it('is off unless asked, and is read wherever the tube stands on the face ruling', () => {
    expect(tubeFaceOf(true, {})).not.toHaveProperty('arcMesh');
    expect(tubeFaceOf(true, { loftMesh: 'arc' })).toMatchObject({ arcMesh: true });
    expect(tubeFaceOf(true, { tubeForm: 'early', tubeSeam: 'blend', crestLine: 'top', anchorLine: 'smooth', loftMesh: 'arc' })).toMatchObject({ arcMesh: true, anchorLine: true });
    expect(tubeFaceOf(true, { loftMesh: 'arc', tubeFrom: 'piece' })).not.toHaveProperty('arcMesh');
    expect(tubeFaceOf(false, { loftMesh: 'arc' })).toBeUndefined();
    const { arcMesh: _on, ...rest } = tubeFaceOf(true, { crestLine: 'top', loftMesh: 'arc' })!;
    expect(rest).toEqual(tubeFaceOf(true, { crestLine: 'top' }));
  });
});

describe('the arc mesh: a profile’s places (`arcRespace`)', () => {
  const arc = new Float64Array(toe - crest + 1);
  /** The re-spaced points of a profile. */
  const placed = (profile: Float32Array, share: number): Float32Array | undefined => {
    const places = arcPlaces();
    if (!arcRespace(profile, share, arc, places)) return undefined;
    const out = new Float32Array(profile);
    for (let i = crest + 1; i < toe; i += 1) {
      const m = places.from[i];
      const t = places.share[i];
      out[2 * i] = profile[2 * m] + t * (profile[2 * m + 2] - profile[2 * m]);
      out[2 * i + 1] = profile[2 * m + 1] + t * (profile[2 * m + 3] - profile[2 * m + 1]);
    }
    return out;
  };
  const offPolyline = (px: number, py: number, line: Float32Array): number => {
    let best = Infinity;
    for (let i = crest; i < toe; i += 1) {
      const [ax, ay] = [line[2 * i], line[2 * i + 1]];
      const [bx, by] = [line[2 * i + 2] - ax, line[2 * i + 3] - ay];
      const l2 = bx * bx + by * by;
      const u = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * bx + (py - ay) * by) / l2)) : 0;
      best = Math.min(best, Math.hypot(px - ax - u * bx, py - ay - u * by));
    }
    return best;
  };

  it('reads the lip mark’s share of the crest-to-toe arc, and a jet’s length', () => {
    expect(lipShare(frame(0.3, 0))).toBeCloseTo(0.3, 2);
    expect(lipShare(frame(0.62, 0))).toBeCloseTo(0.62, 2);
    expect(jetLength(frame(0.3, 0))).toBe(0);
    expect(jetLength(frame(0.3, 0, 0.1))).toBeGreaterThan(0.05);
    expect(lipShare(new Float32Array(2 * PROFILE_POINTS))).toBeNaN();
  });

  it('puts the same vertex at the same place on the curve wherever the lip mark slid to', () => {
    const a = placed(frame(0.08, 0), THROW_SHARE)!;
    const b = placed(frame(0.7, 0), THROW_SHARE)!;
    const plain = [frame(0.08, 0), frame(0.7, 0)];
    let moved = 0;
    let slid = 0;
    for (let i = crest; i <= toe; i += 1) {
      moved = Math.max(moved, Math.hypot(a[2 * i] - b[2 * i], a[2 * i + 1] - b[2 * i + 1]));
      slid = Math.max(slid, Math.hypot(plain[0][2 * i] - plain[1][2 * i], plain[0][2 * i + 1] - plain[1][2 * i + 1]));
    }
    // The two polylines cut the bend's corners at different places: a millimetre; the marks' own slide is 0.35.
    expect(slid).toBeGreaterThan(0.3);
    expect(moved).toBeLessThan(0.002);
    // The lip's and the throat's points stand at the throw's share, at one place (the segment has no length yet).
    expect(lipShare(a)).toBeCloseTo(THROW_SHARE, 2);
    for (let i = lip; i <= throat; i += 1) expect([a[2 * i], a[2 * i + 1]]).toEqual([a[2 * lip], a[2 * lip + 1]]);
  });

  it('keeps every vertex on the profile’s own polyline, and the polyline’s corners within two millimetres of the new one', () => {
    for (const share of [0.08, 0.45, 0.7]) {
      const profile = frame(share, 0.03);
      const out = placed(profile, THROW_SHARE)!;
      let on = 0;
      let back = 0;
      for (let i = crest; i <= toe; i += 1) {
        on = Math.max(on, offPolyline(out[2 * i], out[2 * i + 1], profile));
        back = Math.max(back, offPolyline(profile[2 * i], profile[2 * i + 1], out));
      }
      expect(on).toBeLessThan(1e-6);
      expect(back).toBeLessThan(0.002);
      // The back slope and the front are untouched.
      for (let i = 0; i <= crest; i += 1) expect(out[2 * i]).toBe(profile[2 * i]);
      for (let i = toe; i < PROFILE_POINTS; i += 1) expect(out[2 * i]).toBe(profile[2 * i]);
    }
  });

  it('spaces the crest-to-lip and the throat-to-toe points evenly by arc length', () => {
    const out = placed(frame(0.62, 0), THROW_SHARE)!;
    const step = (i: number) => Math.hypot(out[2 * i + 2] - out[2 * i], out[2 * i + 3] - out[2 * i + 1]);
    for (const [from, to] of [[crest, lip], [throat, toe]]) {
      let low = Infinity;
      let high = 0;
      for (let i = from; i < to; i += 1) { low = Math.min(low, step(i)); high = Math.max(high, step(i)); }
      // Chords of even arcs: equal on the straight face, a hair shorter round the bend.
      expect(high - low).toBeLessThan(0.02 * high);
    }
  });

  it('takes the pleat out between slices whose lip mark stands at different places on the same curve', () => {
    // Three slices 0.5 apart along the crest, the same curve in each, the mark at 0.08, 0.7 and 0.08 of the arc.
    const slices = [frame(0.08, 0), frame(0.7, 0), frame(0.08, 0)];
    const fold = (rows: Float32Array[]): number => {
      const at = (k: number, i: number): [number, number, number] => [rows[k][2 * i], rows[k][2 * i + 1], 0.5 * k];
      const normal = (k: number, i: number): [number, number, number] => {
        const [p, q, r] = [at(k, i), at(k, i + 1), at(k + 1, i)];
        const [ax, ay, az] = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        const [bx, by, bz] = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
        return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
      };
      let worst = 0;
      for (let i = crest; i < toe; i += 1) {
        const [a, b] = [normal(0, i), normal(1, i)];
        const [la, lb] = [Math.hypot(...a), Math.hypot(...b)];
        if (!(la > 1e-9 && lb > 1e-9)) continue;
        worst = Math.max(worst, (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb)))) * 180) / Math.PI);
      }
      return worst;
    };
    expect(fold(slices)).toBeGreaterThan(30);
    // What is left is the two polylines' own corners round the bend, a few degrees.
    expect(fold(slices.map((slice) => placed(slice, THROW_SHARE)!))).toBeLessThan(5);
  });

  it('leaves a profile alone once its lip has an underside, and with no share to stand at', () => {
    const places = arcPlaces();
    expect(arcRespace(frame(0.3, 0, 0.1), THROW_SHARE, arc, places)).toBe(false);
    expect(arcRespace(frame(0.3, 0), Number.NaN, arc, places)).toBe(false);
    expect(arcRespace(frame(0.3, 0), 0, arc, places)).toBe(false);
    expect(arcRespace(frame(0.3, 0), 1, arc, places)).toBe(false);
    expect(arcRespace(new Float32Array(2 * PROFILE_POINTS), THROW_SHARE, arc, places)).toBe(false);
    for (let i = 0; i < PROFILE_POINTS; i += 1) expect([places.from[i], places.share[i]]).toEqual([i, 0]);
  });
});

describe('the arc mesh: the loft before the throw', () => {
  const face = (over: Partial<TubeFace>): TubeFace => ({
    anchor: true, union: false, lag: false, clockRate: 2, thrownEnds: false, continuity: true, distance: false, contour: false, wallFlow: false,
    contact: false, cap: false, merge: false, guard: false, track: false, inertia: false, retire: false, buoy: false, drop: false, ...over,
  });
  const N = 16;
  const STILL = 0.5;
  /** A front along +x, records 1.25 m apart, the clock running from before the throw to after it along the crest. */
  function records(): Float32Array {
    const out = new Float32Array(N * FRONT_STRIDE);
    for (let k = 0; k < N; k += 1) {
      const o = k * FRONT_STRIDE;
      out[o + FRONT_FIELD.x] = 1.25 * k;
      out[o + FRONT_FIELD.z] = -100;
      out[o + FRONT_FIELD.front] = 1;
      out[o + FRONT_FIELD.sigma] = 1.25 * k;
      out[o + FRONT_FIELD.tau] = -1.2 + 0.1 * k;
      out[o + FRONT_FIELD.footHeight] = 2.1;
      out[o + FRONT_FIELD.footDepth] = 7;
      out[o + FRONT_FIELD.throwZ] = -100;
      out[o + FRONT_FIELD.anchor] = 0.4;
      for (const f of [FRONT_FIELD.pace, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
    }
    return out;
  }
  const build = (arcMesh: boolean) =>
    new SweptLoft(new ProfileLibrary([slideCase()]), 0.05, { contact: true, face: face(arcMesh ? { arcMesh: true } : {}) }).build(records(), N, STILL, () => STILL);
  const E = LOFT.extensionSamples;
  type Loft = ReturnType<typeof build>;
  const at = (loft: Loft, s: number, i: number): [number, number, number] => {
    const o = 3 * (s * LOFT_SAMPLES + E + i);
    return [loft.positions[o], loft.positions[o + 1], loft.positions[o + 2]];
  };
  /** A slice's lip vertex's share of its crest-to-toe arc. */
  const shareOf = (loft: Loft, s: number): number => {
    let to = 0;
    let whole = 0;
    for (let i = crest; i < toe; i += 1) {
      const [a, b] = [at(loft, s, i), at(loft, s, i + 1)];
      whole += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (i === lip - 1) to = whole;
    }
    return to / whole;
  };
  const before = (loft: Loft): number[] => {
    const rows: number[] = [];
    for (let s = 0; s < loft.sliceCount; s += 1) if (loft.sliceTau[s] < -0.02 && loft.sliceWeight[s] > 0.99) rows.push(s);
    return rows;
  };

  it('is the build as before without the switch, and from the throw on with it', () => {
    const [plain, again, arc] = [build(false), build(false), build(true)];
    expect([...plain.positions.subarray(0, 3 * plain.vertexCount)]).toEqual([...again.positions.subarray(0, 3 * again.vertexCount)]);
    expect(arc.sliceCount).toBe(plain.sliceCount);
    let thrown = 0;
    for (let s = 0; s < arc.sliceCount; s += 1) {
      expect(arc.sliceSigma[s]).toBe(plain.sliceSigma[s]);
      expect(arc.sliceTau[s]).toBe(plain.sliceTau[s]);
      if (arc.sliceTau[s] < 0) continue;
      thrown += 1;
      for (let j = 0; j < LOFT_SAMPLES; j += 1) for (let c = 0; c < 3; c += 1) {
        expect(arc.positions[3 * (s * LOFT_SAMPLES + j) + c]).toBe(plain.positions[3 * (s * LOFT_SAMPLES + j) + c]);
      }
    }
    expect(thrown).toBeGreaterThan(3);
  });

  it('holds the lip’s vertices at the throw’s share of the arc before the throw, where the plain loft’s slide with the mark', () => {
    const [plain, arc] = [build(false), build(true)];
    const rows = before(arc);
    expect(rows.length).toBeGreaterThan(10);
    const shares = rows.map((s) => shareOf(arc, s));
    const slid = rows.map((s) => shareOf(plain, s));
    expect(Math.max(...slid) - Math.min(...slid)).toBeGreaterThan(0.3);
    for (const share of shares) expect(share).toBeCloseTo(THROW_SHARE, 2);
  });

  it('draws the same curve: its vertices on the plain loft’s polyline, the back and the front untouched', () => {
    const [plain, arc] = [build(false), build(true)];
    const off = (p: [number, number, number], loft: Loft, s: number): number => {
      let best = Infinity;
      for (let i = crest; i < toe; i += 1) {
        const [a, b] = [at(loft, s, i), at(loft, s, i + 1)];
        const [bx, by, bz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const l2 = bx * bx + by * by + bz * bz;
        const u = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * bx + (p[1] - a[1]) * by + (p[2] - a[2]) * bz) / l2)) : 0;
        best = Math.min(best, Math.hypot(p[0] - a[0] - u * bx, p[1] - a[1] - u * by, p[2] - a[2] - u * bz));
      }
      return best;
    };
    let on = 0;
    let back = 0;
    for (const s of before(arc)) {
      for (let i = crest; i <= toe; i += 1) {
        on = Math.max(on, off(at(arc, s, i), plain, s));
        back = Math.max(back, off(at(plain, s, i), arc, s));
      }
      for (let j = 0; j < LOFT_SAMPLES; j += 1) {
        if (j > E + crest && j < E + toe) continue;
        for (let c = 0; c < 3; c += 1) expect(arc.positions[3 * (s * LOFT_SAMPLES + j) + c]).toBe(plain.positions[3 * (s * LOFT_SAMPLES + j) + c]);
      }
    }
    // The vertices themselves stay on the polyline; its own corners round the test's tight bend (a 0.2 radius in the case's
    // unit, drawn many times larger) are cut by the new chords by up to two millimetres of that unit.
    expect(on).toBeLessThan(1e-4);
    expect(back).toBeLessThan(0.02);
  });
});
