import { describe, expect, it } from 'vitest';
import {
  FOAM_CELL, FOAM_FLOW_PERIOD, FOAM_TILE, FOAM_TILE_TEXELS, foamCover, foamCoverage, foamDistance, foamPatternPars, foamTileData,
  foamTileTexture, sampleFoamTile,
} from './foamPattern';

/** Mean still-water coverage over a 150 × 150 m area away from where the thresholds were measured. */
function meanCoverage(foam: number): number {
  let sum = 0;
  let count = 0;
  for (let z = 500; z < 650; z += 0.23) {
    for (let x = -300; x < -150; x += 0.23) {
      sum += foamCover(x, z, 0, 0, foam, 0.7);
      count += 1;
    }
  }
  return sum / count;
}

describe('foam pattern', () => {
  // Patches modulate the local foam value by 1 + (2v − 1)(1 − F): mean 1, and never above 1.
  it('covers the fraction of the surface the foam value says, in patches', () => {
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
    // Still water keeps one static network: no flow-map pulsing.
    for (const time of [0.3, 1.1, 3.7]) {
      expect(foamCover(1, 2, 0, 0, 0.5, time)).toBeCloseTo(foamCover(1, 2, 0, 0, 0.5, 0.9), 12);
    }
  });

  it('fades the network to its mean where a pixel covers more than a cell, so distant foam does not shimmer', () => {
    expect(foamCover(3.1, 4.2, 0.5, 0, 0.4, 1.2, 10 * FOAM_CELL)).toBe(0.4);
    expect(foamCover(3.1, 4.2, 0.5, 0, 0.4, 1.2, 0)).toBe(foamCover(3.1, 4.2, 0.5, 0, 0.4, 1.2));
    const near = foamCover(3.1, 4.2, 0.5, 0, 0.4, 1.2, 0.1 * FOAM_CELL);
    expect(near).toBe(foamCover(3.1, 4.2, 0.5, 0, 0.4, 1.2));
  });

  // The shader reads the network from a tiling texture instead of hashing nine cells per phase.
  it('bakes the network into a seamless tile that matches the exact distances', () => {
    const tile = foamTileData();
    expect(tile.length).toBe(FOAM_TILE_TEXELS * FOAM_TILE_TEXELS * 2);
    let error = 0;
    let samples = 0;
    for (let z = 0.013; z < 20; z += 0.31) {
      for (let x = 0.017; x < 20; x += 0.29) {
        error += Math.abs(sampleFoamTile(x, z) - foamDistance(x, z));
        samples += 1;
      }
    }
    expect(error / samples).toBeLessThan(0.02);
    expect(foamDistance(3.3, 4.4)).toBeCloseTo(foamDistance(3.3 + FOAM_TILE, 4.4 - FOAM_TILE), 12);
    expect(sampleFoamTile(3.3, 4.4)).toBeCloseTo(sampleFoamTile(3.3 + FOAM_TILE, 4.4 - 2 * FOAM_TILE), 9);
    const texture = foamTileTexture();
    expect(texture).toBe(foamTileTexture());
    expect(texture.image.width).toBe(FOAM_TILE_TEXELS);
  });

  it('writes the same pattern into GLSL', () => {
    expect(foamPatternPars).toContain('float waterFoamCover( vec2 p, vec2 flow, float foam, float time, float footprint )');
    expect(foamPatternPars).toContain('uniform sampler2D waterFoamTile;');
    expect(foamPatternPars).toContain(`${FOAM_CELL.toFixed(3)}`);
  });
});
