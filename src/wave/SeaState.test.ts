import { describe, expect, it } from 'vitest';
import { SeaState, jonswapShape, type SpectrumParams } from './SeaState';

const swell: SpectrumParams = {
  significantHeight: 1.4, peakPeriod: 8, direction: 0, spreading: 10, componentCount: 24, depth: 15,
};

function spread(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

describe('SeaState spectrum', () => {
  it('peaks the JONSWAP shape at the peak frequency', () => {
    const peak = (2 * Math.PI) / 8;
    expect(jonswapShape(peak, peak)).toBeGreaterThan(jonswapShape(peak * 0.97, peak));
    expect(jonswapShape(peak, peak)).toBeGreaterThan(jonswapShape(peak * 1.03, peak));
  });

  it('matches the requested significant wave height', () => {
    const sea = SeaState.fromSpectrum(swell, 1);
    expect(sea.components).toHaveLength(24);
    expect(sea.significantHeight).toBeCloseTo(1.4, 12);
  });

  it('orders component frequencies around the peak', () => {
    const omegas = SeaState.fromSpectrum(swell, 3).components.map((component) => component.omega);
    const peak = (2 * Math.PI) / 8;
    for (let index = 1; index < omegas.length; index += 1) expect(omegas[index]).toBeGreaterThan(omegas[index - 1]);
    const median = omegas[omegas.length / 2];
    expect(median).toBeGreaterThan(0.95 * peak);
    expect(median).toBeLessThan(1.3 * peak);
  });

  it('repeats a seed and draws new phases for a new seed', () => {
    const first = SeaState.fromSpectrum(swell, 42).components;
    const again = SeaState.fromSpectrum(swell, 42).components;
    const other = SeaState.fromSpectrum(swell, 43).components;
    expect(again).toEqual(first);
    expect(other.map((component) => component.phase)).not.toEqual(first.map((component) => component.phase));
  });

  it('keeps directions shoreward and narrows them with higher spreading', () => {
    const broad = SeaState.fromSpectrum({ ...swell, spreading: 2, componentCount: 64, direction: 0.3 }, 5).components;
    const narrow = SeaState.fromSpectrum({ ...swell, spreading: 40, componentCount: 64, direction: 0.3 }, 5).components;
    for (const component of [...broad, ...narrow]) {
      expect(Math.abs(component.direction - 0.3)).toBeLessThanOrEqual(Math.PI / 2 + 1e-12);
    }
    const narrowDirections = narrow.map((component) => component.direction);
    expect(spread(broad.map((component) => component.direction))).toBeGreaterThan(2 * spread(narrowDirections));
    expect(narrowDirections.reduce((sum, value) => sum + value, 0) / narrowDirections.length).toBeCloseTo(0.3, 1);
  });

  it('resolves each component wavenumber from the reference depth', () => {
    const sea = new SeaState([{ amplitude: 0.5, omega: (2 * Math.PI) / 8, direction: Math.PI / 6, phase: 0 }], 4);
    const [component] = sea.components;
    expect((2 * Math.PI) / component.k).toBeCloseTo(48.0, 1);
    expect(component.kx).toBeCloseTo(component.k * 0.5, 12);
    expect(component.kz).toBeCloseTo(component.k * Math.cos(Math.PI / 6), 12);
  });
});
