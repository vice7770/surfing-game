import { describe, expect, it } from 'vitest';
import { CHOP_RMS_SLOPE, FFT_CHOP_PATCH, FFT_CHOP_SIZE, binWave, chopSpectrum, inverseFft2d, slopeSpectrum } from './fftChopMath';

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
