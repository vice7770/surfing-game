import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CASCADE_SPLIT, CHOP_LOOP, CHOP_RMS_SLOPE, COARSE_CHOP_PATCH, FFT_CHOP_PATCH, FFT_CHOP_SIZE, FINE_CHOP_PATCH, LONGEST_CHOP, SHORTEST_CHOP,
  binWave, chopCascades, chopRadix, chopSpectrum, coarseShare, inverseFft2d, inverseFft2dRadix, loopFrequency, slopeMomentLevels, slopeSpectrum,
} from './fftChopMath';

/** Σ F(k) e^{+2πi k·x/n} by brute force. */
function directInverse(field: Float64Array, n: number): Float64Array {
  const out = new Float64Array(field.length);
  for (let z = 0; z < n; z += 1) {
    for (let x = 0; x < n; x += 1) {
      let re = 0;
      let im = 0;
      for (let row = 0; row < n; row += 1) {
        for (let column = 0; column < n; column += 1) {
          const angle = (2 * Math.PI * (column * x + row * z)) / n;
          const i = (row * n + column) * 2;
          re += field[i] * Math.cos(angle) - field[i + 1] * Math.sin(angle);
          im += field[i] * Math.sin(angle) + field[i + 1] * Math.cos(angle);
        }
      }
      out[(z * n + x) * 2] = re;
      out[(z * n + x) * 2 + 1] = im;
    }
  }
  return out;
}

describe('FFT chop math', () => {
  it('inverts a 2D spectrum with Stockham passes exactly as a direct transform', () => {
    for (const n of [8, 16]) {
      const field = new Float64Array(n * n * 2).map((_, i) => Math.sin(i * 1.7) + Math.cos(i * 0.31));
      const fast = inverseFft2d(field, n);
      const direct = directInverse(field, n);
      let worst = 0;
      for (let i = 0; i < fast.length; i += 1) worst = Math.max(worst, Math.abs(fast[i] - direct[i]));
      expect(worst).toBeLessThan(1e-9);
    }
  });

  it('makes a real slope field with the procedural chop\'s rms slope, carried downwind', () => {
    const n = FFT_CHOP_SIZE;
    const spectrum = chopSpectrum(6, 3);
    for (const t of [0, 2.5]) {
      const slopes = inverseFft2d(slopeSpectrum(spectrum, t), n);
      let squares = 0;
      for (let i = 0; i < slopes.length; i += 1) squares += slopes[i] * slopes[i];
      // Real and imaginary parts carry sx and sz; together their mean square is the slope vector's.
      expect(Math.sqrt(squares / (n * n))).toBeGreaterThan(0.8 * CHOP_RMS_SLOPE);
      expect(Math.sqrt(squares / (n * n))).toBeLessThan(1.2 * CHOP_RMS_SLOPE);
    }
    // The height field is real: h̃(−k) = conj(h̃(k)) at any time.
    const t = 1.3;
    const heights = slopeSpectrum(spectrum, t).map(() => 0);
    let asymmetry = 0;
    for (let row = 0; row < n; row += 1) {
      for (let column = 0; column < n; column += 1) {
        const o = (row * n + column) * 4;
        const m = (((n - row) % n) * n + ((n - column) % n)) * 4;
        // conj(h̃0(−k)) stored at k is the conjugate of h̃0 stored at −k.
        asymmetry = Math.max(asymmetry, Math.abs(spectrum[o + 2] - spectrum[m]), Math.abs(spectrum[o + 3] + spectrum[m + 1]));
      }
    }
    expect(heights.length).toBe(n * n * 2);
    expect(asymmetry).toBe(0);
    // Energy runs with the wind (+z for onshore), and the solver's long waves are left out.
    let downwind = 0;
    let upwind = 0;
    let long = 0;
    let total = 0;
    for (let row = 0; row < n; row += 1) {
      for (let column = 0; column < n; column += 1) {
        const o = (row * n + column) * 4;
        const kz = binWave(row, n);
        // Slope energy: what the shading sees.
        const energy = (spectrum[o] ** 2 + spectrum[o + 1] ** 2) * (binWave(column, n) ** 2 + kz ** 2);
        const wavelength = FFT_CHOP_PATCH / Math.hypot(binWave(column, n), kz);
        if (kz > 0) downwind += energy;
        if (kz < 0) upwind += energy;
        if (wavelength > 12) long += energy;
        total += energy;
      }
    }
    expect(upwind / downwind).toBeLessThan(0.15);
    expect(long / total).toBeLessThan(0.02);
    const offshore = chopSpectrum(-6, 3);
    let offshoreUp = 0;
    for (let row = 1; row < n / 2; row += 1) {
      for (let column = 0; column < n; column += 1) {
        offshoreUp += (offshore[(row * n + column) * 4] ** 2 + offshore[(row * n + column) * 4 + 1] ** 2) * (binWave(column, n) ** 2 + row ** 2);
      }
    }
    expect(offshoreUp / total).toBeLessThan(0.15);
  });
});

describe('the chop for the Rich water (web-ocean plan, item 4)', () => {
  it('keeps the Classic patch byte for byte', () => {
    // SHA-256 of chopSpectrum before the cascades were added (2026-10-17, 18bfbe9f).
    const hashes: [number, number, string][] = [
      [6, 3, '5afc8c74078e2df45a58176c386f516dbe31db88991f36b9900a8425f76d0a48'],
      [0, 1, 'f943acfaa9e62415f4b16f3c6d3c95fe72d125333deb0c89624504839c39ee84'],
      [-8, 7, '63a514099fcfa1b04af42c5e90a41382ff98884e96fa9a7c4732ef4c55364b74'],
    ];
    for (const [wind, seed, hash] of hashes) {
      const spectrum = chopSpectrum(wind, seed);
      expect(createHash('sha256').update(new Uint8Array(spectrum.buffer)).digest('hex')).toBe(hash);
    }
  });

  it('inverts with radix-4 and radix-16 passes exactly as a direct transform, and as the radix-2 one on the chop itself', () => {
    for (const [n, radix] of [[4, 4], [16, 4], [16, 16], [64, 4]]) {
      const field = new Float64Array(n * n * 2).map((_, i) => Math.sin(i * 1.7) + Math.cos(i * 0.31));
      const fast = inverseFft2dRadix(field, n, radix);
      const direct = directInverse(field, n);
      let worst = 0;
      for (let i = 0; i < fast.length; i += 1) worst = Math.max(worst, Math.abs(fast[i] - direct[i]));
      expect(worst).toBeLessThan(1e-9 * n * n);
    }
    const n = FFT_CHOP_SIZE;
    expect(chopRadix(n)).toBe(4);
    expect(chopRadix(64)).toBe(4);
    expect(() => chopRadix(128)).toThrow();
    const field = slopeSpectrum(chopSpectrum(6, 3), 2.5);
    const radix2 = inverseFft2d(field, n);
    for (const radix of [4, 16]) {
      const fast = inverseFft2dRadix(field, n, radix);
      let worst = 0;
      for (let i = 0; i < radix2.length; i += 1) worst = Math.max(worst, Math.abs(radix2[i] - fast[i]));
      expect(worst).toBeLessThan(1e-12);
    }
  });

  it('splits the same wind sea over a 64 m and a 12.25 m patch, on their own bands, at the procedural chop\'s rms slope', () => {
    const n = FFT_CHOP_SIZE;
    const cascades = chopCascades(6, 3);
    expect(cascades.patches).toEqual([COARSE_CHOP_PATCH, FINE_CHOP_PATCH]);
    // 64 / 12.25 = 256 / 49: the two repeats meet only every 3136 m.
    expect((COARSE_CHOP_PATCH * 49) / 256).toBeCloseTo(FINE_CHOP_PATCH, 12);
    const { coarse, fine } = cascades.covariance;
    expect(coarse[0] + coarse[1] + fine[0] + fine[1]).toBeCloseTo(CHOP_RMS_SLOPE ** 2, 12);
    // Each cascade carries a fair share of the slope, and the wind's axis (z) the most.
    for (const covariance of [coarse, fine]) {
      expect(covariance[0] + covariance[1]).toBeGreaterThan(0.25 * CHOP_RMS_SLOPE ** 2);
      expect(covariance[1]).toBeGreaterThan(covariance[0]);
    }
    const band = (offset: number, patch: number) => {
      const out = { energy: 0, below: 0, above: 0, solver: 0 };
      for (let row = 0; row < n; row += 1) {
        for (let column = 0; column < n; column += 1) {
          const o = offset + (row * n + column) * 4;
          const k = (2 * Math.PI * Math.hypot(binWave(column, n), binWave(row, n))) / patch;
          if (k === 0) continue;
          const energy = k * k * (cascades.spectrum[o] ** 2 + cascades.spectrum[o + 1] ** 2);
          const wavelength = (2 * Math.PI) / k;
          out.energy += energy;
          if (wavelength < CASCADE_SPLIT / 1.25 - 1e-9) out.below += energy;
          if (wavelength > CASCADE_SPLIT * 1.25 + 1e-9) out.above += energy;
          if (wavelength > 2 * LONGEST_CHOP) out.solver += energy;
        }
      }
      return out;
    };
    const coarseBand = band(0, COARSE_CHOP_PATCH);
    const fineBand = band(n * n * 4, FINE_CHOP_PATCH);
    expect(coarseBand.below).toBe(0);
    expect(fineBand.above).toBe(0);
    expect(coarseBand.solver / coarseBand.energy).toBeLessThan(0.02);
    // Nothing finer than the Classic patch's shortest wave.
    for (let row = 0; row < n; row += 1) {
      for (let column = 0; column < n; column += 1) {
        const o = n * n * 4 + (row * n + column) * 4;
        const k = (2 * Math.PI * Math.hypot(binWave(column, n), binWave(row, n))) / FINE_CHOP_PATCH;
        if (k > (2 * Math.PI) / SHORTEST_CHOP + 1e-9) expect(Math.abs(cascades.spectrum[o])).toBe(0);
      }
    }
    // The two shares meet without a gap or an overlap.
    for (const wavelength of [1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.7]) {
      const share = coarseShare((2 * Math.PI) / wavelength);
      expect(share).toBeGreaterThanOrEqual(0);
      expect(share).toBeLessThanOrEqual(1);
    }
    expect(coarseShare((2 * Math.PI) / CASCADE_SPLIT)).toBeCloseTo(0.5, 12);
    // The transformed fields' mean squares are the covariance's.
    for (const [offset, patch, covariance] of [[0, COARSE_CHOP_PATCH, coarse], [n * n * 4, FINE_CHOP_PATCH, fine]] as const) {
      const slopes = inverseFft2dRadix(slopeSpectrum(cascades.spectrum, 7, n, patch, CHOP_LOOP, offset), n);
      let squares = 0;
      for (let i = 0; i < slopes.length; i += 1) squares += slopes[i] * slopes[i];
      expect(squares / (n * n)).toBeGreaterThan(0.8 * (covariance[0] + covariance[1]));
      expect(squares / (n * n)).toBeLessThan(1.2 * (covariance[0] + covariance[1]));
    }
  });

  it('rounds every frequency to the time loop, so the sea repeats exactly every loop and its clock can wrap', () => {
    for (const omega of [0.7, 3.2, 11.1]) expect(Math.abs(loopFrequency(omega) - omega)).toBeLessThanOrEqual(Math.PI / CHOP_LOOP + 1e-12);
    const n = 16;
    const cascades = chopCascades(4, 2, n);
    for (const [offset, patch] of [[0, COARSE_CHOP_PATCH], [n * n * 4, FINE_CHOP_PATCH]] as const) {
      const now = slopeSpectrum(cascades.spectrum, 12.3, n, patch, CHOP_LOOP, offset);
      const later = slopeSpectrum(cascades.spectrum, 12.3 + CHOP_LOOP, n, patch, CHOP_LOOP, offset);
      let worst = 0;
      for (let i = 0; i < now.length; i += 1) worst = Math.max(worst, Math.abs(now[i] - later[i]));
      expect(worst).toBeLessThan(1e-9);
    }
  });

  it('carries slope moments whose mipmaps leave each footprint its own variance, the whole patch\'s at the last', () => {
    const n = FFT_CHOP_SIZE;
    const cascades = chopCascades(6, 3);
    const slopes = inverseFft2dRadix(slopeSpectrum(cascades.spectrum, 4, n, FINE_CHOP_PATCH, CHOP_LOOP, n * n * 4), n);
    const levels = slopeMomentLevels(slopes, n);
    expect(levels.length).toBe(9);
    let previous = -1;
    for (const level of levels) {
      let variance = 0;
      for (let i = 0; i < level.length; i += 5) {
        const xx = level[i + 2] - level[i] ** 2;
        const zz = level[i + 3] - level[i + 1] ** 2;
        const xz = level[i + 4] - level[i] * level[i + 1];
        expect(xx).toBeGreaterThan(-1e-12);
        expect(zz).toBeGreaterThan(-1e-12);
        // Cauchy–Schwarz: a box-filtered covariance stays positive semi-definite.
        expect(xz * xz).toBeLessThanOrEqual(xx * zz + 1e-15);
        variance += xx + zz;
      }
      variance /= level.length / 5;
      // Wider footprints leave more unresolved.
      expect(variance).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = variance;
    }
    const top = levels[levels.length - 1];
    expect(top[2] - top[0] ** 2 + top[3] - top[1] ** 2).toBeCloseTo(previous, 15);
    // The whole patch's variance is the spectrum's (Parseval), to the time's cross terms.
    const [xx, zz] = cascades.covariance.fine;
    expect(previous / (xx + zz)).toBeGreaterThan(0.8);
    expect(previous / (xx + zz)).toBeLessThan(1.2);
  });
});
