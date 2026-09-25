import { describe, expect, it } from 'vitest';
import { SeaState, jonswapShape, type SpectrumParams } from './SeaState';
import { waveKinematics } from './dispersion';

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

describe('SeaState linear sampler', () => {
  it('moves a single component at the Airy phase speed', () => {
    const sea = new SeaState([{ amplitude: 0.5, omega: (2 * Math.PI) / 8, direction: 0, phase: 0.3 }], 4);
    const speed = waveKinematics(8, 4).phaseSpeed;
    expect(sea.elevation(1.2, 5 + speed * 3.7, 3.7)).toBeCloseTo(sea.elevation(1.2, 5, 0), 9);
    expect(sea.elevation(0, 0, 0)).toBeCloseTo(0.5 * Math.cos(0.3), 12);
  });

  it('satisfies linear continuity between elevation and depth-averaged flow', () => {
    const depth = 6;
    const sea = SeaState.fromSpectrum({ ...swell, depth, direction: 0.2 }, 9);
    const epsilon = 1e-3;
    for (const [x, z, t] of [[1.3, -4.2, 2.5], [-7, 11, 9.1], [3.3, 0.4, 17]]) {
      const etaRate = (sea.elevation(x, z, t + epsilon) - sea.elevation(x, z, t - epsilon)) / (2 * epsilon);
      const divergence = (sea.depthAveragedVelocity(x + epsilon, z, t).x - sea.depthAveragedVelocity(x - epsilon, z, t).x) / (2 * epsilon)
        + (sea.depthAveragedVelocity(x, z + epsilon, t).z - sea.depthAveragedVelocity(x, z - epsilon, t).z) / (2 * epsilon);
      expect(Math.abs(etaRate + depth * divergence)).toBeLessThan(1e-6);
    }
  });

  it('reports no depth-averaged flow for deep water', () => {
    const sea = new SeaState([{ amplitude: 0.5, omega: 1, direction: 0, phase: 0 }], Infinity);
    expect(sea.depthAveragedVelocity(0, 0, 0)).toEqual({ x: 0, z: 0 });
  });
});

describe('SeaState sets', () => {
  it('spaces two-component sets by the Munk beat period', () => {
    const periods = [12.5, 13];
    const sea = new SeaState(periods.map((period) => ({
      amplitude: 0.5, omega: (2 * Math.PI) / period, direction: 0, phase: 0,
    })), 30);
    const beat = (periods[0] * periods[1]) / Math.abs(periods[1] - periods[0]);
    const first = sea.nextSetPeak(0, 0, 1, 700);
    const second = sea.nextSetPeak(0, 0, first + 10, 700);
    expect(beat).toBeCloseTo(325, 6);
    expect(first / beat).toBeCloseTo(1, 2);
    expect((second - first) / beat).toBeCloseTo(1, 2);
    expect(sea.envelope(0, 0, first)).toBeCloseTo(1, 3);
  });

  it('finds a large-envelope moment in a spectral sea', () => {
    const sea = SeaState.fromSpectrum({ ...swell, spreading: 24 }, 11);
    const peak = sea.nextSetPeak(0, 0, 20, 300);
    let largest = 0;
    for (let t = 20; t <= 320; t += 0.25) largest = Math.max(largest, sea.envelope(0, 0, t));
    expect(peak).toBeGreaterThanOrEqual(20);
    expect(sea.envelope(0, 0, peak)).toBeGreaterThanOrEqual(0.89 * largest);
  });
});
