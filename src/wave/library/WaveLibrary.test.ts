import { describe, expect, it } from 'vitest';
import { GRAVITY } from '../dispersion';
import { decodeWaveCase, encodeWaveCase, PATH, PATH_COLUMNS, WAVE_POINTS, type WaveCase, type WaveCaseHeader } from './caseFormat';
import { StateMatcher, WaveLibrary, type CasePath, type HandoverState } from './WaveLibrary';

const FLOATS = 2 * WAVE_POINTS;

interface Synthetic { id?: string; a0?: number; slope?: number; reefDepth?: number; period?: number; grow?: number; base?: number; count?: number; refill?: number[] }

/**
 * A synthetic case: a crest moving at 1 h0 per √(h0/g) from τ −4 to +2 (step 0.05), its height growing, the depth under
 * it falling (d = 1 + 0.1 τ before the throw), and H/d = base + grow (τ + 4) rising. Each landmark piece is a straight
 * run, and the velocity at two depths is linear in the point.
 */
function synthetic(o: Synthetic = {}): WaveCase {
  const count = o.count ?? 121;
  const tauStart = -4;
  const tauStep = 0.05;
  const base = o.base ?? 0.2;
  const grow = o.grow ?? 0.1;
  const frames = new Float32Array(count * FLOATS);
  const path = new Float32Array(count * PATH_COLUMNS);
  const velocity = new Float32Array(count * WAVE_POINTS * 2 * 2);
  const use = new Uint8Array(count).fill(1);
  for (const k of o.refill ?? []) use[k] = 0;
  for (let k = 0; k < count; k += 1) {
    const tau = tauStart + k * tauStep;
    const crest = tau;
    const d = tau < 0 ? 1 + 0.1 * tau : 1;
    const hd = base + grow * (tau + 4);
    const height = hd * d;
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      // Uneven within each piece: a squared share, so the respacing has work to do.
      const piece = i <= 32 ? [0, 32] : i <= 64 ? [32, 64] : i <= 88 ? [64, 88] : i <= 112 ? [88, 112] : [112, 127];
      const s = (i - piece[0]) / (piece[1] - piece[0]);
      const along = piece[0] + (piece[1] - piece[0]) * s * s;
      frames[k * FLOATS + 2 * i] = crest + (along - 32) * 0.05;
      frames[k * FLOATS + 2 * i + 1] = i <= 32 ? height * (along / 32) : height * (1 - (along - 32) / 95);
      for (let j = 0; j < 2; j += 1) {
        velocity[((k * WAVE_POINTS + i) * 2 + j) * 2] = 0.01 * i + 0.1 * j + 0.001 * k;
        velocity[((k * WAVE_POINTS + i) * 2 + j) * 2 + 1] = -0.05 * j;
      }
    }
    const row = k * PATH_COLUMNS;
    path[row + PATH.tau] = tau;
    path[row + PATH.crestX] = crest;
    path[row + PATH.crestY] = height;
    path[row + PATH.trough] = 0;
    path[row + PATH.H] = height;
    path[row + PATH.d] = d;
    path[row + PATH.Hd] = hd;
    path[row + PATH.speed] = 1;
    path[row + PATH.face] = 30;
  }
  const header: WaveCaseHeader = {
    format: 'brl3 1', id: o.id ?? 'syn', run: 'syn', level: 12, dx: 0.015625, h0: 5, a0: o.a0 ?? 0.25, slope: o.slope ?? 0.068,
    reefDepth: o.reefDepth ?? 0.2, period: o.period ?? 14.7, tVertical: 20, touchdown: 1.2, tauStart, tauStep, frames: count,
    points: WAVE_POINTS, origin: 0, velocityDepths: [0.02, 0.1], velocityLabels: ['1.5 cells', '0.1'], arc: { lip: 0.6, throat: 0.62 },
    uses: { own: count, refill: 0 }, pathChecks: {}, stats: {}, q: null, sections: [],
  };
  const empty = new Float32Array(0);
  return { header, frames, use, path, velocity, qTime: empty, qFlow: empty, qTop: empty, qAir: empty, bore: empty, boreTop: empty, boreAir: empty };
}

/** The state a case's own path gives at τ (its H/d, its depth at h0 m, its period there), on its own bed. */
function stateOf(c: WaveCase, tau: number, h0 = 5, time = 0): HandoverState {
  const lib = new WaveLibrary([c]);
  const path = lib.cases[0].path;
  const k = Math.round((tau - c.header.tauStart) / c.header.tauStep);
  const d = path.d[k];
  return { heightOverDepth: path.Hd[k], period: c.header.period / Math.sqrt(d), slope: c.header.slope, reefDepth: c.header.reefDepth, depth: d * h0, time };
}

describe('WaveLibrary: one case', () => {
  it('reproduces its frames and rebuilds a refill frame from its own neighbours, index to index', () => {
    const c = synthetic({ refill: [40] });
    const lib = new WaveLibrary([c]);
    expect(lib.cases[0].refilled).toBe(1);
    const out = new Float64Array(FLOATS);
    const k = 41;
    lib.caseFrameAt(0, c.header.tauStart + k * c.header.tauStep, out);
    for (let i = 0; i < FLOATS; i += 1) expect(out[i]).toBe(c.frames[k * FLOATS + i]);
    const r39 = new Float64Array(FLOATS), r40 = new Float64Array(FLOATS), r41 = new Float64Array(FLOATS);
    lib.caseFrameAt(0, -4 + 39 * 0.05, r39);
    lib.caseFrameAt(0, -4 + 40 * 0.05, r40);
    lib.caseFrameAt(0, -4 + 41 * 0.05, r41);
    for (let i = 0; i < FLOATS; i += 1) expect(r40[i]).toBeCloseTo((r39[i] + r41[i]) / 2, 5);
  });

  it('matches its own state: τ_h at the stored τ, h0 the run\'s, and the surface at the hand-over is that frame', () => {
    const c = synthetic();
    const lib = new WaveLibrary([c]);
    const state = stateOf(c, -2, 5, 10);
    const slice = lib.slice(state);
    expect(slice.n).toBe(1);
    expect(slice.tauH[0]).toBeCloseTo(-2, 6);
    expect(slice.h0).toBeCloseTo(5, 6);
    expect(slice.match.clamp).toEqual({ slope: 'in', reefDepth: 'in', a0: 'one' });
    const out = new Float32Array(FLOATS);
    const crest = new Float64Array(2);
    lib.surfaceAt(slice, 10, out, crest);
    const frame = new Float64Array(FLOATS);
    lib.caseFrameAt(0, -2, frame);
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      expect(out[2 * i]).toBeCloseTo((frame[2 * i] - -2) * 5, 4);
      expect(out[2 * i + 1]).toBeCloseTo(frame[2 * i + 1] * 5, 4);
    }
    expect(crest[0]).toBeCloseTo(0, 9);
    // One case: τ(t) = τ_h + (t − t_h)/√(h0/g), and the crest moves at 1 √(g h0).
    const unit = Math.sqrt(5 / GRAVITY);
    expect(lib.tausAt(slice, 10 + 1.5 * unit)[0]).toBeCloseTo(-0.5, 6);
    expect(lib.crestAt(slice, 10 + unit, new Float64Array(2))[0]).toBeCloseTo(5, 4);
    expect(lib.throwTime(slice)).toBeCloseTo(10 + 2 * unit, 6);
  });

  it('scales by the hand-over depth: the same state at twice the depth is twice the size, √2 slower', () => {
    const c = synthetic();
    const lib = new WaveLibrary([c]);
    const a = lib.slice(stateOf(c, -2, 5));
    const b = lib.slice(stateOf(c, -2, 10));
    expect(b.h0).toBeCloseTo(2 * a.h0, 9);
    expect(b.unit).toBeCloseTo(Math.SQRT2 * a.unit, 9);
  });

  it('clamps τ where the slice is smaller or larger than the case, and says so', () => {
    const c = synthetic();
    const lib = new WaveLibrary([c]);
    const low = lib.slice({ ...stateOf(c, -2), heightOverDepth: 0.05 });
    expect(low.match.cases[0].tauClamp).toBe(-1);
    expect(low.tauH[0]).toBe(-4);
    const high = lib.slice({ ...stateOf(c, -2), heightOverDepth: 5 });
    expect(high.match.cases[0].tauClamp).toBe(1);
    expect(high.tauH[0]).toBeCloseTo(0, 9);
  });

  it('gives the velocity at a depth, linear between the stored depths and held beyond, in √(g h0)', () => {
    const c = synthetic();
    const lib = new WaveLibrary([c]);
    const slice = lib.slice(stateOf(c, -2));
    const out = new Float64Array(2);
    const speed = Math.sqrt(GRAVITY * slice.h0);
    const k = 40; // τ −2
    lib.velocityAt(slice, 0, 10, 0.06 * slice.h0, out);
    expect(out[0] / speed).toBeCloseTo(0.1 + 0.05 + 0.001 * k, 4);
    expect(out[1] / speed).toBeCloseTo(-0.025, 4);
    lib.velocityAt(slice, 0, 10, 0, out);
    expect(out[0] / speed).toBeCloseTo(0.1 + 0.001 * k, 4);
    lib.velocityAt(slice, 0, 10, 10, out);
    expect(out[0] / speed).toBeCloseTo(0.2 + 0.001 * k, 4);
  });
});

describe('WaveLibrary: blending', () => {
  const small = synthetic({ id: 'small', a0: 0.15, base: 0.15 });
  const big = synthetic({ id: 'big', a0: 0.35, base: 0.3 });

  it('brackets A0 by the period at the matched H/d: a slice between two cases blends them, weights summing to 1', () => {
    const lib = new WaveLibrary([big, small]);
    // H/d 0.4: the small case reaches it at τ −1.5 (d 0.85), the big one at τ −3 (d 0.7). A depth axis between them.
    const dSmall = 0.85, dBig = 0.7;
    const target = 0.25 * dSmall + 0.75 * dBig;
    const slice = lib.slice({ heightOverDepth: 0.4, period: 14.7 / Math.sqrt(target), slope: 0.068, reefDepth: 0.2, depth: target * 5, time: 0 });
    expect(slice.match.clamp.a0).toBe('in');
    const bySmall = slice.match.cases.find((x) => lib.cases[x.case].id === 'small')!;
    const byBig = slice.match.cases.find((x) => lib.cases[x.case].id === 'big')!;
    expect(bySmall.tauH).toBeCloseTo(-1.5, 6);
    expect(byBig.tauH).toBeCloseTo(-3, 6);
    expect(bySmall.weight).toBeCloseTo(0.25, 6);
    expect(byBig.weight).toBeCloseTo(0.75, 6);
    expect(slice.h0).toBeCloseTo(5, 6);
    // They throw together, at the blended time to the throw.
    expect(slice.toThrow).toBeCloseTo(0.25 * 1.5 + 0.75 * 3, 6);
    const taus = lib.tausAt(slice, lib.throwTime(slice));
    expect(taus[0]).toBeCloseTo(0, 9);
    expect(taus[1]).toBeCloseTo(0, 9);
  });

  it('clamps A0 below the smallest case and above the largest, and reports the share', () => {
    const lib = new WaveLibrary([small, big]);
    const below = lib.slice({ heightOverDepth: 0.4, period: 14.7, slope: 0.068, reefDepth: 0.2, depth: 5, time: 0 });
    expect(below.match.clamp.a0).toBe('low');
    expect(below.match.a0Low).toBeCloseTo(1, 9);
    expect(below.n).toBe(1);
    // The slice's own A0 past the smallest case's, linear: u −1 below 0.15 on the 0.15 → 0.35 segment.
    expect(below.match.a0Key).toBeCloseTo(0.15 - 0.2, 6);
    expect(lib.cases[below.caseIndex[0]].id).toBe('small');
    const above = lib.slice({ heightOverDepth: 0.4, period: 14.7 / Math.sqrt(0.5), slope: 0.068, reefDepth: 0.2, depth: 2.5, time: 0 });
    expect(above.match.clamp.a0).toBe('high');
    expect(lib.cases[above.caseIndex[0]].id).toBe('big');
  });

  it('brackets the slope, then the reef depth at each slope (a partial grid), weights multiplying', () => {
    const a = synthetic({ id: 'a', slope: 0.036, reefDepth: 0.19 });
    const b = synthetic({ id: 'b', slope: 0.105, reefDepth: 0.3 });
    const b2 = synthetic({ id: 'b2', slope: 0.105, reefDepth: 0.2 });
    const lib = new WaveLibrary([a, b, b2]);
    const state = stateOf(a, -2);
    const slice = lib.slice({ ...state, slope: 0.036 + 0.25 * (0.105 - 0.036), reefDepth: 0.2 });
    const w = Object.fromEntries(slice.match.cases.map((x) => [lib.cases[x.case].id, x.weight]));
    expect(w.a).toBeCloseTo(0.75, 6);
    expect(w.b2).toBeCloseTo(0.25, 6);
    expect(w.b ?? 0).toBe(0);
    // At slope 0.036 only one reef depth: 0.2 is off it.
    expect(slice.match.clamp.reefDepth).toBe('one');
    expect(slice.match.reefOff).toBeCloseTo(0.75 * 0.01, 6);
    const half = lib.slice({ ...state, slope: 0.105, reefDepth: 0.25 });
    const h = Object.fromEntries(half.match.cases.map((x) => [lib.cases[x.case].id, x.weight]));
    expect(h.b).toBeCloseTo(0.5, 6);
    expect(h.b2).toBeCloseTo(0.5, 6);
    expect(half.match.clamp.slope).toBe('in');
    const steep = lib.slice({ ...state, slope: 0.2, reefDepth: 0.25 });
    expect(steep.match.clamp.slope).toBe('high');
  });

  it('neighbouring slices never switch case: a small change of key is a small change of weight', () => {
    const lib = new WaveLibrary([small, big]);
    let previous: number | undefined;
    for (let k = 0; k <= 100; k += 1) {
      const target = 0.86 - 0.002 * k;
      const slice = lib.slice({ heightOverDepth: 0.4, period: 14.7 / Math.sqrt(target), slope: 0.068, reefDepth: 0.2, depth: target * 5, time: 0 });
      const w = slice.match.cases.find((x) => lib.cases[x.case].id === 'big')?.weight ?? 0;
      if (previous !== undefined) expect(Math.abs(w - previous)).toBeLessThan(0.02);
      previous = w;
    }
  });
});

describe('WaveLibrary: determinism', () => {
  /** FNV-1a over the bytes of every output float. */
  function hashOf(chunks: Array<Float32Array | Float64Array>): string {
    let h = 0x811c9dc5;
    for (const c of chunks) {
      const bytes = new Uint8Array(c.buffer, c.byteOffset, c.byteLength);
      for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  function run(): string {
    const cases = [synthetic({ id: 'a', a0: 0.15, base: 0.15 }), synthetic({ id: 'b', a0: 0.35, base: 0.3 }), synthetic({ id: 'c', slope: 0.105, a0: 0.25, base: 0.22 })];
    // Through the file, as the game will read it.
    const lib = new WaveLibrary(cases.map((c) => decodeWaveCase(encodeWaveCase(c))));
    const chunks: Array<Float32Array | Float64Array> = [];
    for (let s = 0; s < 40; s += 1) {
      const slice = lib.slice({ heightOverDepth: 0.3 + 0.005 * s, period: 15 + 0.03 * s, slope: 0.05 + 0.001 * s, reefDepth: 0.2 + 0.001 * s, depth: 4.2 + 0.01 * s, time: s * 0.1 });
      for (let k = 0; k < 6; k += 1) {
        const t = s * 0.1 + k * 0.4;
        const out = new Float32Array(FLOATS);
        lib.surfaceAt(slice, t, out);
        chunks.push(out, Float64Array.from(lib.velocityAt(slice, t, 70, 0.3, new Float64Array(2))), Float64Array.of(slice.h0, slice.toThrow, ...slice.weight));
      }
    }
    return hashOf(chunks);
  }

  it('gives byte-equal outputs on repeat', () => {
    expect(run()).toBe(run());
  });
});

describe('StateMatcher on paths alone', () => {
  it('matches paths without frames, as a coverage study reads them', () => {
    const tau = Float64Array.from({ length: 81 }, (_, k) => -8 + 0.1 * k);
    const path = (id: string, a0: number, base: number): CasePath => ({
      id, a0, slope: 0.07, reefDepth: 0.2, period: 14.7, tau, d: tau.map((t) => (t < 0 ? 1 + 0.06 * t : 1)), Hd: tau.map((t) => base + 0.05 * (t + 8)),
    });
    const m = new StateMatcher([path('lo', 0.15, 0.1), path('hi', 0.35, 0.3)]);
    const one = m.matchCase(0, 0.3);
    expect(one.tau).toBeCloseTo(-4, 6);
    expect(one.depth).toBeCloseTo(0.76, 6);
    // H/d 0.4: the low case at τ −2 (d 0.88), the high one at τ −6 (d 0.64); a slice at d 0.8 is a third of the way.
    const match = m.match({ heightOverDepth: 0.4, period: 14.7 / Math.sqrt(0.8), slope: 0.07, reefDepth: 0.2, depth: 4, time: 0 });
    expect(match.clamp.a0).toBe('in');
    expect(match.cases[1].weight).toBeCloseTo(1 / 3, 9);
    expect(match.h0).toBeCloseTo(5, 9);
    expect(match.cases.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 12);
  });
});
