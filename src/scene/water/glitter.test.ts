import { describe, expect, it } from 'vitest';
import { RICH_BASE_ROUGHNESS } from './specular';
import {
  GLITTER_BASE_VARIANCE, GLITTER_FOAM_VARIANCE, GLITTER_UNRESOLVED, RICH_GLITTER_RIPPLES, RICH_SUN_GLITTER, RICH_SUN_LITE_LIGHTS,
  SCREEN_VARIANCE_CAP, SUN_DISC_VARIANCE, beckmann, glitter, glitterDistribution, glitterMode, glitterProgramKey, glitterUniforms,
  liteSunAlpha2, onGlitterChange, richGlitterLights, screenCovariance, setGlitter, setGlitterForGraphics, slopeDensity, smithLambda,
  sunGlitter, unresolvedVariance, waterGlitterPars, type Covariance, type Vec3,
} from './glitter';
import { RICH_CHOP_STATS, analyticChopCovariance, chopCovariance, chopCovarianceGlsl } from '../waterChop';

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

  it('adds the water\'s unresolved slopes, growing with distance toward the far sheen; a sheet takes none', () => {
    expect(unresolvedVariance(0)).toBeCloseTo(GLITTER_UNRESOLVED.constant, 12);
    expect(unresolvedVariance(30)).toBeCloseTo(GLITTER_UNRESOLVED.constant, 12);
    expect(unresolvedVariance(500)).toBeCloseTo(GLITTER_UNRESOLVED.constant + GLITTER_UNRESOLVED.far, 12);
    let last = 0;
    for (const distance of [0, 50, 100, 200, 400, 800]) {
      expect(unresolvedVariance(distance)).toBeGreaterThanOrEqual(last);
      last = unresolvedVariance(distance);
    }
    expect(glitterUniforms.waterGlitterUnresolved.value.toArray()).toEqual([GLITTER_UNRESOLVED.constant, GLITTER_UNRESOLVED.far]);
    expect(RICH_SUN_GLITTER).toContain('waterGlitterUnresolved.y * smoothstep( 30.0, 500.0, glitterDistance )');
    expect(richGlitterLights(true)).not.toContain('waterGlitterUnresolved');
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
    // The water's sun takes its lobe lit once per pixel; a sheet lights it per light about its own normal.
    expect(richGlitterLights(false)).toContain('float lobe = waterGlitterSun;');
    expect(richGlitterLights(false)).toContain('#define WATER_SUN_GLITTER');
    expect(richGlitterLights(true)).toContain('vec3 up = geometryNormal;');
    expect(richGlitterLights(true)).not.toContain('WATER_SUN_GLITTER');
    expect(RICH_SUN_GLITTER).toContain('waterGlitterSun = faceDirection > 0.0 && waterN.y > 0.02');
    expect(RICH_SUN_GLITTER).toContain(chopCovarianceGlsl('glitterDistance'));
    expect(RICH_GLITTER_RIPPLES).toContain('waterGlitterRipple = waterRippleCov.xy;');
  });

  it('lights the sun\'s lobe once per pixel with the same maths as the per-light lobe, in the world\'s frame', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let compared = 0;
    for (let k = 0; k < 400; k += 1) {
      const n = normalOf(0.8 * (random() - 0.5), 0.8 * (random() - 0.5));
      const v = unit([random() - 0.5, 0.05 + random(), random() - 0.5]);
      const l = unit([random() - 0.5, 0.02 + random(), random() - 0.5]);
      const xx = 0.002 + 0.03 * random();
      const zz = 0.002 + 0.03 * random();
      const covariance: Covariance = [xx, zz, 0.9 * (2 * random() - 1) * Math.sqrt(xx * zz)];
      const mean: [number, number] = [-n[0] / n[1], -n[2] / n[1]];
      const expected = glitter(l, v, n, UP, X, Z, mean, covariance);
      const got = sunGlitter(l, v, n, covariance);
      expect(got).toBeCloseTo(expected, 6);
      if (expected > 1e-3) {
        expect(got / expected).toBeCloseTo(1, 6);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(20);
    // Below the water, or with the sun behind the face, nothing.
    expect(sunGlitter([0, 1, 0], [0, -1, 0], UP, [0.01, 0.01, 0])).toBe(0);
    expect(sunGlitter([0, -0.2, 1], [0, 1, 0], UP, [0.01, 0.01, 0])).toBe(0);
  });

  it('runs with the rich sea, compiles again when its mode changes, and leaves three\'s lighting where it is off', () => {
    const was = { ...glitterMode };
    let told = 0;
    const stop = onGlitterChange(() => { told += 1; });
    try {
      setGlitterForGraphics(true);
      expect(glitterProgramKey()).toBe('');
      setGlitterForGraphics(true);
      expect(told).toBe(0);
      // Without the rich sea (Medium), the water's lite road; sheets keep three's lighting.
      setGlitterForGraphics(false);
      expect(told).toBe(1);
      expect(glitterProgramKey()).toBe('-glitter-lite');
      expect(richGlitterLights(false)).toBe(RICH_SUN_LITE_LIGHTS);
      expect(richGlitterLights(true)).toBe('#include <lights_physical_pars_fragment>');
      // Off (`?glitter=off`): three's lighting everywhere, today's Medium.
      setGlitter({ lite: false });
      expect(told).toBe(2);
      expect(glitterProgramKey()).toBe('-no-glitter');
      expect(richGlitterLights(false)).toBe('#include <lights_physical_pars_fragment>');
      expect(richGlitterLights(true)).toBe('#include <lights_physical_pars_fragment>');
      setGlitter({ on: true, lite: true, screen: false });
      expect(told).toBe(3);
      expect(richGlitterLights(false)).not.toContain('WATER_GLITTER_SCREEN');
      expect(richGlitterLights(false)).toContain('WATER_GLITTER_RIPPLES');
    } finally {
      stop();
      setGlitter(was);
    }
  });

  it('takes the chop\'s spread by distance: none drawn near, the whole patch\'s far off', () => {
    const whole = analyticChopCovariance();
    // Six waves of k·a = 2π·0.012, each (ka)²/2 along its direction (the table's directions are unit to 3 digits).
    expect(whole[0] + whole[1]).toBeCloseTo(6 * 0.5 * (2 * Math.PI * 0.012) ** 2, 4);
    expect(whole[0] * whole[1] - whole[2] * whole[2]).toBeGreaterThan(0);
    expect(chopCovariance(0, 0.25, whole)).toEqual([0, 0, 0]);
    const far = chopCovariance(2000, 0.25, whole);
    far.forEach((value, i) => expect(value).toBeCloseTo(0.0625 * whole[i], 12));
    const near = chopCovariance(40, 0.25, whole);
    expect(near[0]).toBeCloseTo(0.0625 * (1 - Math.exp(-1)) * whole[0], 12);
    expect(chopCovarianceGlsl('d')).toContain('( 1.0 - exp( -d / 40.0 ) )');
    expect(chopCovarianceGlsl('d')).toContain(whole[0].toExponential(6));
    // With the glitter off (Medium), the chop's plain slope, as before the glitter.
    expect(RICH_CHOP_STATS).toContain('#ifdef WATER_GLITTER');
    expect(RICH_CHOP_STATS).toContain('waterChopStats( vWaterWorld.xz, waterTime, vec2( 0.0 ), vec2( 0.0 ), waterChopMean, waterChopSpread );');
    expect(RICH_CHOP_STATS).not.toContain('waterChopSlope');
  });

  it('draws Medium\'s lite road as a Beckmann lobe: the isotropic Gaussian of slopes about the drawn normal', () => {
    let seed = 11;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 200; k += 1) {
      const n = normalOf(0.8 * (random() - 0.5), 0.8 * (random() - 0.5));
      const tx = unit([n[1], -n[0], 0]);
      const tz: Vec3 = [n[1] * tx[2] - n[2] * tx[1], n[2] * tx[0] - n[0] * tx[2], n[0] * tx[1] - n[1] * tx[0]];
      const h = unit([n[0] + 0.3 * (random() - 0.5), n[1], n[2] + 0.3 * (random() - 0.5)]);
      const alpha2 = 0.002 + 0.03 * random();
      const cosine = h[0] * n[0] + h[1] * n[1] + h[2] * n[2];
      const gaussian = glitterDistribution(h, n, tx, tz, [0, 0], [alpha2 / 2, alpha2 / 2, 0]);
      expect(beckmann(alpha2, cosine) / gaussian).toBeCloseTo(1, 6);
    }
  });

  it('gives the lite road the glitter\'s spread without its screen-space term, made isotropic', () => {
    const whole = analyticChopCovariance();
    for (const [distance, cover, xx, zz] of [[5, 0, 0.001, 0.0005], [80, 0.3, 0.0002, 0.0004], [600, 0, 0, 0]]) {
      const chop = chopCovariance(distance, 0.25, whole);
      // The glitter's covariance (RICH_SUN_GLITTER, no screen-space term): its two axes' mean, times 2, is the lite α².
      const covXX = GLITTER_BASE_VARIANCE + SUN_DISC_VARIANCE + cover * GLITTER_FOAM_VARIANCE + unresolvedVariance(distance) + xx + chop[0];
      const covZZ = GLITTER_BASE_VARIANCE + SUN_DISC_VARIANCE + cover * GLITTER_FOAM_VARIANCE + unresolvedVariance(distance) + zz + chop[1];
      expect(liteSunAlpha2(distance, cover, xx + zz, 0.25, whole)).toBeCloseTo(covXX + covZZ, 12);
    }
    // Wider than the gloss three's GGX drew on Medium (α² of roughness 0.08), and growing with distance.
    expect(liteSunAlpha2(0, 0, 0, 0.25, whole)).toBeGreaterThan(50 * RICH_BASE_ROUGHNESS ** 4);
    expect(liteSunAlpha2(500, 0, 0, 0.25, whole)).toBeGreaterThan(2 * liteSunAlpha2(20, 0, 0, 0.25, whole));
  });

  it('writes the lite road\'s GLSL as its CPU twins, with no branch, the fill keeping its material\'s spread', () => {
    expect(RICH_SUN_GLITTER).toContain('#ifdef WATER_SUN_LITE');
    expect(RICH_SUN_GLITTER).toContain(`vec3 liteChop = ${chopCovarianceGlsl('liteDistance')};`);
    expect(RICH_SUN_GLITTER).toContain('waterGlitterUnresolved.y * smoothstep( 30.0, 500.0, liteDistance )');
    expect(waterGlitterPars).toContain('float waterGlitterLite = 0.0;');
    expect(RICH_SUN_LITE_LIGHTS.startsWith('#include <lights_physical_pars_fragment>\n#define WATER_SUN_LITE')).toBe(true);
    expect(RICH_SUN_LITE_LIGHTS).toContain('#define RE_Direct RE_Direct_WaterLite');
    expect(RICH_SUN_LITE_LIGHTS).toContain('mix( pow4( material.roughness ), waterGlitterLite, step( 0.9999,');
    expect(RICH_SUN_LITE_LIGHTS).toContain('exp( ( c2 - 1.0 ) / ( alpha2 * c2 ) ) / ( PI * alpha2 * c2 * c2 )');
    expect(RICH_SUN_LITE_LIGHTS).not.toMatch(/\bif\s*\(|\?|RE_Direct_Physical\(|WATER_SUN_GLITTER|D_GGX/);
    // The glitter's own programs never define the lite road.
    const was = { ...glitterMode };
    try {
      setGlitter({ on: true });
      expect(richGlitterLights(false)).not.toContain('WATER_SUN_LITE');
      expect(richGlitterLights(true)).not.toContain('WATER_SUN_LITE');
    } finally {
      setGlitter(was);
    }
  });
});
