import { describe, expect, it } from 'vitest';
import { FOAM_CELL, FOAM_FLOW_PERIOD, foamCover, foamCoverage, foamDistance, foamPatternPars } from './foamPattern';

/** Mean coverage over a 60 × 60 m patch away from where the thresholds were measured. */
function meanCoverage(foam: number): number {
  let sum = 0;
  let count = 0;
  for (let z = 500; z < 560; z += 0.13) {
    for (let x = -300; x < -240; x += 0.13) {
      sum += foamCoverage(foam, foamDistance(x / FOAM_CELL, z / FOAM_CELL));
      count += 1;
    }
  }
  return sum / count;
}

describe('foam pattern', () => {
  it('covers the fraction of the surface the foam value says', () => {
    for (const foam of [0.1, 0.2, 0.5, 0.8, 0.95]) expect(Math.abs(meanCoverage(foam) - foam)).toBeLessThan(0.05);
    expect(meanCoverage(0)).toBe(0);
    expect(meanCoverage(1)).toBeGreaterThan(0.98);
  });

  it('grows the network smoothly as foam builds', () => {
    let previous = -1;
    for (let foam = 0; foam <= 1.0001; foam += 0.05) {
      const coverage = foamCoverage(foam, foamDistance(12.34, 56.78));
      expect(coverage).toBeGreaterThanOrEqual(previous);
      previous = coverage;
    }
  });

  it('carries the network along with the current', () => {
    const flow = { x: 0.8, z: -0.3 };
    // Phase A carries full weight at mid-period; a short step later the pattern has moved with the flow.
    const t0 = FOAM_FLOW_PERIOD / 2;
    const dt = 0.01;
    let moved = 0;
    let still = 0;
    let samples = 0;
    for (let z = 0; z < 6; z += 0.17) {
      for (let x = 0; x < 6; x += 0.17) {
        const now = foamCover(x, z, flow.x, flow.z, 0.5, t0);
        moved += Math.abs(foamCover(x + flow.x * dt, z + flow.z * dt, flow.x, flow.z, 0.5, t0 + dt) - now);
        still += Math.abs(foamCover(x + 0.3, z, flow.x, flow.z, 0.5, t0 + dt) - now);
        samples += 1;
      }
    }
    expect(moved / samples).toBeLessThan(0.03);
    expect(still / samples).toBeGreaterThan(0.1);
    expect(foamCover(1, 2, 0, 0, 0.5, 3.7)).toBeCloseTo(foamCoverage(0.5, foamDistance(1 / FOAM_CELL, 2 / FOAM_CELL)), 12);
  });

  it('writes the same pattern into GLSL', () => {
    expect(foamPatternPars).toContain('float waterFoamCover( vec2 p, vec2 flow, float foam, float time )');
    expect(foamPatternPars).toContain('1664525u');
    expect(foamPatternPars).toContain(`${FOAM_CELL.toFixed(3)}`);
  });
});
