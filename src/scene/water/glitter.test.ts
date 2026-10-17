import { describe, expect, it } from 'vitest';
import { RICH_BASE_ROUGHNESS } from './specular';
import {
  GLITTER_BASE_VARIANCE, SCREEN_VARIANCE_CAP, glitter, glitterDistribution, richGlitterLights, screenCovariance, slopeDensity,
  smithLambda, waterGlitterPars, type Covariance, type Vec3,
} from './glitter';

const UP: Vec3 = [0, 1, 0];
const X: Vec3 = [1, 0, 0];
const Z: Vec3 = [0, 0, 1];
const unit = (a: Vec3): Vec3 => {
  const length = Math.hypot(...a);
  return [a[0] / length, a[1] / length, a[2] / length];
};
/** The normal of slope (sx, sz): (−sx, 1, −sz), normalized. */
const normalOf = (sx: number, sz: number) => unit([-sx, 1, -sz]);
const reflectAbout = (v: Vec3, h: Vec3): Vec3 => {
  const d = 2 * (v[0] * h[0] + v[1] * h[1] + v[2] * h[2]);
  return [d * h[0] - v[0], d * h[1] - v[1], d * h[2] - v[2]];
};

/**
 * ∫ glitter(l, v) dω_l, over the light directions, taken in the half-vector's slope space about the lobe's mean:
 * dω_l = 4 (v·h) dω_h and dω_h = h_y³ d²s.
 */
function reflected(v: Vec3, mean: [number, number], covariance: Covariance, masked = true): number {
  const spread = 6 * Math.sqrt(Math.max(covariance[0], covariance[1]));
  const steps = 240;
  const ds = (2 * spread) / steps;
  let sum = 0;
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < steps; j += 1) {
      const sx = mean[0] - spread + (i + 0.5) * ds;
      const sz = mean[1] - spread + (j + 0.5) * ds;
      const h = normalOf(sx, sz);
      const l = reflectAbout(v, h);
      const n = normalOf(mean[0], mean[1]);
      const lobe = masked
        ? glitter(l, v, n, UP, X, Z, mean, covariance)
        : (glitterDistribution(h, UP, X, Z, mean, covariance) * n[1]) / (4 * (v[0] * n[0] + v[1] * n[1] + v[2] * n[2]));
      const vh = v[0] * h[0] + v[1] * h[1] + v[2] * h[2];
      sum += lobe * 4 * vh * h[1] ** 3 * ds * ds;
    }
  }
  return sum;
}

describe('the sun glitter (item 5)', () => {
  it('spreads the facets as a normalized Gaussian of slope: ∫ D (h·up) dω = 1, whatever the mean or the covariance', () => {
    for (const [mean, covariance] of [
      [[0, 0], [0.01, 0.01, 0]],
      [[0.3, -0.2], [0.02, 0.005, 0.004]],
      [[1.1, 0.4], [0.004, 0.012, -0.003]],
    ] as const) {
      const spread = 7 * Math.sqrt(Math.max(covariance[0], covariance[1]));
      const steps = 200;
      const ds = (2 * spread) / steps;
      let sum = 0;
      for (let i = 0; i < steps; i += 1) {
        for (let j = 0; j < steps; j += 1) {
          const h = normalOf(mean[0] - spread + (i + 0.5) * ds, mean[1] - spread + (j + 0.5) * ds);
          // dω_h = h_y³ d²s, so D (h·up) dω_h = p(s) d²s.
          sum += glitterDistribution(h, UP, X, Z, mean, covariance) * h[1] * h[1] ** 3 * ds * ds;
        }
      }
      expect(sum).toBeCloseTo(1, 3);
    }
  });

  it('peaks as three\'s GGX at the Rich base roughness: the floor is that gloss', () => {
    const alpha = RICH_BASE_ROUGHNESS ** 2;
    const peak = glitterDistribution(UP, UP, X, Z, [0, 0], [GLITTER_BASE_VARIANCE, GLITTER_BASE_VARIANCE, 0]);
    expect(peak).toBeCloseTo(1 / (Math.PI * alpha * alpha), 6);
  });

  it('reflects all the light a still surface would, flat or on a tilted face, before masking and Fresnel', () => {
    // A view near the face's own normal, where masking is nil: the lobe's reflected light sums to one.
    for (const [mean, covariance] of [
      [[0, 0], [0.002, 0.002, 0]],
      [[0, 0], [0.006, 0.001, 0.001]],
      [[0.6, 0], [0.002, 0.004, 0]],
      [[-0.4, 0.8], [0.003, 0.003, -0.001]],
    ] as const) {
      const n = normalOf(mean[0], mean[1]);
      const v = unit([n[0] + 0.15, n[1], n[2] - 0.1]);
      expect(reflected(v, [mean[0], mean[1]], covariance, false)).toBeCloseTo(1, 2);
      // Smith's masking only takes light away, and little of it looking down on the face.
      const masked = reflected(v, [mean[0], mean[1]], covariance);
      expect(masked).toBeLessThanOrEqual(1.0001);
      expect(masked).toBeGreaterThan(0.97);
    }
  });

  it('stretches the glint along the axis whose slopes vary most, and tilts it with their correlation', () => {
    const covariance: Covariance = [0.02, 0.002, 0];
    const along = slopeDensity([0.15, 0], covariance);
    const across = slopeDensity([0, 0.15], covariance);
    expect(along).toBeGreaterThan(50 * across);
    const correlated: Covariance = [0.01, 0.01, 0.008];
    expect(slopeDensity([0.1, 0.1], correlated)).toBeGreaterThan(10 * slopeDensity([0.1, -0.1], correlated));
  });

  it('masks nothing looking straight down, more toward grazing, and shadows a face turned from the light', () => {
    const covariance: Covariance = [0.01, 0.01, 0];
    expect(smithLambda(UP, UP, X, Z, covariance)).toBe(0);
    let last = 0;
    for (const elevation of [60, 30, 15, 8, 4, 2]) {
      const radians = (elevation * Math.PI) / 180;
      const lambda = smithLambda([Math.cos(radians), Math.sin(radians), 0], UP, X, Z, covariance);
      expect(lambda).toBeGreaterThanOrEqual(last);
      last = lambda;
    }
    expect(last).toBeGreaterThan(0.5);
    // The sun behind the face lights none of it.
    const n = normalOf(0.8, 0);
    expect(glitter(unit([1, 0.2, 0]), unit([0.3, 1, 0]), n, UP, X, Z, [0.8, 0], covariance)).toBe(0);
  });

  it('caps the screen-space term, keeping its shape', () => {
    const small = screenCovariance([0.01, 0.02], [0.0, 0.01]);
    expect(small[0]).toBeCloseTo(0.5 * 0.0001, 12);
    expect(small[1]).toBeCloseTo(0.5 * 0.0005, 12);
    const edge = screenCovariance([2, 0.5], [1, 0]);
    expect(Math.max(edge[0], edge[1])).toBeCloseTo(SCREEN_VARIANCE_CAP, 12);
    expect(edge[1] / edge[0]).toBeCloseTo((0.25) / 5, 9);
  });

  it('has GLSL twins, and swaps three\'s direct light for the lobe only where it is on', () => {
    expect(waterGlitterPars).toContain('float waterGlitter( vec3 l, vec3 v, vec3 n, vec3 up, vec3 tx, vec3 tz, vec2 mean, vec3 cov )');
    expect(waterGlitterPars).toContain('MIT licence');
    for (const sheet of [false, true]) {
      const lights = richGlitterLights(sheet);
      expect(lights.startsWith('#include <lights_physical_pars_fragment>')).toBe(true);
      expect(lights).toContain('RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );');
      expect(lights).toContain('#define RE_Direct RE_Direct_WaterGlitter');
    }
    expect(richGlitterLights(false)).toContain('vec3 up = viewMatrix[ 1 ].xyz;');
    expect(richGlitterLights(true)).toContain('vec3 up = geometryNormal;');
  });
});
