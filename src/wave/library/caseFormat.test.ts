import { describe, expect, it } from 'vitest';
import { decodeWaveCase, encodeWaveCase, fromHalf, isWaveCase, PATH, PATH_COLUMNS, toHalf, WAVE_POINTS } from './caseFormat';
import { caseFromC2, type C2File } from './caseFromC2';
import { encodeCase } from '../barrel/profileFormat';

/** A small c2_library.py file: `count` frames, a crest moving at 1, two velocity depths, three QOUT frames and a bore. */
function syntheticC2(count = 6, nulls = true): C2File {
  const frames = Array.from({ length: count }, (_, k) => {
    const tau = -0.05 + 0.025 * k;
    const profile = Array.from({ length: WAVE_POINTS }, (_, i) => [30 + tau + (i - 32) * 0.05, 0.3 * Math.cos((i - 32) / 20)] as [number, number]);
    return {
      t: 20 + tau, tau, phase: 'pre', use: k === 2 ? 'refill' : 'own', flags: [], crest: [30 + tau, 0.3] as [number, number],
      trough: -0.1, H: 0.4, d: 0.8 - 0.1 * k, H_over_d: k === 1 && nulls ? null : 0.4 / (0.8 - 0.1 * k), speed: 1, face_deg: 40,
      profile, u: profile.map((_, i) => [i === 5 && nulls ? null : 0.1 * i, 0.2]), v: profile.map(() => [0.01, -0.02]),
    };
  });
  return {
    format: 'c2-case 1', run: 'periodic_test_L12', level: 12, dx_h0: 0.015625, h0_m: 5, time_scale_s: Math.sqrt(5 / 9.81), A0: 0.25,
    params: { S1: 0.068, HS: 0.205, period: 10.5 }, t_vertical: 20, t_touchdown: 21.2, n_points: WAVE_POINTS,
    arc: { lip_share: 0.6, throat_share: 0.62 }, velocity_depths: ['1.5 cells', 0.1], uses: { own: count - 1, refill: 1 }, path_checks: {}, stats: {},
    frames: frames as C2File['frames'],
    qout: {
      x: [21.125, 21.375, 21.625, 21.875], dx: 0.25, every: 0.1,
      frames: [0, 1, 2].map((k) => ({ t: 19.9 + 0.1 * k, h: [1, 1.01, 0.99, 1], q: [0.1, 0.2, 0.3, 0.4], top: [0.1, null, 0.2, 0.3], air: [0, 0.5, 0, 0.25] })),
      bore: [{ t: 21.3, front: 21.875, x: [21.375, 21.625], top: [0.2, 0.3], air: [0.1, 0.2] }], bore_speed: 0.93, mass: { drift_max: 1e-6 },
    },
  };
}

describe('float16', () => {
  it('round-trips every binary16 exactly and keeps NaN and the infinities', () => {
    for (let h = 0; h < 65536; h += 1) {
      const value = fromHalf(h);
      if (value !== value) { expect(toHalf(value) & 0x7c00).toBe(0x7c00); continue; }
      // −0 and +0 keep their bit.
      expect(toHalf(value)).toBe(h);
    }
    expect(toHalf(Number.POSITIVE_INFINITY)).toBe(0x7c00);
    expect(toHalf(1e6)).toBe(0x7c00);
    expect(fromHalf(toHalf(Number.NaN))).toBeNaN();
  });

  it('rounds to the nearest, ties to even', () => {
    expect(fromHalf(toHalf(1 + 1 / 2048))).toBe(1); // a tie: down to the even 1
    expect(fromHalf(toHalf(1 + 3 / 2048))).toBe(1 + 2 / 1024); // a tie: up to the even 1 + 2/1024
    expect(fromHalf(toHalf(0.1))).toBeCloseTo(0.1, 3);
    expect(Math.abs(fromHalf(toHalf(1.2345)) - 1.2345)).toBeLessThan(1 / 2048 + 1e-12);
    expect(fromHalf(toHalf(3e-6))).toBeCloseTo(3e-6, 7); // subnormal
  });
});

describe('BRL3', () => {
  it('reads back what it wrote, byte for byte, and a second encode is the same bytes', () => {
    const c = caseFromC2(syntheticC2(), 'test');
    const bytes = encodeWaveCase(c);
    expect(isWaveCase(bytes)).toBe(true);
    const back = decodeWaveCase(bytes);
    expect(Array.from(back.frames)).toEqual(Array.from(c.frames));
    expect(Array.from(back.path).map(String)).toEqual(Array.from(c.path).map(String));
    expect(Array.from(back.use)).toEqual(Array.from(c.use));
    expect(Array.from(back.qFlow)).toEqual(Array.from(c.qFlow));
    for (let i = 0; i < c.velocity.length; i += 1) {
      if (c.velocity[i] !== c.velocity[i]) expect(back.velocity[i]).toBeNaN();
      else expect(Math.abs(back.velocity[i] - c.velocity[i])).toBeLessThanOrEqual(Math.abs(c.velocity[i]) / 2048 + 1e-7);
    }
    expect(encodeWaveCase(back)).toEqual(bytes);
    expect(encodeWaveCase(caseFromC2(syntheticC2(), 'test'))).toEqual(bytes);
  });

  it('refuses another format, and a file cut short', () => {
    const bytes = encodeWaveCase(caseFromC2(syntheticC2(), 'test'));
    expect(() => decodeWaveCase(bytes.subarray(0, bytes.length - 8))).toThrow();
    const brl2 = encodeCase({ id: 'x', slope: 0.05, nonlinearity: 0.3, flatDepth: 0.2, breakerHeight: 0.5, tauStep: 0.1, tauStart: 0, touchdown: 1, frames: new Float32Array(256) });
    expect(isWaveCase(brl2)).toBe(false);
    expect(() => decodeWaveCase(brl2)).toThrow('Not a BRL3');
  });

  it('keeps c2_library.py\'s values: x from the crest at τ = 0, nulls as NaN, the keys from the params', () => {
    const c = caseFromC2(syntheticC2(), 'test');
    const h = c.header;
    expect(h.origin).toBeCloseTo(30, 6);
    expect(h.tauStart).toBeCloseTo(-0.05, 9);
    expect(h.tauStep).toBeCloseTo(0.025, 9);
    expect(h.touchdown).toBeCloseTo(1.2, 9);
    expect(h.slope).toBe(0.068);
    expect(h.reefDepth).toBe(0.205);
    expect(h.period).toBeCloseTo(10.5 / Math.sqrt(5 / 9.81), 9);
    expect(h.velocityDepths[0]).toBeCloseTo(1.5 * 0.015625, 9);
    expect(h.velocityDepths[1]).toBe(0.1);
    expect(c.path[0 * PATH_COLUMNS + PATH.crestX]).toBeCloseTo(-0.05, 6);
    expect(c.path[1 * PATH_COLUMNS + PATH.Hd]).toBeNaN();
    expect(c.use[2]).toBe(0);
    expect(c.velocity[(5 * 2 + 0) * 2]).toBeNaN();
    expect(c.qTop[1]).toBeNaN();
    expect(Array.from(c.bore)).toEqual([Math.fround(1.3), Math.fround(21.875 - 30), 1, 2].map((v) => Math.fround(v)));
    expect(h.q?.boreBins).toBe(2);
  });
});
