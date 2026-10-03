import { describe, expect, it } from 'vitest';
import {
  FOAM_ALBEDO, FOAM_CELL, FOAM_FLOW_PERIOD, FOAM_TILE, FOAM_TILE_TEXELS, foamAge, foamCover, foamCoverage, foamDistance, foamOverWater,
  foamPatternPars, foamReflectance, foamTileData, foamTileTexture, sampleFoamTile, unfocusedWater,
} from './foamPattern';
import { SPOT_OPTICS, shallowReflectance } from './waterOptics';

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

describe('Rich foam as a layer that adds light', () => {
  it('never darkens the water it covers, and shows its own reflectance over black water', () => {
    for (const water of [0, 0.02, 0.1, 0.3, 0.6, 0.9, 1]) {
      expect(foamOverWater(0, water)).toBeCloseTo(water, 12);
      let previous = water;
      for (const layer of [0.05, 0.1, 0.25, 0.4, 0.55]) {
        const total = foamOverWater(layer, water);
        expect(total).toBeGreaterThanOrEqual(previous - 1e-12);
        previous = total;
      }
    }
    // The layer alone over a black bed, and over a perfectly reflecting one, which has nothing to add to.
    expect(foamOverWater(FOAM_ALBEDO.fresh, 0)).toBeCloseTo(0.55, 12);
    expect(foamOverWater(FOAM_ALBEDO.fresh, 1)).toBeCloseTo(1, 12);
  });

  it('is the adding formula wherever the water is not focused, whatever share of the pixel it covers', () => {
    for (const water of [0, 0.05, 0.3, 0.8, 1]) {
      for (const layer of [0, 0.1, 0.25, 0.55]) {
        const adding = layer + ((1 - layer) ** 2 * water) / (1 - layer * water);
        for (const cover of [layer, 0.6, 1]) expect(foamOverWater(layer, water, cover, water)).toBeCloseTo(adding, 12);
      }
    }
  });

  it('puts out the caustics’ focus under foam, and stays finite where it was focused 16 times, the caustic map’s peak', () => {
    // The Reef's sand under a metre of clear water, the sun focused on it: the lit water's reflectance passes 1.
    const { bedAlbedo } = SPOT_OPTICS.reef;
    const deep = 0.002;
    for (const focus of [1, 2, 4, 8, 16]) {
      const lit = deep + bedAlbedo[0] * 0.9 * focus;
      const unfocused = unfocusedWater(lit, deep, bedAlbedo[0]);
      expect(unfocused).toBeLessThanOrEqual(Math.max(deep, bedAlbedo[0]));
      // No foam: the water as lit, focus and all.
      expect(foamOverWater(0, lit, 0, unfocused)).toBeCloseTo(lit, 12);
      for (const cover of [0.05, 0.3, 0.7, 1]) {
        for (const reflectance of [FOAM_ALBEDO.streak, FOAM_ALBEDO.lace, FOAM_ALBEDO.fresh]) {
          const layer = cover * reflectance;
          const total = foamOverWater(layer, lit, cover, unfocused);
          expect(Number.isFinite(total)).toBe(true);
          expect(total).toBeGreaterThanOrEqual(layer);
          // Never brighter than the brighter of the focused water and a white sheet: no blow-up where the focus is strong.
          expect(total).toBeLessThanOrEqual(Math.max(lit, 1) + 1e-9);
        }
      }
      // Fresh foam over the whole pixel shows no focus at all: the same as over the unfocused water.
      expect(foamOverWater(FOAM_ALBEDO.fresh, lit, 1, unfocused)).toBeCloseTo(foamOverWater(FOAM_ALBEDO.fresh, unfocused), 12);
    }
    // Under unfocused water, nothing is clipped: the bound is the brightest an unfocused column can be.
    expect(unfocusedWater(0.3, 0.02, 0.5)).toBe(0.3);
    expect(unfocusedWater(3.2, 0.02, 0.5)).toBe(0.5);
  });

  it('is sourced at fresh 0.55, lace 0.25 and a monolayer streak 0.10, dimming as the foam ages', () => {
    expect(FOAM_ALBEDO).toEqual({ fresh: 0.55, lace: 0.25, streak: 0.1 });
    expect(foamReflectance(0)).toBe(0.55);
    expect(foamReflectance(1)).toBeCloseTo(0.25, 12);
    expect(foamReflectance(0.5)).toBeLessThan(foamReflectance(0.25));
    // The saturating fit R(N) = 0.55 (1 − e^(−N/5)) through Koepke's anchors gives 0.10 at one layer and 0.25 at three.
    const fit = (layers: number) => 0.55 * (1 - Math.exp(-layers / 5));
    expect(fit(1)).toBeCloseTo(FOAM_ALBEDO.streak, 1);
    expect(fit(3)).toBeCloseTo(FOAM_ALBEDO.lace, 1);
    expect(fit(25)).toBeCloseTo(FOAM_ALBEDO.fresh, 1);
  });

  it('is fresh while air is in the water or the foam is dense, and lace once both are gone', () => {
    expect(foamAge(1, 0.1)).toBe(0);
    expect(foamAge(0, 1)).toBe(0);
    expect(foamAge(0, 0.2)).toBe(1);
    expect(foamAge(0, 0.7)).toBeGreaterThan(0);
    expect(foamAge(0, 0.7)).toBeLessThan(1);
    expect(foamAge(0.8, 0.7)).toBeLessThan(foamAge(0, 0.7));
  });

  it('flashes at least twice the dark water it covers when fresh, and stays above it as lace and as a veil', () => {
    // Padang Padang's water: clear, over dark coral (the Reef's pale sand leaves foam little headroom).
    const optics = SPOT_OPTICS.padang;
    for (const depth of [1, 2, 4, 8]) {
      const water = shallowReflectance(optics, depth, 0.5, 0.8);
      for (let channel = 0; channel < 3; channel += 1) {
        expect(foamOverWater(foamReflectance(0), water[channel]) / water[channel]).toBeGreaterThan(2);
        expect(foamOverWater(foamReflectance(1), water[channel]) / water[channel]).toBeGreaterThan(1.1);
        expect(foamOverWater(FOAM_ALBEDO.streak, water[channel]) / water[channel]).toBeGreaterThan(1.1);
      }
    }
    // Over the Reef's sand, lace still reads above the water, as foam at the Reef was measured at 0.92 times it.
    const sand = shallowReflectance(SPOT_OPTICS.reef, 0.5, 0.5, 0.8);
    expect(foamOverWater(foamReflectance(1), sand[1]) / sand[1]).toBeGreaterThan(1.1);
  });
});
