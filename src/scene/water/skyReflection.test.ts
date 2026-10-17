import { ShaderChunk } from 'three';
import { describe, expect, it } from 'vitest';
import { WATER_F0, schlickFresnel } from '../waterOptics';
import {
  BELOW_HORIZON_FOLD,
  CHOP_MEAN_SQUARE_SLOPE,
  fadedChopVariance,
  fresnelCosine,
  richSkyReflection,
  skyFresnelTerms,
  skyMirrorShare,
  skyReflectionRay,
  skyRoughness,
} from './skyReflection';

const unit = (x: number, y: number, z: number) => {
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
};
const up = { x: 0, y: 1, z: 0 };

describe('the Rich water’s mirror of the sky', () => {
  it('counts the analytic chop’s six waves of steepness 2π·0.012', () => {
    expect(CHOP_MEAN_SQUARE_SLOPE).toBeCloseTo(0.017055, 6);
  });

  it('keeps the chop’s slopes as roughness as they fade out with distance', () => {
    expect(fadedChopVariance(0.25, 0)).toBe(0);
    expect(fadedChopVariance(0.25, 80)).toBeCloseTo(0.0625 * CHOP_MEAN_SQUARE_SLOPE * (1 - Math.exp(-2)), 12);
    expect(fadedChopVariance(0.25, 5000)).toBeCloseTo(0.0625 * CHOP_MEAN_SQUARE_SLOPE, 9);
    expect(fadedChopVariance(0, 5000)).toBe(0);
  });

  it('blurs the sky by the material’s gloss and the spread it adds, never past 1', () => {
    expect(skyRoughness(0.2, 0)).toBeCloseTo(0.2, 12);
    expect(skyRoughness(0.2, 0.01)).toBeGreaterThan(0.2);
    expect(skyRoughness(0.2, 0.01)).toBeCloseTo((0.2 ** 4 + 0.02) ** 0.25, 12);
    expect(skyRoughness(0.2, 10)).toBe(1);
    expect(skyRoughness(0.2, -1)).toBeCloseTo(0.2, 12);
  });

  it('mirrors the view on still, glassy water', () => {
    expect(skyReflectionRay(up, up, 0).y).toBeCloseTo(1, 9);
    const view = unit(0.6, 0.3, -0.2);
    const ray = skyReflectionRay(view, up, 0);
    expect(ray.x).toBeCloseTo(-view.x, 6);
    expect(ray.y).toBeCloseTo(view.y, 6);
    expect(ray.z).toBeCloseTo(-view.z, 6);
  });

  it('leans a rough sea’s facets toward a grazing viewer, so it sees higher sky, and not a steep one’s', () => {
    const grazing = unit(0, 0.03, 1);
    expect(skyReflectionRay(grazing, up, 0.03).y).toBeGreaterThan(skyReflectionRay(grazing, up, 0).y + 0.01);
    const steep = unit(0, 1, 0.3);
    expect(skyReflectionRay(steep, up, 0.03).y).toBeCloseTo(skyReflectionRay(steep, up, 0).y, 6);
  });

  it('folds a ray reflected below the horizon back above it, at BELOW_HORIZON_FOLD of its depth', () => {
    // A facet leaning away from the viewer sends a grazing view's reflection down into the sea.
    const view = unit(0, 0.05, 1);
    const away = unit(0, 1, -0.2);
    const plain = (() => {
      const d = view.x * away.x + view.y * away.y + view.z * away.z;
      return unit(2 * d * away.x - view.x, 2 * d * away.y - view.y, 2 * d * away.z - view.z);
    })();
    expect(plain.y).toBeLessThan(0);
    const ray = skyReflectionRay(view, away, 0);
    expect(ray.y).toBeGreaterThan(0);
    const expected = unit(plain.x, -plain.y * BELOW_HORIZON_FOLD, plain.z);
    expect(ray.y).toBeCloseTo(expected.y, 6);
  });

  it('takes the Fresnel cosine against a normal blended toward up', () => {
    const view = unit(0, 0.05, 1);
    expect(fresnelCosine(view, up)).toBeCloseTo(view.y, 9);
    // A facet facing the grazing viewer would read as a steep view (little reflection); blended, it reads more grazing.
    const facing = unit(0, 1, 0.3);
    const own = view.x * facing.x + view.y * facing.y + view.z * facing.z;
    expect(fresnelCosine(view, facing)).toBeLessThan(own);
    expect(fresnelCosine(view, facing)).toBeGreaterThan(view.y);
  });

  it('gives three’s split sum Schlick’s Fresnel for water, with nothing left to multiple scattering', () => {
    for (const c of [0, 0.02, 0.1, 0.5, 1]) {
      const [scale, bias] = skyFresnelTerms(c);
      expect(scale + bias).toBeCloseTo(1, 12);
      expect(WATER_F0 * scale + bias).toBeCloseTo(schlickFresnel(c), 12);
    }
    // A grazing view mirrors most of the sky; a steep one, 2 %.
    expect(WATER_F0 * skyFresnelTerms(0.02)[0] + skyFresnelTerms(0.02)[1]).toBeGreaterThan(0.9);
    expect(WATER_F0 * skyFresnelTerms(1)[0] + skyFresnelTerms(1)[1]).toBeCloseTo(WATER_F0, 12);
  });

  it('keeps the Rich mirror balance on views down into the water and gives way to the whole sky at grazing', () => {
    const share = (cosine: number) => skyMirrorShare(0.5, skyFresnelTerms(cosine)[1]);
    expect(share(1)).toBe(0.5);
    expect(share(Math.cos((45 * Math.PI) / 180))).toBeLessThan(0.505);
    expect(share(Math.sin((8 * Math.PI) / 180))).toBeCloseTo(0.75, 1);
    expect(share(Math.sin((1 * Math.PI) / 180))).toBeGreaterThan(0.9);
    expect(share(0)).toBe(1);
    // At grazing it mirrors the sky the player sees: the environment scaled to the background's horizon.
    expect(skyMirrorShare(0.5, 1, 0.37)).toBeCloseTo(0.37, 12);
    expect(skyMirrorShare(0.5, 0, 0.37)).toBe(0.5);
  });

  it('builds on three’s own chunk, swapping its one sky lookup on the upper side only', () => {
    const chunk = richSkyReflection();
    expect(ShaderChunk.lights_fragment_maps.length).toBeGreaterThan(0);
    expect(chunk).toContain('waterSkyRadiance( geometryNormal, material.roughness, faceDirection )');
    expect(chunk).toContain('radiance *= mix( waterReflection, waterSkyGain, waterSkyDfg.y );');
    expect(chunk).toContain('material.dfg = waterSkyDfg;');
    // Beneath, the Rich balance as before.
    expect(chunk).toContain('} else {\n    radiance *= waterReflection;');
  });
});
