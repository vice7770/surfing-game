import { Color, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  OPAQUE, SPOT_OPTICS, WATER_F0, WATER_IOR, applyOptics, applySun, beamAttenuation, createOpticsUniforms, crestThickness,
  deepReflectance, refractedCosine, schlickFresnel, shallowReflectance, transmittance, waterOpticsPars, type WaterOptics,
} from './waterOptics';

const pure: WaterOptics = { turbidity: 0, bedAlbedo: [0.4, 0.35, 0.25] };

describe('water optics', () => {
  it('reflects 2 % at normal incidence and everything at grazing (Schlick, n = 1.333)', () => {
    expect(WATER_F0).toBeCloseTo(0.0204, 4);
    expect(schlickFresnel(1)).toBeCloseTo(WATER_F0, 12);
    expect(schlickFresnel(0)).toBe(1);
    expect(schlickFresnel(0.2)).toBeGreaterThan(schlickFresnel(0.6));
  });

  // Plan §2.3: through 1 m of water red transmits 71 %, green 94 % and blue 99 %.
  it('absorbs red first: 1 m of pure water keeps 71 %, 94 % and 99 %', () => {
    const [r, g, b] = transmittance(pure, 1);
    expect(r).toBeCloseTo(0.71, 2);
    expect(g).toBeCloseTo(0.945, 3);
    expect(b).toBeCloseTo(0.991, 3);
    expect(beamAttenuation({ ...pure, turbidity: 0.5 })[1]).toBeCloseTo(0.0565 + 0.5, 12);
  });

  it('makes deep clear water blue, and turbidity brightens it', () => {
    const [r, g, b] = deepReflectance(pure);
    expect(b).toBeGreaterThan(5 * g);
    expect(g).toBeGreaterThan(5 * r);
    expect(b).toBeCloseTo((0.33 * 0.00229) / (0.00922 + 0.00229), 3);
    expect(deepReflectance({ ...pure, turbidity: 0.3 })[1]).toBeGreaterThan(g);
  });

  it('refracts toward the normal, so paths under water stay within 1.5× the depth', () => {
    expect(refractedCosine(1)).toBe(1);
    expect(refractedCosine(0)).toBeCloseTo(Math.sqrt(1 - 1 / 1.333 ** 2), 12);
    expect(1 / refractedCosine(0)).toBeLessThan(1.52);
  });

  it('shows a shallow sandbar as turquoise and a deep channel as the deep-water colour', () => {
    const beach = SPOT_OPTICS.beach;
    const bar = shallowReflectance(beach, 1.5, 1, 0.8);
    const channel = shallowReflectance(beach, 12, 1, 0.8);
    const deep = deepReflectance(beach);
    for (let i = 0; i < 3; i += 1) expect(channel[i]).toBeCloseTo(deep[i], 2);
    expect(bar[1]).toBeGreaterThan(3 * channel[1]);
    // Red dies first on the way down and back, so the bar is greener than its sand.
    expect(bar[1] / bar[0]).toBeGreaterThan(beach.bedAlbedo[1] / beach.bedAlbedo[0]);
    let previous = Infinity;
    for (let depth = 0; depth <= 20; depth += 0.5) {
      const green = shallowReflectance(beach, depth, 1, 0.8)[1];
      expect(green).toBeLessThanOrEqual(previous);
      previous = green;
    }
    expect(shallowReflectance(beach, 0, 1, 1)).toEqual([...beach.bedAlbedo]);
  });

  it('hides the bed sooner in turbid water', () => {
    const contrast = (optics: WaterOptics) => shallowReflectance(optics, 3, 1, 1)[1] - deepReflectance(optics)[1];
    expect(contrast(SPOT_OPTICS.reef)).toBeGreaterThan(contrast(SPOT_OPTICS.beach));
  });

  it('measures the thickness a refracted ray crosses before leaving the back of a crest', () => {
    const ridge = (_x: number, z: number) => 1.5 * Math.exp(-((z / 0.8) ** 2));
    const z0 = -0.5;
    const origin = { x: 0, y: ridge(0, z0), z: z0 };
    const direction = { x: 0, y: -0.25, z: 0.97 };
    let exit = 0;
    while (ridge(0, origin.z + direction.z * (exit + 1e-3)) > origin.y + direction.y * (exit + 1e-3)) exit += 1e-3;
    expect(exit).toBeCloseTo(1.23, 1);
    // Four samples (0.5, 1, 2, 4 m) find the back face to within a fraction of a step.
    expect(Math.abs(crestThickness(ridge, origin, direction) - exit)).toBeLessThan(0.2);
    expect(crestThickness(() => 0, { x: 0, y: 0, z: 0 }, { x: 0, y: -0.5, z: 0.87 })).toBe(OPAQUE);
  });

  it('feeds the shader uniforms from the same model', () => {
    const uniforms = createOpticsUniforms();
    applyOptics(uniforms, SPOT_OPTICS.reef);
    const vector = (name: string) => (uniforms[name].value as Vector3).toArray();
    expect(vector('waterAttenuation')).toEqual([...beamAttenuation(SPOT_OPTICS.reef)]);
    expect(vector('waterDeepReflectance')).toEqual([...deepReflectance(SPOT_OPTICS.reef)]);
    expect(vector('waterBedAlbedo')).toEqual([...SPOT_OPTICS.reef.bedAlbedo]);
    applySun(uniforms, new Vector3(0, 3, -4), new Color(2, 1.5, 1));
    vector('waterSunDirection').forEach((value, i) => expect(value).toBeCloseTo([0, 0.6, -0.8][i], 12));
    expect((uniforms.waterSunRadiance.value as Color).toArray()).toEqual([2, 1.5, 1]);
    expect(waterOpticsPars).toContain(`${WATER_IOR}`);
    expect(waterOpticsPars).toContain(WATER_F0.toFixed(6));
  });
});
