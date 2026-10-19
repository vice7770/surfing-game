import { Color, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  OPAQUE, PARTICLE_ALBEDO, SPOT_OPTICS, WATER_BODY_GAIN, WATER_F0, WATER_IOR, applyOptics, applySun, beamAttenuation, createOpticsUniforms,
  CREST_STEEPNESS, crestLight, crestMarch, crestShare, crestThickness, deepReflectance, diffuseAttenuation, refractedCosine, schlickFresnel, shallowReflectance, transmittance,
  waterOpticsPars, type WaterOptics,
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
    // Particles scatter b_p and absorb b_p (1 − ω)/ω, so a beam loses b_p/ω on top of the water's own absorption.
    expect(beamAttenuation({ ...pure, turbidity: 0.5 })[1]).toBeCloseTo(0.0565 + 0.5 / PARTICLE_ALBEDO, 12);
  });

  // Maritorena et al. 1994 attenuate the bed's light with the diffuse K ≈ a + b_b (Gordon 1989), not the beam c:
  // forward-scattered light still reaches the bed and the eye.
  it('attenuates diffuse light far less than a beam in turbid water', () => {
    const murky = { ...pure, turbidity: 2 };
    const beam = beamAttenuation(murky);
    const diffuse = diffuseAttenuation(murky);
    for (let i = 0; i < 3; i += 1) {
      expect(diffuse[i]).toBeLessThan(beam[i] / 4);
      expect(diffuse[i]).toBeGreaterThan(beamAttenuation(pure)[i]);
    }
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

  it('measures the water a ray crosses before leaving the back of a crest', () => {
    const ridge = (_x: number, z: number) => 1.5 * Math.exp(-((z / 0.8) ** 2));
    const z0 = -0.5;
    const origin = { x: 0, y: ridge(0, z0), z: z0 };
    const direction = { x: 0, y: -0.25, z: 0.97 };
    let exit = 0;
    while (ridge(0, origin.z + direction.z * (exit + 1e-3)) > origin.y + direction.y * (exit + 1e-3)) exit += 1e-3;
    expect(exit).toBeCloseTo(1.23, 1);
    // Four samples (0.25, 1, 2.5, 6 m) find the back face to within half of the step it falls in.
    expect(Math.abs(crestThickness(ridge, origin, direction) - exit)).toBeLessThan(0.75);
  });

  // The shader marches from a fragment horizontally toward a sun behind the crest.
  it('finds thin water near a crest top, thicker water lower down, and none on flat water or the sunlit back', () => {
    const ridge = (_x: number, z: number) => 1.5 * Math.exp(-((z / 0.8) ** 2));
    const towardSun = { x: 0, y: 0, z: 1 };
    const onFace = (height: number) => ({ x: 0, y: height, z: -0.8 * Math.sqrt(Math.log(1.5 / height)) });
    const nearTop = crestThickness(ridge, onFace(1.3), towardSun);
    const lower = crestThickness(ridge, onFace(0.9), towardSun);
    expect(nearTop).toBeCloseTo(2 * 0.8 * Math.sqrt(Math.log(1.5 / 1.3)), 0);
    expect(lower).toBeGreaterThan(nearTop);
    expect(lower).toBeLessThan(OPAQUE);
    expect(crestThickness(() => 0, { x: 0, y: 0, z: 0 }, towardSun)).toBe(OPAQUE);
    const back = { x: 0, y: 1.3, z: 0.8 * Math.sqrt(Math.log(1.5 / 1.3)) };
    expect(crestThickness(ridge, back, towardSun)).toBe(OPAQUE);
  });

  it('marches from the surface it marches, so a drawn surface a millimetre off it finds no crest in a trough (the pale stripes)', () => {
    // A trough's floor falling gently toward the sun, 3 mm per metre; the drawn surface (here the Catmull-Rom over
    // the bilinear field) sits a millimetre under the bilinear one the march reads.
    const floor = (x: number) => -0.42 - 0.003 * x;
    const towardSun = { x: 1, y: 0, z: 0 };
    const drawn = { x: 0, y: floor(0) - 0.001, z: 0 };
    // From 1 mm under, the old march found water at 0.25 m and none at 1 m: a 0.33 m "crest" lit at e^(−2.2 · 0.33).
    let previous = 0;
    let previousGap = 0;
    let old = OPAQUE;
    for (const distance of [0.25, 1, 2.5, 6]) {
      const gap = floor(distance) - drawn.y;
      if (gap <= 0) {
        old = previousGap > 0 ? previous + ((distance - previous) * previousGap) / (previousGap - gap) : OPAQUE;
        break;
      }
      [previous, previousGap] = [distance, gap];
    }
    expect(old).toBeCloseTo(1 / 3, 2);
    expect(crestThickness((x) => floor(x), drawn, towardSun)).toBe(OPAQUE);
    // A real crest still lights the same from on its surface, and from a drawn point just off it.
    const ridge = (_x: number, z: number) => 1.5 * Math.exp(-((z / 0.8) ** 2));
    const z = -0.8 * Math.sqrt(Math.log(1.5 / 1.3));
    const onSurface = crestThickness(ridge, { x: 0, y: 1.3, z }, { x: 0, y: 0, z: 1 });
    expect(crestThickness(ridge, { x: 0, y: 1.3 - 0.001, z }, { x: 0, y: 0, z: 1 })).toBe(onSurface);
  });

  // The patch seam (playtest 2026-10-21): calm water at sunset, looking toward the sun, showed hard-edged pale regions
  // with L-shaped corners. The march found "crests" millimetres above the ray and lit them in full, and cut the light
  // off where the bilinear field's first step toward the sun changed sign: along its node lines.
  it('lights no crest in calm water, and has no edge where the first step toward the sun changes sign', () => {
    const towardSun = { x: 1, y: 0, z: 0 };
    const attenuation = beamAttenuation(SPOT_OPTICS.pool)[1];
    // A 3 mm swell 8 m long: every rise toward the sun is a few millimetres.
    const calm = (x: number) => 0.003 * Math.sin((2 * Math.PI * x) / 8);
    const light = (x: number) => crestLight(calm, { x, y: calm(x), z: 0 }, towardSun, attenuation);
    let jump = 0;
    let brightest = 0;
    for (let x = 0; x < 16; x += 0.01) {
      brightest = Math.max(brightest, light(x));
      jump = Math.max(jump, Math.abs(light(x + 0.01) - light(x)));
    }
    // Before, its tops lit at e^(−c·t) ≈ 0.9 and went dark across one centimetre.
    const before = (x: number) => {
      const thickness = crestThickness(calm, { x, y: calm(x), z: 0 }, towardSun);
      return thickness < OPAQUE ? Math.exp(-attenuation * thickness) : 0;
    };
    let beforeJump = 0;
    for (let x = 0; x < 16; x += 0.01) beforeJump = Math.max(beforeJump, Math.abs(before(x + 0.01) - before(x)));
    expect(beforeJump).toBeGreaterThan(0.8);
    expect(brightest).toBeLessThan(1e-6);
    expect(jump).toBeLessThan(1e-6);
  });

  it('fades the crest light in with the crest, so it never steps where the first sample leaves the water', () => {
    const towardSun = { x: 1, y: 0, z: 0 };
    const attenuation = beamAttenuation(SPOT_OPTICS.pool)[1];
    // A crest growing from nothing to 20 cm a metre ahead: the light rises with it, without a step.
    const crestOf = (height: number) => (x: number) => height * Math.exp(-(((x - 1) / 0.5) ** 2)) - 0.01 * x;
    let previous = 0;
    for (let mm = 0; mm <= 200; mm += 1) {
      const crest = crestOf(mm / 1000);
      const lit = crestLight(crest, { x: 0, y: crest(0), z: 0 }, towardSun, attenuation);
      expect(Math.abs(lit - previous)).toBeLessThan(0.05);
      previous = lit;
    }
    // Grown to 20 cm, it lights in full: e^(−c·t), as before.
    const grown = crestOf(0.2);
    expect(previous).toBeCloseTo(Math.exp(-attenuation * crestThickness(grown, { x: 0, y: grown(0), z: 0 }, towardSun)), 12);
  });

  it('lights a real crest as before', () => {
    const ridge = (_x: number, z: number) => 1.5 * Math.exp(-((z / 0.8) ** 2));
    const towardSun = { x: 0, y: 0, z: 1 };
    const attenuation = beamAttenuation(SPOT_OPTICS.reef)[1];
    for (const height of [1.45, 1.3, 0.9]) {
      const origin = { x: 0, y: height, z: -0.8 * Math.sqrt(Math.log(1.5 / height)) };
      const thickness = crestThickness(ridge, origin, towardSun);
      expect(thickness).toBeLessThan(OPAQUE);
      expect(crestLight(ridge, origin, towardSun, attenuation)).toBeCloseTo(Math.exp(-attenuation * thickness), 12);
    }
  });

  it('reports the crest\'s rise above the ray, and lights it by its steepness: rise over thickness', () => {
    const ridge = (_x: number, z: number) => 1.5 * Math.exp(-((z / 0.8) ** 2));
    const origin = { x: 0, y: 1.3, z: -0.8 * Math.sqrt(Math.log(1.5 / 1.3)) };
    const march = crestMarch(ridge, origin, { x: 0, y: 0, z: 1 });
    expect(march.thickness).toBe(crestThickness(ridge, origin, { x: 0, y: 0, z: 1 }));
    expect(march.rise).toBeCloseTo(ridge(0, origin.z + 0.25) - 1.3, 12);
    expect(crestShare({ thickness: OPAQUE, rise: 1 })).toBe(0);
    expect(crestShare({ thickness: 2, rise: 2 * CREST_STEEPNESS[0] })).toBe(0);
    expect(crestShare({ thickness: 2, rise: 2 * CREST_STEEPNESS[1] })).toBe(1);
  });

  it('feeds the shader uniforms from the same model', () => {
    const uniforms = createOpticsUniforms();
    applyOptics(uniforms, SPOT_OPTICS.reef);
    const vector = (name: string) => (uniforms[name].value as Vector3).toArray();
    expect(vector('waterAttenuation')).toEqual([...beamAttenuation(SPOT_OPTICS.reef)]);
    expect(vector('waterDiffuseAttenuation')).toEqual([...diffuseAttenuation(SPOT_OPTICS.reef)]);
    expect(vector('waterDeepReflectance')).toEqual([...deepReflectance(SPOT_OPTICS.reef)]);
    expect(vector('waterBedAlbedo')).toEqual([...SPOT_OPTICS.reef.bedAlbedo]);
    applySun(uniforms, new Vector3(0, 3, -4), new Color(2, 1.5, 1));
    vector('waterSunDirection').forEach((value, i) => expect(value).toBeCloseTo([0, 0.6, -0.8][i], 12));
    expect((uniforms.waterSunRadiance.value as Color).toArray()).toEqual([2, 1.5, 1]);
    expect(uniforms.waterBodyGain.value).toBe(WATER_BODY_GAIN);
    expect(waterOpticsPars).toContain(`${WATER_IOR}`);
    expect(waterOpticsPars).toContain(WATER_F0.toFixed(6));
  });
});
